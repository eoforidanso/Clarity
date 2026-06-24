export async function up(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS superbill_statuses (
      encounter_id      TEXT PRIMARY KEY,
      patient_id        TEXT,
      billing_status    TEXT NOT NULL DEFAULT 'unbilled',
      claim_status      TEXT DEFAULT '',
      billed_amount     NUMERIC(10,2),
      paid_amount       NUMERIC(10,2),
      adjustment_amount NUMERIC(10,2),
      payer             TEXT DEFAULT '',
      claim_number      TEXT DEFAULT '',
      date_submitted    DATE,
      date_paid         DATE,
      notes             TEXT DEFAULT '',
      last_updated      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by        TEXT DEFAULT ''
    )
  `).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_superbill_patient ON superbill_statuses(patient_id)`).run();
}

export async function down(db) {
  await db.prepare(`DROP TABLE IF EXISTS superbill_statuses`).run();
}
