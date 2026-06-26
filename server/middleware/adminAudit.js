/**
 * Admin Action Audit Middleware
 *
 * Automatically logs every admin route request to audit_log regardless of
 * whether the individual handler calls logAuditEvent. Captures:
 *   - WHO  (user id, name, role, IP)
 *   - WHAT (method, path, sanitised request body)
 *   - RESULT (HTTP status code)
 *
 * Applied as: app.use('/api/admin', authenticate, adminAuditMiddleware, ...)
 */

import { logAuditEvent } from './auditLog.js';
import logger from './logger.js';

const REDACT_KEYS = new Set([
  'password', 'password_hash', 'token', 'secret', 'otp',
  'deaNumber', 'ssn', 'dob', 'signature',
]);

function sanitise(obj, depth = 0) {
  if (depth > 3 || obj === null || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = REDACT_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : sanitise(v, depth + 1);
  }
  return out;
}

export function adminAuditMiddleware(req, res, next) {
  const started = Date.now();

  // Intercept res.json to capture final status + body
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const status = res.statusCode;
    const actor  = req.user;

    const action = `ADMIN_${req.method}_${req.path
      .replace(/^\//, '')
      .replace(/\//g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toUpperCase()}`;

    logAuditEvent({
      userId:      actor?.id       || '',
      userName:    actor ? `${actor.first_name} ${actor.last_name || ''}`.trim() : '',
      userRole:    actor?.role     || '',
      facilityId:  actor?.facility_id || null,
      action,
      resourceType: 'admin',
      resourceId:   req.params.id || req.params.userId || '',
      details: {
        method:     req.method,
        path:       req.originalUrl,
        statusCode: status,
        durationMs: Date.now() - started,
        requestBody: req.method !== 'GET' ? sanitise(req.body || {}) : undefined,
      },
      ipAddress: req.realIp || req.ip || '',
      userAgent: req.get('User-Agent') || '',
      sessionId: actor?.session_id || '',
    }).catch(err => logger.error('[adminAudit] log write failed', { error: err.message }));

    if (status >= 400) {
      logger.warn('[adminAudit] failed admin action', {
        actor:    actor?.id,
        role:     actor?.role,
        method:   req.method,
        path:     req.originalUrl,
        status,
        ip:       req.realIp || req.ip,
      });
    }

    return originalJson(body);
  };

  next();
}
