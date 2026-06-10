/**
 * Access Control Utilities
 *
 * Provides consistent access control checks across the app for:
 * - Global Admin (is_global=true): Can see/manage everything
 * - Local Admin (is_global=false): Limited to their facility
 * - Other roles: No access to admin features
 */

/**
 * Check if user can access admin features
 * Returns: { canAccess, isGlobal, isLocal, facilityId }
 */
export function checkAdminAccess(currentUser) {
  const isAdmin = currentUser?.role === 'admin';
  const isGlobal = currentUser?.is_global === true;
  const isLocal = isAdmin && !isGlobal;
  const facilityId = currentUser?.facility_id || currentUser?.locationId;

  return {
    canAccess: isAdmin,
    isGlobal,
    isLocal,
    facilityId,
  };
}

/**
 * Check if user can access system admin features (requires is_global=true)
 */
export function checkSystemAdminAccess(currentUser) {
  return currentUser?.is_global === true;
}

/**
 * Check if user can access feature
 * - systemAdminOnly: only global admins
 * - adminOnly: any admin (global or local)
 */
export function hasAccess(currentUser, featureType = 'adminOnly') {
  if (featureType === 'systemAdminOnly') {
    return checkSystemAdminAccess(currentUser);
  }
  if (featureType === 'adminOnly') {
    return checkAdminAccess(currentUser).canAccess;
  }
  return false;
}

/**
 * Generate access restricted message text
 */
export function getAccessDeniedMessage(featureType = 'admin') {
  return featureType === 'systemAdminOnly'
    ? 'This feature is only available to System Administrators.'
    : 'This feature is only available to Administrators.';
}
