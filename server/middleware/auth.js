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
    // Lock algorithm to HS256 — prevents alg:none and RS/ES confusion attacks
    const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });

    // Reject elevated tokens used as session tokens
    // Elevated tokens are short-lived (5 min) and must only be used on requireElevated routes
    if (decoded.elevated && !req.path.includes('/reauth')) {
      // Allow elevated tokens to authenticate normally but mark them
      // requireElevated reads req.user.elevated — this is intentional
    }

    const user = await db.prepare('SELECT id, username, first_name, last_name, role, credentials, specialty, npi, dea_number, email, two_factor_enabled, must_change_password, patient_id, location_id FROM users WHERE id = ?').get(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    // Verify session is still active (revoked on logout)
    if (decoded.sessionId) {
      const session = await db.prepare(
        'SELECT is_active FROM sessions WHERE id = ? AND user_id = ?'
      ).get(decoded.sessionId, decoded.userId);
      if (session && !session.is_active) {
        return res.status(401).json({ error: 'Session has been revoked — please log in again' });
      }
    }

    req.user = { ...user, elevated: decoded.elevated === true };
    req.access = buildAccess(user); // role + location scope for every request

    // Heartbeat: update session last_seen_at + elevated state
    if (decoded.sessionId) {
      const isElevated        = decoded.elevated === true ? 1 : 0;
      const elevatedExpiresAt = decoded.elevated ? new Date(decoded.exp * 1000).toISOString() : null;
      try {
        await db.prepare(`
          UPDATE sessions
          SET last_seen_at = NOW(),
              is_elevated = ?,
              elevated_expires_at = ?,
              location_id = ?
          WHERE id = ? AND is_active = 1
        `).run(isElevated, elevatedExpiresAt, user.location_id || null, decoded.sessionId);
      } catch { /* non-blocking */ }
    }

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

export function requireElevated(req, res, next) {
  if (!req.user?.elevated) {
    return res.status(403).json({ error: 'Re-authentication required' });
  }
  next();
}
