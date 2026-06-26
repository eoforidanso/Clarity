export async function up(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS treatment_plans (
      id                   TEXT PRIMARY KEY,
      patient_id           TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      provider_id          TEXT NOT NULL REFERENCES users(id),
      location_id          TEXT,
      patient_name         TEXT NOT NULL DEFAULT '',
      provider_name        TEXT NOT NULL DEFAULT '',
      status               TEXT NOT NULL DEFAULT 'Active',
      diagnoses            JSONB NOT NULL DEFAULT '[]',
      goals                JSONB NOT NULL DEFAULT '[]',
      session_frequency    TEXT,
      anticipated_duration TEXT,
      review_date          TEXT,
      next_review_date     TEXT,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).run();

  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient   ON treatment_plans(patient_id)`
  ).run();
  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_treatment_plans_provider  ON treatment_plans(provider_id)`
  ).run();
  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_treatment_plans_location  ON treatment_plans(location_id)`
  ).run();
}

export async function down(db) {
  await db.prepare(`DROP TABLE IF EXISTS treatment_plans`).run();
}
