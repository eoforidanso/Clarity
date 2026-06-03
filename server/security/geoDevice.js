/**
 * Clarity EHR — Geographic Anomaly + Device Fingerprinting
 *
 * Flow:
 *   1. fingerprintDevice(req)  → 64-char SHA-256 hex
 *   2. checkLoginAnomaly()     → upserts user_devices, fires R09/R10/R11 anomalies
 *   3. Returns { dbDeviceId }  → stored as sessions.device_id FK
 *
 * Anomalies:
 *   R09_NEW_DEVICE        MEDIUM — first login from unknown device
 *   R09_SUSPICIOUS_DEVICE HIGH   — re-login from previously flagged device
 *   R10_GEO_ANOMALY       HIGH   — login from new country
 *   R11_SUSPICIOUS_LOGIN  CRITICAL — new device + new country + low IP reputation + privileged user
 *                                    → auto-lock: kill sessions, mark device suspicious, email admin
 */

import crypto from 'crypto';
import { db } from '../db/database.js';
import { logAudit } from '../db/softDelete.js';
import { insertAnomaly } from './anomalyDetector.js';

// ── user_locations bootstrap (user_devices created via migration) ─────────────
export async function ensureGeoTables() {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS user_locations (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      ip           TEXT NOT NULL,
      country      TEXT    DEFAULT '',
      country_code TEXT    DEFAULT '',
      city         TEXT    DEFAULT '',
      lat          REAL,
      lon          REAL,
      isp          TEXT    DEFAULT '',
      first_seen   TIMESTAMPTZ DEFAULT NOW(),
      last_seen    TIMESTAMPTZ DEFAULT NOW(),
      login_count  INTEGER DEFAULT 1
    )
  `).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_user_loc_user ON user_locations(user_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_user_loc_ip   ON user_locations(ip)`).run();
}

// ── IP Geolocation ────────────────────────────────────────────────────────────
const geoCache = new Map();

export async function geolocate(ip) {
  if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { country: 'Local', countryCode: 'LO', city: 'localhost', lat: 0, lon: 0, isp: 'Local', proxy: false, hosting: false };
  }
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.ts < 3_600_000) return cached.data;
  try {
    // Request proxy + hosting fields for reputation scoring
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,lat,lon,isp,proxy,hosting`,
      { signal: AbortSignal.timeout(3000) }
    );
    const d = await res.json();
    if (d.status === 'success') {
      const data = {
        country: d.country, countryCode: d.countryCode, city: d.city,
        lat: d.lat, lon: d.lon, isp: d.isp,
        proxy: !!d.proxy, hosting: !!d.hosting,
      };
      geoCache.set(ip, { ts: Date.now(), data });
      return data;
    }
  } catch { /* offline / timeout */ }
  return { country: 'Unknown', countryCode: '??', city: '', lat: 0, lon: 0, isp: '', proxy: false, hosting: false };
}

// ── IP Reputation Score (0–100, lower = more suspicious) ─────────────────────
// Sources:
//   1. Cloudflare CF-Threat-Score header (0–100, CF's own bot/threat score)
//   2. ip-api.com proxy + hosting flags
//   3. ISP name heuristics
//
// Final score: weighted combination, clamped to [0, 100]
export function scoreIpReputation(geo, cfThreatScore = 0) {
  let score = 100;

  // ── Cloudflare threat score (most authoritative signal) ──────────────────
  // CF scores 0 = clean, 100 = high threat. We invert and weight heavily.
  // CF score ≥ 50 → very suspicious; CF score 1–49 → mildly suspicious
  if (cfThreatScore >= 50) score -= 50;
  else if (cfThreatScore >= 10) score -= 25;
  else if (cfThreatScore >= 1)  score -= 10;

  // ── ip-api.com signals ────────────────────────────────────────────────────
  if (geo.proxy)   score -= 30; // known proxy/VPN
  if (geo.hosting) score -= 25; // datacenter/hosting IP

  // ── ISP heuristics ────────────────────────────────────────────────────────
  const isp = (geo.isp || '').toLowerCase();
  const suspiciousIsps = [
    'tor ', 'nordvpn', 'expressvpn', 'mullvad', 'privateinternetaccess',
    'surfshark', 'protonvpn', 'cyberghost', 'ipvanish', 'hide.me',
    'digitalocean', 'linode', 'vultr', 'hetzner', 'ovh', 'amazon aws',
    'google cloud', 'microsoft azure', 'cloudflare', 'leaseweb',
    'serverius', 'choopa', 'as-choopa', 'combahton',
  ];
  if (suspiciousIsps.some(s => isp.includes(s))) score -= 20;

  // Unknown country
  if (geo.countryCode === '??') score -= 15;

  return Math.max(0, score);
}

// ── Device fingerprint ────────────────────────────────────────────────────────
export function fingerprintDevice(req) {
  const ua       = req.headers['user-agent']         || '';
  const lang     = req.headers['accept-language']    || '';
  const platform = req.headers['sec-ch-ua-platform'] || '';
  const mobile   = req.headers['sec-ch-ua-mobile']   || '';

  const fingerprint = crypto.createHash('sha256').update([ua, lang, platform, mobile].join('|')).digest('hex');

  const osLabel =
    ua.includes('iPhone')   ? 'iPhone'  :
    ua.includes('Android')  ? 'Android' :
    ua.includes('Mac')      ? 'macOS'   :
    ua.includes('Windows')  ? 'Windows' :
    ua.includes('Linux')    ? 'Linux'   : 'Unknown';

  const browserLabel =
    ua.includes('Edg/')     ? 'Edge'    :
    ua.includes('Chrome/')  ? 'Chrome'  :
    ua.includes('Firefox/') ? 'Firefox' :
    ua.includes('Safari/')  ? 'Safari'  : 'Browser';

  return { fingerprint, platform: osLabel, browser: browserLabel, userAgent: ua.slice(0, 512) };
}

// ── Main check — called after successful login ────────────────────────────────
// Returns { dbDeviceId, geo, fingerprint, platform, browser, isNewDevice, cfThreatScore }
export async function checkLoginAnomaly(userId, userName, ip, req) {
  await ensureGeoTables();

  const { fingerprint, platform, browser, userAgent } = fingerprintDevice(req);
  const geo = await geolocate(ip);

  // CF-Threat-Score: 0 = clean, 100 = high threat (passed by nginx from Cloudflare)
  const cfThreatScore = parseInt(req.headers['cf-threat-score'] || '0', 10);

  // ── 1. Check if device already exists ────────────────────────────────────
  const existing = await db.prepare(
    `SELECT id, trust_state FROM user_devices WHERE user_id = $1 AND fingerprint = $2`
  ).get(userId, fingerprint);

  let dbDeviceId;

  if (!existing) {
    // ── 2. Insert new device ────────────────────────────────────────────────
    const existingCount = (await db.prepare(
      `SELECT COUNT(*) AS c FROM user_devices WHERE user_id = $1`
    ).get(userId))?.c || 0;

    const trustState = Number(existingCount) > 0 ? 'new' : 'trusted';

    const inserted = await db.prepare(`
      INSERT INTO user_devices (user_id, fingerprint, user_agent, platform, browser, ip, country, trust_state)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `).get(userId, fingerprint, userAgent, platform, browser, ip, geo.countryCode, trustState);

    dbDeviceId = inserted?.id;

    // ── 3. Trigger anomaly R09 if not first device ───────────────────────
    if (Number(existingCount) > 0) {
      logAudit({
        actorId: userId, actorName: userName,
        action: 'NEW_DEVICE_LOGIN', targetType: 'session',
        details: { fingerprint, platform, browser, ip, country: geo.country },
        ip,
      });
      await insertAnomaly({
        ruleId: 'R09_NEW_DEVICE', severity: 'MEDIUM',
        title: `New Device: ${userName}`,
        description: `${userName} signed in from an unrecognised ${browser} on ${platform} (${ip} · ${geo.city}, ${geo.country}).`,
        actorId: userId, actorName: userName, ip,
        eventCount: 1, windowMin: 0,
        rawEvents: [{ fingerprint, platform, browser, ip, geo }],
      });
    }

  } else {
    dbDeviceId = existing.id;

    // ── 4. Update last_seen + metadata ──────────────────────────────────────
    await db.prepare(
      `UPDATE user_devices SET last_seen = NOW(), ip = $2, country = $3 WHERE id = $1`
    ).run(dbDeviceId, ip, geo.countryCode);

    // Re-login from suspicious device → HIGH anomaly
    if (existing.trust_state === 'suspicious') {
      await insertAnomaly({
        ruleId: 'R09_SUSPICIOUS_DEVICE', severity: 'HIGH',
        title: `Suspicious Device Re-login: ${userName}`,
        description: `${userName} signed in again from a device previously flagged suspicious (${browser} on ${platform}).`,
        actorId: userId, actorName: userName, ip,
        eventCount: 1, windowMin: 0,
        rawEvents: [{ fingerprint, platform, browser, ip, geo }],
      });
    }
  }

  // ── Geographic anomaly check ──────────────────────────────────────────────
  const lastLocation = await db.prepare(`
    SELECT country_code, country, city FROM user_locations
    WHERE user_id = $1 ORDER BY last_seen DESC LIMIT 1
  `).get(userId);

  if (!lastLocation) {
    await db.prepare(`
      INSERT INTO user_locations (id, user_id, ip, country, country_code, city, lat, lon, isp)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `).run(crypto.randomUUID(), userId, ip, geo.country, geo.countryCode, geo.city, geo.lat, geo.lon, geo.isp);

  } else if (lastLocation.country_code !== geo.countryCode && geo.countryCode !== '??' && geo.countryCode !== 'LO') {
    logAudit({
      actorId: userId, actorName: userName, action: 'GEO_ANOMALY', targetType: 'session',
      details: { previousCountry: lastLocation.country, previousCity: lastLocation.city, newCountry: geo.country, newCity: geo.city, ip },
      ip,
    });
    await insertAnomaly({
      ruleId: 'R10_GEO_ANOMALY', severity: 'HIGH',
      title: `Geographic Anomaly: ${userName}`,
      description: `${userName} signed in from ${geo.city}, ${geo.country} — previously from ${lastLocation.city || lastLocation.country}. Possible account compromise.`,
      actorId: userId, actorName: userName, ip,
      eventCount: 1, windowMin: 0,
      rawEvents: [{ previous: lastLocation, current: geo }],
    });
    await db.prepare(`
      INSERT INTO user_locations (id, user_id, ip, country, country_code, city, lat, lon, isp)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `).run(crypto.randomUUID(), userId, ip, geo.country, geo.countryCode, geo.city, geo.lat, geo.lon, geo.isp);

  } else {
    await db.prepare(`
      UPDATE user_locations SET last_seen = NOW(), login_count = login_count + 1
      WHERE user_id = $1 AND country_code = $2
    `).run(userId, geo.countryCode);
  }

  // ── R11: Compound high-risk detection ────────────────────────────────────
  const isNewDevice  = !existing;
  const isNewCountry = !lastLocation || (
    lastLocation.country_code !== geo.countryCode &&
    geo.countryCode !== '??' && geo.countryCode !== 'LO'
  );
  const ipReputation   = scoreIpReputation(geo, cfThreatScore);
  const PRIVILEGED_ROLES = ['admin', 'prescriber'];
  const isPrivileged   = PRIVILEGED_ROLES.includes(req.user?.role || '');

  // Also trigger R11 on high CF threat score alone for privileged users (even known device)
  const cfHighThreat = cfThreatScore >= 50 && isPrivileged;

  if ((isNewDevice && isNewCountry && ipReputation < 30 && isPrivileged) || cfHighThreat) {
    console.warn(`[R11] CRITICAL: suspicious login for privileged user ${userName} (rep=${ipReputation}, cfScore=${cfThreatScore}, ${geo.countryCode}, ${geo.isp})`);

    // 1. Mark device suspicious immediately
    if (dbDeviceId) {
      await db.prepare(`UPDATE user_devices SET trust_state = 'suspicious' WHERE id = $1`).run(dbDeviceId);
    }

    // 2. Kill ALL active sessions for this user (except session being created — it won't be active yet)
    const { changes: killedSessions } = await db.prepare(
      `UPDATE sessions SET is_active = 0 WHERE user_id = $1 AND is_active = 1`
    ).run(userId);

    // 3. Fire CRITICAL anomaly
    await insertAnomaly({
      ruleId: 'R11_SUSPICIOUS_LOGIN', severity: 'CRITICAL',
      title: `High-Risk Login: ${userName}`,
      description: `Privileged user ${userName} (${req.user?.role}) signed in under high-risk conditions — reputation score: ${ipReputation}/100, CF threat score: ${cfThreatScore}/100, proxy: ${geo.proxy}, hosting: ${geo.hosting}, location: ${geo.city}, ${geo.country}. ${killedSessions} session(s) auto-terminated. Re-authentication required.`,
      actorId: userId, actorName: userName, ip,
      eventCount: 1, windowMin: 0,
      rawEvents: [{ fingerprint, platform, browser, ip, geo, ipReputation, cfThreatScore, role: req.user?.role, killedSessions }],
    });

    logAudit({
      actorId: userId, actorName: userName,
      action: 'R11_SUSPICIOUS_LOGIN', targetType: 'session',
      details: { ip, country: geo.country, ipReputation, proxy: geo.proxy, hosting: geo.hosting, killedSessions, role: req.user?.role },
      ip,
    });

    // 4. Email admin alert
    try {
      const { deliverAlert } = await import('./alerting.js');
      await deliverAlert('CRITICAL',
          `High-Risk Login Blocked: ${userName}`,
          `A privileged user attempted to sign in under suspicious conditions. All sessions have been auto-terminated and the device has been flagged. The user must re-authenticate.`,
          {
            user: userName, role: req.user?.role, ip,
            country: geo.country, city: geo.city, isp: geo.isp,
            proxy: geo.proxy, hosting: geo.hosting,
            cfThreatScore,
            ipReputationScore: ipReputation,
            sessionsKilled: killedSessions,
            fingerprint: fingerprint.slice(0, 16) + '…',
            timestamp: new Date().toISOString(),
          }
        );
    } catch (err) {
      console.error('[R11] alert delivery failed:', err.message);
    }

    return { dbDeviceId, geo, fingerprint, platform, browser, isNewDevice: true, cfThreatScore, r11Triggered: true, sessionsKilled: killedSessions };
  }

  return { dbDeviceId, geo, fingerprint, platform, browser, isNewDevice, cfThreatScore };
}

// ── Trust management helpers (used by security console routes) ───────────────
export async function setDeviceTrust(deviceId, trustState) {
  await db.prepare(`UPDATE user_devices SET trust_state = $1 WHERE id = $2`).run(trustState, deviceId);
}

export async function getUserDevices(userId) {
  return db.prepare(`
    SELECT id, fingerprint, user_agent, platform, browser, ip, country,
           first_seen, last_seen, trust_state
    FROM user_devices WHERE user_id = $1 ORDER BY last_seen DESC
  `).all(userId);
}
