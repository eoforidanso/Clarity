/**
 * Security alert emails via Resend.
 * Fires for AUTO_LOCK_ACCOUNT and other critical security events.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM          = process.env.RESEND_FROM || 'Clarity EHR Security <security@clarity-ehr.com>';
const ADMIN_EMAIL   = process.env.ADMIN_EMAIL  || process.env.SECURITY_ALERT_EMAIL;

export async function sendSecurityAlertEmail({ user, anomaly, action }) {
  if (!RESEND_API_KEY) {
    console.warn('[mail/security] RESEND_API_KEY not set — skipping security alert email');
    return;
  }
  if (!ADMIN_EMAIL) {
    console.warn('[mail/security] ADMIN_EMAIL not set — skipping security alert email');
    return;
  }

  const actionLabel = {
    AUTO_LOCK_ACCOUNT:   '🔒 Account Auto-Locked',
    AUTO_REVOKE_SESSION: '⚠️ Session Auto-Revoked',
    AUTO_REAUTH:         'ℹ️ Re-Authentication Required',
  }[action] || action;

  const body = {
    from:    FROM,
    to:      [ADMIN_EMAIL],
    subject: `[Clarity EHR] ${actionLabel} — ${user.first_name} ${user.last_name}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#dc2626">⚠️ Security Auto-Response Triggered</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#6b7280;width:140px">Action</td><td><strong>${actionLabel}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">User</td><td>${user.first_name} ${user.last_name} (${user.email || user.id})</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Role</td><td>${user.role || '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Anomaly Type</td><td>${anomaly.type}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Severity</td><td>${anomaly.severity || '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">IP Address</td><td>${anomaly.ip || '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Time</td><td>${new Date().toUTCString()}</td></tr>
        </table>
        <p style="margin-top:20px;font-size:13px;color:#475569">
          Log in to the <a href="https://app.clarity-ehr.com/admin-toolkit">Admin Toolkit</a>
          to review and unlock the account if this was legitimate activity.
        </p>
        <p style="font-size:11px;color:#94a3b8">Clarity EHR — automated security notification</p>
      </div>
    `,
  };

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend ${res.status}: ${text}`);
  }
}
