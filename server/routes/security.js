/**
 * Clarity EHR — Security Console API
 * Admin/security only. Surfaces sessions, auth events, risk metrics, and security incidents.
 *
 * Phase 8: Security Visibility endpoints for hardened auth system
 */
import { Router } from 'express';
import { authenticate, authorize, requireElevated } from '../middleware/auth.js';
import db from '../db/database.js';
import { setDeviceTrust, getUserDevices } from '../security/geoDevice.js';
import { routeError } from '../utils/routeError.js';

const router = Router();
router.use(authenticate, authorize('admin'));

const SECURITY_ACTIONS = [
  'IDOR_BLOCKED', 'IDOR_BLOCKED_USER', 'REAUTH_FAILED', 'REAUTH_SUCCESS',
  'LOGIN_FAILED', 'JWT_TAMPER_ATTEMPT', 'PRIVILEGE_ESCALATION',
  'USER_DELETED', 'LOCATION_DELETED', 'BTG_UNAUTHORIZED',
  'ROLE_CHANGE_BLOCKED', 'AUDIT_LOG_TAMPER_ATTEMPT',
];

// GET /api/security/events
router.get('/events', async (req, res) => { const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
  const action = req.query.action;

  const rows = action
    ? await db.prepare(`SELECT * FROM audit_logs WHERE action = $1 ORDER BY created_at DESC LIMIT $2`).all(action, limit)
    : await db.prepare(`SELECT * FROM audit_logs WHERE action IN (${SECURITY_ACTIONS.map((_, i) => `$${i+1 }`).join(',')}) ORDER BY created_at DESC LIMIT $${ SECURITY_ACTIONS.length+1 }`).all(...SECURITY_ACTIONS, limit);

  res.json(rows.map(r => ({ id: r.id, actorId: r.actor_id, actorName: r.actor_name, action: r.action, targetId: r.target_id, targetType: r.target_type, ip: r.ip, createdAt: r.created_at, details: (() => { try { return JSON.parse(r.details); } catch { return { }; } })(),
  })));
});

// GET /api/security/summary
router.get('/summary', async (_req, res) => { const summary = { };

  for (const action of SECURITY_ACTIONS) { const h24 = await db.prepare(`SELECT COUNT(*) AS c FROM audit_logs WHERE action=$1 AND created_at::timestamptz >= NOW() - INTERVAL '1 day'`).get(action);
    const d7  = await db.prepare(`SELECT COUNT(*) AS c FROM audit_logs WHERE action=$1 AND created_at::timestamptz >= NOW() - INTERVAL '7 days'`).get(action);
    summary[action] = { last24h: Number(h24?.c || 0), last7d: Number(d7?.c || 0) };
  }

  const placeholders = SECURITY_ACTIONS.map((_,i) => `$${ i+1 }`).join(',');
  const topIps = await db.prepare(`
    SELECT ip, COUNT(*) AS cnt FROM audit_logs
    WHERE action IN (${ placeholders })
      AND created_at::timestamptz >= NOW() - INTERVAL '1 day' AND ip != ''
    GROUP BY ip ORDER BY cnt DESC LIMIT 5
  `).all(...SECURITY_ACTIONS);

  const actors = await db.prepare(`
    SELECT actor_name, actor_id, COUNT(*) AS cnt, MAX(created_at) AS last_seen
    FROM audit_logs
    WHERE action IN (${ placeholders })
      AND created_at::timestamptz >= NOW() - INTERVAL '1 day'
    GROUP BY actor_id, actor_name ORDER BY cnt DESC LIMIT 5
  `).all(...SECURITY_ACTIONS);

  res.json({ summary, topIps, actors, generatedAt: new Date().toISOString() });
});

// GET /api/security/sessions
router.get('/sessions', async (req, res) => { const rows = await db.prepare(`
    SELECT
      s.id, s.user_id, s.ip_address, s.user_agent, s.created_at, s.last_seen_at, s.is_elevated, s.elevated_expires_at, s.location_id, u.first_name, u.last_name, u.role, u.email, l.name AS location_name, ul.country, ul.city, ul.country_code, ud.platform, ud.browser, ud.trust_state
    FROM sessions s
    LEFT JOIN users u ON u.id = s.user_id
    LEFT JOIN locations l ON l.id = s.location_id
    LEFT JOIN user_locations ul ON ul.user_id = s.user_id
      AND ul.id = (SELECT id FROM user_locations WHERE user_id = s.user_id ORDER BY last_seen DESC LIMIT 1)
    LEFT JOIN user_devices ud ON ud.user_id = s.user_id
      AND ud.id = (SELECT id FROM user_devices WHERE user_id = s.user_id ORDER BY last_seen DESC LIMIT 1)
    WHERE s.is_active = TRUE
    ORDER BY COALESCE(s.last_seen_at, s.created_at) DESC
    LIMIT 100
  `).all();

  res.json(rows.map(r => ({
    id:               r.id, userId:           r.user_id, name:             `${r.first_name || '' } ${ r.last_name || '' }`.trim() || 'Unknown',
    role:             r.role || 'unknown',
    email:            r.email || '',
    ip:               r.ip_address || '',
    userAgent:        r.user_agent || '',
    locationId:       r.location_id || '',
    locationName:     r.location_name || '',
    country:          r.country || '',
    city:             r.city || '',
    countryCode:      r.country_code || '',
    devicePlatform:   r.platform || '',
    deviceBrowser:    r.browser || '',
    isTrustedDevice:  r.trust_state === 'trusted',
    createdAt:        r.created_at,
    lastSeenAt:       r.last_seen_at || r.created_at,
    isElevated:       r.is_elevated === 1 || r.is_elevated === true,
    elevatedExpiresAt: r.elevated_expires_at || null,
    isCurrent:        r.user_id === req.user.id,
  })));
});

// DELETE /api/security/sessions/:id
router.delete('/sessions/:id', async (req, res) => { await db.prepare(`UPDATE sessions SET is_active = FALSE WHERE id = $1`).run(req.params.id);
  res.status(204).end(); });

// DELETE /api/security/sessions — emergency revoke all
router.delete('/sessions', requireElevated, async (_req, res) => { const { changes } = await db.prepare(`UPDATE sessions SET is_active = FALSE WHERE is_active = TRUE`).run();
  res.json({ revoked: changes, message: 'All sessions revoked — everyone must re-login' });
});

// GET /api/security/anomalies
router.get('/anomalies', async (req, res) => { const status = req.query.status || 'open';
  const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
  try {
    const rows = await db.prepare(
      `SELECT * FROM anomalies WHERE status = $1 ORDER BY detected_at DESC LIMIT $2`
    ).all(status, limit);
    res.json(rows.map(r => ({
      id: r.id, ruleId: r.rule_id, severity: r.severity, title: r.title, description: r.description, actorId: r.actor_id, actorName: r.actor_name, ip: r.ip, eventCount: r.event_count, windowMin: r.window_min, status: r.status, detectedAt: r.detected_at, resolvedAt: r.resolved_at, rawEvents: (() => { try { return JSON.parse(r.raw_events); } catch { return []; } })(),
    })));
  } catch { res.json([]); }
});

// PATCH /api/security/anomalies/:id/resolve
router.patch('/anomalies/:id/resolve', async (req, res) => { try {
    await db.prepare(`UPDATE anomalies SET status='resolved', resolved_at=NOW() WHERE id=$1`).run(req.params.id);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// GET /api/security/anomalies/summary
router.get('/anomalies/summary', async (_req, res) => { try {
    const rows   = await db.prepare(`SELECT severity, COUNT(*) AS cnt FROM anomalies WHERE status='open' GROUP BY severity`).all();
    const byRule = await db.prepare(`SELECT rule_id, COUNT(*) AS cnt FROM anomalies WHERE status='open' GROUP BY rule_id ORDER BY cnt DESC`).all();
    res.json({ bySeverity: Object.fromEntries(rows.map(r => [r.severity, Number(r.cnt)])), byRule });
  } catch { res.json({ bySeverity: { }, byRule: [] }); }
});

// GET /api/security/devices/:userId
router.get('/devices/:userId', async (req, res) => { try {
    res.json(await getUserDevices(req.params.userId)); } catch { res.status(500).json({ error: 'Failed' }); }
});

// POST /api/security/devices/:id/revoke
router.post('/devices/:id/revoke', async (req, res) => { try {
    await setDeviceTrust(req.params.id, 'revoked');
    const { changes } = await db.prepare(
      `UPDATE sessions SET is_active = FALSE WHERE device_id = $1 AND is_active = TRUE`
    ).run(req.params.id);
    res.json({ ok: true, sessionsRevoked: changes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/security/devices/:id/trust
router.post('/devices/:id/trust', async (req, res) => { try {
    await setDeviceTrust(req.params.id, 'trusted');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/security/devices/:id/flag
router.post('/devices/:id/flag', async (req, res) => { try {
    await setDeviceTrust(req.params.id, 'suspicious');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PHASE 8: Risk-based Auth Visibility ────────────────────────────────────

/**
 * GET /api/security/auth-events — list auth events (logins, MFA, elevation)
 * Filtered by action, user, IP, timeframe
 */
router.get('/auth-events', authenticate, authorize('admin', 'security'), async (req, res) => {
  const { action, user_id, ip_address, days = 7, limit = 100, offset = 0 } = req.query;

  try {
    let query = `
      SELECT
        id, action, user_id, username, ip_address, user_agent, details, created_at
      FROM audit_logs
      WHERE action IN ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_REJECTED_LOCKED', 'LOGOUT', 'MFA_REQUIRED', 'MFA_VERIFIED', 'REAUTH_SUCCESS', 'TOKEN_REFRESH')
        AND created_at > NOW() - INTERVAL '${parseInt(days)} days'
    `;

    const params = [];

    if (action) {
      query += ` AND action = $${params.length + 1}`;
      params.push(action);
    }

    if (user_id) {
      query += ` AND user_id = $${params.length + 1}`;
      params.push(user_id);
    }

    if (ip_address) {
      query += ` AND ip_address = $${params.length + 1}`;
      params.push(ip_address);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const events = await db.prepare(query).all(...params);

    res.json({
      events: events.map(e => ({
        ...e,
        details: typeof e.details === 'string' ? JSON.parse(e.details || '{}') : e.details
      })),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    routeError(req, '[security/auth-events]', err);
    return res.status(500).json({ error: 'Failed to fetch auth events' });
  }
});

/**
 * GET /api/security/risk-summary — high-risk sessions, failed logins, locked accounts
 */
router.get('/risk-summary', authenticate, authorize('admin', 'security'), async (req, res) => {
  try {
    // High-risk sessions (score >= 30)
    const highRiskSessions = await db.prepare(`
      SELECT
        s.id, s.user_id, s.risk_score, s.ip_address, s.last_seen_at,
        u.username, u.first_name, u.last_name
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.revoked_at IS NULL AND s.risk_score >= 30
      ORDER BY s.risk_score DESC
      LIMIT 20
    `).all();

    // Failed login attempts in last 24h
    const failedLogins = await db.prepare(`
      SELECT
        COUNT(*) as count,
        username,
        ip_address
      FROM audit_logs
      WHERE action = 'LOGIN_FAILED'
        AND created_at > NOW() - INTERVAL '24 hours'
      GROUP BY username, ip_address
      HAVING COUNT(*) >= 3
      ORDER BY count DESC
      LIMIT 20
    `).all();

    // Locked accounts
    const lockedAccounts = await db.prepare(`
      SELECT
        id, username, first_name, last_name, locked_at, locked_reason
      FROM users
      WHERE is_locked = true
      ORDER BY locked_at DESC
    `).all();

    // Recent MFA verifications
    const mfaActivity = await db.prepare(`
      SELECT
        user_id, username, COUNT(*) as count,
        MAX(created_at) as latest
      FROM audit_logs
      WHERE action IN ('MFA_REQUIRED', 'MFA_VERIFIED', 'REAUTH_SUCCESS')
        AND created_at > NOW() - INTERVAL '24 hours'
      GROUP BY user_id, username
      ORDER BY latest DESC
      LIMIT 10
    `).all();

    res.json({
      summary: {
        highRiskSessionsCount: highRiskSessions.length,
        failedLoginPatternsCount: failedLogins.length,
        lockedAccountsCount: lockedAccounts.length
      },
      highRiskSessions,
      failedLoginPatterns: failedLogins,
      lockedAccounts,
      recentMfaActivity: mfaActivity
    });
  } catch (err) {
    routeError(req, '[security/risk-summary]', err);
    return res.status(500).json({ error: 'Failed to fetch risk summary' });
  }
});

/**
 * GET /api/security/anomalies/dashboard — real-time anomaly dashboard
 * Shows all open anomalies with severity breakdown
 */
router.get('/anomalies/dashboard', authenticate, authorize('admin', 'security'), async (req, res) => {
  try {
    // Get all open anomalies grouped by severity
    const anomalies = await db.prepare(`
      SELECT id, rule_id, name, severity, finding, detected_at, status
      FROM anomalies
      WHERE status = 'open'
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        detected_at DESC
      LIMIT 100
    `).all();

    // Count by severity
    const severityCounts = await db.prepare(`
      SELECT severity, COUNT(*) as count
      FROM anomalies
      WHERE status = 'open'
      GROUP BY severity
    `).all();

    // Recent resolved anomalies (last 24h)
    const resolved = await db.prepare(`
      SELECT id, rule_id, name, severity, resolved_at
      FROM anomalies
      WHERE status = 'resolved'
        AND resolved_at > NOW() - INTERVAL '24 hours'
      ORDER BY resolved_at DESC
      LIMIT 20
    `).all();

    // Compute summary
    const summary = {
      total: anomalies.length,
      bySeverity: Object.fromEntries(
        severityCounts.map(r => [r.severity.toLowerCase(), Number(r.count)])
      ),
      resolvedLast24h: resolved.length,
      generatedAt: new Date().toISOString()
    };

    res.json({
      summary,
      openAnomalies: anomalies.map(a => ({
        ...a,
        finding: typeof a.finding === 'string' ? JSON.parse(a.finding || '{}') : a.finding
      })),
      recentlyResolved: resolved
    });
  } catch (err) {
    routeError(req, '[security/anomalies/dashboard]', err);
    return res.status(500).json({ error: 'Failed to fetch anomaly dashboard' });
  }
});

/**
 * PATCH /api/security/anomalies/:id/resolve — mark anomaly as resolved
 */
router.patch('/anomalies/:id/resolve', authenticate, authorize('admin', 'security'), async (req, res) => {
  const { id } = req.params;
  const { resolution } = req.body;

  try {
    const anomaly = await db.prepare('SELECT id FROM anomalies WHERE id = $1').get(id);
    if (!anomaly) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }

    await db.prepare(`
      UPDATE anomalies
      SET status = 'resolved', resolved_at = NOW()
      WHERE id = $1
    `).run(id);

    logAuditEvent({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'ANOMALY_RESOLVED',
      resourceType: 'anomaly',
      resourceId: id,
      details: { resolution },
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') || '',
      sessionId: req.user.session_id
    });

    res.json({ message: 'Anomaly resolved' });
  } catch (err) {
    routeError(req, '[anomalies/resolve]', err);
    return res.status(500).json({ error: 'Failed to resolve anomaly' });
  }
});

/**
 * GET /api/security/user/:id — user's sessions and auth history
 * Admin/security or self
 */
router.get('/user/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  // Allow admins/security or the user checking their own data
  if (req.user.id !== id && !['admin', 'security'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    // Current sessions
    const sessions = await db.prepare(`
      SELECT
        id, created_at, last_seen_at, expires_at, revoked_at,
        ip_address, device_id, risk_score, mfa_level
      FROM sessions
      WHERE user_id = $1
      ORDER BY last_seen_at DESC
      LIMIT 10
    `).all(id);

    // Recent auth events
    const authEvents = await db.prepare(`
      SELECT action, ip_address, details, created_at
      FROM audit_logs
      WHERE user_id = $1
        AND action IN ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'MFA_VERIFIED', 'REAUTH_SUCCESS')
        AND created_at > NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT 20
    `).all(id);

    // Account status
    const user = await db.prepare(`
      SELECT is_locked, locked_reason, locked_at, two_factor_enabled
      FROM users
      WHERE id = $1
    `).get(id);

    res.json({
      user,
      sessions,
      authEvents: authEvents.map(e => ({
        ...e,
        details: typeof e.details === 'string' ? JSON.parse(e.details || '{}') : e.details
      }))
    });
  } catch (err) {
    routeError(req, '[security/user]', err);
    return res.status(500).json({ error: 'Failed to fetch user security data' });
  }
});

export default router;
