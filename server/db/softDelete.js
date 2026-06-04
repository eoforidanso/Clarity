/**
 * Clarity EHR — Soft Delete + Audit helpers
 *
 * Tables get a deleted_at TIMESTAMP NULL column.
 * All active queries filter WHERE deleted_at IS NULL.
 */

import db from './database.js';
import { v4 as uuidv4 } from 'uuid';

// ── Schema migrations (run once at startup) ───────────────────────────────────
export function applyMigrations() {
  // Retired — DDL is now managed by server/db/migrate.js (Postgres-compatible).
  // Kept as a no-op so existing call sites don't break.
}

function _legacyApplyMigrations_unused() {
  const migrations = [];
  for (const sql of migrations) {
    try {
      db.prepare(sql).run();
    } catch (err) {
      // IF NOT EXISTS not supported in older SQLite for ALTER TABLE — ignore
      if (!err.message.includes('duplicate column')) {
        console.warn('[migration]', err.message.slice(0, 80));
      }
    }
  }
}

// ── Audit log ─────────────────────────────────────────────────────────────────
export function logAudit({ actorId, actorName = '', action, targetId = null, targetType = '', details = {}, ip = '' }) {
  db.prepare(`
    INSERT INTO audit_logs (id, actor_id, actor_name, action, target_id, target_type, details, ip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), actorId, actorName, action, targetId, targetType, JSON.stringify(details), ip);

  // Fire immediate alert for critical actions (non-blocking)
  import('../security/alerting.js')
    .then(({ alertOnAction }) => alertOnAction(action, { actorId, actorName, targetId, ip }))
    .catch(() => {/* alerting must never crash the main flow */});
}

// ── Active scope helpers ───────────────────────────────────────────────────────
// orm model.addScope("active", { where: { deleted_at: null } })
export const activeScope = `deleted_at IS NULL`;

// ── Dependency guard ───────────────────────────────────────────────────────────
export async function ensureLocationHasNoDependencies(locationId) {
  const userCount    = db.prepare(`SELECT COUNT(*) as c FROM users    WHERE location_id = ? AND ${activeScope}`).get(locationId);
  const patientCount = db.prepare(`SELECT COUNT(*) as c FROM patients WHERE location_id = ?`).get(locationId);

  if ((userCount?.c ?? 0) > 0 || (patientCount?.c ?? 0) > 0) {
    const err = new Error('LOCATION_HAS_DEPENDENCIES');
    err.users    = userCount?.c ?? 0;
    err.patients = patientCount?.c ?? 0;
    throw err;
  }
}

// ── Soft delete helpers ────────────────────────────────────────────────────────
export function softDeleteUser(id, actorId, actorName, ip) {
  db.prepare(`UPDATE users SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(id);
  logAudit({ actorId, actorName, action: 'USER_DELETED', targetId: id, targetType: 'user', ip });
}

export function softDeleteLocation(id, actorId, actorName, ip) {
  db.prepare(`UPDATE locations SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(id);
  logAudit({ actorId, actorName, action: 'LOCATION_DELETED', targetId: id, targetType: 'location', ip });
}

// ── Restore (undo soft delete) ────────────────────────────────────────────────
export function restoreUser(id, actorId, actorName, ip) {
  db.prepare(`UPDATE users SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ?`).run(id);
  logAudit({ actorId, actorName, action: 'USER_RESTORED', targetId: id, targetType: 'user', ip });
}

export function restoreLocation(id, actorId, actorName, ip) {
  db.prepare(`UPDATE locations SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ?`).run(id);
  logAudit({ actorId, actorName, action: 'LOCATION_RESTORED', targetId: id, targetType: 'location', ip });
}
