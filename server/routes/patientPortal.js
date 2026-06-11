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
import { db } from '../db/database.js';

const router = Router();

// ── helpers ──────────────────────────────────────────────────────────────────

function generateOtp() { return String(Math.floor(100000 + Math.random() * 900000)); }

async function sendPortalOtp(toEmail, otp, patientName) { if (!process.env.RESEND_API_KEY) {
    console.warn('[portal] RESEND_API_KEY not set — OTP:', otp);
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
  try { const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    if (payload.type !== 'portal') return res.status(401).json({ error: 'Invalid token type' });
    req.patientId = payload.patientId;
    next();
  } catch { res.clearCookie('portal_token');
    return res.status(401).json({ error: 'Session expired — please sign in again' });
  }
}

// ── 1. Request OTP ────────────────────────────────────────────────────────────

router.post('/request-access', async (req, res) => { const { email } = req.body;
  if (!email || typeof email !== 'string') { return res.status(400).json({ error: 'Email is required' });
  }

  const normalised = email.trim().toLowerCase();

  // Always respond the same way to prevent email enumeration
  const patient = await db.prepare(
    `SELECT id, first_name, last_name, email, portal_locked_until, portal_otp_attempts
     FROM patients WHERE LOWER(email) = $1 AND is_active = TRUE`
  ).get(normalised);

  if (!patient) { // Don't reveal whether email exists
    return res.json({ ok: true, hint: normalised.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '***' + c) });
  }

  // Lock check
  if (patient.portal_locked_until && new Date(patient.portal_locked_until) > new Date()) { return res.status(429).json({ error: 'Too many attempts. Please try again in 10 minutes.' });
  }

  const otp     = generateOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  await db.prepare(
    `UPDATE patients SET portal_otp = $1, portal_otp_expires = $2, portal_otp_attempts = 0 WHERE id = $3`
  ).run(otp, expires, patient.id);

  // Send email (non-blocking)
  sendPortalOtp(patient.email, otp, patient.first_name).catch(e =>
    console.error('[portal] OTP email failed:', e.message)
  );

  // Log to server for admin recovery
  console.log(`[portal] OTP for ${ patient.first_name } ${ patient.last_name } (${ patient.id }): ${ otp }`);

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
     FROM patients WHERE LOWER(email) = $1 AND is_active = TRUE`
  ).get(normalised);

  if (!patient) return res.status(401).json({ error: 'Invalid code' });

  // Lock check
  if (patient.portal_locked_until && new Date(patient.portal_locked_until) > new Date()) { return res.status(429).json({ error: 'Account locked. Try again in 10 minutes.' });
  }

  // Expiry check
  if (!patient.portal_otp_expires || new Date(patient.portal_otp_expires) < new Date()) { return res.status(401).json({ error: 'Code expired — request a new one' });
  }

  // OTP check (constant-time compare)
  const valid = patient.portal_otp &&
    crypto.timingSafeEqual(Buffer.from(patient.portal_otp), Buffer.from(otp.trim()));

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

router.get('/me', authenticatePortal, async (req, res) => { const patient = await db.prepare(
    `SELECT id, first_name, last_name, email, dob, gender, phone, cell_phone, address_street, address_city, address_state, address_zip, assigned_provider, photo, portal_last_login
     FROM patients WHERE id = $1 AND is_active = TRUE`
  ).get(req.patientId);

  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  res.json({ id: patient.id, firstName: patient.first_name, lastName: patient.last_name, email: patient.email, dob: patient.dob, gender: patient.gender, phone: patient.phone || patient.cell_phone, address: [patient.address_street, patient.address_city, patient.address_state, patient.address_zip]
      .filter(Boolean).join(', '), assignedProvider: patient.assigned_provider, photo: patient.photo, lastLogin: patient.portal_last_login,  });
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
    SELECT id, drug_name, dosage, frequency, prescriber_name, start_date, status, refills_remaining, pharmacy
    FROM medications
    WHERE patient_id = $1 AND status = 'Active'
    ORDER BY drug_name
  `).all(req.patientId);

  res.json(rows.map(r => ({
    id:               r.id, name:             r.drug_name, dosage:           r.dosage, frequency:        r.frequency, prescriber:       r.prescriber_name || '—', startDate:        r.start_date, status:           r.status, refillsRemaining: r.refills_remaining ?? null, pharmacy:         r.pharmacy || '—',  })));
});

// ── 4. Logout ─────────────────────────────────────────────────────────────────

router.post('/logout', authenticatePortal, async (req, res) => { await db.prepare(
    `INSERT INTO patient_portal_access_log (patient_id, action, ip, user_agent, created_at)
     VALUES ($1, 'LOGOUT', $2, $3, NOW())`
  ).run(req.patientId, req.ip || '', req.get('User-Agent') || '');

  res.clearCookie('portal_token', { httpOnly: true, secure: true, sameSite: 'none', domain: '.clarity-ehr.com', path: '/' });
  res.json({ ok: true });
});

export { authenticatePortal };
export default router;
