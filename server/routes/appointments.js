import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { CreateAppointmentSchema, UpdateAppointmentSchema, BlockedDaySchema, TelehealthConsentSchema } from '../schemas/appointmentSchema.js';
import { routeError } from '../utils/routeError.js';
import { validateResponse } from '../middleware/validateResponse.js';
import { AppointmentResponseSchema, AppointmentListResponseSchema } from '../schemas/responseSchemas.js';

const router = Router();
router.use(authenticate);

function formatAppt(r) { return {
    id: r.id, patientId: r.patient_id, patientName: r.patient_name, provider: r.provider, providerName: r.provider_name, date: r.date, time: r.time, duration: r.duration, type: r.type, status: r.status, reason: r.reason, visitType: r.visit_type, room: r.room, locationId: r.location_id || 'loc1',  };
}

// GET /api/appointments
router.get('/', validateResponse(AppointmentListResponseSchema), async (req, res) => {
  const { date, provider, status, startDate, endDate, locationId } = req.query;
  const facilityId = req.user.facility_id;
  const isGlobal   = req.access.canSeeAll;

  let query = 'SELECT * FROM appointments WHERE 1=1';
  const params = [];

  // Scope to facility unless global role
  if (!isGlobal && facilityId) { query += ' AND location_id = ?'; params.push(facilityId); }

  if (date)       { query += ' AND date = ?';       params.push(date); }
  if (provider)   { query += ' AND provider = ?';   params.push(provider); }
  if (status)     { query += ' AND status = ?';     params.push(status); }
  if (startDate)  { query += ' AND date >= ?';      params.push(startDate); }
  if (endDate)    { query += ' AND date <= ?';      params.push(endDate); }
  if (locationId) { query += ' AND location_id = ?'; params.push(locationId); }
  query += ' ORDER BY date ASC, time ASC';

  const rows = await db.prepare(query).all(...params);
  res.json(rows.map(formatAppt));
});

// POST /api/appointments
router.post('/', validate(CreateAppointmentSchema), validateResponse(AppointmentResponseSchema), async (req, res) => {
  try {
    const b = req.body;
    const id = uuidv4();
    const locationId = b.locationId || req.user.facility_id || null;
    await db.prepare('INSERT INTO appointments (id, patient_id, patient_name, provider, provider_name, date, time, duration, type, status, reason, visit_type, room, location_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)').run(
      id, b.patientId || null, b.patientName || '', b.provider || '', b.providerName || '', b.date, b.time, b.duration || 30, b.type || 'Office Visit', b.status || 'Scheduled', b.reason || '', b.visitType || 'In-Person', b.room || '', locationId
    );
    const row = await db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
    res.status(201).json(formatAppt(row));
  } catch (err) {
    routeError(req, '[appointments] POST /', err);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// PUT /api/appointments/:id
router.put('/:id', validate(UpdateAppointmentSchema), validateResponse(AppointmentResponseSchema), async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Appointment not found' });

    const b = req.body;
    await db.prepare(`UPDATE appointments SET patient_id=?, patient_name=?, provider=?, provider_name=?, date=?, time=?, duration=?, type=?, status=?, reason=?, visit_type=?, room=?, location_id=?, updated_at=NOW() WHERE id=?`).run(
      b.patientId ?? existing.patient_id, b.patientName ?? existing.patient_name, b.provider ?? existing.provider, b.providerName ?? existing.provider_name, b.date ?? existing.date, b.time ?? existing.time, b.duration ?? existing.duration, b.type ?? existing.type, b.status ?? existing.status, b.reason ?? existing.reason, b.visitType ?? existing.visit_type, b.room ?? existing.room, b.locationId ?? existing.location_id, req.params.id
    );

    const row = await db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    res.json(formatAppt(row));
  } catch (err) {
    routeError(req, '[appointments] PUT /:id', err);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// DELETE /api/appointments/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Appointment not found' });

    const { role, facility_id, isGlobal } = req.user;
    const canDelete = isGlobal || ['admin', 'front_desk'].includes(role) ||
      (!facility_id || existing.location_id === facility_id);
    if (!canDelete) return res.status(403).json({ error: 'Not authorized to delete this appointment' });

    await db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    routeError(req, '[appointments] DELETE /:id', err);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

// ─── BLOCKED DAYS ─────────────────────────────────────────────

// GET /api/appointments/blocked-days
router.get('/blocked-days/list', async (req, res) => {
  try {
    const { provider } = req.query;
    let query = 'SELECT * FROM blocked_days';
    const params = [];
    if (provider) { query += ' WHERE provider = ?'; params.push(provider); }
    query += ' ORDER BY date ASC';
    const rows = await db.prepare(query).all(...params);
    res.json(rows.map(r => ({ id: r.id, provider: r.provider, date: r.date, blockType: r.block_type, reason: r.reason })));
  } catch (err) {
    routeError(req, '[appointments] GET /blocked-days/list', err);
    res.status(500).json({ error: 'Failed to load blocked days' });
  }
});

// POST /api/appointments/blocked-days
router.post('/blocked-days', validate(BlockedDaySchema), async (req, res) => {
  try {
    const b = req.body;
    const id = uuidv4();
    await db.prepare('INSERT INTO blocked_days (id, provider, date, block_type, reason) VALUES ($1,$2,$3,$4,$5)').run(
      id, b.provider, b.date, b.blockType || 'full', b.reason || ''
    );
    res.status(201).json({ id, ...b });
  } catch (err) {
    routeError(req, '[appointments] POST /blocked-days', err);
    res.status(500).json({ error: 'Failed to block day' });
  }
});

// DELETE /api/appointments/blocked-days/:id
router.delete('/blocked-days/:id', async (req, res) => {
  try {
    await db.prepare('DELETE FROM blocked_days WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    routeError(req, '[appointments] DELETE /blocked-days/:id', err);
    res.status(500).json({ error: 'Failed to delete blocked day' });
  }
});

// ── Telehealth Recording Consent ─────────────────────────────────────────────

// POST /api/appointments/telehealth-consent
// Records provider-confirmed recording consent before a session starts.
router.post('/telehealth-consent', authenticate, validate(TelehealthConsentSchema), async (req, res) => { const {
    sessionId, appointmentId, patientId, patientName, patientLocation, recordingConsent, // 'granted' | 'denied' | 'not_asked'
    recordingConsentMethod, // 'verbal' | 'written' | 'waived'
    providerConfirmed, // boolean
    complianceChecklist, // { locationConfirmed, consentExplained, privacyReminded, emergencyProtocol }
  } = req.body;

  if (!sessionId || !patientName || !recordingConsent || !providerConfirmed) { return res.status(400).json({ error: 'sessionId, patientName, recordingConsent and providerConfirmed are required' });
  }

  const VALID_CONSENT = ['granted', 'denied', 'not_asked'];
  const VALID_METHOD  = ['verbal', 'written', 'waived', null, undefined];
  if (!VALID_CONSENT.includes(recordingConsent)) { return res.status(400).json({ error: 'Invalid recordingConsent value' });
  }
  if (!VALID_METHOD.includes(recordingConsentMethod)) { return res.status(400).json({ error: 'Invalid recordingConsentMethod value' });
  }

  const row = await db.prepare(`
    INSERT INTO telehealth_consents
      (session_id, appointment_id, patient_id, provider_id, patient_name,
       patient_location, recording_consent, recording_consent_method,
       provider_confirmed, compliance_checklist, ip_address)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING id, consented_at
  `).get(
    sessionId,
    appointmentId || null,
    patientId || null,
    req.user.id,
    patientName,
    patientLocation || null,
    recordingConsent,
    recordingConsentMethod || null,
    providerConfirmed ? true : false,
    complianceChecklist ? JSON.stringify(complianceChecklist) : null,
    req.ip || null,
  );

  res.status(201).json({ ok: true, consentId: row.id, consentedAt: row.consented_at });
});

// GET /api/appointments/telehealth-consent/:sessionId
// Retrieve consent record for a session (for audit / post-session display).
router.get('/telehealth-consent/:sessionId', authenticate, async (req, res) => { const row = await db.prepare(`
    SELECT * FROM telehealth_consents WHERE session_id = $1 ORDER BY consented_at DESC LIMIT 1
  `).get(req.params.sessionId);
  if (!row) return res.status(404).json({ error: 'No consent record found' });
  res.json({ id: row.id, sessionId: row.session_id, patientName: row.patient_name, patientLocation: row.patient_location, recordingConsent: row.recording_consent, recordingConsentMethod: row.recording_consent_method, providerConfirmed: row.provider_confirmed, complianceChecklist: row.compliance_checklist, consentedAt: row.consented_at,  });
});

// ── Telehealth Session Participants ──────────────────────────────────────────

// POST /api/appointments/telehealth-session/join
router.post('/telehealth-session/join', async (req, res) => {
  const { appointmentId, mode } = req.body;
  if (!appointmentId) return res.status(400).json({ error: 'appointmentId required' });

  // Deactivate any prior active entry for this user + appointment
  await db.prepare(`
    UPDATE telehealth_session_participants
    SET is_active = false, left_at = NOW()
    WHERE appointment_id = $1 AND user_id = $2 AND is_active = true
  `).run(appointmentId, req.user.id);

  const id = uuidv4();
  const userName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email;
  await db.prepare(`
    INSERT INTO telehealth_session_participants
      (id, appointment_id, user_id, user_name, user_role, join_mode, is_active)
    VALUES ($1,$2,$3,$4,$5,$6,true)
  `).run(id, appointmentId, req.user.id, userName, req.user.role, mode || 'provider');

  res.status(201).json({ ok: true, participantId: id });
});

// POST /api/appointments/telehealth-session/leave
router.post('/telehealth-session/leave', async (req, res) => {
  const { appointmentId } = req.body;
  if (!appointmentId) return res.status(400).json({ error: 'appointmentId required' });

  await db.prepare(`
    UPDATE telehealth_session_participants
    SET is_active = false, left_at = NOW()
    WHERE appointment_id = $1 AND user_id = $2 AND is_active = true
  `).run(appointmentId, req.user.id);

  res.json({ ok: true });
});

// POST /api/appointments/telehealth-session/checkin
router.post('/telehealth-session/checkin', async (req, res) => {
  const { appointmentId, checkinData } = req.body;
  if (!appointmentId || !checkinData) {
    return res.status(400).json({ error: 'appointmentId and checkinData required' });
  }

  const userName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email;
  const dataJson = JSON.stringify({ ...checkinData, completedBy: userName, completedAt: new Date().toISOString() });

  const existing = await db.prepare(`
    SELECT id FROM telehealth_session_participants
    WHERE appointment_id = $1 AND user_id = $2 AND is_active = true
  `).get(appointmentId, req.user.id);

  if (existing) {
    await db.prepare(`
      UPDATE telehealth_session_participants
      SET checkin_data = $1, join_mode = 'checkin'
      WHERE id = $2
    `).run(dataJson, existing.id);
  } else {
    const id = uuidv4();
    await db.prepare(`
      INSERT INTO telehealth_session_participants
        (id, appointment_id, user_id, user_name, user_role, join_mode, checkin_data, is_active)
      VALUES ($1,$2,$3,$4,$5,'checkin',$6,1)
    `).run(id, appointmentId, req.user.id, userName, req.user.role, dataJson);
  }

  // Advance appointment status to Checked In
  await db.prepare(`UPDATE appointments SET status = 'Checked In' WHERE id = $1`).run(appointmentId);

  res.json({ ok: true });
});

// GET /api/appointments/telehealth-session/:aptId/participants
router.get('/telehealth-session/:aptId/participants', async (req, res) => {
  const rows = await db.prepare(`
    SELECT id, user_id, user_name, user_role, join_mode, joined_at, left_at, checkin_data, is_active
    FROM telehealth_session_participants
    WHERE appointment_id = $1
    ORDER BY joined_at ASC
  `).all(req.params.aptId);

  res.json(rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    userRole: r.user_role,
    joinMode: r.join_mode,
    joinedAt: r.joined_at,
    leftAt: r.left_at,
    checkinData: r.checkin_data ? JSON.parse(r.checkin_data) : null,
    isActive: !!r.is_active,
  })));
});

// GET /api/schedule/availability?providerId=xxx&date=YYYY-MM-DD
// Returns a 30-minute slot availability matrix for a provider on a given date.
router.get('/availability', async (req, res) => {
  try {
    const { providerId, date } = req.query;
    if (!providerId || !date) return res.status(400).json({ error: 'providerId and date required' });

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const isToday   = date === todayStr;
    const isPastDate = date < todayStr;
    const nowMins   = now.getHours() * 60 + now.getMinutes();

    const toMins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

    // Check for a full-day block
    const blockedDay = await db.prepare(
      `SELECT block_type FROM blocked_days WHERE provider = ? AND date = ? LIMIT 1`
    ).get(providerId, date);
    const isFullyBlocked = blockedDay?.block_type === 'full' || (!blockedDay?.block_type && !!blockedDay);

    // Non-cancelled/no-show appointments for this provider on this date
    const appts = await db.prepare(
      `SELECT time, duration FROM appointments
       WHERE provider = ? AND date = ? AND status NOT IN ('Cancelled','No Show')`
    ).all(providerId, date);

    const slots = [];
    for (let h = 7; h <= 20; h++) {
      for (const m of [0, 30]) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const slotMins = h * 60 + m;
        const slotEnd  = slotMins + 30;
        let status = 'available';
        if (isPastDate || (isToday && slotMins <= nowMins)) {
          status = 'past';
        } else if (isFullyBlocked) {
          status = 'blocked';
        } else if (appts.some(a => { const s = toMins(a.time); const e = s + Number(a.duration || 30); return s < slotEnd && e > slotMins; })) {
          status = 'booked';
        }
        slots.push({ time, status });
      }
    }
    res.json({ providerId, date, slots });
  } catch (err) {
    routeError(req, '[appointments] GET /availability', err);
    res.status(500).json({ error: 'Failed to compute availability' });
  }
});

export default router;
