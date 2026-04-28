import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';

/**
 * HIPAA-compliant Audit Logging Middleware
 * Logs every significant action: login, logout, chart access, 
 * medication changes, order creation, prescription, etc.
 */

export function logAuditEvent({
  userId = '',
  userName = '',
  userRole = '',
  action,
  resourceType,
  resourceId = '',
  patientId = '',
  patientName = '',
  details = '',
  ipAddress = '',
  userAgent = '',
  sessionId = '',
}) {
  try {
    db.prepare(`
      INSERT INTO audit_log (id, user_id, user_name, user_role, action, resource_type, resource_id, patient_id, patient_name, details, ip_address, user_agent, session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      userId,
      userName,
      userRole,
      action,
      resourceType,
      resourceId,
      patientId,
      patientName,
      typeof details === 'object' ? JSON.stringify(details) : details,
      ipAddress,
      userAgent,
      sessionId
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

/**
 * Express middleware that auto-logs API requests
 * Attach after authenticate middleware so req.user is available
 */
export function auditMiddleware(action, resourceType) {
  return (req, res, next) => {
    // Log after response is sent
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      // Only log successful operations
      if (res.statusCode < 400) {
        const patientId = req.params.patientId || req.body?.patientId || '';
        logAuditEvent({
          userId: req.user?.id || '',
          userName: req.user?.first_name ? `${req.user.first_name} ${req.user.last_name || ''}`.trim() : '',
          userRole: req.user?.role || '',
          action: action || `${req.method} ${req.originalUrl}`,
          resourceType,
          resourceId: req.params.id || req.params.patientId || body?.id || '',
          patientId,
          details: { method: req.method, path: req.originalUrl, statusCode: res.statusCode },
          ipAddress: req.ip || req.connection?.remoteAddress || '',
          userAgent: req.get('User-Agent') || '',
          sessionId: req.sessionId || '',
        });
      }
      return originalJson(body);
    };
    next();
  };
}

/**
 * Get audit log entries with filters
 */
export function getAuditLog({ userId, patientId, action, startDate, endDate, limit = 100, offset = 0 }) {
  let sql = 'SELECT * FROM audit_log WHERE 1=1';
  const params = [];

  if (userId) {
    sql += ' AND user_id = ?';
    params.push(userId);
  }
  if (patientId) {
    sql += ' AND patient_id = ?';
    params.push(patientId);
  }
  if (action) {
    sql += ' AND action LIKE ?';
    params.push(`%${action}%`);
  }
  if (startDate) {
    sql += ' AND timestamp >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND timestamp <= ?';
    params.push(endDate);
  }

  sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(sql).all(...params);
}
