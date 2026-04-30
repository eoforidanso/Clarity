import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';

const AUTH_STATUSES = ['Pending Submission', 'Submitted', 'Under Review', 'Info Requested', 'Approved', 'Denied', 'Appeal Filed', 'Appeal Approved'];
const STATUS_COLORS = {
  'Pending Submission': { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
  'Submitted':          { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
  'Under Review':       { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  'Info Requested':     { bg: '#fce7f3', color: '#9d174d', dot: '#ec4899' },
  'Approved':           { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  'Denied':             { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  'Appeal Filed':       { bg: '#e0e7ff', color: '#3730a3', dot: '#6366f1' },
  'Appeal Approved':    { bg: '#dcfce7', color: '#065f46', dot: '#059669' },
};

const SERVICE_TYPES = [
  'Outpatient Psychiatric Evaluation', 'Medication Management', 'Psychotherapy (Individual)',
  'Psychotherapy (Group)', 'Neuropsychological Testing', 'Intensive Outpatient Program (IOP)',
  'Partial Hospitalization', 'Transcranial Magnetic Stimulation (TMS)', 'Electroconvulsive Therapy (ECT)',
  'Psychological Testing', 'Applied Behavior Analysis (ABA)', 'Substance Abuse Treatment',
  'Ketamine / Esketamine', 'Genetic Testing', 'Specialty Medication',
];

const MOCK_AUTHS = [
  { id: 'pa-1', patientId: 'p1', patientName: 'James Anderson', insurance: 'Blue Cross Blue Shield', memberId: 'BCBS-441289', serviceType: 'Medication Management', medication: 'Vyvanse 50mg', cptCode: '99214', icdCodes: ['F90.0', 'F31.81'], requestedUnits: 12, approvedUnits: 12, provider: 'Dr. Chris L.', status: 'Approved', authNumber: 'PA-2026-8841', submitDate: '2026-03-15', reviewDate: '2026-03-18', effectiveDate: '2026-03-20', expirationDate: '2026-09-20', turnaroundDays: 3, notes: 'Approved for 12 visits through 9/20/2026', urgency: 'Standard', denialReason: '' },
  { id: 'pa-2', patientId: 'p2', patientName: 'Maria Garcia', insurance: 'Aetna', memberId: 'AET-552190', serviceType: 'Neuropsychological Testing', medication: '', cptCode: '96132', icdCodes: ['F90.9', 'F41.1'], requestedUnits: 1, approvedUnits: 0, provider: 'Dr. Chris L.', status: 'Under Review', authNumber: 'PA-2026-9102', submitDate: '2026-04-10', reviewDate: '', effectiveDate: '', expirationDate: '', turnaroundDays: null, notes: 'Peer-to-peer review may be requested', urgency: 'Standard', denialReason: '' },
  { id: 'pa-3', patientId: 'p4', patientName: 'Ashley Kim', insurance: 'UnitedHealthcare', memberId: 'UHC-339871', serviceType: 'Specialty Medication', medication: 'Spravato (Esketamine) 56mg', cptCode: 'S0013', icdCodes: ['F33.2', 'F33.1'], requestedUnits: 8, approvedUnits: 0, provider: 'Dr. Chris L.', status: 'Denied', authNumber: 'PA-2026-7654', submitDate: '2026-03-28', reviewDate: '2026-04-02', effectiveDate: '', expirationDate: '', turnaroundDays: 5, notes: '', urgency: 'Urgent', denialReason: 'Medical necessity not established. Payer requires documentation of failure of 3+ adequate antidepressant trials. Only 2 documented.' },
  { id: 'pa-4', patientId: 'p3', patientName: 'Robert Chen', insurance: 'Cigna', memberId: 'CIG-882741', serviceType: 'Intensive Outpatient Program (IOP)', medication: '', cptCode: '90853', icdCodes: ['F33.1', 'F10.20'], requestedUnits: 30, approvedUnits: 0, provider: 'Dr. Chris L.', status: 'Info Requested', authNumber: 'PA-2026-8899', submitDate: '2026-04-05', reviewDate: '', effectiveDate: '', expirationDate: '', turnaroundDays: null, notes: 'Payer requesting: recent treatment history, ASAM criteria assessment, letter of medical necessity', urgency: 'Urgent', denialReason: '' },
  { id: 'pa-5', patientId: 'p4', patientName: 'Ashley Kim', insurance: 'UnitedHealthcare', memberId: 'UHC-339871', serviceType: 'Specialty Medication', medication: 'Spravato (Esketamine) 56mg', cptCode: 'S0013', icdCodes: ['F33.2', 'F33.1'], requestedUnits: 8, approvedUnits: 0, provider: 'Dr. Chris L.', status: 'Appeal Filed', authNumber: 'PA-2026-7654-A1', submitDate: '2026-04-10', reviewDate: '', effectiveDate: '', expirationDate: '', turnaroundDays: null, notes: 'Appeal filed with updated documentation: 3rd trial (Mirtazapine) added, peer-reviewed literature supporting Spravato', urgency: 'Urgent', denialReason: '' },
  { id: 'pa-6', patientId: 'p5', patientName: 'Dorothy Wilson', insurance: 'Medicare', memberId: 'MBI-11C22D33', serviceType: 'Transcranial Magnetic Stimulation (TMS)', medication: '', cptCode: '90868', icdCodes: ['F33.2'], requestedUnits: 36, approvedUnits: 0, provider: 'Dr. Chris L.', status: 'Pending Submission', authNumber: '', submitDate: '', reviewDate: '', effectiveDate: '', expirationDate: '', turnaroundDays: null, notes: 'Need to complete CMS form and attach failed medication trials', urgency: 'Standard', denialReason: '' },
];

export default function PriorAuthTracking() {
  const { currentUser } = useAuth();
  const { patients } = usePatient();
  const [auths, setAuths] = useState(MOCK_AUTHS);
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedAuth, setSelectedAuth] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({
    patientId: '', insurance: '', memberId: '', serviceType: '', medication: '',
    cptCode: '', icdCodes: '', requestedUnits: '', urgency: 'Standard', notes: '',
  });

  const filtered = useMemo(() => {
    let list = [...auths];
    if (filterStatus !== 'All') list = list.filter(a => a.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.patientName.toLowerCase().includes(q) ||
        a.serviceType.toLowerCase().includes(q) ||
        a.medication.toLowerCase().includes(q) ||
        a.authNumber.toLowerCase().includes(q) ||
        a.insurance.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      const priorityOrder = { 'Info Requested': 0, 'Denied': 1, 'Pending Submission': 2, 'Under Review': 3, 'Appeal Filed': 4, 'Submitted': 5, 'Approved': 6, 'Appeal Approved': 7 };
      return (priorityOrder[a.status] ?? 99) - (priorityOrder[b.status] ?? 99);
    });
  }, [auths, filterStatus, search]);

  const stats = useMemo(() => ({
    total: auths.length,
    pending: auths.filter(a => ['Pending Submission', 'Submitted', 'Under Review'].includes(a.status)).length,
    actionNeeded: auths.filter(a => ['Info Requested', 'Denied', 'Pending Submission'].includes(a.status)).length,
    approved: auths.filter(a => ['Approved', 'Appeal Approved'].includes(a.status)).length,
    denied: auths.filter(a => a.status === 'Denied').length,
    avgTurnaround: (() => {
      const resolved = auths.filter(a => a.turnaroundDays != null);
      return resolved.length > 0 ? (resolved.reduce((s, a) => s + a.turnaroundDays, 0) / resolved.length).toFixed(1) : '—';
    })(),
    approvalRate: (() => {
      const decided = auths.filter(a => ['Approved', 'Appeal Approved', 'Denied'].includes(a.status));
      const approved = decided.filter(a => ['Approved', 'Appeal Approved'].includes(a.status));
      return decided.length > 0 ? Math.round((approved.length / decided.length) * 100) : 0;
    })(),
  }), [auths]);

  const updateStatus = (id, status) => {
    setAuths(prev => prev.map(a => a.id === id ? { ...a, status, reviewDate: status !== a.status ? new Date().toISOString().split('T')[0] : a.reviewDate } : a));
    if (selectedAuth?.id === id) setSelectedAuth(prev => ({ ...prev, status }));
  };

  const submitAuth = () => {
    const patient = patients.find(p => p.id === newForm.patientId);
    if (!patient || !newForm.serviceType || !newForm.insurance) return;
    const auth = {
      id: `pa-${Date.now()}`,
      patientId: newForm.patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      insurance: newForm.insurance,
      memberId: newForm.memberId,
      serviceType: newForm.serviceType,
      medication: newForm.medication,
      cptCode: newForm.cptCode,
      icdCodes: newForm.icdCodes.split(',').map(c => c.trim()).filter(Boolean),
      requestedUnits: parseInt(newForm.requestedUnits) || 1,
      approvedUnits: 0,
      provider: `${currentUser.firstName} ${currentUser.lastName}`,
      status: 'Pending Submission',
      authNumber: '',
      submitDate: '',
      reviewDate: '',
      effectiveDate: '',
      expirationDate: '',
      turnaroundDays: null,
      notes: newForm.notes,
      urgency: newForm.urgency,
      denialReason: '',
    };
    setAuths(prev => [auth, ...prev]);
    setShowNew(false);
    setNewForm({ patientId: '', insurance: '', memberId: '', serviceType: '', medication: '', cptCode: '', icdCodes: '', requestedUnits: '', urgency: 'Standard', notes: '' });
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>🔐 Prior Authorization Tracking</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Manage insurance prior authorizations, track approvals, and handle denials & appeals</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>➕ New Auth Request</button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '📋', value: stats.total, label: 'Total Auths', bg: '#eff6ff' },
          { icon: '⏳', value: stats.pending, label: 'In Progress', bg: '#fef3c7' },
          { icon: '🚨', value: stats.actionNeeded, label: 'Action Needed', bg: '#fee2e2' },
          { icon: '✅', value: stats.approved, label: 'Approved', bg: '#dcfce7' },
          { icon: '📊', value: `${stats.approvalRate}%`, label: 'Approval Rate', bg: '#f0f4ff' },
          { icon: '⏱️', value: `${stats.avgTurnaround}d`, label: 'Avg Turnaround', bg: '#faf5ff' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="form-input" placeholder="Search by patient, service, medication, auth #..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, fontSize: 13 }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['All', ...AUTH_STATUSES].map(s => {
            const sc = STATUS_COLORS[s];
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                style={{ padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, border: filterStatus === s ? '2px solid var(--primary)' : '1px solid var(--border)', background: filterStatus === s ? 'var(--primary-light)' : sc?.bg || '#fff', color: filterStatus === s ? 'var(--primary)' : sc?.color || 'var(--text-primary)', cursor: 'pointer' }}>
                {s === 'All' ? `All (${stats.total})` : s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: 30 }}></th>
              <th>Patient</th>
              <th>Service / Medication</th>
              <th>Insurance</th>
              <th>Auth #</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Units</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(auth => {
              const sc = STATUS_COLORS[auth.status] || STATUS_COLORS['Pending Submission'];
              return (
                <tr key={auth.id} onClick={() => setSelectedAuth(auth)} style={{ cursor: 'pointer', background: selectedAuth?.id === auth.id ? 'var(--primary-light)' : undefined }}>
                  <td>{auth.urgency === 'Urgent' ? '🔴' : '⚪'}</td>
                  <td><strong>{auth.patientName}</strong></td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{auth.serviceType}</div>
                    {auth.medication && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>💊 {auth.medication}</div>}
                  </td>
                  <td style={{ fontSize: 12 }}>{auth.insurance}</td>
                  <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{auth.authNumber || '—'}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: sc.bg, color: sc.color }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />{auth.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 11 }}>{auth.submitDate || '—'}</td>
                  <td style={{ fontSize: 12, fontWeight: 600 }}>{auth.approvedUnits > 0 ? `${auth.approvedUnits}/${auth.requestedUnits}` : auth.requestedUnits}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      {auth.status === 'Pending Submission' && <button className="btn btn-primary btn-sm" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => updateStatus(auth.id, 'Submitted')}>Submit</button>}
                      {auth.status === 'Denied' && <button className="btn btn-warning btn-sm" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => updateStatus(auth.id, 'Appeal Filed')}>Appeal</button>}
                      {auth.status === 'Info Requested' && <button className="btn btn-info btn-sm" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => updateStatus(auth.id, 'Submitted')}>Resubmit</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
            <div style={{ fontWeight: 600 }}>No authorizations match your filters</div>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedAuth && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedAuth(null); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '80vh', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 24px', background: `linear-gradient(135deg, ${STATUS_COLORS[selectedAuth.status]?.dot || '#4f46e5'}, ${STATUS_COLORS[selectedAuth.status]?.color || '#3730a3'})`, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>🔐 Prior Authorization Details</div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{selectedAuth.patientName} · {selectedAuth.insurance}</div>
              </div>
              <button onClick={() => setSelectedAuth(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 800, fontSize: 20, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {[
                  ['Auth Number', selectedAuth.authNumber || 'Not assigned'],
                  ['Status', selectedAuth.status],
                  ['Service Type', selectedAuth.serviceType],
                  ['Medication', selectedAuth.medication || '—'],
                  ['CPT Code', selectedAuth.cptCode || '—'],
                  ['ICD-10 Codes', selectedAuth.icdCodes?.join(', ') || '—'],
                  ['Requested Units', selectedAuth.requestedUnits],
                  ['Approved Units', selectedAuth.approvedUnits || '—'],
                  ['Insurance', selectedAuth.insurance],
                  ['Member ID', selectedAuth.memberId],
                  ['Urgency', selectedAuth.urgency],
                  ['Provider', selectedAuth.provider],
                  ['Submitted', selectedAuth.submitDate || 'Not yet'],
                  ['Reviewed', selectedAuth.reviewDate || 'Pending'],
                  ['Effective', selectedAuth.effectiveDate || '—'],
                  ['Expires', selectedAuth.expirationDate || '—'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{val}</div>
                  </div>
                ))}
              </div>

              {selectedAuth.turnaroundDays != null && (
                <div style={{ padding: 12, background: '#eff6ff', borderRadius: 8, marginBottom: 16, fontSize: 12, color: '#1e40af', fontWeight: 600 }}>
                  ⏱️ Turnaround: {selectedAuth.turnaroundDays} business days
                </div>
              )}

              {selectedAuth.denialReason && (
                <div style={{ padding: 14, background: '#fee2e2', borderRadius: 10, marginBottom: 16, border: '1px solid #fca5a5' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Denial Reason</div>
                  <div style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.6 }}>{selectedAuth.denialReason}</div>
                </div>
              )}

              {selectedAuth.notes && (
                <div style={{ padding: 14, background: '#fffbeb', borderRadius: 10, marginBottom: 16, border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Notes</div>
                  <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>{selectedAuth.notes}</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selectedAuth.status === 'Pending Submission' && <button className="btn btn-primary" onClick={() => { updateStatus(selectedAuth.id, 'Submitted'); setSelectedAuth(null); }}>📤 Submit to Payer</button>}
                {selectedAuth.status === 'Denied' && <button className="btn btn-warning" onClick={() => { updateStatus(selectedAuth.id, 'Appeal Filed'); setSelectedAuth(null); }}>⚖️ File Appeal</button>}
                {selectedAuth.status === 'Info Requested' && <button className="btn btn-primary" onClick={() => { updateStatus(selectedAuth.id, 'Submitted'); setSelectedAuth(null); }}>📎 Resubmit with Info</button>}
                <button className="btn btn-secondary" onClick={() => window.print()}>🖨️ Print</button>
                <button className="btn btn-secondary" style={faxedIds.has(selectedAuth.id) ? { background: '#dcfce7', color: '#166534', borderColor: '#86efac' } : {}} onClick={() => { setFaxedIds(prev => new Set([...prev, selectedAuth.id])); }}>
                  {faxedIds.has(selectedAuth.id) ? '✅ Faxed' : '📠 Fax to Payer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Auth Modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowNew(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>➕ New Prior Authorization</div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Submit a new prior authorization request</div>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '55vh', overflowY: 'auto' }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Patient *</label>
                <select className="form-input" value={newForm.patientId} onChange={e => setNewForm(f => ({ ...f, patientId: e.target.value }))}>
                  <option value="">Select patient...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.lastName}, {p.firstName} — MRN {p.mrn}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Insurance *</label>
                  <input className="form-input" value={newForm.insurance} onChange={e => setNewForm(f => ({ ...f, insurance: e.target.value }))} placeholder="Payer name..." />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Member ID</label>
                  <input className="form-input" value={newForm.memberId} onChange={e => setNewForm(f => ({ ...f, memberId: e.target.value }))} placeholder="Member ID..." />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Service Type *</label>
                <select className="form-input" value={newForm.serviceType} onChange={e => setNewForm(f => ({ ...f, serviceType: e.target.value }))}>
                  <option value="">Select service...</option>
                  {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Medication (if applicable)</label>
                  <input className="form-input" value={newForm.medication} onChange={e => setNewForm(f => ({ ...f, medication: e.target.value }))} placeholder="Drug name & dose..." />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>CPT Code</label>
                  <input className="form-input" value={newForm.cptCode} onChange={e => setNewForm(f => ({ ...f, cptCode: e.target.value }))} placeholder="e.g. 90837" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>ICD-10 Codes</label>
                  <input className="form-input" value={newForm.icdCodes} onChange={e => setNewForm(f => ({ ...f, icdCodes: e.target.value }))} placeholder="F33.1, F41.1" />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Requested Units/Visits</label>
                  <input className="form-input" type="number" value={newForm.requestedUnits} onChange={e => setNewForm(f => ({ ...f, requestedUnits: e.target.value }))} placeholder="e.g. 12" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Urgency</label>
                <select className="form-input" value={newForm.urgency} onChange={e => setNewForm(f => ({ ...f, urgency: e.target.value }))}>
                  <option value="Standard">Standard</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Clinical Justification / Notes</label>
                <textarea className="form-textarea" rows={3} value={newForm.notes} onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))} placeholder="Document medical necessity..." />
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitAuth} disabled={!newForm.patientId || !newForm.serviceType || !newForm.insurance}>🔐 Create Authorization</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
