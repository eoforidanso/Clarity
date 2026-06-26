export async function up(db) {
  // lat/lon + taxonomy code on existing pharmacies table
  await db.prepare(`ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS lat           DOUBLE PRECISION`).run();
  await db.prepare(`ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS lon           DOUBLE PRECISION`).run();
  await db.prepare(`ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS taxonomy_code TEXT DEFAULT ''`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_pharm_latlon ON pharmacies(lat, lon) WHERE lat IS NOT NULL`).run();

  // ZIP centroid cache — 30-day TTL, populated by zippopotam.us
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS zip_geocache (
      zip        TEXT PRIMARY KEY,
      lat        DOUBLE PRECISION NOT NULL,
      lon        DOUBLE PRECISION NOT NULL,
      city       TEXT DEFAULT '',
      state      TEXT DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).run();

  // Future-proof DoseSpot / Surescripts mapping
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS pharmacy_mappings (
      npi            TEXT PRIMARY KEY,
      ncpdp          TEXT DEFAULT '',
      surescripts_id TEXT DEFAULT '',
      epcs_capable   INTEGER DEFAULT 0,
      last_verified  TIMESTAMPTZ DEFAULT NOW()
    )
  `).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_phmap_ncpdp ON pharmacy_mappings(ncpdp)`).run();
}

export async function down(db) {
  await db.prepare(`DROP TABLE IF EXISTS pharmacy_mappings`).run();
  await db.prepare(`DROP TABLE IF EXISTS zip_geocache`).run();
  await db.prepare(`ALTER TABLE pharmacies DROP COLUMN IF EXISTS taxonomy_code`).run();
  await db.prepare(`ALTER TABLE pharmacies DROP COLUMN IF EXISTS lon`).run();
  await db.prepare(`ALTER TABLE pharmacies DROP COLUMN IF EXISTS lat`).run();
}
