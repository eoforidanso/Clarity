import jwt from 'jsonwebtoken';
import config from '../config.js';
import db from '../db/database.js';

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
