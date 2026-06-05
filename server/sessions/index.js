import db from '../db/database.js';

/**
 * Revoke a single session by ID.
 * Also kills any refresh tokens tied to it.
 */
export async function revokeSessionById(sessionId, { reason = 'revoked' } = {}) {
  await db.prepare(`
    UPDATE sessions
    SET is_active = 0, revoked_at = NOW(), revoke_reason = $1
    WHERE id = $2
  `).run(reason, sessionId);

  await db.prepare(`
    UPDATE refresh_tokens
    SET is_active = 0
    WHERE session_id = $1
  `).run(sessionId);
}

/**
 * Revoke all active sessions for a user.
 */
export async function revokeAllSessions(userId, { reason = 'revoked' } = {}) {
  await db.prepare(`
    UPDATE sessions
    SET is_active = 0, revoked_at = NOW(), revoke_reason = $1
    WHERE user_id = $2 AND is_active = 1
  `).run(reason, userId);

  await db.prepare(`
    UPDATE refresh_tokens
    SET is_active = 0
    WHERE user_id = $1 AND is_active = 1
  `).run(userId);
}
