export async function up(db) {
  await db.prepare(`ALTER TABLE encounters ADD COLUMN IF NOT EXISTS raw_data TEXT`).run();
  await db.prepare(`ALTER TABLE encounters ADD COLUMN IF NOT EXISTS facility_id TEXT`).run();
}

export async function down(db) {
  await db.prepare(`ALTER TABLE encounters DROP COLUMN IF EXISTS raw_data`).run();
}
