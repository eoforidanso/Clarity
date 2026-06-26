/**
 * Audit Log Immutability: Make audit logs append-only
 *
 * Changes:
 * - Create immutable audit_log_immutable table (no DELETE, no UPDATE)
 * - Migrate existing audit_log to immutable table
 * - Add database-level constraints to enforce immutability
 * - Revoke DELETE/UPDATE permissions from app role
 */

export async function up(db) {
  console.log('[migration] Audit log immutability: making audit logs append-only');

  // 1. Create immutable audit log table (no indexes on CREATE to avoid conflicts with existing audit_log)
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS audit_log_immutable (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      resource_type TEXT,
      patient_id TEXT,
      user_id TEXT,
      user_name TEXT,
      ip_address TEXT,
      details TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `).run();

  // 2. Migrate existing audit logs (only if audit_log table exists)
  try {
    await db.prepare(`
      INSERT INTO audit_log_immutable (id, action, resource_type, patient_id, user_id, user_name, ip_address, details, created_at)
      SELECT id, action, resource_type, patient_id, user_id, user_name, ip_address, details, created_at
      FROM audit_log
      ON CONFLICT DO NOTHING
    `).run();
  } catch (err) {
    // audit_log table may not exist yet, that's okay
    console.log('[migration] audit_log table not found, skipping data migration');
  }

  // 3. Create indexes for query performance
  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_immutable_action ON audit_log_immutable(action, created_at DESC)
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_immutable_user ON audit_log_immutable(user_id, created_at DESC)
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_immutable_ip ON audit_log_immutable(ip_address, created_at DESC)
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_immutable_created ON audit_log_immutable(created_at DESC)
  `).run();

  // 4. Add triggers to prevent DELETE/UPDATE on immutable table
  // Note: INSERT-only enforcement happens in application code (logAudit function)
  await db.prepare(`
    CREATE OR REPLACE FUNCTION audit_log_prevent_delete()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'IMMUTABLE_TABLE: Audit logs are append-only and cannot be deleted. Id: %', OLD.id
        USING ERRCODE = 'integrity_constraint_violation',
              HINT = 'Audit logs are protected by database-level immutability triggers.';
    END;
    $$ LANGUAGE plpgsql;
  `).run();

  await db.prepare(`
    DROP TRIGGER IF EXISTS audit_log_immutable_delete_trigger ON audit_log_immutable;
    CREATE TRIGGER audit_log_immutable_delete_trigger
    BEFORE DELETE ON audit_log_immutable
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_prevent_delete();
  `).run();

  await db.prepare(`
    CREATE OR REPLACE FUNCTION audit_log_prevent_update()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'IMMUTABLE_TABLE: Audit logs are append-only and cannot be updated. Id: %', OLD.id
        USING ERRCODE = 'integrity_constraint_violation',
              HINT = 'Audit logs are protected by database-level immutability triggers.';
    END;
    $$ LANGUAGE plpgsql;
  `).run();

  await db.prepare(`
    DROP TRIGGER IF EXISTS audit_log_immutable_update_trigger ON audit_log_immutable;
    CREATE TRIGGER audit_log_immutable_update_trigger
    BEFORE UPDATE ON audit_log_immutable
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_prevent_update();
  `).run();

  // 4b. Additional safety: Truncate prevention
  await db.prepare(`
    CREATE OR REPLACE FUNCTION audit_log_prevent_truncate()
    RETURNS EVENT_TRIGGER AS $$
    BEGIN
      IF to_regclass('audit_log_immutable')::text = 'audit_log_immutable' THEN
        RAISE EXCEPTION 'IMMUTABLE_TABLE: Cannot truncate audit logs'
          USING ERRCODE = 'integrity_constraint_violation';
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `).run();

  try {
    await db.prepare(`
      DROP EVENT TRIGGER IF EXISTS audit_log_prevent_truncate_trigger;
      CREATE EVENT TRIGGER audit_log_prevent_truncate_trigger
      ON ddl_command_start
      WHEN tag IN ('TRUNCATE')
      EXECUTE FUNCTION audit_log_prevent_truncate();
    `).run();
  } catch (err) {
    // DigitalOcean managed PostgreSQL does not grant EVENT TRIGGER privileges — skip silently
    console.log('[migration] EVENT TRIGGER skipped (insufficient privileges — managed DB)');
  }

  // 5. Revoke DELETE/UPDATE permissions from app role (if it exists)
  try {
    await db.prepare(`REVOKE DELETE ON audit_log_immutable FROM app_user;`).run();
    await db.prepare(`REVOKE UPDATE ON audit_log_immutable FROM app_user;`).run();
  } catch (err) {
    // app_user role may not exist, that's okay
    console.log('[migration] app_user role not found, skipping permission revoke');
  }

  // 6. Create view for backwards compatibility with existing security.js queries
  // Maps column names from audit_log_immutable to what security code expects
  try {
    await db.prepare(`
      DROP VIEW IF EXISTS audit_logs CASCADE;
    `).run();

    await db.prepare(`
      CREATE VIEW audit_logs AS
      SELECT
        id,
        action,
        resource_type,
        patient_id AS target_id,
        resource_type AS target_type,
        user_id AS actor_id,
        user_name AS actor_name,
        ip_address AS ip,
        details,
        created_at
      FROM audit_log_immutable;
    `).run();

    console.log('[migration] Created audit_logs view for backwards compatibility');
  } catch (err) {
    console.error('[migration] Failed to create audit_logs view:', err.message);
  }

  console.log('[migration] Audit log immutability complete');
}

export async function down(db) {
  console.log('[migration] Rolling back audit log immutability');

  // Drop view
  await db.prepare(`DROP VIEW IF EXISTS audit_logs CASCADE;`).run();

  // Drop event trigger and function
  await db.prepare(`DROP EVENT TRIGGER IF EXISTS audit_log_prevent_truncate_trigger;`).run();
  await db.prepare(`DROP FUNCTION IF EXISTS audit_log_prevent_truncate();`).run();

  // Drop triggers
  await db.prepare(`DROP TRIGGER IF EXISTS audit_log_immutable_delete_trigger ON audit_log_immutable`).run();
  await db.prepare(`DROP TRIGGER IF EXISTS audit_log_immutable_update_trigger ON audit_log_immutable`).run();

  // Drop functions
  await db.prepare(`DROP FUNCTION IF EXISTS audit_log_prevent_delete()`).run();
  await db.prepare(`DROP FUNCTION IF EXISTS audit_log_prevent_update()`).run();

  // Drop immutable table
  await db.prepare(`DROP TABLE IF EXISTS audit_log_immutable`).run();

  console.log('[migration] Audit log immutability rolled back');
}
