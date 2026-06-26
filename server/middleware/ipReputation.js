/**
 * IP Reputation Middleware
 *
 * Two-layer check:
 *   1. Internal ban list (from authFailureTracker) — always active
 *   2. AbuseIPDB lookup — active only when ABUSEIPDB_API_KEY is set
 *
 * AbuseIPDB free tier: 1,000 checks/day.
 * Results cached for CACHE_TTL_MS (default 1 hour) to avoid burning quota.
 *
 * Skips private/loopback IPs to avoid false positives in dev/staging.
 *
 * Env vars:
 *   ABUSEIPDB_API_KEY          — enables cloud reputation checks
 *   ABUSEIPDB_BLOCK_SCORE      — abuse confidence % to block (default 80)
 *   IP_REP_CACHE_TTL_MS        — cache TTL (default 3_600_000)
 */

import { isIpBanned } from './authFailureTracker.js';
import logger from './logger.js';

const BLOCK_SCORE   = parseInt(process.env.ABUSEIPDB_BLOCK_SCORE   || '80',       10);
const CACHE_TTL_MS  = parseInt(process.env.IP_REP_CACHE_TTL_MS     || '3600000',  10);
const API_KEY       = process.env.ABUSEIPDB_API_KEY || '';

// ip → { score, blocked, cachedAt }
const cache = new Map();

const PRIVATE_IP_RE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|::1$|fc|fd)/;

function isPrivate(ip) {
  return !ip || PRIVATE_IP_RE.test(ip);
}

async function fetchAbuseScore(ip) {
  if (!API_KEY) return null;

  const cached = cache.get(ip);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) return cached;

  try {
    const url = `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=30&verbose`;
    const res = await fetch(url, {
      headers: { Key: API_KEY, Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      logger.warn('[ipReputation] AbuseIPDB API error', { status: res.status, ip });
      return null;
    }

    const data = await res.json();
    const score = data?.data?.abuseConfidenceScore ?? 0;
    const entry = { score, blocked: score >= BLOCK_SCORE, cachedAt: Date.now() };
    cache.set(ip, entry);

    if (entry.blocked) {
      logger.warn('[ipReputation] AbuseIPDB blocked IP', { ip, score });
    }

    return entry;
  } catch (err) {
    logger.warn('[ipReputation] AbuseIPDB lookup failed', { ip, error: err.message });
    return null; // fail open — never block on lookup error
  }
}

// Prune expired cache entries every 30 min
setInterval(() => {
  const cutoff = Date.now() - CACHE_TTL_MS;
  for (const [ip, entry] of cache) {
    if (entry.cachedAt < cutoff) cache.delete(ip);
  }
}, 30 * 60 * 1000);

/**
 * Express middleware — run early in the stack, before authenticate.
 * Blocks requests from IPs on the internal ban list or flagged by AbuseIPDB.
 */
export async function ipReputationCheck(req, res, next) {
  const ip = req.realIp || req.ip || '';

  // Skip private / loopback IPs
  if (isPrivate(ip)) return next();

  // Layer 1: internal ban list (authFailureTracker)
  if (isIpBanned(ip)) {
    logger.warn('[ipReputation] blocked — internal ban', { ip, path: req.originalUrl });
    return res.status(429).json({ error: 'Request blocked. Too many failed attempts.' });
  }

  // Layer 2: AbuseIPDB (only if key is set, non-blocking if slow)
  if (API_KEY) {
    try {
      const rep = await fetchAbuseScore(ip);
      if (rep?.blocked) {
        logger.warn('[ipReputation] blocked — AbuseIPDB', { ip, score: rep.score });
        return res.status(403).json({ error: 'Request blocked due to IP reputation.' });
      }
    } catch {
      // fail open — never block legitimate traffic on API errors
    }
  }

  next();
}
