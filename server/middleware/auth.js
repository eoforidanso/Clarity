import jwt from 'jsonwebtoken';
import config from '../config.js';
import db from '../db/database.js';
import { buildAccess } from './accessControl.js';

export async function authenticate(req, res, next) {
  // Accept token from httpOnly cookie (browser) or Authorization header (API clients / mobile)
  const cookieToken = req.cookies?.ehr_token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const token = cookieToken || bearerToken;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await db.prepare('SELECT id, username, first_name, last_name, role, credentials, specialty, npi, dea_number, email, two_factor_enabled, must_change_password, patient_id, location_id FROM users WHERE id = ?').get(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    req.access = buildAccess(user); // role + location scope for every request

    // Server-side enforcement: block all API calls except auth endpoints until password is changed
    if (user.must_change_password) {
      const allowed = ['/api/auth/change-password', '/api/auth/logout', '/api/auth/me'];
      const isAllowed = allowed.some(p => req.originalUrl.startsWith(p));
      if (!isAllowed) {
        return res.status(403).json({ error: 'Password change required before continuing', mustChangePassword: true });
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * requiresElevated — gates sensitive actions behind re-authentication.
 *
 * Client must include the elevated token from POST /auth/reauth in one of:
 *   - Authorization: Elevated <elevatedToken>
 *   - X-Elevated-Token: <elevatedToken>
 *   - req.body.elevatedToken
 *
 * Sensitive actions to protect:
 *   - Deleting patient records
 *   - Changing user roles / permissions
 *   - Exporting PHI / bulk data
 *   - EPCS prescription signing
 *   - Break-the-Glass (BTG) access
 *   - Admin destructive operations
 */
export function requiresElevated(req, res, next) {
  // Extract elevated token from multiple sources
  const authHeader   = req.headers.authorization || '';
  const headerToken  = authHeader.startsWith('Elevated ') ? authHeader.slice(9) : null;
  const xToken       = req.headers['x-elevated-token'];
  const bodyToken    = req.body?.elevatedToken;
  const token        = headerToken || xToken || bodyToken;

  if (!token) {
    return res.status(401).json({
      error: 'Elevated authentication required',
      hint: 'POST /api/auth/reauth with your password or OTP to obtain an elevatedToken',
      code: 'ELEVATED_REQUIRED',
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    if (!decoded.elevated) {
      return res.status(403).json({
        error: 'Token does not carry elevated privileges',
        code: 'NOT_ELEVATED',
      });
    }

    // Token must belong to the authenticated user
    if (req.user && decoded.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Elevated token does not match authenticated user',
        code: 'TOKEN_USER_MISMATCH',
      });
    }

    req.elevated = true;
    req.elevatedAt = new Date(decoded.iat * 1000).toISOString();
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Elevated session expired — re-authenticate to continue',
        code: 'ELEVATED_EXPIRED',
      });
    }
    return res.status(401).json({ error: 'Invalid elevated token', code: 'ELEVATED_INVALID' });
  }
}
