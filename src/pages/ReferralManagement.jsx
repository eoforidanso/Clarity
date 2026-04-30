import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';

const REFERRAL_STATUSES = ['Pending', 'Sent', 'Received', 'Accepted', 'Scheduled', 'Completed', 'Denied', 'Expired'];
const STATUS_COLORS = {
  Pending:   { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  Sent:      { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
  Received:  { bg: '#e0e7ff', color: '#3730a3', dot: '#6366f1' },
  Accepted:  { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  Scheduled: { bg: '#ccfbf1', color: '#0f766e', dot: '#14b8a6' },
  Completed: { bg: '#f0f4ff', color: '#3730a3', dot: '#4f46e5' },
  Denied:    { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  Expired:   { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
};

const SPECIALTIES = [
  'Psychiatry', 'Psychology', 'Neurology', 'Internal Medicine', 'Cardiology',
  'Endocrinology', 'Gastroenterology', 'Pain Management', 'Substance Abuse',
  'Social Work', 'Occupational Therapy', 'Speech Therapy', 'Primary Care',
  'Dermatology', 'Ophthalmology', 'Orthopedics',
];

const PRIORITY = ['Routine', 'Urgent', 'STAT'];
const DIRECTIONS = ['Outbound', 'Inbound'];

const MOCK_REFERRALS = [
  { id: 'ref-1', direction: 'Outbound', patientId: 'p1', patientName: 'James Anderson', referringProvider: 'Dr. Chris L.', referredTo: 'Dr. Michael Torres', specialty: 'Neurology', facility: 'Springfield Neurology Associates', reason: 'EEG evaluation for suspected seizure activity during psychiatric medication titration', priority: 'Urgent', status: 'Sent', createdDate: '2026-04-10', sentDate: '2026-04-10', expiresDate: '2026-07-10', notes: 'Patient on Bupropion — rule out seizure threshold lowering', authRequired: true, authStatus: 'Approved', authNumber: 'PA-2026-8841', insuranceName: 'Blue Cross Blue Shield', attachments: ['Recent labs', 'Medication list', 'Progress notes'] },
  { id: 'ref-2', direction: 'Outbound', patientId: 'p2', patientName: 'Maria Garcia', referringProvider: 'Dr. Chris L.', referredTo: 'Dr. Sarah Kim, PsyD', specialty: 'Psychology', facility: 'Clarity Psychology Group', reason: 'Neuropsychological testing — rule out ADHD vs. anxiety-related cognitive symptoms', priority: 'Routine', status: 'Scheduled', createdDate: '2026-04-05', sentDate: '2026-04-06', scheduledDate: '2026-04-28', expiresDate: '2026-07-05', notes: 'Patient reports difficulty concentrating at work', authRequired: true, authStatus: 'Approved', authNumber: 'PA-2026-7720', insuranceName: 'Aetna', attachments: ['GAD-7 scores', 'PHQ-9 scores'] },
  { id: 'ref-3', direction: 'Inbound', patientId: 'p3', patientName: 'Robert Chen', referringProvider: 'Dr. Amanda Liu (PCP)', referredTo: 'Dr. Chris L.', specialty: 'Psychiatry', facility: 'Clarity Behavioral Health', reason: 'New patient evaluation for treatment-resistant depression. Failed 2 SSRIs and 1 SNRI.', priority: 'Urgent', status: 'Accepted', createdDate: '2026-04-08', receivedDate: '2026-04-08', expiresDate: '2026-07-08', notes: 'PCP requests medication management. Patient has hx of SI, currently denied.', authRequired: false, authStatus: 'N/A', attachments: ['PCP records', 'Pharmacy history', 'Lab panel'] },
  { id: 'ref-4', direction: 'Outbound', patientId: 'p4', patientName: 'Ashley Kim', referringProvider: 'April Torres, LCSW', referredTo: 'Dr. Chris L.', specialty: 'Psychiatry', facility: 'Clarity Behavioral Health', reason: 'Medication evaluation — patient presenting with symptoms of ADHD impacting therapy progress', priority: 'Routine', status: 'Pending', createdDate: '2026-04-14', expiresDate: '2026-07-14', notes: 'Internal referral from therapy to prescriber', authRequired: false, authStatus: 'N/A', attachments: ['Therapy notes summary'] },
  { id: 'ref-5', direction: 'Outbound', patientId: 'p1', patientName: 'James Anderson', referringProvider: 'Dr. Chris L.', referredTo: 'LabCorp — Downtown', specialty: 'Internal Medicine', facility: 'LabCorp Diagnostics', reason: 'Lithium level, TSH, BMP — routine monitoring', priority: 'Routine', status: 'Completed', createdDate: '2026-03-20', sentDate: '2026-03-20', completedDate: '2026-03-25', expiresDate: '2026-06-20', notes: 'Results received and reviewed', authRequired: false, authStatus: 'N/A', attachments: [] },
  { id: 'ref-6', direction: 'Inbound', patientId: 'p5', patientName: 'Dorothy Wilson', referringProvider: 'Dr. James Park (Cardiologist)', referredTo: 'Dr. Chris L.', specialty: 'Psychiatry', facility: 'Clarity Behavioral Health', reason: 'Anxiety management — patient with cardiac history, needs psych clearance for beta-blocker adjustment', priority: 'Urgent', status: 'Pending', createdDate: '2026-04-12', expiresDate: '2026-07-12', notes: 'Cardiology requesting psychiatric input on anxiety treatment that won\'t interfere with cardiac meds', authRequired: true, authStatus: 'Pending', attachments: ['Cardiology notes', 'EKG report', 'Current medication list'] },
];

export default function ReferralManagement() {
  const { currentUser } = useAuth();
  const { patients, selectPatient } = usePatient();
  const [referrals, setReferrals] = useState(MOCK_REFERRALS);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDirection, setFilterDirection] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedRef, setSelectedRef] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({
    direction: 'Outbound', patientId: '', referredTo: '', specialty: '', facility: '',
    reason: '', priority: 'Routine', notes: '', authRequired: false,
  });
  const [faxedIds, setFaxedIds] = useState(new Set());

  const filtered = useMemo(() => {
    let list = [...referrals];
    if (filterStatus !== 'All') list = list.filter(r => r.status === filterStatus);
    if (filterDirection !== 'All') list = list.filter(r => r.direction === filterDirection);
    if (filterPriority !== 'All') list = list.filter(r => r.priority === filterPriority);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.patientName.toLowerCase().includes(q) ||
        r.referredTo.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.specialty.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
  }, [referrals, filterStatus, filterDirection, filterPriority, search]);

  const stats = useMemo(() => ({
    total: referrals.length,
    pending: referrals.filter(r => r.status === 'Pending').length,
    urgent: referrals.filter(r => r.priority === 'Urgent' || r.priority === 'STAT').length,
    needsAuth: referrals.filter(r => r.authRequired && r.authStatus === 'Pending').length,
    outbound: referrals.filter(r => r.direction === 'Outbound').length,
    inbound: referrals.filter(r => r.direction === 'Inbound').length,
    completed30: referrals.filter(r => r.status === 'Completed' && new Date(r.completedDate) > new Date(Date.now() - 30*86400000)).length,
  }), [referrals]);

  const updateStatus = (id, status) => {
    setReferrals(prev => prev.map(r => r.id === id ? { ...r, status, ...(status === 'Completed' ? { completedDate: new Date().toISOString().split('T')[0] } : {}) } : r));
    if (selectedRef?.id === id) setSelectedRef(prev => ({ ...prev, status }));
  };

  const printReferral = (ref) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const win = window.open('', '_blank', 'width=750,height=650');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>Referral \u2014 ${ref.patientName}</title><style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:Arial,sans-serif; font-size:13px; color:#111; padding:28px 36px; }
.header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #4f46e5; padding-bottom:12px; margin-bottom:16px; }
.facility-name { font-size:20px; font-weight:800; color:#4f46e5; }
.facility-sub { font-size:12px; color:#374151; margin-top:3px; line-height:1.6; }
.header-right { text-align:right; font-size:11px; color:#374151; }
.badge { display:inline-block; background:#ede9fe; color:#4f46e5; font-weight:700; font-size:11px; padding:3px 9px; border-radius:12px; border:1px solid #c4b5fd; }
.badge-urgent { background:#fee2e2; color:#991b1b; border-color:#fca5a5; }
.section { margin-bottom:14px; }
.section-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#6b7280; border-bottom:1px solid #e5e7eb; padding-bottom:4px; margin-bottom:8px; }
table { width:100%; border-collapse:collapse; }
td { padding:5px 6px; vertical-align:top; font-size:12.5px; }
td.lbl { width:40%; font-weight:600; color:#374151; }
.reason-box { background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:10px 14px; font-size:12px; line-height:1.6; color:#92400e; margin-top:4px; }
.footer { margin-top:20px; padding-top:8px; border-top:1px solid #e5e7eb; font-size:10.5px; color:#6b7280; text-align:center; }
@media print { body { padding:10px 16px; } }
</style></head><body>
<div class="header"><div>
  <div class="facility-name">Clarity Behavioral Health</div>
  <div class="facility-sub">200 N Michigan Ave, Suite 1400, Chicago, IL 60601<br/>Phone: (312) 555-0200 &nbsp;|&nbsp; Fax: (312) 555-0201</div>
</div><div class="header-right">
  <span class="badge${ref.priority === 'Urgent' || ref.priority === 'STAT' ? ' badge-urgent' : ''}">${ref.direction} Referral</span>
  <div style="margin-top:8px">Date: <strong>${dateStr}</strong></div>
  <div>Time: <strong>${timeStr}</strong></div>
  <div style="margin-top:4px;font-weight:700;color:${ref.status === 'Completed' ? '#059669' : '#374151'}">${ref.status}</div>
</div></div>
<div class="section"><div class="section-title">Patient</div><table>
  <tr><td class="lbl">Name</td><td>${ref.patientName}</td></tr>
  ${ref.insuranceName ? `<tr><td class="lbl">Insurance</td><td>${ref.insuranceName}</td></tr>` : ''}
</table></div>
<div class="section"><div class="section-title">Referral Details</div><table>
  <tr><td class="lbl">Referring Provider</td><td>${ref.referringProvider}</td></tr>
  <tr><td class="lbl">Referred To</td><td>${ref.referredTo}</td></tr>
  <tr><td class="lbl">Specialty</td><td>${ref.specialty}</td></tr>
  <tr><td class="lbl">Facility</td><td>${ref.facility || '\u2014'}</td></tr>
  <tr><td class="lbl">Priority</td><td>${ref.priority}</td></tr>
  <tr><td class="lbl">Created</td><td>${ref.createdDate}</td></tr>
  ${ref.sentDate ? `<tr><td class="lbl">Sent</td><td>${ref.sentDate}</td></tr>` : ''}
  ${ref.scheduledDate ? `<tr><td class="lbl">Scheduled</td><td>${ref.scheduledDate}</td></tr>` : ''}
  ${ref.completedDate ? `<tr><td class="lbl">Completed</td><td>${ref.completedDate}</td></tr>` : ''}
  <tr><td class="lbl">Expires</td><td>${ref.expiresDate || '\u2014'}</td></tr>
  <tr><td class="lbl">Auth Required</td><td>${ref.authRequired ? `Yes \u2014 ${ref.authStatus}${ref.authNumber ? ' (' + ref.authNumber + ')' : ''}` : 'No'}</td></tr>
</table></div>
${ref.reason ? `<div class="section"><div class="section-title">Clinical Reason for Referral</div><div class="reason-box">${ref.reason}</div></div>` : ''}
${ref.notes ? `<div class="section"><div class="section-title">Notes</div><div class="reason-box">${ref.notes}</div></div>` : ''}
${ref.attachments?.length ? `<div class="section"><div class="section-title">Attachments</div><div style="font-size:12px">${ref.attachments.map(a => `\ud83d\udcce ${a}`).join('&nbsp;&nbsp;')}</div></div>` : ''}
<div class="footer">Printed ${dateStr} at ${timeStr} \u00b7 Clarity EHR \u00b7 Confidential \u2014 For authorized use only</div>
</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const submitReferral = () => {
    const patient = patients.find(p => p.id === newForm.patientId);
    if (!patient || !newForm.reason.trim() || !newForm.specialty) return;
    const ref = {
      id: `ref-${Date.now()}`,
      ...newForm,
      patientName: `${patient.firstName} ${patient.lastName}`,
      referringProvider: `${currentUser.firstName} ${currentUser.lastName}`,
      status: 'Pending',
      createdDate: new Date().toISOString().split('T')[0],
      expiresDate: new Date(Date.now() + 90*86400000).toISOString().split('T')[0],
      authStatus: newForm.authRequired ? 'Pending' : 'N/A',
      authNumber: '',
      insuranceName: patient.insurance?.primary?.name || '',
      attachments: [],
    };
    setReferrals(prev => [ref, ...prev]);
    setShowNew(false);
    setNewForm({ direction: 'Outbound', patientId: '', referredTo: '', specialty: '', facility: '', reason: '', priority: 'Routine', notes: '', authRequired: false });
  };

  const cardSt = { background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' };
  const statCard = (icon, value, label, color) => (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `var(--${color}-light, #eff6ff)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>🔗 Referral Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Track inbound & outbound referrals, prior authorizations, and specialist coordination</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>➕ New Referral</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        {statCard('📋', stats.total, 'Total Referrals', 'blue')}
        {statCard('⏳', stats.pending, 'Pending Action', 'yellow')}
        {statCard('🚨', stats.urgent, 'Urgent', 'red')}
        {statCard('🔐', stats.needsAuth, 'Needs Prior Auth', 'purple')}
        {statCard('✅', stats.completed30, 'Completed (30d)', 'green')}
      </div>

      {/* Filters */}
      <div style={{ ...cardSt, marginBottom: 16, padding: '14px 18px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="form-input" placeholder="Search referrals..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, fontSize: 13 }} />
        <select className="form-input" value={filterDirection} onChange={e => setFilterDirection(e.target.value)} style={{ width: 140, fontSize: 12 }}>
          <option value="All">All Directions</option>
          {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 140, fontSize: 12 }}>
          <option value="All">All Statuses</option>
          {REFERRAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-input" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ width: 120, fontSize: 12 }}>
          <option value="All">All Priority</option>
          {PRIORITY.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* List + Detail */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedRef ? '1fr 1fr' : '1fr', gap: 16 }}>
        {/* Referral list */}
        <div style={cardSt}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{filtered.length} Referral{filtered.length !== 1 ? 's' : ''}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: '#dbeafe', color: '#1e40af', fontWeight: 700 }}>↗ {stats.outbound} Out</span>
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: '#dcfce7', color: '#166534', fontWeight: 700 }}>↙ {stats.inbound} In</span>
            </div>
          </div>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {filtered.map(ref => {
              const sc = STATUS_COLORS[ref.status] || STATUS_COLORS.Pending;
              const isSelected = selectedRef?.id === ref.id;
              return (
                <div key={ref.id} onClick={() => setSelectedRef(ref)}
                  style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isSelected ? 'var(--primary-light, #eff6ff)' : 'transparent', transition: 'background 0.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{ref.direction === 'Outbound' ? '↗️' : '↙️'}</span>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{ref.patientName}</span>
                      {ref.priority === 'Urgent' && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', fontWeight: 800 }}>URGENT</span>}
                      {ref.priority === 'STAT' && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', fontWeight: 800 }}>STAT</span>}
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: sc.bg, color: sc.color }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />{ref.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <strong>{ref.specialty}</strong> → {ref.referredTo}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                    <span>📅 {ref.createdDate}</span>
                    {ref.authRequired && <span style={{ color: ref.authStatus === 'Approved' ? '#059669' : ref.authStatus === 'Pending' ? '#d97706' : '#dc2626' }}>🔐 Auth: {ref.authStatus}</span>}
                    {ref.attachments?.length > 0 && <span>📎 {ref.attachments.length}</span>}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🔗</div>
                <div style={{ fontWeight: 600 }}>No referrals match your filters</div>
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selectedRef && (
          <div style={cardSt}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedRef.direction === 'Outbound' ? '↗️' : '↙️'} {selectedRef.patientName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{selectedRef.specialty} · {selectedRef.facility || selectedRef.referredTo}</div>
                </div>
                <button onClick={() => setSelectedRef(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>
            </div>
            <div style={{ padding: 20, overflowY: 'auto', maxHeight: 460 }}>
              {/* Status timeline */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Referral Timeline</div>
                <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
                  {REFERRAL_STATUSES.slice(0, 6).map((s, i) => {
                    const isActive = REFERRAL_STATUSES.indexOf(selectedRef.status) >= i;
                    const isCurrent = selectedRef.status === s;
                    return (
                      <React.Fragment key={s}>
                        {i > 0 && <div style={{ flex: 1, height: 2, background: isActive ? '#059669' : '#e2e8f0' }} />}
                        <div style={{ width: isCurrent ? 28 : 20, height: isCurrent ? 28 : 20, borderRadius: '50%', background: isActive ? '#059669' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isCurrent ? 12 : 9, color: isActive ? '#fff' : '#94a3b8', fontWeight: 800, flexShrink: 0 }}>
                          {isActive && !isCurrent ? '✓' : (i + 1)}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  {REFERRAL_STATUSES.slice(0, 6).map(s => (
                    <span key={s} style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center', width: 60 }}>{s}</span>
                  ))}
                </div>
              </div>

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                {[
                  ['Direction', selectedRef.direction],
                  ['Priority', selectedRef.priority],
                  ['Referring Provider', selectedRef.referringProvider],
                  ['Referred To', selectedRef.referredTo],
                  ['Specialty', selectedRef.specialty],
                  ['Facility', selectedRef.facility || '—'],
                  ['Created', selectedRef.createdDate],
                  ['Expires', selectedRef.expiresDate],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Reason */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Reason for Referral</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, padding: 12, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>{selectedRef.reason}</div>
              </div>

              {/* Auth info */}
              {selectedRef.authRequired && (
                <div style={{ marginBottom: 16, padding: 14, borderRadius: 10, background: selectedRef.authStatus === 'Approved' ? '#dcfce7' : selectedRef.authStatus === 'Pending' ? '#fef3c7' : '#fee2e2', border: `1px solid ${selectedRef.authStatus === 'Approved' ? '#86efac' : selectedRef.authStatus === 'Pending' ? '#fde68a' : '#fca5a5'}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, color: selectedRef.authStatus === 'Approved' ? '#065f46' : selectedRef.authStatus === 'Pending' ? '#92400e' : '#991b1b' }}>Prior Authorization</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Status: {selectedRef.authStatus} {selectedRef.authNumber && `· #${selectedRef.authNumber}`}</div>
                  {selectedRef.insuranceName && <div style={{ fontSize: 12, marginTop: 2, opacity: 0.8 }}>Insurance: {selectedRef.insuranceName}</div>}
                </div>
              )}

              {/* Attachments */}
              {selectedRef.attachments?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Attachments</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedRef.attachments.map(a => (
                      <span key={a} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border)', fontWeight: 600 }}>📎 {a}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedRef.notes && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Clinical Notes</div>
                  <div style={{ fontSize: 12, lineHeight: 1.6, padding: 12, background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a', color: '#92400e' }}>{selectedRef.notes}</div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selectedRef.status === 'Pending' && (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => updateStatus(selectedRef.id, 'Sent')}>📤 Send Referral</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(selectedRef.id, 'Denied')}>❌ Deny</button>
                  </>
                )}
                {selectedRef.status === 'Sent' && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(selectedRef.id, 'Accepted')}>✅ Mark Accepted</button>}
                {selectedRef.status === 'Accepted' && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(selectedRef.id, 'Scheduled')}>📅 Mark Scheduled</button>}
                {selectedRef.status === 'Scheduled' && <button className="btn btn-success btn-sm" onClick={() => updateStatus(selectedRef.id, 'Completed')}>✔️ Mark Completed</button>}
                <button className="btn btn-secondary btn-sm" style={faxedIds.has(selectedRef.id) ? { background: '#dcfce7', color: '#166534', borderColor: '#86efac' } : {}} onClick={() => setFaxedIds(prev => new Set([...prev, selectedRef.id]))}>{
faxedIds.has(selectedRef.id) ? '✅ Faxed' : '📠 Fax'}</button>
                <button className="btn btn-secondary btn-sm" onClick={() => printReferral(selectedRef)}>🖨️ Print</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Referral Modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowNew(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #4f46e5, #3730a3)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>➕ New Referral</div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Create an inbound or outbound referral</div>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Direction *</label>
                  <select className="form-input" value={newForm.direction} onChange={e => setNewForm(f => ({ ...f, direction: e.target.value }))}>
                    {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Priority *</label>
                  <select className="form-input" value={newForm.priority} onChange={e => setNewForm(f => ({ ...f, priority: e.target.value }))}>
                    {PRIORITY.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Patient *</label>
                <select className="form-input" value={newForm.patientId} onChange={e => setNewForm(f => ({ ...f, patientId: e.target.value }))}>
                  <option value="">Select patient...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.lastName}, {p.firstName} — MRN {p.mrn}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Specialty *</label>
                  <select className="form-input" value={newForm.specialty} onChange={e => setNewForm(f => ({ ...f, specialty: e.target.value }))}>
                    <option value="">Select...</option>
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Refer To *</label>
                  <input className="form-input" value={newForm.referredTo} onChange={e => setNewForm(f => ({ ...f, referredTo: e.target.value }))} placeholder="Provider or facility name..." />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Facility</label>
                <input className="form-input" value={newForm.facility} onChange={e => setNewForm(f => ({ ...f, facility: e.target.value }))} placeholder="Clinic or hospital name..." />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Reason for Referral *</label>
                <textarea className="form-textarea" rows={3} value={newForm.reason} onChange={e => setNewForm(f => ({ ...f, reason: e.target.value }))} placeholder="Clinical reason for referring this patient..." />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea className="form-textarea" rows={2} value={newForm.notes} onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional clinical notes..." />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <input type="checkbox" checked={newForm.authRequired} onChange={e => setNewForm(f => ({ ...f, authRequired: e.target.checked }))} />
                Prior Authorization Required
              </label>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitReferral} disabled={!newForm.patientId || !newForm.specialty || !newForm.reason.trim() || !newForm.referredTo.trim()}>
                📋 Create Referral
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
