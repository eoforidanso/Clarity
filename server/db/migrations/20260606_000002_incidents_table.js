/**
 * Migration: create incidents table for auto-response engine
 */
export async function up(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS incidents (
      id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     TEXT        NOT NULL,
      facility_id TEXT,
      type        TEXT        NOT NULL,
      severity    TEXT        NOT NULL DEFAULT 'medium',
      action_taken TEXT       NOT NULL,
      metadata    TEXT        DEFAULT '{}',
      resolved    BOOLEAN     NOT NULL DEFAULT FALSE,
      resolved_at TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_incidents_user     ON incidents(user_id);
    CREATE INDEX IF NOT EXISTS idx_incidents_facility ON incidents(facility_id);
    CREATE INDEX IF NOT EXISTS idx_incidents_type     ON incidents(type);
    CREATE INDEX IF NOT EXISTS idx_incidents_created  ON incidents(created_at DESC);
  `);
  console.log('  ✓ incidents table created');
}

export async function down(db) {
  await db.exec('DROP TABLE IF EXISTS incidents');
}
