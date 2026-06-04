/**
 * Migration: Add device tracking columns and telehealth consent table
 * Applied: 2026-06-04
 *
 * These columns were added manually during development.
 * This migration brings them under version control.
 */

export async function up(db) {
  // sessions.device_id FK (added during device tracking work)
  await db.prepare(`
    ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS device_id INTEGER REFERENCES user_devices(id) ON DELETE SET NULL
  `).run();

  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_sessions_device ON sessions(device_id)`
  ).run();

  // patients portal columns (added during patient portal work)
  await db.prepare(`
    ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS portal_otp            TEXT,
    ADD COLUMN IF NOT EXISTS portal_otp_expires    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS portal_otp_attempts   INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS portal_locked_until   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS portal_last_login     TIMESTAMPTZ
  `).run();

  // telehealth_consents table
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS telehealth_consents (
      id               SERIAL PRIMARY KEY,
      session_id       TEXT NOT NULL,
      appointment_id   TEXT,
      patient_id       TEXT REFERENCES patients(id),
      provider_id      TEXT,
      patient_name     TEXT NOT NULL,
      patient_location TEXT,
      recording_consent        TEXT NOT NULL CHECK (recording_consent IN ('granted','denied','not_asked')),
      recording_consent_method TEXT CHECK (recording_consent_method IN ('verbal','written','waived')),
      provider_confirmed       BOOLEAN NOT NULL DEFAULT FALSE,
      compliance_checklist     JSONB,
      consented_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ip_address       TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).run();

  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_th_consent_session ON telehealth_consents(session_id)`
  ).run();
  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_th_consent_patient ON telehealth_consents(patient_id)`
  ).run();
}

export async function down(db) {
  await db.prepare(`DROP TABLE IF EXISTS telehealth_consents`).run();
  await db.prepare(`ALTER TABLE patients DROP COLUMN IF EXISTS portal_otp`).run();
  await db.prepare(`ALTER TABLE patients DROP COLUMN IF EXISTS portal_otp_expires`).run();
  await db.prepare(`ALTER TABLE patients DROP COLUMN IF EXISTS portal_otp_attempts`).run();
  await db.prepare(`ALTER TABLE patients DROP COLUMN IF EXISTS portal_locked_until`).run();
  await db.prepare(`ALTER TABLE patients DROP COLUMN IF EXISTS portal_last_login`).run();
  await db.prepare(`ALTER TABLE sessions DROP COLUMN IF EXISTS device_id`).run();
}
