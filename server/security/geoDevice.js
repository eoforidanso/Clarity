/**
 * Clarity EHR — Geographic Anomaly + Device Fingerprinting
 *
 * Geographic anomaly:
 *   On every login, geolocate the IP and compare against the user's
 *   last known country. Flag if country changed or new country entirely.
 *
 * Device fingerprinting:
 *   Hash (User-Agent + Accept-Language + platform hints) into a 16-char
 *   device ID. Store known devices per user. Flag unknown devices.
 *
 * Both checks run at login time (POST /auth/login success).
 * Findings go to audit_logs + anomalies table.
 */

import crypto from 'crypto';
import db from '../db/database.js';
import { logAudit } from '../db/softDelete.js';
import { insertAnomaly } from './anomalyDetector.js';

// ── Schema ─────────────────────────────────────────────────────────────────────
export function createGeoDeviceTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_locations (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      ip          TEXT NOT NULL,
      country     TEXT DEFAULT '',
      country_code TEXT DEFAULT '',
      city        TEXT DEFAULT '',
      lat         REAL,
      lon         REAL,
      isp         TEXT DEFAULT '',
      first_seen  TEXT DEFAULT (datetime('now')),
      last_seen   TEXT DEFAULT (datetime('now')),
      login_count INTEGER DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_user_loc_user ON user_locations(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_loc_ip   ON user_locations(ip);

    CREATE TABLE IF NOT EXISTS user_devices (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      device_id     TEXT NOT NULL,
      user_agent    TEXT DEFAULT '',
      platform      TEXT DEFAULT '',
      first_seen    TEXT DEFAULT (datetime('now')),
      last_seen     TEXT DEFAULT (datetime('now')),
      login_count   INTEGER DEFAULT 1,
      is_trusted    INTEGER DEFAULT 0
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_device_uid ON user_devices(user_id, device_id);
    CREATE INDEX IF NOT EXISTS idx_user_device_user ON user_devices(user_id);
  `);
}

// ── IP Geolocation (ip-api.com — free, 45 req/min) ───────────────────────────
const geoCache = new Map(); // cache by IP, 1h TTL

export async function geolocate(ip) {
  if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
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
      geoCache.set(ip, { ts: Date.now(), data });
      return data;
    }
  } catch { /* timeout or offline */ }

  return { country: 'Unknown', countryCode: '??', city: '', lat: 0, lon: 0, isp: '' };
}

// ── Device fingerprint ────────────────────────────────────────────────────────
export function fingerprintDevice(req) {
  const ua       = req.headers['user-agent']          || '';
  const lang     = req.headers['accept-language']     || '';
  const platform = req.headers['sec-ch-ua-platform']  || '';
  const mobile   = req.headers['sec-ch-ua-mobile']    || '';

  const raw = [ua, lang, platform, mobile].join('|');
  const hash = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);

  // Readable platform label
  const osLabel =
    ua.includes('iPhone')  ? 'iPhone'  :
    ua.includes('Android') ? 'Android' :
    ua.includes('Mac')     ? 'macOS'   :
    ua.includes('Windows') ? 'Windows' :
    ua.includes('Linux')   ? 'Linux'   : 'Unknown';

  const browserLabel =
    ua.includes('Edg/')    ? 'Edge'    :
    ua.includes('Chrome/') ? 'Chrome'  :
    ua.includes('Firefox/') ? 'Firefox' :
    ua.includes('Safari/')  ? 'Safari'  : 'Browser';

  return {
    deviceId: hash,
    platform: `${browserLabel} · ${osLabel}`,
    userAgent: ua.slice(0, 200),
  };
}

// ── Main check — called after successful login ─────────────────────────────────
export async function checkLoginAnomaly(userId, userName, ip, req) {
  createGeoDeviceTables();

  const { deviceId, platform, userAgent } = fingerprintDevice(req);
  const geo = await geolocate(ip);

  // ── Device fingerprint check ─────────────────────────────────────────────
  const knownDevice = db.prepare(
    'SELECT id, login_count FROM user_devices WHERE user_id = ? AND device_id = ?'
  ).get(userId, deviceId);

  if (!knownDevice) {
    // First time seeing this device for this user
    const existingDevices = db.prepare(
      'SELECT COUNT(*) as c FROM user_devices WHERE user_id = ?'
    ).get(userId)?.c || 0;

    db.prepare(`
      INSERT INTO user_devices (id, user_id, device_id, user_agent, platform)
      VALUES (?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), userId, deviceId, userAgent, platform);

    if (existingDevices > 0) {
      // Has previous devices — this is NEW → alert
      logAudit({
        actorId: userId, actorName: userName,
        action: 'NEW_DEVICE_LOGIN',
        targetType: 'session',
        details: { deviceId, platform, ip, country: geo.country },
        ip,
      });

      insertAnomaly({
        ruleId: 'R09_NEW_DEVICE', severity: 'MEDIUM',
        title:  `New Device: ${userName}`,
        description: `${userName} logged in from an unrecognised device (${platform}) from ${ip} (${geo.city}, ${geo.country}).`,
        actorId: userId, actorName: userName, ip,
        eventCount: 1, windowMin: 0,
        rawEvents: [{ deviceId, platform, ip, geo }],
      });
    }
  } else {
    // Known device — update last seen
    db.prepare(`
      UPDATE user_devices SET last_seen = datetime('now'), login_count = login_count + 1
      WHERE user_id = ? AND device_id = ?
    `).run(userId, deviceId);
  }

  // ── Geographic anomaly check ──────────────────────────────────────────────
  const lastLocation = db.prepare(`
    SELECT country_code, country, city FROM user_locations
    WHERE user_id = ? ORDER BY last_seen DESC LIMIT 1
  `).get(userId);

  if (!lastLocation) {
    // First ever login — record baseline, no alert
    db.prepare(`
      INSERT INTO user_locations (id, user_id, ip, country, country_code, city, lat, lon, isp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), userId, ip,
      geo.country, geo.countryCode, geo.city, geo.lat, geo.lon, geo.isp);

  } else if (lastLocation.country_code !== geo.countryCode && geo.countryCode !== '??' && geo.countryCode !== 'LO') {
    // Country changed → alert
    logAudit({
      actorId: userId, actorName: userName,
      action: 'GEO_ANOMALY',
      targetType: 'session',
      details: {
        previousCountry: lastLocation.country,
        newCountry:      geo.country,
        newCity:         geo.city,
        ip,
      },
      ip,
    });

    insertAnomaly({
      ruleId: 'R10_GEO_ANOMALY', severity: 'HIGH',
      title:  `Geographic Anomaly: ${userName}`,
      description: `${userName} logged in from ${geo.city}, ${geo.country} — previously logged in from ${lastLocation.city || lastLocation.country}. Possible account compromise or travel.`,
      actorId: userId, actorName: userName, ip,
      eventCount: 1, windowMin: 0,
      rawEvents: [{ previous: lastLocation, current: geo }],
    });

    // Update location record
    db.prepare(`
      INSERT INTO user_locations (id, user_id, ip, country, country_code, city, lat, lon, isp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), userId, ip,
      geo.country, geo.countryCode, geo.city, geo.lat, geo.lon, geo.isp);

  } else {
    // Same country — just update last_seen
    db.prepare(`
      UPDATE user_locations SET last_seen = datetime('now'), login_count = login_count + 1
      WHERE user_id = ? AND country_code = ?
    `).run(userId, geo.countryCode);
  }

  return { geo, deviceId, platform, isNewDevice: !knownDevice };
}
