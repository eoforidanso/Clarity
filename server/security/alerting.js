/**
 * Clarity EHR — Security Alerting
 *
 * Fires immediately when a security event is logged to audit_logs.
 * Delivers alerts via:
 *   1. Email (Resend) — to security@clarity-ehr.com
 *   2. Webhook (Slack / PagerDuty) — SECURITY_WEBHOOK_URL env var
 *   3. Console (always)
 *
 * Alert thresholds (per 15-minute window):
 *   IDOR_BLOCKED        ≥ 3  → MEDIUM alert
 *   LOGIN_FAILED        ≥ 5  → HIGH alert
 *   REAUTH_FAILED       ≥ 3  → HIGH alert
 *   ANY CRITICAL action → immediate
 */

import db from '../db/database.js';

// ── Severity levels ───────────────────────────────────────────────────────────
const SEVERITY = {
  CRITICAL: { level: 'CRITICAL', color: '#dc2626', emoji: '🚨' },
  HIGH:     { level: 'HIGH',     color: '#f97316', emoji: '⚠️' },
  MEDIUM:   { level: 'MEDIUM',   color: '#f59e0b', emoji: '🔶' },
  LOW:      { level: 'LOW',      color: '#3b82f6', emoji: 'ℹ️' },
};

// ── Actions that trigger immediate CRITICAL alert regardless of count ─────────
const CRITICAL_ACTIONS = new Set([
  'JWT_TAMPER_ATTEMPT',
  'ALG_NONE_ATTACK',
  'PRIVILEGE_ESCALATION',
  'BTG_UNAUTHORIZED',
  'AUDIT_LOG_TAMPER_ATTEMPT',
  'USER_DELETED',
  'LOCATION_DELETED',
]);

// ── Threshold rules (count / window_minutes → severity) ──────────────────────
const THRESHOLD_RULES = [
  { action: 'IDOR_BLOCKED',    threshold: 3,  windowMin: 15, severity: 'MEDIUM' },
  { action: 'IDOR_BLOCKED',    threshold: 10, windowMin: 15, severity: 'HIGH'   },
  { action: 'LOGIN_FAILED',    threshold: 5,  windowMin: 15, severity: 'HIGH'   },
  { action: 'REAUTH_FAILED',   threshold: 3,  windowMin: 15, severity: 'HIGH'   },
  { action: 'IDOR_BLOCKED_USER',threshold:3,  windowMin: 15, severity: 'HIGH'   },
];

// ── In-memory dedup (avoid alert storms) ─────────────────────────────────────
const _alerted = new Map(); // key → last alert timestamp
const DEDUP_MS  = 5 * 60 * 1000; // 5 minutes between same alerts

function shouldAlert(key) {
  const last = _alerted.get(key);
  if (last && Date.now() - last < DEDUP_MS) return false;
  _alerted.set(key, Date.now());
  return true;
}

// ── Alert delivery ────────────────────────────────────────────────────────────
export async function deliverAlert(severity, title, body, context = {}) {
  const sev  = SEVERITY[severity] || SEVERITY.HIGH;
  const ts   = new Date().toISOString();

  // 1. Console (always)
  console.error(`\n${sev.emoji} [SECURITY ${sev.level}] ${title}\n${body}\n`, context);

  // 2. Email via Resend
  const apiKey = process.env.RESEND_API_KEY;
  const alertEmail = process.env.SECURITY_ALERT_EMAIL || process.env.SMTP_USER;
  if (apiKey && alertEmail) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'Clarity EHR Security <security@resend.dev>',
          to: [alertEmail],
          subject: `${sev.emoji} [${sev.level}] Clarity EHR Security Alert: ${title}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:auto">
              <div style="background:${sev.color};color:white;padding:16px 20px;border-radius:8px 8px 0 0">
                <h2 style="margin:0">${sev.emoji} ${sev.level}: ${title}</h2>
                <p style="margin:4px 0 0;opacity:0.85;font-size:13px">${ts}</p>
              </div>
              <div style="background:#f8fafc;padding:20px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
                <p style="font-size:15px;color:#1e293b">${body}</p>
                <pre style="background:#1e293b;color:#e2e8f0;padding:14px;border-radius:6px;font-size:12px;overflow-x:auto">${JSON.stringify(context, null, 2)}</pre>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
                <p style="font-size:12px;color:#64748b">
                  Review audit logs: <a href="https://app.clarity-ehr.com/audit-trail">Clarity EHR Audit Trail</a><br>
                  Incident playbook: <code>bash /var/www/ehr/server/scripts/incident-response.sh</code>
                </p>
              </div>
            </div>
          `,
        }),
      });
    } catch (err) {
      console.error('[alerting] email failed:', err.message);
    }
  }

  // 3. Webhook (Slack / PagerDuty / any)
  const webhookUrl = process.env.SECURITY_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${sev.emoji} *[${sev.level}] ${title}*\n${body}`,
          attachments: [{
            color: sev.color,
            fields: Object.entries(context).map(([k, v]) => ({
              title: k, value: String(v), short: true,
            })),
            footer: `Clarity EHR Security | ${ts}`,
          }],
        }),
      });
    } catch (err) {
      console.error('[alerting] webhook failed:', err.message);
    }
  }
}

// ── Check thresholds against audit_logs ───────────────────────────────────────
async function checkThresholds() {
  for (const rule of THRESHOLD_RULES) {
    try {
      const windowStart = new Date(Date.now() - rule.windowMin * 60 * 1000).toISOString();
      const row = await db.prepare(
        `SELECT COUNT(*) as cnt, STRING_AGG(DISTINCT actor_id, ',') as actor_ids,
                STRING_AGG(DISTINCT ip, ',') as ips
         FROM audit_logs
         WHERE action = $1 AND created_at >= $2::timestamptz`
      ).get(rule.action, windowStart);

      if ((row?.cnt || 0) >= rule.threshold) {
        const key = `${rule.action}:${rule.severity}:${Math.floor(Date.now() / DEDUP_MS)}`;
        if (shouldAlert(key)) {
          deliverAlert(
            rule.severity,
            `${rule.action} threshold exceeded`,
            `${row.cnt} occurrences in the last ${rule.windowMin} minutes.`,
            { action: rule.action, count: row.cnt, ips: row.ips, windowMinutes: rule.windowMin }
          );
        }
      }
    } catch (err) {
      console.error('[security-monitor] threshold check error:', err.message);
    }
  }
}

// ── Immediate alert on critical actions ───────────────────────────────────────
export function alertOnAction(action, context = {}) {
  if (CRITICAL_ACTIONS.has(action)) {
    const key = `${action}:${context.actorId}:${Math.floor(Date.now() / DEDUP_MS)}`;
    if (shouldAlert(key)) {
      deliverAlert('CRITICAL', `Critical security action: ${action}`,
        `A critical action was performed that requires immediate review.`, context);
    }
  }
}

// ── Start monitoring loop ─────────────────────────────────────────────────────
export function startSecurityMonitor(intervalMs = 60_000) {
  console.info('[security-monitor] started — checking every', intervalMs / 1000, 'seconds');
  setInterval(() => {
    checkThresholds().catch(e => console.error('[security-monitor] interval error:', e.message));
  }, intervalMs);
  checkThresholds().catch(e => console.error('[security-monitor] startup error:', e.message));
}
