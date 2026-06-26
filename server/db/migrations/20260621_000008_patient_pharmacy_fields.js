export async function up(db) {
  await db.prepare(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS preferred_pharmacy        TEXT NOT NULL DEFAULT ''`).run();
  await db.prepare(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS preferred_pharmacy_address TEXT NOT NULL DEFAULT ''`).run();
  await db.prepare(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS preferred_pharmacy_phone   TEXT NOT NULL DEFAULT ''`).run();
  await db.prepare(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS preferred_pharmacy_fax     TEXT NOT NULL DEFAULT ''`).run();
}

export async function down(db) {
  await db.prepare(`ALTER TABLE patients DROP COLUMN IF EXISTS preferred_pharmacy`).run();
  await db.prepare(`ALTER TABLE patients DROP COLUMN IF EXISTS preferred_pharmacy_address`).run();
  await db.prepare(`ALTER TABLE patients DROP COLUMN IF EXISTS preferred_pharmacy_phone`).run();
  await db.prepare(`ALTER TABLE patients DROP COLUMN IF EXISTS preferred_pharmacy_fax`).run();
}
