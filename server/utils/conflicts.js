/**
 * Conflict detection engine — mirrors the logic used in Athena/Epic/Elation.
 *
 * All checkers return: { hasConflict, type, reason, conflictingAppointment }
 * detectAllConflicts() runs them in priority order and returns on first hit.
 */

import db from '../db/database.js';

// Statuses that no longer hold a time slot
const INACTIVE = `('Cancelled','No Show','Rescheduled')`;

const toMins = t => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// ── 1. Working hours ────────────────────────────────────────────────────────
// Configurable: 7:00 AM – 8:00 PM.  No DB call needed.
export function checkWorkingHoursConflict({ time, duration }) {
  if (!time) return { hasConflict: false };
  const start = toMins(time);
  const end   = start + Number(duration || 30);
  if (start < 7 * 60) {
    return {
      hasConflict: true,
      type: 'working_hours',
      reason: `Appointment at ${time} is before working hours (7:00 AM)`,
      conflictingAppointment: null,
    };
  }
  if (end > 20 * 60) {
    return {
      hasConflict: true,
      type: 'working_hours',
      reason: `Appointment would end after working hours (8:00 PM)`,
      conflictingAppointment: null,
    };
  }
  return { hasConflict: false };
}

// ── 2. Blocked day ──────────────────────────────────────────────────────────
export async function checkBlockedDayConflict({ providerId, date }) {
  if (!providerId || !date) return { hasConflict: false };
  const r = await db.prepare(
    `SELECT reason FROM blocked_days WHERE provider = $1 AND date = $2 LIMIT 1`
  ).get(providerId, date);
  if (r) {
    return {
      hasConflict: true,
      type: 'blocked_day',
      reason: `Provider is unavailable on ${date}${r.reason ? ': ' + r.reason : ''}`,
      conflictingAppointment: null,
    };
  }
  return { hasConflict: false };
}

// ── 3. Provider double-booking ───────────────────────────────────────────────
// Checks whether any active appointment for this provider overlaps [time, time+duration).
export async function checkProviderConflict({ providerId, date, time, duration, excludeId = null }) {
  if (!providerId || !date || !time) return { hasConflict: false };
  const newStart = toMins(time);
  const newEnd   = newStart + Number(duration || 30);

  const params = [providerId, date];
  let sql = `
    SELECT id, patient_name, time, duration, type, status
    FROM   appointments
    WHERE  provider = $1
      AND  date     = $2
      AND  status NOT IN ${INACTIVE}
  `;
  if (excludeId) { params.push(excludeId); sql += ` AND id != $${params.length}`; }

  const rows = await db.prepare(sql).all(...params);
  for (const r of rows) {
    const s = toMins(r.time);
    const e = s + Number(r.duration || 30);
    if (s < newEnd && e > newStart) {
      return {
        hasConflict: true,
        type: 'provider_double_book',
        reason: `Provider is already booked for "${r.patient_name || 'a patient'}" at ${r.time} (${r.type}, ${r.duration || 30} min)`,
        conflictingAppointment: {
          id: r.id, patientName: r.patient_name,
          time: r.time, duration: r.duration, type: r.type, status: r.status,
        },
      };
    }
  }
  return { hasConflict: false };
}

// ── 4. Room / location conflict ──────────────────────────────────────────────
// Only triggered when a non-virtual room is specified.
export async function checkRoomConflict({ room, locationId, date, time, duration, excludeId = null }) {
  const cleaned = (room || '').trim().toLowerCase();
  if (!cleaned || cleaned === 'virtual') return { hasConflict: false };

  const newStart = toMins(time);
  const newEnd   = newStart + Number(duration || 30);

  const params = [room.trim(), date];
  let sql = `
    SELECT id, patient_name, time, duration, type, provider_name
    FROM   appointments
    WHERE  LOWER(TRIM(room)) = LOWER(TRIM($1))
      AND  date = $2
      AND  room != ''
      AND  status NOT IN ${INACTIVE}
  `;
  if (locationId) { params.push(locationId); sql += ` AND location_id = $${params.length}`; }
  if (excludeId)  { params.push(excludeId);  sql += ` AND id != $${params.length}`; }

  const rows = await db.prepare(sql).all(...params);
  for (const r of rows) {
    const s = toMins(r.time);
    const e = s + Number(r.duration || 30);
    if (s < newEnd && e > newStart) {
      return {
        hasConflict: true,
        type: 'room_conflict',
        reason: `Room "${room}" is already booked at ${r.time} by ${r.provider_name || 'another provider'}`,
        conflictingAppointment: {
          id: r.id, patientName: r.patient_name,
          time: r.time, duration: r.duration, type: r.type,
        },
      };
    }
  }
  return { hasConflict: false };
}

// ── 5. Patient same-day conflict ─────────────────────────────────────────────
// One active appointment per patient per calendar day.
export async function checkPatientConflict({ patientId, patientName, date, excludeId = null }) {
  if (!patientId && !patientName) return { hasConflict: false };

  const params = [date];
  let sql = `
    SELECT id, patient_name, time, type
    FROM   appointments
    WHERE  date = $1
      AND  status NOT IN ${INACTIVE}
  `;
  if (patientId) {
    params.push(patientId);
    sql += ` AND patient_id = $${params.length}`;
  } else {
    params.push(patientName.trim().toLowerCase());
    sql += ` AND LOWER(TRIM(patient_name)) = $${params.length}`;
  }
  if (excludeId) { params.push(excludeId); sql += ` AND id != $${params.length}`; }
  sql += ' LIMIT 1';

  const r = await db.prepare(sql).get(...params);
  if (r) {
    return {
      hasConflict: true,
      type: 'patient_conflict',
      reason: `${r.patient_name || patientName} already has an appointment on ${date} at ${r.time}`,
      conflictingAppointment: { id: r.id, patientName: r.patient_name, time: r.time, type: r.type },
    };
  }
  return { hasConflict: false };
}

// ── Master detector ──────────────────────────────────────────────────────────
// Run all checks in priority order; return on first conflict.
export async function detectAllConflicts({
  providerId,
  patientId    = null,
  patientName  = null,
  room         = null,
  locationId   = null,
  date,
  time,
  duration     = 30,
  excludeId    = null,   // appointment ID to skip (used during PUT / reschedule)
}) {
  // 1. Working hours (sync, cheapest)
  const hours = checkWorkingHoursConflict({ time, duration });
  if (hours.hasConflict) return hours;

  // 2. Provider blocked day
  const blocked = await checkBlockedDayConflict({ providerId, date });
  if (blocked.hasConflict) return blocked;

  // 3. Provider double-booking (most common conflict)
  const providerConflict = await checkProviderConflict({ providerId, date, time, duration, excludeId });
  if (providerConflict.hasConflict) return providerConflict;

  // 4. Room conflict (only when a physical room is assigned)
  if (room && room.trim() && room.trim().toLowerCase() !== 'virtual') {
    const roomConflict = await checkRoomConflict({ room, locationId, date, time, duration, excludeId });
    if (roomConflict.hasConflict) return roomConflict;
  }

  // 5. Patient same-day conflict
  if (patientId || patientName) {
    const patientConflict = await checkPatientConflict({ patientId, patientName, date, excludeId });
    if (patientConflict.hasConflict) return patientConflict;
  }

  return { hasConflict: false };
}
