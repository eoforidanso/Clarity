export async function up(db) {
  // Central pharmacy directory — NCPDP-keyed, cached from DoseSpot
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS pharmacies (
      id                   TEXT PRIMARY KEY,
      ncpdp_id             TEXT UNIQUE,
      npi                  TEXT DEFAULT '',
      name                 TEXT NOT NULL,
      chain                TEXT DEFAULT '',
      address_street       TEXT DEFAULT '',
      address_city         TEXT DEFAULT '',
      address_state        TEXT DEFAULT '',
      address_zip          TEXT DEFAULT '',
      phone                TEXT DEFAULT '',
      fax                  TEXT DEFAULT '',
      pharmacy_type        TEXT DEFAULT 'retail',
      is_24h               INTEGER DEFAULT 0,
      surescripts_capable  INTEGER DEFAULT 0,
      epcs_capable         INTEGER DEFAULT 0,
      source               TEXT DEFAULT 'manual',
      cached_at            TIMESTAMPTZ,
      is_active            INTEGER DEFAULT 1,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_pharm_ncpdp   ON pharmacies(ncpdp_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_pharm_npi     ON pharmacies(npi)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_pharm_zip     ON pharmacies(address_zip)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_pharm_state   ON pharmacies(address_state)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_pharm_name    ON pharmacies(name)`).run();

  // FK from patients to their preferred pharmacy record
  await db.prepare(`
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS preferred_pharmacy_id TEXT
  `).run();

  // Store NCPDP ID on prescriptions so routing is exact
  await db.prepare(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS pharmacy_ncpdp_id TEXT
  `).run();
  await db.prepare(`
    ALTER TABLE medications ADD COLUMN IF NOT EXISTS pharmacy_ncpdp_id TEXT
  `).run();
}

export async function down(db) {
  await db.prepare(`ALTER TABLE patients    DROP COLUMN IF EXISTS preferred_pharmacy_id`).run();
  await db.prepare(`ALTER TABLE orders      DROP COLUMN IF EXISTS pharmacy_ncpdp_id`).run();
  await db.prepare(`ALTER TABLE medications DROP COLUMN IF EXISTS pharmacy_ncpdp_id`).run();
  await db.prepare(`DROP TABLE IF EXISTS pharmacies`).run();
}
