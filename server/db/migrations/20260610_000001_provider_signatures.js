/**
 * Migration: provider_signatures table
 *
 * Stores each provider's electronic signature server-side so it:
 *   - follows the provider across devices and browsers
 *   - survives localStorage resets
 *   - is available for audit trails
 *   - enables historical Rx reconstruction independent of client state
 *
 * Design mirrors Epic / Athena / DrFirst:
 *   one row per provider (UPSERT on update)
 *   the Rx/Order payload freezes a copy of signature_data_url at signing time
 *   so historical records remain accurate even after the provider updates their sig
 *
 * signature_data_url: base64-encoded PNG data-URL ("data:image/png;base64,…")
 *   typical size: 30–200 KB raw  →  ~280 KB base64
 *   hard-capped at 512 KB in the route layer before it reaches the DB
 */
export async function up(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS provider_signatures (
      provider_id       TEXT        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      signature_data_url TEXT       NOT NULL,
      uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_provider_signatures_updated
      ON provider_signatures(updated_at DESC)
  `);

  console.log('  ✓ provider_signatures table created');
}

export async function down(db) {
  await db.exec(`DROP TABLE IF EXISTS provider_signatures`);
  console.log('  ✓ provider_signatures table dropped');
}
