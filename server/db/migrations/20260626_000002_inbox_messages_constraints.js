/**
 * inbox_messages data-layer tightening
 *
 * Enforces correctness at the DB level so the app never has to guess:
 *   patient_id     NOT NULL (fill '' for legacy system messages with no patient)
 *   provider_id    NOT NULL (fill '' for legacy messages sent before column existed)
 *   from_user_type NOT NULL CHECK IN ('patient','provider','system')
 *   to_user_type   NOT NULL CHECK IN ('patient','provider')
 *   read           BOOLEAN  NOT NULL DEFAULT false  (was INTEGER)
 *   urgent         BOOLEAN  NOT NULL DEFAULT false  (was INTEGER)
 *   is_active      BOOLEAN  NOT NULL DEFAULT true   (new — soft-delete gate)
 *
 * Indexes:
 *   idx_messages_patient_id
 *   idx_messages_provider_id
 *   idx_messages_thread   (patient_id, provider_id)
 *   idx_messages_created_at
 */

export async function up(db) {
  // ── 1. Add is_active before any NOT NULL work ─────────────────────────────
  await db.prepare(
    `ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`
  ).run();

  // ── 2. Back-fill NULLs so NOT NULL constraints can be set ────────────────
  // patient_id: system/alert messages have no patient — use empty string sentinel
  await db.prepare(
    `UPDATE inbox_messages SET patient_id = '' WHERE patient_id IS NULL`
  ).run();

  // provider_id: messages predating the portal column have no provider
  await db.prepare(
    `UPDATE inbox_messages SET provider_id = '' WHERE provider_id IS NULL`
  ).run();

  // from_user_type / to_user_type: default legacy rows to system→provider
  await db.prepare(
    `UPDATE inbox_messages SET from_user_type = 'system' WHERE from_user_type IS NULL`
  ).run();
  await db.prepare(
    `UPDATE inbox_messages SET to_user_type = 'provider' WHERE to_user_type IS NULL`
  ).run();

  // read / urgent: ensure no NULLs before type cast
  // On fresh installs these are INTEGER; on prod they were migrated to BOOLEAN already
  const readTypeRow = await db.prepare(
    `SELECT data_type FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name='inbox_messages' AND column_name='read'`
  ).get();
  const readIsInt = readTypeRow?.data_type === 'integer';
  if (readIsInt) {
    await db.prepare(`UPDATE inbox_messages SET read   = 0 WHERE read   IS NULL`).run();
    await db.prepare(`UPDATE inbox_messages SET urgent = 0 WHERE urgent IS NULL`).run();
  } else {
    await db.prepare(`UPDATE inbox_messages SET read   = false WHERE read   IS NULL`).run();
    await db.prepare(`UPDATE inbox_messages SET urgent = false WHERE urgent IS NULL`).run();
  }

  // ── 3. Set NOT NULL on the four required columns ──────────────────────────
  await db.prepare(`ALTER TABLE inbox_messages ALTER COLUMN patient_id     SET NOT NULL`).run();
  await db.prepare(`ALTER TABLE inbox_messages ALTER COLUMN provider_id    SET NOT NULL`).run();
  await db.prepare(`ALTER TABLE inbox_messages ALTER COLUMN from_user_type SET NOT NULL`).run();
  await db.prepare(`ALTER TABLE inbox_messages ALTER COLUMN to_user_type   SET NOT NULL`).run();

  // ── 4. Add DEFAULT values so future INSERTs that omit these columns work ──
  await db.prepare(`ALTER TABLE inbox_messages ALTER COLUMN patient_id     SET DEFAULT ''`).run();
  await db.prepare(`ALTER TABLE inbox_messages ALTER COLUMN provider_id    SET DEFAULT ''`).run();
  await db.prepare(`ALTER TABLE inbox_messages ALTER COLUMN from_user_type SET DEFAULT 'system'`).run();
  await db.prepare(`ALTER TABLE inbox_messages ALTER COLUMN to_user_type   SET DEFAULT 'provider'`).run();

  // ── 5. Cast read + urgent from INTEGER to BOOLEAN (skip if already boolean) ─
  if (readIsInt) {
    await db.prepare(
      `ALTER TABLE inbox_messages ALTER COLUMN read   TYPE BOOLEAN USING (read   != 0)`
    ).run();
    await db.prepare(
      `ALTER TABLE inbox_messages ALTER COLUMN urgent TYPE BOOLEAN USING (urgent != 0)`
    ).run();
  }
  await db.prepare(`ALTER TABLE inbox_messages ALTER COLUMN read   SET NOT NULL`).run();
  await db.prepare(`ALTER TABLE inbox_messages ALTER COLUMN urgent SET NOT NULL`).run();
  await db.prepare(`ALTER TABLE inbox_messages ALTER COLUMN read   SET DEFAULT false`).run();
  await db.prepare(`ALTER TABLE inbox_messages ALTER COLUMN urgent SET DEFAULT false`).run();

  // ── 6. CHECK constraints ──────────────────────────────────────────────────
  // Drop first if they somehow already exist (idempotent re-runs)
  await db.prepare(
    `ALTER TABLE inbox_messages DROP CONSTRAINT IF EXISTS chk_inbox_from_user_type`
  ).run();
  await db.prepare(
    `ALTER TABLE inbox_messages DROP CONSTRAINT IF EXISTS chk_inbox_to_user_type`
  ).run();

  await db.prepare(`
    ALTER TABLE inbox_messages
    ADD CONSTRAINT chk_inbox_from_user_type
    CHECK (from_user_type IN ('patient','provider','system'))
  `).run();
  await db.prepare(`
    ALTER TABLE inbox_messages
    ADD CONSTRAINT chk_inbox_to_user_type
    CHECK (to_user_type IN ('patient','provider'))
  `).run();

  // ── 7. Indexes ────────────────────────────────────────────────────────────
  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_messages_patient_id  ON inbox_messages(patient_id)`
  ).run();
  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_messages_provider_id ON inbox_messages(provider_id)`
  ).run();
  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_messages_thread      ON inbox_messages(patient_id, provider_id)`
  ).run();
  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_messages_created_at  ON inbox_messages(created_at)`
  ).run();
}

export async function down(db) {
  await db.prepare(`DROP INDEX IF EXISTS idx_messages_created_at`).run();
  await db.prepare(`DROP INDEX IF EXISTS idx_messages_thread`).run();
  await db.prepare(`DROP INDEX IF EXISTS idx_messages_provider_id`).run();
  await db.prepare(`DROP INDEX IF EXISTS idx_messages_patient_id`).run();

  await db.prepare(
    `ALTER TABLE inbox_messages DROP CONSTRAINT IF EXISTS chk_inbox_to_user_type`
  ).run();
  await db.prepare(
    `ALTER TABLE inbox_messages DROP CONSTRAINT IF EXISTS chk_inbox_from_user_type`
  ).run();

  await db.prepare(`ALTER TABLE inbox_messages ALTER COLUMN urgent TYPE INTEGER USING (urgent::int)`).run();
  await db.prepare(`ALTER TABLE inbox_messages ALTER COLUMN read   TYPE INTEGER USING (read::int)`).run();

  await db.prepare(`ALTER TABLE inbox_messages ALTER COLUMN to_user_type   DROP NOT NULL`).run();
  await db.prepare(`ALTER TABLE inbox_messages ALTER COLUMN from_user_type DROP NOT NULL`).run();
  await db.prepare(`ALTER TABLE inbox_messages ALTER COLUMN provider_id    DROP NOT NULL`).run();
  await db.prepare(`ALTER TABLE inbox_messages ALTER COLUMN patient_id     DROP NOT NULL`).run();

  await db.prepare(`ALTER TABLE inbox_messages DROP COLUMN IF EXISTS is_active`).run();
}
