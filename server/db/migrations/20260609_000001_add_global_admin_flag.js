/**
 * Migration: add is_global flag for global vs local admin distinction
 * - users: is_global (BOOLEAN) - true for system admins who bypass facility scoping
 *
 * Architecture:
 * - Global Admin (is_global=true): can see/manage all facilities, no facility_id required
 * - Local Admin (is_global=false): limited to assigned facility via facility_id
 */
export async function up(db) {
  const alterations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_global INTEGER DEFAULT 0`,
  ];

  for (const sql of alterations) {
    try {
      await db.exec(sql);
      const col = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1];
      console.log(`  ✓ ${col} added`);
    } catch (err) {
      if (/already exists/i.test(err.message)) {
        console.log(`  ⏭  column already exists, skipping`);
      } else {
        console.warn(`  ⚠ ${err.message}`);
      }
    }
  }
}

export async function down() {}
