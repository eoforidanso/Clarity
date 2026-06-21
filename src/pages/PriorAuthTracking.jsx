import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';
import { priorAuths as priorAuthsApi } from '../services/api';

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


export default function PriorAuthTracking() {
  const { currentUser } = useAuth();
  const { patients } = usePatient();
  const [auths, setAuths] = useState([]);

  useEffect(() => {
    priorAuthsApi.list().then(data => {
      if (Array.isArray(data)) setAuths(data);
    }).catch(() => {});
  }, []);
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedAuth, setSelectedAuth] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [faxedIds, setFaxedIds] = useState(() => new Set());
  const [showStepTherapyDoc, setShowStepTherapyDoc] = useState(false);
  const [stepTherapyBannerOpen, setStepTherapyBannerOpen] = useState(true);
  const [stepDocFaxed, setStepDocFaxed] = useState(false);
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
    const reviewDate = new Date().toISOString().split('T')[0];
    priorAuthsApi.update(id, { status, reviewDate }).then(updated => {
      setAuths(prev => prev.map(a => a.id === id ? updated : a));
      if (selectedAuth?.id === id) setSelectedAuth(updated);
    }).catch(() => {
      setAuths(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      if (selectedAuth?.id === id) setSelectedAuth(prev => ({ ...prev, status }));
    });
  };

  const submitAuth = () => {
    const patient = (patients || []).find(p => p.id === newForm.patientId);
    if (!patient || !newForm.serviceType || !newForm.insurance) return;
    const payload = {
      patientId: newForm.patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      insurance: newForm.insurance,
      memberId: newForm.memberId,
      serviceType: newForm.serviceType,
      medication: newForm.medication,
      cptCode: newForm.cptCode,
      icdCodes: newForm.icdCodes.split(',').map(c => c.trim()).filter(Boolean),
      requestedUnits: parseInt(newForm.requestedUnits) || 1,
      provider: `${currentUser.firstName} ${currentUser.lastName}`,
      urgency: newForm.urgency,
      notes: newForm.notes,
    };
    priorAuthsApi.create(payload).then(created => {
      setAuths(prev => [created, ...prev]);
    }).catch(() => {});
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

      {/* ── Illinois Step Therapy Ban Banner (H.B. 5395) ── */}
      <div style={{ marginBottom: 18, borderRadius: 12, border: '2px solid #3b82f6', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', overflow: 'hidden' }}>
        <button type="button"
          onClick={() => setStepTherapyBannerOpen(v => !v)}
          style={{ width: '100%', padding: '12px 18px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚖️</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1e3a8a' }}>Illinois Step Therapy Ban — H.B. 5395</div>
              <div style={{ fontSize: 11, color: '#1d4ed8', marginTop: 1 }}>Know your patient's rights. Remind insurance companies of their legal obligations under Illinois law.</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button type="button" onClick={e => { e.stopPropagation(); setShowStepTherapyDoc(true); }}
              style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, background: '#1d4ed8', color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              📄 View / Send Document
            </button>
            <span style={{ fontSize: 13, color: '#3b82f6', fontWeight: 700 }}>{stepTherapyBannerOpen ? '▲' : '▼'}</span>
          </div>
        </button>
        {stepTherapyBannerOpen && (
          <div style={{ padding: '0 18px 14px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { icon: '🚫', title: 'Step Therapy Exceptions Required', body: 'Insurers must grant a step therapy exception upon request when clinical evidence supports the prescribed treatment or step therapy is contraindicated.' },
              { icon: '⏱️', title: '72-Hour Response Mandate', body: 'Standard requests must be answered within 72 hours. Urgent/expedited requests require a response within 24 hours. Silence = deemed approved.' },
              { icon: '🩺', title: 'Grounds for Exception', body: 'Contraindication · Likely adverse reaction · Previous treatment failure · Clinical evidence supporting prescribed drug · Step therapy would cause significant harm.' },
            ].map(item => (
              <div key={item.title} style={{ background: 'rgba(255,255,255,0.75)', borderRadius: 9, padding: '10px 12px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#1e3a8a', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 10.5, color: '#1d4ed8', lineHeight: 1.55 }}>{item.body}</div>
              </div>
            ))}
          </div>
        )}
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
                  {(patients || []).map(p => <option key={p.id} value={p.id}>{p.lastName}, {p.firstName} — MRN {p.mrn}</option>)}
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
      {/* ── Illinois Step Therapy H.B. 5395 Document Modal ── */}
      {showStepTherapyDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 2100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowStepTherapyDoc(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '90vh', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Modal header */}
            <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>⚖️ Illinois Step Therapy Exception — H.B. 5395</div>
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>Formal payer reminder document · Print or fax directly to insurance company</div>
              </div>
              <button onClick={() => setShowStepTherapyDoc(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 800, fontSize: 20, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            {/* Document body */}
            <div id="step-therapy-doc" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 13, lineHeight: 1.75, color: '#111827' }}>

              {/* Letterhead */}
              <div style={{ textAlign: 'center', borderBottom: '3px double #1d4ed8', paddingBottom: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#1e3a8a', letterSpacing: '-0.5px' }}>NOTICE OF PATIENT RIGHTS</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1d4ed8', marginTop: 4 }}>ILLINOIS STEP THERAPY EXCEPTION — H.B. 5395</div>
                <div style={{ fontSize: 12, color: '#374151', marginTop: 6 }}>Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>

              {/* Addressee */}
              <div style={{ marginBottom: 20, fontSize: 12 }}>
                <strong>To:</strong> Medical Director / Utilization Management Department<br />
                <strong>Re:</strong> Step Therapy Exception Request — Illinois H.B. 5395 Compliance<br />
                {selectedAuth && (
                  <>
                    <strong>Patient:</strong> {selectedAuth.patientName} · Member ID: {selectedAuth.memberId}<br />
                    <strong>Insurance Plan:</strong> {selectedAuth.insurance}<br />
                    <strong>Auth Number:</strong> {selectedAuth.authNumber || 'Pending'}<br />
                    <strong>Service / Medication:</strong> {selectedAuth.serviceType}{selectedAuth.medication ? ` — ${selectedAuth.medication}` : ''}<br />
                  </>
                )}
              </div>

              <p>Dear Medical Director,</p>
              <p>
                This letter serves as formal notice that the above-referenced prior authorization request involves a step therapy (fail-first) protocol. Pursuant to <strong>Illinois House Bill 5395</strong> (amending the Illinois Insurance Code, 215 ILCS 5/) and related provisions of the <em>Illinois Managed Care Reform and Patient Rights Act</em>, the treating provider is formally invoking the patient's rights to a step therapy exception review.
              </p>

              {/* Legal provisions */}
              <div style={{ background: '#eff6ff', border: '1.5px solid #3b82f6', borderRadius: 10, padding: '16px 20px', margin: '20px 0' }}>
                <div style={{ fontWeight: 900, fontSize: 13, color: '#1e3a8a', marginBottom: 12, fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Key Provisions — Illinois H.B. 5395</div>
                <ol style={{ paddingLeft: 20, margin: 0, fontSize: 12, color: '#1e3a8a' }}>
                  <li style={{ marginBottom: 8 }}>
                    <strong>Exception Process Required:</strong> Health insurers and managed care organizations must establish a clear, accessible step therapy exception process. Denial of an exception request without a documented medical review constitutes a violation of this Act.
                  </li>
                  <li style={{ marginBottom: 8 }}>
                    <strong>Mandatory Response Timeframes:</strong> Upon receipt of a complete exception request:
                    <ul style={{ marginTop: 4, paddingLeft: 18 }}>
                      <li>Standard requests: determination within <strong>72 hours</strong></li>
                      <li>Urgent / expedited requests: determination within <strong>24 hours</strong></li>
                      <li>Failure to respond within these timeframes constitutes <strong>automatic approval</strong> of the exception.</li>
                    </ul>
                  </li>
                  <li style={{ marginBottom: 8 }}>
                    <strong>Grounds for Granting an Exception (any one of the following):</strong>
                    <ul style={{ marginTop: 4, paddingLeft: 18 }}>
                      <li>The required step-therapy drug is contraindicated for the patient.</li>
                      <li>The required drug is likely to cause an adverse reaction or harm the patient.</li>
                      <li>The patient previously tried and failed the required step-therapy drug (including trial during enrollment in a different health plan).</li>
                      <li>Clinical evidence indicates the prescribed drug is superior to the required alternative for the patient's specific condition.</li>
                      <li>Adherence to the step-therapy protocol would cause clinically significant harm, delay in necessary care, or irreversible consequences.</li>
                    </ul>
                  </li>
                  <li style={{ marginBottom: 8 }}>
                    <strong>Non-Retaliation:</strong> Insurers may not penalize, reduce payment to, or take adverse action against a provider for requesting a step therapy exception on behalf of their patient.
                  </li>
                  <li>
                    <strong>Independent Review:</strong> If an exception is denied, the enrollee or provider may request an expedited independent medical review through the Illinois Department of Insurance.
                  </li>
                </ol>
              </div>

              {/* Clinical basis */}
              <p>
                <strong>Clinical Basis for This Exception Request:</strong><br />
                The prescribing provider has determined, based on their clinical judgment and the specific medical needs of this patient, that the requested treatment is medically necessary and that the step-therapy protocol is not clinically appropriate in this instance. Supporting clinical documentation, including medical records, prior treatment history, and letter of medical necessity, is attached or available upon request.
              </p>

              {/* Demand */}
              <div style={{ background: '#fef2f2', border: '1.5px solid #f87171', borderRadius: 10, padding: '14px 18px', margin: '20px 0', fontSize: 12 }}>
                <strong style={{ color: '#991b1b' }}>Action Required:</strong>
                <span style={{ color: '#7f1d1d' }}> Please process this step therapy exception request in accordance with the timeframes mandated under Illinois H.B. 5395. If this request is classified as urgent/expedited, a determination must be provided within 24 hours. Failure to comply may be reported to the Illinois Department of Insurance. For questions or to provide a determination, please contact our office immediately.</span>
              </div>

              {/* Signature block */}
              <div style={{ marginTop: 24, fontSize: 12 }}>
                <div>Sincerely,</div>
                <div style={{ marginTop: 20, borderTop: '1px solid #9ca3af', paddingTop: 6, display: 'inline-block', minWidth: 260 }}>
                  <div><strong>{currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Provider' : 'Provider'}</strong>{currentUser?.credentials ? `, ${currentUser.credentials}` : ''}</div>
                  <div>Clarity EHR — Outpatient Behavioral Health</div>
                  <div style={{ marginTop: 2, color: '#6b7280', fontSize: 11 }}>NPI: {currentUser?.npi || '[NPI on file]'} · License: {currentUser?.licenseNumber || '[License on file]'}</div>
                </div>
              </div>

              <div style={{ marginTop: 24, padding: '10px 14px', background: '#f9fafb', border: '1px solid var(--border)', borderRadius: 7, fontSize: 10.5, color: '#6b7280' }}>
                <strong>References:</strong> Illinois H.B. 5395 · Illinois Insurance Code, 215 ILCS 5/ · Illinois Managed Care Reform and Patient Rights Act · 50 Ill. Adm. Code 5410 (Illinois Department of Insurance step therapy regulations). This document was generated by Clarity EHR on {new Date().toLocaleDateString()}.
              </div>
            </div>

            {/* Action footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: '#f8fafc', display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print Document</button>
              <button className="btn btn-secondary"
                style={stepDocFaxed ? { background: '#dcfce7', color: '#166534', borderColor: '#86efac' } : {}}
                onClick={() => setStepDocFaxed(true)}>
                {stepDocFaxed ? '✅ Fax Sent' : '📠 Fax to Insurance'}
              </button>
              <button className="btn btn-secondary" onClick={() => {
                const text = document.getElementById('step-therapy-doc')?.innerText || '';
                navigator.clipboard?.writeText(text).catch(() => {});
              }}>📋 Copy Text</button>
              <button className="btn btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => setShowStepTherapyDoc(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
