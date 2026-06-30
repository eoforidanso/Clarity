/**
 * Smart slot suggestion engine.
 *
 * When a scheduling conflict occurs, getSmartSuggestions() returns up to 5
 * alternative time slots for the same provider, ranked by proximity to the
 * originally requested time.
 *
 * Each suggestion: { time, date, providerId, reason, label }
 */

import db from '../db/database.js';

const INACTIVE = `('Cancelled','No Show','Rescheduled')`;
const toMins = t => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };

function dateToKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// All 30-min slots that fit within working hours for a given appointment duration
function validSlots(duration) {
  const slots = [];
  for (let h = 7; h <= 20; h++) {
    for (const m of [0, 30]) {
      if (h * 60 + m + duration <= 20 * 60) {
        slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
      }
    }
  }
  return slots;
}

// Returns free time strings on a given date for this provider
async function getFreeSlots(providerId, date, duration, excludeId = null) {
  // Blocked day → nothing available
  const blocked = await db.prepare(
    `SELECT 1 FROM blocked_days WHERE provider = $1 AND date = $2 LIMIT 1`
  ).get(providerId, date);
  if (blocked) return [];

  // Get active booked intervals
  const params = [providerId, date];
  let sql = `SELECT time, duration FROM appointments
             WHERE provider = $1 AND date = $2 AND status NOT IN ${INACTIVE}`;
  if (excludeId) { params.push(excludeId); sql += ` AND id != $${params.length}`; }
  const rows = await db.prepare(sql).all(...params);

  const intervals = rows.map(r => {
    const s = toMins(r.time);
    return { s, e: s + Number(r.duration || 30) };
  });

  return validSlots(duration).filter(t => {
    const start = toMins(t); const end = start + duration;
    return !intervals.some(i => i.s < end && i.e > start);
  });
}

// ── Master suggestion function ────────────────────────────────────────────────
export async function getSmartSuggestions({ providerId, date, time, duration = 30, excludeId = null }) {
  if (!providerId || !date || !time) return [];

  const reqMins = toMins(time);
  const suggestions = [];
  const seen = new Set();

  const addSuggestion = (t, d, reason, label) => {
    const key = `${d}|${t}`;
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push({ time: t, date: d, providerId, reason, label });
  };

  // ── 1. Same-day slots sorted by proximity ─────────────────────────────────
  const sameDayFree = await getFreeSlots(providerId, date, duration, excludeId);

  // Nearest slot (closest, before or after)
  const nearest = [...sameDayFree].sort((a, b) =>
    Math.abs(toMins(a) - reqMins) - Math.abs(toMins(b) - reqMins)
  );
  if (nearest[0]) addSuggestion(nearest[0], date, 'Nearest open slot today', 'Nearest');
  if (nearest[1] && nearest[1] !== nearest[0]) addSuggestion(nearest[1], date, 'Next nearest today', 'Near');

  // Next slot after requested time
  const nextAfter = sameDayFree.filter(t => toMins(t) > reqMins)[0];
  if (nextAfter) addSuggestion(nextAfter, date, 'Next available today', 'Available');

  // Same block (morning 7-12, afternoon 12-17, evening 17-20)
  const block = reqMins < 12*60 ? [7*60, 12*60] : reqMins < 17*60 ? [12*60, 17*60] : [17*60, 20*60];
  const sameBlock = sameDayFree.filter(t => { const m = toMins(t); return m >= block[0] && m < block[1] && toMins(t) !== reqMins; })[0];
  if (sameBlock) addSuggestion(sameBlock, date, 'Same time block today', 'Same block');

  // ── 2. Next available day (forward scan, up to 14 days) ───────────────────
  if (suggestions.length < 5) {
    const [y, mo, d] = date.split('-').map(Number);
    let scan = new Date(y, mo - 1, d + 1);

    for (let i = 0; i < 14 && suggestions.length < 5; i++) {
      const scanKey = dateToKey(scan);
      const slots = await getFreeSlots(providerId, scanKey, duration, excludeId);
      if (slots.length > 0) {
        const label = scan.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        addSuggestion(slots[0], scanKey, `Next available — ${label}`, label);
        break;
      }
      scan.setDate(scan.getDate() + 1);
    }
  }

  return suggestions.slice(0, 5);
}
