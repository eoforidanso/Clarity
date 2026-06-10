/**
 * PriorAuthDrawer — Prior Authorization Tracker
 * Submit PA requests, track status, attach approval numbers, alert on expiry.
 */
import React, { useState } from 'react';

const BG    = '#1a1f2e';
const BG2   = '#232838';
const BG3   = '#2a3045';
const BORDER = 'rgba(255,255,255,0.08)';
const T_PRI = 'rgba(255,255,255,0.95)';
const T_SEC = 'rgba(255,255,255,0.60)';
const T_MUT = 'rgba(255,255,255,0.38)';
const ACCENT = '#6366f1';

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     color: '#6b7280', bg: 'rgba(107,114,128,0.15)', icon: '📝' },
  submitted: { label: 'Submitted', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  icon: '📤' },
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  icon: '⏳' },
  approved:  { label: 'Approved',  color: '#10b981', bg: 'rgba(16,185,129,0.15)',  icon: '✅' },
  denied:    { label: 'Denied',    color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   icon: '❌' },
  expired:   { label: 'Expired',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', icon: '⏰' },
  appealing: { label: 'Appealing', color: '#f97316', bg: 'rgba(249,115,22,0.15)', icon: '⚖️' },
};

const BLANK_PA = {
  drug: '', dose: '', indication: '', icd10: '', insurer: '',
  memberID: '', groupNumber: '', clinicalNotes: '', alternativesTried: '',
  status: 'draft', approvalNumber: '', approvedDate: '', expiresDate: '',
  denialReason: '', submittedDate: '', notes: '',
};

function StatusBadge({ status }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 10,
      background: s.bg, color: s.color, border: `1px solid ${s.color}40`,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {s.icon} {s.label}
    </span>
  );
}

function PACard({ pa, onEdit, onSelect, selected }) {
  const today = new Date().toISOString().split('T')[0];
  const isExpiringSoon = pa.expiresDate && pa.expiresDate > today &&
    Math.round((new Date(pa.expiresDate) - new Date(today)) / 86400000) <= 30;
  const isExpired = pa.expiresDate && pa.expiresDate <= today && pa.status === 'approved';

  return (
    <div
      onClick={() => onSelect(pa)}
      style={{
        background: selected ? 'rgba(99,102,241,0.15)' : BG2,
        border: `1px solid ${selected ? ACCENT : BORDER}`,
        borderRadius: 10, padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
        transition: 'all 0.12s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T_PRI }}>{pa.drug} {pa.dose}</div>
          <div style={{ fontSize: 11, color: T_MUT, marginTop: 2 }}>{pa.insurer}</div>
          {pa.indication && <div style={{ fontSize: 11, color: T_SEC, marginTop: 1 }}>Dx: {pa.indication}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <StatusBadge status={isExpired ? 'expired' : pa.status} />
          {pa.approvalNumber && (
            <span style={{ fontSize: 9.5, color: '#10b981', fontFamily: 'monospace' }}>#{pa.approvalNumber}</span>
          )}
        </div>
      </div>
      {pa.expiresDate && (
        <div style={{ marginTop: 6, fontSize: 10.5, color: isExpired ? '#ef4444' : isExpiringSoon ? '#f59e0b' : T_MUT }}>
          {isExpired ? '⏰ Expired: ' : isExpiringSoon ? '⚠ Expires: ' : '📅 Valid through: '}{pa.expiresDate}
        </div>
      )}
      {pa.status === 'denied' && pa.denialReason && (
        <div style={{ marginTop: 5, fontSize: 10.5, color: '#fca5a5', background: 'rgba(239,68,68,0.08)', padding: '3px 8px', borderRadius: 4 }}>
          Denial: {pa.denialReason}
        </div>
      )}
    </div>
  );
}

export default function PriorAuthDrawer({ isOpen, onClose, patientId, patientName, insurance, existingPAs = [], onSave }) {
  const [view,     setView]     = useState('list'); // 'list' | 'new' | 'detail'
  const [selected, setSelected] = useState(null);
  const [form,     setForm]     = useState({ ...BLANK_PA });
  const [paList,   setPAList]   = useState(existingPAs);

  if (!isOpen) return null;

  const handleSave = () => {
    const entry = {
      ...form,
      id: `pa-${Date.now()}`,
      createdDate: new Date().toISOString().split('T')[0],
      patientId,
    };
    const updated = [...paList, entry];
    setPAList(updated);
    onSave?.(updated);
    setForm({ ...BLANK_PA });
    setView('list');
  };

  const handleStatusChange = (id, newStatus, extra = {}) => {
    const updated = paList.map(pa => pa.id === id ? { ...pa, status: newStatus, ...extra } : pa);
    setPAList(updated);
    onSave?.(updated);
    setSelected(updated.find(p => p.id === id) || null);
  };

  const FLD = ({ label, value, onChange, placeholder, type = 'text', multiline = false }) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 10, color: T_MUT, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width:'100%', boxSizing:'border-box', background:BG3, border:`1px solid ${BORDER}`, borderRadius:7, color:T_PRI, fontSize:12, padding:'7px 10px', resize:'vertical', minHeight:60, outline:'none', fontFamily:'inherit', lineHeight:1.5 }} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width:'100%', boxSizing:'border-box', background:BG3, border:`1px solid ${BORDER}`, borderRadius:7, color:T_PRI, fontSize:12, padding:'7px 10px', outline:'none' }} />
      )}
    </div>
  );

  const pending = paList.filter(p => ['submitted','pending'].includes(p.status));
  const expiring = paList.filter(p => {
    if (p.status !== 'approved' || !p.expiresDate) return false;
    const days = Math.round((new Date(p.expiresDate) - new Date()) / 86400000);
    return days >= 0 && days <= 30;
  });

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1400 }} />
      <div style={{
        position:'fixed', top:0, right:0, bottom:0, width:680,
        background:BG, zIndex:1401, display:'flex', flexDirection:'column',
        boxShadow:'-8px 0 40px rgba(0,0,0,0.5)',
        fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        {/* Header */}
        <div style={{ padding:'14px 20px 12px', borderBottom:`1px solid ${BORDER}`, background:'#141824', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ color:T_PRI, fontWeight:700, fontSize:15 }}>📋 Prior Authorization Tracker</div>
              <div style={{ color:T_MUT, fontSize:11, marginTop:2 }}>{patientName || 'Patient'}</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {view !== 'new' && (
                <button onClick={() => { setView('new'); setForm({ ...BLANK_PA, insurer: insurance?.primary?.payerName || '', memberID: insurance?.primary?.memberId || '', groupNumber: insurance?.primary?.groupNumber || '' }); }}
                  style={{ background:ACCENT, border:'none', color:'#fff', fontSize:12, fontWeight:700, padding:'6px 14px', borderRadius:7, cursor:'pointer' }}>
                  + New PA
                </button>
              )}
              <button onClick={onClose} style={{ background:'none', border:'none', color:T_MUT, fontSize:22, cursor:'pointer', lineHeight:1 }}>✕</button>
            </div>
          </div>
          {/* Alert strip */}
          {(pending.length > 0 || expiring.length > 0) && (
            <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
              {pending.length > 0 && <span style={{ fontSize:10.5, color:'#fbbf24', background:'rgba(251,191,36,0.12)', padding:'3px 10px', borderRadius:10, border:'1px solid rgba(251,191,36,0.3)' }}>⏳ {pending.length} pending PA{pending.length>1?'s':''}</span>}
              {expiring.length > 0 && <span style={{ fontSize:10.5, color:'#f87171', background:'rgba(248,113,113,0.12)', padding:'3px 10px', borderRadius:10, border:'1px solid rgba(248,113,113,0.3)' }}>⚠ {expiring.length} expiring within 30 days</span>}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>

          {/* New PA form */}
          {view === 'new' && (
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <button onClick={() => setView('list')} style={{ background:'none', border:'none', color:ACCENT, fontSize:12, cursor:'pointer', padding:0 }}>← Back</button>
                <span style={{ color:T_PRI, fontWeight:700, fontSize:14 }}>New Prior Authorization Request</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                <FLD label="Drug Name" value={form.drug} onChange={v => setForm(p => ({...p, drug:v}))} placeholder="e.g. Vyvanse 30mg" />
                <FLD label="Dose / Strength" value={form.dose} onChange={v => setForm(p => ({...p, dose:v}))} placeholder="e.g. 30mg daily" />
                <FLD label="Primary Indication" value={form.indication} onChange={v => setForm(p => ({...p, indication:v}))} placeholder="e.g. ADHD" />
                <FLD label="ICD-10 Code(s)" value={form.icd10} onChange={v => setForm(p => ({...p, icd10:v}))} placeholder="e.g. F90.0" />
                <FLD label="Insurance / Payer" value={form.insurer} onChange={v => setForm(p => ({...p, insurer:v}))} placeholder="e.g. Blue Cross PPO" />
                <FLD label="Member ID" value={form.memberID} onChange={v => setForm(p => ({...p, memberID:v}))} placeholder="Member ID" />
              </div>
              <FLD label="Alternatives Tried & Failed" value={form.alternativesTried} onChange={v => setForm(p => ({...p, alternativesTried:v}))} placeholder="e.g. Tried methylphenidate 18mg — insufficient response…" multiline />
              <FLD label="Clinical Justification / Notes" value={form.clinicalNotes} onChange={v => setForm(p => ({...p, clinicalNotes:v}))} placeholder="Medical necessity statement…" multiline />
              <div style={{ display:'flex', gap:10, marginTop:6 }}>
                <button onClick={() => setForm(p => ({...p, status:'submitted', submittedDate: new Date().toISOString().split('T')[0]}))} style={{ flex:1, padding:'8px', borderRadius:8, border:'none', background:'#3b82f6', color:'#fff', fontSize:12.5, fontWeight:700, cursor:'pointer' }}>
                  📤 Submit PA
                </button>
                <button onClick={handleSave} style={{ flex:1, padding:'8px', borderRadius:8, border:`1px solid ${BORDER}`, background:BG3, color:T_SEC, fontSize:12.5, cursor:'pointer' }}>
                  📝 Save as Draft
                </button>
              </div>
            </div>
          )}

          {/* List view */}
          {view === 'list' && (
            <div>
              {paList.length === 0 ? (
                <div style={{ textAlign:'center', color:T_MUT, fontSize:13, padding:'48px 0' }}>
                  No prior authorizations on file.<br />
                  <button onClick={() => setView('new')} style={{ marginTop:12, background:ACCENT, border:'none', color:'#fff', borderRadius:8, padding:'8px 20px', fontSize:13, cursor:'pointer' }}>+ Create First PA</button>
                </div>
              ) : (
                paList.map(pa => (
                  <PACard key={pa.id} pa={pa} selected={selected?.id === pa.id}
                    onSelect={p => { setSelected(p); setView('detail'); }}
                    onEdit={() => { setForm(pa); setView('new'); }}
                  />
                ))
              )}
            </div>
          )}

          {/* Detail view */}
          {view === 'detail' && selected && (
            <div>
              <button onClick={() => setView('list')} style={{ background:'none', border:'none', color:ACCENT, fontSize:12, cursor:'pointer', padding:0, marginBottom:12 }}>← All PAs</button>
              <div style={{ background:BG2, border:`1px solid ${BORDER}`, borderRadius:12, padding:'16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:800, color:T_PRI }}>{selected.drug} {selected.dose}</div>
                    <div style={{ fontSize:12, color:T_MUT, marginTop:2 }}>{selected.insurer} · Member: {selected.memberID}</div>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 20px', marginTop:14 }}>
                  {[
                    ['Indication', selected.indication],
                    ['ICD-10',     selected.icd10],
                    ['Submitted',  selected.submittedDate],
                    ['Approval #', selected.approvalNumber],
                    ['Valid through', selected.expiresDate],
                    ['Denial reason', selected.denialReason],
                  ].filter(([,v]) => v).map(([l,v]) => (
                    <div key={l}>
                      <div style={{ fontSize:10, color:T_MUT, textTransform:'uppercase', letterSpacing:'0.4px' }}>{l}</div>
                      <div style={{ fontSize:12.5, color:T_PRI, marginTop:1 }}>{v}</div>
                    </div>
                  ))}
                </div>

                {selected.clinicalNotes && (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:10, color:T_MUT, textTransform:'uppercase', marginBottom:4 }}>Clinical Notes</div>
                    <div style={{ fontSize:12, color:T_SEC, lineHeight:1.5 }}>{selected.clinicalNotes}</div>
                  </div>
                )}

                {/* Status actions */}
                <div style={{ marginTop:16, display:'flex', flexWrap:'wrap', gap:8 }}>
                  {selected.status === 'submitted' && (
                    <button onClick={() => handleStatusChange(selected.id, 'pending')} style={{ background:'rgba(245,158,11,0.2)', border:'1px solid rgba(245,158,11,0.4)', color:'#fbbf24', borderRadius:7, padding:'6px 14px', fontSize:11.5, cursor:'pointer', fontWeight:700 }}>⏳ Mark Pending</button>
                  )}
                  {['submitted','pending'].includes(selected.status) && (
                    <>
                      <button onClick={() => {
                        const num = prompt('Enter approval number:');
                        const exp = prompt('Approval valid through (YYYY-MM-DD):');
                        if (num) handleStatusChange(selected.id, 'approved', { approvalNumber: num, approvedDate: new Date().toISOString().split('T')[0], expiresDate: exp || '' });
                      }} style={{ background:'rgba(16,185,129,0.2)', border:'1px solid rgba(16,185,129,0.4)', color:'#10b981', borderRadius:7, padding:'6px 14px', fontSize:11.5, cursor:'pointer', fontWeight:700 }}>✅ Mark Approved</button>
                      <button onClick={() => {
                        const reason = prompt('Denial reason:');
                        handleStatusChange(selected.id, 'denied', { denialReason: reason || 'Not medically necessary per plan policy' });
                      }} style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.35)', color:'#f87171', borderRadius:7, padding:'6px 14px', fontSize:11.5, cursor:'pointer', fontWeight:700 }}>❌ Mark Denied</button>
                    </>
                  )}
                  {selected.status === 'denied' && (
                    <button onClick={() => handleStatusChange(selected.id, 'appealing')} style={{ background:'rgba(249,115,22,0.15)', border:'1px solid rgba(249,115,22,0.35)', color:'#fb923c', borderRadius:7, padding:'6px 14px', fontSize:11.5, cursor:'pointer', fontWeight:700 }}>⚖️ File Appeal</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
