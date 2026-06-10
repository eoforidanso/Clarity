/**
 * Facility Scoping Helper
 *
 * Enforces facility isolation in SQL queries:
 * - Global admins (isGlobal=true): no WHERE facility_id constraint
 * - Local users: enforced WHERE facility_id = $facilityId
 *
 * Usage:
 *   const { query, params } = scopeByFacility(req, 'SELECT * FROM patients');
 *   db.prepare(query).all(...params);
 */
export function scopeByFacility(req, baseQuery) {
  const { facility_id, isGlobal } = req.user || {};

  // ⭐ System Admin sees everything — no scoping
  if (isGlobal) {
    return {
      query: baseQuery,
      params: [],
    };
  }

  // ⭐ Local Admin / staff → enforce facility_id
  if (!facility_id) {
    throw new Error('Facility scoping error: no facility_id for non-global user');
  }

  return {
    query: `${baseQuery} WHERE facility_id = $1`,
    params: [facility_id],
  };
}

/**
 * Join-friendly version that can scope through a table join
 *
 * Usage:
 *   const { whereClause, params } = scopeByFacilityJoin(req, 'patients.facility_id');
 *   const query = `SELECT * FROM appointments JOIN patients...${whereClause}`;
 *   db.prepare(query).all(...params);
 */
export function scopeByFacilityJoin(req, facilityColumn) {
  const { facility_id, isGlobal } = req.user || {};

  // ⭐ System Admin sees everything
  if (isGlobal) {
    return {
      whereClause: '',
      params: [],
    };
  }

  // ⭐ Local Admin / staff → enforce scoping through join
  if (!facility_id) {
    throw new Error('Facility scoping error: no facility_id for non-global user');
  }

  return {
    whereClause: `WHERE ${facilityColumn} = $1`,
    params: [facility_id],
  };
}

/**
 * Audit-safe version — includes audit_log facility isolation
 *
 * Usage:
 *   const { query, params } = scopeByFacilityAudit(req, 'SELECT * FROM audit_logs');
 */
export function scopeByFacilityAudit(req, baseQuery) {
  const { facility_id, isGlobal } = req.user || {};

  // ⭐ System Admin sees all audit logs
  if (isGlobal) {
    return {
      query: baseQuery,
      params: [],
    };
  }

  // ⭐ Local Admin sees only their facility's logs
  if (!facility_id) {
    throw new Error('Facility scoping error: no facility_id for non-global user');
  }

  return {
    query: `${baseQuery} WHERE facility_id = $1 OR facility_id IS NULL`,
    params: [facility_id],
  };
}
