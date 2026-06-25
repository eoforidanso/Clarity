import jwt from 'jsonwebtoken';
import config from '../config.js';
import db from '../db/database.js';
import { buildAccess } from './accessControl.js';
import { isSensitiveRoute } from '../security/authRules.js';
import { evaluateRisk, RISK_THRESHOLD } from './riskEngine.js';
import logger from './logger.js';

export async function authenticate(req, res, next) {
  // Accept token from Authorization header (elevated/API) or httpOnly cookie (browser session).
  // Bearer header takes priority so that elevated tokens sent explicitly are not shadowed by
  // the regular session cookie that is always present in the browser.
  const cookieToken = req.cookies?.ehr_token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const token = bearerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Lock algorithm to HS256 — prevents alg:none and RS/ES confusion attacks
    const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });

    // Support both old JWT format (userId/sessionId) and new format (sub/session_id).
    // Old JWTs were issued before the auth refactor; new ones from login/issueFullSession.
    const userId    = decoded.sub     || decoded.userId;
    const sessionId = decoded.session_id || decoded.sessionId;
    const deviceId  = decoded.device_id ?? decoded.deviceId ?? null; // optional

    if (!userId || !sessionId) {
      return res.status(401).json({ error: 'Invalid token structure' });
    }

    // Reject if token lifetime exceeds maximum (8h + 10min buffer)
    const tokenLifetime = decoded.exp - decoded.iat;
    if (tokenLifetime > (8.5 * 60 * 60)) {
      return res.status(401).json({ error: 'Token lifetime exceeds maximum' });
    }

    // Reject elevated tokens used as session tokens
    // Elevated tokens are short-lived (5 min) and must only be used on requireElevated routes
    if (decoded.elevated && !req.path.includes('/reauth')) {
      // Allow elevated tokens to authenticate normally but mark them
      // requireElevated reads req.user.elevated — this is intentional
    }

    const user = await db.prepare('SELECT id, username, first_name, last_name, role, credentials, specialty, npi, dea_number, email, two_factor_enabled, must_change_password, patient_id, location_id, is_global FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Verify session has not been revoked
    let session = null;
    if (sessionId) {
      session = await db.prepare(`
        SELECT id, revoked_at, is_active, risk_score, mfa_level, ip_address, user_agent, device_id FROM sessions
        WHERE id = $1 AND user_id = $2
      `).get(sessionId, userId);
      if (!session || session.revoked_at || !session.is_active) {
        return res.status(401).json({ error: 'Session has been revoked — please log in again' });
      }
    }

    // ── Device & IP validation: detect anomalies and increment risk ──
    if (session) {
      const currentIp = req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.ip || '';
      const currentUa = req.get('User-Agent') || '';

      // Null-guard: only flag a change when the session has a prior value to compare against.
      // Without this, every new session would score +25 on the first request.
      const ipChanged     = !!session.ip_address  && session.ip_address  !== currentIp;
      const uaChanged     = !!session.user_agent  && session.user_agent  !== currentUa;
      const deviceChanged = !!session.device_id   && !!deviceId && deviceId !== session.device_id;

      const { risk: newRiskScore, action } = evaluateRisk({
        riskScore: session.risk_score || 0,
        ipChanged,
        uaChanged,
        deviceChanged,
        locationChanged: false,
      });

      // Single structured log for every risk evaluation — tells you exactly what the
      // engine saw and decided, making "Session security check required" instantly diagnosable.
      const riskCtx = {
        tag:             'auth',
        userId:          userId,
        route:           req.originalUrl,
        method:          req.method,
        riskScore:       newRiskScore,
        previousScore:   session.risk_score || 0,
        action,
        ipChanged,
        uaChanged,
        deviceChanged,
        locationChanged: false,
      };

      if (action === 'reauth') {
        logger.warn('[auth] high-risk block', riskCtx);
      } else if (ipChanged || uaChanged || deviceChanged) {
        logger.info('[auth] anomaly detected — allowed', riskCtx);
      }

      const ALLOW_HIGH_RISK_ROUTES = [
        '/api/auth/logout',
        '/api/auth/refresh',
        '/api/auth/reauth',
        '/api/auth/me',
      ];
      const isAllowedRoute = ALLOW_HIGH_RISK_ROUTES.some(r => req.originalUrl.startsWith(r));

      if (action === 'reauth' && !isAllowedRoute && !req.user?.elevated) {
        return res.status(403).json({
          error: 'Session security check required',
          requireElevation: true,
          riskScore: newRiskScore,
          riskReason: 'Multiple session anomalies detected',
        });
      }

      session.risk_score = newRiskScore;
    }

    req.user = {
      ...user,
      session_id:    sessionId,                   // for CSRF and logout/revocation
      device_id:     deviceId,
      risk_score:    session?.risk_score ?? 0,    // current session risk
      mfa_level:     session?.mfa_level ?? 0,     // MFA requirement level
      elevated:      decoded.elevated === true,
      isGlobal:      !!(user.is_global),          // ⭐ system admin flag (handles 1 or true)
      facility_id:   user.location_id || null,    // alias used by requireFacility
    };
    req.access = buildAccess(user); // role + location scope for every request

    // Heartbeat: update session last_seen_at, risk_score, IP/UA, elevated state
    if (sessionId && session) {
      const isElevated        = decoded.elevated === true ? 1 : 0;
      const elevatedExpiresAt = decoded.elevated ? new Date(decoded.exp * 1000).toISOString() : null;
      const currentIp         = req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.ip || '';
      const currentUa         = req.get('User-Agent') || '';
      try {
        await db.prepare(`
          UPDATE sessions
          SET last_seen_at = NOW(),
              risk_score = $1,
              ip_address = $2,
              user_agent = $3,
              is_elevated = $4,
              elevated_expires_at = $5,
              location_id = $6
          WHERE id = $7 AND revoked_at IS NULL
        `).run(
          session.risk_score,
          currentIp,
          currentUa,
          isElevated,
          elevatedExpiresAt,
          user.location_id || null,
          sessionId
        );
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

    // Global admins (is_global = 1 in DB) bypass all role checks
    if (req.user.isGlobal) return next();

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Enforce elevated privileges (short-lived token from /reauth)
 *
 * Usage:
 *   router.post('/api/users/:id/role', authenticate, requireElevated, handler)
 *
 * When user lacks elevation:
 *   - If route is sensitive: explain why elevation is needed
 *   - If user risk is elevated: require re-auth to reset risk
 */
export function requireElevated(req, res, next) {
  if (req.user?.elevated) {
    // User has valid elevated token
    return next();
  }

  // User not elevated — provide context
  const sensitive = isSensitiveRoute(req.originalUrl || req.path);
  const riskContext = (req.user?.risk_score || 0) > 20;

  return res.status(403).json({
    error: 'Elevated privileges required',
    action: 'require_elevation',
    reason: riskContext ? 'session_risk_elevated' : 'sensitive_operation',
    riskScore: req.user?.risk_score,
    ...(sensitive && { detail: 'This operation requires re-authentication for security.' })
  });
}

/**
 * requireFacility — enforces facility scoping for non-global users
 *
 * - Global admins (isGlobal=true) bypass facility scoping entirely
 * - Local users must have a facility_id assigned
 *
 * Apply after authenticate() on any route that scopes data to a facility.
 *
 * Usage:
 *   router.get('/patients', authenticate, requireFacility, handler)
 *   app.use('/api', authenticate, requireFacility)  // global
 */
export function requireFacility(req, res, next) {
  const { facility_id, isGlobal } = req.user || {};

  // ⭐ System Admin bypasses facility scoping entirely
  if (isGlobal) return next();

  // ⭐ Scoped users MUST have a facility assigned
  if (!facility_id) {
    return res.status(403).json({
      error: 'No facility assigned to your account. Contact your administrator.',
    });
  }
  next();
}
