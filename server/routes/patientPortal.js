/**
 * Clarity EHR — Patient Portal Auth
 *
 * Flow:
 *   1. POST /api/patient-portal/request-access  { email }
 *      → finds patient by email, sends 6-digit OTP, returns masked email
 *   2. POST /api/patient-portal/verify-otp       { email, otp }
 *      → validates OTP, issues httpOnly JWT, logs access
 *   3. GET  /api/patient-portal/me               (authenticated)
 *      → returns patient profile
 *   4. POST /api/patient-portal/logout            (authenticated)
 *      → clears cookie
 */

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { portalTelehealthToken } from './telehealthToken.js';
import { validate } from '../middleware/validate.js';
import {
  PortalRequestAccessSchema,
  PortalMessageSchema,
  PortalAssessmentSchema,
  PortalRefillRequestSchema,
  PortalBookAppointmentSchema,
  PortalTelehealthTokenSchema,
} from '../schemas/portalSchema.js';
import { validateResponse } from '../middleware/validateResponse.js';
import { AnyResponseSchema } from '../schemas/responseSchemas.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(validateResponse(AnyResponseSchema));

// ── helpers ──────────────────────────────────────────────────────────────────

function generateOtp() { return String(Math.floor(100000 + Math.random() * 900000)); }

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

async function sendPortalOtp(toEmail, otp, patientName) { if (!process.env.RESEND_API_KEY) {
    console.warn('[portal] RESEND_API_KEY not set — OTP not sent (check email configuration)');
    return; }
  const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY }`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: process.env.RESEND_FROM || 'noreply@clarity-ehr.com', to: toEmail, subject: 'Your Clarity Patient Portal access code', html: `
        <div style="font-family:Inter, sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px">
          <div style="text-align:center;margin-bottom:28px">
            <div style="font-size:32px;margin-bottom:8px">🏥</div>
            <h2 style="color:#0d2444;font-size:20px;margin:0">Clarity Patient Portal</h2>
          </div>
          <p style="color:#374151;font-size:15px">Hi ${patientName },</p>
          <p style="color:#374151;font-size:15px">Use the code below to sign in to your patient portal. It expires in <strong>10 minutes</strong>.</p>
          <div style="background:#fff;border:2px solid #e0e7ef;border-radius:10px;padding:24px;text-align:center;margin:24px 0">
            <div style="font-size:36px;font-weight:800;letter-spacing:10px;color:#0060b6">${ otp }</div>
          </div>
          <p style="color:#6b7280;font-size:13px">If you didn't request this code, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
          <p style="color:#9ca3af;font-size:11px;text-align:center">
            Clarity EHR &nbsp;·&nbsp; HIPAA-compliant secure messaging &nbsp;·&nbsp; 256-bit encryption
          </p>
        </div>
      `,
    }),
  });
  if (!res.ok) { const err = await res.text();
    console.error('[portal] Resend error:', err); }
}

function issuePortalToken(patientId) { return jwt.sign(
    { patientId, type: 'portal' },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '8h' }
  );
}

function authenticatePortal(req, res, next) { const token = req.cookies?.portal_token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try { const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (payload.type !== 'portal') return res.status(401).json({ error: 'Invalid token type' });
    req.patientId = payload.patientId;
    next();
  } catch { res.clearCookie('portal_token');
    return res.status(401).json({ error: 'Session expired — please sign in again' });
  }
}

// ── 1. Request OTP ────────────────────────────────────────────────────────────

router.post('/request-access', validate(PortalRequestAccessSchema), async (req, res) => { const { email } = req.body;
  if (!email || typeof email !== 'string') { return res.status(400).json({ error: 'Email is required' });
  }

  const normalised = email.trim().toLowerCase();

  const patient = await db.prepare(
    `SELECT id, first_name, last_name, email, portal_locked_until, portal_otp_attempts
     FROM patients WHERE LOWER(email) = $1 AND is_active = true`
  ).get(normalised);

  if (!patient) {
    // Email not in system — ask patient to verify identity instead
    return res.json({ ok: true, needsVerification: true });
  }

  // Lock check
  if (patient.portal_locked_until && new Date(patient.portal_locked_until) > new Date()) { return res.status(429).json({ error: 'Too many attempts. Please try again in 10 minutes.' });
  }

  const otp     = generateOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  await db.prepare(
    `UPDATE patients SET portal_otp = $1, portal_otp_expires = $2, portal_otp_attempts = 0 WHERE id = $3`
  ).run(hashOtp(otp), expires, patient.id);

  // Send email (non-blocking) — plaintext OTP goes only to the patient's inbox
  sendPortalOtp(patient.email, otp, patient.first_name).catch(e =>
    console.error('[portal] OTP email failed:', e.message)
  );

  const masked = normalised.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '***' + c);
  res.json({ ok: true, hint: masked });
});

// ── 1b. Verify Identity (email not on file — match by demographics) ───────────
router.post('/verify-identity', async (req, res) => {
  const { email, firstName, lastName, dob, phone } = req.body;
  if (!email || !firstName || !lastName || !dob) {
    return res.status(400).json({ error: 'Email, first name, last name, and date of birth are required' });
  }

  const normalised = email.trim().toLowerCase();

  // Normalise phone — strip all non-digits for comparison
  const normalisePhone = (p) => (p || '').replace(/\D/g, '');
  const inputPhone = normalisePhone(phone);

  // Match by name + DOB (case-insensitive). Phone is a secondary check if provided.
  const candidates = await db.prepare(`
    SELECT id, first_name, last_name, dob, phone, cell_phone, email, portal_locked_until
    FROM patients
    WHERE LOWER(first_name) = LOWER($1)
      AND LOWER(last_name)  = LOWER($2)
      AND dob = $3
      AND is_active = true
  `).all(firstName.trim(), lastName.trim(), dob.trim());

  let matched = null;

  if (candidates.length === 1) {
    matched = candidates[0];
  } else if (candidates.length > 1 && inputPhone) {
    // Multiple name+DOB matches — use phone to disambiguate
    matched = candidates.find(c =>
      normalisePhone(c.phone) === inputPhone || normalisePhone(c.cell_phone) === inputPhone
    ) || null;
  }

  if (!matched) {
    // Generic message — don't reveal what did/didn't match
    return res.status(404).json({ error: 'We could not verify your identity. Please contact your clinic to be registered.' });
  }

  // Lock check
  if (matched.portal_locked_until && new Date(matched.portal_locked_until) > new Date()) {
    return res.status(429).json({ error: 'Too many attempts. Please try again in 10 minutes.' });
  }

  // Link the email to this chart (or update if they provided a new one)
  await db.prepare(`UPDATE patients SET email = $1 WHERE id = $2`).run(normalised, matched.id);

  // Generate and send OTP
  const otp     = generateOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await db.prepare(
    `UPDATE patients SET portal_otp = $1, portal_otp_expires = $2, portal_otp_attempts = 0 WHERE id = $3`
  ).run(hashOtp(otp), expires, matched.id);

  sendPortalOtp(normalised, otp, matched.first_name).catch(e =>
    console.error('[portal] OTP email failed:', e.message)
  );

  const masked = normalised.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '***' + c);
  res.json({ ok: true, hint: masked });
});

// ── 2. Verify OTP ─────────────────────────────────────────────────────────────

router.post('/verify-otp', async (req, res) => { const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and code required' });

  const normalised = email.trim().toLowerCase();
  const patient = await db.prepare(
    `SELECT id, first_name, last_name, email, portal_otp, portal_otp_expires,
            portal_otp_attempts, portal_locked_until
     FROM patients WHERE LOWER(email) = $1 AND is_active = true`
  ).get(normalised);

  if (!patient) return res.status(401).json({ error: 'Invalid code' });

  // Lock check
  if (patient.portal_locked_until && new Date(patient.portal_locked_until) > new Date()) { return res.status(429).json({ error: 'Account locked. Try again in 10 minutes.' });
  }

  // Expiry check
  if (!patient.portal_otp_expires || new Date(patient.portal_otp_expires) < new Date()) { return res.status(401).json({ error: 'Code expired — request a new one' });
  }

  // OTP check — hash submitted value and compare hashes (constant-time, same-length buffers).
  // Guard against legacy plaintext OTPs (6 chars) left in DB before the hashing migration:
  // treat them as invalid so they cannot be guessed and force the patient to re-request.
  const storedHash    = patient.portal_otp || '';
  const submittedHash = hashOtp(otp.trim());
  const isHashed      = storedHash.length === 64; // SHA-256 hex is always 64 chars
  const valid = isHashed &&
    crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(submittedHash));

  if (!valid) { const attempts = (patient.portal_otp_attempts || 0) + 1;
    if (attempts >= 5) {
      const lockUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await db.prepare(
        `UPDATE patients SET portal_otp_attempts = $1, portal_locked_until = $2 WHERE id = $3`
      ).run(attempts, lockUntil, patient.id);
      return res.status(429).json({ error: 'Too many incorrect attempts. Account locked for 10 minutes.' });
    }
    await db.prepare(`UPDATE patients SET portal_otp_attempts = $1 WHERE id = $2`).run(attempts, patient.id);
    return res.status(401).json({ error: `Invalid code. ${5 - attempts } attempt${ 5 - attempts === 1 ? '' : 's' } remaining.` });
  }

  // Success — clear OTP, issue token
  await db.prepare(
    `UPDATE patients SET portal_otp = NULL, portal_otp_expires = NULL,
     portal_otp_attempts = 0, portal_locked_until = NULL,
     portal_last_login = NOW() WHERE id = $1`
  ).run(patient.id);

  // Log access
  await db.prepare(
    `INSERT INTO patient_portal_access_log (patient_id, access_type, ip_address, user_agent)
     VALUES ($1, 'login', $2, $3)`
  ).run(patient.id, req.ip || '', req.get('User-Agent') || '');

  const token = issuePortalToken(patient.id);

  res.cookie('portal_token', token, { httpOnly: true, secure: true, sameSite: 'none', domain: '.clarity-ehr.com', maxAge: 8 * 60 * 60 * 1000, path: '/',  });

  res.json({ ok: true, patient: {
      id: patient.id, firstName: patient.first_name, lastName: patient.last_name, email: patient.email,  },
  });
});

// ── 3. Me (authenticated) ─────────────────────────────────────────────────────

router.get('/me', authenticatePortal, async (req, res) => {
  const patient = await db.prepare(`
    SELECT id, mrn, first_name, last_name, email, dob, gender, phone, cell_phone,
           address_street, address_city, address_state, address_zip,
           emergency_contact_name, emergency_contact_phone,
           assigned_provider, photo, portal_last_login,
           insurance_primary_name, insurance_primary_member_id, insurance_primary_group,
           insurance_secondary_name, insurance_secondary_member_id, insurance_secondary_group
    FROM patients WHERE id = $1 AND is_active = true
  `).get(req.patientId);

  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  res.json({
    id:               patient.id,
    mrn:              patient.mrn,
    firstName:        patient.first_name,
    lastName:         patient.last_name,
    email:            patient.email,
    dob:              patient.dob,
    gender:           patient.gender,
    phone:            patient.phone,
    cellPhone:        patient.cell_phone,
    addressStreet:    patient.address_street,
    addressCity:      patient.address_city,
    addressState:     patient.address_state,
    addressZip:       patient.address_zip,
    address:          [patient.address_street, patient.address_city, patient.address_state, patient.address_zip].filter(Boolean).join(', '),
    emergencyName:    patient.emergency_contact_name,
    emergencyPhone:   patient.emergency_contact_phone,
    assignedProvider: patient.assigned_provider,
    photo:            patient.photo,
    lastLogin:        patient.portal_last_login,
    insurance: {
      primary: {
        name:        patient.insurance_primary_name || '',
        memberId:    patient.insurance_primary_member_id || '',
        groupNumber: patient.insurance_primary_group || '',
      },
      secondary: {
        name:        patient.insurance_secondary_name || '',
        memberId:    patient.insurance_secondary_member_id || '',
        groupNumber: patient.insurance_secondary_group || '',
      },
    },
  });
});

// ── 3b. Update Profile ────────────────────────────────────────────────────────
router.put('/profile', authenticatePortal, async (req, res) => {
  const { phone, cellPhone, addressStreet, addressCity, addressState, addressZip, emergencyName, emergencyPhone, gender } = req.body;

  await db.prepare(`
    UPDATE patients SET
      phone = COALESCE($1, phone),
      cell_phone = COALESCE($2, cell_phone),
      address_street = COALESCE($3, address_street),
      address_city = COALESCE($4, address_city),
      address_state = COALESCE($5, address_state),
      address_zip = COALESCE($6, address_zip),
      emergency_contact_name = COALESCE($7, emergency_contact_name),
      emergency_contact_phone = COALESCE($8, emergency_contact_phone),
      gender = COALESCE($9, gender)
    WHERE id = $10
  `).run(
    phone || null, cellPhone || null,
    addressStreet || null, addressCity || null, addressState || null, addressZip || null,
    emergencyName || null, emergencyPhone || null,
    gender || null,
    req.patientId
  );

  res.json({ ok: true });
});

// ── 4b. Providers list (for patient to select who to message) ────────────────
router.get('/providers', authenticatePortal, async (req, res) => {
  const rows = await db.prepare(`
    SELECT id, first_name, last_name, role, location_id
    FROM users
    WHERE role IN ('provider','physician','nurse_practitioner','attending','admin')
      AND is_active = true
    ORDER BY last_name, first_name
  `).all();
  res.json(rows.map(r => ({
    id: r.id,
    name: `${r.first_name} ${r.last_name}`.trim(),
    role: r.role,
    locationId: r.location_id,
  })));
});

// ── 5. Appointments ───────────────────────────────────────────────────────────
router.get('/appointments', authenticatePortal, async (req, res) => { const rows = await db.prepare(`
    SELECT id, date, time, reason, status, provider_name, location_name, appointment_type
    FROM appointments
    WHERE patient_id = $1
    ORDER BY date DESC, time DESC
    LIMIT 20
  `).all(req.patientId);

  res.json(rows.map(r => ({
    id:        r.id, date:      r.date, time:      r.time, reason:    r.reason, status:    r.status, provider:  r.provider_name || r.provider || '—', location:  r.location_name || '—', type:      r.appointment_type || r.type || 'Visit',  })));
});

// ── 6. Medications ────────────────────────────────────────────────────────────
router.get('/medications', authenticatePortal, async (req, res) => { const rows = await db.prepare(`
    SELECT id, name, dose, frequency, prescriber, start_date, status, refills_left, pharmacy
    FROM medications
    WHERE patient_id = $1 AND status = 'Active'
    ORDER BY name
  `).all(req.patientId);

  res.json(rows.map(r => ({
    id:               r.id, name:             r.name, dosage:           r.dose, frequency:        r.frequency, prescriber:       r.prescriber || '—', startDate:        r.start_date, status:           r.status, refillsRemaining: r.refills_left ?? null, pharmacy:         r.pharmacy || '—',  })));
});

// ── 7. Portal Messages ────────────────────────────────────────────────────────

router.get('/messages', authenticatePortal, async (req, res) => {
  const rows = await db.prepare(`
    SELECT id, from_name, subject, body, date, time, type, urgent
    FROM inbox_messages
    WHERE patient_id = $1
    ORDER BY date ASC, time ASC
    LIMIT 100
  `).all(req.patientId);
  res.json(rows.map(r => ({
    id: r.id, from: r.from_name, subject: r.subject,
    body: r.body, date: r.date, time: r.time,
    type: r.type, urgent: !!r.urgent,
  })));
});

router.post('/messages', authenticatePortal, validate(PortalMessageSchema), async (req, res) => {
  const { text, providerId } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Message text is required' });
  }
  const patient = await db.prepare(
    'SELECT id, first_name, last_name, assigned_provider FROM patients WHERE id = $1'
  ).get(req.patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  // Use explicitly selected provider, fall back to assigned_provider
  const toUser = providerId || patient.assigned_provider || null;

  const id = uuidv4();
  const now = new Date();
  const patientName = `${patient.first_name} ${patient.last_name}`;
  await db.prepare(`
    INSERT INTO inbox_messages
      (id, type, from_name, to_user, patient_id, patient_name, subject, body, date, time, read, priority, status, urgent)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,'Normal','Unread',false)
  `).run(
    id, 'Patient Message',
    `${patientName} (Patient Portal)`,
    toUser,
    req.patientId, patientName,
    `Message from ${patientName}`,
    text.trim(),
    now.toISOString().split('T')[0],
    now.toTimeString().slice(0, 5)
  );
  res.status(201).json({ ok: true, id });
});

// ── 8. Portal Assessments ──────────────────────────────────────────────────────

router.post('/assessments', authenticatePortal, validate(PortalAssessmentSchema), async (req, res) => {
  const { tool, score, maxScore, interpretation, answers, date } = req.body;
  if (!tool || score === undefined) {
    return res.status(400).json({ error: 'tool and score are required' });
  }
  const patient = await db.prepare(
    'SELECT id, first_name, last_name FROM patients WHERE id = $1'
  ).get(req.patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const id = uuidv4();
  const patientName = `${patient.first_name} ${patient.last_name}`;
  await db.prepare(`
    INSERT INTO assessments (id, patient_id, tool, score, interpretation, date, administered_by, answers)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  `).run(
    id, req.patientId, tool, score,
    interpretation || '',
    date || new Date().toISOString().split('T')[0],
    `${patientName} (Self-administered — Patient Portal)`,
    JSON.stringify(answers || [])
  );
  res.status(201).json({ ok: true, id });
});

// ── 9. Portal Refill Request ──────────────────────────────────────────────────
// Patient requests a refill for one of their active medications.
// Inserts into the `refills` table so it surfaces in the provider's Refill Queue.
router.post('/refill-request', authenticatePortal, validate(PortalRefillRequestSchema), async (req, res) => {
  const { medicationId, medicationName, dose, frequency, pharmacy } = req.body;
  if (!medicationName) return res.status(400).json({ error: 'medicationName required' });

  const patient = await db.prepare(
    'SELECT id, first_name, last_name, assigned_provider FROM patients WHERE id = $1'
  ).get(req.patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const patientName = `${patient.first_name} ${patient.last_name}`;
  const id = uuidv4();
  const now = new Date();

  // Insert into refills table (surfaces in RefillQueue for the provider)
  await db.prepare(`
    INSERT INTO refills
      (id, patient_id, medication_id, medication_name, dose, frequency, created_by, status, priority, notes, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,'pending','normal',$8,NOW(),NOW())
  `).run(
    id, req.patientId, medicationId || null, medicationName,
    dose || '', frequency || '',
    `patient-portal:${patientName}`,
    pharmacy ? `Preferred pharmacy: ${pharmacy}` : null
  );

  // Also send an inbox notification to the assigned provider
  const msgId = uuidv4();
  await db.prepare(`
    INSERT INTO inbox_messages
      (id, type, from_name, to_user, patient_id, patient_name, subject, body, date, time, read, priority, status, urgent)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,'Normal','Unread',false)
  `).run(
    msgId, 'Rx Refill Request',
    `${patientName} (Patient Portal)`,
    patient.assigned_provider || null,
    req.patientId, patientName,
    `Refill Request: ${medicationName}${dose ? ' ' + dose : ''}`,
    `Patient has requested a refill via the Patient Portal.\n\nMedication: ${medicationName}${dose ? ' ' + dose : ''}${frequency ? ' — ' + frequency : ''}${pharmacy ? '\nPreferred pharmacy: ' + pharmacy : ''}`,
    now.toISOString().split('T')[0],
    now.toTimeString().slice(0, 5)
  );

  res.status(201).json({ ok: true, refillId: id });
});

// ── 10. Portal Appointment Booking ───────────────────────────────────────────
// Patient books a slot from the live scheduling grid.
router.post('/book-appointment', authenticatePortal, validate(PortalBookAppointmentSchema), async (req, res) => {
  const { providerId, providerName, date, time, duration, visitType, reason, notes } = req.body;
  if (!providerId || !date || !time) {
    return res.status(400).json({ error: 'providerId, date, and time are required' });
  }

  const patient = await db.prepare(
    'SELECT id, first_name, last_name, mrn FROM patients WHERE id = $1'
  ).get(req.patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  // Use the provider's actual location so the appointment appears in the staff schedule
  const providerUser = await db.prepare('SELECT location_id FROM users WHERE id = $1').get(providerId);
  const locationId = providerUser?.location_id || null;

  const patientName = `${patient.first_name} ${patient.last_name}`;
  const id = uuidv4();
  const now = new Date();

  await db.prepare(`
    INSERT INTO appointments
      (id, patient_id, patient_name, provider, provider_name, date, time, duration, type, status, reason, visit_type, room, location_id, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())
  `).run(
    id, req.patientId, patientName,
    providerId, providerName || '',
    date, time, duration || 30,
    'Follow-Up', 'Scheduled',
    `Patient self-scheduled${reason ? ': ' + reason : ''}${notes ? ' — ' + notes : ''}`,
    visitType || 'In-Person',
    visitType === 'Telehealth' ? 'Virtual' : 'TBD',
    locationId
  );

  // Inbox notification to the booked provider
  const msgId = uuidv4();
  await db.prepare(`
    INSERT INTO inbox_messages
      (id, type, from_name, to_user, patient_id, patient_name, subject, body, date, time, read, priority, status, urgent)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,'Normal','Unread',false)
  `).run(
    msgId, 'Staff Message',
    `${patientName} (Patient Portal)`,
    providerId,
    req.patientId, patientName,
    `New Appointment Booked — ${patientName}`,
    `Patient has booked an appointment via the Patient Portal.\n\nPatient: ${patientName} (MRN: ${patient.mrn})\nProvider: ${providerName}\nDate: ${date}\nTime: ${time}\nDuration: ${duration || 30} min\nType: ${reason || 'Follow-Up'}\nVisit: ${visitType || 'In-Person'}${notes ? '\nNotes: ' + notes : ''}`,
    now.toISOString().split('T')[0],
    now.toTimeString().slice(0, 5)
  );

  res.status(201).json({ ok: true, appointmentId: id });
});

// ── 11. Staff → Patient reply (surfaces in patient portal) ───────────────────
// Called from the provider's inbox "Reply to Patient" action.
// Requires a normal staff session (authenticate middleware), not portal auth.
router.post('/staff-reply', authenticate, async (req, res) => {
  const { patientId, text } = req.body;
  if (!patientId || !text?.trim()) {
    return res.status(400).json({ error: 'patientId and text are required' });
  }
  const patient = await db.prepare('SELECT id, first_name, last_name FROM patients WHERE id = $1').get(patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const id = uuidv4();
  const now = new Date();
  const providerName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.username;
  const patientName  = `${patient.first_name} ${patient.last_name}`;

  await db.prepare(`
    INSERT INTO inbox_messages
      (id, type, from_name, to_user, patient_id, patient_name, subject, body, date, time, read, priority, status, urgent)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,'Normal','Unread',false)
  `).run(
    id, 'Provider Reply',
    providerName,
    null,
    patientId, patientName,
    `Message from ${providerName}`,
    text.trim(),
    now.toISOString().split('T')[0],
    now.toTimeString().slice(0, 5)
  );

  res.status(201).json({ ok: true, id });
});

// ── Telehealth token (portal patient joins a LiveKit room) ────────────────────
router.post('/telehealth/token', authenticatePortal, validate(PortalTelehealthTokenSchema), portalTelehealthToken);

// ── 4. Logout ─────────────────────────────────────────────────────────────────

router.post('/logout', authenticatePortal, async (req, res) => {
  res.clearCookie('portal_token', { httpOnly: true, secure: true, sameSite: 'none', domain: '.clarity-ehr.com', path: '/' });
  res.json({ ok: true });
});

export { authenticatePortal };
export default router;
