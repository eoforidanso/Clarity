import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { inbox as inboxApi } from '../services/api';

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function ProviderRefillQueue() {
  const { currentUser } = useAuth();
  const [tasks, setTasks]         = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [toast, setToast]         = useState(null);
  const [denyModal, setDenyModal] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [acting, setActing]       = useState(false);
  const [filters, setFilters]     = useState({ urgent: false, outOfMeds: false, last7: false });
  const bottomRef = useRef(null);

  function showToast(msg, err = false) {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3500);
  }

  async function loadTasks() {
    setLoading(true);
    try {
      const data = await inboxApi.refillQueue();
      setTasks(data || []);
      // Auto-select first task if none selected
      setSelectedId(id => id ?? data?.[0]?.id ?? null);
    } catch {
      showToast('Failed to load refill queue', true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTasks(); }, []);

  // Load thread when task changes
  useEffect(() => {
    if (!selectedId) { setThread([]); return; }
    setThreadLoading(true);
    inboxApi.refillThread(selectedId)
      .then(data => { setThread(data || []); })
      .catch(() => setThread([]))
      .finally(() => setThreadLoading(false));
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    let list = tasks.filter(t => {
      if (filters.urgent && !t.urgent) return false;
      if (filters.outOfMeds && (t.refillsRemaining === null || t.refillsRemaining > 0)) return false;
      if (filters.last7) {
        const diff = (Date.now() - new Date(t.requestedAt).getTime()) / 86_400_000;
        if (diff > 7) return false;
      }
      return true;
    });
    return list.sort((a, b) => {
      if (a.urgent  && !b.urgent)  return -1;
      if (!a.urgent && b.urgent)   return 1;
      const aOut = a.refillsRemaining !== null && a.refillsRemaining <= 0;
      const bOut = b.refillsRemaining !== null && b.refillsRemaining <= 0;
      if (aOut && !bOut) return -1;
      if (!aOut && bOut) return 1;
      return new Date(b.requestedAt) - new Date(a.requestedAt);
    });
  }, [tasks, filters]);

  const selected = tasks.find(t => t.id === selectedId) || null;

  function advanceAfter(doneId) {
    const remaining = tasks.filter(t => t.id !== doneId);
    const idx = sorted.findIndex(t => t.id === doneId);
    const next = sorted[idx + 1] || sorted[idx - 1] || null;
    setTasks(remaining);
    setSelectedId(next?.id ?? null);
  }

  async function handleApprove() {
    if (!selected || acting) return;
    setActing(true);
    try {
      await inboxApi.approveRefill(selected.id);
      showToast(`✅ Approved — ${selected.medicationName} for ${selected.patientName}`);
      advanceAfter(selected.id);
    } catch {
      showToast('Failed to approve refill', true);
    } finally {
      setActing(false);
    }
  }

  async function handleDeny() {
    if (!selected || acting) return;
    setActing(true);
    try {
      await inboxApi.denyRefill(selected.id, denyReason.trim() || undefined);
      showToast(`❌ Denied — ${selected.medicationName} for ${selected.patientName}`);
      advanceAfter(selected.id);
    } catch {
      showToast('Failed to deny refill', true);
    } finally {
      setActing(false);
      setDenyModal(false);
      setDenyReason('');
    }
  }

  // ── derived stats ──────────────────────────────────────────────────────────
  const urgentCount  = tasks.filter(t => t.urgent).length;
  const outCount     = tasks.filter(t => t.refillsRemaining !== null && t.refillsRemaining <= 0).length;
  const todayCount   = tasks.filter(t => {
    const diff = (Date.now() - new Date(t.requestedAt).getTime()) / 86_400_000;
    return diff < 1;
  }).length;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0c1e3e 0%, #1d4ed8 60%, #2563eb 100%)',
        color: '#fff', padding: '20px 24px 18px', flexShrink: 0,
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
              💊 Provider Refill Queue
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, opacity: 0.75 }}>
              Review and act on portal refill requests
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Pending',  val: tasks.length,  dot: '#60a5fa' },
              { label: 'Urgent',   val: urgentCount,   dot: '#f87171' },
              { label: 'Out',      val: outCount,      dot: '#fb923c' },
              { label: 'Today',    val: todayCount,    dot: '#34d399' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 14px',
                textAlign: 'center', minWidth: 56,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 2 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 18, fontWeight: 800 }}>{s.val}</span>
                </div>
                <div style={{ fontSize: 10, opacity: 0.7 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          {[
            { key: 'urgent',    label: '⚡ Urgent Only' },
            { key: 'outOfMeds', label: '🔴 Out of Meds' },
            { key: 'last7',     label: '📅 Last 7 Days' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilters(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: 'none', cursor: 'pointer', transition: 'all 0.12s',
                background: filters[f.key] ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.15)',
                color: filters[f.key] ? '#1d4ed8' : 'rgba(255,255,255,0.9)',
              }}>
              {f.label}
            </button>
          ))}
          <span style={{ fontSize: 11, opacity: 0.6, alignSelf: 'center', marginLeft: 4 }}>
            {sorted.length} request{sorted.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Body: two-panel layout ────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', borderTop: '1px solid var(--border)' }}>

        {/* Left: task list */}
        <div style={{
          width: 300, flexShrink: 0, overflowY: 'auto',
          background: '#f8fafc', borderRight: '1px solid var(--border)',
        }}>
          {loading && (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Loading…
            </div>
          )}
          {!loading && sorted.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>All caught up!</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                No pending refill requests
              </div>
            </div>
          )}
          {sorted.map(task => {
            const isSelected = task.id === selectedId;
            const isOut = task.refillsRemaining !== null && task.refillsRemaining <= 0;
            return (
              <div
                key={task.id}
                onClick={() => setSelectedId(task.id)}
                style={{
                  padding: '11px 14px',
                  borderBottom: '1px solid #e5e7eb',
                  borderLeft: `3px solid ${isSelected ? '#2563eb' : task.urgent ? '#ef4444' : 'transparent'}`,
                  background: isSelected ? '#eff6ff' : task.urgent ? '#fff5f5' : '#fff',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f0f9ff'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = task.urgent ? '#fff5f5' : '#fff'; }}
              >
                {/* Row 1: name + badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', flex: 1 }}>
                    {task.patientName}
                  </span>
                  {task.urgent && (
                    <span style={{ fontSize: 9, fontWeight: 800, background: '#ef4444', color: '#fff', borderRadius: 3, padding: '2px 5px', flexShrink: 0 }}>
                      URGENT
                    </span>
                  )}
                </div>
                {/* Row 2: medication */}
                <div style={{ fontSize: 12, color: '#374151', marginBottom: 4, fontWeight: 500 }}>
                  💊 {task.medicationName}
                </div>
                {/* Row 3: refills + date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, borderRadius: 10, padding: '2px 7px',
                    background: isOut ? '#fee2e2' : '#f0fdf4',
                    color: isOut ? '#dc2626' : '#166534',
                  }}>
                    {task.refillsRemaining === null ? 'Refills: ?' : isOut ? '🔴 Out of refills' : `✓ ${task.refillsRemaining} left`}
                  </span>
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>
                    {fmtDate(task.requestedAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: detail panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>💊</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Select a refill request</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Choose from the list to review</div>
              </div>
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div style={{
                padding: '14px 20px 12px',
                borderBottom: '1px solid var(--border)',
                background: '#fafbfc',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                      {selected.patientName}
                      {selected.mrn && <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', marginLeft: 8 }}>MRN {selected.mrn}</span>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: '#475569' }}>
                      <span>💊 <strong>{selected.medicationName}</strong></span>
                      {selected.pharmacyName && <span>🏪 {selected.pharmacyName}</span>}
                      <span>📅 {fmtDate(selected.requestedAt)}</span>
                      <span style={{
                        fontWeight: 700,
                        color: selected.refillsRemaining !== null && selected.refillsRemaining <= 0 ? '#dc2626' : '#166534',
                      }}>
                        {selected.refillsRemaining === null
                          ? 'Refills: unknown'
                          : selected.refillsRemaining <= 0
                            ? '🔴 Out of refills'
                            : `✓ ${selected.refillsRemaining} refill${selected.refillsRemaining !== 1 ? 's' : ''} remaining`
                        }
                      </span>
                    </div>
                  </div>
                  {selected.urgent && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 800, color: '#dc2626', flexShrink: 0 }}>
                      ⚡ URGENT
                    </div>
                  )}
                </div>
              </div>

              {/* Thread */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Message Thread
                </div>
                {threadLoading && (
                  <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading thread…</div>
                )}
                {!threadLoading && thread.length === 0 && (
                  <div style={{ color: '#94a3b8', fontSize: 13 }}>No messages yet</div>
                )}
                {thread.map(msg => {
                  const isPatient = msg.fromUserType === 'patient';
                  const d = new Date(`${msg.date}T${msg.time || '00:00'}`);
                  const ts = d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                  return (
                    <div key={msg.id} style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: isPatient ? 'flex-start' : 'flex-end',
                      marginBottom: 12,
                    }}>
                      <div style={{
                        maxWidth: '78%', padding: '10px 14px',
                        borderRadius: isPatient ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                        background: isPatient ? '#f1f5f9' : '#eff6ff',
                        border: `1px solid ${isPatient ? '#e2e8f0' : '#bfdbfe'}`,
                      }}>
                        <div style={{ fontSize: 10.5, color: isPatient ? '#64748b' : '#1e40af', marginBottom: 5, fontWeight: 700 }}>
                          {msg.from}
                        </div>
                        <div style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                          {msg.body}
                        </div>
                        {msg.urgent && <div style={{ marginTop: 5, fontSize: 10, color: '#dc2626', fontWeight: 700 }}>⚡ Urgent</div>}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{ts}</div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Action bar */}
              <div style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border)',
                background: '#fafbfc',
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                flexShrink: 0,
              }}>
                <button
                  disabled={acting}
                  onClick={handleApprove}
                  style={{
                    padding: '10px 24px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 14,
                    background: acting ? '#9ca3af' : '#16a34a', color: '#fff',
                    cursor: acting ? 'not-allowed' : 'pointer',
                    boxShadow: acting ? 'none' : '0 1px 4px rgba(22,163,74,0.35)',
                    transition: 'all 0.12s',
                  }}>
                  {acting ? '⏳' : '✅'} Approve Refill
                </button>
                <button
                  disabled={acting}
                  onClick={() => setDenyModal(true)}
                  style={{
                    padding: '10px 24px', borderRadius: 8, border: '1.5px solid #fca5a5', fontWeight: 700, fontSize: 14,
                    background: '#fff', color: '#dc2626',
                    cursor: acting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.12s',
                  }}>
                  ❌ Deny
                </button>
                <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
                  {sorted.indexOf(selected) + 1} of {sorted.length}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Deny reason modal ─────────────────────────────────────────────────── */}
      {denyModal && (
        <div onClick={() => setDenyModal(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, backdropFilter: 'blur(3px)', padding: 24,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
          }}>
            <div style={{ background: 'linear-gradient(135deg, #991b1b, #dc2626)', color: '#fff', padding: '18px 22px' }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>❌ Deny Refill</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                {selected?.medicationName} — {selected?.patientName}
              </div>
            </div>
            <div style={{ padding: '20px 22px' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                Reason for denial <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional — sent to patient)</span>
              </label>
              <textarea
                value={denyReason}
                onChange={e => setDenyReason(e.target.value)}
                placeholder="e.g. Schedule an office visit to discuss medication management."
                rows={3}
                autoFocus
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                  fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = '#dc2626'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
              />
            </div>
            <div style={{ padding: '12px 22px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#fafafa' }}>
              <button
                onClick={() => { setDenyModal(false); setDenyReason(''); }}
                style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#374151' }}>
                Cancel
              </button>
              <button
                onClick={handleDeny}
                disabled={acting}
                style={{
                  padding: '9px 20px', borderRadius: 8, border: 'none', background: acting ? '#9ca3af' : '#dc2626',
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: acting ? 'not-allowed' : 'pointer',
                }}>
                {acting ? 'Denying…' : 'Confirm Denial'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 3000,
          background: toast.err ? '#7f1d1d' : '#0f172a',
          color: '#fff', padding: '12px 18px', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
          maxWidth: 380,
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
