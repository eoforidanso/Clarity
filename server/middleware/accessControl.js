/**
 * accessControl.js
 *
 * Single source of truth for who can see what.
 *
 * Every authenticated request gets req.access attached by authenticate().
 * Route handlers never need to re-implement location or role logic.
 *
 * req.access = {
 *   role                    : string
 *   canSeeAll               : boolean  — true for admin / front_desk
 *   locationId              : string | null  — user's assigned location
 *   canAccessLocation(id)   : boolean
 *   locationClause(column)  : { clause: string, params: [] }
 * }
 */

// ─── Role tiers ───────────────────────────────────────────────────────────────

/** Roles that may see all locations and all unfiltered data. */
export const GLOBAL_ROLES = Object.freeze(['admin', 'front_desk']);

/** Roles that are restricted to their assigned location_id. */
export const SCOPED_ROLES = Object.freeze(['nurse', 'prescriber', 'therapist', 'biller']);

// ─── Core builder (called by authenticate on every request) ──────────────────

/**
 * Builds the req.access object from a fully-loaded user row.
 * @param {{ role: string, location_id: string|null }} user
 */
export function buildAccess(user) {
  const canSeeAll = GLOBAL_ROLES.includes(user.role);
  const locationId = user.location_id || null;

  return {
    role: user.role,
    canSeeAll,
    locationId,

    /**
     * Returns true if this user is permitted to view a record
     * that is tagged to `locId`.
     *   - Global roles: always true.
     *   - Untagged records (locId is null/undefined): visible to everyone.
     *   - Scoped roles: only true when locId matches their own location.
     */
    canAccessLocation(locId) {
      if (canSeeAll) return true;
      if (!locId) return true;
      return locId === locationId;
    },

    /**
     * Returns a SQL WHERE fragment (and bound params) that limits a query
     * to rows the current user is allowed to see, based on a location column.
     *
     * Usage in a route handler:
     *   const { clause, params } = req.access.locationClause('primary_location');
     *   const sql = `SELECT * FROM patients WHERE is_active = ?${clause} ORDER BY last_name`;
     *   const rows = await db.prepare(sql).all(true, ...params);
     *
     * For global roles this returns an empty clause so no filtering is added.
     */
    locationClause(column = 'primary_location') {
      if (canSeeAll || !locationId) return { clause: '', params: [] };
      return {
        clause: ` AND (${column} IS NULL OR ${column} = ?)`,
        params: [locationId],
      };
    },
  };
}

// ─── requireRole middleware factory ──────────────────────────────────────────

/**
 * Express middleware factory that enforces role-based access.
 * Must be placed AFTER authenticate() (which sets req.user + req.access).
 *
 * Drop-in replacement for the old authorize() helper.
 *
 * Usage:
 *   router.post('/', requireRole('admin', 'front_desk'), handler);
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
