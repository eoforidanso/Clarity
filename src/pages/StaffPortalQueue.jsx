import React, { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';

function authHeaders() {
  const token = localStorage.getItem('ehr_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

const CONF_COLOR = { high: '#16a34a', medium: '#d97706', low: '#dc2626' };
const CONF_BG    = { high: '#f0fdf4', medium: '#fffbeb', low: '#fef2f2' };
const CONF_LABEL = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' };

// ── Confidence badge ──────────────────────────────────────────────────────────
function ConfBadge({ confidence, score }) {
  const c = CONF_COLOR[confidence] || '#6b7280';
  const bg = CONF_BG[confidence] || '#f9fafb';
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: c, background: bg,
      border: `1px solid ${c}33`, borderRadius: 4, padding: '2px 7px' }}>
      {CONF_LABEL[confidence]} ({score}/7)
    </span>
  );
}

// ── Patient suggestion row ────────────────────────────────────────────────────
function SuggestionRow({ patient, onSelect, selected }) {
  return (
    <div
      onClick={() => onSelect(patient)}
      style={{
        padding: '12px 14px', borderRadius: 8, marginBottom: 8, cursor: 'pointer',
        border: selected ? '2px solid #0060b6' : '1.5px solid #e2e8f0',
        background: selected ? '#eff6ff' : '#fff',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0e1e30' }}>{patient.name}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
            MRN {patient.mrn} · DOB {patient.dob || '—'} · {patient.phone || '—'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{patient.email || '—'} · ZIP {patient.zip || '—'}</div>
        </div>
        <ConfBadge confidence={patient.confidence} score={patient.score} />
      </div>
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({ account, onApprove, onDeny, onClose, acting }) {
  const [selectedPatient, setSelectedPatient]   = useState(null);
  const [searchQ, setSearchQ]                   = useState('');
  const [searchResults, setSearchResults]       = useState([]);
  const [searching, setSearching]               = useState(false);
  const [denyReason, setDenyReason]             = useState('');
  const [showDenyForm, setShowDenyForm]         = useState(false);
  const [note, setNote]                         = useState('');

  // Auto-select highest-confidence suggestion if there is one
  useEffect(() => {
    setSelectedPatient(account.suggestions[0] ?? null);
    setSearchQ(''); setSearchResults([]); setDenyReason(''); setShowDenyForm(false); setNote('');
  }, [account.id]);

  const search = useCallback(async (q) => {
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const r = await fetch(`${API}/patient-portal/admin/queue/patients/search?q=${encodeURIComponent(q)}`,
        { headers: authHeaders() });
      setSearchResults(await r.json());
    } finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(searchQ), 300);
    return () => clearTimeout(t);
  }, [searchQ, search]);

  const canApprove = !!selectedPatient && !acting;

  return (
    <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', background: '#fff', borderLeft: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0e1e30' }}>
            {account.firstName} {account.lastName}
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
            {account.email} · Waiting {account.waitDays}d
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 20 }}>✕</button>
      </div>

      {/* Submitted demographics */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, color: '#445568', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
          Patient submitted
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
          {[
            ['Name',  `${account.firstName} ${account.lastName}`],
            ['DOB',   account.dob || '—'],
            ['Phone', account.phone || '—'],
            ['ZIP',   account.zip  || '—'],
            ['Email', account.email],
          ].map(([label, val]) => (
            <div key={label}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>{label}: </span>
              <span style={{ color: '#0e1e30' }}>{val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Suggested matches */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, color: '#445568', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
          Suggested matches {account.suggestions.length === 0 && <span style={{ color: '#dc2626', fontWeight: 400 }}>— none found</span>}
        </h3>
        {account.suggestions.map(p => (
          <SuggestionRow key={p.id} patient={p}
            selected={selectedPatient?.id === p.id}
            onSelect={setSelectedPatient} />
        ))}
      </section>

      {/* Manual patient search */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, color: '#445568', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
          Search for a different patient
        </h3>
        <input
          value={searchQ} onChange={e => setSearchQ(e.target.value)}
          placeholder="Name, MRN, or email…"
          style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1.5px solid #d8dfe8',
            fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
        />
        {searching && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>Searching…</div>}
        {searchResults.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {searchResults.map(p => (
              <SuggestionRow key={p.id} patient={{ ...p, confidence: 'low', score: 0 }}
                selected={selectedPatient?.id === p.id}
                onSelect={setSelectedPatient} />
            ))}
          </div>
        )}
      </section>

      {/* Selected patient confirmation */}
      {selectedPatient && (
        <div style={{ padding: '12px 14px', borderRadius: 8, background: '#eff6ff', border: '1.5px solid #bfdbfe', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>Will link to:</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0e1e30' }}>{selectedPatient.name}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>MRN {selectedPatient.mrn} · DOB {selectedPatient.dob}</div>
        </div>
      )}

      {/* Note */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#445568', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>
          Internal note (optional)
        </label>
        <textarea
          value={note} onChange={e => setNote(e.target.value)} rows={2}
          placeholder="e.g. Verified by phone — DOB mismatch in registration"
          style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1.5px solid #d8dfe8',
            fontSize: 13, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          disabled={!canApprove}
          onClick={() => onApprove(account.id, selectedPatient.id, note)}
          style={{ flex: 1, padding: '11px', borderRadius: 7, fontWeight: 700, fontSize: 14,
            background: canApprove ? 'linear-gradient(180deg,#16a34a 0%,#15803d 100%)' : '#d1fae5',
            color: '#fff', border: 'none', cursor: canApprove ? 'pointer' : 'not-allowed' }}
        >
          {acting === 'approve' ? 'Linking…' : '✓ Approve & Link'}
        </button>

        {!showDenyForm ? (
          <button
            onClick={() => setShowDenyForm(true)}
            style={{ padding: '11px 20px', borderRadius: 7, fontWeight: 700, fontSize: 14,
              background: '#fff', color: '#dc2626', border: '1.5px solid #dc2626', cursor: 'pointer' }}
          >
            Deny
          </button>
        ) : (
          <div style={{ flex: 1 }}>
            <textarea
              value={denyReason} onChange={e => setDenyReason(e.target.value)} rows={2}
              placeholder="Reason (sent to patient)…"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1.5px solid #fca5a5',
                fontSize: 13, resize: 'none', boxSizing: 'border-box', marginBottom: 6, outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => onDeny(account.id, denyReason)}
                style={{ flex: 1, padding: '9px', borderRadius: 7, fontWeight: 700, fontSize: 13,
                  background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                {acting === 'deny' ? 'Denying…' : 'Confirm Deny'}
              </button>
              <button onClick={() => setShowDenyForm(false)}
                style={{ padding: '9px 14px', borderRadius: 7, fontWeight: 600, fontSize: 13,
                  background: 'none', border: '1.5px solid #e2e8f0', color: '#64748b', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audit trail */}
      {account.events.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: '#445568', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
            Activity
          </h3>
          {account.events.map((ev, i) => (
            <div key={i} style={{ fontSize: 12, color: '#64748b', marginBottom: 5, display: 'flex', gap: 8 }}>
              <span style={{ color: '#94a3b8' }}>{new Date(ev.at).toLocaleString()}</span>
              <span style={{ fontWeight: 600, color: '#445568' }}>{ev.type.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StaffPortalQueue() {
  const [queue, setQueue]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [acting, setActing]         = useState(null); // 'approve' | 'deny' | null
  const [toast, setToast]           = useState(null); // { msg, ok }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/patient-portal/admin/queue`, { headers: authHeaders() });
      const data = await r.json();
      setQueue(Array.isArray(data) ? data : []);
    } catch { setQueue([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleApprove = async (portalUserId, patientId, note) => {
    setActing('approve');
    try {
      const r = await fetch(`${API}/patient-portal/admin/queue/${portalUserId}/approve`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ patientId, note }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed');
      showToast('Account approved and linked. Patient notified.');
      setSelected(null);
      load();
    } catch (e) { showToast(e.message, false); }
    finally { setActing(null); }
  };

  const handleDeny = async (portalUserId, reason) => {
    setActing('deny');
    try {
      const r = await fetch(`${API}/patient-portal/admin/queue/${portalUserId}/deny`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ reason }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed');
      showToast('Account denied. Patient notified.');
      setSelected(null);
      load();
    } catch (e) { showToast(e.message, false); }
    finally { setActing(null); }
  };

  const urgentCount = queue.filter(a => a.waitDays >= 2).length;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter,-apple-system,sans-serif', background: '#f8fafc' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 9999,
          padding: '12px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14,
          background: toast.ok ? '#16a34a' : '#dc2626', color: '#fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          {toast.msg}
        </div>
      )}

      {/* Queue list */}
      <div style={{ width: 360, borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#fff', flexShrink: 0 }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0e1e30', marginBottom: 2 }}>
            Portal Verification Queue
          </div>
          {urgentCount > 0 && (
            <div style={{ fontSize: 12, color: '#d97706', fontWeight: 600 }}>
              ⚠ {urgentCount} account{urgentCount > 1 ? 's' : ''} waiting 2+ days
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading…</div>
          ) : queue.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>✓</div>
              <div style={{ fontWeight: 700, color: '#0e1e30', marginBottom: 6 }}>Queue is clear</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>All portal accounts have been reviewed.</div>
            </div>
          ) : (
            queue.map(account => {
              const topMatch = account.suggestions[0];
              const isSelected = selected?.id === account.id;
              const urgent = account.waitDays >= 2;
              return (
                <div
                  key={account.id}
                  onClick={() => setSelected(account)}
                  style={{
                    padding: '14px 18px', cursor: 'pointer',
                    borderBottom: '1px solid #f1f5f9',
                    background: isSelected ? '#eff6ff' : '#fff',
                    borderLeft: isSelected ? '3px solid #0060b6' : '3px solid transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0e1e30' }}>
                      {account.firstName} {account.lastName}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700,
                      color: urgent ? '#d97706' : '#94a3b8' }}>
                      {account.waitDays}d
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{account.email}</div>
                  <div style={{ fontSize: 12, marginTop: 5 }}>
                    {account.suggestions.length === 0 ? (
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>No chart match found</span>
                    ) : (
                      <span style={{ color: CONF_COLOR[topMatch.confidence] }}>
                        {account.suggestions.length} suggestion{account.suggestions.length > 1 ? 's' : ''} · {topMatch.confidence} confidence
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid #e2e8f0', fontSize: 12, color: '#94a3b8' }}>
          {queue.length} pending · <button onClick={load} style={{ background: 'none', border: 'none', color: '#0060b6', cursor: 'pointer', fontSize: 12, padding: 0 }}>Refresh</button>
        </div>
      </div>

      {/* Detail panel */}
      {selected ? (
        <DetailPanel
          account={selected}
          onApprove={handleApprove}
          onDeny={handleDeny}
          onClose={() => setSelected(null)}
          acting={acting}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#445568', marginBottom: 6 }}>Select an account to review</div>
            <div style={{ fontSize: 13 }}>Click a pending account on the left to see suggestions and take action.</div>
          </div>
        </div>
      )}
    </div>
  );
}
