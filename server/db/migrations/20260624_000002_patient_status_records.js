export async function up(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS patient_status_records (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id       TEXT NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
      status           TEXT NOT NULL DEFAULT 'active',
      effective_date   DATE,
      date_of_death    DATE,
      cause_of_death   TEXT DEFAULT '',
      discharge_reason TEXT DEFAULT '',
      discharge_date   DATE,
      discharge_summary TEXT DEFAULT '',
      final_med_status  TEXT DEFAULT '',
      transfer_to       TEXT DEFAULT '',
      transfer_date     DATE,
      last_contact_date DATE,
      contact_attempts  INTEGER DEFAULT 0,
      notes             TEXT DEFAULT '',
      history           JSONB DEFAULT '[]'::jsonb,
      last_modified_by  TEXT DEFAULT '',
      last_modified     TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_psr_patient_id ON patient_status_records(patient_id)`).run();
}

export async function down(db) {
  await db.prepare(`DROP TABLE IF EXISTS patient_status_records CASCADE`).run();
}
