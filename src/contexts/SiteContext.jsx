import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';

// ─── Site Definitions ─────────────────────────────────────────────────────────
// Canonical list — used by Header, Schedule, MultiLocationManagement, etc.
export const SITES = [
  { id: 'all',  name: 'All Sites',                shortName: 'All Sites',   type: 'Meta',      icon: '🌐' },
  { id: 'loc1', name: 'Clarity — Main Office',     shortName: 'Main Office', type: 'Primary',   icon: '🏥' },
  { id: 'loc2', name: 'Clarity — West Loop',       shortName: 'West Loop',   type: 'Satellite', icon: '📍' },
  { id: 'loc3', name: 'Clarity — Evanston',        shortName: 'Evanston',    type: 'Satellite', icon: '📍' },
  { id: 'loc4', name: 'Clarity — Telehealth Only', shortName: 'Telehealth',  type: 'Virtual',   icon: '💻' },
];

// ─── Role → accessible site IDs ───────────────────────────────────────────────
// 'all' in the array means the role sees every site and may select 'All Sites'.
const ROLE_SITE_ACCESS = {
  front_desk: ['all'],
  nurse:      ['all'],
  prescriber: ['loc1', 'loc2', 'loc4'],
  therapist:  ['loc1', 'loc2', 'loc4'],
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

export function SiteProvider({ children }) {
  const { currentUser } = useAuth();

  const role = currentUser?.role;

  // Which site IDs this role may access
  const allowedIds = useMemo(() => ROLE_SITE_ACCESS[role] || ['loc1'], [role]);
  const canSeeAll  = allowedIds.includes('all');

  // Sites the current user may choose from (always includes 'all' when canSeeAll)
  const availableSites = useMemo(
    () => SITES.filter(s => s.id === 'all' ? canSeeAll : (canSeeAll || allowedIds.includes(s.id))),
    [allowedIds, canSeeAll]
  );

  // Initialise from localStorage; fall back to a sensible default per role
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

  // When the logged-in user changes, ensure the stored site is still valid
  useEffect(() => {
    const still = activeSiteId === 'all' ? canSeeAll : (canSeeAll || allowedIds.includes(activeSiteId));
    if (!still) {
      const fallback = canSeeAll ? 'all' : (allowedIds[0] || 'loc1');
      setActiveSite(fallback);
    }
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeSite = SITES.find(s => s.id === activeSiteId) || SITES[0];
  const isFiltered  = activeSiteId !== 'all';

  return (
    <SiteContext.Provider value={{ activeSite, activeSiteId, setActiveSite, availableSites, isFiltered, canSeeAll }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside <SiteProvider>');
  return ctx;
}
