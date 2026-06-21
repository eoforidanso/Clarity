export async function up(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS epcs_transmissions (
      id            TEXT PRIMARY KEY,
      patient_id    TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      drug_id       TEXT NOT NULL DEFAULT '',
      drug_name     TEXT NOT NULL DEFAULT '',
      quantity      INTEGER NOT NULL DEFAULT 0,
      days_supply   INTEGER NOT NULL DEFAULT 0,
      refills       INTEGER NOT NULL DEFAULT 0,
      sig           TEXT NOT NULL DEFAULT '',
      pharmacy_npi  TEXT NOT NULL DEFAULT '',
      pharmacy_name TEXT NOT NULL DEFAULT '',
      provider_id   TEXT NOT NULL,
      provider_name TEXT NOT NULL DEFAULT '',
      dea_number    TEXT NOT NULL DEFAULT '',
      status        TEXT NOT NULL DEFAULT 'transmitted',
      dea_confirmation_id TEXT NOT NULL DEFAULT '',
      error_detail  TEXT NOT NULL DEFAULT '',
      transmitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      acknowledged_at TIMESTAMPTZ,
      dispensed_at    TIMESTAMPTZ,
      cancelled_at    TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_epcs_patient_id   ON epcs_transmissions(patient_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_epcs_provider_id  ON epcs_transmissions(provider_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_epcs_status       ON epcs_transmissions(status)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_epcs_transmitted  ON epcs_transmissions(transmitted_at)`).run();
}

export async function down(db) {
  await db.prepare(`DROP TABLE IF EXISTS epcs_transmissions`).run();
}
