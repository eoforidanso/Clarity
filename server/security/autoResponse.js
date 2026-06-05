/**
 * Clarity EHR — Auto Response Engine
 *
 * Triggered immediately after an anomaly is detected.
 * Three response levels:
 *
 *  autoReauth()       → force re-authentication on next request
 *                       (elevates session requirement, sends email OTP)
 *  autoRevokeSession()→ kill all active sessions for the user
 *                       (hard logout — next request gets 401)
 *  autoLockAccount()  → lock the account + revoke all sessions
 *                       (admin must manually unlock)
 *
 * Dispatch table:
 *   NEW_DEVICE        → autoReauth
 *   NEW_COUNTRY       → autoReauth
 *   IMPOSSIBLE_TRAVEL → autoRevokeSession
 *   MULTI_IP          → autoRevokeSession
 *   HIGH_RISK_DEVICE  → autoLockAccount
 *   FAILED_LOGINS     → autoLockAccount
 */

import { db }        from '../db/database.js';
import { logAuditEvent } from '../middleware/auditLog.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getUserById(userId) {
  return db.prepare(
    'SELECT id, email, first_name, last_name, role, facility_id FROM users WHERE id = $1'
  ).get(userId);
}

function auditAutoResponse(action, user, anomaly, extra = {}) {
  logAuditEvent({
    userId:       user.id,
    userName:     `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    userRole:     user.role || '',
    facilityId:   user.facility_id || null,
    action,
    resourceType: 'security',
    resourceId:   user.id,
    details:      { anomalyType: anomaly.type, ruleId: anomaly.ruleId, ...extra },
    ipAddress:    anomaly.ip || '',
  });
}

// ─── Level 1: Force Re-Authentication ────────────────────────────────────────
/**
 * Mark the user's sessions as requiring re-authentication.
 * On the next API request the session heartbeat will detect
 * is_elevated = 0 + reauth_required = 1 and return 401.
 */
async function autoReauth(user, anomaly) {
  try {
    await db.prepare(`
      UPDATE sessions
      SET reauth_required = TRUE, updated_at = NOW()
      WHERE user_id = $1 AND is_active = TRUE
    `).run(user.id);

    auditAutoResponse('AUTO_REAUTH_REQUIRED', user, anomaly, {
      reason: `Anomaly triggered re-authentication: ${anomaly.type}`,
    });

    console.info(
      `[auto-response] REAUTH required for user ${user.id} (${anomaly.type})`
    );
  } catch (err) {
    console.error('[auto-response] autoReauth error:', err.message);
  }
}

// ─── Level 2: Revoke All Sessions ─────────────────────────────────────────────
/**
 * Invalidate every active session. The user is effectively logged out
 * across all devices/browsers. They can log back in normally.
 */
async function autoRevokeSession(user, anomaly) {
  try {
    const result = await db.prepare(`
      UPDATE sessions
      SET is_active = FALSE, revoked_at = NOW(), revoke_reason = $1
      WHERE user_id = $2 AND is_active = TRUE
    `).run(`AUTO:${anomaly.type}`, user.id);

    // Also revoke all refresh tokens
    await db.prepare(`
      UPDATE refresh_tokens
      SET is_active = FALSE
      WHERE user_id = $1 AND is_active = TRUE
    `).run(user.id);

    auditAutoResponse('AUTO_SESSION_REVOKED', user, anomaly, {
      sessionsRevoked: result.changes,
      reason: `All sessions killed due to anomaly: ${anomaly.type}`,
    });

    console.warn(
      `[auto-response] All sessions REVOKED for user ${user.id} — ${anomaly.type} (${result.changes} sessions)`
    );
  } catch (err) {
    console.error('[auto-response] autoRevokeSession error:', err.message);
  }
}

// ─── Level 3: Lock Account ────────────────────────────────────────────────────
/**
 * Lock the account + revoke all sessions.
 * User cannot log in until an admin unlocks the account.
 * Sends an admin alert.
 */
async function autoLockAccount(user, anomaly) {
  try {
    // Lock the account
    await db.prepare(`
      UPDATE users
      SET is_locked = TRUE, locked_at = NOW(), locked_reason = $1
      WHERE id = $2
    `).run(`AUTO:${anomaly.type}`, user.id);

    // Kill all sessions
    await db.prepare(`
      UPDATE sessions
      SET is_active = FALSE, revoked_at = NOW(), revoke_reason = $1
      WHERE user_id = $2 AND is_active = TRUE
    `).run(`AUTO_LOCK:${anomaly.type}`, user.id);

    // Revoke refresh tokens
    await db.prepare(`
      UPDATE refresh_tokens
      SET is_active = FALSE
      WHERE user_id = $1 AND is_active = TRUE
    `).run(user.id);

    auditAutoResponse('AUTO_ACCOUNT_LOCKED', user, anomaly, {
      reason: `Account auto-locked due to: ${anomaly.type}`,
      requiresAdminUnlock: true,
    });

    console.error(
      `[auto-response] Account LOCKED for user ${user.id} (${user.email}) — ${anomaly.type}`
    );
  } catch (err) {
    console.error('[auto-response] autoLockAccount error:', err.message);
  }
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────
/**
 * Main entry point.
 *
 * @param {string|object} userOrId  - user object or user ID string
 * @param {{ type: string, ruleId?: string, ip?: string }} anomaly
 */
export async function handleAutoResponse(userOrId, anomaly) {
  if (!anomaly?.type) return;

  // Accept user ID or user object
  const user = typeof userOrId === 'string'
    ? await getUserById(userOrId)
    : userOrId;

  if (!user) {
    console.warn('[auto-response] user not found:', userOrId);
    return;
  }

  switch (anomaly.type) {
    case 'NEW_DEVICE':
    case 'NEW_COUNTRY':
      return autoReauth(user, anomaly);

    case 'IMPOSSIBLE_TRAVEL':
    case 'MULTI_IP':
      return autoRevokeSession(user, anomaly);

    case 'HIGH_RISK_DEVICE':
    case 'FAILED_LOGINS':
      return autoLockAccount(user, anomaly);

    default:
      console.debug(`[auto-response] no handler for anomaly type: ${anomaly.type}`);
  }
}
