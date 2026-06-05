import config from '../config.js';
import db from '../db/database.js';
import { revokeSessionById } from '../sessions/index.js';
import { sendSecurityAlertEmail } from '../mail/security.js';

const { AUTO_RESPONSE_ENABLED, AUTO_RESPONSE_MODE } = config;

function severityOf(anomaly) {
  switch (anomaly.type) {
    case 'FAILED_LOGINS':
      return anomaly.failed_count >= 10 ? 'high' : 'medium';
    case 'MULTI_IP':
    case 'IMPOSSIBLE_TRAVEL':
    case 'HIGH_RISK_DEVICE':
      return 'high';
    case 'NEW_DEVICE':
    case 'NEW_COUNTRY':
      return 'medium';
    default:
      return 'low';
  }
}

async function autoReauth(user, anomaly) {
  await db.prepare(
    `UPDATE sessions SET reauth_required = 1 WHERE id = $1 AND user_id = $2`
  ).run(anomaly.session_id, user.id);
}

async function autoRevokeSession(user, anomaly) {
  if (anomaly.session_id) {
    await revokeSessionById(anomaly.session_id, { reason: 'auto_response_anomaly' });
  }
}

async function autoLockAccount(user, anomaly) {
  await db.prepare(
    `UPDATE users SET is_locked = 1, locked_reason = $1, locked_at = NOW() WHERE id = $2`
  ).run('auto_response_anomaly', user.id);

  await sendSecurityAlertEmail({ user, anomaly, action: 'AUTO_LOCK_ACCOUNT' });
}

export async function handleAutoResponse(user, anomaly) {
  const severity = severityOf(anomaly);

  // Disabled → do nothing
  if (!AUTO_RESPONSE_ENABLED) return;

  // Shadow mode → log only, no user impact
  if (AUTO_RESPONSE_MODE === 'shadow') {
    console.log('[AUTO-RESPONSE:SHADOW]', { user: user.id, anomaly: anomaly.type, severity });
    return;
  }

  // Enforce mode
  if (severity === 'low') return;

  if (severity === 'medium') {
    return autoReauth(user, anomaly);
  }

  if (severity === 'high') {
    if (anomaly.type === 'FAILED_LOGINS') {
      return autoLockAccount(user, anomaly);
    }
    return autoRevokeSession(user, anomaly);
  }
}
