export async function up(db) {
  await db.prepare(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS sticky_note TEXT DEFAULT ''`).run();
}

export async function down(db) {
  await db.prepare(`ALTER TABLE patients DROP COLUMN IF EXISTS sticky_note`).run();
}
