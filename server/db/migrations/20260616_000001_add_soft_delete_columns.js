export async function up(db) {
  console.log('[migration] Adding soft-delete columns to users and locations');

  const alters = [
    `ALTER TABLE users     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
    `ALTER TABLE locations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
  ];

  for (const sql of alters) {
    try {
      await db.prepare(sql).run();
      const col = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1];
      const tbl = sql.match(/ALTER TABLE (\w+)/)?.[1];
      console.log(`[migration]   ✓ ${tbl}.${col} added`);
    } catch (err) {
      if (/already exists/i.test(err.message) || /duplicate column/i.test(err.message)) {
        console.log(`[migration]   ⏭ column already exists — skipping`);
      } else {
        throw err;
      }
    }
  }

  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_users_deleted_at     ON users(deleted_at)     WHERE deleted_at IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_locations_deleted_at ON locations(deleted_at) WHERE deleted_at IS NOT NULL`,
  ];

  for (const sql of indexes) {
    try {
      await db.prepare(sql).run();
    } catch (err) {
      console.log(`[migration]   ⏭ index skipped: ${err.message.split('\n')[0]}`);
    }
  }

  console.log('[migration] Soft-delete columns done');
}

export async function down(db) {
  // PostgreSQL doesn't support DROP COLUMN on partial indexes cleanly;
  // drop the indexes and leave the columns (dropping columns risks data loss).
  await db.prepare(`DROP INDEX IF EXISTS idx_users_deleted_at`).run();
  await db.prepare(`DROP INDEX IF EXISTS idx_locations_deleted_at`).run();
}
