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
  const migrations = [
    // Soft delete columns
    `ALTER TABLE users     ADD COLUMN IF NOT EXISTS deleted_at TEXT NULL`,
    `ALTER TABLE locations ADD COLUMN IF NOT EXISTS deleted_at TEXT NULL`,
    // Audit log table (structured, queryable)
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id         TEXT PRIMARY KEY,
      actor_id   TEXT NOT NULL,
      actor_name TEXT DEFAULT '',
      action     TEXT NOT NULL,
      target_id  TEXT,
      target_type TEXT DEFAULT '',
      details    TEXT DEFAULT '{}',
      ip         TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )`,
  // Session tracking columns
  `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at TEXT`,
  `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_elevated INTEGER DEFAULT 0`,
  `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS elevated_expires_at TEXT`,
  `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS location_id TEXT`,

  // Triggers to make audit_logs append-only (no UPDATE or DELETE allowed)
  `CREATE TRIGGER IF NOT EXISTS audit_logs_no_update
     BEFORE UPDATE ON audit_logs
     BEGIN SELECT RAISE(ABORT, 'audit_logs is append-only — updates not permitted'); END`,
  `CREATE TRIGGER IF NOT EXISTS audit_logs_no_delete
     BEFORE DELETE ON audit_logs
     BEGIN SELECT RAISE(ABORT, 'audit_logs is append-only — deletes not permitted'); END`,
    `CREATE INDEX IF NOT EXISTS idx_audit_actor  ON audit_logs(actor_id)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_id)`,
  ];

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
