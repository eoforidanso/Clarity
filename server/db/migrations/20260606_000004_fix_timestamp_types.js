/**
 * Migration: convert TEXT timestamp columns to TIMESTAMPTZ
 *
 * Root cause of the 42883 op_error crashes — TEXT columns were being
 * compared directly to NOW() (timestamptz), which PostgreSQL rejects.
 *
 * This migration changes the column types permanently so no ::cast is needed.
 */
export async function up(db) {
  const conversions = [
    // [table, column]
    ['audit_logs',  'created_at'],
    ['sessions',    'created_at'],
    ['sessions',    'expires_at'],
    ['sessions',    'last_seen_at'],
    ['sessions',    'revoked_at'],
    ['sessions',    'elevated_expires_at'],
    ['users',       'created_at'],
    ['users',       'updated_at'],
    ['users',       'locked_at'],
    ['btg_access',  'expires_at'],
    ['anomalies',   'detected_at'],
    ['anomalies',   'resolved_at'],
    ['refresh_tokens', 'expires_at'],
    ['refresh_tokens', 'created_at'],
    ['refresh_tokens', 'last_used_at'],
  ];

  for (const [table, column] of conversions) {
    try {
      await db.exec(`
        ALTER TABLE ${table}
        ALTER COLUMN ${column} TYPE TIMESTAMPTZ
        USING ${column}::timestamptz
      `);
      console.log(`  ✓ ${table}.${column} → TIMESTAMPTZ`);
    } catch (err) {
      if (/does not exist/.test(err.message)) {
        console.log(`  ⏭  ${table}.${column} — table/column missing, skipping`);
      } else if (/already/.test(err.message) || /timestamp/.test(err.message.toLowerCase())) {
        console.log(`  ⏭  ${table}.${column} — already correct type`);
      } else {
        console.warn(`  ⚠  ${table}.${column}: ${err.message}`);
      }
    }
  }
}

export async function down() {
  // Intentionally not reversing — going back to TEXT timestamps is not safe
}
