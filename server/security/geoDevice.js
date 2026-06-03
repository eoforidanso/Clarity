/**
 * Clarity EHR — Geographic Anomaly + Device Fingerprinting
 *
 * Geographic anomaly:
 *   On every login, geolocate the IP and compare against the user's
 *   last known country. Flag if country changed or is entirely new.
 *
 * Device fingerprinting:
 *   Hash (User-Agent + Accept-Language + platform hints) → 64-char hex.
 *   Store in user_devices (Postgres). Flag unknown/suspicious devices.
 *
 * Both checks run at login time (POST /auth/login success).
 * Findings go to audit_logs + anomalies table.
 */

import crypto from 'crypto';
import { db } from '../db/database.js';
import { logAudit } from '../db/softDelete.js';
import { insertAnomaly } from './anomalyDetector.js';

// ── user_locations table (Postgres) ──────────────────────────────────────────
// Created at startup if not present. user_devices is managed via migration.

export async function ensureGeoTables() {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS user_locations (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      ip           TEXT NOT NULL,
      country      TEXT DEFAULT '',
      country_code TEXT DEFAULT '',
      city         TEXT DEFAULT '',
      lat          REAL,
      lon          REAL,
      isp          TEXT DEFAULT '',
      first_seen   TIMESTAMPTZ DEFAULT NOW(),
      last_seen    TIMESTAMPTZ DEFAULT NOW(),
      login_count  INTEGER DEFAULT 1
    )
  `).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_user_loc_user ON user_locations(user_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_user_loc_ip   ON user_locations(ip)`).run();
}

// ── IP Geolocation (ip-api.com — free, 45 req/min) ───────────────────────────
const geoCache = new Map(); // { ip → { ts, data } }, 1h TTL

export async function geolocate(ip) {
  if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { country: 'Local', countryCode: 'LO', city: 'localhost', lat: 0, lon: 0, isp: 'Local' };
  }

  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.ts < 3_600_000) return cached.data;

  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,lat,lon,isp`,
      { signal: AbortSignal.timeout(3000) }
    );
    const data = await res.json();
    if (data.status === 'success') {
      const result = {
        country:     data.country,
        countryCode: data.countryCode,
        city:        data.city,
        lat:         data.lat,
        lon:         data.lon,
        isp:         data.isp,
      };
      geoCache.set(ip, { ts: Date.now(), data: result });
      return result;
    }
  } catch { /* timeout or offline — fall through */ }

  return { country: 'Unknown', countryCode: '??', city: '', lat: 0, lon: 0, isp: '' };
}

// ── Device fingerprint ────────────────────────────────────────────────────────
export function fingerprintDevice(req) {
  const ua       = req.headers['user-agent']         || '';
  const lang     = req.headers['accept-language']    || '';
  const platform = req.headers['sec-ch-ua-platform'] || '';
  const mobile   = req.headers['sec-ch-ua-mobile']   || '';

  // 64-char hex fingerprint stored in user_devices.fingerprint VARCHAR(64)
  const raw         = [ua, lang, platform, mobile].join('|');
  const fingerprint = crypto.createHash('sha256').update(raw).digest('hex'); // 64 chars

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

  return {
    fingerprint,
    platform:  osLabel,
    browser:   browserLabel,
    userAgent: ua.slice(0, 512),
  };
}

// ── Main check — called after successful login ────────────────────────────────
export async function checkLoginAnomaly(userId, userName, ip, req) {
  await ensureGeoTables();

  const { fingerprint, platform, browser, userAgent } = fingerprintDevice(req);
  const geo = await geolocate(ip);

  // ── Device fingerprint check ──────────────────────────────────────────────
  const knownDevice = await db.prepare(
    `SELECT id, trust_state FROM user_devices WHERE user_id = $1 AND fingerprint = $2`
  ).get(userId, fingerprint);

  if (!knownDevice) {
    // Count existing devices for this user
    const { c: existingCount } = await db.prepare(
      `SELECT COUNT(*) AS c FROM user_devices WHERE user_id = $1`
    ).get(userId) || { c: 0 };

    // Insert new device — trust_state='new' if user has prior devices, else 'trusted'
    const trustState = Number(existingCount) > 0 ? 'new' : 'trusted';

    await db.prepare(`
      INSERT INTO user_devices (user_id, fingerprint, user_agent, platform, browser, ip, country, trust_state)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, fingerprint) DO UPDATE
        SET last_seen = NOW(), ip = EXCLUDED.ip, country = EXCLUDED.country
    `).run(userId, fingerprint, userAgent, platform, browser, ip, geo.countryCode, trustState);

    if (Number(existingCount) > 0) {
      // Known user, new device → alert
      logAudit({
        actorId: userId, actorName: userName,
        action: 'NEW_DEVICE_LOGIN',
        targetType: 'session',
        details: { fingerprint, platform, browser, ip, country: geo.country },
        ip,
      });

      await insertAnomaly({
        ruleId:      'R09_NEW_DEVICE',
        severity:    'MEDIUM',
        title:       `New Device: ${userName}`,
        description: `${userName} signed in from an unrecognised ${browser} on ${platform} (${ip} · ${geo.city}, ${geo.country}).`,
        actorId:     userId,
        actorName:   userName,
        ip,
        eventCount:  1,
        windowMin:   0,
        rawEvents:   [{ fingerprint, platform, browser, ip, geo }],
      });
    }
  } else {
    // Known device — bump last_seen and refresh IP/country
    await db.prepare(`
      UPDATE user_devices
      SET last_seen = NOW(), ip = $1, country = $2
      WHERE user_id = $3 AND fingerprint = $4
    `).run(ip, geo.countryCode, userId, fingerprint);

    // If device was flagged suspicious and is seen again from same IP — still alert
    if (knownDevice.trust_state === 'suspicious') {
      await insertAnomaly({
        ruleId:      'R09_SUSPICIOUS_DEVICE',
        severity:    'HIGH',
        title:       `Suspicious Device Re-login: ${userName}`,
        description: `${userName} signed in again from a device previously flagged suspicious (${browser} on ${platform}).`,
        actorId:     userId,
        actorName:   userName,
        ip,
        eventCount:  1,
        windowMin:   0,
        rawEvents:   [{ fingerprint, platform, browser, ip, geo }],
      });
    }
  }

  // ── Geographic anomaly check ──────────────────────────────────────────────
  const lastLocation = await db.prepare(`
    SELECT country_code, country, city
    FROM user_locations
    WHERE user_id = $1
    ORDER BY last_seen DESC
    LIMIT 1
  `).get(userId);

  if (!lastLocation) {
    // First ever login — record baseline, no alert
    await db.prepare(`
      INSERT INTO user_locations (id, user_id, ip, country, country_code, city, lat, lon, isp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `).run(
      crypto.randomUUID(), userId, ip,
      geo.country, geo.countryCode, geo.city, geo.lat, geo.lon, geo.isp
    );

  } else if (
    lastLocation.country_code !== geo.countryCode &&
    geo.countryCode !== '??' &&
    geo.countryCode !== 'LO'
  ) {
    // Country changed → alert
    logAudit({
      actorId: userId, actorName: userName,
      action: 'GEO_ANOMALY',
      targetType: 'session',
      details: {
        previousCountry: lastLocation.country,
        previousCity:    lastLocation.city,
        newCountry:      geo.country,
        newCity:         geo.city,
        ip,
      },
      ip,
    });

    await insertAnomaly({
      ruleId:      'R10_GEO_ANOMALY',
      severity:    'HIGH',
      title:       `Geographic Anomaly: ${userName}`,
      description: `${userName} signed in from ${geo.city}, ${geo.country} — previously from ${lastLocation.city || lastLocation.country}. Possible account compromise or travel.`,
      actorId:     userId,
      actorName:   userName,
      ip,
      eventCount:  1,
      windowMin:   0,
      rawEvents:   [{ previous: lastLocation, current: geo }],
    });

    // Record new location
    await db.prepare(`
      INSERT INTO user_locations (id, user_id, ip, country, country_code, city, lat, lon, isp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `).run(
      crypto.randomUUID(), userId, ip,
      geo.country, geo.countryCode, geo.city, geo.lat, geo.lon, geo.isp
    );

  } else {
    // Same country — update last_seen
    await db.prepare(`
      UPDATE user_locations
      SET last_seen = NOW(), login_count = login_count + 1
      WHERE user_id = $1 AND country_code = $2
    `).run(userId, geo.countryCode);
  }

  return {
    geo,
    fingerprint,
    platform,
    browser,
    isNewDevice:    !knownDevice,
    trustState:     knownDevice?.trust_state ?? (Number((await db.prepare('SELECT COUNT(*) AS c FROM user_devices WHERE user_id=$1').get(userId))?.c || 0) > 1 ? 'new' : 'trusted'),
  };
}

// ── Trust management (called from security console routes) ───────────────────

export async function setDeviceTrust(userId, fingerprint, trustState) {
  await db.prepare(`
    UPDATE user_devices SET trust_state = $1
    WHERE user_id = $2 AND fingerprint = $3
  `).run(trustState, userId, fingerprint);
}

export async function getUserDevices(userId) {
  return db.prepare(`
    SELECT id, fingerprint, user_agent, platform, browser, ip, country,
           first_seen, last_seen, trust_state
    FROM user_devices
    WHERE user_id = $1
    ORDER BY last_seen DESC
  `).all(userId);
}
