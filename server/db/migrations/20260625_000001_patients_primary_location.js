export async function up(db) {
  await db.prepare(`
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS primary_location TEXT DEFAULT NULL
  `).run();
}

export async function down(db) {
  await db.prepare(`ALTER TABLE patients DROP COLUMN IF EXISTS primary_location`).run();
}
