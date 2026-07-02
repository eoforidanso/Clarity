import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../contexts/PatientContext';
import { useAuth } from '../contexts/AuthContext';
import { DemoDisabled } from '../demo/DemoGuard';

// ── Category grouping — keyed on DB `category` column values ─────────────────
const CATEGORY_META = {
  Refill:      { icon: '💊', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
  Labs:        { icon: '🔬', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  Medication:  { icon: '💉', color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
  Appointment: { icon: '📅', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  General:     { icon: '💬', color: '#0369a1', bg: '#f0f9ff', border: '#7dd3fc' },
  Billing:     { icon: '🧾', color: '#9333ea', bg: '#faf5ff', border: '#d8b4fe' },
};
const CATEGORY_ORDER = ['Refill', 'Labs', 'Medication', 'Appointment', 'General', 'Billing'];

// ── Severity helpers ──────────────────────────────────────────────────────────
function SeverityDot({ msg }) {
  if (msg.urgent)              return <span title="Urgent"  style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0, boxShadow: '0 0 0 2px #fee2e2' }} />;
  if (msg.status === 'Unread') return <span title="Unread"  style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />;
  return                              <span title="Read"    style={{ width: 8, height: 8, borderRadius: '50%', background: '#e2e8f0', flexShrink: 0 }} />;
}

const TYPE_TAG_COLORS = {
  'Rx Refill Request': { bg: '#f0fdf4', color: '#166534', border: '#86efac' },
  'Lab Result':        { bg: '#fdf4ff', color: '#7c3aed', border: '#e9d5ff' },
  'Patient Message':   { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  'Prior Auth':        { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5' },
  'Staff Message':     { bg: '#ecfdf5', color: '#065f46', border: '#6ee7b7' },
  'Check-in Alert':    { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' },
  'Referral Response': { bg: '#f0f9ff', color: '#075985', border: '#7dd3fc' },
};

const TYPE_COLORS = {
  'Rx Refill Request': 'badge-warning',
  'Lab Result': 'badge-info',
  'Patient Message': 'badge-primary',
  'Prior Auth': 'badge-danger',
  'Staff Message': 'badge-success',
  'Check-in Alert': 'badge-info',
  'Referral Response': 'badge-primary',
};

function TypeIcon({ type, size = 13 }) {
  const s = { width: size, height: size, flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' };
  const cp = { fill: 'none', stroke: 'currentColor', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (type) {
    case 'Rx Refill Request':
      return <svg style={s} viewBox="0 0 24 24" {...cp}><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
    case 'Lab Result':
      return <svg style={s} viewBox="0 0 24 24" {...cp}><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11l-3 6h12l-3-6V3"/><line x1="3" y1="9" x2="21" y2="9"/></svg>;
    case 'Patient Message':
      return <svg style={s} viewBox="0 0 24 24" {...cp}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case 'Prior Auth':
      return <svg style={s} viewBox="0 0 24 24" {...cp}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
    case 'Staff Message':
      return <svg style={s} viewBox="0 0 24 24" {...cp}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'Check-in Alert':
      return <svg style={s} viewBox="0 0 24 24" {...cp}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
    case 'Referral Response':
      return <svg style={s} viewBox="0 0 24 24" {...cp}><polyline points="15 3 21 3 21 9"/><path d="M21 3L9 15"/><path d="M10 3H3v18h18v-7"/></svg>;
    default:
      return <svg style={s} viewBox="0 0 24 24" {...cp}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
  }
}

export default function Inbox() {
  const { inboxMessages, updateMessageStatus, addInboxMessage, patients, selectPatient } = usePatient();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterUrgent, setFilterUrgent] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);

  // Extract unique patients with messages and compute stats
  const patientList = useMemo(() => {
    const ptMap = new Map();
    
    (inboxMessages || []).forEach((msg) => {
      // Skip non-patient messages
      if (!msg.patient || !msg.patientName) return;
      
      if (!ptMap.has(msg.patient)) {
        const pt = patients?.find(p => p.id === msg.patient);
        ptMap.set(msg.patient, {
          id: msg.patient,
          name: msg.patientName,
          mrn: pt?.mrn || '',
          photo: pt?.photo || null,
          unreadCount: 0,
          totalCount: 0,
          lastMessageDate: msg.date,
        });
      }
      
      const entry = ptMap.get(msg.patient);
      entry.totalCount += 1;
      if (msg.status === 'Unread') entry.unreadCount += 1;
      // Update last message date if newer
      if (new Date(msg.date) > new Date(entry.lastMessageDate)) {
        entry.lastMessageDate = msg.date;
      }
    });

    return Array.from(ptMap.values()).sort((a, b) => 
      new Date(b.lastMessageDate) - new Date(a.lastMessageDate)
    );
  }, [inboxMessages, patients]);

  // IDs of patients this user can access (already location-filtered by PatientContext)
  const accessiblePatientIds = useMemo(
    () => new Set((patients || []).map(p => p.id)),
    [patients]
  );

  const filteredMessages = useMemo(() => {
    let msgs = [...(inboxMessages || [])];

    // ── Location / ownership scoping ──────────────────────────────────────────
    // Admins see everything. Everyone else sees only messages that:
    //   (a) are addressed to them, OR
    //   (b) involve a patient they can access (same location)
    const isGlobal = ['admin', 'front_desk'].includes(currentUser?.role);
    if (!isGlobal) {
      msgs = msgs.filter(m => {
        const toMe = m.to === currentUser?.id;
        const myPatient = m.patient && accessiblePatientIds.has(m.patient);
        return toMe || myPatient;
      });
    }

    // Role-based type restriction (front_desk only sees certain message types)
    if (currentUser?.role === 'front_desk') {
      msgs = msgs.filter(m => ['Check-in Alert', 'Patient Message', 'Staff Message'].includes(m.type));
    }

    // Filter by selected patient if one is chosen
    if (selectedPatientId) {
      msgs = msgs.filter(m => m.patient === selectedPatientId);
    }

    if (filterUrgent) {
      msgs = msgs.filter(m => m.urgent);
    }
    if (filterCategory !== 'All') {
      msgs = msgs.filter(m => (m.category || 'General') === filterCategory);
    }
    if (filterStatus === 'Unread') {
      msgs = msgs.filter(m => m.status === 'Unread');
    } else if (filterStatus === 'Read') {
      msgs = msgs.filter(m => m.status === 'Read');
    }

    // Split active vs completed (is_active=false = auto-closed by triage)
    const active    = msgs.filter(m => m.isActive !== false);
    const completed = msgs.filter(m => m.isActive === false);

    const sortFn = (a, b) => {
      if (a.urgent  && !b.urgent)                           return -1;
      if (!a.urgent && b.urgent)                            return 1;
      if (a.status === 'Unread' && b.status !== 'Unread')  return -1;
      if (a.status !== 'Unread' && b.status === 'Unread')  return 1;
      return new Date(b.date) - new Date(a.date);
    };

    return { active: active.sort(sortFn), completed: completed.sort(sortFn) };
  }, [inboxMessages, filterCategory, filterStatus, filterUrgent, currentUser, selectedPatientId, accessiblePatientIds]);

  const selectedMessage = (inboxMessages || []).find(m => m.id === selectedId);

  // Scoped message pool (same logic as filteredMessages but without type/status/patient filters)
  const scopedMessages = useMemo(() => {
    const isGlobal = ['admin', 'front_desk'].includes(currentUser?.role);
    if (isGlobal) return inboxMessages || [];
    return (inboxMessages || []).filter(m => {
      const toMe = m.to === currentUser?.id;
      const myPatient = m.patient && accessiblePatientIds.has(m.patient);
      return toMe || myPatient;
    });
  }, [inboxMessages, currentUser, accessiblePatientIds]);

  const unreadCount = scopedMessages.filter(m => m.status === 'Unread').length;

  const categoryCounts = useMemo(() => {
    const counts = {};
    scopedMessages.forEach(m => {
      const c = m.category || 'General';
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [scopedMessages]);

  // Auto-populate: select first patient with unread messages on mount
  useEffect(() => {
    if (!selectedPatientId && patientList.length > 0) {
      const firstUnread = patientList.find(p => p.unreadCount > 0);
      if (firstUnread) {
        setSelectedPatientId(firstUnread.id);
      } else if (patientList.length > 0) {
        setSelectedPatientId(patientList[0].id);
      }
    }
  }, [patientList, selectedPatientId]);

  const handleSelectMessage = (msg) => {
    setSelectedId(msg.id);
    setShowReply(false);
    setReplyText('');
    if (isMobile) setMobilePanel(2);
    if (msg.status === 'Unread') {
      updateMessageStatus(msg.id, 'Read');
    }
  };

  const handleSelectPatient = (ptId) => {
    setSelectedPatientId(ptId);
    if (isMobile) setMobilePanel(1);
  };

  const handleMarkUnread = (id) => {
    updateMessageStatus(id, 'Unread');
  };

  const [replySent, setReplySent] = useState(false);
  const [assignedMsg, setAssignedMsg] = useState(false);
  const [refillAction, setRefillAction] = useState({}); // { [msgId]: 'Approved' | 'Denied' }
  const [showCompleted, setShowCompleted] = useState(false);

  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [mobilePanel, setMobilePanel] = useState(0); // 0=patient list, 1=message list, 2=detail
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const isMedicationRelated = (msg) => {
    if (!msg) return false;
    const medKeywords = /\b(med|medication|medicine|drug|prescription|rx|refill|dose|dosage|pill|tablet|capsule|pharmacy|pharmacist|inhaler|insulin|antibiotic|titrate|taper|script)\b/i;
    return medKeywords.test(msg.subject || '') || medKeywords.test(msg.body || '');
  };

  const handleAssignToProvider = () => {
    if (!selectedMessage) return;
    addInboxMessage({
      type: 'Staff Message',
      from: `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim() || 'Front Desk',
      to: 'Provider',
      patient: selectedMessage.patient,
      patientName: selectedMessage.patientName,
      subject: `[Assigned] ${selectedMessage.subject}`,
      body: `This message was assigned to you by front desk staff for clinical review:\n\n${selectedMessage.body}`,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
      priority: selectedMessage.urgent ? 'Urgent' : 'Normal',
      read: false,
      status: 'Unread',
    });
    updateMessageStatus(selectedMessage.id, 'Assigned to Provider');
    setAssignedMsg(true);
    setTimeout(() => setAssignedMsg(false), 4000);
  };

  const handleApproveRefill = (msg) => {
    updateMessageStatus(msg.id, 'Approved');
    setRefillAction(prev => ({ ...prev, [msg.id]: 'Approved' }));
  };

  const handleDenyRefill = (msg) => {
    updateMessageStatus(msg.id, 'Denied');
    setRefillAction(prev => ({ ...prev, [msg.id]: 'Denied' }));
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedMessage) return;
    const now = new Date();
    addInboxMessage({
      type: 'Provider Message',
      from: `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim() || 'Provider',
      to: selectedMessage.patient,
      patient: selectedMessage.patient,
      patientName: selectedMessage.patientName,
      subject: `Re: ${selectedMessage.subject}`,
      body: replyText.trim(),
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      priority: 'Normal',
      read: true,
      status: 'Sent',
    });
    setReplyText('');
    setShowReply(false);
    setReplySent(true);
    setTimeout(() => setReplySent(false), 3000);
  };

  return (
    <div className="fade-in">
      {/* ── Integrated Inbox Header ── */}
      <div style={{ marginBottom: 16, padding: '14px 18px', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              📥 Clinical Inbox
              {unreadCount > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 'var(--radius-chip)', background: '#dc2626', color: '#fff' }}>
                  {unreadCount} new
                </span>
              )}
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''} requiring attention` : 'All caught up — no unread messages'}
            </p>
          </div>
          {/* Stat chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(() => {
              const urgentCount = scopedMessages.filter(m => m.urgent).length;
              return [
                { label: 'Total',  value: scopedMessages.length, bg: '#f8fafc', color: '#475569', dot: '#94a3b8', border: '1.5px solid #e2e8f0', onClick: null },
                { label: 'Unread', value: unreadCount, bg: unreadCount > 0 ? '#eff6ff' : '#f8fafc', color: unreadCount > 0 ? '#1e40af' : '#94a3b8', dot: '#3b82f6', border: `1.5px solid ${unreadCount > 0 ? '#93c5fd' : '#e2e8f0'}`, onClick: () => setFilterStatus(s => s === 'Unread' ? 'All' : 'Unread') },
                { label: 'Urgent', value: urgentCount, bg: filterUrgent ? '#fef2f2' : (urgentCount > 0 ? '#fef2f2' : '#f8fafc'), color: urgentCount > 0 ? '#991b1b' : '#94a3b8', dot: '#ef4444', border: `1.5px solid ${filterUrgent ? '#dc2626' : urgentCount > 0 ? '#fca5a5' : '#e2e8f0'}`, onClick: () => setFilterUrgent(f => !f) },
              ];
            })().map(s => (
              <div key={s.label}
                onClick={s.onClick || undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: 26, borderRadius: 'var(--radius-chip)', background: s.bg, border: s.border, boxShadow: 'var(--shadow-sm)', cursor: s.onClick ? 'pointer' : 'default', userSelect: 'none' }}
                title={s.onClick ? `Click to filter by ${s.label.toLowerCase()}` : undefined}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</span>
                <span style={{ fontSize: 11, color: s.color, opacity: 0.75 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters — category pill bar */}
      <div style={{ marginBottom: 14, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {['All', ...CATEGORY_ORDER.filter(c => categoryCounts[c])].map(cat => {
          const active = filterCategory === cat;
          const meta = CATEGORY_META[cat];
          return (
            <button key={cat} type="button" onClick={() => setFilterCategory(cat)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 13px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: active ? 'none' : '1.5px solid var(--border)',
                background: active ? (meta ? meta.color : '#0f172a') : (meta ? meta.bg : '#fff'),
                color: active ? '#fff' : (meta ? meta.color : 'var(--text-secondary)'),
                transition: 'all 0.15s',
                boxShadow: active ? 'var(--shadow-sm)' : 'none',
              }}>
              {cat !== 'All' && meta && <span style={{ fontSize: 12 }}>{meta.icon}</span>}
              {cat}{cat !== 'All' && categoryCounts[cat] ? ` (${categoryCounts[cat]})` : ''}
            </button>
          );
        })}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, background: '#f8fafc', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
          {['All', 'Unread', 'Read'].map(s => (
            <button key={s} type="button" onClick={() => setFilterStatus(s)}
              style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: 'none',
                background: filterStatus === s ? '#0f172a' : 'transparent',
                color: filterStatus === s ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}>
              {s}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{filteredMessages.active.length} msg{filteredMessages.active.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Three-Column Inbox Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr 1fr', gap: '1px', background: 'var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', height: isMobile ? 'calc(100vh - 220px)' : '70vh', border: '1px solid var(--border)' }}>
        
        {/* Patient List Column */}
        {(!isMobile || mobilePanel === 0) && (
        <div style={{ background: 'linear-gradient(180deg, #13203d 0%, #182d4a 100%)', overflowY: 'auto', borderRight: 'none', boxShadow: isMobile ? 'none' : 'var(--shadow-pane)' }}>
          <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.12)', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>
            Patients ({patientList.length})
          </div>
          {patientList.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>
              No patient messages
            </div>
          ) : (
            patientList.map((pt) => (
              <div
                key={pt.id}
                onClick={() => handleSelectPatient(pt.id)}
                style={{
                  padding: '12px',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  background: selectedPatientId === pt.id ? 'rgba(255,255,255,0.13)' : 'transparent',
                  borderLeft: selectedPatientId === pt.id ? '3px solid #60a5fa' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { if (selectedPatientId !== pt.id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = selectedPatientId === pt.id ? 'rgba(255,255,255,0.13)' : 'transparent'; }}
              >
                {/* Avatar + Name */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      flexShrink: 0,
                    }}
                  >
                    {pt.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#e8f0fa' }}>
                      {pt.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pt.mrn}
                    </div>
                  </div>
                </div>
                
                {/* Message Count + Unread Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.45)' }}>{pt.totalCount} msg{pt.totalCount !== 1 ? 's' : ''}</span>
                  {pt.unreadCount > 0 && (
                    <span style={{ background: 'var(--danger)', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', minWidth: '20px', textAlign: 'center' }}>
                      {pt.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        )} {/* end patient column */}

        {/* Message List Column — grouped by category */}
        {(!isMobile || mobilePanel === 1) && (
        <div style={{ background: 'white', overflowY: 'auto', borderRight: isMobile ? 'none' : '1px solid var(--border)' }}>
          {isMobile && (
            <button onClick={() => setMobilePanel(0)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 14px', width:'100%', background:'#f8fafc', border:'none', borderBottom:'1px solid var(--border)', fontSize:12, fontWeight:700, color:'var(--text-secondary)', cursor:'pointer' }}>
              ← Back to Patients
            </button>
          )}
          {selectedPatientId && (
            <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'#fafbfc', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.3px' }}>Messages</span>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>{filteredMessages.active.length} active</span>
            </div>
          )}
          {filteredMessages.active.length === 0 && filteredMessages.completed.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
              {selectedPatientId ? 'No messages for this patient' : 'No messages match your filters'}
            </div>
          )}

          {/* Group active messages by DB category */}
          {(() => {
            const grouped = {};
            filteredMessages.active.forEach(msg => {
              const cat = msg.category || 'General';
              if (!grouped[cat]) grouped[cat] = [];
              grouped[cat].push(msg);
            });
            return CATEGORY_ORDER.filter(cat => grouped[cat]?.length > 0).map(cat => {
              const meta = CATEGORY_META[cat];
              const msgs = grouped[cat];
              const urgentInGroup = msgs.filter(m => m.urgent).length;
              const unreadInGroup = msgs.filter(m => m.status === 'Unread').length;
              return (
                <div key={cat}>
                  {/* Category header */}
                  <div style={{ padding: '8px 14px 6px', background: meta.bg, borderBottom: `1px solid ${meta.border}`, borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6, position: 'sticky', top: 0, zIndex: 2 }}>
                    <span style={{ fontSize: 13 }}>{meta.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.5px', flex: 1 }}>{cat}</span>
                    <span style={{ fontSize: 11, color: meta.color, opacity: 0.7 }}>{msgs.length}</span>
                    {urgentInGroup > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: '#ef4444', color: '#fff', borderRadius: 4, padding: '1px 6px' }}>
                        {urgentInGroup} urgent
                      </span>
                    )}
                    {unreadInGroup > 0 && urgentInGroup === 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: '#3b82f6', color: '#fff', borderRadius: 4, padding: '1px 6px' }}>
                        {unreadInGroup} new
                      </span>
                    )}
                  </div>

                  {/* Messages in category */}
                  {msgs.map(msg => {
                    const tapAction = refillAction[msg.id] || msg.status;
                    return (
                      <div
                        key={msg.id}
                        onClick={() => handleSelectMessage(msg)}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          borderLeft: msg.urgent ? '4px solid #ef4444' : msg.status === 'Unread' ? '3px solid #3b82f6' : '3px solid transparent',
                          background: selectedId === msg.id ? '#eff6ff' : msg.urgent && msg.status === 'Unread' ? '#fff5f5' : 'transparent',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => { if (selectedId !== msg.id) e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={e => { if (selectedId !== msg.id) e.currentTarget.style.background = msg.urgent && msg.status === 'Unread' ? '#fff5f5' : 'transparent'; }}
                      >
                        {/* Row 1: severity dot + subject + urgent badge */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 3 }}>
                          <div style={{ paddingTop: 5 }}><SeverityDot msg={msg} /></div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: msg.urgent || msg.status === 'Unread' ? 800 : 600, fontSize: 13, color: msg.urgent ? '#7f1d1d' : '#0f172a', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {msg.subject}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{msg.from}</span>
                              <span>{msg.date}</span>
                            </div>
                          </div>
                          {msg.urgent && <span style={{ fontSize: 9, fontWeight: 800, background: '#ef4444', color: '#fff', borderRadius: 3, padding: '2px 5px', flexShrink: 0 }}>URGENT</span>}
                        </div>

                        {/* Row 2: 1-tap action buttons */}
                        <div style={{ display: 'flex', gap: 5, marginLeft: 15, marginTop: 5, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                          {msg.type === 'Rx Refill Request' && (
                            tapAction === 'Approved' ? (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#166534', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 4, padding: '2px 8px' }}>✓ Approved</span>
                            ) : tapAction === 'Denied' ? (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 4, padding: '2px 8px' }}>✗ Denied</span>
                            ) : (
                              <>
                                <button onClick={() => handleApproveRefill(msg)} style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, border: '1px solid #86efac', background: '#dcfce7', color: '#166534', cursor: 'pointer' }}>✓ Approve Refill</button>
                                <button onClick={() => handleDenyRefill(msg)} style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, border: '1px solid #fca5a5', background: '#fee2e2', color: '#991b1b', cursor: 'pointer' }}>✗ Deny</button>
                              </>
                            )
                          )}
                          {(msg.type === 'Lab Result' || msg.type === 'Patient Message' || msg.type === 'Referral Response') && msg.patient && (
                            <button
                              onClick={() => { selectPatient(msg.patient); navigate(msg.type === 'Lab Result' ? `/chart/${msg.patient}/labs` : `/chart/${msg.patient}`); }}
                              style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1e40af', cursor: 'pointer' }}>
                              📋 View Chart
                            </button>
                          )}
                          {msg.type === 'Prior Auth' && (
                            <button
                              onClick={() => { handleSelectMessage(msg); }}
                              style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, border: '1px solid #fca5a5', background: '#fef2f2', color: '#991b1b', cursor: 'pointer' }}>
                              ⚡ Resolve
                            </button>
                          )}
                          {msg.type === 'Check-in Alert' && (
                            <button
                              onClick={() => { handleSelectMessage(msg); }}
                              style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, border: '1px solid #a5f3fc', background: '#ecfeff', color: '#0e7490', cursor: 'pointer' }}>
                              ✓ Acknowledge
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}

          {/* Completed / auto-closed section */}
          {filteredMessages.completed.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(s => !s)}
                style={{
                  width: '100%', padding: '8px 14px', background: '#f8fafc', border: 'none',
                  borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  fontSize: 11, fontWeight: 700, color: '#6b7280', textAlign: 'left',
                }}>
                <span style={{ fontSize: 10, transform: showCompleted ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>▶</span>
                ✅ Completed ({filteredMessages.completed.length})
                <span style={{ fontSize: 10, fontWeight: 400, color: '#9ca3af' }}>— auto-closed after resolution</span>
              </button>
              {showCompleted && filteredMessages.completed.map(msg => (
                <div
                  key={msg.id}
                  onClick={() => handleSelectMessage(msg)}
                  style={{
                    padding: '8px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                    background: selectedId === msg.id ? '#f0fdf4' : '#fafafa',
                    opacity: 0.75, transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.75'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {msg.subject}
                    </div>
                    <span style={{ fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>{msg.date}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
                    <span style={{
                      fontSize: 9.5, background: '#dcfce7', color: '#166534',
                      padding: '1px 6px', borderRadius: 8, fontWeight: 700, flexShrink: 0,
                    }}>✓ {msg.status}</span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{msg.from}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )} {/* end message list column */}

        {/* Message Detail Column */}
        {(!isMobile || mobilePanel === 2) && (
        <div style={{ background: 'var(--bg-white)', overflowY: 'auto' }}>
          {isMobile && (
            <button onClick={() => setMobilePanel(1)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 14px', width:'100%', background:'#f8fafc', border:'none', borderBottom:'1px solid var(--border)', fontSize:12, fontWeight:700, color:'var(--text-secondary)', cursor:'pointer' }}>
              ← Back to Messages
            </button>
          )}
          {!selectedMessage ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 60, marginBottom: 12 }}>📬</div>
                <h3 style={{ marginBottom: 4 }}>Select a message</h3>
                <p className="text-sm">Choose a message from the list to view details</p>
              </div>
            </div>
          ) : (
            <div style={{ padding: 24 }}>
              {/* Message Header */}
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, flex: 1 }}>{selectedMessage.subject}</h2>
                  <div className="flex gap-2">
                    {selectedMessage.urgent && <span className="badge badge-danger">⚠️ URGENT</span>}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 'var(--radius-chip)', fontSize: 11, fontWeight: 700,
                      background: TYPE_TAG_COLORS[selectedMessage.type]?.bg || '#f1f5f9',
                      color: TYPE_TAG_COLORS[selectedMessage.type]?.color || '#475569',
                      border: `1px solid ${TYPE_TAG_COLORS[selectedMessage.type]?.border || '#e2e8f0'}`,
                    }}>
                      <TypeIcon type={selectedMessage.type} size={12} />
                      {selectedMessage.type}
                    </span>
                    {(() => {
                      const cat = selectedMessage.category || 'General';
                      const meta = CATEGORY_META[cat];
                      if (!meta || cat === 'General') return null;
                      return (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 10px', borderRadius: 'var(--radius-chip)', fontSize: 11, fontWeight: 700,
                          background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
                        }}>
                          {meta.icon} {cat}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-muted" style={{ flexWrap: 'wrap' }}>
                  <span><strong>From:</strong> {selectedMessage.from}</span>
                  <span><strong>Date:</strong> {selectedMessage.date}</span>
                  {selectedMessage.patientName && <span><strong>Patient:</strong> {selectedMessage.patientName}</span>}
                </div>
              </div>

              {/* Medication restriction banner for front desk */}
              {currentUser?.role === 'front_desk' && isMedicationRelated(selectedMessage) && (
                <div style={{ background: '#fef9c3', border: '1px solid #fbbf24', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 2 }}>Medication-related message</div>
                    <div style={{ fontSize: 12, color: '#78350f' }}>Front desk staff cannot reply to messages about medications. Please assign this to the treating provider for clinical review.</div>
                  </div>
                </div>
              )}

              {/* Message Body */}
              <div style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 20, whiteSpace: 'pre-wrap' }}>
                {selectedMessage.body}
              </div>

              {/* Actions */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  {currentUser?.role === 'front_desk' && isMedicationRelated(selectedMessage) ? (
                    <button
                      className="btn btn-sm"
                      style={{ background: '#7c3aed', color: 'white' }}
                      onClick={handleAssignToProvider}
                      disabled={selectedMessage.status === 'Assigned to Provider'}
                    >
                      📋 {selectedMessage.status === 'Assigned to Provider' ? 'Assigned to Provider' : 'Assign to Provider'}
                    </button>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => setShowReply(!showReply)}>
                      ↩️ Reply
                    </button>
                  )}
                  <button className="btn btn-outline btn-sm" onClick={() => handleMarkUnread(selectedMessage.id)}>
                    📩 Mark Unread
                  </button>
                  <DemoDisabled reason="Archiving messages is disabled in demo mode">
                    <button className="btn btn-outline btn-sm" onClick={() => updateMessageStatus(selectedMessage.id, 'Archived')}
                      style={{ color: '#6b7280', borderColor: '#d1d5db' }}>
                      🗃 Archive
                    </button>
                  </DemoDisabled>
                  {selectedMessage.type === 'Rx Refill Request' && (() => {
                    const action = refillAction[selectedMessage.id] || selectedMessage.status;
                    if (action === 'Approved') {
                      return <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 700 }}>✅ Refill Approved</span>;
                    }
                    if (action === 'Denied') {
                      return <span style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 700 }}>❌ Refill Denied</span>;
                    }
                    return (
                      <>
                        <button className="btn btn-sm" style={{ background: 'var(--success)', color: 'white' }}
                          onClick={() => handleApproveRefill(selectedMessage)}>✅ Approve Refill</button>
                        <button className="btn btn-sm" style={{ background: 'var(--danger)', color: 'white' }}
                          onClick={() => handleDenyRefill(selectedMessage)}>❌ Deny Refill</button>
                      </>
                    );
                  })()}
                  {selectedMessage.type === 'Prior Auth' && (
                    <button className="btn btn-sm" style={{ background: 'var(--warning)', color: 'white' }}>📋 Open PA Form</button>
                  )}
                  {selectedMessage.type === 'Lab Result' && selectedMessage.patient && (
                    <button className="btn btn-sm btn-outline" onClick={() => {
                      selectPatient(selectedMessage.patient);
                      navigate(`/chart/${selectedMessage.patient}/labs`);
                    }}>📊 View Full Results</button>
                  )}
                </div>

                {replySent && (
                  <div className="alert alert-success" style={{ marginTop: 12, padding: '8px 14px', fontSize: 13 }}>
                    ✅ Reply sent to {selectedMessage.patientName}.
                  </div>
                )}

                {assignedMsg && (
                  <div className="alert alert-success" style={{ marginTop: 12, padding: '8px 14px', fontSize: 13 }}>
                    ✅ Message assigned to provider for clinical review.
                  </div>
                )}

                {/* Reply Form — hidden for front desk on medication messages */}
                {showReply && !(currentUser?.role === 'front_desk' && isMedicationRelated(selectedMessage)) && (
                  <div style={{ marginTop: 16, padding: 16, background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                      Replying to <strong>{selectedMessage.patientName}</strong> — this message will appear in their Patient Chat.
                    </div>
                    <textarea
                      className="form-textarea"
                      rows={4}
                      placeholder="Type your reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSendReply(); } }}
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button className="btn btn-primary btn-sm" onClick={handleSendReply} disabled={!replyText.trim()}>Send Reply</button>
                      <button className="btn btn-outline btn-sm" onClick={() => { setShowReply(false); setReplyText(''); }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        )} {/* end detail column */}
      </div>
    </div>
  );
}
