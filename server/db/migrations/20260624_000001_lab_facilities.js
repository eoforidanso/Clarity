export async function up(db) {
  // Primary lab facility directory — mirrors pharmacies table structure + CLIA
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS lab_facilities (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      npi           TEXT UNIQUE,
      name          TEXT NOT NULL,
      address       TEXT DEFAULT '',
      city          TEXT DEFAULT '',
      state         TEXT DEFAULT '',
      zip           TEXT DEFAULT '',
      lat           DOUBLE PRECISION,
      lon           DOUBLE PRECISION,
      clia_number   TEXT DEFAULT '',
      taxonomy_code TEXT DEFAULT '',
      phone         TEXT DEFAULT '',
      fax           TEXT DEFAULT '',
      is_active     BOOLEAN DEFAULT true,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_lab_latlon ON lab_facilities(lat, lon) WHERE lat IS NOT NULL`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_lab_zip    ON lab_facilities(zip)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_lab_state  ON lab_facilities(state)`).run();

  // NPI → CLIA → internal lab_facility mapping
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS lab_mappings (
      npi             TEXT PRIMARY KEY,
      clia_number     TEXT DEFAULT '',
      internal_lab_id UUID REFERENCES lab_facilities(id) ON DELETE SET NULL,
      last_verified   TIMESTAMPTZ DEFAULT NOW()
    )
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_labmap_clia ON lab_mappings(clia_number)`).run();
}

export async function down(db) {
  await db.prepare(`DROP TABLE IF EXISTS lab_mappings`).run();
  await db.prepare(`DROP TABLE IF EXISTS lab_facilities`).run();
}
