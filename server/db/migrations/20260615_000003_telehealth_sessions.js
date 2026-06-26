export async function up(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS telehealth_session_participants (
      id                TEXT PRIMARY KEY,
      appointment_id    TEXT,
      user_id           TEXT,
      user_name         TEXT NOT NULL,
      user_role         TEXT NOT NULL DEFAULT 'staff',
      join_mode         TEXT NOT NULL DEFAULT 'provider',
      joined_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      left_at           TIMESTAMP WITH TIME ZONE,
      checkin_data      TEXT,
      is_active         INTEGER NOT NULL DEFAULT 1
    )
  `).run();

  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_th_session_apt
     ON telehealth_session_participants(appointment_id, is_active)`
  ).run();

  console.log('[migration] telehealth_session_participants table created');
}
