/**
 * Patient duplicate detection engine.
 *
 * Checkers return: { hasConflict, type, reason, matches[] }
 * detectPatientConflicts() runs all checks in parallel and aggregates.
 *
 * Callers should return HTTP 409 when hasConflict is true, unless
 * the user has acknowledged the duplicates (forceCreate flag).
 */

import db from '../db/database.js';

const norm  = s => (s || '').toLowerCase().trim();
const normPhone = p => (p || '').replace(/\D/g, '');

const SAFE_FIELDS = `id, mrn, first_name, last_name, dob, phone, cell_phone, email,
  address_street, address_city, address_state, address_zip`;

function toSafe(row) {
  return {
    id: row.id, mrn: row.mrn,
    firstName: row.first_name, lastName: row.last_name, dob: row.dob,
    phone: row.phone, email: row.email,
    address: {
      street: row.address_street, city: row.address_city,
      state: row.address_state,  zip: row.address_zip,
    },
  };
}

// ── 1. Same first name + last name + DOB (hard) ──────────────────────────────
export async function checkNameDobConflict({ firstName, lastName, dob }, excludeId = null) {
  if (!firstName || !lastName || !dob) return { hasConflict: false };
  const params = [norm(firstName), norm(lastName), dob];
  let sql = `SELECT ${SAFE_FIELDS} FROM patients
             WHERE LOWER(TRIM(first_name)) = $1 AND LOWER(TRIM(last_name)) = $2 AND dob = $3`;
  if (excludeId) { params.push(excludeId); sql += ` AND id != $${params.length}`; }
  const rows = await db.prepare(sql).all(...params);
  if (!rows.length) return { hasConflict: false };
  return {
    hasConflict: true, type: 'name_dob',
    reason: `A patient named ${firstName} ${lastName} born on ${dob} already exists`,
    matches: rows.map(toSafe),
  };
}

// ── 2. Same email address (hard) ─────────────────────────────────────────────
export async function checkEmailConflict({ email }, excludeId = null) {
  const e = norm(email);
  if (!e) return { hasConflict: false };
  const params = [e];
  let sql = `SELECT ${SAFE_FIELDS} FROM patients
             WHERE LOWER(TRIM(email)) = $1 AND email != ''`;
  if (excludeId) { params.push(excludeId); sql += ` AND id != $${params.length}`; }
  const rows = await db.prepare(sql).all(...params);
  if (!rows.length) return { hasConflict: false };
  return {
    hasConflict: true, type: 'email',
    reason: `Email ${email} is already registered to another patient`,
    matches: rows.map(toSafe),
  };
}

// ── 3. Same insurance subscriber / member ID (hard) ──────────────────────────
export async function checkInsuranceConflict({ insuranceName, memberId }, excludeId = null) {
  const m = (memberId || '').trim();
  if (!m || m.length < 4) return { hasConflict: false };
  const params = [m];
  let sql = `SELECT ${SAFE_FIELDS}, insurance_primary_name FROM patients
             WHERE TRIM(insurance_primary_member_id) = $1 AND insurance_primary_member_id != ''`;
  if (insuranceName) {
    params.push(norm(insuranceName));
    sql += ` AND LOWER(TRIM(insurance_primary_name)) = $${params.length}`;
  }
  if (excludeId) { params.push(excludeId); sql += ` AND id != $${params.length}`; }
  const rows = await db.prepare(sql).all(...params);
  if (!rows.length) return { hasConflict: false };
  return {
    hasConflict: true, type: 'insurance_member_id',
    reason: `Insurance member ID "${memberId}" is already on file for another patient`,
    matches: rows.map(toSafe),
  };
}

// ── 4. Same portal account email already linked to a different patient (hard) ─
export async function checkPortalAccountConflict({ email }, excludeId = null) {
  const e = norm(email);
  if (!e) return { hasConflict: false };
  const params = [e];
  let sql = `SELECT pu.email, pu.linked_patient_id,
               p.id, p.mrn, p.first_name, p.last_name, p.dob
             FROM portal_users pu
             JOIN patients p ON p.id = pu.linked_patient_id
             WHERE LOWER(pu.email) = $1
               AND pu.linked_patient_id IS NOT NULL
               AND pu.status != 'disabled'`;
  if (excludeId) { params.push(excludeId); sql += ` AND pu.linked_patient_id != $${params.length}`; }
  const rows = await db.prepare(sql).all(...params);
  if (!rows.length) return { hasConflict: false };
  return {
    hasConflict: true, type: 'portal_account',
    reason: `Email ${email} is already linked to a patient portal account`,
    matches: rows.map(r => ({
      id: r.linked_patient_id, mrn: r.mrn,
      firstName: r.first_name, lastName: r.last_name, dob: r.dob, email: r.email,
    })),
  };
}

// ── 5. Same phone + same last name (soft) ────────────────────────────────────
export async function checkPhoneConflict({ lastName, phone, cellPhone }, excludeId = null) {
  const phones = [normPhone(phone), normPhone(cellPhone)].filter(p => p.length >= 10);
  if (!phones.length || !lastName) return { hasConflict: false };
  const matches = new Map();
  for (const ph of phones) {
    const params = [ph, ph, norm(lastName)];
    let sql = `SELECT ${SAFE_FIELDS} FROM patients
               WHERE (REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $1
                   OR REGEXP_REPLACE(cell_phone, '[^0-9]', '', 'g') = $2)
                 AND LOWER(TRIM(last_name)) = $3`;
    if (excludeId) { params.push(excludeId); sql += ` AND id != $${params.length}`; }
    const rows = await db.prepare(sql).all(...params);
    rows.forEach(r => { if (!matches.has(r.id)) matches.set(r.id, toSafe(r)); });
  }
  if (!matches.size) return { hasConflict: false };
  return {
    hasConflict: true, type: 'phone',
    reason: 'Another patient with the same last name and phone number already exists',
    matches: [...matches.values()],
  };
}

// ── 6. Same address + same last name (soft) ───────────────────────────────────
export async function checkAddressConflict({ lastName, street, zip }, excludeId = null) {
  const s = norm(street); const z = (zip || '').replace(/\D/g, '').slice(0, 5);
  if (!s || !z || !lastName) return { hasConflict: false };
  const params = [s, z, norm(lastName)];
  let sql = `SELECT ${SAFE_FIELDS} FROM patients
             WHERE LOWER(TRIM(address_street)) = $1
               AND REPLACE(address_zip, '-', '') LIKE $2 || '%'
               AND LOWER(TRIM(last_name)) = $3`;
  if (excludeId) { params.push(excludeId); sql += ` AND id != $${params.length}`; }
  const rows = await db.prepare(sql).all(...params);
  if (!rows.length) return { hasConflict: false };
  return {
    hasConflict: true, type: 'address',
    reason: 'Another patient with the same last name and address already exists',
    matches: rows.map(toSafe),
  };
}

// ── 7. Same guardian / emergency contact (soft — catches minor duplicates) ────
export async function checkGuardianConflict({ guardianName, guardianPhone }, excludeId = null) {
  const name = norm(guardianName); const phone = normPhone(guardianPhone);
  if (!name || phone.length < 10) return { hasConflict: false };
  const params = [name, phone];
  let sql = `SELECT ${SAFE_FIELDS} FROM patients
             WHERE LOWER(TRIM(emergency_contact_name)) = $1
               AND REGEXP_REPLACE(emergency_contact_phone, '[^0-9]', '', 'g') = $2`;
  if (excludeId) { params.push(excludeId); sql += ` AND id != $${params.length}`; }
  const rows = await db.prepare(sql).all(...params);
  if (!rows.length) return { hasConflict: false };
  return {
    hasConflict: true, type: 'guardian',
    reason: 'Another patient with the same guardian/emergency contact exists — possible minor duplicate',
    matches: rows.map(toSafe),
  };
}

// ── Master detector — runs all checks in parallel ────────────────────────────
export async function detectPatientConflicts({
  firstName, lastName, dob,
  email,
  phone, cellPhone,
  street, zip,
  memberId, insuranceName,
  guardianName, guardianPhone,
}, excludeId = null) {
  const results = await Promise.all([
    checkNameDobConflict({ firstName, lastName, dob }, excludeId),
    checkEmailConflict({ email }, excludeId),
    checkInsuranceConflict({ insuranceName, memberId }, excludeId),
    checkPortalAccountConflict({ email }, excludeId),
    checkPhoneConflict({ lastName, phone, cellPhone }, excludeId),
    checkAddressConflict({ lastName, street, zip }, excludeId),
    checkGuardianConflict({ guardianName, guardianPhone }, excludeId),
  ]);

  const conflicts = results.filter(r => r.hasConflict);
  if (!conflicts.length) return { hasConflict: false };

  // Deduplicate patients that appear across multiple checkers
  const allMatches = new Map();
  conflicts.forEach(c => {
    c.matches?.forEach(m => { if (!allMatches.has(m.id)) allMatches.set(m.id, m); });
  });

  return {
    hasConflict: true,
    conflicts: conflicts.map(c => ({ type: c.type, reason: c.reason })),
    reason: conflicts[0].reason,
    matches: [...allMatches.values()].slice(0, 5),
  };
}
