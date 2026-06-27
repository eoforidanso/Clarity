/**
 * Add portal_last_login to patients table
 *
 * Used by GET /patient-portal/me to surface "Last portal login" to the patient,
 * and stamped on both OTP and password login paths so staff can see activity.
 */

export async function up(db) {
  await db.prepare(
    `ALTER TABLE patients ADD COLUMN IF NOT EXISTS portal_last_login TIMESTAMPTZ`
  ).run();
}

export async function down(db) {
  await db.prepare(
    `ALTER TABLE patients DROP COLUMN IF EXISTS portal_last_login`
  ).run();
}
