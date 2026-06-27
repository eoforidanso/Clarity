/**
 * PatientPortalInbox — staff view of a patient's portal message thread.
 * Fetches from GET /api/patient-portal/admin/patient/:id/messages (staff auth).
 * Groups messages by thread_key (patient:provider pair).
 * Staff replies via POST /api/patient-portal/staff-reply.
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';

const BG    = '#1a1f2e';
const BG2   = '#232838';
const BG3   = '#2a3045';
const BORDER = 'rgba(255,255,255,0.08)';
const T_PRI = 'rgba(255,255,255,0.95)';
const T_SEC = 'rgba(255,255,255,0.60)';
const T_MUT = 'rgba(255,255,255,0.38)';
const ACCENT = '#6366f1';

const API = import.meta.env.VITE_API_URL || '/api';

const CATEGORY_COLOR = {
  General:     '#6b7280',
  Medication:  '#6366f1',
  Labs:        '#0891b2',
  Appointment: '#16a34a',
  Refill:      '#d97706',
  Billing:     '#9333ea',
};

const ALL_CATEGORIES = ['All', 'General', 'Medication', 'Labs', 'Appointment', 'Refill', 'Billing'];

function ThreadRow({ thread, selected, onClick }) {
  const lastMsg = thread.messages[thread.messages.length - 1];
  const preview = (lastMsg?.body || '').slice(0, 72).replace(/\n/g, ' ');
  const d = new Date(thread.lastAt);
  const timeStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const catColor = CATEGORY_COLOR[thread.category] || CATEGORY_COLOR.General;

  return (
    <div
      onClick={onClick}
      style={{
        padding: '11px 14px', cursor: 'pointer',
        background: selected ? 'rgba(99,102,241,0.15)' : 'transparent',
        borderLeft: `3px solid ${selected ? ACCENT : 'transparent'}`,
        borderBottom: `1px solid ${BORDER}`,
        transition: 'background 0.12s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
          {thread.hasUnread && (
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT, flexShrink: 0 }} />
          )}
          <span style={{
            fontSize: thread.hasUnread ? 13 : 12.5,
            fontWeight: thread.hasUnread ? 700 : 500,
            color: T_PRI, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {thread.subject}
          </span>
        </div>
        <span style={{ fontSize: 10.5, color: T_MUT, flexShrink: 0 }}>{timeStr}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 9.5, background: `${catColor}22`, color: catColor, padding: '1px 7px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>
          {thread.category}
        </span>
        <span style={{ fontSize: 11, color: T_MUT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {preview}{preview.length < (lastMsg?.body || '').length ? '…' : ''}
        </span>
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isPatient = msg.fromUserType === 'patient';
  const d = new Date(`${msg.date}T${msg.time || '00:00'}`);
  const timeStr = d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isPatient ? 'flex-start' : 'flex-end',
      marginBottom: 12,
    }}>
      <div style={{
        maxWidth: '78%', padding: '10px 14px',
        borderRadius: isPatient ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
        background: isPatient ? BG3 : `${ACCENT}30`,
        border: `1px solid ${isPatient ? BORDER : ACCENT + '50'}`,
      }}>
        <div style={{ fontSize: 10.5, color: isPatient ? T_MUT : '#a5b4fc', marginBottom: 5, fontWeight: 600 }}>
          {msg.from}
        </div>
        <div style={{ fontSize: 12.5, color: T_PRI, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
          {msg.body}
        </div>
        {msg.urgent && (
          <div style={{ marginTop: 6, fontSize: 10, color: '#f87171', fontWeight: 700 }}>⚡ Urgent</div>
        )}
      </div>
      <div style={{ fontSize: 10, color: T_MUT, marginTop: 3 }}>{timeStr}</div>
    </div>
  );
}

export default function PatientPortalInbox({ patient, provider, isOpen, onClose }) {
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [selectedKey, setSelectedKey] = useState(null);
  const [reply, setReply]         = useState('');
  const [sending, setSending]     = useState(false);
  const [filterCat, setFilterCat] = useState('All');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !patient?.id) return;
    setLoading(true);
    setError('');
    fetch(`${API}/patient-portal/admin/patient/${patient.id}/messages`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        setMessages(data);
        // Auto-select first thread
        if (data.length > 0 && !selectedKey) {
          setSelectedKey(data[0].threadKey || data[0].id);
        }
      })
      .catch(() => setError('Could not load messages'))
      .finally(() => setLoading(false));
  }, [isOpen, patient?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedKey, messages]);

  // Group messages → threads by thread_key, then by subject within
  const threads = useMemo(() => {
    const map = new Map();
    messages.forEach(msg => {
      const key = msg.threadKey || msg.subject || msg.id;
      if (!map.has(key)) {
        map.set(key, {
          key,
          subject:   msg.subject,
          category:  msg.category || 'General',
          messages:  [],
          lastAt:    msg.date,
          hasUnread: false,
        });
      }
      const t = map.get(key);
      t.messages.push(msg);
      if (msg.date > t.lastAt) { t.lastAt = msg.date; t.subject = msg.subject; }
      if (msg.fromUserType === 'patient') t.hasUnread = true;
    });
    let list = [...map.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    if (filterCat !== 'All') list = list.filter(t => t.category === filterCat);
    return list;
  }, [messages, filterCat]);

  const selectedThread = threads.find(t => t.key === selectedKey) || threads[0] || null;

  if (!isOpen) return null;

  const handleSendReply = async () => {
    if (!reply.trim() || !patient?.id) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/patient-portal/staff-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ patientId: patient.id, text: reply.trim() }),
      });
      if (!res.ok) throw new Error('Failed to send');
      const data = await res.json();
      const now = new Date();
      const providerName = provider
        ? `${provider.firstName || ''} ${provider.lastName || ''}`.trim() || provider.username || 'Care Team'
        : 'Care Team';
      const newMsg = {
        id:           data.id,
        from:         providerName,
        subject:      `Re: ${selectedThread?.subject || 'Message'}`,
        body:         reply.trim(),
        date:         now.toISOString().split('T')[0],
        time:         now.toTimeString().slice(0, 5),
        type:         'Provider Reply',
        urgent:       false,
        fromUserType: 'provider',
        toUserType:   'patient',
        providerId:   provider?.id || '',
        threadKey:    selectedKey || '',
        category:     selectedThread?.category || 'General',
      };
      setMessages(prev => [...prev, newMsg]);
      setReply('');
    } catch {
      alert('Failed to send reply. Try again.');
    } finally {
      setSending(false);
    }
  };

  const totalUnread = threads.filter(t => t.hasUnread).length;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1500 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 800,
        background: BG, zIndex: 1501, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 20px 12px', borderBottom: `1px solid ${BORDER}`, background: '#141824', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ color: T_PRI, fontWeight: 700, fontSize: 15 }}>
                💬 {patient?.firstName} {patient?.lastName} — Portal Messages
              </div>
              {totalUnread > 0 && (
                <span style={{ background: ACCENT, color: '#fff', fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 10 }}>
                  {totalUnread} from patient
                </span>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: T_MUT, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>

          {/* Category filter pills */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {ALL_CATEGORIES.map(cat => {
              const active = filterCat === cat;
              const col = CATEGORY_COLOR[cat] || '#6b7280';
              return (
                <button key={cat} onClick={() => setFilterCat(cat)} style={{
                  padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: active ? (cat === 'All' ? ACCENT : col) : `${cat === 'All' ? ACCENT : col}22`,
                  color: active ? '#fff' : (cat === 'All' ? '#a5b4fc' : col),
                  transition: 'all 0.12s',
                }}>
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Thread list */}
          <div style={{ width: 280, borderRight: `1px solid ${BORDER}`, overflowY: 'auto', flexShrink: 0 }}>
            {loading && (
              <div style={{ padding: 24, textAlign: 'center', color: T_MUT, fontSize: 13 }}>Loading…</div>
            )}
            {error && (
              <div style={{ padding: 16, color: '#f87171', fontSize: 12 }}>⚠️ {error}</div>
            )}
            {!loading && !error && threads.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: T_MUT, fontSize: 13 }}>
                No portal messages{filterCat !== 'All' ? ` in ${filterCat}` : ''}
              </div>
            )}
            {threads.map(t => (
              <ThreadRow
                key={t.key}
                thread={t}
                selected={selectedThread?.key === t.key}
                onClick={() => setSelectedKey(t.key)}
              />
            ))}
          </div>

          {/* Message thread */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selectedThread ? (
              <>
                <div style={{ padding: '12px 18px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0, background: BG2 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T_PRI }}>{selectedThread.subject}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
                    <span style={{ fontSize: 11, color: T_MUT }}>{selectedThread.messages.length} message{selectedThread.messages.length !== 1 ? 's' : ''}</span>
                    {selectedThread.category !== 'General' && (
                      <span style={{ fontSize: 9.5, background: `${CATEGORY_COLOR[selectedThread.category] || '#6b7280'}22`, color: CATEGORY_COLOR[selectedThread.category] || '#6b7280', padding: '1px 7px', borderRadius: 8, fontWeight: 700 }}>
                        {selectedThread.category}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
                  {selectedThread.messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
                  <div ref={bottomRef} />
                </div>

                <div style={{ padding: '12px 16px', borderTop: `1px solid ${BORDER}`, flexShrink: 0, background: BG2, display: 'flex', gap: 8 }}>
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSendReply(); }}
                    placeholder="Reply to patient… (Ctrl+Enter to send)"
                    rows={2}
                    style={{ flex: 1, background: BG3, border: `1px solid ${BORDER}`, borderRadius: 8, color: T_PRI, fontSize: 12.5, padding: '8px 12px', resize: 'none', outline: 'none', lineHeight: 1.5, fontFamily: 'inherit' }}
                  />
                  <button
                    disabled={!reply.trim() || sending}
                    onClick={handleSendReply}
                    style={{ background: reply.trim() && !sending ? ACCENT : BG3, border: 'none', color: reply.trim() && !sending ? '#fff' : T_MUT, borderRadius: 8, padding: '0 16px', fontSize: 12, fontWeight: 700, cursor: reply.trim() && !sending ? 'pointer' : 'default', alignSelf: 'stretch' }}
                  >
                    {sending ? '⏳' : 'Send'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T_MUT, fontSize: 13 }}>
                {loading ? 'Loading messages…' : 'No messages yet'}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
