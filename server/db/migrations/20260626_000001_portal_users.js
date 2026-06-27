/**
 * Portal auth tables
 *
 * portal_users        — one row per patient account, owns status + linked_patient_id
 * portal_sessions     — retained for audit; auth now uses signed JWTs
 * portal_invitations  — staff-generated invite codes (gold path)
 * portal_audit_log    — immutable event log
 *
 * Status lifecycle:
 *   pending_verification → linked (after chart match or invite activation)
 *   linked → disabled    (staff action)
 *
 * linked_patient_id is NULL until status = 'linked'. Any account with
 * status = 'linked' AND linked_patient_id IS NULL is invalid and cannot
 * receive a session.
 */

export async function up(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS portal_users (
      id                TEXT        PRIMARY KEY,
      email             TEXT        NOT NULL UNIQUE,
      password_hash     TEXT,
      first_name        TEXT        NOT NULL DEFAULT '',
      last_name         TEXT        NOT NULL DEFAULT '',
      date_of_birth     TEXT,
      phone             TEXT        DEFAULT '',
      address_line1     TEXT        DEFAULT '',
      address_line2     TEXT        DEFAULT '',
      city              TEXT        DEFAULT '',
      state             TEXT        DEFAULT '',
      zip               TEXT        DEFAULT '',
      linked_patient_id TEXT        REFERENCES patients(id),
      status            TEXT        NOT NULL DEFAULT 'pending_verification'
                                    CHECK (status IN ('pending_verification','linked','disabled')),
      otp_code          TEXT,
      otp_expires       TIMESTAMPTZ,
      otp_attempts      INTEGER     DEFAULT 0,
      login_attempts    INTEGER     DEFAULT 0,
      locked_until      TIMESTAMPTZ,
      created_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `).run();

  // Add login_attempts to existing databases where the table was created inline
  await db.prepare(
    `ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0`
  ).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS portal_sessions (
      id             TEXT        PRIMARY KEY,
      portal_user_id TEXT        NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
      token_hash     TEXT        NOT NULL UNIQUE,
      expires_at     TIMESTAMPTZ NOT NULL,
      ip_address     TEXT        DEFAULT '',
      user_agent     TEXT        DEFAULT '',
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS portal_invitations (
      id            TEXT        PRIMARY KEY,
      patient_id    TEXT        NOT NULL REFERENCES patients(id),
      invite_code   TEXT        NOT NULL UNIQUE,
      sent_to_email TEXT        DEFAULT '',
      created_by    TEXT        REFERENCES users(id),
      expires_at    TIMESTAMPTZ NOT NULL,
      used_at       TIMESTAMPTZ,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS portal_audit_log (
      id             TEXT        PRIMARY KEY,
      portal_user_id TEXT        REFERENCES portal_users(id),
      patient_id     TEXT        REFERENCES patients(id),
      event_type     TEXT        NOT NULL,
      metadata       JSONB       DEFAULT '{}',
      ip_address     TEXT        DEFAULT '',
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `).run();

  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_portal_users_email      ON portal_users(LOWER(email))`,
    `CREATE INDEX IF NOT EXISTS idx_portal_users_patient    ON portal_users(linked_patient_id)`,
    `CREATE INDEX IF NOT EXISTS idx_portal_users_status     ON portal_users(status)`,
    `CREATE INDEX IF NOT EXISTS idx_portal_sessions_token   ON portal_sessions(token_hash)`,
    `CREATE INDEX IF NOT EXISTS idx_portal_sessions_user    ON portal_sessions(portal_user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_portal_invites_code     ON portal_invitations(invite_code)`,
    `CREATE INDEX IF NOT EXISTS idx_portal_invites_patient  ON portal_invitations(patient_id)`,
    `CREATE INDEX IF NOT EXISTS idx_portal_audit_user       ON portal_audit_log(portal_user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_portal_audit_patient    ON portal_audit_log(patient_id)`,
    `CREATE INDEX IF NOT EXISTS idx_portal_audit_event      ON portal_audit_log(event_type)`,
  ];
  for (const sql of indexes) {
    await db.prepare(sql).run();
  }
}

export async function down(db) {
  // Drop in reverse FK order
  await db.prepare(`DROP TABLE IF EXISTS portal_audit_log`).run();
  await db.prepare(`DROP TABLE IF EXISTS portal_invitations`).run();
  await db.prepare(`DROP TABLE IF EXISTS portal_sessions`).run();
  await db.prepare(`DROP TABLE IF EXISTS portal_users`).run();
}
