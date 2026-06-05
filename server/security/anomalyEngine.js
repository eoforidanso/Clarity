/**
 * anomalyEngine.js
 *
 * Single entry point for recording anomalies.
 * Inserts into the anomalies table, then immediately triggers
 * the auto-response pipeline.
 *
 * Usage:
 *   const { anomaly } = await recordAnomaly(user, {
 *     type:       'NEW_DEVICE',
 *     severity:   'medium',
 *     session_id: req.sessionId,
 *     ip:         req.ip,
 *     user_agent: req.get('User-Agent'),
 *   });
 */

import db from '../db/database.js';
import { handleAutoResponse } from './autoResponse.js';

export async function recordAnomaly(user, anomaly) {
  // 1. Persist to anomalies table and get back the generated id
  const result = await db.prepare(`
    INSERT INTO anomalies
      (user_id, facility_id, type, severity, session_id, ip, user_agent, metadata, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    RETURNING id
  `).get(
    user.id,
    user.facility_id || null,
    anomaly.type,
    anomaly.severity || 'medium',
    anomaly.session_id || null,
    anomaly.ip         || null,
    anomaly.user_agent || null,
    JSON.stringify(anomaly)
  );

  const fullAnomaly = { ...anomaly, id: result?.id };

  // 2. Auto-response hook — fire and forget (errors are caught inside)
  handleAutoResponse(user, fullAnomaly).catch(
    err => console.error('[anomaly-engine] auto-response error:', err.message)
  );

  return { anomaly: fullAnomaly };
}
