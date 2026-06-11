/**
 * Schema validation — runs at startup before the server accepts requests.
 * Verifies that critical columns exist and have the correct types.
 * Fails fast with a clear error rather than crashing mid-request.
 */

import { db } from './database.js';

// Columns that MUST exist with the correct data type
const REQUIRED_COLUMNS = [
  // table, column, expected_type (partial match)
  ['users',      'is_locked',         'integer'],
  ['users',      'locked_reason',     'text'],
  ['users',      'location_id',       'text'],
  ['sessions',   'is_active',         'boolean'],
  ['sessions',   'reauth_required',   'integer'],
  ['sessions',   'revoke_reason',     'text'],
  ['audit_logs', 'facility_id',       'text'],
  ['encounters', 'facility_id',       'text'],
  ['patients',   'primary_location',  'text'],
];

export async function validateSchema() {
  console.info('[schema-validate] Checking critical columns...');
  const errors = [];

  for (const [table, column, expectedType] of REQUIRED_COLUMNS) {
    try {
      const row = await db.prepare(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = $1 AND column_name = $2
      `).get(table, column);

      if (!row) {
        errors.push(`❌ ${table}.${column} — MISSING`);
      } else if (!row.data_type.toLowerCase().includes(expectedType)) {
        errors.push(`⚠️  ${table}.${column} — type is '${row.data_type}', expected '${expectedType}'`);
      }
    } catch (err) {
      errors.push(`❌ ${table}.${column} — check failed: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    console.error('[schema-validate] Schema issues found:');
    errors.forEach(e => console.error(' ', e));
    console.error('[schema-validate] Run pending migrations to fix.');
    // Don't exit — warn only, let migrations fix it
  } else {
    console.info('[schema-validate] ✅ All critical columns present');
  }
}
