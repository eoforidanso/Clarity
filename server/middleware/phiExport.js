/**
 * PHI Export Monitoring Middleware
 *
 * Tracks all Protected Health Information exports
 * Enforces elevation for high-volume exports
 * Prevents exfiltration patterns (user A exporting bulk data for user B)
 *
 * Monitored actions:
 * - Patient record export (PDF, CSV)
 * - Encounter data download
 * - Labs/imaging results export
 * - Audit log export
 */

import db from '../db/database.js';
import { logAuditEvent } from './auditLog.js';

/**
 * Monitor PHI export: log it, check risk, raise alerts if suspicious
 *
 * Usage in route:
 *   export function handler(req, res) {
 *     const phiContext = {
 *       type: 'patient_export',
 *       patientIds: [req.params.id],
 *       format: 'pdf',
 *       recordCount: 1
 *     };
 *     await monitorPhiExport(db, req.user, phiContext, req);
 *   }
 */
export async function monitorPhiExport(db, user, context, req) {
  const { type, patientIds = [], format = 'unknown', recordCount = 0 } = context;

  try {
    // Log the export
    await logAuditEvent({
      userId: user?.id,
      userName: user?.username,
      userRole: user?.role,
      action: 'PHI_EXPORT',
      resourceType: 'phi',
      resourceId: patientIds[0] || 'batch',
      details: {
        type,
        patientCount: patientIds.length,
        recordCount,
        format,
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') || '',
      sessionId: user?.session_id
    });

    // Check for exfiltration patterns
    const suspicious = await checkExfiltrationPattern(db, user?.id, patientIds);
    if (suspicious.flagged) {
      console.warn(`[PHI-EXPORT] Suspicious pattern: ${suspicious.reason}`);

      // Raise risk score
      await db.prepare(`
        UPDATE sessions
        SET risk_score = LEAST(risk_score + 15, 100)
        WHERE id = $1 AND revoked_at IS NULL
      `).run(user?.session_id);
    }

    // High-volume export requires elevation
    if (recordCount > 100) {
      return {
        allowed: user?.elevated === true,
        requireElevation: !user?.elevated,
        message: `Bulk export (${recordCount} records) requires elevation`
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error('[phi-export]', err);
    return { allowed: false, message: 'Export monitoring failed' };
  }
}

/**
 * Detect suspicious PHI export patterns:
 * - User A exporting data for User B (IDOR-style)
 * - Bulk exports to unrelated patients
 * - High-frequency exports in short time
 */
export async function checkExfiltrationPattern(db, userId, patientIds = []) {
  try {
    const patterns = [];

    // Pattern 1: Are these patients assigned to this user?
    if (patientIds.length > 0) {
      const assigned = await db.prepare(`
        SELECT COUNT(*) as count
        FROM encounters e
        WHERE e.provider_id = $1 AND e.patient_id = ANY($2::text[])
      `).get(userId, patientIds);

      if ((assigned?.count || 0) < patientIds.length) {
        patterns.push({
          flagged: true,
          reason: 'User exporting unassigned patients'
        });
      }
    }

    // Pattern 2: Bulk export to unrelated patients (> 10 in 5 min)
    const recentExports = await db.prepare(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE user_id = $1
        AND action = 'PHI_EXPORT'
        AND created_at > NOW() - INTERVAL '5 minutes'
    `).get(userId);

    if ((recentExports?.count || 0) > 10) {
      patterns.push({
        flagged: true,
        reason: 'High-frequency exports detected'
      });
    }

    return patterns.length > 0
      ? patterns[0]
      : { flagged: false };
  } catch (err) {
    console.warn('[exfiltration-check]', err);
    return { flagged: false };
  }
}

/**
 * Require elevation for PHI exports (configurable threshold)
 *
 * Usage:
 *   router.get('/api/patients/:id/export', authenticate, requirePhiElevation({threshold: 50}), handler)
 */
export function requirePhiElevation(options = {}) {
  const { threshold = 100 } = options; // Default: require elevation for exports > 100 records

  return async (req, res, next) => {
    const recordCount = parseInt(req.query.limit) || threshold;

    // If within threshold, allow
    if (recordCount <= threshold) {
      return next();
    }

    // High-volume export requires elevation
    if (!req.user?.elevated) {
      logAuditEvent({
        userId: req.user?.id,
        userName: req.user?.username,
        userRole: req.user?.role,
        action: 'PHI_EXPORT_ELEVATION_REQUIRED',
        resourceType: 'phi',
        details: { recordCount, threshold },
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || '',
        sessionId: req.user?.session_id
      });

      return res.status(403).json({
        error: 'Large PHI exports require re-authentication',
        action: 'require_elevation',
        recordCount,
        threshold
      });
    }

    next();
  };
}
