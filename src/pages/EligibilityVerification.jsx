import React, { useState, useMemo } from 'react';

const PAYERS = ['Blue Cross Blue Shield', 'Aetna', 'UnitedHealthcare', 'Cigna', 'Medicare Part B', 'Medicaid', 'Humana', 'Tricare'];
const ELIGIBILITY_STATUS = ['Eligible', 'Ineligible', 'Needs Reverification', 'Pending', 'Error'];
const STATUS_COLORS = {
  Eligible:             { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  Ineligible:           { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  'Needs Reverification': { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  Pending:              { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
  Error:                { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
};

const MOCK_CHECKS = [
  { id: 'ev-1', patientName: 'James Anderson', patientDOB: '1988-03-15', mrn: 'MRN-001', payer: 'Blue Cross Blue Shield', memberId: 'BCB-445599001', groupNumber: 'GRP-1120', planType: 'PPO', status: 'Eligible', checkedDate: '2026-04-15 08:12 AM', effectiveDate: '2026-01-01', terminationDate: '2026-12-31', copay: '$30', deductible: '$1,500', deductibleMet: '$1,120', oopMax: '$6,000', oopMet: '$2,340', coinsurance: '20%', mentalHealthCoverage: true, telehealthCovered: true, priorAuthRequired: false, remainingVisits: 'Unlimited', networkStatus: 'In-Network', notes: '' },
  { id: 'ev-2', patientName: 'Maria Garcia', patientDOB: '1995-07-22', mrn: 'MRN-002', payer: 'Aetna', memberId: 'AET-778822334', groupNumber: 'GRP-5540', planType: 'HMO', status: 'Eligible', checkedDate: '2026-04-15 08:15 AM', effectiveDate: '2026-01-01', terminationDate: '2026-12-31', copay: '$25', deductible: '$2,000', deductibleMet: '$750', oopMax: '$5,500', oopMet: '$1,200', coinsurance: '30%', mentalHealthCoverage: true, telehealthCovered: true, priorAuthRequired: true, remainingVisits: '24 of 30', networkStatus: 'In-Network', notes: 'Prior auth required for neuropsych testing' },
  { id: 'ev-3', patientName: 'Robert Chen', patientDOB: '1972-11-05', mrn: 'MRN-003', payer: 'UnitedHealthcare', memberId: 'UHC-992211445', groupNumber: 'GRP-8810', planType: 'PPO', status: 'Needs Reverification', checkedDate: '2026-04-10 09:00 AM', effectiveDate: '2025-10-01', terminationDate: '2026-09-30', copay: '$40', deductible: '$2,500', deductibleMet: '$2,500', oopMax: '$7,000', oopMet: '$3,800', coinsurance: '20%', mentalHealthCoverage: true, telehealthCovered: true, priorAuthRequired: false, remainingVisits: 'Unlimited', networkStatus: 'In-Network', notes: 'Address change reported — reverify demographics' },
  { id: 'ev-4', patientName: 'Ashley Kim', patientDOB: '2001-09-30', mrn: 'MRN-004', payer: 'Cigna', memberId: 'CIG-556677889', groupNumber: 'GRP-3301', planType: 'EPO', status: 'Eligible', checkedDate: '2026-04-14 02:30 PM', effectiveDate: '2026-01-01', terminationDate: '2026-12-31', copay: '$35', deductible: '$1,000', deductibleMet: '$1,000', oopMax: '$4,500', oopMet: '$1,680', coinsurance: '25%', mentalHealthCoverage: true, telehealthCovered: true, priorAuthRequired: false, remainingVisits: '18 of 20', networkStatus: 'In-Network', notes: '' },
  { id: 'ev-5', patientName: 'Dorothy Wilson', patientDOB: '1960-02-18', mrn: 'MRN-005', payer: 'Medicare Part B', memberId: 'MBI-1EG4-TE5-MK72', groupNumber: 'N/A', planType: 'Medicare', status: 'Eligible', checkedDate: '2026-04-15 07:45 AM', effectiveDate: '2025-07-01', terminationDate: 'Ongoing', copay: '$0', deductible: '$257', deductibleMet: '$257', oopMax: 'N/A', oopMet: 'N/A', coinsurance: '20%', mentalHealthCoverage: true, telehealthCovered: true, priorAuthRequired: false, remainingVisits: 'Unlimited', networkStatus: 'Participating', notes: 'Medicare — no visit limit for outpatient MH' },
  { id: 'ev-6', patientName: 'Brian Foster', patientDOB: '1978-12-01', mrn: 'MRN-007', payer: 'Medicaid', memberId: 'MCD-TX-88221100', groupNumber: 'N/A', planType: 'Medicaid', status: 'Ineligible', checkedDate: '2026-04-14 11:00 AM', effectiveDate: '2025-01-01', terminationDate: '2026-03-31', copay: '$0', deductible: '$0', deductibleMet: '$0', oopMax: 'N/A', oopMet: 'N/A', coinsurance: '0%', mentalHealthCoverage: false, telehealthCovered: false, priorAuthRequired: false, remainingVisits: '0', networkStatus: 'N/A', notes: '⚠️ Coverage terminated 3/31/2026. Patient needs to re-enroll or provide new insurance.' },
];

export default function EligibilityVerification() {
  const [checks, setChecks] = useState(MOCK_CHECKS);
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedCheck, setSelectedCheck] = useState(null);
  const [showVerify, setShowVerify] = useState(false);
  const [verifyForm, setVerifyForm] = useState({ patientName: '', memberId: '', payer: PAYERS[0], dob: '' });

  const filtered = useMemo(() => {
    let list = [...checks];
    if (filterStatus !== 'All') list = list.filter(c => c.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.patientName.toLowerCase().includes(q) || c.memberId.toLowerCase().includes(q) || c.payer.toLowerCase().includes(q));
    }
    return list;
  }, [checks, filterStatus, search]);

  const stats = useMemo(() => ({
    total: checks.length,
    eligible: checks.filter(c => c.status === 'Eligible').length,
    ineligible: checks.filter(c => c.status === 'Ineligible').length,
    needsReverify: checks.filter(c => c.status === 'Needs Reverification').length,
    authRequired: checks.filter(c => c.priorAuthRequired).length,
  }), [checks]);

  const runVerification = () => {
    if (!verifyForm.patientName || !verifyForm.memberId) return;
    const newCheck = {
      id: `ev-${Date.now()}`, ...verifyForm, mrn: '', planType: 'Unknown', status: 'Pending',
      checkedDate: new Date().toLocaleString(), effectiveDate: '—', terminationDate: '—',
      copay: '—', deductible: '—', deductibleMet: '—', oopMax: '—', oopMet: '—', coinsurance: '—',
      mentalHealthCoverage: false, telehealthCovered: false, priorAuthRequired: false,
      remainingVisits: '—', networkStatus: '—', groupNumber: '—', notes: 'Verification in progress...',
    };
    setChecks(prev => [newCheck, ...prev]);
    setShowVerify(false);
    setVerifyForm({ patientName: '', memberId: '', payer: PAYERS[0], dob: '' });
    // Simulate verification completing
    setTimeout(() => {
      setChecks(prev => prev.map(c => c.id === newCheck.id ? {
        ...c, status: 'Eligible', copay: '$30', deductible: '$1,500', deductibleMet: '$800',
        oopMax: '$5,000', oopMet: '$1,500', coinsurance: '20%', planType: 'PPO',
        mentalHealthCoverage: true, telehealthCovered: true, effectiveDate: '2026-01-01',
        terminationDate: '2026-12-31', remainingVisits: 'Unlimited', networkStatus: 'In-Network',
        notes: 'Auto-verified successfully',
      } : c));
    }, 3000);
  };

  const reverify = (id) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, status: 'Pending', checkedDate: new Date().toLocaleString(), notes: 'Re-verification in progress...' } : c));
    setTimeout(() => {
      setChecks(prev => prev.map(c => c.id === id && c.status === 'Pending' ? { ...c, status: 'Eligible', checkedDate: new Date().toLocaleString(), notes: 'Re-verified — coverage confirmed' } : c));
    }, 2500);
  };

  const sc = (status) => STATUS_COLORS[status] || STATUS_COLORS.Pending;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>🛡️ Eligibility & Benefits Verification</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Real-time insurance eligibility checks — verify coverage, benefits, and copay before every visit</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowVerify(true)}>🔍 Verify Eligibility</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '🛡️', val: stats.total, label: 'Total Checks', bg: '#eff6ff' },
          { icon: '✅', val: stats.eligible, label: 'Eligible', bg: '#dcfce7' },
          { icon: '❌', val: stats.ineligible, label: 'Ineligible', bg: '#fee2e2' },
          { icon: '🔄', val: stats.needsReverify, label: 'Needs Reverify', bg: '#fef3c7' },
          { icon: '🔐', val: stats.authRequired, label: 'Auth Required', bg: '#faf5ff' },
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
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <input className="form-input" placeholder="Search by patient, member ID, payer..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
        <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 170, fontSize: 12 }}>
          <option value="All">All Statuses</option>
          {ELIGIBILITY_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-secondary btn-sm" onClick={() => { checks.filter(c => c.status !== 'Pending').forEach(c => reverify(c.id)); }}>🔄 Batch Reverify</button>
      </div>

      {/* List + Detail */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedCheck ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>{filtered.length} Verification{filtered.length !== 1 ? 's' : ''}</div>
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {filtered.map(check => {
              const s = sc(check.status);
              return (
                <div key={check.id} onClick={() => setSelectedCheck(check)}
                  style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedCheck?.id === check.id ? 'var(--primary-light)' : 'transparent', transition: 'background 0.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{check.patientName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{check.payer} · {check.planType}</div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: s.bg, color: s.color }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot }} />{check.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>🆔 {check.memberId}</span>
                    <span>💰 Copay: {check.copay}</span>
                    <span>🕐 {check.checkedDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        {selectedCheck && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>🛡️ {selectedCheck.patientName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{selectedCheck.payer} · {selectedCheck.planType} · MRN {selectedCheck.mrn}</div>
                </div>
                <button onClick={() => setSelectedCheck(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>
            </div>
            <div style={{ padding: 20, overflowY: 'auto', maxHeight: 460 }}>
              {/* Coverage status banner */}
              <div style={{ padding: 14, borderRadius: 10, background: sc(selectedCheck.status).bg, border: `1px solid ${sc(selectedCheck.status).dot}40`, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: sc(selectedCheck.status).color }}>
                  {selectedCheck.status === 'Eligible' ? '✅ Coverage Active' : selectedCheck.status === 'Ineligible' ? '❌ Coverage Inactive' : selectedCheck.status === 'Pending' ? '⏳ Verification In Progress' : '🔄 Needs Reverification'}
                </div>
                <div style={{ fontSize: 11, color: sc(selectedCheck.status).color, opacity: 0.8, marginTop: 2 }}>
                  Last checked: {selectedCheck.checkedDate}
                </div>
              </div>

              {/* Benefits grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Copay', val: selectedCheck.copay, icon: '💰' },
                  { label: 'Deductible', val: selectedCheck.deductible, icon: '📊' },
                  { label: 'Deductible Met', val: selectedCheck.deductibleMet, icon: '✅' },
                  { label: 'Coinsurance', val: selectedCheck.coinsurance, icon: '📈' },
                  { label: 'OOP Max', val: selectedCheck.oopMax, icon: '🛑' },
                  { label: 'OOP Met', val: selectedCheck.oopMet, icon: '💵' },
                ].map(b => (
                  <div key={b.label} style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 16 }}>{b.icon}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{b.val}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{b.label}</div>
                  </div>
                ))}
              </div>

              {/* Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                {[
                  ['Member ID', selectedCheck.memberId], ['Group #', selectedCheck.groupNumber],
                  ['Effective Date', selectedCheck.effectiveDate], ['Termination Date', selectedCheck.terminationDate],
                  ['Network Status', selectedCheck.networkStatus], ['Remaining Visits', selectedCheck.remainingVisits],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Coverage flags */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <span style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, background: selectedCheck.mentalHealthCoverage ? '#dcfce7' : '#fee2e2', color: selectedCheck.mentalHealthCoverage ? '#166534' : '#991b1b', fontWeight: 700 }}>
                  {selectedCheck.mentalHealthCoverage ? '✅' : '❌'} Mental Health
                </span>
                <span style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, background: selectedCheck.telehealthCovered ? '#dcfce7' : '#fee2e2', color: selectedCheck.telehealthCovered ? '#166534' : '#991b1b', fontWeight: 700 }}>
                  {selectedCheck.telehealthCovered ? '✅' : '❌'} Telehealth
                </span>
                <span style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, background: selectedCheck.priorAuthRequired ? '#fef3c7' : '#f1f5f9', color: selectedCheck.priorAuthRequired ? '#92400e' : '#475569', fontWeight: 700 }}>
                  {selectedCheck.priorAuthRequired ? '⚠️ Prior Auth Required' : '✅ No Prior Auth'}
                </span>
              </div>

              {/* Notes */}
              {selectedCheck.notes && (
                <div style={{ padding: 12, background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a', fontSize: 12, color: '#78350f', marginBottom: 16 }}>
                  📝 {selectedCheck.notes}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => reverify(selectedCheck.id)}>🔄 Reverify</button>
                <button className="btn btn-secondary btn-sm" onClick={() => alert('🖨️ Printing benefits summary...')}>🖨️ Print</button>
                <button className="btn btn-secondary btn-sm" onClick={() => alert('📋 Copied to clipboard')}>📋 Copy</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Verify Modal */}
      {showVerify && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowVerify(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>🔍 Run Eligibility Check</div>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Patient Name *</label>
                <input className="form-input" value={verifyForm.patientName} onChange={e => setVerifyForm(f => ({ ...f, patientName: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Member ID *</label>
                  <input className="form-input" value={verifyForm.memberId} onChange={e => setVerifyForm(f => ({ ...f, memberId: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Date of Birth</label>
                  <input type="date" className="form-input" value={verifyForm.dob} onChange={e => setVerifyForm(f => ({ ...f, dob: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Insurance Payer</label>
                <select className="form-input" value={verifyForm.payer} onChange={e => setVerifyForm(f => ({ ...f, payer: e.target.value }))}>
                  {PAYERS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowVerify(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={runVerification} disabled={!verifyForm.patientName || !verifyForm.memberId}>🔍 Verify</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
