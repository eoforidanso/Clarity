/**
 * refill_tasks    — structured workflow row per refill request
 * lab_review_tasks — structured workflow row per resulted lab with abnormal flag
 *
 * linked_message_id ties each task to its inbox_messages row so
 * approve/deny in the inbox can resolve the task in one UPDATE.
 */

export async function up(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS refill_tasks (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id        TEXT        NOT NULL,
      provider_id       TEXT        NOT NULL DEFAULT '',
      refill_id         UUID,
      linked_message_id UUID,
      medication_name   TEXT        NOT NULL DEFAULT '',
      medication_id     TEXT,
      status            TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','denied','cancelled')),
      auto_urgent       BOOLEAN     NOT NULL DEFAULT false,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at       TIMESTAMPTZ
    )
  `).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_refill_tasks_patient   ON refill_tasks(patient_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_refill_tasks_provider  ON refill_tasks(provider_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_refill_tasks_status    ON refill_tasks(status)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_refill_tasks_msg       ON refill_tasks(linked_message_id)`).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS lab_review_tasks (
      id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id        TEXT        NOT NULL,
      provider_id       TEXT        NOT NULL DEFAULT '',
      order_id          TEXT,
      linked_message_id UUID,
      test_summary      TEXT        NOT NULL DEFAULT '',
      abnormal_flag     TEXT        NOT NULL DEFAULT '',
      status            TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','reviewed','acknowledged')),
      auto_urgent       BOOLEAN     NOT NULL DEFAULT false,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at       TIMESTAMPTZ
    )
  `).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_lab_review_tasks_patient  ON lab_review_tasks(patient_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_lab_review_tasks_provider ON lab_review_tasks(provider_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_lab_review_tasks_status   ON lab_review_tasks(status)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_lab_review_tasks_order    ON lab_review_tasks(order_id)`).run();
}

export async function down(db) {
  await db.prepare(`DROP TABLE IF EXISTS lab_review_tasks`).run();
  await db.prepare(`DROP TABLE IF EXISTS refill_tasks`).run();
}
