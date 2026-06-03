/**
 * Clarity EHR — Security Console API
 * Admin only. Surfaces security events from audit_logs.
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import db from '../db/database.js';

const router = Router();
router.use(authenticate, authorize('admin'));

const SECURITY_ACTIONS = [
  'IDOR_BLOCKED', 'IDOR_BLOCKED_USER', 'REAUTH_FAILED', 'REAUTH_SUCCESS',
  'LOGIN_FAILED', 'JWT_TAMPER_ATTEMPT', 'PRIVILEGE_ESCALATION',
  'USER_DELETED', 'LOCATION_DELETED', 'BTG_UNAUTHORIZED',
  'ROLE_CHANGE_BLOCKED', 'AUDIT_LOG_TAMPER_ATTEMPT',
];

// GET /api/security/events — recent security events
router.get('/events', (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
  const action = req.query.action; // optional filter

  const rows = action
    ? db.prepare(`SELECT * FROM audit_logs WHERE action = ? ORDER BY created_at DESC LIMIT ?`).all(action, limit)
    : db.prepare(`SELECT * FROM audit_logs WHERE action IN (${SECURITY_ACTIONS.map(() => '?').join(',')}) ORDER BY created_at DESC LIMIT ?`).all(...SECURITY_ACTIONS, limit);

  res.json(rows.map(r => ({
    id: r.id, actorId: r.actor_id, actorName: r.actor_name,
    action: r.action, targetId: r.target_id, targetType: r.target_type,
    ip: r.ip, createdAt: r.created_at,
    details: (() => { try { return JSON.parse(r.details); } catch { return {}; } })(),
  })));
});

// GET /api/security/summary — counts per action last 24h / 7d
router.get('/summary', (_req, res) => {
  const summary = {};

  for (const action of SECURITY_ACTIONS) {
    const h24 = db.prepare(`SELECT COUNT(*) as c FROM audit_logs WHERE action=? AND created_at>=datetime('now','-1 day')`).get(action);
    const d7  = db.prepare(`SELECT COUNT(*) as c FROM audit_logs WHERE action=? AND created_at>=datetime('now','-7 days')`).get(action);
    summary[action] = { last24h: h24?.c || 0, last7d: d7?.c || 0 };
  }

  // Top offending IPs
  const topIps = db.prepare(`
    SELECT ip, COUNT(*) as cnt FROM audit_logs
    WHERE action IN (${SECURITY_ACTIONS.map(() => '?').join(',')})
      AND created_at >= datetime('now', '-1 day') AND ip != ''
    GROUP BY ip ORDER BY cnt DESC LIMIT 5
  `).all(...SECURITY_ACTIONS);

  // Recent unique actors triggering events
  const actors = db.prepare(`
    SELECT actor_name, actor_id, COUNT(*) as cnt, MAX(created_at) as last_seen
    FROM audit_logs
    WHERE action IN (${SECURITY_ACTIONS.map(() => '?').join(',')})
      AND created_at >= datetime('now', '-1 day')
    GROUP BY actor_id ORDER BY cnt DESC LIMIT 5
  `).all(...SECURITY_ACTIONS);

  res.json({ summary, topIps, actors, generatedAt: new Date().toISOString() });
});

export default router;
