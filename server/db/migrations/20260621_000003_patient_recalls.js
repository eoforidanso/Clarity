export async function up(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS patient_recalls (
      id               TEXT PRIMARY KEY,
      patient_id       TEXT REFERENCES patients(id) ON DELETE CASCADE,
      patient_name     TEXT NOT NULL DEFAULT '',
      mrn              TEXT NOT NULL DEFAULT '',
      phone            TEXT NOT NULL DEFAULT '',
      email            TEXT NOT NULL DEFAULT '',
      reason           TEXT NOT NULL DEFAULT '',
      detail           TEXT NOT NULL DEFAULT '',
      last_visit       TEXT,
      next_due         TEXT,
      outreach_status  TEXT NOT NULL DEFAULT 'Not Started',
      attempts         INTEGER NOT NULL DEFAULT 0,
      last_attempt     TEXT,
      method           TEXT NOT NULL DEFAULT '',
      notes            TEXT NOT NULL DEFAULT '',
      provider         TEXT NOT NULL DEFAULT '',
      location_id      TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_patient_recalls_patient  ON patient_recalls(patient_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_patient_recalls_location ON patient_recalls(location_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_patient_recalls_status   ON patient_recalls(outreach_status)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_patient_recalls_due      ON patient_recalls(next_due)`).run();
}

export async function down(db) {
  await db.prepare(`DROP TABLE IF EXISTS patient_recalls`).run();
}
