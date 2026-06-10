import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ILLINOIS_PHARMACIES, getProximityInfo } from '../data/illinoisPharmacies';

// ─── Palette ──────────────────────────────────────────────────────────────────
const BG          = '#1a1f2e';
const BG2         = '#232838';
const COL_BORDER  = 'rgba(255,255,255,0.08)';
const ITEM_DEF    = 'rgba(255,255,255,0.03)';
const ITEM_HOV    = 'rgba(255,255,255,0.08)';
const ITEM_SEL    = 'rgba(255,255,255,0.13)';
const T_PRI       = 'rgba(255,255,255,0.95)';
const T_SEC       = 'rgba(255,255,255,0.60)';
const T_MUT       = 'rgba(255,255,255,0.40)';
const ACCENT      = '#6366f1';
const ACCENT_HOV  = '#4f46e5';

const TODAY_IDX = new Date().getDay(); // 0=Sun
const DAY_KEYS  = ['sun','mon','tue','wed','thu','fri','sat'];
const DAY_ORDER = ['mon','tue','wed','thu','fri','sat','sun'];
const DAY_LABEL = { mon:'Monday', tue:'Tuesday', wed:'Wednesday', thu:'Thursday', fri:'Friday', sat:'Saturday', sun:'Sunday' };
const TODAY     = DAY_KEYS[TODAY_IDX];

// ─── Badge Component ──────────────────────────────────────────────────────────
const BADGE_MAP = {
  erx:  { bg: '#3b82f6', label: 'eRx'  },
  epcs: { bg: '#8b5cf6', label: 'EPCS' },
  h24:  { bg: '#10b981', label: '24/7' },
  mail: { bg: '#06b6d4', label: 'Mail' },
};
function Badge({ type }) {
  const b = BADGE_MAP[type];
  if (!b) return null;
  return (
    <span style={{ background: b.bg, color: '#fff', fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 6, letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
      {b.label}
    </span>
  );
}

// ─── Pharmacy Master Data ─────────────────────────────────────────────────────
const ALL_PHARMACIES = ILLINOIS_PHARMACIES;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }) {
  return (
    <div style={{ padding: '14px 16px 5px', fontSize: 11, fontWeight: 700, color: T_MUT, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
      {label}
    </div>
  );
}

function PharmItem({ ph, focused, selected, onClick, distLabel }) {
  const [hov, setHov] = useState(false);
  const bg = selected ? ITEM_SEL : (hov || focused) ? ITEM_HOV : ITEM_DEF;
  const addrLine = ph.address1 !== 'On-site'
    ? `${ph.city}${ph.state ? `, ${ph.state}` : ''} ${ph.zip}`
    : 'On-site facility';
  // Resolve best distance label: dynamic proximity > static field
  const dist = distLabel ?? (ph.distanceMiles != null ? `${ph.distanceMiles} mi` : null);
  return (
    <div
      role="option"
      aria-selected={selected}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '10px 14px', margin: '1px 8px', borderRadius: 8, cursor: 'pointer',
        background: bg, transition: 'background 0.1s',
        borderLeft: selected ? `3px solid ${ACCENT}` : '3px solid transparent',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: T_PRI, fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ph.name}
          </div>
          <div style={{ color: T_SEC, fontSize: 11.5, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{addrLine}</span>
            {dist && (
              <span style={{ color: '#4ade80', fontSize: 10.5, fontWeight: 600, background: 'rgba(74,222,128,0.12)', padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>
                {dist}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 96 }}>
          {ph.capabilities.erx  && <Badge type="erx"  />}
          {ph.capabilities.epcs && <Badge type="epcs" />}
          {ph.open24h           && <Badge type="h24"  />}
          {ph.capabilities.mailOrder && <Badge type="mail" />}
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ color: T_MUT, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function ContactRow({ icon, label, value, onCopy, isCopied }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
      <span style={{ fontSize: 14, width: 18 }}>{icon}</span>
      <span style={{ color: T_SEC, fontSize: 12, minWidth: 38 }}>{label}</span>
      <span style={{ color: T_PRI, fontSize: 13, flex: 1 }}>{value}</span>
      <button
        onClick={onCopy}
        style={{
          background: 'none', border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 5,
          color: isCopied ? '#4ade80' : T_MUT, fontSize: 10.5, padding: '2px 7px', cursor: 'pointer',
          transition: 'color 0.2s',
        }}
      >
        {isCopied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}

function CapRow({ label, active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <span style={{ color: active ? '#4ade80' : 'rgba(255,255,255,0.18)', fontSize: 15, lineHeight: 1 }}>
        {active ? '✓' : '✕'}
      </span>
      <span style={{ color: active ? T_PRI : T_SEC, fontSize: 12.5 }}>{label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PharmacySelectorDrawer({
  isOpen,
  onClose,
  onSelect,
  onSetDefault,
  selectedId      = null,
  defaultId       = null,
  recentlyUsedIds = [],
  patientAddress  = null,   // { street?, city, state, zip }
}) {
  const [searchInput,   setSearchInput]   = useState('');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [detail,        setDetail]        = useState(null);   // selected pharmacy object
  const [focusedIdx,    setFocusedIdx]    = useState(0);
  const [showHours,     setShowHours]     = useState(false);
  const [copied,        setCopied]        = useState('');
  const [defaultSet,    setDefaultSet]    = useState(false);
  const debRef  = useRef(null);
  const searchRef = useRef(null);
  const listRef   = useRef(null);

  // Focus search when drawer opens
  useEffect(() => {
    if (isOpen) {
      setSearchInput(''); setSearchQuery('');
      setDetail(null); setFocusedIdx(0); setShowHours(false); setDefaultSet(false);
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Debounce
  const handleSearchChange = (e) => {
    const v = e.target.value;
    setSearchInput(v);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => { setSearchQuery(v); setFocusedIdx(0); }, 250);
  };

  // ── Proximity map (memoised — only recomputes when patientAddress changes) ──
  const proximityMap = useMemo(() => {
    if (!patientAddress?.city && !patientAddress?.zip) return null;
    const map = new Map();
    for (const ph of ALL_PHARMACIES) {
      map.set(ph.id, getProximityInfo(patientAddress, ph));
    }
    return map;
  }, [patientAddress]);

  // ── Filtered list (search) ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const matches = ALL_PHARMACIES.filter(ph =>
      ph.name.toLowerCase().includes(q) ||
      ph.city.toLowerCase().includes(q) ||
      ph.state.toLowerCase().includes(q) ||
      ph.zip.includes(q) ||
      ph.phone.replace(/\D/g,'').includes(q.replace(/\D/g,'')) ||
      ph.npi.includes(q)
    );
    // Sort search results by proximity if we have patient address
    if (proximityMap) {
      matches.sort((a, b) => (proximityMap.get(a.id)?.score ?? 99) - (proximityMap.get(b.id)?.score ?? 99));
    }
    return matches;
  }, [searchQuery, proximityMap]);

  // ── Categorised list ──────────────────────────────────────────────────────
  const recentList = useMemo(() =>
    ALL_PHARMACIES
      .filter(ph => ph.lastUsedAt || recentlyUsedIds.includes(ph.id))
      .sort((a, b) => (b.lastUsedAt||0) - (a.lastUsedAt||0)),
  [recentlyUsedIds]);

  const favList = useMemo(() =>
    ALL_PHARMACIES.filter(ph => ph.isFavorite && !recentList.includes(ph)),
  [recentList]);

  // nearbyList: when patient address known → ALL remaining pharmacies sorted by
  // proximity (score asc), then alphabetically; no distance filter so provider
  // can always see the full state.  Without address → original category filter.
  const nearbyList = useMemo(() => {
    const excluded = new Set([...recentList, ...favList].map(p => p.id));
    const pool = ALL_PHARMACIES.filter(ph => !excluded.has(ph.id) && ph.category !== 'mail');
    if (proximityMap) {
      return [...pool].sort((a, b) => {
        const sa = proximityMap.get(a.id)?.score ?? 99;
        const sb = proximityMap.get(b.id)?.score ?? 99;
        if (sa !== sb) return sa - sb;
        return a.name.localeCompare(b.name);
      });
    }
    // Fallback: original static sort by category + distanceMiles
    return pool
      .filter(ph => ph.category === 'nearby')
      .sort((a, b) => (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999));
  }, [recentList, favList, proximityMap]);

  const mailList = useMemo(() =>
    ALL_PHARMACIES.filter(ph => ph.category === 'mail'),
  []);

  // ── Nearby section label ──────────────────────────────────────────────────
  const nearbyLabel = patientAddress?.city
    ? `Near ${patientAddress.city}${patientAddress.zip ? ', ' + patientAddress.zip : ''}`
    : 'Pharmacies';

  // ── Flat list for keyboard nav ────────────────────────────────────────────
  const visibleList = filtered ?? [
    ...recentList, ...favList, ...nearbyList, ...mailList,
  ];

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, visibleList.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && visibleList[focusedIdx]) { setDetail(visibleList[focusedIdx]); setShowHours(false); }
    else if (e.key === 'Escape') { onClose(); }
  };

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(''), 1800);
  };

  const handleSelect = () => {
    if (!detail) return;
    onSelect(detail);
    onClose();
  };

  const handleSetDefault = () => {
    if (!detail) return;
    onSetDefault?.(detail);
    setDefaultSet(true);
  };

  if (!isOpen) return null;

  const isMail = detail?.hours?.mon === '24/7 service';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1200 }}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-label="Select Pharmacy"
        onKeyDown={handleKeyDown}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 720,
          background: BG, zIndex: 1201, display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.45)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${COL_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ color: T_PRI, fontWeight: 700, fontSize: 16 }}>💊 Select Pharmacy</div>
            <div style={{ color: T_MUT, fontSize: 12, marginTop: 2 }}>
              {patientAddress?.city
                ? <>Showing pharmacies near <span style={{ color: T_SEC, fontWeight: 600 }}>{patientAddress.city}{patientAddress.zip ? `, ${patientAddress.zip}` : ''}</span></>
                : 'Search and select a pharmacy for this prescription'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T_MUT, fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '2px 6px', borderRadius: 4 }}>✕</button>
        </div>

        {/* ── Body: two columns ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* ── Left Column ── */}
          <div style={{ width: 360, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${COL_BORDER}`, overflow: 'hidden', flexShrink: 0 }}>

            {/* Search */}
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${COL_BORDER}`, flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: T_MUT, fontSize: 14, pointerEvents: 'none' }}>🔍</span>
                <input
                  ref={searchRef}
                  value={searchInput}
                  onChange={handleSearchChange}
                  placeholder="Search pharmacies…"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.12)`,
                    borderRadius: 8, padding: '9px 12px 9px 34px',
                    color: T_PRI, fontSize: 13, outline: 'none',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.6)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                />
              </div>
            </div>

            {/* List */}
            <div ref={listRef} style={{ flex: 1, overflowY: 'auto', paddingBottom: 12 }}>
              {filtered !== null ? (
                /* ── Search results ── */
                filtered.length === 0 ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 36 }}>🔍</div>
                    <div style={{ color: T_PRI, fontWeight: 600, fontSize: 14, marginTop: 10 }}>No pharmacies found</div>
                    <div style={{ color: T_MUT, fontSize: 12, marginTop: 4 }}>Try searching by name, ZIP code, or city.</div>
                  </div>
                ) : (
                  <>
                    <SectionHeader label={`Results (${filtered.length})`} />
                    {filtered.map((ph, i) => (
                      <PharmItem
                        key={ph.id} ph={ph}
                        focused={focusedIdx === i}
                        selected={detail?.id === ph.id}
                        distLabel={proximityMap?.get(ph.id)?.label}
                        onClick={() => { setDetail(ph); setShowHours(false); setDefaultSet(false); }}
                      />
                    ))}
                  </>
                )
              ) : (
                /* ── Categorised ── */
                <>
                  {recentList.length > 0 && (
                    <>
                      <SectionHeader label="Recently Used" />
                      {recentList.map(ph => (
                        <PharmItem
                          key={ph.id} ph={ph}
                          focused={false}
                          selected={detail?.id === ph.id}
                          distLabel={proximityMap?.get(ph.id)?.label}
                          onClick={() => { setDetail(ph); setShowHours(false); setDefaultSet(false); }}
                        />
                      ))}
                    </>
                  )}
                  {favList.length > 0 && (
                    <>
                      <SectionHeader label="Favorites" />
                      {favList.map(ph => (
                        <PharmItem
                          key={ph.id} ph={ph}
                          focused={false}
                          selected={detail?.id === ph.id}
                          distLabel={proximityMap?.get(ph.id)?.label}
                          onClick={() => { setDetail(ph); setShowHours(false); setDefaultSet(false); }}
                        />
                      ))}
                    </>
                  )}
                  {nearbyList.length > 0 && (
                    <>
                      <SectionHeader label={nearbyLabel} />
                      {nearbyList.map(ph => (
                        <PharmItem
                          key={ph.id} ph={ph}
                          focused={false}
                          selected={detail?.id === ph.id}
                          distLabel={proximityMap?.get(ph.id)?.label}
                          onClick={() => { setDetail(ph); setShowHours(false); setDefaultSet(false); }}
                        />
                      ))}
                    </>
                  )}
                  {mailList.length > 0 && (
                    <>
                      <SectionHeader label="Mail-Order Pharmacies" />
                      {mailList.map(ph => (
                        <PharmItem
                          key={ph.id} ph={ph}
                          focused={false}
                          selected={detail?.id === ph.id}
                          onClick={() => { setDetail(ph); setShowHours(false); setDefaultSet(false); }}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Right Column ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {!detail ? (
              /* Empty state */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 36, textAlign: 'center' }}>
                <div style={{ fontSize: 52, opacity: 0.4 }}>💊</div>
                <div style={{ color: T_PRI, fontWeight: 600, fontSize: 15 }}>Select a pharmacy</div>
                <div style={{ color: T_MUT, fontSize: 13, maxWidth: 220, lineHeight: 1.6 }}>
                  Pick a pharmacy from the list to view details and use it for this prescription.
                </div>
              </div>
            ) : (
              <>
                {/* Detail header */}
                <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${COL_BORDER}`, flexShrink: 0 }}>
                  <div style={{ color: T_PRI, fontWeight: 700, fontSize: 17, lineHeight: 1.3 }}>{detail.name}</div>
                  {(detail.npi || detail.ncpdp) && (
                    <div style={{ color: T_MUT, fontSize: 11.5, marginTop: 4, letterSpacing: '0.2px' }}>
                      {detail.npi && `NPI: ${detail.npi}`}
                      {detail.npi && detail.ncpdp && '  ·  '}
                      {detail.ncpdp && `NCPDP: ${detail.ncpdp}`}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
                    {detail.capabilities.erx        && <Badge type="erx"  />}
                    {detail.capabilities.epcs       && <Badge type="epcs" />}
                    {detail.open24h                 && <Badge type="h24"  />}
                    {detail.capabilities.mailOrder  && <Badge type="mail" />}
                  </div>
                </div>

                {/* Detail body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

                  {/* Address */}
                  <Section label="Address">
                    <div style={{ color: T_PRI, fontSize: 13, lineHeight: 1.7 }}>
                      {detail.address1}
                      {detail.address2 && `, ${detail.address2}`}
                      <br />
                      {detail.city}{detail.state ? `, ${detail.state}` : ''} {detail.zip}
                    </div>
                    {detail.address1 !== 'On-site' && detail.zip && (
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(`${detail.address1}, ${detail.city}, ${detail.state} ${detail.zip}`)}`}
                        target="_blank" rel="noreferrer"
                        style={{ display: 'inline-block', marginTop: 6, color: '#60a5fa', fontSize: 12, textDecoration: 'none' }}
                      >
                        📍 Open in Maps →
                      </a>
                    )}
                  </Section>

                  {/* Contact */}
                  {(detail.phone || detail.fax) && (
                    <Section label="Contact">
                      <ContactRow icon="📞" label="Phone" value={detail.phone}
                        onCopy={() => copy(detail.phone, 'phone')} isCopied={copied === 'phone'} />
                      <ContactRow icon="📠" label="Fax"   value={detail.fax}
                        onCopy={() => copy(detail.fax, 'fax')} isCopied={copied === 'fax'} />
                    </Section>
                  )}

                  {/* Capabilities */}
                  <Section label="Capabilities">
                    <CapRow label="eRx (Electronic Prescribing)"             active={detail.capabilities.erx} />
                    <CapRow label="EPCS (Controlled Substance e-Prescribing)" active={detail.capabilities.epcs} />
                    <CapRow label="Accepts Controlled Substances"             active={detail.capabilities.controlledSubstances} />
                    <CapRow label="Mail-Order Service"                        active={detail.capabilities.mailOrder} />
                  </Section>

                  {/* Hours */}
                  <Section label="Hours">
                    {isMail ? (
                      <div style={{ color: T_SEC, fontSize: 13 }}>Mail-order — orders processed 24 / 7</div>
                    ) : (
                      <>
                        <div style={{ fontSize: 13, color: T_PRI, marginBottom: 6 }}>
                          <span style={{ fontWeight: 600 }}>Today ({DAY_LABEL[TODAY]}): </span>
                          <span style={{ color: '#4ade80', fontWeight: 600 }}>{detail.hours[TODAY] || 'Closed'}</span>
                        </div>
                        <button
                          onClick={() => setShowHours(v => !v)}
                          style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 6 }}
                        >
                          {showHours ? '▲ Hide full schedule' : '▼ Show full schedule'}
                        </button>
                        {showHours && (
                          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 7, padding: '8px 12px', marginTop: 4 }}>
                            {DAY_ORDER.map((d, i) => (
                              <div key={d} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < 6 ? `1px solid ${COL_BORDER}` : 'none' }}>
                                <span style={{ color: d === TODAY ? T_PRI : T_SEC, fontSize: 12, fontWeight: d === TODAY ? 700 : 400 }}>{DAY_LABEL[d]}</span>
                                <span style={{ color: d === TODAY ? '#4ade80' : T_SEC, fontSize: 12, fontWeight: d === TODAY ? 700 : 400 }}>{detail.hours[d] || 'Closed'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </Section>
                </div>

                {/* Action buttons */}
                <div style={{ padding: '14px 20px', borderTop: `1px solid ${COL_BORDER}`, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={handleSelect}
                    style={{ width: '100%', height: 44, background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseOver={e => { e.currentTarget.style.background = ACCENT_HOV; }}
                    onMouseOut={e => { e.currentTarget.style.background = ACCENT; }}
                  >
                    Use This Pharmacy
                  </button>
                  <button
                    onClick={handleSetDefault}
                    style={{ width: '100%', height: 40, background: 'transparent', color: defaultSet ? '#4ade80' : T_PRI, border: `1px solid ${defaultSet ? '#4ade80' : 'rgba(255,255,255,0.20)'}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseOver={e => { if (!defaultSet) e.currentTarget.style.background = ITEM_HOV; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {defaultSet ? '✓ Set as Default' : '⭐ Set as Default Pharmacy'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
