export async function up(db) {
  console.log('[migration] Creating secure_notes table');
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS secure_notes (
      id           TEXT PRIMARY KEY,
      patient_id   TEXT REFERENCES patients(id) ON DELETE CASCADE,
      patient_name TEXT NOT NULL DEFAULT '',
      mrn          TEXT NOT NULL DEFAULT '',
      type         TEXT NOT NULL DEFAULT 'Sticky Note',
      content      TEXT NOT NULL,
      color        TEXT NOT NULL DEFAULT 'yellow',
      visibility   TEXT NOT NULL DEFAULT 'All Staff',
      author       TEXT NOT NULL DEFAULT '',
      created_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
      pinned       INTEGER NOT NULL DEFAULT 0,
      expires_date TEXT,
      created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_secure_notes_patient ON secure_notes(patient_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_secure_notes_created_by ON secure_notes(created_by)`).run();

  console.log('[migration] secure_notes table created');
}

export async function down(db) {
  await db.prepare('DROP TABLE IF EXISTS secure_notes').run();
}
