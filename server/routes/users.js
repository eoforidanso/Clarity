import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/auditLog.js';

const router = Router();
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
// Returns basic name/role info for all staff — accessible by any authenticated user.
// No sensitive data (email, NPI, DEA) is included.
router.get('/directory', authenticate, async (_req, res) => {
  const rows = await db
    .prepare(
      `SELECT id, first_name, last_name, role, credentials, specialty
       FROM users
       WHERE role != 'patient'
       ORDER BY last_name ASC, first_name ASC`
    )
    .all();

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
// Returns all staff users (not patients). Admin/front_desk only.
router.get('/', authenticate, authorize(...ADMIN_ROLES), async (_req, res) => {
  const rows = await db
    .prepare(
      `SELECT id, username, first_name, last_name, role, credentials, specialty,
              npi, dea_number, email, two_factor_enabled, location_id, created_at, updated_at
       FROM users
       WHERE role != 'patient'
       ORDER BY last_name ASC, first_name ASC`
    )
    .all();

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
  const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
  if (existing) return res.status(409).json({ error: 'Username already exists' });

  const emailExists = await db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (emailExists) return res.status(409).json({ error: 'Email already in use' });

  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);

  await db.prepare(
    `INSERT INTO users (id, username, password_hash, first_name, last_name, role, credentials, specialty, npi, dea_number, email, two_factor_enabled, must_change_password, location_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
// Update a user's profile (not password). Admin/front_desk only.
router.put('/:id', authenticate, authorize(...ADMIN_ROLES), async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, role, credentials, specialty, npi, deaNumber, email, twoFactorEnabled, locationId } = req.body;

  const user = await db.prepare('SELECT id, role FROM users WHERE id = ? AND role != ?').get(id, 'patient');
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  if (email) {
    const emailConflict = await db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.trim().toLowerCase(), id);
    if (emailConflict) return res.status(409).json({ error: 'Email already in use' });
  }

  await db.prepare(
    `UPDATE users SET
       first_name = COALESCE(?, first_name),
       last_name = COALESCE(?, last_name),
       role = COALESCE(?, role),
       credentials = COALESCE(?, credentials),
       specialty = COALESCE(?, specialty),
       npi = COALESCE(?, npi),
       dea_number = COALESCE(?, dea_number),
       email = COALESCE(?, email),
       two_factor_enabled = COALESCE(?, two_factor_enabled),
       location_id = COALESCE(?, location_id),
       updated_at = datetime('now')
     WHERE id = ?`
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
router.post('/:id/reset-password', authenticate, authorize(...ADMIN_ROLES), async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'Use the Settings page to change your own password' });
  }

  const pwdError = validatePassword(newPassword);
  if (pwdError) return res.status(400).json({ error: pwdError });

  const user = await db.prepare('SELECT id FROM users WHERE id = ? AND role != ?').get(id, 'patient');
  if (!user) return res.status(404).json({ error: 'User not found' });

  const hash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
  await db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = datetime('now') WHERE id = ?").run(hash, id);

  // Invalidate all active sessions for this user
  try {
    await db.prepare('UPDATE sessions SET is_active = 0 WHERE user_id = ?').run(id);
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
router.post('/:id/unlock', authenticate, authorize(...ADMIN_ROLES), async (req, res) => {
  const { id } = req.params;

  const user = await db.prepare('SELECT id FROM users WHERE id = ? AND role != ?').get(id, 'patient');
  if (!user) return res.status(404).json({ error: 'User not found' });

  await db.prepare("UPDATE users SET must_change_password = 0, updated_at = datetime('now') WHERE id = ?").run(id);

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

// ── DELETE /api/users/:id ───────────────────────────────────────────────
// Delete a staff user. Cannot delete yourself.
router.delete('/:id', authenticate, authorize(...ADMIN_ROLES), async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  const user = await db.prepare('SELECT id, username, role FROM users WHERE id = ? AND role != ?').get(id, 'patient');
  if (!user) return res.status(404).json({ error: 'User not found' });

  await db.prepare('DELETE FROM users WHERE id = ?').run(id);

  logAuditEvent({
    userId: req.user.id,
    userName: `${req.user.first_name} ${req.user.last_name || ''}`.trim(),
    userRole: req.user.role,
    action: 'USER_DELETED',
    resourceType: 'user',
    resourceId: id,
    details: { username: user.username, role: user.role },
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
  });

  res.json({ message: 'User deleted successfully' });
});

export default router;
