/**
 * CSRF Token Protection Middleware
 *
 * Generates unique CSRF tokens per session, validates on state-changing requests
 * Uses double-submit cookie pattern + SameSite=Strict
 *
 * Flow:
 * 1. Client fetches token via GET /api/csrf-token
 * 2. Client includes token in X-CSRF-Token header on POST/PUT/DELETE
 * 3. Middleware validates token matches session
 */

import crypto from 'crypto';
import logger from './logger.js';

const tokenStore = new Map(); // In production: use Redis for distributed sessions
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const MAX_TOKENS_PER_SESSION = 10; // Prevent token explosion

/**
 * Generate and store CSRF token for this session
 */
export function generateCsrfToken(sessionId) {
  if (!sessionId) {
    throw new Error('Cannot generate CSRF token without session_id');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + TOKEN_EXPIRY;

  // Store token → sessionId mapping
  tokenStore.set(token, { sessionId, expiresAt, consumed: false });

  // Limit tokens per session to prevent memory exhaustion
  const sessionTokens = Array.from(tokenStore.entries())
    .filter(([_, data]) => data.sessionId === sessionId);

  if (sessionTokens.length > MAX_TOKENS_PER_SESSION) {
    // Remove oldest token for this session
    const oldest = sessionTokens.sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
    tokenStore.delete(oldest[0]);
  }

  // Cleanup expired tokens every hour
  if (Math.random() < 0.01) {
    const now = Date.now();
    let removed = 0;
    for (const [t, data] of tokenStore.entries()) {
      if (now > data.expiresAt) {
        tokenStore.delete(t);
        removed++;
      }
    }
    if (removed > 0) {
      logger.debug(`[csrf] Cleaned up ${removed} expired tokens`);
    }
  }

  return token;
}

/**
 * Middleware: Provide CSRF token endpoint
 * GET /api/csrf-token
 */
export function getCsrfToken(req, res) {
  if (!req.user?.session_id) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  const token = generateCsrfToken(req.user.session_id);

  res.json({
    token,
    headerName: 'X-CSRF-Token',
    expiresIn: TOKEN_EXPIRY / 1000
  });
}

/**
 * Middleware: Validate CSRF token on state-changing requests
 * Apply to POST, PUT, DELETE, PATCH routes
 *
 * Usage:
 *   router.post('/api/users/:id/role', authenticate, validateCsrfToken, handler)
 */
export function validateCsrfToken(req, res, next) {
  // Skip CSRF check for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip for internal/service-to-service calls — value must match INTERNAL_API_SECRET
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (internalSecret && req.headers['x-internal-key'] === internalSecret) {
    return next();
  }

  // Must be authenticated
  if (!req.user?.session_id) {
    logger.warn('[csrf] Unauthenticated request to state-changing endpoint', {
      method: req.method,
      path: req.path,
      ip: req.realIp
    });
    return res.status(401).json({
      error: 'Unauthenticated',
      action: 'authenticate'
    });
  }

  const token = req.headers['x-csrf-token'] || req.body?._csrf;

  if (!token) {
    logger.warn('[csrf] Missing CSRF token', {
      method: req.method,
      path: req.path,
      userId: req.user.sub,
      ip: req.realIp
    });
    return res.status(403).json({
      error: 'CSRF token missing',
      action: 'get_csrf_token',
      endpoint: 'GET /api/csrf-token'
    });
  }

  // Lookup token
  const data = tokenStore.get(token);

  if (!data) {
    logger.warn('[csrf] Invalid or unknown CSRF token', {
      method: req.method,
      path: req.path,
      userId: req.user.sub,
      ip: req.realIp,
      tokenLength: token.length
    });
    return res.status(403).json({
      error: 'CSRF token invalid or expired',
      action: 'get_csrf_token'
    });
  }

  // Verify session matches
  if (data.sessionId !== req.user.session_id) {
    logger.error('[csrf] CSRF token session mismatch (potential attack)', {
      method: req.method,
      path: req.path,
      userId: req.user.sub,
      ip: req.realIp,
      tokenSession: data.sessionId,
      requestSession: req.user.session_id
    });
    return res.status(403).json({
      error: 'CSRF token invalid for this session',
      action: 'get_csrf_token'
    });
  }

  // Check expiry
  if (Date.now() > data.expiresAt) {
    tokenStore.delete(token);
    logger.warn('[csrf] Expired CSRF token', {
      method: req.method,
      path: req.path,
      userId: req.user.sub,
      ip: req.realIp
    });
    return res.status(403).json({
      error: 'CSRF token expired',
      action: 'get_csrf_token'
    });
  }

  // Check if already consumed (should not happen with one-time use)
  if (data.consumed) {
    logger.error('[csrf] CSRF token replay attempt (already consumed)', {
      method: req.method,
      path: req.path,
      userId: req.user.sub,
      ip: req.realIp
    });
    tokenStore.delete(token);
    return res.status(403).json({
      error: 'CSRF token already used',
      action: 'get_csrf_token'
    });
  }

  // Token is valid — mark as consumed and delete
  data.consumed = true;
  tokenStore.delete(token);

  // Generate new token for next request
  try {
    const newToken = generateCsrfToken(req.user.session_id);
    res.setHeader('X-New-CSRF-Token', newToken);
  } catch (err) {
    logger.error('[csrf] Failed to generate new token', {
      error: err.message,
      userId: req.user.sub
    });
    // Don't fail the request, just skip the new token
  }

  next();
}

/**
 * Client helper: Include CSRF token in all fetch requests
 *
 * // Get token first
 * const { token } = await fetch('/api/csrf-token').then(r => r.json());
 *
 * // Use in request
 * fetch('/api/users/123/role', {
 *   method: 'POST',
 *   headers: {
 *     'X-CSRF-Token': token,
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify({ role: 'admin' })
 * })
 */
