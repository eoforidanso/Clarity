/**
 * PharmacySearch — pharmacy picker backed by the NPI Registry (free, national)
 *
 * Props:
 *   value          { npi, name, address, city, state, zip, phone, fax, pharmacyType } | null
 *   onChange       (pharmacyObj | null) => void
 *   placeholder    string   (optional)
 *   showSetDefault bool
 *   onSetDefault   () => void
 *   compact        bool  (hides city/state/zip filters)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { nppes, PHARMACY_SUBTYPES } from '../services/api';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','PR'];

const TYPE_META = {
  retail:      { label: 'Pharmacy',     bg: '#e0e7ff', color: '#3730a3' },
  clinic:      { label: 'Clinic',       bg: '#fce7f3', color: '#9d174d' },
  compounding: { label: 'Compounding',  bg: '#fef9c3', color: '#854d0e' },
  mail:        { label: 'Mail Order',   bg: '#dcfce7', color: '#166534' },
};

function NpiBadge({ npi }) {
  if (!npi) return null;
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#e0e7ff', color: '#3730a3' }}>NPI {npi}</span>;
}
function TypeBadge({ type }) {
  const m = TYPE_META[type];
  if (!m || type === 'retail') return null;
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: m.bg, color: m.color }}>{m.label}</span>;
}

export default function PharmacySearch({
  value,
  onChange,
  placeholder = 'Search by name, ZIP, city, or NPI…',
  showSetDefault = false,
  onSetDefault,
  compact = false,
  defaultQuery = '',
  defaultCity  = '',
  defaultZip   = '',
}) {
  const [open, setOpen]         = useState(!value);
  const [q, setQ]               = useState(defaultQuery);
  const [city, setCity]         = useState(defaultCity);
  const [state, setState]       = useState('');
  const [zip, setZip]           = useState(defaultZip);
  const [subtype, setSubtype]   = useState('');        // '' = all subtypes
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const debounce = useRef(null);
  const inputRef = useRef(null);

  // Re-seed search fields when defaults arrive (e.g. patient loaded after mount)
  useEffect(() => {
    if (!value) {
      if (defaultQuery) setQ(q => q || defaultQuery);
      if (defaultCity)  setCity(c => c || defaultCity);
      if (defaultZip)   setZip(z => z || defaultZip);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultQuery, defaultCity, defaultZip]);

  const search = useCallback(() => {
    const hasQuery = q.trim() || city.trim() || state || zip.trim();
    if (!hasQuery) { setResults([]); setError(''); return; }
    if ((q.trim().length === 1) && !city.trim() && !state && !zip.trim()) return;

    setLoading(true);
    setError('');
    nppes.searchPharmacies({
      search: q.trim() || zip.trim(),
      city:   city.trim(),
      state,
      subtype,
    })
      .then(data => {
        setResults(data.results || []);
        if ((data.results || []).length === 0 && hasQuery) {
          setError('No pharmacies found — try a broader name, different city, or ZIP.');
        }
      })
      .catch(() => setError('NPI Registry unavailable. Please try again.'))
      .finally(() => setLoading(false));
  }, [q, city, state, zip, subtype]);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(search, 350);
    return () => clearTimeout(debounce.current);
  }, [search]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const select = (ph) => {
    onChange(ph);
    setOpen(false);
    setQ(''); setCity(''); setState(''); setZip('');
    setResults([]);
  };


  const clear = () => { onChange(null); setOpen(true); setResults([]); setError(''); };

  // ── Selected state ──────────────────────────────────────────────────────────
  if (value && !open) {
    const fullAddr = [value.address, value.city, value.state, value.zip].filter(Boolean).join(', ');
    return (
      <div style={{ border: '1.5px solid #4f46e5', borderRadius: 8, padding: '10px 14px', background: '#eff6ff' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 18, marginTop: 1 }}>🏥</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{value.name}</div>
            {fullAddr && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>📍 {fullAddr}</div>}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
              <NpiBadge npi={value.npi} />
              <TypeBadge type={value.pharmacyType} />
              {value.distanceMiles != null && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#f0fdf4', color: '#16a34a' }}>
                  {value.distanceMiles} mi
                </span>
              )}
              {value.phone && <span style={{ fontSize: 10, color: '#64748b' }}>📞 {value.phone}</span>}
              {value.fax   && <span style={{ fontSize: 10, color: '#64748b' }}>📠 {value.fax}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
            {showSetDefault && onSetDefault && (
              <button type="button" onClick={onSetDefault}
                style={{ fontSize: 11, padding: '4px 9px', borderRadius: 6, border: '1px solid #c7d2fe', background: '#fff', color: '#4f46e5', cursor: 'pointer', fontWeight: 600 }}>
                ⭐ Set default
              </button>
            )}
            <button type="button" onClick={() => setOpen(true)}
              style={{ fontSize: 11, padding: '4px 9px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer' }}>
              Change
            </button>
            <button type="button" onClick={clear}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#94a3b8', lineHeight: 1 }}>×</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Search state ────────────────────────────────────────────────────────────
  const hasQuery = q.trim() || city.trim() || state || zip.trim();

  return (
    <div>
      {/* Search bar */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        <input
          ref={inputRef}
          style={{ flex: '2 1 180px', minWidth: 150, height: 34, border: '1.5px solid #cbd5e1', borderRadius: 7, padding: '0 10px', fontSize: 12 }}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={placeholder}
        />
        {!compact && (
          <>
            <input
              style={{ flex: '1 1 110px', minWidth: 90, height: 34, border: '1.5px solid #cbd5e1', borderRadius: 7, padding: '0 10px', fontSize: 12 }}
              value={city} onChange={e => setCity(e.target.value)} placeholder="City"
            />
            <select
              style={{ width: 72, height: 34, border: '1.5px solid #cbd5e1', borderRadius: 7, padding: '0 6px', fontSize: 12, background: '#fff' }}
              value={state} onChange={e => setState(e.target.value)}>
              <option value="">State</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input
              style={{ width: 80, height: 34, border: '1.5px solid #cbd5e1', borderRadius: 7, padding: '0 10px', fontSize: 12 }}
              value={zip} onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="ZIP"
            />
          </>
        )}
      </div>

      {/* Type filter */}
      {!compact && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>Type:</span>
          {[['', 'All'], ...Object.entries(PHARMACY_SUBTYPES)].map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => setSubtype(code)}
              style={{
                fontSize: 11, padding: '3px 9px', borderRadius: 5, cursor: 'pointer', fontWeight: 600,
                border: `1px solid ${subtype === code ? '#4f46e5' : '#e2e8f0'}`,
                background: subtype === code ? '#eff6ff' : '#fff',
                color: subtype === code ? '#4f46e5' : '#64748b',
              }}
            >
              {label}
            </button>
          ))}
          {value && (
            <button type="button" onClick={() => setOpen(false)}
              style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Status */}
      {loading && (
        <div style={{ fontSize: 12, color: '#64748b', padding: '8px 0', fontStyle: 'italic' }}>
          🔍 Searching NPI Registry…
        </div>
      )}
      {!loading && error && (
        <div style={{ fontSize: 12, color: '#94a3b8', padding: '8px 0' }}>{error}</div>
      )}

      {/* Prompt */}
      {!hasQuery && !loading && (
        <div style={{ fontSize: 12, color: '#94a3b8', padding: '6px 0' }}>
          Enter a pharmacy name, ZIP code, city, or 10-digit NPI to search the national registry.
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 360, overflowY: 'auto' }}>
          {results.map(ph => <ResultRow key={ph.id} ph={ph} onSelect={select} />)}
          {results.length >= 200 && (
            <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: '6px 0' }}>
              Showing first 200 results — narrow your search for more precise results.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultRow({ ph, onSelect }) {
  const [hover, setHover] = useState(false);
  const fullAddr = [ph.address, ph.city, ph.state, ph.zip].filter(Boolean).join(', ');
  return (
    <div
      onClick={() => onSelect(ph)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px',
        border: `1.5px solid ${hover ? '#4f46e5' : '#e2e8f0'}`,
        borderRadius: 8, cursor: 'pointer',
        background: hover ? '#f5f3ff' : '#fff',
        transition: 'border-color 0.12s, background 0.12s',
      }}
    >
      <span style={{ fontSize: 16, marginTop: 1 }}>🏥</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: '#1e293b' }}>{ph.name}</div>
        {fullAddr && (
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {fullAddr}{ph.phone ? ` · ${ph.phone}` : ''}
          </div>
        )}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
          <NpiBadge npi={ph.npi} />
          <TypeBadge type={ph.pharmacyType} />
          {ph.distanceMiles != null && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#f0fdf4', color: '#16a34a' }}>
              {ph.distanceMiles} mi
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
