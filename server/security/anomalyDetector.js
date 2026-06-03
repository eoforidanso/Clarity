/**
 * Clarity EHR — Rule-Based Anomaly Detector
 *
 * Runs every 5 minutes as a scheduled job.
 * Queries audit_logs for patterns that indicate attacks or misuse.
 * Writes findings to anomalies table.
 *
 * Rules (no ML — pure SQL + counting):
 *
 *  R01  IP_SCANNING          Same IP, ≥5 IDOR attempts in 10 min
 *  R02  BULK_PATIENT_ACCESS  Same user, ≥4 distinct patients in 10 min
 *  R03  BRUTE_FORCE          Same IP, ≥10 LOGIN_FAILED in 15 min
 *  R04  REPEATED_TARGETING   Same user → same patient, ≥3 blocked in 30 min
 *  R05  OFF_HOURS_ACCESS     IDOR attempt before 07:00 or after 21:00 local
 *  R06  REAUTH_HAMMERING     Same IP, ≥5 REAUTH_FAILED in 15 min
 *  R07  PRIVILEGE_PROBE      IDOR_BLOCKED_USER ≥3 by same actor in 10 min
 *  R08  SESSION_REUSE        Same actor from ≥3 distinct IPs in 30 min
 */

import db from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { alertOnAction } from './alerting.js';

// ── Schema ─────────────────────────────────────────────────────────────────────
export function createAnomalyTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS anomalies (
      id          TEXT PRIMARY KEY,
      rule_id     TEXT NOT NULL,
      severity    TEXT NOT NULL DEFAULT 'MEDIUM',
      title       TEXT NOT NULL,
      description TEXT NOT NULL,
      actor_id    TEXT,
      actor_name  TEXT DEFAULT '',
      ip          TEXT DEFAULT '',
      event_count INTEGER DEFAULT 0,
      window_min  INTEGER DEFAULT 0,
      raw_events  TEXT DEFAULT '[]',
      status      TEXT DEFAULT 'open',
      detected_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_anomalies_rule     ON anomalies(rule_id);
    CREATE INDEX IF NOT EXISTS idx_anomalies_status   ON anomalies(status);
    CREATE INDEX IF NOT EXISTS idx_anomalies_detected ON anomalies(detected_at);
  `);
}

// ── Dedup: don't re-create same anomaly within cooldown ───────────────────────
function alreadyOpen(ruleId, actorId, ip, cooldownMin = 30) {
  const row = db.prepare(`
    SELECT id FROM anomalies
    WHERE rule_id = ?
      AND (actor_id = ? OR ip = ?)
      AND status = 'open'
      AND detected_at >= datetime('now', ?)
  `).get(ruleId, actorId || '', ip || '', `-${cooldownMin} minutes`);
  return !!row;
}

export function insertAnomaly({ ruleId, severity, title, description, actorId, actorName, ip, eventCount, windowMin, rawEvents }) {
  if (alreadyOpen(ruleId, actorId, ip)) return null;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO anomalies
      (id, rule_id, severity, title, description, actor_id, actor_name, ip, event_count, window_min, raw_events)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, ruleId, severity, title, description,
    actorId || null, actorName || '', ip || '',
    eventCount, windowMin, JSON.stringify(rawEvents || []));

  // Fire alert for HIGH/CRITICAL anomalies
  if (['HIGH', 'CRITICAL'].includes(severity)) {
    alertOnAction('ANOMALY_DETECTED', { ruleId, severity, title, actorId, ip, eventCount });
  }

  return id;
}

// ── Rule definitions ──────────────────────────────────────────────────────────

// R01: Same IP ≥5 IDOR attempts in 10 min
function detectIpScanning() {
  const rows = db.prepare(`
    SELECT ip, COUNT(*) as cnt, GROUP_CONCAT(actor_id) as actors, GROUP_CONCAT(target_id) as patients
    FROM audit_logs
    WHERE action = 'IDOR_BLOCKED'
      AND created_at >= datetime('now', '-10 minutes')
      AND ip != ''
    GROUP BY ip HAVING cnt >= 5
  `).all();

  for (const r of rows) {
    insertAnomaly({
      ruleId: 'R01_IP_SCANNING', severity: 'HIGH',
      title:  `IP Scanning: ${r.ip}`,
      description: `IP ${r.ip} triggered ${r.cnt} IDOR_BLOCKED events in 10 minutes — possible patient record enumeration.`,
      ip: r.ip, eventCount: r.cnt, windowMin: 10,
      rawEvents: [{ ip: r.ip, count: r.cnt, actors: r.actors }],
    });
  }
}

// R02: Same user accessing ≥4 distinct patients in 10 min
function detectBulkAccess() {
  const rows = db.prepare(`
    SELECT actor_id, actor_name, COUNT(DISTINCT target_id) as patients,
           COUNT(*) as cnt, MAX(ip) as ip
    FROM audit_logs
    WHERE action = 'IDOR_BLOCKED'
      AND created_at >= datetime('now', '-10 minutes')
    GROUP BY actor_id HAVING patients >= 4
  `).all();

  for (const r of rows) {
    insertAnomaly({
      ruleId: 'R02_BULK_ACCESS', severity: 'HIGH',
      title:  `Bulk Patient Access: ${r.actor_name || r.actor_id}`,
      description: `User attempted to access ${r.patients} distinct patients in 10 minutes — possible data harvesting.`,
      actorId: r.actor_id, actorName: r.actor_name, ip: r.ip,
      eventCount: r.cnt, windowMin: 10,
    });
  }
}

// R03: Brute force — ≥10 LOGIN_FAILED from same IP in 15 min
function detectBruteForce() {
  const rows = db.prepare(`
    SELECT ip, COUNT(*) as cnt, GROUP_CONCAT(DISTINCT actor_name) as accounts
    FROM audit_logs
    WHERE action = 'LOGIN_FAILED'
      AND created_at >= datetime('now', '-15 minutes')
      AND ip != ''
    GROUP BY ip HAVING cnt >= 10
  `).all();

  for (const r of rows) {
    insertAnomaly({
      ruleId: 'R03_BRUTE_FORCE', severity: 'CRITICAL',
      title:  `Brute Force: ${r.ip}`,
      description: `${r.cnt} failed login attempts from ${r.ip} in 15 minutes. Accounts targeted: ${r.accounts || 'unknown'}.`,
      ip: r.ip, eventCount: r.cnt, windowMin: 15,
    });
  }
}

// R04: Same user blocked accessing same patient ≥3 times in 30 min
function detectRepeatedTargeting() {
  const rows = db.prepare(`
    SELECT actor_id, actor_name, target_id, COUNT(*) as cnt, MAX(ip) as ip
    FROM audit_logs
    WHERE action = 'IDOR_BLOCKED'
      AND created_at >= datetime('now', '-30 minutes')
    GROUP BY actor_id, target_id HAVING cnt >= 3
  `).all();

  for (const r of rows) {
    insertAnomaly({
      ruleId: 'R04_REPEATED_TARGET', severity: 'HIGH',
      title:  `Repeated Targeting: ${r.actor_name || r.actor_id}`,
      description: `User attempted ${r.cnt} times to access the same patient (${r.target_id?.slice(0,8)}) in 30 minutes.`,
      actorId: r.actor_id, actorName: r.actor_name, ip: r.ip,
      eventCount: r.cnt, windowMin: 30,
    });
  }
}

// R05: IDOR attempt outside business hours (before 7am or after 9pm UTC)
function detectOffHours() {
  const hour = new Date().getUTCHours();
  if (hour >= 7 && hour < 21) return; // business hours — skip

  const rows = db.prepare(`
    SELECT actor_id, actor_name, COUNT(*) as cnt, MAX(ip) as ip
    FROM audit_logs
    WHERE action = 'IDOR_BLOCKED'
      AND created_at >= datetime('now', '-5 minutes')
    GROUP BY actor_id HAVING cnt >= 1
  `).all();

  for (const r of rows) {
    insertAnomaly({
      ruleId: 'R05_OFF_HOURS', severity: 'MEDIUM',
      title:  `Off-Hours Access Attempt: ${r.actor_name || r.actor_id}`,
      description: `IDOR attempt at ${hour}:00 UTC (outside 07:00–21:00 window). Could indicate compromised credentials.`,
      actorId: r.actor_id, actorName: r.actor_name, ip: r.ip,
      eventCount: r.cnt, windowMin: 5,
    });
  }
}

// R06: Reauth hammering — ≥5 REAUTH_FAILED from same IP in 15 min
function detectReauthHammering() {
  const rows = db.prepare(`
    SELECT ip, COUNT(*) as cnt, GROUP_CONCAT(DISTINCT actor_id) as actors
    FROM audit_logs
    WHERE action = 'REAUTH_FAILED'
      AND created_at >= datetime('now', '-15 minutes')
      AND ip != ''
    GROUP BY ip HAVING cnt >= 5
  `).all();

  for (const r of rows) {
    insertAnomaly({
      ruleId: 'R06_REAUTH_HAMMER', severity: 'HIGH',
      title:  `Re-Auth Hammering: ${r.ip}`,
      description: `${r.cnt} failed re-authentication attempts from ${r.ip} in 15 minutes — possible elevated privilege attack.`,
      ip: r.ip, eventCount: r.cnt, windowMin: 15,
    });
  }
}

// R07: Privilege probe — ≥3 IDOR_BLOCKED_USER by same actor in 10 min
function detectPrivilegeProbe() {
  const rows = db.prepare(`
    SELECT actor_id, actor_name, COUNT(*) as cnt, MAX(ip) as ip
    FROM audit_logs
    WHERE action = 'IDOR_BLOCKED_USER'
      AND created_at >= datetime('now', '-10 minutes')
    GROUP BY actor_id HAVING cnt >= 3
  `).all();

  for (const r of rows) {
    insertAnomaly({
      ruleId: 'R07_PRIVILEGE_PROBE', severity: 'HIGH',
      title:  `Privilege Probe: ${r.actor_name || r.actor_id}`,
      description: `${r.cnt} attempts to access other user accounts in 10 minutes — possible privilege escalation probe.`,
      actorId: r.actor_id, actorName: r.actor_name, ip: r.ip,
      eventCount: r.cnt, windowMin: 10,
    });
  }
}

// R08: Session reuse — same actor from ≥3 distinct IPs in 30 min
function detectSessionReuse() {
  const rows = db.prepare(`
    SELECT actor_id, actor_name, COUNT(DISTINCT ip) as ip_count, GROUP_CONCAT(DISTINCT ip) as ips
    FROM audit_logs
    WHERE action IN ('IDOR_BLOCKED', 'REAUTH_FAILED', 'LOGIN_FAILED')
      AND created_at >= datetime('now', '-30 minutes')
      AND ip != ''
    GROUP BY actor_id HAVING ip_count >= 3
  `).all();

  for (const r of rows) {
    insertAnomaly({
      ruleId: 'R08_SESSION_REUSE', severity: 'MEDIUM',
      title:  `Multiple IPs: ${r.actor_name || r.actor_id}`,
      description: `Same user triggered events from ${r.ip_count} distinct IPs in 30 minutes (${r.ips}) — possible stolen session or proxy chain.`,
      actorId: r.actor_id, actorName: r.actor_name,
      eventCount: r.ip_count, windowMin: 30,
    });
  }
}

// ── Main runner ───────────────────────────────────────────────────────────────
export function runAnomalyDetection() {
  createAnomalyTable();
  const start = Date.now();

  try {
    detectIpScanning();
    detectBulkAccess();
    detectBruteForce();
    detectRepeatedTargeting();
    detectOffHours();
    detectReauthHammering();
    detectPrivilegeProbe();
    detectSessionReuse();
    // R09/R10 are triggered at login time by geoDevice.js — not re-checked here
  } catch (err) {
    console.error('[anomaly-detector] error:', err.message);
  }

  const ms = Date.now() - start;
  if (ms > 500) console.warn(`[anomaly-detector] slow run: ${ms}ms`);
}

// ── Scheduled job (every 5 minutes) ──────────────────────────────────────────
export function startAnomalyScheduler(intervalMs = 5 * 60_000) {
  createAnomalyTable();
  console.info('[anomaly-detector] started — running every', intervalMs / 60000, 'minutes');
  runAnomalyDetection(); // run immediately
  return setInterval(runAnomalyDetection, intervalMs);
}
