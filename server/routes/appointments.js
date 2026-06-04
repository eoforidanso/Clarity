import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

function formatAppt(r) {
  return {
    id: r.id, patientId: r.patient_id, patientName: r.patient_name,
    provider: r.provider, providerName: r.provider_name,
    date: r.date, time: r.time, duration: r.duration, type: r.type,
    status: r.status, reason: r.reason, visitType: r.visit_type, room: r.room,
    locationId: r.location_id || 'loc1',
  };
}

// GET /api/appointments
router.get('/', async (req, res) => {
  const { date, provider, status, startDate, endDate, locationId } = req.query;
  let query = 'SELECT * FROM appointments WHERE 1=1';
  const params = [];

  if (date) { query += ' AND date = ?'; params.push(date); }
  if (provider) { query += ' AND provider = ?'; params.push(provider); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (startDate) { query += ' AND date >= ?'; params.push(startDate); }
  if (endDate) { query += ' AND date <= ?'; params.push(endDate); }
  if (locationId) { query += ' AND location_id = ?'; params.push(locationId); }
  query += ' ORDER BY date ASC, time ASC';

  const rows = await db.prepare(query).all(...params);
  res.json(rows.map(formatAppt));
});

// POST /api/appointments
router.post('/', async (req, res) => {
  const b = req.body;
  const id = b.id || uuidv4();
  await db.prepare('INSERT INTO appointments (id, patient_id, patient_name, provider, provider_name, date, time, duration, type, status, reason, visit_type, room, location_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    id, b.patientId || null, b.patientName || '', b.provider || '', b.providerName || '', b.date, b.time, b.duration || 30, b.type || 'Office Visit', b.status || 'Scheduled', b.reason || '', b.visitType || 'In-Person', b.room || '', b.locationId || 'loc1'
  );
  const row = await db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  res.status(201).json(formatAppt(row));
});

// PUT /api/appointments/:id
router.put('/:id', async (req, res) => {
  const existing = await db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Appointment not found' });

  const b = req.body;
  await db.prepare(`UPDATE appointments SET patient_id=?, patient_name=?, provider=?, provider_name=?, date=?, time=?, duration=?, type=?, status=?, reason=?, visit_type=?, room=?, location_id=?, updated_at=NOW() WHERE id=?`).run(
    b.patientId ?? existing.patient_id, b.patientName ?? existing.patient_name, b.provider ?? existing.provider, b.providerName ?? existing.provider_name, b.date ?? existing.date, b.time ?? existing.time, b.duration ?? existing.duration, b.type ?? existing.type, b.status ?? existing.status, b.reason ?? existing.reason, b.visitType ?? existing.visit_type, b.room ?? existing.room, b.locationId ?? existing.location_id ?? 'loc1', req.params.id
  );

  const row = await db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  res.json(formatAppt(row));
});

// DELETE /api/appointments/:id
router.delete('/:id', async (req, res) => {
  await db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── BLOCKED DAYS ─────────────────────────────────────────────

// GET /api/appointments/blocked-days
router.get('/blocked-days/list', async (req, res) => {
  const { provider } = req.query;
  let query = 'SELECT * FROM blocked_days';
  const params = [];
  if (provider) { query += ' WHERE provider = ?'; params.push(provider); }
  query += ' ORDER BY date ASC';
  const rows = await db.prepare(query).all(...params);
  res.json(rows.map(r => ({ id: r.id, provider: r.provider, date: r.date, blockType: r.block_type, reason: r.reason })));
});

// POST /api/appointments/blocked-days
router.post('/blocked-days', async (req, res) => {
  const b = req.body;
  const id = uuidv4();
  await db.prepare('INSERT INTO blocked_days (id, provider, date, block_type, reason) VALUES (?,?,?,?,?)').run(
    id, b.provider, b.date, b.blockType || 'full', b.reason || ''
  );
  res.status(201).json({ id, ...b });
});

// DELETE /api/appointments/blocked-days/:id
router.delete('/blocked-days/:id', async (req, res) => {
  await db.prepare('DELETE FROM blocked_days WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Telehealth Recording Consent ─────────────────────────────────────────────

// POST /api/appointments/telehealth-consent
// Records provider-confirmed recording consent before a session starts.
router.post('/telehealth-consent', authenticate, async (req, res) => {
  const {
    sessionId, appointmentId, patientId, patientName, patientLocation,
    recordingConsent,        // 'granted' | 'denied' | 'not_asked'
    recordingConsentMethod,  // 'verbal' | 'written' | 'waived'
    providerConfirmed,       // boolean
    complianceChecklist,     // { locationConfirmed, consentExplained, privacyReminded, emergencyProtocol }
  } = req.body;

  if (!sessionId || !patientName || !recordingConsent || !providerConfirmed) {
    return res.status(400).json({ error: 'sessionId, patientName, recordingConsent and providerConfirmed are required' });
  }

  const VALID_CONSENT = ['granted', 'denied', 'not_asked'];
  const VALID_METHOD  = ['verbal', 'written', 'waived', null, undefined];
  if (!VALID_CONSENT.includes(recordingConsent)) {
    return res.status(400).json({ error: 'Invalid recordingConsent value' });
  }
  if (!VALID_METHOD.includes(recordingConsentMethod)) {
    return res.status(400).json({ error: 'Invalid recordingConsentMethod value' });
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
router.get('/telehealth-consent/:sessionId', authenticate, async (req, res) => {
  const row = await db.prepare(`
    SELECT * FROM telehealth_consents WHERE session_id = $1 ORDER BY consented_at DESC LIMIT 1
  `).get(req.params.sessionId);
  if (!row) return res.status(404).json({ error: 'No consent record found' });
  res.json({
    id: row.id,
    sessionId: row.session_id,
    patientName: row.patient_name,
    patientLocation: row.patient_location,
    recordingConsent: row.recording_consent,
    recordingConsentMethod: row.recording_consent_method,
    providerConfirmed: row.provider_confirmed,
    complianceChecklist: row.compliance_checklist,
    consentedAt: row.consented_at,
  });
});

export default router;
