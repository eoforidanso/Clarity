import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { locations as locationsApi } from '../services/api';

// ─── Static fallback (used when backend is unavailable) ───────────────────────
export const SITES_FALLBACK = [
  { id: 'all',      name: 'All Sites',                          shortName: 'All Sites',        type: 'Meta',      icon: '🌐' },
  { id: 'loc-apmg', name: 'Advanced Practice Medical Group',    shortName: 'Rolling Meadows',  type: 'Primary',   icon: '🏥' },
  { id: 'loc1',     name: 'Clarity — Main Office',              shortName: 'Main Office',      type: 'Primary',   icon: '🏥' },
  { id: 'loc2',     name: 'Clarity — West Loop',                shortName: 'West Loop',        type: 'Satellite', icon: '📍' },
  { id: 'loc3',     name: 'Clarity — Evanston',                 shortName: 'Evanston',         type: 'Satellite', icon: '📍' },
  { id: 'loc4',     name: 'Clarity — Telehealth Only',          shortName: 'Telehealth',       type: 'Virtual',   icon: '💻' },
  {
    id: 'loc-victory',
    name: 'Victory Mental Health Service',
    shortName: 'Victory Mental Health',
    type: 'Primary',
    icon: '🏥',
    address: '7060 Centennial Drive, Suite 102C, Tinley Park, IL 60477',
    phone: '708-575-8043',
    fax: '708-575-7872',
    email: 'info@victorymentalservs.com',
    hours: 'Mon–Fri 9:00 AM–7:00 PM; Mon–Fri 6:00 PM–8:00 PM (Telehealth only)',
    status: 'Active',
  },
];

// Keep SITES as an alias so existing imports don't break
export const SITES = SITES_FALLBACK;

// ─── Map a DB location record → site object ───────────────────────────────────
function dbLocToSite(loc) {
  const icons = { Primary: '🏥', Satellite: '📍', Virtual: '💻' };
  return {
    id:        loc.id,
    name:      loc.name,
    shortName: loc.shortName || loc.short_name || loc.name,
    type:      loc.type || 'Primary',
    icon:      icons[loc.type] || '🏥',
  };
}

// ─── Role → accessible site IDs ───────────────────────────────────────────────
// 'all' in the array means the role sees every site and may select 'All Sites'.
// prescriber/therapist are restricted to their assigned locationId (set per-user by admin).
const ROLE_SITE_ACCESS = {
  admin:      ['all'],
  front_desk: ['all'],
  nurse:      ['all'],
  prescriber: null, // resolved per-user from currentUser.locationId
  therapist:  null, // resolved per-user from currentUser.locationId
  patient:    [],
};

// ─── Appointment → site mapping ───────────────────────────────────────────────
export function appointmentSiteId(apt) {
  if (!apt) return 'loc1';
  // Use explicit locationId if present
  if (apt.locationId) return apt.locationId;
  // Fall back: derive from visitType for legacy records
  if (apt.visitType === 'Telehealth' || apt.room === 'Virtual') return 'loc4';
  return 'loc1';
}

// ─── Context ─────────────────────────────────────────────────────────────────
const SiteContext = createContext(null);

const STORAGE_KEY = 'clarity_active_site';

const ALL_SITE = { id: 'all', name: 'All Sites', shortName: 'All Sites', type: 'Meta', icon: '🌐' };

export function SiteProvider({ children }) {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  // ── Dynamic site list loaded from backend ────────────────────────────────
  const [dynamicSites, setDynamicSites] = useState(SITES_FALLBACK.filter(s => s.id !== 'all'));

  const loadSites = useCallback(() => {
    locationsApi.list()
      .then(locs => {
        if (Array.isArray(locs) && locs.length > 0) {
          const fromApi = locs.filter(l => l.status !== 'Inactive').map(dbLocToSite);
          const apiIds = new Set(fromApi.map(l => l.id));
          const fallbackOnly = SITES_FALLBACK.filter(l => l.id !== 'all' && !apiIds.has(l.id));
          setDynamicSites([...fromApi, ...fallbackOnly]);
        }
      })
      .catch(() => {
        // Backend offline — keep SITES_FALLBACK as initial state (no localStorage)
      });
  }, []);

  useEffect(() => { loadSites(); }, [loadSites]);

  // Expose reload so MultiLocationManagement can refresh after create/update/delete
  const reloadSites = loadSites;

  // ── Role-based access ────────────────────────────────────────────────────
  const allowedIds = useMemo(() => {
    const base = ROLE_SITE_ACCESS[role];
    if (base !== null && base !== undefined) return base;
    const userLocId = currentUser?.locationId || 'loc1';
    return [userLocId];
  }, [role, currentUser?.locationId]);

  const canSeeAll = allowedIds.includes('all');

  // Full site list: prepend "All Sites" for roles that can see everything
  const allSites = useMemo(
    () => canSeeAll ? [ALL_SITE, ...dynamicSites] : dynamicSites,
    [canSeeAll, dynamicSites]
  );

  // Sites the current user may choose from
  const availableSites = useMemo(
    () => allSites.filter(s => s.id === 'all' ? canSeeAll : (canSeeAll || allowedIds.includes(s.id))),
    [allSites, allowedIds, canSeeAll]
  );

  // ── Active site selection ────────────────────────────────────────────────
  const [activeSiteId, setActiveSiteIdRaw] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return stored;
    } catch { /* ok */ }
    return canSeeAll ? 'all' : (allowedIds[0] || 'loc1');
  });

  const setActiveSite = (siteId) => {
    const permitted = siteId === 'all' ? canSeeAll : (canSeeAll || allowedIds.includes(siteId));
    if (!permitted) return;
    setActiveSiteIdRaw(siteId);
    try { localStorage.setItem(STORAGE_KEY, siteId); } catch { /* ok */ }
  };

  // Reset to a valid site when the logged-in user changes
  useEffect(() => {
    const still = activeSiteId === 'all' ? canSeeAll : (canSeeAll || allowedIds.includes(activeSiteId));
    if (!still) {
      const fallback = canSeeAll ? 'all' : (allowedIds[0] || 'loc1');
      setActiveSite(fallback);
    }
  }, [role, currentUser?.locationId, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeSite = allSites.find(s => s.id === activeSiteId) || allSites[0] || ALL_SITE;
  const isFiltered = activeSiteId !== 'all';

  return (
    <SiteContext.Provider value={{ activeSite, activeSiteId, setActiveSite, availableSites, isFiltered, canSeeAll, reloadSites }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside <SiteProvider>');
  return ctx;
}
