/**
 * Authentication Rules: MFA requirement, elevation logic
 *
 * Centralized rules for deciding when to require MFA, elevation, or re-auth
 * based on user risk profile, session risk, and action sensitivity.
 */

// Roles that MUST complete MFA on every login regardless of two_factor_enabled flag.
// These roles have access to PHI, controlled substances, or system configuration.
const MFA_REQUIRED_ROLES = new Set(['admin', 'prescriber', 'nurse']);

/**
 * Determine if MFA is required for this session
 * @param {Object} session - Session from DB (risk_score, mfa_level, ...)
 * @param {Object} user - User from DB (two_factor_enabled, role, ...)
 * @returns {boolean} true if MFA must be verified
 */
export function needsMfa(session, user) {
  // Privileged roles always require MFA — even if the user hasn't explicitly enabled it.
  // The email OTP flow acts as the first-factor MFA setup for new staff.
  if (MFA_REQUIRED_ROLES.has(user?.role)) {
    return true;
  }

  // For other roles: honour the user's own two_factor_enabled setting
  if (!user.two_factor_enabled) {
    return false;
  }

  // Force MFA if session risk is elevated
  if ((session?.risk_score || 0) >= 20) {
    return true;
  }

  // Force MFA if explicitly marked as high-MFA requirement
  if (session?.mfa_level >= 1) {
    return true;
  }

  return false;
}

/**
 * Determine if a route requires elevated privileges
 * (short-lived elevation token, confirms user identity via password/OTP)
 *
 * Sensitive routes: role changes, EPCS signing, PHI export, billing access
 */
export const SENSITIVE_ROUTES = [
  // EPCS operations
  '/api/epcs',
  '/api/prescriptions/send',
  '/api/prescriptions/*/sign',

  // Role/permission changes
  '/api/users/*/role',
  '/api/users/*/permissions',
  '/api/access-control',

  // PHI export / data access
  '/api/patients/*/export',
  '/api/encounters/*/download',
  '/api/audit-logs',

  // Billing & payment
  '/api/billing',
  '/api/claims/*/edit',
  '/api/revenue-cycle',

  // System admin
  '/api/admin',
  '/api/settings',
  '/api/organizations',
];

/**
 * Check if a route is sensitive (requires elevation)
 * @param {string} path - Request path (req.path or req.originalUrl)
 * @returns {boolean}
 */
export function isSensitiveRoute(path) {
  return SENSITIVE_ROUTES.some(pattern => {
    // Simple wildcard matching: '/api/users/*/role' matches '/api/users/123/role'
    const regex = new RegExp('^' + pattern.replace(/\*/g, '[^/]+') + '$');
    return regex.test(path);
  });
}

/**
 * Decode risk level into human-readable status
 */
export function getRiskLevel(riskScore) {
  if (riskScore >= 50) return 'critical';
  if (riskScore >= 30) return 'elevated';
  if (riskScore >= 10) return 'moderate';
  return 'normal';
}

/**
 * MFA level constants
 */
export const MFA_LEVELS = {
  NONE: 0,        // No MFA required for normal operations
  STANDARD: 1,    // MFA on elevation
  HIGH: 2,        // MFA on every sensitive action
  CRITICAL: 3,    // MFA + device pin
};
