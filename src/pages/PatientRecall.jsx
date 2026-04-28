import React, { useState, useMemo } from 'react';
import { usePatient } from '../contexts/PatientContext';
import { useAuth } from '../contexts/AuthContext';

const RECALL_REASONS = [
  'PHQ-9 Rescreen Due', 'GAD-7 Rescreen Due', 'Annual Psychiatric Evaluation',
  'Medication Monitoring — Lab Due', 'Treatment Plan Review Due',
  'No Visit in 90+ Days', 'Missed Last Appointment', 'Immunization Due',
  'Substance Use Screening Overdue', 'Telehealth Follow-Up Needed',
  'Preventive Screening Due', 'C-SSRS Re-assessment Due',
];
const OUTREACH_METHODS = ['Phone', 'Text/SMS', 'Email', 'Portal Message', 'Letter/Mail'];
const OUTREACH_STATUS = ['Not Started', 'Attempted', 'Contacted', 'Scheduled', 'Declined', 'Unable to Reach'];
const STATUS_COLORS = {
  'Not Started':     { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
  Attempted:         { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  Contacted:         { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
  Scheduled:         { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  Declined:          { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  'Unable to Reach': { bg: '#fef3c7', color: '#78350f', dot: '#d97706' },
};

const MOCK_RECALLS = [
  { id: 'rc-1', patientName: 'James Anderson', mrn: 'MRN-001', phone: '(555) 111-2233', email: 'james.a@email.com', reason: 'Medication Monitoring — Lab Due', detail: 'Lithium level and TSH due — last drawn 2/25/2026', lastVisit: '2026-03-24', nextDue: '2026-04-15', outreachStatus: 'Not Started', attempts: 0, lastAttempt: '', method: '', notes: '', provider: 'Dr. Chris Lee' },
  { id: 'rc-2', patientName: 'Maria Garcia', mrn: 'MRN-002', phone: '(555) 222-3344', email: 'maria.g@email.com', reason: 'GAD-7 Rescreen Due', detail: 'Last GAD-7 score: 14 (moderate) on 2/5/2026. Due for 8-week rescreen.', lastVisit: '2026-04-09', nextDue: '2026-04-05', outreachStatus: 'Contacted', attempts: 1, lastAttempt: '2026-04-10', method: 'Portal Message', notes: 'Patient responded — will complete at next visit', provider: 'Dr. Chris Lee' },
  { id: 'rc-3', patientName: 'Robert Chen', mrn: 'MRN-003', phone: '(555) 333-4455', email: 'robert.c@email.com', reason: 'No Visit in 90+ Days', detail: 'New patient accepted but never scheduled first appointment. Treatment-resistant depression referral.', lastVisit: '', nextDue: '2026-04-08', outreachStatus: 'Attempted', attempts: 2, lastAttempt: '2026-04-13', method: 'Phone', notes: 'Left voicemail x2. No callback yet.', provider: 'Dr. Chris Lee' },
  { id: 'rc-4', patientName: 'Ashley Kim', mrn: 'MRN-004', phone: '(555) 444-5566', email: 'ashley.k@email.com', reason: 'Treatment Plan Review Due', detail: 'Treatment plan created 1/15/2026. 90-day review due.', lastVisit: '2026-04-07', nextDue: '2026-04-15', outreachStatus: 'Not Started', attempts: 0, lastAttempt: '', method: '', notes: '', provider: 'April Torres, LCSW' },
  { id: 'rc-5', patientName: 'Dorothy Wilson', mrn: 'MRN-005', phone: '(555) 555-6677', email: 'dorothy.w@email.com', reason: 'C-SSRS Re-assessment Due', detail: 'Patient endorsed passive SI 3/18/2026. Safety plan in place. C-SSRS rescreen at 30 days.', lastVisit: '2026-03-18', nextDue: '2026-04-17', outreachStatus: 'Scheduled', attempts: 1, lastAttempt: '2026-04-14', method: 'Phone', notes: 'Scheduled for 4/17 follow-up. Patient denies current SI.', provider: 'Dr. Chris Lee' },
  { id: 'rc-6', patientName: 'Sophia Martinez', mrn: 'MRN-006', phone: '(555) 666-7788', email: 'sophia.m@email.com', reason: 'Missed Last Appointment', detail: 'No-showed 4/3/2026 therapy session. 2nd no-show in 60 days.', lastVisit: '2026-03-13', nextDue: '2026-04-03', outreachStatus: 'Attempted', attempts: 3, lastAttempt: '2026-04-12', method: 'Text/SMS', notes: 'Texted x2, called x1. No response. Sent portal message 4/12.', provider: 'April Torres, LCSW' },
  { id: 'rc-7', patientName: 'Brian Foster', mrn: 'MRN-007', phone: '(555) 777-8899', email: 'brian.f@email.com', reason: 'Substance Use Screening Overdue', detail: 'AUDIT-C last administered 12/2025. Due for 6-month rescreening.', lastVisit: '2026-03-01', nextDue: '2026-04-01', outreachStatus: 'Unable to Reach', attempts: 4, lastAttempt: '2026-04-14', method: 'Phone', notes: 'Phone disconnected. Email bounced. Consider mailing letter.', provider: 'Dr. Chris Lee' },
];

export default function PatientRecall() {
  const { currentUser } = useAuth();
  const [recalls, setRecalls] = useState(MOCK_RECALLS);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterReason, setFilterReason] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedRecall, setSelectedRecall] = useState(null);
  const [showOutreach, setShowOutreach] = useState(false);
  const [outreachForm, setOutreachForm] = useState({ method: 'Phone', notes: '' });

  const filtered = useMemo(() => {
    let list = [...recalls];
    if (filterStatus !== 'All') list = list.filter(r => r.outreachStatus === filterStatus);
    if (filterReason !== 'All') list = list.filter(r => r.reason === filterReason);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.patientName.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(a.nextDue) - new Date(b.nextDue));
  }, [recalls, filterStatus, filterReason, search]);

  const stats = useMemo(() => ({
    total: recalls.length,
    notStarted: recalls.filter(r => r.outreachStatus === 'Not Started').length,
    overdue: recalls.filter(r => new Date(r.nextDue) < new Date() && r.outreachStatus !== 'Scheduled').length,
    scheduled: recalls.filter(r => r.outreachStatus === 'Scheduled').length,
    unreachable: recalls.filter(r => r.outreachStatus === 'Unable to Reach').length,
  }), [recalls]);

  const logOutreach = () => {
    if (!selectedRecall) return;
    setRecalls(prev => prev.map(r => r.id === selectedRecall.id ? {
      ...r, outreachStatus: 'Attempted', attempts: r.attempts + 1,
      lastAttempt: new Date().toISOString().slice(0, 10),
      method: outreachForm.method,
      notes: r.notes ? `${r.notes}\n[${new Date().toISOString().slice(0, 10)}] ${outreachForm.method}: ${outreachForm.notes}` : `[${new Date().toISOString().slice(0, 10)}] ${outreachForm.method}: ${outreachForm.notes}`,
    } : r));
    setSelectedRecall(prev => prev ? { ...prev, attempts: prev.attempts + 1, outreachStatus: 'Attempted' } : null);
    setShowOutreach(false);
    setOutreachForm({ method: 'Phone', notes: '' });
  };

  const markScheduled = (id) => {
    setRecalls(prev => prev.map(r => r.id === id ? { ...r, outreachStatus: 'Scheduled' } : r));
    if (selectedRecall?.id === id) setSelectedRecall(prev => prev ? { ...prev, outreachStatus: 'Scheduled' } : null);
  };

  const isOverdue = (r) => new Date(r.nextDue) < new Date() && r.outreachStatus !== 'Scheduled';

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>📞 Patient Recall & Outreach</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Track overdue patients, manage outreach campaigns, and improve care continuity</p>
        </div>
        <button className="btn btn-primary" onClick={() => alert('📧 Sending batch outreach to all Not Started recalls...')}>📧 Batch Outreach</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '📋', val: stats.total, label: 'Total Recalls', bg: '#eff6ff' },
          { icon: '🆕', val: stats.notStarted, label: 'Not Started', bg: '#f1f5f9' },
          { icon: '⚠️', val: stats.overdue, label: 'Overdue', bg: '#fee2e2' },
          { icon: '✅', val: stats.scheduled, label: 'Scheduled', bg: '#dcfce7' },
          { icon: '📵', val: stats.unreachable, label: 'Unable to Reach', bg: '#fef3c7' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="form-input" placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 180, fontSize: 13 }} />
        <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 160, fontSize: 12 }}>
          <option value="All">All Statuses</option>
          {OUTREACH_STATUS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="form-input" value={filterReason} onChange={e => setFilterReason(e.target.value)} style={{ width: 200, fontSize: 12 }}>
          <option value="All">All Reasons</option>
          {RECALL_REASONS.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      {/* List + Detail */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedRecall ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>{filtered.length} Patient{filtered.length !== 1 ? 's' : ''}</div>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {filtered.map(rc => {
              const sc = STATUS_COLORS[rc.outreachStatus];
              const overdue = isOverdue(rc);
              return (
                <div key={rc.id} onClick={() => setSelectedRecall(rc)}
                  style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedRecall?.id === rc.id ? 'var(--primary-light)' : overdue ? '#fef2f2' : 'transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{rc.patientName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{rc.reason}</div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: sc.bg, color: sc.color }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />{rc.outreachStatus}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span style={{ color: overdue ? '#dc2626' : 'inherit', fontWeight: overdue ? 700 : 400 }}>📅 Due: {rc.nextDue}{overdue ? ' ⚠️' : ''}</span>
                    <span>📞 Attempts: {rc.attempts}</span>
                    {rc.lastAttempt && <span>🕐 Last: {rc.lastAttempt}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedRecall && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>📞 {selectedRecall.patientName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>MRN {selectedRecall.mrn} · {selectedRecall.provider}</div>
                </div>
                <button onClick={() => setSelectedRecall(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>
            </div>
            <div style={{ padding: 20, overflowY: 'auto', maxHeight: 460 }}>
              {/* Reason */}
              <div style={{ padding: 14, background: isOverdue(selectedRecall) ? '#fef2f2' : '#eff6ff', borderRadius: 10, border: `1px solid ${isOverdue(selectedRecall) ? '#fca5a5' : '#bfdbfe'}`, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: isOverdue(selectedRecall) ? '#991b1b' : '#1e40af', marginBottom: 4 }}>
                  {isOverdue(selectedRecall) ? '⚠️ OVERDUE — ' : ''}{selectedRecall.reason}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>{selectedRecall.detail}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                {[
                  ['Phone', selectedRecall.phone], ['Email', selectedRecall.email],
                  ['Last Visit', selectedRecall.lastVisit || 'Never'], ['Due Date', selectedRecall.nextDue],
                  ['Outreach Attempts', selectedRecall.attempts], ['Last Method', selectedRecall.method || '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>

              {selectedRecall.notes && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Outreach Notes</div>
                  <div style={{ fontSize: 12, lineHeight: 1.6, padding: 12, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', whiteSpace: 'pre-wrap' }}>{selectedRecall.notes}</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" onClick={() => setShowOutreach(true)}>📞 Log Outreach</button>
                {selectedRecall.outreachStatus !== 'Scheduled' && <button className="btn btn-secondary btn-sm" onClick={() => markScheduled(selectedRecall.id)}>📅 Mark Scheduled</button>}
                <button className="btn btn-secondary btn-sm" onClick={() => alert('📧 Sending portal message to ' + selectedRecall.patientName)}>📧 Portal Message</button>
                <button className="btn btn-secondary btn-sm" onClick={() => alert('📱 Sending SMS to ' + selectedRecall.phone)}>📱 Text</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Log Outreach Modal */}
      {showOutreach && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowOutreach(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>📞 Log Outreach Attempt</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>{selectedRecall?.patientName}</div>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Method</label>
                <select className="form-input" value={outreachForm.method} onChange={e => setOutreachForm(f => ({ ...f, method: e.target.value }))}>
                  {OUTREACH_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea className="form-textarea" rows={3} value={outreachForm.notes} onChange={e => setOutreachForm(f => ({ ...f, notes: e.target.value }))} placeholder="What happened? Left voicemail, spoke with patient, etc." />
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowOutreach(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={logOutreach}>📞 Log Attempt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
