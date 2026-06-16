import { logAudit } from '../db/softDelete.js';

/**
 * Fire-and-forget PHI read audit entry.
 * Call at the top of GET handlers that return patient PHI.
 * Non-blocking — does not affect response timing.
 */
export function logPhiRead(req, patientId, resource = 'patient') {
  const actorName = [req.user.first_name, req.user.last_name].filter(Boolean).join(' ') || req.user.email;
  logAudit({
    actorId:    req.user.id,
    actorName,
    action:     'PHI_READ',
    targetId:   patientId,
    targetType: resource,
    details:    { route: req.originalUrl, method: req.method, role: req.user.role },
    ip:         req.ip,
  }).catch(() => {});
}
