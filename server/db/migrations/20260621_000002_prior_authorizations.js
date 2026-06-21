export async function up(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS prior_authorizations (
      id               TEXT PRIMARY KEY,
      patient_id       TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      patient_name     TEXT NOT NULL DEFAULT '',
      location_id      TEXT,
      insurance        TEXT NOT NULL DEFAULT '',
      member_id        TEXT NOT NULL DEFAULT '',
      service_type     TEXT NOT NULL DEFAULT '',
      medication       TEXT NOT NULL DEFAULT '',
      cpt_code         TEXT NOT NULL DEFAULT '',
      icd_codes        JSONB NOT NULL DEFAULT '[]',
      requested_units  INTEGER NOT NULL DEFAULT 1,
      approved_units   INTEGER NOT NULL DEFAULT 0,
      provider         TEXT NOT NULL DEFAULT '',
      status           TEXT NOT NULL DEFAULT 'Pending Submission',
      auth_number      TEXT NOT NULL DEFAULT '',
      submit_date      TEXT,
      review_date      TEXT,
      effective_date   TEXT,
      expiration_date  TEXT,
      turnaround_days  INTEGER,
      notes            TEXT NOT NULL DEFAULT '',
      urgency          TEXT NOT NULL DEFAULT 'Standard',
      denial_reason    TEXT NOT NULL DEFAULT '',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_prior_auths_patient   ON prior_authorizations(patient_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_prior_auths_location  ON prior_authorizations(location_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_prior_auths_status    ON prior_authorizations(status)`).run();
}

export async function down(db) {
  await db.prepare(`DROP TABLE IF EXISTS prior_authorizations`).run();
}
