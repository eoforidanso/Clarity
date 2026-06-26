/**
 * Auth Hardening: Enhanced sessions table + refresh_tokens table
 *
 * Changes:
 * - sessions: add device_id, revoked_at, risk_score, mfa_level
 * - Create refresh_tokens table (DB-backed token storage with rotation)
 * - Add indexes for performance
 */

export async function up(db) {
  console.log('[migration] Auth hardening: enhancing sessions + creating refresh_tokens');

  // ── Enhance sessions table ──
  await db.prepare(`
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device_id TEXT
  `).run();

  await db.prepare(`
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP
  `).run();

  await db.prepare(`
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0
  `).run();

  await db.prepare(`
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS mfa_level INTEGER DEFAULT 0
  `).run();

  // ── Create refresh_tokens table ──
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      device_id TEXT,
      token_hash TEXT NOT NULL UNIQUE,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      last_used_at TIMESTAMP DEFAULT NOW(),
      revoked_at TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `).run();

  // ── Indexes for performance ──
  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_session
    ON refresh_tokens(user_id, session_id)
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash
    ON refresh_tokens(token_hash)
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires
    ON refresh_tokens(expires_at)
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_sessions_revoked
    ON sessions(revoked_at)
  `).run();

  console.log('[migration] Auth hardening complete');
}

export async function down(db) {
  // Rollback: drop refresh_tokens, remove new columns from sessions
  await db.prepare(`DROP TABLE IF EXISTS refresh_tokens`).run();

  await db.prepare(`ALTER TABLE sessions DROP COLUMN IF EXISTS device_id`).run();
  await db.prepare(`ALTER TABLE sessions DROP COLUMN IF EXISTS revoked_at`).run();
  await db.prepare(`ALTER TABLE sessions DROP COLUMN IF EXISTS risk_score`).run();
  await db.prepare(`ALTER TABLE sessions DROP COLUMN IF EXISTS mfa_level`).run();

  console.log('[migration] Auth hardening rolled back');
}
