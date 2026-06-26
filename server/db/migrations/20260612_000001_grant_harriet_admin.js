/**
 * Grant Harriet Full Security Admin Access
 *
 * Removes restrictions, gives full visibility & control
 */

export async function up(db) {
  console.log('[migration] Granting Harriet full security admin access');

  // Ensure column exists (may not if 20260609 used a different column name)
  await db.prepare(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_global_admin INTEGER DEFAULT 0`).run();

  // Find Harriet's user record
  const harriet = await db.prepare(`
    SELECT id FROM users WHERE email = $1 OR username = $1
  `).get('harriet');

  if (!harriet) {
    console.error('[migration] Harriet not found in users table');
    return;
  }

  // Update Harriet's role to 'admin' (if not already)
  await db.prepare(`
    UPDATE users
    SET role = 'admin', is_global_admin = 1, updated_at = NOW()
    WHERE id = $1
  `).run(harriet.id);

  // Grant explicit security permissions (if using permission table)
  try {
    await db.prepare(`
      INSERT INTO user_permissions (user_id, permission, granted_at)
      VALUES
        ($1, 'VIEW_ALL_ANOMALIES', NOW()),
        ($1, 'RESOLVE_ANOMALIES', NOW()),
        ($1, 'VIEW_ALL_SESSIONS', NOW()),
        ($1, 'UNLOCK_ACCOUNTS', NOW()),
        ($1, 'VIEW_AUDIT_LOGS', NOW()),
        ($1, 'EXPORT_SECURITY_DATA', NOW()),
        ($1, 'MANAGE_SECURITY_SETTINGS', NOW()),
        ($1, 'SYSTEM_WIDE_ACCESS', NOW())
      ON CONFLICT DO NOTHING
    `).run(harriet.id);
  } catch (err) {
    // user_permissions table may not exist in this deployment — role grant above is sufficient
    console.log('[migration] user_permissions table not found, skipping permission rows');
  }

  console.log('[migration] ✅ Harriet now has full security admin access');
}

export async function down(db) {
  console.log('[migration] Rolling back Harriet access changes');

  const harriet = await db.prepare(`
    SELECT id FROM users WHERE email = $1 OR username = $1
  `).get('harriet');

  if (harriet) {
    await db.prepare(`
      UPDATE users
      SET role = 'provider', is_global_admin = false, updated_at = NOW()
      WHERE id = $1
    `).run(harriet.id);

    await db.prepare(`
      DELETE FROM user_permissions
      WHERE user_id = $1 AND permission LIKE 'VIEW_%' OR permission LIKE '%_ANOMALIES'
    `).run(harriet.id);
  }

  console.log('[migration] Harriet access rolled back');
}
