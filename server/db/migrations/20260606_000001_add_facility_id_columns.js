/**
 * Migration: add facility_id to documents, encounters, notes, audit_log
 *
 * Adds the facility_id column (nullable) to every table that records
 * patient/clinical data so all queries can be scoped per facility.
 * Existing rows get NULL facility_id and remain visible to global roles.
 */
export async function up(db) {
  const cols = [
    { table: 'documents',   col: 'facility_id' },
    { table: 'encounters',  col: 'facility_id' },
    { table: 'notes',       col: 'facility_id' },
    { table: 'audit_log',   col: 'facility_id' },
  ];

  for (const { table, col } of cols) {
    try {
      await db.exec(
        `ALTER TABLE ${table} ADD COLUMN ${col} TEXT`
      );
      console.log(`  ✓ ${table}.${col} added`);
    } catch (err) {
      // Column already exists — safe to skip
      if (/already exists/i.test(err.message) || /duplicate column/i.test(err.message)) {
        console.log(`  ⏭  ${table}.${col} already exists, skipping`);
      } else {
        throw err;
      }
    }
  }

  // Index facility_id on the high-volume tables for fast scoped queries
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_documents_facility  ON documents(facility_id)',
    'CREATE INDEX IF NOT EXISTS idx_encounters_facility ON encounters(facility_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_facility  ON audit_log(facility_id)',
  ];

  for (const sql of indexes) {
    await db.exec(sql);
  }
}

export async function down(db) {
  // PostgreSQL does not support DROP COLUMN easily on older versions;
  // dropping indexes is safe.
  const drops = [
    'DROP INDEX IF EXISTS idx_documents_facility',
    'DROP INDEX IF EXISTS idx_encounters_facility',
    'DROP INDEX IF EXISTS idx_audit_log_facility',
  ];
  for (const sql of drops) {
    await db.exec(sql);
  }
}
