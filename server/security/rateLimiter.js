/**
 * Rate Limiter: Per-IP, per-username rate limits backed by PostgreSQL.
 *
 * Persists across process restarts (PM2 restarts no longer reset counters).
 * Falls back to fail-open if DB is unavailable so auth is never blocked by
 * infrastructure issues.
 */

import db from '../db/database.js';

const LIMITS = {
  loginIp:       { maxPerMinute: 5,  maxPerHour: 50 },
  refreshIp:     { maxPerMinute: 10, maxPerHour: 200 },
  reauthIp:      { maxPerMinute: 3,  maxPerHour: 30 },
  mfaIp:         { maxPerMinute: 5,  maxPerHour: 20 },
  loginUsername: { maxPerHour: 20 },
  reauthUsername:{ maxPerHour: 10 },
};

// Prune rows older than 25h every 30 minutes (keeps table small)
setInterval(async () => {
  try {
    await db.prepare(`DELETE FROM rate_limit_log WHERE attempted_at < NOW() - INTERVAL '25 hours'`).run();
  } catch { /* non-fatal */ }
}, 30 * 60 * 1000);

/**
 * Check and record one attempt. Returns { allowed, remaining, resetAt }.
 * Fails open on DB error.
 */
async function checkLimit(key, maxPerMinute, maxPerHour) {
  try {
    const [minRow, hrRow] = await Promise.all([
      maxPerMinute
        ? db.prepare(`SELECT COUNT(*) AS n FROM rate_limit_log WHERE key = ? AND attempted_at > NOW() - INTERVAL '1 minute'`).get(key)
        : Promise.resolve({ n: 0 }),
      maxPerHour
        ? db.prepare(`SELECT COUNT(*) AS n FROM rate_limit_log WHERE key = ? AND attempted_at > NOW() - INTERVAL '1 hour'`).get(key)
        : Promise.resolve({ n: 0 }),
    ]);

    const recentMinute = parseInt(minRow?.n ?? 0, 10);
    const recentHour   = parseInt(hrRow?.n  ?? 0, 10);

    const minuteExceeded = maxPerMinute && recentMinute >= maxPerMinute;
    const hourExceeded   = maxPerHour   && recentHour   >= maxPerHour;

    if (minuteExceeded || hourExceeded) {
      const resetAt = minuteExceeded
        ? Date.now() + 60 * 1000
        : Date.now() + 60 * 60 * 1000;
      return { allowed: false, remaining: 0, resetAt };
    }

    // Record this attempt
    await db.prepare(`INSERT INTO rate_limit_log (key, attempted_at) VALUES (?, NOW())`).run(key);

    return {
      allowed: true,
      remaining: Math.min(
        maxPerMinute ? maxPerMinute - recentMinute - 1 : Infinity,
        maxPerHour   ? maxPerHour   - recentHour   - 1 : Infinity,
      ),
      resetAt: Date.now() + 60 * 1000,
    };
  } catch (err) {
    console.warn('[rate-limit] DB error, failing open:', err.message);
    return { allowed: true, remaining: -1, resetAt: 0 };
  }
}

// ── Exported middleware ────────────────────────────────────────────────────────

export async function rateLimitLoginByIp(req, res, next) {
  const ip = req.ip || 'unknown';
  const limit = await checkLimit(`login:ip:${ip}`, LIMITS.loginIp.maxPerMinute, LIMITS.loginIp.maxPerHour);
  if (!limit.allowed) {
    console.warn(`[rate-limit] Login IP blocked: ${ip}`);
    return res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
      retryAfter: Math.ceil((limit.resetAt - Date.now()) / 1000),
    });
  }
  req.rateLimit = { ip: limit };
  next();
}

export async function rateLimitLoginByUsername(req, res, next) {
  const username = req.body?.username || '';
  if (!username) return next();
  const limit = await checkLimit(`login:user:${username.toLowerCase()}`, null, LIMITS.loginUsername.maxPerHour);
  if (!limit.allowed) {
    console.warn(`[rate-limit] Login username blocked: ${username}`);
    return res.status(429).json({
      error: 'Too many login attempts for this account. Please try again later.',
      retryAfter: Math.ceil((limit.resetAt - Date.now()) / 1000),
    });
  }
  req.rateLimit = { ...(req.rateLimit || {}), username: limit };
  next();
}

export async function rateLimitReauth(req, res, next) {
  const ip = req.ip || 'unknown';
  const limit = await checkLimit(`reauth:ip:${ip}`, LIMITS.reauthIp.maxPerMinute, LIMITS.reauthIp.maxPerHour);
  if (!limit.allowed) {
    console.warn(`[rate-limit] Reauth IP blocked: ${ip}`);
    return res.status(429).json({
      error: 'Too many re-authentication attempts. Please try again later.',
      retryAfter: Math.ceil((limit.resetAt - Date.now()) / 1000),
    });
  }
  req.rateLimit = { ip: limit };
  next();
}

export async function rateLimitMfaByIp(req, res, next) {
  const ip = req.ip || 'unknown';
  const limit = await checkLimit(`mfa:ip:${ip}`, LIMITS.mfaIp.maxPerMinute, LIMITS.mfaIp.maxPerHour);
  if (!limit.allowed) {
    console.warn(`[rate-limit] MFA verify IP blocked: ${ip}`);
    return res.status(429).json({
      error: 'Too many verification attempts. Please try again later.',
      retryAfter: Math.ceil((limit.resetAt - Date.now()) / 1000),
    });
  }
  req.rateLimit = { ...(req.rateLimit || {}), mfa: limit };
  next();
}

export async function rateLimitRefreshByIp(req, res, next) {
  const ip = req.ip || 'unknown';
  const limit = await checkLimit(`refresh:ip:${ip}`, LIMITS.refreshIp.maxPerMinute, LIMITS.refreshIp.maxPerHour);
  if (!limit.allowed) {
    console.warn(`[rate-limit] Refresh IP blocked: ${ip}`);
    return res.status(429).json({
      error: 'Too many token refresh attempts. Please try again later.',
      retryAfter: Math.ceil((limit.resetAt - Date.now()) / 1000),
    });
  }
  req.rateLimit = { ...(req.rateLimit || {}), refresh: limit };
  next();
}

// ── Kept for audit/lockout logic (unchanged) ──────────────────────────────────

export async function trackLoginFailure(db, userId, username, ip, reason) {
  try {
    await db.prepare(`
      INSERT INTO audit_logs (action, resource_type, user_id, username, ip_address, details, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `).run('LOGIN_FAILED', 'auth', userId || null, username, ip, JSON.stringify({ reason }));
  } catch (e) {
    console.warn('[audit]', e.message);
  }
}

export async function checkAccountLockout(db, username) {
  try {
    const result = await db.prepare(`
      SELECT COUNT(*) as failure_count
      FROM audit_logs
      WHERE action = 'LOGIN_FAILED'
        AND username = $1
        AND created_at > NOW() - INTERVAL '15 minutes'
    `).get(username);

    const failureCount = result?.failure_count || 0;
    return {
      shouldLock: failureCount >= 5,
      reason: `Too many failed login attempts (${failureCount})`,
      failureCount,
    };
  } catch (e) {
    console.warn('[lockout-check]', e.message);
    return { shouldLock: false, failureCount: 0 };
  }
}

export async function lockAccount(db, userId, reason) {
  try {
    await db.prepare(`
      UPDATE users
      SET is_locked = true, locked_at = NOW(), locked_reason = $1, updated_at = NOW()
      WHERE id = $2
    `).run(reason, userId);
    console.warn(`[lockout] Account locked: ${userId} - ${reason}`);
  } catch (e) {
    console.warn('[lockout-update]', e.message);
  }
}

export async function unlockAccount(db, userId) {
  try {
    await db.prepare(`
      UPDATE users
      SET is_locked = false, locked_at = NULL, locked_reason = NULL, updated_at = NOW()
      WHERE id = $1
    `).run(userId);
    console.log(`[lockout] Account unlocked: ${userId}`);
  } catch (e) {
    console.warn('[lockout-unlock]', e.message);
  }
}
