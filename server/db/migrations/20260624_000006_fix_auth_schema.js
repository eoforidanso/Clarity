export async function up(db) {
  // sessions.token_hash: make nullable so code paths that omit it don't crash
  await db.prepare(`ALTER TABLE sessions ALTER COLUMN token_hash DROP NOT NULL`).run();

  // refresh_tokens: add columns that auth-hardening migration missed because
  // the table already existed when CREATE TABLE IF NOT EXISTS ran
  await db.prepare(`ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS device_id    TEXT`).run();
  await db.prepare(`ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS ip_address   TEXT DEFAULT ''`).run();
  await db.prepare(`ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS revoked_at   TIMESTAMPTZ`).run();
}

export async function down(db) {
  await db.prepare(`ALTER TABLE sessions ALTER COLUMN token_hash SET NOT NULL`).run();
  await db.prepare(`ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS device_id`).run();
  await db.prepare(`ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS ip_address`).run();
  await db.prepare(`ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS revoked_at`).run();
}
