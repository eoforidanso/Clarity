import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate, requireElevated, requireElevated, authorize, requireElevated } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/auditLog.js';
import { softDeleteUser, logAudit, activeScope } from '../db/softDelete.js';

// ── Welcome email on new user creation ───────────────────────────────────────
async function sendWelcomeEmail({ toEmail, firstName, username, tempPassword, role }) {
  if (!process.env.RESEND_API_KEY) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'noreply@clarity-ehr.com',
      to: toEmail,
      subject: '🏥 Welcome to Clarity EHR — your account is ready',
      html: `
        <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px">
          <div style="text-align:center;margin-bottom:28px">
            <div style="font-size:40px;margin-bottom:8px">🏥</div>
            <h2 style="color:#0d2444;font-size:22px;margin:0">Welcome to Clarity EHR</h2>
          </div>
          <p style="color:#374151;font-size:15px">Hi ${firstName},</p>
          <p style="color:#374151;font-size:15px">Your Clarity EHR account has been created. Sign in and set your personal password to get started.</p>
          <div style="background:#fff;border:1.5px solid #e0e7ef;border-radius:10px;padding:20px;margin:20px 0">
            <table style="width:100%;font-size:14px;border-collapse:collapse">
              <tr><td style="color:#6b7280;padding:5px 0;width:140px">Portal</td><td><a href="https://app.clarity-ehr.com" style="color:#0060b6;font-weight:700">app.clarity-ehr.com</a></td></tr>
              <tr><td style="color:#6b7280;padding:5px 0">Username</td><td style="font-family:monospace;font-weight:700;color:#111827">${username}</td></tr>
              <tr><td style="color:#6b7280;padding:5px 0">Temp password</td><td style="font-family:monospace;font-weight:700;color:#111827">${tempPassword}</td></tr>
              <tr><td style="color:#6b7280;padding:5px 0">Role</td><td style="font-weight:600;color:#111827;text-transform:capitalize">${role}</td></tr>
            </table>
          </div>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px;margin-bottom:20px">
            <p style="color:#92400e;font-size:13px;margin:0">⚠️ You will be required to set a new password on your first sign-in. Keep these credentials safe.</p>
          </div>
          <div style="text-align:center;margin:24px 0">
            <a href="https://app.clarity-ehr.com" style="background:linear-gradient(180deg,#1872c8,#0055a8);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Sign in →</a>
          </div>
          <p style="color:#9ca3af;font-size:11px;text-align:center">Clarity EHR · HIPAA-compliant · If you didn't expect this, contact your administrator.</p>
        </div>
      `,
    }),
  });
}

const router = Router();
router.use(authenticate); // RBAC: all routes require authentication
const ADMIN_ROLES = ['admin', 'front_desk'];
const SALT_ROUNDS = 12;

// Validate password strength at system boundary
function validatePassword(pwd) {
  if (typeof pwd !== 'string') return 'Password must be a string';
  if (pwd.length < 8) return 'Password must be at least 8 characters';
  if (pwd.length > 200) return 'Password too long';
  if (!/[A-Z]/.test(pwd)) return 'Password must contain an uppercase letter';
  if (!/[0-9]/.test(pwd)) return 'Password must contain a number';
  return null;
}

// Validate and sanitize a username
function sanitizeUsername(raw) {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[\x00-\x1F\x7F]/g, '').trim().toLowerCase();
  if (cleaned.length < 2 || cleaned.length > 50) return null;
  if (!/^[a-z0-9._-]+$/.test(cleaned)) return null;
  return cleaned;
}

const VALID_ROLES = ['prescriber', 'nurse', 'front_desk', 'therapist', 'biller', 'admin'];

// ── GET /api/users/directory ───────────────────────────────────────────
// Returns basic name/role info for staff.
// Admins see all staff. Non-admins see only staff at their own location.
router.get('/directory', authenticate, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const userLocationId = req.user.location_id;

  const rows = isAdmin || !userLocationId
    ? await db.prepare(
        `SELECT id, first_name, last_name, role, credentials, specialty
         FROM users WHERE role != 'patient' AND ${activeScope}
         ORDER BY last_name ASC, first_name ASC`
      ).all()
    : await db.prepare(
        `SELECT id, first_name, last_name, role, credentials, specialty
         FROM users WHERE role != 'patient' AND location_id = $1 AND ${activeScope}
         ORDER BY last_name ASC, first_name ASC`
      ).all(userLocationId);

  res.json(rows.map(u => ({
    id: u.id,
    firstName: u.first_name || '',
    lastName: u.last_name || '',
    role: u.role,
    credentials: u.credentials || '',
    specialty: u.specialty || '',
  })));
});

// ── GET /api/users ─────────────────────────────────────────────────────
// Returns staff users. Admins see all; non-admins see only their location.
router.get('/', authenticate, authorize(...ADMIN_ROLES), async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const userLocationId = req.user.location_id;

  const rows = isAdmin || !userLocationId
    ? await db.prepare(
        `SELECT id, username, first_name, last_name, role, credentials, specialty,
                npi, dea_number, email, two_factor_enabled, location_id, created_at, updated_at
         FROM users WHERE role != 'patient' AND ${activeScope}
         ORDER BY last_name ASC, first_name ASC`
      ).all()
    : await db.prepare(
        `SELECT id, username, first_name, last_name, role, credentials, specialty,
                npi, dea_number, email, two_factor_enabled, location_id, created_at, updated_at
         FROM users WHERE role != 'patient' AND location_id = $1 AND ${activeScope}
         ORDER BY last_name ASC, first_name ASC`
      ).all(userLocationId);

  res.json(rows.map(u => ({
    id: u.id,
    username: u.username,
    firstName: u.first_name,
    lastName: u.last_name,
    role: u.role,
    credentials: u.credentials || '',
    specialty: u.specialty || '',
    npi: u.npi || '',
    deaNumber: u.dea_number || '',
    email: u.email,
    twoFactorEnabled: !!u.two_factor_enabled,
    locationId: u.location_id || '',
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  })));
});

// ── POST /api/users ─────────────────────────────────────────────────────
// Create a new staff user. Admin/front_desk only.
router.post('/', authenticate, authorize(...ADMIN_ROLES), async (req, res) => {
  const { username, password, firstName, lastName, role, credentials, specialty, npi, deaNumber, email, twoFactorEnabled, mustChangePassword, locationId } = req.body;

  // Validate required fields
  const cleanUsername = sanitizeUsername(username);
  if (!cleanUsername) return res.status(400).json({ error: 'Invalid username (2–50 chars, alphanumeric/._- only)' });

  const pwdError = validatePassword(password);
  if (pwdError) return res.status(400).json({ error: pwdError });

  if (!firstName || typeof firstName !== 'string' || firstName.trim().length < 1) {
    return res.status(400).json({ error: 'First name is required' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
  }
  if (!email || typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  // Check uniqueness
  const existing = await db.prepare('SELECT id FROM users WHERE username = $1').get(cleanUsername);
  if (existing) return res.status(409).json({ error: 'Username already exists' });

  const emailExists = await db.prepare('SELECT id FROM users WHERE email = $1').get(email.trim().toLowerCase());
  if (emailExists) return res.status(409).json({ error: 'Email already in use' });

  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);

  await db.prepare(
    `INSERT INTO users (id, username, password_hash, first_name, last_name, role, credentials, specialty, npi, dea_number, email, two_factor_enabled, must_change_password, location_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`
  ).run(
    id,
    cleanUsername,
    passwordHash,
    firstName.trim(),
    (lastName || '').trim(),
    role,
    (credentials || '').trim(),
    (specialty || '').trim(),
    (npi || '').trim(),
    (deaNumber || '').trim(),
    email.trim().toLowerCase(),
    twoFactorEnabled ? 1 : 0,
    mustChangePassword === false ? 0 : 1,
    locationId || null
  );

  // Send welcome email with credentials
  sendWelcomeEmail({
    toEmail: email.trim().toLowerCase(),
    firstName: firstName.trim(),
    username: cleanUsername,
    tempPassword: password,
    role,
  }).catch(err => console.warn('[users] welcome email failed:', err.message));

  logAuditEvent({
    userId: req.user.id,
    userName: `${req.user.first_name} ${req.user.last_name || ''}`.trim(),
    userRole: req.user.role,
    action: 'USER_CREATED',
    resourceType: 'user',
    resourceId: id,
    details: { username: cleanUsername, role },
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
  });

  res.status(201).json({ id, username: cleanUsername, role, message: 'User created successfully' });
});

// ── PUT /api/users/:id ──────────────────────────────────────────────────
// Update a user's profile (not password). Admin only.
router.put('/:id', authenticate, authorize(...ADMIN_ROLES), async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, role, credentials, specialty, npi, deaNumber, email, twoFactorEnabled, locationId } = req.body;

  const user = await db.prepare('SELECT id, role FROM users WHERE id = $1 AND role != $2').get(id, 'patient');
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  if (email) {
    const emailConflict = await db.prepare('SELECT id FROM users WHERE email = $1 AND id != $2').get(email.trim().toLowerCase(), id);
    if (emailConflict) return res.status(409).json({ error: 'Email already in use' });
  }

  await db.prepare(
    `UPDATE users SET
       first_name = COALESCE($1, first_name),
       last_name = COALESCE($2, last_name),
       role = COALESCE($3, role),
       credentials = COALESCE($4, credentials),
       specialty = COALESCE($5, specialty),
       npi = COALESCE($6, npi),
       dea_number = COALESCE($7, dea_number),
       email = COALESCE($8, email),
       two_factor_enabled = COALESCE($9, two_factor_enabled),
       location_id = COALESCE($10, location_id),
       updated_at = NOW()
     WHERE id = $11`
  ).run(
    firstName?.trim() ?? null,
    lastName?.trim() ?? null,
    role ?? null,
    credentials?.trim() ?? null,
    specialty?.trim() ?? null,
    npi?.trim() ?? null,
    deaNumber?.trim() ?? null,
    email ? email.trim().toLowerCase() : null,
    twoFactorEnabled != null ? (twoFactorEnabled ? 1 : 0) : null,
    locationId ?? null,
    id
  );

  logAuditEvent({
    userId: req.user.id,
    userName: `${req.user.first_name} ${req.user.last_name || ''}`.trim(),
    userRole: req.user.role,
    action: 'USER_UPDATED',
    resourceType: 'user',
    resourceId: id,
    details: { role },
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
  });

  res.json({ message: 'User updated successfully' });
});

// ── POST /api/users/:id/reset-password ─────────────────────────────────
// Reset a user's password. Admin/front_desk only. Cannot reset own password this way.
router.post('/:id/reset-password', authenticate, requireElevated, authorize(...ADMIN_ROLES), async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'Use the Settings page to change your own password' });
  }

  const pwdError = validatePassword(newPassword);
  if (pwdError) return res.status(400).json({ error: pwdError });

  const user = await db.prepare('SELECT id FROM users WHERE id = $1 AND role != $2').get(id, 'patient');
  if (!user) return res.status(404).json({ error: 'User not found' });

  const hash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
  await db.prepare("UPDATE users SET password_hash = $1, must_change_password = 1, updated_at = NOW() WHERE id = $2").run(hash, id);

  // Invalidate all active sessions for this user
  try {
    await db.prepare('UPDATE sessions SET is_active = 0 WHERE user_id = $1').run(id);
  } catch (_) { /* sessions table may not exist */ }

  logAuditEvent({
    userId: req.user.id,
    userName: `${req.user.first_name} ${req.user.last_name || ''}`.trim(),
    userRole: req.user.role,
    action: 'PASSWORD_RESET',
    resourceType: 'user',
    resourceId: id,
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
  });

  res.json({ message: 'Password reset successfully' });
});

// ── POST /api/users/:id/unlock ──────────────────────────────────────────
// Unlock a user stuck in forced password change. Clears must_change_password flag.
// Admin/front_desk only.
router.post('/:id/unlock', authenticate, requireElevated, authorize(...ADMIN_ROLES), async (req, res) => {
  const { id } = req.params;

  const user = await db.prepare('SELECT id FROM users WHERE id = $1 AND role != $2').get(id, 'patient');
  if (!user) return res.status(404).json({ error: 'User not found' });

  await db.prepare("UPDATE users SET must_change_password = 0, updated_at = NOW() WHERE id = $1").run(id);

  logAuditEvent({
    userId: req.user.id,
    userName: `${req.user.first_name} ${req.user.last_name || ''}`.trim(),
    userRole: req.user.role,
    action: 'USER_UNLOCKED',
    resourceType: 'user',
    resourceId: id,
    details: { reason: 'Cleared forced password change flag' },
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
  });

  res.json({ message: 'User account unlocked successfully' });
});

// ── DELETE /api/users/:id (soft delete) ────────────────────────────────
router.delete('/:id', authenticate, requireElevated, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  const user = db.prepare(`SELECT id, username, role FROM users WHERE id = $1 AND role != $2 AND ${activeScope}`).get(id, 'patient');
  if (!user) return res.status(404).json({ error: 'User not found' });

  const actorName = `${req.user.first_name} ${req.user.last_name || ''}`.trim();
  softDeleteUser(id, req.user.id, actorName, req.ip);

  res.status(204).end();
});

export default router;
