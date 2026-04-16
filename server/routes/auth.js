import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import config from '../config.js';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/auditLog.js';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    // Log failed login attempt
    logAuditEvent({
      action: 'LOGIN_FAILED',
      resourceType: 'auth',
      details: { username, reason: 'Invalid credentials' },
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') || '',
    });
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const sessionId = uuidv4();
  const token = jwt.sign({ userId: user.id, role: user.role, sessionId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  // Store session
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // 8h
  try {
    db.prepare('INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      sessionId, user.id, tokenHash, req.ip || '', req.get('User-Agent') || '', expiresAt
    );
  } catch (e) { /* session table may not exist on first run */ }

  // Log successful login
  logAuditEvent({
    userId: user.id,
    userName: `${user.first_name} ${user.last_name || ''}`.trim(),
    userRole: user.role,
    action: 'LOGIN_SUCCESS',
    resourceType: 'auth',
    details: { sessionId },
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
    sessionId,
  });

  res.json({
    token,
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
      patientId: user.patient_id,
    },
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  logAuditEvent({
    userId: req.user.id,
    userName: `${req.user.first_name} ${req.user.last_name || ''}`.trim(),
    userRole: req.user.role,
    action: 'SESSION_VALIDATED',
    resourceType: 'auth',
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
  });
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      firstName: req.user.first_name,
      lastName: req.user.last_name,
      name: `${req.user.first_name} ${req.user.last_name || ''}`.trim(),
      role: req.user.role,
      credentials: req.user.credentials,
      specialty: req.user.specialty,
      npi: req.user.npi,
      deaNumber: req.user.dea_number,
      email: req.user.email,
      twoFactorEnabled: !!req.user.two_factor_enabled,
      patientId: req.user.patient_id,
    },
  });
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  // Invalidate session
  try {
    db.prepare('UPDATE sessions SET is_active = 0 WHERE user_id = ? AND is_active = 1').run(req.user.id);
  } catch (e) { /* ok */ }

  logAuditEvent({
    userId: req.user.id,
    userName: `${req.user.first_name} ${req.user.last_name || ''}`.trim(),
    userRole: req.user.role,
    action: 'LOGOUT',
    resourceType: 'auth',
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
  });
  res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/verify-epcs-pin
router.post('/verify-epcs-pin', authenticate, (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN is required' });

  const user = db.prepare('SELECT epcs_pin_hash FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.epcs_pin_hash) {
    return res.status(400).json({ error: 'EPCS not configured for this user' });
  }

  const valid = bcrypt.compareSync(pin, user.epcs_pin_hash);
  res.json({ valid });
});

// POST /api/auth/generate-epcs-otp
router.post('/generate-epcs-otp', authenticate, (req, res) => {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = bcrypt.hashSync(otp, 10);
  const expiresAt = new Date(Date.now() + 30000).toISOString(); // 30 seconds

  // Invalidate previous OTPs
  db.prepare('UPDATE epcs_otps SET used = 1 WHERE user_id = ? AND used = 0').run(req.user.id);

  // Store new OTP
  db.prepare('INSERT INTO epcs_otps (id, user_id, otp_hash, expires_at) VALUES (?, ?, ?, ?)').run(
    uuidv4(), req.user.id, otpHash, expiresAt
  );

  // In production, this would be sent via authenticator app / SMS
  // For development, return it directly
  res.json({ otp, expiresAt, message: 'OTP generated (shown for development only)' });
});

// POST /api/auth/verify-epcs-otp
router.post('/verify-epcs-otp', authenticate, (req, res) => {
  const { otp } = req.body;
  if (!otp) return res.status(400).json({ error: 'OTP is required' });

  const otpRecord = db.prepare(
    'SELECT * FROM epcs_otps WHERE user_id = ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
  ).get(req.user.id);

  if (!otpRecord) {
    return res.json({ valid: false, error: 'No active OTP found' });
  }

  if (new Date(otpRecord.expires_at) < new Date()) {
    db.prepare('UPDATE epcs_otps SET used = 1 WHERE id = ?').run(otpRecord.id);
    return res.json({ valid: false, error: 'OTP has expired' });
  }

  const valid = bcrypt.compareSync(otp, otpRecord.otp_hash);
  if (valid) {
    db.prepare('UPDATE epcs_otps SET used = 1 WHERE id = ?').run(otpRecord.id);
  }

  res.json({ valid });
});

export default router;
