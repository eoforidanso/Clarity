const RISK_THRESHOLD = 75;
const MAX_RISK = 100;
const DECAY_PER_CLEAN_REQUEST = 5;

/**
 * Pure risk evaluation — no I/O, no side effects.
 *
 * @param {object} opts
 * @param {number} opts.riskScore   - Current session risk score (0–100)
 * @param {boolean} opts.ipChanged
 * @param {boolean} opts.uaChanged
 * @param {boolean} opts.deviceChanged
 * @param {boolean} opts.locationChanged
 * @returns {{ risk: number, action: 'allow' | 'reauth' }}
 */
export function evaluateRisk({ riskScore = 0, ipChanged, uaChanged, deviceChanged, locationChanged }) {
  const hasAnomaly = ipChanged || uaChanged || deviceChanged || locationChanged;

  let delta = 0;
  if (ipChanged)       delta += 15;
  if (uaChanged)       delta += 10;
  if (deviceChanged)   delta += 25;
  if (locationChanged) delta += 20;

  const risk = hasAnomaly
    ? Math.min(riskScore + delta, MAX_RISK)
    : Math.max(riskScore - DECAY_PER_CLEAN_REQUEST, 0);

  return {
    risk,
    action: risk > RISK_THRESHOLD ? 'reauth' : 'allow',
  };
}

export { RISK_THRESHOLD };
