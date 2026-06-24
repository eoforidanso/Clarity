export async function up(db) {
  await db.prepare(`ALTER TABLE refills ADD COLUMN IF NOT EXISTS pharmacy_address TEXT DEFAULT ''`).run();
  await db.prepare(`ALTER TABLE refills ADD COLUMN IF NOT EXISTS pharmacy_fax     TEXT DEFAULT ''`).run();
}

export async function down(db) {
  await db.prepare(`ALTER TABLE refills DROP COLUMN IF EXISTS pharmacy_address`).run();
  await db.prepare(`ALTER TABLE refills DROP COLUMN IF EXISTS pharmacy_fax`).run();
}
