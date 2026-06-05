import db from '../db/database.js';
import { revokeSessionById } from '../sessions/index.js';
import { sendSecurityAlertEmail } from '../mail/security.js';

function severityOf(anomaly) {
  switch (anomaly.type) {
    case 'FAILED_LOGINS':
      return anomaly.failed_count >= 10 ? 'high' : 'medium';

    case 'MULTI_IP':
    case 'IMPOSSIBLE_TRAVEL':
      return 'high';

    case 'NEW_DEVICE':
    case 'NEW_COUNTRY':
      return 'medium';

    case 'HIGH_RISK_DEVICE':
      return 'high';

    default:
      return 'low';
  }
}

async function autoReauth(user, anomaly) {
  await db.prepare(
    `UPDATE sessions SET reauth_required = TRUE WHERE id = $1 AND user_id = $2`
  ).run(anomaly.session_id, user.id);
}

async function autoRevokeSession(user, anomaly) {
  if (anomaly.session_id) {
    await revokeSessionById(anomaly.session_id, { reason: 'auto_response_anomaly' });
  }
}

async function autoLockAccount(user, anomaly) {
  await db.prepare(
    `UPDATE users SET is_locked = TRUE, locked_reason = $1, locked_at = NOW() WHERE id = $2`
  ).run('auto_response_anomaly', user.id);

  await sendSecurityAlertEmail({ user, anomaly, action: 'AUTO_LOCK_ACCOUNT' });
}

export async function handleAutoResponse(user, anomaly) {
  const severity = severityOf(anomaly);

  // LOW severity → no UX impact
  if (severity === 'low') return;

  // MEDIUM severity → soft reauth only
  if (severity === 'medium') {
    return autoReauth(user, anomaly);
  }

  // HIGH severity → revoke or lock
  if (severity === 'high') {
    if (anomaly.type === 'FAILED_LOGINS') {
      return autoLockAccount(user, anomaly);
    }
    return autoRevokeSession(user, anomaly);
  }
}
