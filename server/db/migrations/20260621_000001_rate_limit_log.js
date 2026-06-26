export async function up(db) {
  console.log('[migration] Creating rate_limit_log table');

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS rate_limit_log (
      id        BIGSERIAL PRIMARY KEY,
      key       TEXT        NOT NULL,
      attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_rate_limit_log_key_time
      ON rate_limit_log (key, attempted_at)
  `).run();

  // Auto-purge entries older than 25 hours to keep the table small
  try {
    await db.prepare(`
      CREATE OR REPLACE FUNCTION prune_rate_limit_log() RETURNS void LANGUAGE sql AS $$
        DELETE FROM rate_limit_log WHERE attempted_at < NOW() - INTERVAL '25 hours';
      $$
    `).run();
  } catch {
    // If functions aren't supported (e.g., limited PG perms), skip — cleanup runs from the app
  }

  console.log('[migration] rate_limit_log ready');
}

export async function down(db) {
  await db.prepare(`DROP TABLE IF EXISTS rate_limit_log`).run();
}
