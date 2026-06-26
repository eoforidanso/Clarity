/**
 * Clarity EHR — Patient Portal (v2)
 *
 * Auth model: portal_users + portal_sessions tables.
 * Session token stored as SHA-256 hash; raw token in httpOnly cookie.
 *
 * Registration paths:
 *   A. Invite-based (gold path):  GET  /invite/:code → POST /register-invite
 *   B. Self-registration:         POST /register → POST /verify-identity → POST /verify-otp
 *   C. Returning login:           POST /send-otp → POST /verify-otp
 */

import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { portalTelehealthToken } from './telehealthToken.js';
import { validate } from '../middleware/validate.js';
import {
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

// ── Constants ────────────────────────────────────────────────────────────────
const COOKIE_NAME = 'portal_session';
const SESSION_TTL = 8 * 60 * 60 * 1000;     // 8 hours
const OTP_TTL     = 10 * 60 * 1000;          // 10 minutes
const INVITE_TTL  = 72 * 60 * 60 * 1000;     // 72 hours
const MAX_OTP_ATTEMPTS = 5;
const LOCK_DURATION    = 10 * 60 * 1000;     // 10 minutes

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateInviteCode() {
  return crypto.randomBytes(16).toString('hex');
}

function maskEmail(email) {
  return email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '***' + c);
}

function normalizePhone(p) {
  return (p || '').replace(/\D/g, '');
}

async function issuePortalSession(res, portalUserId, ip, ua) {
  const token     = generateSessionToken();
  const tokenHash = hashToken(token);
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_TTL).toISOString();

  await db.prepare(`
    INSERT INTO portal_sessions (id, portal_user_id, token_hash, expires_at, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6)
  `).run(sessionId, portalUserId, tokenHash, expiresAt, ip || '', ua || '');

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   true,
    sameSite: 'none',
    domain:   '.clarity-ehr.com',
    maxAge:   SESSION_TTL,
    path:     '/',
  });

  return sessionId;
}

async function portalAudit(portalUserId, patientId, eventType, metadata = {}, ip = '') {
  try {
    await db.prepare(`
      INSERT INTO portal_audit_log (id, portal_user_id, patient_id, event_type, metadata, ip_address)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6)
    `).run(uuidv4(), portalUserId || null, patientId || null, eventType, JSON.stringify(metadata), ip);
  } catch (e) {
    console.warn('[portal audit]', e.message);
  }
}

async function sendPortalOtp(toEmail, otp, patientName) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[portal] RESEND_API_KEY not set — OTP not sent');
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    process.env.RESEND_FROM || 'noreply@clarity-ehr.com',
      to:      toEmail,
      subject: 'Your Clarity Patient Portal access code',
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px">
          <div style="text-align:center;margin-bottom:28px">
            <div style="font-size:32px;margin-bottom:8px">🏥</div>
            <h2 style="color:#0d2444;font-size:20px;margin:0">Clarity Patient Portal</h2>
          </div>
          <p style="color:#374151;font-size:15px">Hi ${patientName},</p>
          <p style="color:#374151;font-size:15px">Use the code below to sign in. It expires in <strong>10 minutes</strong>.</p>
          <div style="background:#fff;border:2px solid #e0e7ef;border-radius:10px;padding:24px;text-align:center;margin:24px 0">
            <div style="font-size:36px;font-weight:800;letter-spacing:10px;color:#0060b6">${otp}</div>
          </div>
          <p style="color:#6b7280;font-size:13px">If you didn't request this code, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
          <p style="color:#9ca3af;font-size:11px;text-align:center">Clarity EHR · HIPAA-compliant · 256-bit encryption</p>
        </div>
      `,
    }),
  });
  if (!res.ok) {
    console.error('[portal] Resend error:', await res.text());
  }
}

async function sendPortalInvite(toEmail, inviteCode, patientName, staffName) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[portal] RESEND_API_KEY not set — invite not sent');
    return;
  }
  const link = `${process.env.PORTAL_URL || 'https://app.clarity-ehr.com'}/patient-portal/login?code=${inviteCode}`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    process.env.RESEND_FROM || 'noreply@clarity-ehr.com',
      to:      toEmail,
      subject: 'You have been invited to the Clarity Patient Portal',
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px">
          <div style="text-align:center;margin-bottom:28px">
            <div style="font-size:32px;margin-bottom:8px">🏥</div>
            <h2 style="color:#0d2444;font-size:20px;margin:0">Clarity Patient Portal</h2>
          </div>
          <p style="color:#374151;font-size:15px">Hi ${patientName},</p>
          <p style="color:#374151;font-size:15px">${staffName} has invited you to access your health records through the Clarity Patient Portal. Your invite link expires in 72 hours.</p>
          <div style="text-align:center;margin:28px 0">
            <a href="${link}" style="background:#0060b6;color:#fff;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;display:inline-block">
              Activate My Portal Account →
            </a>
          </div>
          <p style="color:#6b7280;font-size:13px">If you have trouble clicking the button, copy and paste this link:<br><a href="${link}" style="color:#0060b6">${link}</a></p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
          <p style="color:#9ca3af;font-size:11px;text-align:center">Clarity EHR · HIPAA-compliant · 256-bit encryption</p>
        </div>
      `,
    }),
  });
  if (!res.ok) {
    console.error('[portal] Invite email error:', await res.text());
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────

export async function authenticatePortal(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const tokenHash = hashToken(token);
  const row = await db.prepare(`
    SELECT
      ps.id AS session_id,
      pu.id, pu.email, pu.first_name, pu.last_name, pu.date_of_birth,
      pu.phone, pu.address_line1, pu.address_line2, pu.city, pu.state, pu.zip,
      pu.linked_patient_id, pu.status, pu.password_hash
    FROM portal_sessions ps
    JOIN portal_users pu ON ps.portal_user_id = pu.id
    WHERE ps.token_hash = $1 AND ps.expires_at > NOW()
  `).get(tokenHash);

  if (!row) {
    res.clearCookie(COOKIE_NAME);
    return res.status(401).json({ error: 'Session expired — please sign in again' });
  }
  if (row.status !== 'linked') {
    return res.status(403).json({ error: 'Portal account is not verified' });
  }

  req.portalUser = row;
  req.patientId  = row.linked_patient_id;
  next();
}

// ── A. Invite-based registration ──────────────────────────────────────────────

// Staff: POST /api/patient-portal/invite  (requires staff auth)
router.post('/invite', authenticate, async (req, res) => {
  const { patientId, email } = req.body;
  if (!patientId || !email?.trim()) {
    return res.status(400).json({ error: 'patientId and email are required' });
  }

  const patient = await db.prepare(
    'SELECT id, first_name, last_name, email FROM patients WHERE id = $1 AND is_active = true'
  ).get(patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  // Check for existing linked portal account
  const existing = await db.prepare(
    'SELECT id, status FROM portal_users WHERE linked_patient_id = $1'
  ).get(patientId);
  if (existing?.status === 'linked') {
    return res.status(409).json({ error: 'This patient already has an active portal account' });
  }

  // Expire any prior pending invites for this patient
  await db.prepare(
    `UPDATE portal_invitations SET used_at = NOW() WHERE patient_id = $1 AND used_at IS NULL`
  ).run(patientId);

  const inviteCode = generateInviteCode();
  const expiresAt  = new Date(Date.now() + INVITE_TTL).toISOString();
  const inviteId   = uuidv4();
  const staffName  = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.username;

  await db.prepare(`
    INSERT INTO portal_invitations (id, patient_id, invite_code, sent_to_email, created_by, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6)
  `).run(inviteId, patientId, inviteCode, email.trim().toLowerCase(), req.user.id, expiresAt);

  sendPortalInvite(
    email.trim().toLowerCase(),
    inviteCode,
    `${patient.first_name} ${patient.last_name}`.trim(),
    staffName
  ).catch(e => console.error('[portal] invite email failed:', e.message));

  await portalAudit(null, patientId, 'invite_sent', { email, staffId: req.user.id }, req.ip);

  res.json({ ok: true, inviteId, expiresAt });
});

// Patient: GET /api/patient-portal/invite/:code — validate invite, return prefill
router.get('/invite/:code', async (req, res) => {
  const { code } = req.params;
  const invite = await db.prepare(`
    SELECT pi.id, pi.patient_id, pi.sent_to_email, pi.expires_at, pi.used_at,
           p.first_name, p.last_name, p.dob
    FROM portal_invitations pi
    JOIN patients p ON pi.patient_id = p.id
    WHERE pi.invite_code = $1
  `).get(code);

  if (!invite)                              return res.status(404).json({ error: 'Invite not found or already used' });
  if (invite.used_at)                       return res.status(410).json({ error: 'This invite link has already been used' });
  if (new Date(invite.expires_at) < new Date()) return res.status(410).json({ error: 'This invite link has expired. Please contact your clinic.' });

  res.json({
    ok:          true,
    prefill: {
      firstName:   invite.first_name,
      lastName:    invite.last_name,
      dob:         invite.dob,
      email:       invite.sent_to_email,
    },
    expiresAt:   invite.expires_at,
  });
});

// Patient: POST /api/patient-portal/register-invite — complete invite registration
router.post('/register-invite', async (req, res) => {
  const { code, email, phone, password } = req.body;
  if (!code || !email?.trim()) {
    return res.status(400).json({ error: 'invite code and email are required' });
  }

  const normalEmail = email.trim().toLowerCase();

  const invite = await db.prepare(`
    SELECT pi.id, pi.patient_id, pi.expires_at, pi.used_at,
           p.first_name, p.last_name, p.dob
    FROM portal_invitations pi
    JOIN patients p ON pi.patient_id = p.id
    WHERE pi.invite_code = $1
  `).get(code);

  if (!invite || invite.used_at)            return res.status(404).json({ error: 'Invalid or already-used invite' });
  if (new Date(invite.expires_at) < new Date()) return res.status(410).json({ error: 'Invite expired' });

  // Check email not already used by another portal account
  const emailConflict = await db.prepare(
    'SELECT id FROM portal_users WHERE LOWER(email) = $1'
  ).get(normalEmail);
  if (emailConflict) {
    return res.status(409).json({ error: 'An account with this email already exists. Try signing in instead.' });
  }

  const pwHash = password ? await bcrypt.hash(password, 12) : null;
  const userId = uuidv4();
  const otp    = generateOtp();
  const otpExp = new Date(Date.now() + OTP_TTL).toISOString();

  await db.prepare(`
    INSERT INTO portal_users
      (id, email, password_hash, first_name, last_name, date_of_birth, phone,
       linked_patient_id, status, otp_code, otp_expires, otp_attempts)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'linked',$9,$10,0)
  `).run(
    userId, normalEmail, pwHash,
    invite.first_name, invite.last_name, invite.dob,
    phone?.trim() || '',
    invite.patient_id,
    hashOtp(otp), otpExp
  );

  // Mark invite as used
  await db.prepare(`UPDATE portal_invitations SET used_at = NOW() WHERE id = $1`).run(invite.id);

  sendPortalOtp(normalEmail, otp, invite.first_name)
    .catch(e => console.error('[portal] OTP email failed:', e.message));

  await portalAudit(userId, invite.patient_id, 'register_invite', {}, req.ip);

  const masked = maskEmail(normalEmail);
  res.json({ ok: true, hint: masked });
});

// ── B. Self-registration ──────────────────────────────────────────────────────

// POST /api/patient-portal/register — step 1: submit email
router.post('/register', async (req, res) => {
  const { email } = req.body;
  if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });

  const normalEmail = email.trim().toLowerCase();
  const existing = await db.prepare(
    'SELECT id, status FROM portal_users WHERE LOWER(email) = $1'
  ).get(normalEmail);

  if (existing?.status === 'linked') {
    // Already registered — route to login (send OTP)
    return res.json({ ok: true, exists: true });
  }
  if (existing?.status === 'pending_verification') {
    return res.json({ ok: true, pending: true, userId: existing.id });
  }
  if (existing?.status === 'disabled') {
    return res.status(403).json({ error: 'This account has been disabled. Contact your clinic.' });
  }

  // New email — create record
  const userId = uuidv4();
  await db.prepare(`
    INSERT INTO portal_users (id, email, status) VALUES ($1, $2, 'pending_verification')
  `).run(userId, normalEmail);

  res.json({ ok: true, needsRegistration: true, userId });
});

// POST /api/patient-portal/verify-identity — step 2: self-registration demographics
router.post('/verify-identity', async (req, res) => {
  const { email, firstName, lastName, dob, phone, zip, password } = req.body;
  if (!email || !firstName || !lastName || !dob) {
    return res.status(400).json({ error: 'Email, first name, last name, and date of birth are required' });
  }

  const normalEmail = email.trim().toLowerCase();
  const inputPhone  = normalizePhone(phone);

  // Look up existing portal_users row
  const portalUser = await db.prepare(
    'SELECT id, status, locked_until FROM portal_users WHERE LOWER(email) = $1'
  ).get(normalEmail);
  if (!portalUser) return res.status(400).json({ error: 'Start registration first' });
  if (portalUser.locked_until && new Date(portalUser.locked_until) > new Date()) {
    return res.status(429).json({ error: 'Too many attempts. Try again in 10 minutes.' });
  }

  // Match against patients table
  const candidates = await db.prepare(`
    SELECT id, first_name, last_name, dob, phone, cell_phone, email, address_zip
    FROM patients
    WHERE LOWER(first_name) = LOWER($1)
      AND LOWER(last_name)  = LOWER($2)
      AND dob = $3
      AND (
        ($4 <> '' AND (phone = $4 OR cell_phone = $4))
        OR ($5 <> '' AND LOWER(email) = LOWER($5))
        OR ($6 <> '' AND address_zip = $6)
      )
      AND is_active = true
  `).all(
    firstName.trim(), lastName.trim(), dob.trim(),
    inputPhone, normalEmail, zip?.trim() || ''
  );

  // Outcome: exactly one match
  if (candidates.length === 1) {
    const patient = candidates[0];
    const otp     = generateOtp();
    const otpExp  = new Date(Date.now() + OTP_TTL).toISOString();
    const pwHash  = password ? await bcrypt.hash(password, 12) : null;

    await db.prepare(`
      UPDATE portal_users SET
        first_name = $1, last_name = $2, date_of_birth = $3, phone = $4,
        linked_patient_id = $5, status = 'linked',
        otp_code = $6, otp_expires = $7, otp_attempts = 0,
        password_hash = COALESCE($8, password_hash),
        updated_at = NOW()
      WHERE id = $9
    `).run(
      firstName.trim(), lastName.trim(), dob.trim(),
      phone?.trim() || '',
      patient.id,
      hashOtp(otp), otpExp,
      pwHash,
      portalUser.id
    );

    sendPortalOtp(normalEmail, otp, firstName.trim())
      .catch(e => console.error('[portal] OTP email failed:', e.message));

    await portalAudit(portalUser.id, patient.id, 'identity_verified', {}, req.ip);
    return res.json({ ok: true, hint: maskEmail(normalEmail) });
  }

  // Outcome: multiple or no matches — flag for staff review
  const matchCount = candidates.length;
  await db.prepare(`
    UPDATE portal_users SET
      first_name = $1, last_name = $2, date_of_birth = $3, phone = $4,
      status = 'pending_verification', updated_at = NOW()
    WHERE id = $5
  `).run(firstName.trim(), lastName.trim(), dob.trim(), phone?.trim() || '', portalUser.id);

  await portalAudit(portalUser.id, null, 'identity_match_failed', { matchCount, firstName, lastName, dob }, req.ip);

  return res.status(202).json({
    ok:      false,
    pending: true,
    message: matchCount === 0
      ? 'We couldn\'t find a matching record. Your request has been sent to the clinic for review — you\'ll hear back by email within 1 business day.'
      : 'Multiple records matched. A staff member will verify and link your account — you\'ll receive a confirmation email shortly.',
  });
});

// ── C. Returning user — send OTP ──────────────────────────────────────────────

// Kept as /request-access for backward compat with existing login page
router.post('/request-access', async (req, res) => {
  const { email } = req.body;
  if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });
  const normalEmail = email.trim().toLowerCase();

  const portalUser = await db.prepare(
    'SELECT id, first_name, status, locked_until FROM portal_users WHERE LOWER(email) = $1'
  ).get(normalEmail);

  if (!portalUser) {
    // Unknown email — begin self-registration
    return res.json({ ok: true, needsVerification: true });
  }
  if (portalUser.status === 'pending_verification') {
    return res.json({ ok: true, needsVerification: true });
  }
  if (portalUser.status === 'disabled') {
    return res.status(403).json({ error: 'Account disabled. Contact your clinic.' });
  }
  if (portalUser.locked_until && new Date(portalUser.locked_until) > new Date()) {
    return res.status(429).json({ error: 'Account locked. Try again in 10 minutes.' });
  }

  const otp    = generateOtp();
  const otpExp = new Date(Date.now() + OTP_TTL).toISOString();

  await db.prepare(`
    UPDATE portal_users
    SET otp_code = $1, otp_expires = $2, otp_attempts = 0, updated_at = NOW()
    WHERE id = $3
  `).run(hashOtp(otp), otpExp, portalUser.id);

  sendPortalOtp(normalEmail, otp, portalUser.first_name || 'Patient')
    .catch(e => console.error('[portal] OTP email failed:', e.message));

  res.json({ ok: true, hint: maskEmail(normalEmail) });
});

// Also expose as /send-otp for new login page
router.post('/send-otp', async (req, res, next) => {
  req.url = '/request-access';
  return router.handle(req, res, next);
});

// ── D. Verify OTP → issue session ────────────────────────────────────────────

router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and code are required' });

  const normalEmail = email.trim().toLowerCase();
  const portalUser  = await db.prepare(`
    SELECT id, first_name, last_name, status, linked_patient_id,
           otp_code, otp_expires, otp_attempts, locked_until
    FROM portal_users WHERE LOWER(email) = $1
  `).get(normalEmail);

  if (!portalUser)                          return res.status(401).json({ error: 'Invalid code' });
  if (portalUser.status === 'disabled')     return res.status(403).json({ error: 'Account disabled' });
  if (portalUser.locked_until && new Date(portalUser.locked_until) > new Date()) {
    return res.status(429).json({ error: 'Account locked. Try again in 10 minutes.' });
  }
  if (!portalUser.otp_code || !portalUser.otp_expires || new Date(portalUser.otp_expires) < new Date()) {
    return res.status(401).json({ error: 'Code expired — request a new one' });
  }

  const stored    = Buffer.from(portalUser.otp_code.padEnd(64, ' '));
  const submitted = Buffer.from(hashOtp(otp.trim()).padEnd(64, ' '));
  const valid     = stored.length === submitted.length &&
                    crypto.timingSafeEqual(stored, submitted);

  if (!valid) {
    const attempts = (portalUser.otp_attempts || 0) + 1;
    if (attempts >= MAX_OTP_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCK_DURATION).toISOString();
      await db.prepare(
        `UPDATE portal_users SET otp_attempts = $1, locked_until = $2 WHERE id = $3`
      ).run(attempts, lockUntil, portalUser.id);
      return res.status(429).json({ error: 'Too many incorrect attempts. Account locked for 10 minutes.' });
    }
    await db.prepare(`UPDATE portal_users SET otp_attempts = $1 WHERE id = $2`).run(attempts, portalUser.id);
    const left = MAX_OTP_ATTEMPTS - attempts;
    return res.status(401).json({ error: `Invalid code. ${left} attempt${left === 1 ? '' : 's'} remaining.` });
  }

  // Clear OTP
  await db.prepare(`
    UPDATE portal_users
    SET otp_code = NULL, otp_expires = NULL, otp_attempts = 0, locked_until = NULL,
        status = CASE WHEN status = 'pending_verification' THEN 'pending_verification' ELSE 'linked' END,
        updated_at = NOW()
    WHERE id = $1
  `).run(portalUser.id);

  await issuePortalSession(res, portalUser.id, req.ip, req.get('User-Agent'));
  await portalAudit(portalUser.id, portalUser.linked_patient_id, 'login', {}, req.ip);

  res.json({
    ok: true,
    patient: {
      id:        portalUser.linked_patient_id,
      firstName: portalUser.first_name,
      lastName:  portalUser.last_name,
      email:     normalEmail,
    },
  });
});

// ── E. Password-based login ───────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const normalEmail = email.trim().toLowerCase();
  const portalUser  = await db.prepare(`
    SELECT id, first_name, last_name, status, linked_patient_id, password_hash, locked_until
    FROM portal_users WHERE LOWER(email) = $1
  `).get(normalEmail);

  if (!portalUser || !portalUser.password_hash) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (portalUser.status !== 'linked') {
    return res.status(403).json({ error: 'Account not verified' });
  }
  if (portalUser.locked_until && new Date(portalUser.locked_until) > new Date()) {
    return res.status(429).json({ error: 'Account locked. Try again in 10 minutes.' });
  }

  const valid = await bcrypt.compare(password, portalUser.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  await issuePortalSession(res, portalUser.id, req.ip, req.get('User-Agent'));
  await portalAudit(portalUser.id, portalUser.linked_patient_id, 'login_password', {}, req.ip);

  res.json({
    ok: true,
    patient: {
      id:        portalUser.linked_patient_id,
      firstName: portalUser.first_name,
      lastName:  portalUser.last_name,
      email:     normalEmail,
    },
  });
});

// ── F. Staff portal account management ───────────────────────────────────────

// GET /api/patient-portal/admin/accounts — list portal users with status
router.get('/admin/accounts', authenticate, async (req, res) => {
  const { status } = req.query;
  const rows = await db.prepare(`
    SELECT pu.id, pu.email, pu.first_name, pu.last_name, pu.status,
           pu.linked_patient_id, pu.created_at, pu.updated_at,
           p.mrn, p.first_name AS pt_first, p.last_name AS pt_last
    FROM portal_users pu
    LEFT JOIN patients p ON pu.linked_patient_id = p.id
    ${status ? 'WHERE pu.status = $1' : ''}
    ORDER BY pu.created_at DESC
    LIMIT 200
  `).all(...(status ? [status] : []));

  res.json(rows.map(r => ({
    id:        r.id,
    email:     r.email,
    name:      `${r.first_name} ${r.last_name}`.trim(),
    status:    r.status,
    patientId: r.linked_patient_id,
    patient:   r.mrn ? `${r.pt_first} ${r.pt_last} (${r.mrn})` : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  })));
});

// POST /api/patient-portal/admin/accounts/:id/link — staff manually links pending account
router.post('/admin/accounts/:id/link', authenticate, async (req, res) => {
  const { patientId } = req.body;
  if (!patientId) return res.status(400).json({ error: 'patientId is required' });

  const patient = await db.prepare('SELECT id FROM patients WHERE id = $1').get(patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  await db.prepare(`
    UPDATE portal_users
    SET linked_patient_id = $1, status = 'linked', updated_at = NOW()
    WHERE id = $2
  `).run(patientId, req.params.id);

  await portalAudit(req.params.id, patientId, 'manually_linked', { staffId: req.user.id }, req.ip);
  res.json({ ok: true });
});

// POST /api/patient-portal/admin/accounts/:id/disable
router.post('/admin/accounts/:id/disable', authenticate, async (req, res) => {
  await db.prepare(
    `UPDATE portal_users SET status = 'disabled', updated_at = NOW() WHERE id = $1`
  ).run(req.params.id);
  await portalAudit(req.params.id, null, 'account_disabled', { staffId: req.user.id }, req.ip);
  res.json({ ok: true });
});

// ── Authenticated patient routes ──────────────────────────────────────────────

// GET /me
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
    email:            req.portalUser.email,
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

// PUT /profile
router.put('/profile', authenticatePortal, async (req, res) => {
  const { phone, cellPhone, addressStreet, addressCity, addressState, addressZip,
          emergencyName, emergencyPhone, gender } = req.body;

  // Update chart (patient record)
  await db.prepare(`
    UPDATE patients SET
      phone                  = COALESCE($1, phone),
      cell_phone             = COALESCE($2, cell_phone),
      address_street         = COALESCE($3, address_street),
      address_city           = COALESCE($4, address_city),
      address_state          = COALESCE($5, address_state),
      address_zip            = COALESCE($6, address_zip),
      emergency_contact_name = COALESCE($7, emergency_contact_name),
      emergency_contact_phone= COALESCE($8, emergency_contact_phone),
      gender                 = COALESCE($9, gender)
    WHERE id = $10
  `).run(
    phone || null, cellPhone || null,
    addressStreet || null, addressCity || null, addressState || null, addressZip || null,
    emergencyName || null, emergencyPhone || null, gender || null,
    req.patientId
  );

  // Mirror contact info to portal_users
  await db.prepare(`
    UPDATE portal_users SET phone = COALESCE($1, phone), updated_at = NOW() WHERE id = $2
  `).run(phone || null, req.portalUser.id);

  await portalAudit(req.portalUser.id, req.patientId, 'profile_updated', {}, req.ip);
  res.json({ ok: true });
});

// GET /providers
router.get('/providers', authenticatePortal, async (req, res) => {
  const rows = await db.prepare(`
    SELECT id, first_name, last_name, role, location_id
    FROM users
    WHERE role IN ('provider','physician','nurse_practitioner','attending','admin','prescriber')
      AND is_active = true
    ORDER BY last_name, first_name
  `).all();
  res.json(rows.map(r => ({
    id:         r.id,
    name:       `${r.first_name} ${r.last_name}`.trim(),
    role:       r.role,
    locationId: r.location_id,
  })));
});

// GET /appointments
router.get('/appointments', authenticatePortal, async (req, res) => {
  const rows = await db.prepare(`
    SELECT id, date, time, reason, status, provider_name, location_name, appointment_type
    FROM appointments
    WHERE patient_id = $1
    ORDER BY date DESC, time DESC
    LIMIT 20
  `).all(req.patientId);

  res.json(rows.map(r => ({
    id:       r.id,
    date:     r.date,
    time:     r.time,
    reason:   r.reason,
    status:   r.status,
    provider: r.provider_name || '—',
    location: r.location_name || '—',
    type:     r.appointment_type || 'Visit',
  })));
});

// GET /medications
router.get('/medications', authenticatePortal, async (req, res) => {
  const rows = await db.prepare(`
    SELECT id, name, dose, frequency, prescriber, start_date, status, refills_left, pharmacy
    FROM medications
    WHERE patient_id = $1 AND status = 'Active'
    ORDER BY name
  `).all(req.patientId);

  res.json(rows.map(r => ({
    id:               r.id,
    name:             r.name,
    dosage:           r.dose,
    frequency:        r.frequency,
    prescriber:       r.prescriber || '—',
    startDate:        r.start_date,
    status:           r.status,
    refillsRemaining: r.refills_left ?? null,
    pharmacy:         r.pharmacy || '—',
  })));
});

// GET /messages — patient's thread (both directions, keyed by patient_id)
router.get('/messages', authenticatePortal, async (req, res) => {
  const rows = await db.prepare(`
    SELECT id, from_name, subject, body, date, time, type, urgent,
           from_user_type, to_user_type, provider_id
    FROM inbox_messages
    WHERE patient_id = $1
      AND (to_user_type = 'patient' OR from_user_type = 'patient' OR to_user_type IS NULL OR to_user_type = 'provider')
    ORDER BY date ASC, time ASC
    LIMIT 200
  `).all(req.patientId);

  res.json(rows.map(r => ({
    id:           r.id,
    from:         r.from_name,
    subject:      r.subject,
    body:         r.body,
    date:         r.date,
    time:         r.time,
    type:         r.type,
    urgent:       !!r.urgent,
    fromUserType: r.from_user_type || 'system',
    toUserType:   r.to_user_type   || 'provider',
    providerId:   r.provider_id,
  })));
});

// POST /messages — patient sends message to provider
router.post('/messages', authenticatePortal, validate(PortalMessageSchema), async (req, res) => {
  const { text, providerId } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Message text is required' });

  const patient = await db.prepare(
    'SELECT id, first_name, last_name, assigned_provider FROM patients WHERE id = $1'
  ).get(req.patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const toUser      = providerId || patient.assigned_provider || null;
  const patientName = `${patient.first_name} ${patient.last_name}`;
  const id          = uuidv4();
  const now         = new Date();

  await db.prepare(`
    INSERT INTO inbox_messages
      (id, type, from_name, to_user, provider_id, patient_id, patient_name,
       subject, body, date, time, read, priority, status, urgent,
       from_user_type, to_user_type)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,'Normal','Unread',false,'patient','provider')
  `).run(
    id, 'Patient Message',
    `${patientName} (Patient Portal)`,
    toUser, toUser,
    req.patientId, patientName,
    `Message from ${patientName}`,
    text.trim(),
    now.toISOString().split('T')[0],
    now.toTimeString().slice(0, 5)
  );

  await portalAudit(req.portalUser.id, req.patientId, 'message_sent', { messageId: id }, req.ip);
  res.status(201).json({ ok: true, id });
});

// POST /assessments
router.post('/assessments', authenticatePortal, validate(PortalAssessmentSchema), async (req, res) => {
  const { tool, score, maxScore, interpretation, answers, date } = req.body;
  if (!tool || score === undefined) return res.status(400).json({ error: 'tool and score are required' });

  const patient = await db.prepare('SELECT id, first_name, last_name FROM patients WHERE id = $1').get(req.patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const id          = uuidv4();
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

// POST /refill-request
router.post('/refill-request', authenticatePortal, validate(PortalRefillRequestSchema), async (req, res) => {
  const { medicationId, medicationName, dose, frequency, pharmacy } = req.body;
  if (!medicationName) return res.status(400).json({ error: 'medicationName required' });

  const patient = await db.prepare(
    'SELECT id, first_name, last_name, assigned_provider FROM patients WHERE id = $1'
  ).get(req.patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const patientName = `${patient.first_name} ${patient.last_name}`;
  const id          = uuidv4();
  const msgId       = uuidv4();
  const now         = new Date();
  const toUser      = patient.assigned_provider || null;

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

  await db.prepare(`
    INSERT INTO inbox_messages
      (id, type, from_name, to_user, provider_id, patient_id, patient_name,
       subject, body, date, time, read, priority, status, urgent,
       from_user_type, to_user_type)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,'Normal','Unread',false,'patient','provider')
  `).run(
    msgId, 'Rx Refill Request',
    `${patientName} (Patient Portal)`,
    toUser, toUser,
    req.patientId, patientName,
    `Refill Request: ${medicationName}${dose ? ' ' + dose : ''}`,
    `Patient has requested a refill via the Patient Portal.\n\nMedication: ${medicationName}${dose ? ' ' + dose : ''}${frequency ? ' — ' + frequency : ''}${pharmacy ? '\nPreferred pharmacy: ' + pharmacy : ''}`,
    now.toISOString().split('T')[0],
    now.toTimeString().slice(0, 5)
  );

  await portalAudit(req.portalUser.id, req.patientId, 'refill_requested', { medicationName }, req.ip);
  res.status(201).json({ ok: true, refillId: id });
});

// POST /book-appointment
router.post('/book-appointment', authenticatePortal, validate(PortalBookAppointmentSchema), async (req, res) => {
  const { providerId, providerName, date, time, duration, visitType, reason, notes } = req.body;
  if (!providerId || !date || !time) {
    return res.status(400).json({ error: 'providerId, date, and time are required' });
  }

  const patient = await db.prepare(
    'SELECT id, first_name, last_name, mrn FROM patients WHERE id = $1'
  ).get(req.patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const providerUser = await db.prepare('SELECT location_id FROM users WHERE id = $1').get(providerId);
  const locationId   = providerUser?.location_id || null;
  const patientName  = `${patient.first_name} ${patient.last_name}`;
  const id           = uuidv4();
  const msgId        = uuidv4();
  const now          = new Date();

  await db.prepare(`
    INSERT INTO appointments
      (id, patient_id, patient_name, provider, provider_name, date, time, duration,
       type, status, reason, visit_type, room, location_id, created_at, updated_at)
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

  await db.prepare(`
    INSERT INTO inbox_messages
      (id, type, from_name, to_user, provider_id, patient_id, patient_name,
       subject, body, date, time, read, priority, status, urgent,
       from_user_type, to_user_type)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,'Normal','Unread',false,'patient','provider')
  `).run(
    msgId, 'Staff Message',
    `${patientName} (Patient Portal)`,
    providerId, providerId,
    req.patientId, patientName,
    `New Appointment Booked — ${patientName}`,
    `Patient has booked an appointment via the Patient Portal.\n\nPatient: ${patientName} (MRN: ${patient.mrn})\nProvider: ${providerName}\nDate: ${date}\nTime: ${time}\nDuration: ${duration || 30} min\nVisit: ${visitType || 'In-Person'}${notes ? '\nNotes: ' + notes : ''}`,
    now.toISOString().split('T')[0],
    now.toTimeString().slice(0, 5)
  );

  await portalAudit(req.portalUser.id, req.patientId, 'appointment_booked', { date, time, providerId }, req.ip);
  res.status(201).json({ ok: true, appointmentId: id });
});

// POST /staff-reply — provider sends reply into patient's portal thread
router.post('/staff-reply', authenticate, async (req, res) => {
  const { patientId, text } = req.body;
  if (!patientId || !text?.trim()) return res.status(400).json({ error: 'patientId and text are required' });

  const patient = await db.prepare('SELECT id, first_name, last_name FROM patients WHERE id = $1').get(patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const id           = uuidv4();
  const now          = new Date();
  const providerName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.username;
  const patientName  = `${patient.first_name} ${patient.last_name}`;

  await db.prepare(`
    INSERT INTO inbox_messages
      (id, type, from_name, to_user, provider_id, patient_id, patient_name,
       subject, body, date, time, read, priority, status, urgent,
       from_user_type, to_user_type)
    VALUES ($1,$2,$3,NULL,$4,$5,$6,$7,$8,$9,$10,false,'Normal','Unread',false,'provider','patient')
  `).run(
    id, 'Provider Reply',
    providerName,
    req.user.id,
    patientId, patientName,
    `Message from ${providerName}`,
    text.trim(),
    now.toISOString().split('T')[0],
    now.toTimeString().slice(0, 5)
  );

  res.status(201).json({ ok: true, id });
});

// POST /telehealth/token
router.post('/telehealth/token', authenticatePortal, validate(PortalTelehealthTokenSchema), portalTelehealthToken);

// POST /logout
router.post('/logout', authenticatePortal, async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    const tokenHash = hashToken(token);
    await db.prepare('DELETE FROM portal_sessions WHERE token_hash = $1').run(tokenHash).catch(() => {});
  }
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true, secure: true, sameSite: 'none',
    domain: '.clarity-ehr.com', path: '/',
  });
  await portalAudit(req.portalUser?.id, req.patientId, 'logout', {}, req.ip);
  res.json({ ok: true });
});

export { authenticatePortal };
export default router;
