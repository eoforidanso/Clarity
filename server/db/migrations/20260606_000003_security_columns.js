/**
 * Migration: add security columns for auto-response engine
 * - users: is_locked, locked_reason, locked_at
 * - sessions: reauth_required, revoked_at, revoke_reason, is_elevated, elevated_expires_at, last_seen_at, location_id, device_id
 */
export async function up(db) {
  const alterations = [
    // users
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_locked INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_reason TEXT DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ`,
    // sessions
    `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS reauth_required INTEGER DEFAULT 0`,
    `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ`,
    `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS revoke_reason TEXT DEFAULT ''`,
    `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_elevated INTEGER DEFAULT 0`,
    `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS elevated_expires_at TIMESTAMPTZ`,
    `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW()`,
    `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS location_id TEXT`,
    `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device_id TEXT`,
  ];

  for (const sql of alterations) {
    try {
      await db.exec(sql);
      const col = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1];
      console.log(`  ✓ ${col} added`);
    } catch (err) {
      if (/already exists/i.test(err.message)) {
        console.log(`  ⏭  column already exists, skipping`);
      } else {
        console.warn(`  ⚠ ${err.message}`);
      }
    }
  }
}

export async function down() {}
