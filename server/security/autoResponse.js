import db           from '../db/database.js';
import { logAuditEvent } from '../middleware/auditLog.js';

// ── helpers ───────────────────────────────────────────────────────────────────

async function createIncident(user, anomaly, actionTaken) {
  try {
    await db.prepare(`
      INSERT INTO incidents
        (user_id, facility_id, type, severity, action_taken, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `).run(
      user.id,
      user.facility_id || null,
      anomaly.type,
      anomaly.severity || 'medium',
      actionTaken,
      JSON.stringify(anomaly)
    );
  } catch (err) {
    // incidents table may not exist yet — degrade gracefully
    console.warn('[auto-response] createIncident:', err.message);
  }
}

async function logAudit(user, anomaly, action) {
  await logAuditEvent({
    userId:       user.id,
    userName:     `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    userRole:     user.role || '',
    facilityId:   user.facility_id || null,
    action,
    resourceType: 'security_anomaly',
    resourceId:   anomaly.id || '',
    details:      anomaly,
    ipAddress:    anomaly.ip || '',
  });
}

export async function revokeSessionById(sessionId, { reason = 'auto_response_anomaly' } = {}) {
  await db.prepare(`
    UPDATE sessions
    SET is_active = FALSE, revoked_at = NOW(), revoke_reason = $1
    WHERE id = $2
  `).run(reason, sessionId);

  // Also kill any refresh tokens tied to this session
  await db.prepare(`
    UPDATE refresh_tokens
    SET is_active = FALSE
    WHERE session_id = $1
  `).run(sessionId);
}

// ── response actions ──────────────────────────────────────────────────────────

async function autoReauth(user, anomaly) {
  await db.prepare(`
    UPDATE sessions
    SET reauth_required = TRUE
    WHERE id = $1 AND user_id = $2
  `).run(anomaly.session_id, user.id);

  await createIncident(user, anomaly, 'AUTO_REAUTH');
  await logAudit(user, anomaly, 'AUTO_REAUTH');
  console.info(`[auto-response] REAUTH required — user ${user.id} (${anomaly.type})`);
}

async function autoRevokeSession(user, anomaly) {
  if (anomaly.session_id) {
    await revokeSessionById(anomaly.session_id, { reason: 'auto_response_anomaly' });
  }

  await createIncident(user, anomaly, 'AUTO_REVOKE_SESSION');
  await logAudit(user, anomaly, 'AUTO_REVOKE_SESSION');
  console.warn(`[auto-response] SESSION revoked — user ${user.id} (${anomaly.type})`);
}

async function autoLockAccount(user, anomaly) {
  await db.prepare(`
    UPDATE users
    SET is_locked = TRUE, locked_reason = $1, locked_at = NOW()
    WHERE id = $2
  `).run('auto_response_anomaly', user.id);

  // Revoke all sessions
  await db.prepare(`
    UPDATE sessions
    SET is_active = FALSE, revoked_at = NOW(), revoke_reason = $1
    WHERE user_id = $2 AND is_active = TRUE
  `).run('AUTO_LOCK', user.id);

  await db.prepare(`
    UPDATE refresh_tokens SET is_active = FALSE WHERE user_id = $1
  `).run(user.id);

  await createIncident(user, anomaly, 'AUTO_LOCK_ACCOUNT');
  await logAudit(user, anomaly, 'AUTO_LOCK_ACCOUNT');

  // Notify admin
  try {
    const { sendSecurityAlertEmail } = await import('../mail/security.js');
    await sendSecurityAlertEmail({ user, anomaly, action: 'AUTO_LOCK_ACCOUNT' });
  } catch {
    // Mail not configured — skip silently
  }

  console.error(`[auto-response] ACCOUNT LOCKED — user ${user.id} (${anomaly.type})`);
}

// ── threshold guards ──────────────────────────────────────────────────────────

function shouldLockForFailedLogins(anomaly) {
  return (anomaly.failed_count >= 10) && (anomaly.window_minutes <= 10);
}

// ── dispatch ──────────────────────────────────────────────────────────────────

export async function handleAutoResponse(user, anomaly) {
  // Only act on medium / high severity
  if (!['medium', 'high'].includes((anomaly.severity || 'medium').toLowerCase())) return;

  switch (anomaly.type) {
    case 'NEW_DEVICE':
    case 'NEW_COUNTRY':
      return autoReauth(user, anomaly);

    case 'IMPOSSIBLE_TRAVEL':
    case 'MULTI_IP':
    case 'HIGH_RISK_DEVICE':
      return autoRevokeSession(user, anomaly);

    case 'FAILED_LOGINS':
      if (shouldLockForFailedLogins(anomaly)) {
        return autoLockAccount(user, anomaly);
      }
      return;

    default:
      return;
  }
}

export { autoReauth, autoRevokeSession, autoLockAccount };
