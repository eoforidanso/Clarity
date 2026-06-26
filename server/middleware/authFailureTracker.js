/**
 * Auth Failure Anomaly Tracker
 *
 * Intercepts 401/403 responses and counts failures per IP in a sliding window.
 * When an IP exceeds the threshold it:
 *   1. Records an anomaly via recordAnomaly()
 *   2. Adds the IP to a temporary ban list (in-memory, survives only until restart)
 *
 * Thresholds (configurable via env):
 *   AUTH_FAIL_WINDOW_MS      default 300_000  (5 min)
 *   AUTH_FAIL_THRESHOLD      default 20       (failures before anomaly)
 *   AUTH_FAIL_BAN_THRESHOLD  default 40       (failures before temp ban)
 *   AUTH_FAIL_BAN_DURATION_MS default 900_000 (15 min ban)
 */

import { recordAnomaly } from '../security/anomalyEngine.js';
import logger from './logger.js';

const WINDOW_MS       = parseInt(process.env.AUTH_FAIL_WINDOW_MS       || '300000',  10);
const THRESHOLD       = parseInt(process.env.AUTH_FAIL_THRESHOLD        || '20',      10);
const BAN_THRESHOLD   = parseInt(process.env.AUTH_FAIL_BAN_THRESHOLD    || '40',      10);
const BAN_DURATION_MS = parseInt(process.env.AUTH_FAIL_BAN_DURATION_MS  || '900000',  10);

// ip → [timestamp, timestamp, ...]
const failures = new Map();
// ip → ban-expires timestamp
const banned   = new Map();

// Prune stale entries every minute
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [ip, times] of failures) {
    const fresh = times.filter(t => t > cutoff);
    if (fresh.length === 0) failures.delete(ip);
    else failures.set(ip, fresh);
  }
  const now = Date.now();
  for (const [ip, exp] of banned) {
    if (now > exp) banned.delete(ip);
  }
}, 60_000);

export function isIpBanned(ip) {
  const exp = banned.get(ip);
  if (!exp) return false;
  if (Date.now() > exp) { banned.delete(ip); return false; }
  return true;
}

/**
 * Express middleware — place AFTER authenticate on all protected routes so
 * req.realIp is available.  Tracks 401/403 responses per IP.
 */
export function authFailureTracker(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    const status = res.statusCode;

    if (status === 401 || status === 403) {
      const ip    = req.realIp || req.ip || 'unknown';
      const now   = Date.now();
      const cutoff = now - WINDOW_MS;

      // Append and prune window
      const times = (failures.get(ip) || []).filter(t => t > cutoff);
      times.push(now);
      failures.set(ip, times);
      const count = times.length;

      if (count === THRESHOLD) {
        logger.warn('[authFailureTracker] anomaly threshold reached', { ip, count, path: req.originalUrl });
        recordAnomaly(req.user || {}, {
          type:      'repeated_auth_failure',
          severity:  'high',
          ip,
          user_agent: req.get('User-Agent') || '',
          details:   { count, windowMs: WINDOW_MS, path: req.originalUrl, status },
        }).catch(() => {});
      }

      if (count >= BAN_THRESHOLD && !banned.has(ip)) {
        logger.error('[authFailureTracker] temp-banning IP', { ip, count });
        banned.set(ip, now + BAN_DURATION_MS);
        recordAnomaly(req.user || {}, {
          type:      'ip_temp_banned',
          severity:  'critical',
          ip,
          user_agent: req.get('User-Agent') || '',
          details:   { count, banDurationMs: BAN_DURATION_MS, path: req.originalUrl },
        }).catch(() => {});
      }
    }

    return originalJson(body);
  };

  next();
}

/**
 * Enforcement middleware — block requests from banned IPs before they hit auth.
 * Place early in the middleware chain, after IP extraction.
 */
export function enforceBanList(req, res, next) {
  const ip = req.realIp || req.ip || '';
  if (ip && isIpBanned(ip)) {
    logger.warn('[authFailureTracker] blocking banned IP', { ip, path: req.originalUrl });
    return res.status(429).json({ error: 'Too many failed attempts. Try again later.' });
  }
  next();
}
