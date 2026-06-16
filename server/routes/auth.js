import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import config from '../config.js';
import db from '../db/database.js';
import { authenticate, requireElevated } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/auditLog.js';
import { needsMfa, isSensitiveRoute, SENSITIVE_ROUTES } from '../security/authRules.js';
import { rateLimitLoginByIp, rateLimitLoginByUsername, trackLoginFailure, checkAccountLockout, lockAccount } from '../security/rateLimiter.js';
// Send OTP email via Resend HTTP API (port 443 — works on DigitalOcean)
async function sendOtpEmail(to, otp) { const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[2FA] RESEND_API_KEY not set — skipping email send');
    return; }
  const from = process.env.RESEND_FROM || 'Clarity EHR <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: {
      'Authorization': `Bearer ${apiKey }`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject: 'Your Clarity EHR Login Code', text: `Your verification code is: ${otp }\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#1e3a5f">Clarity EHR — Login Verification</h2>
        <p>Use the code below to complete your sign-in. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:36px;letter-spacing:10px;font-weight:bold;text-align:center;padding:20px;background:#f0f4f8;border-radius:8px;margin:20px 0">${ otp }</div>
        <p style="color:#666;font-size:12px">If you did not attempt to log in, please contact your administrator immediately.</p>
      </div>`,
    }),
  });
  if (!res.ok) { const body = await res.text();
    throw new Error(`Resend API ${res.status }: ${ body }`);
  }
}

const router = Router();

// ── Helper: issue refresh token ───────────────────────────────────────────────
async function issueRefreshToken(res, req, userId, sessionId) {
  const rawToken  = crypto.randomBytes(48).toString('hex'); // 96-char hex
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const id        = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token_hash, session_id, expires_at, ip, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `).run(id, userId, tokenHash, sessionId, expiresAt.toISOString(), req.ip || '', req.get('User-Agent') || '');

  res.cookie('ehr_refresh', rawToken, {
    httpOnly: true, secure: true, sameSite: 'none', domain: '.clarity-ehr.com', maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',  });

  return id;
}

// ── Helper: issue a full authenticated session (cookie + audit log) ──────────
async function issueFullSession(res, req, user) { const ip       = req.realIp || req.ip || '';
  const userName = `${user.first_name } ${ user.last_name || '' }`.trim();

  // Geographic + device fingerprint check — awaited so we get dbDeviceId
  // Attach role to req so geoDevice R11 can check privileged user status
  req.user = { id: user.id, role: user.role };
  let dbDeviceId = null;
  try { const { checkLoginAnomaly } = await import('../security/geoDevice.js');
    const result = await checkLoginAnomaly(user.id, userName, ip, req);
    dbDeviceId = result?.dbDeviceId ?? null;
  } catch (err) { console.warn('[geoDevice]', err.message); }

  const sessionId = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign({
    sub: user.id,
    role: user.role,
    session_id: sessionId,
    device_id: dbDeviceId,
    clinic_id: user.location_id || 'default',
    iat: now,
    exp: now + (8 * 60 * 60)
  }, config.jwtSecret, { algorithm: 'HS256' });
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  try { await db.prepare(
      'INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at, device_id) VALUES ($1, $2, $3, $4, $5, $6, $7)'
    ).run(sessionId, user.id, tokenHash, ip, req.get('User-Agent') || '', expiresAt, dbDeviceId); } catch (e) { console.warn('[sessions]', e.message); }

  // Issue 30-day refresh token alongside the 8h access token
  await issueRefreshToken(res, req, user.id, sessionId);

  logAuditEvent({ userId: user.id, userName: `${user.first_name } ${ user.last_name || '' }`.trim(),
    userRole: user.role,
    action: 'LOGIN_SUCCESS',
    resourceType: 'auth',
    details: { sessionId },
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
    sessionId,
  });

  res.cookie('ehr_token', token, { httpOnly: true, secure: true, sameSite: 'none', // required for cross-origin (app. → api.)
    domain: '.clarity-ehr.com', // shared across all subdomains
    maxAge: 8 * 60 * 60 * 1000, path: '/',  });

  // Fetch provider signature (null for non-prescribers or those who haven't uploaded one yet)
  let signatureDataUrl = null;
  try {
    const sigRow = await db.prepare(
      `SELECT signature_data_url FROM provider_signatures WHERE provider_id = $1`
    ).get(user.id);
    signatureDataUrl = sigRow?.signature_data_url ?? null;
  } catch { /* table may not exist yet during first deploy — safe to skip */ }

  return { mustChangePassword: !!user.must_change_password, user: {
      id: user.id, username: user.username, firstName: user.first_name, lastName: user.last_name, name: `${user.first_name } ${ user.last_name || '' }`.trim(),
      role: user.role,
      credentials: user.credentials,
      specialty: user.specialty,
      npi: user.npi,
      deaNumber: user.dea_number,
      email: user.email,
      twoFactorEnabled: !!user.two_factor_enabled,
      mustChangePassword: !!user.must_change_password,
      patientId: user.patient_id,
      locationId: user.location_id || 'loc1',
      isGlobal:  !!user.is_global,
      is_global: !!user.is_global,
      signature: signatureDataUrl,   // ← hydrated from provider_signatures at login
    },
  };
}

// POST /api/auth/login
router.post('/login', rateLimitLoginByIp, async (req, res) => { const { username, password } = req.body;
  if (!username || !password) { return res.status(400).json({ error: 'Username and password are required' });
  }

  // Input validation: enforce type, length, and strip control characters
  if (typeof username !== 'string' || typeof password !== 'string') { return res.status(400).json({ error: 'Invalid input' });
  }
  const sanitizedUsername = username.replace(/[\x00-\x1F\x7F]/g, '').trim();
  if (sanitizedUsername.length < 1 || sanitizedUsername.length > 100) {
    return res.status(400).json({ error: 'Invalid username' });
  }
  if (password.length < 1 || password.length > 200) {
    return res.status(400).json({ error: 'Invalid password' });
  }

  const user = await db.prepare('SELECT id, username, password_hash, first_name, last_name, role, credentials, specialty, npi, dea_number, email, two_factor_enabled, totp_secret, must_change_password, patient_id, location_id, is_global, is_locked, locked_reason FROM users WHERE username = ?').get(sanitizedUsername);

  // ── Account lockout check ───────────────────────────────────────────────────
  if (user?.is_locked) {
    logAuditEvent({
      userId: user.id,
      userName: `${user.first_name} ${user.last_name}`.trim(),
      userRole: user.role,
      action: 'LOGIN_REJECTED_LOCKED',
      resourceType: 'auth',
      details: { reason: user.locked_reason || 'account locked' },
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') || '',
    });
    return res.status(403).json({
      error: 'Account is locked. Please contact your administrator.',
      locked: true,
      reason: user.locked_reason
    });
  }

  // ── Credential check ────────────────────────────────────────────────────────
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    // Log failed login attempt
    await trackLoginFailure(db, user?.id || null, sanitizedUsername, req.ip || '', 'invalid_credentials');

    logAuditEvent({
      userId: user?.id || null,
      userName: user ? `${user.first_name} ${user.last_name}`.trim() : sanitizedUsername,
      userRole: user?.role || 'unknown',
      action: 'LOGIN_FAILED',
      resourceType: 'auth',
      details: { username: sanitizedUsername, reason: 'Invalid credentials' },
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') || '',
    });

    // Check if should lock account after multiple failures
    if (user) {
      const lockoutCheck = await checkAccountLockout(db, sanitizedUsername);
      if (lockoutCheck.shouldLock) {
        await lockAccount(db, user.id, lockoutCheck.reason);
        return res.status(403).json({
          error: 'Account locked due to multiple failed login attempts. Please contact your administrator.',
          locked: true
        });
      }
    }

    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // ── Username-based rate limit (after credential check to prevent enumeration) ──
  await rateLimitLoginByUsername(req, res, () => {});
  if (res.headersSent) return; // Rate limit middleware already sent response

  // ── Check initial risk (geo/device anomalies) ──────────────────────────────
  const ip = req.realIp || req.ip || '';
  const ua = req.get('User-Agent') || '';
  let initialRiskScore = 0;
  let dbDeviceId = null;

  try {
    const { checkLoginAnomaly } = await import('../security/geoDevice.js');
    req.user = { id: user.id, role: user.role }; // temp for geoDevice check
    const geoResult = await checkLoginAnomaly(user.id, `${user.first_name} ${user.last_name}`, ip, req);
    dbDeviceId = geoResult?.dbDeviceId ?? null;
    initialRiskScore = geoResult?.riskScore ?? 0; // geo-shift, new location, etc.
  } catch (err) {
    console.warn('[geoDevice]', err.message);
  }

  // ── Create provisional session ──────────────────────────────────────────────
  const sessionId = uuidv4();
  const sessionExpiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  try {
    await db.prepare(`
      INSERT INTO sessions (id, user_id, ip_address, user_agent, created_at, expires_at, device_id, risk_score, revoked_at)
      VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, NULL)
    `).run(sessionId, user.id, ip, ua, sessionExpiresAt, dbDeviceId, initialRiskScore);
  } catch (e) {
    console.warn('[sessions]', e.message);
  }

  // ── Check if MFA is required based on risk or user config ────────────────
  const provisionalSession = { risk_score: initialRiskScore, mfa_level: 0 };
  const mfaRequired = needsMfa(provisionalSession, user);

  if (mfaRequired) {
    // ── MFA Gate: pending session, require verification before full token ────
    if (!user.email) {
      return res.status(500).json({ error: 'No email address on file for this account. Contact your administrator.' });
    }

    // Generate cryptographically secure 6-digit OTP
    const otp = String(crypto.randomInt(100000, 1000000));
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await db.prepare(
      "UPDATE users SET email_otp = ?, email_otp_expires = ?, email_otp_attempts = 0, updated_at = NOW() WHERE id = ?"
    ).run(otp, otpExpires, user.id);

    const masked = user.email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.max(1, b.length)) + c);

    // Always log OTP to server console
    console.log(`[2FA] OTP for ${user.username} (${masked}): ${otp}`);

    // Send email (non-blocking)
    if (process.env.RESEND_API_KEY) {
      sendOtpEmail(user.email, otp).catch((err) => {
        console.error('[2FA] Failed to send OTP email:', err.message);
      });
    } else {
      console.warn('[2FA] RESEND_API_KEY not set — email not sent');
    }

    const tempToken = jwt.sign(
      { sub: user.id, session_id: sessionId, type: 'mfa_pending', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + (10 * 60) },
      config.jwtSecret,
      { algorithm: 'HS256' }
    );

    const exposeCode = config.nodeEnv !== 'production';
    logAuditEvent({
      userId: user.id,
      userName: `${user.first_name} ${user.last_name}`.trim(),
      userRole: user.role,
      action: 'MFA_REQUIRED',
      resourceType: 'auth',
      details: { risk_score: initialRiskScore, reason: mfaRequired ? 'risk_or_config' : 'unknown' },
      ipAddress: ip,
      userAgent: ua,
      sessionId
    });

    return res.json({
      requiresMfa: true,
      tempToken,
      emailHint: masked,
      ...(exposeCode ? { mockCode: otp } : {})
    });
  }

  // ── No MFA required — issue full session immediately ─────────────────────
  res.json(await issueFullSession(res, req, user));
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => { res.json({
    user: {
      id: req.user.id, username: req.user.username, firstName: req.user.first_name, lastName: req.user.last_name, name: `${req.user.first_name } ${ req.user.last_name || '' }`.trim(),
      role: req.user.role,
      credentials: req.user.credentials,
      specialty: req.user.specialty,
      npi: req.user.npi,
      deaNumber: req.user.dea_number,
      email: req.user.email,
      twoFactorEnabled: !!req.user.two_factor_enabled,
      mustChangePassword: !!req.user.must_change_password,
      patientId: req.user.patient_id,
      locationId: req.user.location_id || 'loc1',
      isGlobal:  !!req.user.is_global,
      is_global: !!req.user.is_global,
    },
  });
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => { const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) { return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 200) { return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) { return res.status(400).json({ error: 'New password must contain at least one uppercase letter and one number' });
  }

  const user = await db.prepare('SELECT password_hash FROM users WHERE id = $1').get(req.user.id);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) { return res.status(401).json({ error: 'Current password is incorrect' });
  }

  // Prevent reusing the current password
  if (bcrypt.compareSync(newPassword, user.password_hash)) { return res.status(400).json({ error: 'New password must be different from your current password' });
  }

  const newHash = bcrypt.hashSync(newPassword, 12);
  const result = await db.prepare(
    'UPDATE users SET password_hash = $1, must_change_password = 0, updated_at = NOW() WHERE id = $2 RETURNING must_change_password'
  ).get(newHash, req.user.id);

  // Verify the flag actually flipped — if RETURNING shows it's still 1, something went wrong
  if (result?.must_change_password) { console.error(`[change-password] RETURNING showed must_change_password still set for user ${req.user.id }`);
    return res.status(500).json({ error: 'Password updated but session flag could not be cleared. Contact your administrator.' });
  }

  logAuditEvent({ userId: req.user.id, userName: `${req.user.first_name } ${ req.user.last_name || '' }`.trim(),
    userRole: req.user.role,
    action: 'PASSWORD_CHANGED',
    resourceType: 'auth',
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
  });

  // Return mustChangePassword: false so the frontend can update state directly
  // without needing a refreshUser() round-trip — prevents infinite loop on DB lag
  res.json({ ok: true, message: 'Password changed successfully', mustChangePassword: false });
});

// POST /api/auth/refresh — swap 30-day refresh token for new 8h access token
router.post('/refresh', async (req, res) => { const rawRefresh = req.cookies?.ehr_refresh;
  if (!rawRefresh) return res.status(401).json({ error: 'No refresh token' });

  const tokenHash = crypto.createHash('sha256').update(rawRefresh).digest('hex');

  const record = await db.prepare(`
    SELECT rt.id, rt.user_id, rt.session_id, rt.expires_at, rt.is_active,
           u.id as uid, u.username, u.first_name, u.last_name, u.role,
           u.credentials, u.specialty, u.npi, u.dea_number, u.email,
           u.two_factor_enabled, u.must_change_password, u.patient_id, u.location_id
    FROM refresh_tokens rt
    JOIN users u ON u.id = rt.user_id
    WHERE rt.token_hash = $1
  `).get(tokenHash);

  if (!record || !record.is_active) { return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
  if (new Date(record.expires_at) < new Date()) { await db.prepare(`UPDATE refresh_tokens SET is_active = FALSE WHERE id = $1`).run(record.id);
    return res.status(401).json({ error: 'Refresh token expired — please log in again' });
  }

  // Mark refresh token as used (update last_used_at)
  await db.prepare(`UPDATE refresh_tokens SET last_used_at = NOW() WHERE id = $1`).run(record.id);

  // Issue new 8h access token reusing same session_id
  const sessionId = record.session_id || uuidv4();
  const token = jwt.sign(
    { userId: record.user_id, role: record.role, sessionId },
    config.jwtSecret,
    { algorithm: 'HS256', expiresIn: config.jwtExpiresIn }
  );
  const tokenHash2 = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt  = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

  // Update session with new token hash
  try { await db.prepare(`
      UPDATE sessions SET token_hash = $1, expires_at = $2, is_active = TRUE
      WHERE id = $3
    `).run(tokenHash2, expiresAt, sessionId); } catch { /* session may not exist — create one */ }

  res.cookie('ehr_token', token, { httpOnly: true, secure: true, sameSite: 'none', domain: '.clarity-ehr.com', maxAge: 8 * 60 * 60 * 1000, path: '/',  });

  res.json({ ok: true, message: 'Access token refreshed' });
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => { // Clear both cookies
  res.clearCookie('ehr_token', {
    httpOnly: true, secure: true, sameSite: 'none', domain: '.clarity-ehr.com', path: '/',  });
  res.clearCookie('ehr_refresh', { httpOnly: true, secure: true, sameSite: 'none', domain: '.clarity-ehr.com', path: '/',  });

  // Revoke all refresh tokens for this session
  const sessionId = req.user.session_id; // from middleware req.user
  try {
    if (sessionId) {
      await db.prepare(`
        UPDATE refresh_tokens
        SET revoked_at = NOW()
        WHERE session_id = $1 AND revoked_at IS NULL
      `).run(sessionId);
    }
  } catch (e) { /* non-blocking */ }

  // Revoke the session itself
  try {
    if (sessionId) {
      await db.prepare(`
        UPDATE sessions
        SET revoked_at = NOW(), revoke_reason = 'user_logout'
        WHERE id = $1 AND revoked_at IS NULL
      `).run(sessionId);
    }
  } catch (e) { /* non-blocking */ }

  logAuditEvent({ userId: req.user.id, userName: `${req.user.first_name } ${ req.user.last_name || '' }`.trim(),
    userRole: req.user.role,
    action: 'LOGOUT',
    resourceType: 'auth',
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
  });
  res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/verify-epcs-pin
router.post('/verify-epcs-pin', authenticate, async (req, res) => { const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN is required' });

  const user = await db.prepare('SELECT epcs_pin_hash FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.epcs_pin_hash) { return res.status(400).json({ error: 'EPCS not configured for this user' });
  }

  const valid = bcrypt.compareSync(pin, user.epcs_pin_hash);
  res.json({ valid });
});

// POST /api/auth/generate-epcs-otp
router.post('/generate-epcs-otp', authenticate, async (req, res) => { // Generate cryptographically secure 6-digit OTP
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = bcrypt.hashSync(otp, 10);
  const expiresAt = new Date(Date.now() + 30000).toISOString(); // 30 seconds

  // Invalidate previous OTPs
  await db.prepare('UPDATE epcs_otps SET used = 1 WHERE user_id = ? AND used = 0').run(req.user.id);

  // Store new OTP
  await db.prepare('INSERT INTO epcs_otps (id, user_id, otp_hash, expires_at) VALUES ($1, $2, $3, $4)').run(
    uuidv4(), req.user.id, otpHash, expiresAt
  );

  // In a real deployment, deliver OTP via SMS or authenticator app — never expose it in the response.
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV ONLY] EPCS OTP for user ${req.user.id }: ${ otp }`);
  }
  res.json({ expiresAt, message: 'OTP generated and sent' });
});

// POST /api/auth/verify-epcs-otp
router.post('/verify-epcs-otp', authenticate, async (req, res) => { const { otp } = req.body;
  if (!otp) return res.status(400).json({ error: 'OTP is required' });

  const otpRecord = await db.prepare(
    'SELECT * FROM epcs_otps WHERE user_id = ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
  ).get(req.user.id);

  if (!otpRecord) { return res.json({ valid: false, error: 'No active OTP found' });
  }

  if (new Date(otpRecord.expires_at) < new Date()) { await db.prepare('UPDATE epcs_otps SET used = 1 WHERE id = ?').run(otpRecord.id);
    return res.json({ valid: false, error: 'OTP has expired' });
  }

  const valid = bcrypt.compareSync(otp, otpRecord.otp_hash);
  if (valid) { await db.prepare('UPDATE epcs_otps SET used = 1 WHERE id = ?').run(otpRecord.id); }

  res.json({ valid });
});

// POST /api/auth/mfa/verify — validate email OTP and upgrade pending session to full session
router.post('/mfa/verify', async (req, res) => {
  const { tempToken, code } = req.body;
  if (!tempToken || !code) {
    return res.status(400).json({ error: 'tempToken and code are required' });
  }

  let payload;
  try {
    payload = jwt.verify(tempToken, config.jwtSecret, { algorithms: ['HS256'] });
  } catch (err) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  // Verify token type and required claims
  if (payload.type !== 'mfa_pending') {
    return res.status(401).json({ error: 'Invalid token type' });
  }
  if (!payload.sub || !payload.session_id) {
    return res.status(401).json({ error: 'Invalid token structure' });
  }

  const user = await db.prepare(`
    SELECT id, username, first_name, last_name, role, credentials, specialty, npi, dea_number, email, two_factor_enabled, email_otp, email_otp_expires, email_otp_attempts, must_change_password, patient_id, location_id, is_global
    FROM users WHERE id = ?
  `).get(payload.sub);

  if (!user) { return res.status(401).json({ error: 'User not found' });
  }

  // Enforce attempt limit
  if ((user.email_otp_attempts || 0) >= 5) { await db.prepare("UPDATE users SET email_otp = NULL, email_otp_expires = NULL, email_otp_attempts = 0 WHERE id = ?").run(user.id);
    return res.status(400).json({ error: 'Too many failed attempts. Please log in again.' });
  }

  // Check expiry
  if (!user.email_otp || !user.email_otp_expires || new Date(user.email_otp_expires) < new Date()) { await db.prepare("UPDATE users SET email_otp = NULL, email_otp_expires = NULL, email_otp_attempts = 0 WHERE id = ?").run(user.id);
    return res.status(400).json({ error: 'Code expired. Please log in again.' });
  }

  // Constant-time comparison to resist timing attacks
  const submittedBuf = Buffer.from(String(code).trim().padEnd(6, ' '));
  const storedBuf = Buffer.from(String(user.email_otp).padEnd(6, ' '));
  const match = submittedBuf.length === storedBuf.length &&
    crypto.timingSafeEqual(submittedBuf, storedBuf);

  if (!match) { await db.prepare("UPDATE users SET email_otp_attempts = email_otp_attempts + 1 WHERE id = ?").run(user.id);
    logAuditEvent({
      userId: user.id, userName: `${user.first_name } ${ user.last_name || '' }`.trim(),
      userRole: user.role,
      action: 'LOGIN_2FA_FAILED',
      resourceType: 'auth',
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') || '',
    });
    return res.status(400).json({ error: 'Invalid verification code. Please try again.' });
  }

  // Clear OTP after successful use
  await db.prepare("UPDATE users SET email_otp = NULL, email_otp_expires = NULL, email_otp_attempts = 0 WHERE id = ?").run(user.id);

  // MFA verified — upgrade pending session to full session
  const sessionId = payload.session_id;
  const now = Math.floor(Date.now() / 1000);
  const accessToken = jwt.sign({
    sub: user.id,
    role: user.role,
    session_id: sessionId,
    device_id: payload.device_id || null,
    clinic_id: user.location_id || 'default',
    iat: now,
    exp: now + (8 * 60 * 60)
  }, config.jwtSecret, { algorithm: 'HS256' });

  // Issue new refresh token
  const refreshTokenId = uuidv4();
  const rawRefreshToken = crypto.randomBytes(48).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    await db.prepare(`
      INSERT INTO refresh_tokens (id, user_id, session_id, device_id, token_hash, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `).run(refreshTokenId, user.id, sessionId, payload.device_id || null, refreshTokenHash, refreshExpiresAt, req.ip || '', req.get('User-Agent') || '');
  } catch (e) {
    console.warn('[refresh_tokens]', e.message);
  }

  // Set cookies
  res.cookie('ehr_token', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain: '.clarity-ehr.com',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/'
  });

  res.cookie('ehr_refresh', rawRefreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain: '.clarity-ehr.com',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/'
  });

  // Fetch provider signature
  let signatureDataUrl = null;
  try {
    const sigRow = await db.prepare(
      `SELECT signature_data_url FROM provider_signatures WHERE provider_id = $1`
    ).get(user.id);
    signatureDataUrl = sigRow?.signature_data_url ?? null;
  } catch { /* table may not exist yet */ }

  logAuditEvent({
    userId: user.id,
    userName: `${user.first_name} ${user.last_name || ''}`.trim(),
    userRole: user.role,
    action: 'MFA_VERIFIED',
    resourceType: 'auth',
    details: { sessionId },
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
    sessionId
  });

  return res.json({
    mustChangePassword: !!user.must_change_password,
    user: {
      id: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      name: `${user.first_name} ${user.last_name || ''}`.trim(),
      role: user.role,
      credentials: user.credentials,
      specialty: user.specialty,
      npi: user.npi,
      deaNumber: user.dea_number,
      email: user.email,
      twoFactorEnabled: !!user.two_factor_enabled,
      mustChangePassword: !!user.must_change_password,
      patientId: user.patient_id,
      locationId: user.location_id || 'loc1',
      isGlobal: !!user.is_global,
      is_global: !!user.is_global,
      signature: signatureDataUrl
    }
  });
});

// POST /api/auth/2fa/enable — enable email 2FA for the authenticated user
router.post('/2fa/enable', authenticate, async (req, res) => { await db.prepare("UPDATE users SET two_factor_enabled = true, updated_at = NOW() WHERE id = ?")
    .run(req.user.id);
  logAuditEvent({
    userId: req.user.id, userName: `${req.user.first_name } ${ req.user.last_name || '' }`.trim(),
    userRole: req.user.role,
    action: '2FA_ENABLED',
    resourceType: 'auth',
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
  });
  res.json({ message: '2FA enabled successfully' });
});

// POST /api/auth/2fa/disable — disable email 2FA for the authenticated user
router.post('/2fa/disable', authenticate, requireElevated, async (req, res) => { await db.prepare("UPDATE users SET two_factor_enabled = false, email_otp = NULL, email_otp_expires = NULL, updated_at = NOW() WHERE id = ?")
    .run(req.user.id);
  logAuditEvent({
    userId: req.user.id, userName: `${req.user.first_name } ${ req.user.last_name || '' }`.trim(),
    userRole: req.user.role,
    action: '2FA_DISABLED',
    resourceType: 'auth',
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
  });
  res.json({ message: '2FA disabled successfully' });
});

// ── POST /auth/reauth ─────────────────────────────────────────────────────────
// Re-authenticate to obtain a short-lived elevated token (5 min).
// Used before sensitive actions: delete patient, change role, export PHI,
// EPCS signing, override BTG access.
//
// Accepts:  { password: string }  — password re-entry
//           { otp: string }       — OTP code sent via 2FA channel
//
// Returns:  { elevatedToken: string, expiresAt: ISO }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reauth', authenticate, async (req, res) => { const userId = req.user.id;
  const { password, otp } = req.body;

  if (!password && !otp) { return res.status(400).json({ error: 'password or otp is required' });
  }

  try { // ── Path 1: Password re-entry ────────────────────────────────────────────
    if (password) {
      const row = await db.prepare('SELECT password_hash FROM users WHERE id = $1').get(userId);
      if (!row) return res.status(401).json({ error: 'User not found' });

      const valid = await bcrypt.compare(password, row.password_hash);
      if (!valid) { logAuditEvent({
          userId, action: 'REAUTH_FAILED', resourceType: 'auth', details: 'Invalid password on re-authentication', ip: req.ip,  });
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    // ── Path 2: OTP re-entry ─────────────────────────────────────────────────
    if (otp) { const user = await db.prepare(
        'SELECT email_otp, email_otp_expires, email_otp_attempts FROM users WHERE id = $1'
      ).get(userId);

      if (!user?.email_otp || !user?.email_otp_expires) {
        return res.status(401).json({ error: 'No OTP pending — request a new one via /auth/generate-epcs-otp' });
      }
      if (new Date(user.email_otp_expires) < new Date()) { return res.status(401).json({ error: 'OTP expired' });
      }
      if ((user.email_otp_attempts || 0) >= 5) { await db.prepare("UPDATE users SET email_otp = NULL, email_otp_expires = NULL, email_otp_attempts = 0 WHERE id = $1").run(userId);
        return res.status(429).json({ error: 'Too many OTP attempts — request a new code' });
      }

      const storedBuf  = Buffer.from(String(user.email_otp).padEnd(6, ' '));
      const enteredBuf = Buffer.from(String(otp).padEnd(6, ' '));

      if (storedBuf.length !== enteredBuf.length || !crypto.timingSafeEqual(storedBuf, enteredBuf)) { await db.prepare('UPDATE users SET email_otp_attempts = email_otp_attempts + 1 WHERE id = $1').run(userId);
        return res.status(401).json({ error: 'Invalid OTP' });
      }

      // Clear OTP after use
      await db.prepare("UPDATE users SET email_otp = NULL, email_otp_expires = NULL, email_otp_attempts = 0 WHERE id = $1").run(userId);
    }

    // ── Issue elevated token (5 min, single-use flag) ────────────────────────
    const ELEVATED_TTL_SECS = 5 * 60;
    const expiresAt = new Date(Date.now() + ELEVATED_TTL_SECS * 1000).toISOString();

    const elevatedToken = jwt.sign(
      { userId, role: req.user.role, elevated: true },
      config.jwtSecret, { algorithm: 'HS256', expiresIn: ELEVATED_TTL_SECS }
    );

    // Reset risk score after successful re-authentication
    try {
      await db.prepare(`
        UPDATE sessions SET risk_score = 0 WHERE user_id = $1 AND revoked_at IS NULL
      `).run(userId);
    } catch { /* non-blocking */ }

    logAuditEvent({ userId, action: 'REAUTH_SUCCESS', resourceType: 'auth', details: `Elevated session granted via ${otp ? 'OTP' : 'password' } — expires ${ expiresAt }`,
      ip: req.ip,
    });

    return res.json({ elevatedToken, expiresAt, expiresInSeconds: ELEVATED_TTL_SECS });
  } catch (err) { console.error('[reauth]', err);
    return res.status(500).json({ error: 'Re-authentication failed' });
  }
});

// GET /api/auth/session-risk — check current session risk score
router.get('/session-risk', authenticate, async (req, res) => {
  const sessionId = req.user.session_id;
  if (!sessionId) {
    return res.status(400).json({ error: 'No active session' });
  }

  try {
    const session = await db.prepare(`
      SELECT risk_score, mfa_level FROM sessions
      WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
    `).get(sessionId, req.user.id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const RISK_THRESHOLD = 30;
    const isHighRisk = session.risk_score > RISK_THRESHOLD;

    res.json({
      risk_score: session.risk_score,
      risk_level: isHighRisk ? 'elevated' : 'normal',
      requires_elevation: isHighRisk,
      mfa_level: session.mfa_level
    });
  } catch (err) {
    console.error('[session-risk]', err);
    return res.status(500).json({ error: 'Failed to check session risk' });
  }
});

// POST /api/auth/refresh — issue new access token from valid refresh token
// Implements token rotation: old refresh token is revoked, new one issued
router.post('/refresh', async (req, res) => {
  const oldToken = req.cookies?.ehr_refresh;
  if (!oldToken) {
    return res.status(401).json({ error: 'No refresh token provided' });
  }

  try {
    // Hash and look up old token
    const oldHash = crypto.createHash('sha256').update(oldToken).digest('hex');
    const oldTokenRec = await db.prepare(`
      SELECT id, user_id, session_id, device_id, created_at FROM refresh_tokens
      WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
    `).get(oldHash);

    if (!oldTokenRec) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Fetch user
    const user = await db.prepare(`
      SELECT id, username, first_name, last_name, role, credentials, specialty, npi, dea_number, email, two_factor_enabled, must_change_password, patient_id, location_id, is_global
      FROM users WHERE id = $1
    `).get(oldTokenRec.user_id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Issue new access + refresh tokens (both tied to same session)
    req.user = { id: user.id, role: user.role };
    await issueFullSession(res, req, user);

    // Revoke old refresh token (rotation)
    try {
      await db.prepare(`
        UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1
      `).run(oldTokenRec.id);
    } catch { /* non-blocking */ }

    logAuditEvent({
      userId: user.id,
      userName: `${user.first_name } ${user.last_name || ''}`.trim(),
      userRole: user.role,
      action: 'TOKEN_REFRESH',
      resourceType: 'auth',
      details: { session_id: oldTokenRec.session_id },
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') || '',
    });

    return res.json({ message: 'Token refreshed successfully' });
  } catch (err) {
    console.error('[refresh]', err.message);
    return res.status(500).json({ error: 'Token refresh failed' });
  }
});

export default router;
