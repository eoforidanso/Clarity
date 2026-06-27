/**
 * inbox_messages: thread_key + category
 *
 * thread_key — denormalized conversation bucket (patient_id:provider_id).
 *   Lets the frontend group messages into threads without a JOIN.
 *   Uses 'unassigned' when provider_id is empty so the key is always stable.
 *
 * category — patient-side classification for portal inbox grouping.
 *   Back-fills from existing type values where deterministic.
 *   CHECK constraint keeps future inserts honest.
 */

export async function up(db) {
  // ── thread_key ──────────────────────────────────────────────────────────────
  await db.prepare(
    `ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS thread_key TEXT NOT NULL DEFAULT ''`
  ).run();

  await db.prepare(`
    UPDATE inbox_messages
    SET thread_key = patient_id || ':' || COALESCE(NULLIF(provider_id, ''), 'unassigned')
    WHERE thread_key = '' OR thread_key IS NULL
  `).run();

  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_messages_thread_key ON inbox_messages(thread_key)`
  ).run();

  // ── category ────────────────────────────────────────────────────────────────
  await db.prepare(
    `ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'General'`
  ).run();

  // Drop + re-add CHECK so it's idempotent
  await db.prepare(
    `ALTER TABLE inbox_messages DROP CONSTRAINT IF EXISTS chk_inbox_category`
  ).run();
  await db.prepare(`
    ALTER TABLE inbox_messages
    ADD CONSTRAINT chk_inbox_category
    CHECK (category IN ('General','Medication','Labs','Appointment','Refill','Billing'))
  `).run();

  // Back-fill known type → category mappings
  await db.prepare(`UPDATE inbox_messages SET category = 'Refill'      WHERE type = 'Rx Refill Request' AND category = 'General'`).run();
  await db.prepare(`UPDATE inbox_messages SET category = 'Labs'        WHERE type = 'Lab Result'         AND category = 'General'`).run();
  await db.prepare(`UPDATE inbox_messages SET category = 'Appointment' WHERE (type = 'Staff Message' AND subject ILIKE '%appointment%') AND category = 'General'`).run();
}

export async function down(db) {
  await db.prepare(`ALTER TABLE inbox_messages DROP CONSTRAINT IF EXISTS chk_inbox_category`).run();
  await db.prepare(`DROP INDEX IF EXISTS idx_messages_thread_key`).run();
  await db.prepare(`ALTER TABLE inbox_messages DROP COLUMN IF EXISTS category`).run();
  await db.prepare(`ALTER TABLE inbox_messages DROP COLUMN IF EXISTS thread_key`).run();
}
