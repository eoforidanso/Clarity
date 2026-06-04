/**
 * Migration: refresh_tokens table
 *
 * Supports 30-day silent token refresh:
 *   - Login issues 8h access JWT + 30d refresh token
 *   - POST /api/auth/refresh swaps refresh → new 8h access JWT
 *   - Logout revokes both
 */

export async function up(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash   TEXT NOT NULL UNIQUE,
      session_id   TEXT,
      expires_at   TIMESTAMPTZ NOT NULL,
      is_active    BOOLEAN NOT NULL DEFAULT TRUE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ,
      ip           TEXT,
      user_agent   TEXT
    )
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_refresh_user    ON refresh_tokens(user_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_refresh_hash    ON refresh_tokens(token_hash)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_refresh_session ON refresh_tokens(session_id)`).run();
}

export async function down(db) {
  await db.prepare(`DROP TABLE IF EXISTS refresh_tokens`).run();
}
