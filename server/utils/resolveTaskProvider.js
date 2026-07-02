import db from '../db/database.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve which provider a triage task (refill request, abnormal lab)
 * should be routed to. Resolution order:
 *   1. candidateId, when it is a user id (e.g. the ordering provider)
 *   2. the patient's assigned_provider
 *   3. an unlocked prescriber at the patient's clinic
 *   4. any unlocked prescriber
 * Returns '' only when the system has no prescribers at all.
 */
export async function resolveTaskProvider({ candidateId = '', patientId = null } = {}) {
  if (UUID_RE.test(candidateId || '')) return candidateId;

  let locationId = null;
  if (patientId) {
    const patient = await db.prepare(
      'SELECT assigned_provider, primary_location FROM patients WHERE id = $1'
    ).get(patientId);
    if (patient?.assigned_provider) return patient.assigned_provider;
    locationId = patient?.primary_location || null;
  }

  if (locationId) {
    const local = await db.prepare(
      `SELECT id FROM users
       WHERE role = 'prescriber' AND is_locked IS NOT TRUE AND location_id = $1
       LIMIT 1`
    ).get(locationId);
    if (local) return local.id;
  }

  const any = await db.prepare(
    `SELECT id FROM users WHERE role = 'prescriber' AND is_locked IS NOT TRUE LIMIT 1`
  ).get();
  return any?.id || '';
}
