/**
 * Adds rescheduled_from to appointments so the replacement appointment links
 * back to the original, enabling history tracking and audit trails.
 */

export async function up(db) {
  await db.prepare(`
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_from TEXT DEFAULT NULL
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_appointments_rescheduled_from
    ON appointments(rescheduled_from)
  `).run();
}

export async function down(db) {
  await db.prepare(`DROP INDEX IF EXISTS idx_appointments_rescheduled_from`).run();
}
