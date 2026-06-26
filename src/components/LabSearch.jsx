/**
 * LabSearch — lab facility picker backed by the NPI Registry (free, national)
 *
 * Props:
 *   value          { npi, name, address, city, state, zip, phone, cliaNumber, labType, distanceMiles } | null
 *   onChange       (labObj | null) => void
 *   defaultQuery   string  pre-fill name search
 *   defaultCity    string  pre-fill city filter
 *   defaultZip     string  pre-fill ZIP filter
 *   compact        bool    hides city/state/zip filter row
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { nppes } from '../services/api';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','PR'];

const TYPE_META = {
  clinical:  { label: 'Clinical Lab', bg: '#dbeafe', color: '#1d4ed8' },
  hospital:  { label: 'Hospital Lab', bg: '#ede9fe', color: '#6d28d9' },
  radiology: { label: 'Radiology',    bg: '#fce7f3', color: '#9d174d' },
  military:  { label: 'Military',     bg: '#f1f5f9', color: '#475569' },
};

function NpiBadge({ npi }) {
  if (!npi) return null;
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#e0e7ff', color: '#3730a3' }}>NPI {npi}</span>;
}

function CliaBadge({ clia }) {
  if (!clia) return null;
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#ecfdf5', color: '#065f46' }}>CLIA {clia}</span>;
}

function TypeBadge({ type }) {
  const m = TYPE_META[type];
  if (!m || type === 'clinical') return null;
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: m.bg, color: m.color }}>{m.label}</span>;
}

export default function LabSearch({
  value,
  onChange,
  placeholder  = 'Search by lab name, ZIP, city, or NPI…',
  compact      = false,
  defaultQuery = '',
  defaultCity  = '',
  defaultZip   = '',
}) {
  const [open, setOpen]       = useState(!value);
  const [q, setQ]             = useState(defaultQuery);
  const [city, setCity]       = useState(defaultCity);
  const [state, setState]     = useState('');
  const [zip, setZip]         = useState(defaultZip);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const debounce = useRef(null);
  const inputRef = useRef(null);

  // Re-seed search when patient data arrives after mount
  useEffect(() => {
    if (!value) {
      if (defaultQuery) setQ(prev => prev || defaultQuery);
      if (defaultCity)  setCity(prev => prev || defaultCity);
      if (defaultZip)   setZip(prev => prev || defaultZip);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultQuery, defaultCity, defaultZip]);

  const search = useCallback(() => {
    const hasQuery = q.trim() || city.trim() || state || zip.trim();
    if (!hasQuery) { setResults([]); setError(''); return; }
    if (q.trim().length === 1 && !city.trim() && !state && !zip.trim()) return;

    setLoading(true);
    setError('');
    nppes.searchLabs({ search: q.trim() || zip.trim(), city: city.trim(), state })
      .then(data => {
        setResults(data.results || []);
        if ((data.results || []).length === 0 && hasQuery) {
          setError('No labs found — try a broader name, different city, or ZIP.');
        }
      })
      .catch(() => setError('NPI Registry unavailable. Please try again.'))
      .finally(() => setLoading(false));
  }, [q, city, state, zip]);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(search, 350);
    return () => clearTimeout(debounce.current);
  }, [search]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const select = (lab) => {
    onChange(lab);
    setOpen(false);
    setQ(''); setCity(''); setState(''); setZip('');
    setResults([]);
  };

  const clear = () => {
    onChange(null);
    setOpen(true);
    setResults([]);
    setError('');
    setQ(defaultQuery || '');
    setCity(defaultCity || '');
    setZip(defaultZip || '');
  };

  // ── Selected state ───────────────────────────────────────────────────────────
  if (value && !open) {
    const fullAddr = [value.address, value.city, value.state, value.zip].filter(Boolean).join(', ');
    return (
      <div style={{ border: '1.5px solid #0891b2', borderRadius: 8, padding: '10px 14px', background: '#ecfeff' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 18, marginTop: 1 }}>🧪</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{value.name}</div>
            {fullAddr && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>📍 {fullAddr}</div>}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
              <NpiBadge npi={value.npi} />
              <CliaBadge clia={value.cliaNumber} />
              <TypeBadge type={value.labType} />
              {value.distanceMiles != null && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#f0fdf4', color: '#16a34a' }}>
                  {value.distanceMiles} mi
                </span>
              )}
              {value.phone && <span style={{ fontSize: 10, color: '#64748b' }}>📞 {value.phone}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
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

  // ── Search state ─────────────────────────────────────────────────────────────
  const hasQuery = q.trim() || city.trim() || state || zip.trim();

  return (
    <div>
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
        {value && (
          <button type="button" onClick={() => setOpen(false)}
            style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'center' }}>
            Cancel
          </button>
        )}
      </div>

      {loading && (
        <div style={{ fontSize: 12, color: '#64748b', padding: '8px 0', fontStyle: 'italic' }}>
          🔍 Searching NPI Registry…
        </div>
      )}
      {!loading && error && (
        <div style={{ fontSize: 12, color: '#94a3b8', padding: '8px 0' }}>{error}</div>
      )}
      {!hasQuery && !loading && (
        <div style={{ fontSize: 12, color: '#94a3b8', padding: '6px 0' }}>
          Enter a lab name, ZIP code, city, or 10-digit NPI to search the national registry.
        </div>
      )}

      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 360, overflowY: 'auto' }}>
          {results.map(lab => <LabResultRow key={lab.id || lab.npi} lab={lab} onSelect={select} />)}
        </div>
      )}
    </div>
  );
}

function LabResultRow({ lab, onSelect }) {
  const [hover, setHover] = useState(false);
  const fullAddr = [lab.address, lab.city, lab.state, lab.zip].filter(Boolean).join(', ');
  return (
    <div
      onClick={() => onSelect(lab)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px',
        border: `1.5px solid ${hover ? '#0891b2' : '#e2e8f0'}`,
        borderRadius: 8, cursor: 'pointer',
        background: hover ? '#ecfeff' : '#fff',
        transition: 'border-color 0.12s, background 0.12s',
      }}
    >
      <span style={{ fontSize: 16, marginTop: 1 }}>🧪</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: '#1e293b' }}>{lab.name}</div>
        {fullAddr && (
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {fullAddr}{lab.phone ? ` · ${lab.phone}` : ''}
          </div>
        )}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
          <NpiBadge npi={lab.npi} />
          <CliaBadge clia={lab.cliaNumber} />
          <TypeBadge type={lab.labType} />
          {lab.distanceMiles != null && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#f0fdf4', color: '#16a34a' }}>
              {lab.distanceMiles} mi
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
