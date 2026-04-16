import React, { useState, useMemo } from 'react';

const CLAIM_STATUS = ['Clean', 'Needs Review', 'Error', 'Submitted', 'Accepted', 'Rejected'];
const STATUS_COLORS = {
  Clean:        { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  'Needs Review': { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  Error:        { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  Submitted:    { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
  Accepted:     { bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
  Rejected:     { bg: '#fecaca', color: '#7f1d1d', dot: '#dc2626' },
};

const CLEARINGHOUSES = ['Change Healthcare', 'Availity', 'Trizetto', 'Office Ally', 'ClaimMD'];

// ── Real-Time Claim Rules Engine ──────────────────────────
const CLAIM_RULES = [
  { id: 'r1', name: 'Modifier Validation', desc: 'Telehealth visits require GT/95 modifier; E&M + psychotherapy require modifier 25', category: 'Coding' },
  { id: 'r2', name: 'Timely Filing Check', desc: 'Claim DOS must be within payer-specific timely filing window (90-365 days)', category: 'Compliance' },
  { id: 'r3', name: 'NPI/Taxonomy Match', desc: 'Rendering provider NPI and taxonomy code must match payer enrollment', category: 'Enrollment' },
  { id: 'r4', name: 'Authorization Verification', desc: 'Prior authorization number validated and not expired for services requiring PA', category: 'Auth' },
  { id: 'r5', name: 'Duplicate Claim Detection', desc: 'Check for duplicate DOS + CPT + Patient within 7 days', category: 'Duplicate' },
  { id: 'r6', name: 'Place of Service Match', desc: 'POS code matches service type (02 for telehealth, 11 for office)', category: 'Coding' },
  { id: 'r7', name: 'ICD-10 Specificity', desc: 'Diagnosis codes meet highest level of specificity (no truncated codes)', category: 'Coding' },
  { id: 'r8', name: 'NCCI Bundling Edits', desc: 'CPT code combinations checked against CMS National Correct Coding Initiative', category: 'Compliance' },
  { id: 'r9', name: 'Patient Eligibility', desc: 'Member ID and insurance plan verified active for date of service', category: 'Eligibility' },
  { id: 'r10', name: 'Units & Time Validation', desc: 'Psychotherapy time aligns with CPT code selected (e.g., 90834 = 38-52 min)', category: 'Coding' },
];

const MOCK_CLAIMS = [
  { id: 'bc-1', patientName: 'James Anderson', dos: '2026-04-10', cpt: '99214', icd: 'F33.1', payer: 'Blue Cross Blue Shield', claimAmount: 240.00, status: 'Clean', provider: 'Dr. Chris Lee', errors: [], submittedDate: '', clearinghouse: '', ackDate: '' },
  { id: 'bc-2', patientName: 'Maria Garcia', dos: '2026-04-09', cpt: '90834', icd: 'F41.1', payer: 'Aetna', claimAmount: 200.00, status: 'Clean', provider: 'Dr. April Torres', errors: [], submittedDate: '', clearinghouse: '', ackDate: '' },
  { id: 'bc-3', patientName: 'Robert Chen', dos: '2026-04-08', cpt: '90792', icd: 'F33.2', payer: 'UnitedHealthcare', claimAmount: 440.00, status: 'Clean', provider: 'Dr. Chris Lee', errors: [], submittedDate: '', clearinghouse: '', ackDate: '' },
  { id: 'bc-4', patientName: 'Ashley Kim', dos: '2026-04-07', cpt: '90837', icd: 'F90.0', payer: 'Cigna', claimAmount: 280.00, status: 'Clean', provider: 'Dr. April Torres', errors: [], submittedDate: '', clearinghouse: '', ackDate: '' },
  { id: 'bc-5', patientName: 'Dorothy Wilson', dos: '2026-04-05', cpt: '99214', icd: 'F41.0', payer: 'Medicare Part B', claimAmount: 280.00, status: 'Needs Review', provider: 'Dr. Chris Lee', errors: ['Missing modifier — telehealth visit without GT modifier', 'Place of service mismatch: 11 vs expected 02'], submittedDate: '', clearinghouse: '', ackDate: '' },
  { id: 'bc-6', patientName: 'James Anderson', dos: '2026-04-03', cpt: '90834 + 99213', icd: 'F33.1, F41.1', payer: 'Blue Cross Blue Shield', claimAmount: 380.00, status: 'Error', provider: 'Dr. Chris Lee', errors: ['Duplicate CPT code pairing: 90834 + 99213 requires modifier 25 on E&M', 'Authorization number expired — re-verify PA'], submittedDate: '', clearinghouse: '', ackDate: '' },
  { id: 'bc-7', patientName: 'Maria Garcia', dos: '2026-03-28', cpt: '99214', icd: 'F41.1', payer: 'Aetna', claimAmount: 240.00, status: 'Submitted', provider: 'Dr. Chris Lee', errors: [], submittedDate: '2026-04-01', clearinghouse: 'Change Healthcare', ackDate: '2026-04-01' },
  { id: 'bc-8', patientName: 'Robert Chen', dos: '2026-03-25', cpt: '90791', icd: 'F33.2', payer: 'UnitedHealthcare', claimAmount: 480.00, status: 'Accepted', provider: 'Dr. Chris Lee', errors: [], submittedDate: '2026-03-28', clearinghouse: 'Change Healthcare', ackDate: '2026-03-29' },
  { id: 'bc-9', patientName: 'Sophia Martinez', dos: '2026-03-20', cpt: '90837', icd: 'F43.10', payer: 'Aetna', claimAmount: 280.00, status: 'Rejected', provider: 'Dr. April Torres', errors: ['Payer rejection: Patient not found — member ID mismatch'], submittedDate: '2026-03-22', clearinghouse: 'Availity', ackDate: '2026-03-23' },
];

export default function BatchClaimSubmission() {
  const [claims, setClaims] = useState(MOCK_CLAIMS);
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedClearinghouse, setSelectedClearinghouse] = useState(CLEARINGHOUSES[0]);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [scrubResults, setScrubResults] = useState(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [showRulesEngine, setShowRulesEngine] = useState(false);

  const filtered = useMemo(() => {
    let list = [...claims];
    if (filterStatus !== 'All') list = list.filter(c => c.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.patientName.toLowerCase().includes(q) || c.cpt.includes(q) || c.payer.toLowerCase().includes(q));
    }
    return list;
  }, [claims, filterStatus, search]);

  const stats = useMemo(() => ({
    clean: claims.filter(c => c.status === 'Clean').length,
    needsReview: claims.filter(c => c.status === 'Needs Review').length,
    errors: claims.filter(c => c.status === 'Error').length,
    submitted: claims.filter(c => c.status === 'Submitted').length,
    accepted: claims.filter(c => c.status === 'Accepted').length,
    rejected: claims.filter(c => c.status === 'Rejected').length,
    totalClean$: claims.filter(c => c.status === 'Clean').reduce((s, c) => s + c.claimAmount, 0),
    selectedCount: selectedIds.size,
    selected$: claims.filter(c => selectedIds.has(c.id)).reduce((s, c) => s + c.claimAmount, 0),
  }), [claims, selectedIds]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllClean = () => {
    const cleanIds = claims.filter(c => c.status === 'Clean').map(c => c.id);
    setSelectedIds(new Set(cleanIds));
  };

  const submitBatch = () => {
    const now = new Date().toISOString().slice(0, 10);
    setClaims(prev => prev.map(c => selectedIds.has(c.id) && c.status === 'Clean' ? {
      ...c, status: 'Submitted', submittedDate: now, clearinghouse: selectedClearinghouse, ackDate: '',
    } : c));
    // Simulate clearinghouse acknowledgment
    setTimeout(() => {
      setClaims(prev => prev.map(c => selectedIds.has(c.id) && c.status === 'Submitted' && !c.ackDate ? {
        ...c, ackDate: new Date().toISOString().slice(0, 10),
      } : c));
    }, 3000);
    setSelectedIds(new Set());
    setShowSubmitConfirm(false);
  };

  // Real-Time Claim Rules Engine scrub
  const runClaimScrub = () => {
    setScrubbing(true);
    setScrubResults(null);
    setTimeout(() => {
      const results = CLAIM_RULES.map(rule => {
        // Simulate rule checks based on claim data
        const failedClaims = claims.filter(c => {
          if (rule.id === 'r1' && c.errors.some(e => e.toLowerCase().includes('modifier'))) return true;
          if (rule.id === 'r5' && c.status === 'Error') return true;
          if (rule.id === 'r6' && c.errors.some(e => e.toLowerCase().includes('place of service'))) return true;
          if (rule.id === 'r4' && c.errors.some(e => e.toLowerCase().includes('authorization'))) return true;
          if (rule.id === 'r9' && c.errors.some(e => e.toLowerCase().includes('member id'))) return true;
          return false;
        });
        const warnClaims = claims.filter(c => {
          if (rule.id === 'r2' && c.status === 'Needs Review') return true;
          if (rule.id === 'r8' && c.cpt.includes('+')) return true;
          return false;
        });
        return {
          ...rule,
          status: failedClaims.length > 0 ? 'fail' : warnClaims.length > 0 ? 'warn' : 'pass',
          affected: failedClaims.length + warnClaims.length,
          details: failedClaims.length > 0
            ? `${failedClaims.length} claim(s) failed — ${failedClaims.map(c => c.patientName).join(', ')}`
            : warnClaims.length > 0
            ? `${warnClaims.length} claim(s) need review`
            : 'All claims passed',
        };
      });
      setScrubResults(results);
      setScrubbing(false);
    }, 1800);
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>📦 Batch Claim Submission</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Review, scrub, and submit claims in bulk to clearinghouses</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`claim-scrub-btn ${scrubbing ? 'scrubbing' : ''}`} onClick={runClaimScrub} disabled={scrubbing}>
            {scrubbing ? '⏳ Scrubbing...' : '🔍 Scrub All Claims'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowRulesEngine(!showRulesEngine)}>
            ⚙️ Rules Engine
          </button>
          <select className="form-input" value={selectedClearinghouse} onChange={e => setSelectedClearinghouse(e.target.value)} style={{ width: 180, fontSize: 12 }}>
            {CLEARINGHOUSES.map(c => <option key={c}>{c}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => { if (selectedIds.size > 0) setShowSubmitConfirm(true); else alert('Select claims first'); }} disabled={selectedIds.size === 0}>
            📤 Submit {selectedIds.size > 0 ? `(${selectedIds.size})` : 'Batch'}
          </button>
        </div>
      </div>

      {/* ── Real-Time Claim Rules Engine Panel ──────────── */}
      {showRulesEngine && (
        <div className="claim-rules-panel">
          <div className="claim-rules-header">
            <h3>⚙️ Real-Time Claim Rules Engine — {CLAIM_RULES.length} Active Rules</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 600 }}>Powered by CMS NCCI + Payer-Specific Edits</span>
              <button onClick={() => setShowRulesEngine(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
          </div>
          <div className="claim-rules-body">
            {CLAIM_RULES.map(rule => {
              const result = scrubResults?.find(r => r.id === rule.id);
              const status = result?.status || 'pass';
              return (
                <div key={rule.id} className={`claim-rule-item ${status}`}>
                  <div className="claim-rule-icon">
                    {status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️'}
                  </div>
                  <div className="claim-rule-text">
                    <div className="rule-name">{rule.name} <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 500, marginLeft: 6 }}>[{rule.category}]</span></div>
                    <div className="rule-detail">{rule.desc}</div>
                    {result && result.status !== 'pass' && (
                      <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4, color: status === 'fail' ? '#dc2626' : '#d97706' }}>
                        → {result.details}
                      </div>
                    )}
                  </div>
                  {result && (
                    <div style={{ fontSize: 10, fontWeight: 800, color: status === 'pass' ? '#16a34a' : status === 'fail' ? '#dc2626' : '#d97706', whiteSpace: 'nowrap' }}>
                      {result.affected === 0 ? 'PASS' : `${result.affected} FLAGGED`}
                    </div>
                  )}
                </div>
              );
            })}
            {!scrubResults && (
              <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: 'var(--text-muted)' }}>
                Click <strong>"🔍 Scrub All Claims"</strong> to run the rules engine against all claims
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Scrub Results Summary ──────────── */}
      {scrubResults && !showRulesEngine && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid var(--border)', padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 20 }}>🛡️</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>Claim Scrub Complete</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>{scrubResults.filter(r => r.status === 'pass').length} passed</span>
                {' · '}
                <span style={{ color: '#d97706', fontWeight: 700 }}>{scrubResults.filter(r => r.status === 'warn').length} warnings</span>
                {' · '}
                <span style={{ color: '#dc2626', fontWeight: 700 }}>{scrubResults.filter(r => r.status === 'fail').length} failed</span>
                {' — '}
                {CLAIM_RULES.length} rules checked
              </div>
            </div>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowRulesEngine(true)}>View Details</button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '✅', val: stats.clean, label: 'Clean', bg: '#dcfce7' },
          { icon: '⚠️', val: stats.needsReview, label: 'Needs Review', bg: '#fef3c7' },
          { icon: '❌', val: stats.errors, label: 'Errors', bg: '#fee2e2' },
          { icon: '📤', val: stats.submitted, label: 'Submitted', bg: '#dbeafe' },
          { icon: '✅', val: stats.accepted, label: 'Accepted', bg: '#d1fae5' },
          { icon: '🔴', val: stats.rejected, label: 'Rejected', bg: '#fecaca' },
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

      {/* Toolbar */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <input className="form-input" placeholder="Search claims..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
        <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 150, fontSize: 12 }}>
          <option value="All">All Statuses</option>
          {CLAIM_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-secondary btn-sm" onClick={selectAllClean}>☑️ Select All Clean ({stats.clean})</button>
        {selectedIds.size > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>
            {selectedIds.size} selected · ${stats.selected$.toLocaleString()}
          </span>
        )}
      </div>

      {/* Claims table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'center', width: 40 }}>☑</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10 }}>Patient</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10 }}>DOS</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10 }}>CPT</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10 }}>ICD-10</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10 }}>Payer</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, fontSize: 10 }}>Amount</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, fontSize: 10 }}>Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10 }}>Clearinghouse</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(claim => {
                const sc = STATUS_COLORS[claim.status] || STATUS_COLORS.Clean;
                const canSelect = claim.status === 'Clean';
                return (
                  <React.Fragment key={claim.id}>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: selectedIds.has(claim.id) ? '#eff6ff' : 'transparent' }}>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {canSelect && <input type="checkbox" checked={selectedIds.has(claim.id)} onChange={() => toggleSelect(claim.id)} />}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{claim.patientName}</td>
                      <td style={{ padding: '10px 14px' }}>{claim.dos}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--primary)' }}>{claim.cpt}</td>
                      <td style={{ padding: '10px 14px', fontSize: 11 }}>{claim.icd}</td>
                      <td style={{ padding: '10px 14px' }}>{claim.payer}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>${claim.claimAmount.toFixed(2)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: sc.bg, color: sc.color }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />{claim.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text-muted)' }}>{claim.clearinghouse || '—'}</td>
                    </tr>
                    {claim.errors.length > 0 && (
                      <tr>
                        <td colSpan={9} style={{ padding: '6px 14px 10px 54px', background: '#fef2f2' }}>
                          {claim.errors.map((err, i) => (
                            <div key={i} style={{ fontSize: 11, color: '#dc2626', display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 2 }}>
                              <span>⚠️</span><span>{err}</span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Confirm Modal */}
      {showSubmitConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowSubmitConfirm(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>📤 Confirm Batch Submission</div>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>You are about to submit:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{selectedIds.size}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Claims</div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#059669' }}>${stats.selected$.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Total Amount</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                <strong>Clearinghouse:</strong> {selectedClearinghouse}
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowSubmitConfirm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitBatch}>📤 Submit Claims</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
