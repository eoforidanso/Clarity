/**
 * Clarity EHR — Centralised IDOR Guard
 *
 * Single middleware applied as router.use('/:patientId/*', requirePatientAccess)
 * on every clinical route file (medications, labs, encounters, etc.)
 *
 * Rules:
 *   admin / front_desk  → unrestricted
 *   prescriber / nurse / therapist → assigned_provider OR same location
 *   All violations → 403 + audit log IDOR_BLOCKED
 */

import db from '../db/database.js';
import { logAudit } from '../db/softDelete.js';

export function requirePatientAccess(req, res, next) {
  const patientId = req.params.patientId || req.params.id;
  if (!patientId) return next();

  const patient = db
    .prepare('SELECT id, assigned_provider, primary_location FROM patients WHERE id = ?')
    .get(patientId);

  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const { role, id: userId, location_id } = req.user;

  // Global roles: unrestricted
  if (['admin', 'front_desk'].includes(role)) return next();

  const isAssigned   = patient.assigned_provider === userId;
  const sameLocation = location_id && patient.primary_location === location_id;

  if (!isAssigned && !sameLocation) {
    logAudit({
      actorId:   userId,
      actorName: `${req.user.first_name} ${req.user.last_name || ''}`.trim(),
      action:    'IDOR_BLOCKED',
      targetId:  patientId,
      targetType:'patient',
      details: {
        // Actor context
        role,
        actorLocation:    req.user.location_id || null,
        // Request
        method:           req.method,
        path:             req.path,
        userAgent:        req.headers['user-agent']?.slice(0, 120) || null,
        // Patient context
        patientLocation:  patient.primary_location || null,
        assignedProvider: patient.assigned_provider || null,
        // Why it was blocked
        reason: !isAssigned && !sameLocation
          ? 'not_assigned_and_different_location'
          : !isAssigned ? 'not_assigned_provider' : 'different_location',
      },
      ip: req.realIp || req.ip,
    });
    return res.status(403).json({ error: 'Access denied — not your patient' });
  }

  next();
}

/**
 * User access guard — only admin can read/modify other users.
 * Any role can read their own profile (req.params.id === req.user.id).
 */
export function requireUserAccess(req, res, next) {
  const targetId = req.params.id;
  const { id: userId, role } = req.user;

  // Own profile: always allowed
  if (targetId === userId) return next();

  // Other users: admin only
  if (role !== 'admin') {
    logAudit({
      actorId: userId, action: 'IDOR_BLOCKED_USER',
      targetId, targetType: 'user',
      details: { role, method: req.method, path: req.path },
      ip: req.realIp || req.ip,
    });
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
}

/**
 * Role/location change guard — requires elevated token AND admin role.
 * Prevents privilege escalation via PATCH /users/:id/role.
 */
export function requireRoleChangeAuth(req, res, next) {
  const { role } = req.user;
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can change roles' });
  }
  if (!req.user.elevated) {
    return res.status(401).json({
      error: 'Re-authentication required to change user role',
      code:  'ELEVATED_REQUIRED',
    });
  }
  next();
}
