/**
 * Clarity EHR — Soft Delete + Audit helpers
 *
 * Tables get a deleted_at TIMESTAMP NULL column.
 * All active queries filter WHERE deleted_at IS NULL.
 */

import { db } from './database.js';
import { v4 as uuidv4 } from 'uuid';

// ── Schema migrations ─────────────────────────────────────────────────────────
export function applyMigrations() {
  // Retired — DDL is now managed by server/db/migrate.js (Postgres-compatible).
}

// ── Audit log ─────────────────────────────────────────────────────────────────
export async function logAudit({ actorId, actorName = '', action, targetId = null, targetType = '', details = {}, ip = '' }) {
  // Insert directly into the underlying audit_log table using real column names
  // to avoid any view-mapping issues (audit_logs view aliases user_id→actor_id etc.)
  await db.prepare(`
    INSERT INTO audit_log (id, user_id, user_name, action, patient_id, resource_type, details, ip_address)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  `).run(uuidv4(), actorId, actorName, action, targetId, targetType, JSON.stringify(details), ip);

  import('../security/alerting.js')
    .then(({ alertOnAction }) => alertOnAction(action, { actorId, actorName, targetId, ip }))
    .catch(() => {});
}

// ── Active scope ──────────────────────────────────────────────────────────────
export const activeScope = `deleted_at IS NULL`;

// ── Dependency guard ──────────────────────────────────────────────────────────
export async function ensureLocationHasNoDependencies(locationId) {
  const userCount    = await db.prepare(`SELECT COUNT(*) AS c FROM users    WHERE location_id = $1 AND ${activeScope}`).get(locationId);
  const patientCount = await db.prepare(`SELECT COUNT(*) AS c FROM patients WHERE location_id = $1`).get(locationId);

  if ((Number(userCount?.c) ?? 0) > 0 || (Number(patientCount?.c) ?? 0) > 0) {
    const err = new Error('LOCATION_HAS_DEPENDENCIES');
    err.users    = Number(userCount?.c ?? 0);
    err.patients = Number(patientCount?.c ?? 0);
    throw err;
  }
}

// ── Soft delete helpers ───────────────────────────────────────────────────────
export async function softDeleteUser(id, actorId, actorName, ip) {
  await db.prepare(`UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1`).run(id);
  await logAudit({ actorId, actorName, action: 'USER_DELETED', targetId: id, targetType: 'user', ip });
}

export async function softDeleteLocation(id, actorId, actorName, ip) {
  await db.prepare(`UPDATE locations SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1`).run(id);
  await logAudit({ actorId, actorName, action: 'LOCATION_DELETED', targetId: id, targetType: 'location', ip });
}

// ── Restore ───────────────────────────────────────────────────────────────────
export async function restoreUser(id, actorId, actorName, ip) {
  await db.prepare(`UPDATE users SET deleted_at = NULL, updated_at = NOW() WHERE id = $1`).run(id);
  await logAudit({ actorId, actorName, action: 'USER_RESTORED', targetId: id, targetType: 'user', ip });
}

export async function restoreLocation(id, actorId, actorName, ip) {
  await db.prepare(`UPDATE locations SET deleted_at = NULL, updated_at = NOW() WHERE id = $1`).run(id);
  await logAudit({ actorId, actorName, action: 'LOCATION_RESTORED', targetId: id, targetType: 'location', ip });
}
