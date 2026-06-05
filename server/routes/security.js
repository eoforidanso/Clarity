/**
 * Clarity EHR — Security Console API
 * Admin only. Surfaces security events from audit_logs.
 */
import { Router } from 'express';
import { authenticate, requireElevated, authorize } from '../middleware/auth.js';
import { db } from '../db/database.js';
import { setDeviceTrust, getUserDevices } from '../security/geoDevice.js';

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
    WHERE s.is_active = 1
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
router.delete('/sessions/:id', async (req, res) => { await db.prepare(`UPDATE sessions SET is_active = 0 WHERE id = $1`).run(req.params.id);
  res.status(204).end(); });

// DELETE /api/security/sessions — emergency revoke all
router.delete('/sessions', requireElevated, async (_req, res) => { const { changes } = await db.prepare(`UPDATE sessions SET is_active = 0 WHERE is_active = 1`).run();
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
      `UPDATE sessions SET is_active = 0 WHERE device_id = $1 AND is_active = 1`
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

export default router;
