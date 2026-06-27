/**
 * portal_sessions: device tracking + revocation
 *
 * jti          — JWT ID; links the cookie to this row for targeted revocation
 * revoked_at   — set to revoke the session without waiting for JWT expiry
 * user_agent   — browser/app string captured at login for device display
 * last_seen_at — updated on each authenticated request (throttled to 5 min)
 * device_name  — human-readable label parsed from user_agent at login
 */

export async function up(db) {
  await db.prepare(`ALTER TABLE portal_sessions ADD COLUMN IF NOT EXISTS jti          TEXT UNIQUE`).run();
  await db.prepare(`ALTER TABLE portal_sessions ADD COLUMN IF NOT EXISTS revoked_at   TIMESTAMPTZ`).run();
  await db.prepare(`ALTER TABLE portal_sessions ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ`).run();
  await db.prepare(`ALTER TABLE portal_sessions ADD COLUMN IF NOT EXISTS device_name  TEXT NOT NULL DEFAULT ''`).run();

  // user_agent already exists on the table from migration 000001; no-op if present
  await db.prepare(`ALTER TABLE portal_sessions ADD COLUMN IF NOT EXISTS user_agent TEXT NOT NULL DEFAULT ''`).run();

  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_portal_sessions_jti ON portal_sessions(jti)`
  ).run();
}

export async function down(db) {
  await db.prepare(`DROP INDEX IF EXISTS idx_portal_sessions_jti`).run();
  await db.prepare(`ALTER TABLE portal_sessions DROP COLUMN IF EXISTS device_name`).run();
  await db.prepare(`ALTER TABLE portal_sessions DROP COLUMN IF EXISTS last_seen_at`).run();
  await db.prepare(`ALTER TABLE portal_sessions DROP COLUMN IF EXISTS revoked_at`).run();
  await db.prepare(`ALTER TABLE portal_sessions DROP COLUMN IF EXISTS jti`).run();
}
