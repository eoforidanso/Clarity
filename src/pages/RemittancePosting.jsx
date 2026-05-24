import React, { useState, useMemo } from 'react';

// ─── Adjustment Code Reference ────────────────────────────────────────────────
const ADJ_CODES = {
  'CO-45': { label: 'Contractual Obligation', group: 'CO', desc: 'Charges exceed contracted rate', color: '#6366f1', bg: '#eff6ff' },
  'CO-97': { label: 'Bundled / Included', group: 'CO', desc: 'Procedure included in another', color: '#8b5cf6', bg: '#f5f3ff' },
  'CO-4':  { label: 'Modifier Missing / Invalid', group: 'CO', desc: 'Modifier not valid for this code', color: '#dc2626', bg: '#fef2f2' },
  'CO-B7': { label: 'Not Covered by Contractor', group: 'CO', desc: 'Service not covered under contract', color: '#dc2626', bg: '#fef2f2' },
  'PR-1':  { label: 'Deductible', group: 'PR', desc: 'Patient deductible responsibility', color: '#d97706', bg: '#fef3c7' },
  'PR-2':  { label: 'Coinsurance', group: 'PR', desc: 'Patient coinsurance responsibility', color: '#f59e0b', bg: '#fffbeb' },
  'PR-3':  { label: 'Copayment', group: 'PR', desc: 'Patient copay responsibility', color: '#d97706', bg: '#fef3c7' },
  'CO-24': { label: 'COB — Covered by Other', group: 'CO', desc: 'Covered under coordination of benefits', color: '#059669', bg: '#f0fdf4' },
  'OA-23': { label: 'Impact of Prior Payer', group: 'OA', desc: 'Adjustment from primary payer', color: '#0891b2', bg: '#ecfeff' },
};

const PAYER_COLOR = {
  BCBS: '#1e40af', Aetna: '#c2410c', UHC: '#15803d', Cigna: '#0e7490', Anthem: '#6d28d9', Medicare: '#b91c1c',
};

// ─── Mock ERA/835 Data ─────────────────────────────────────────────────────────
const SEED_ERAS = [
  {
    id: 'ERA-2024-0041', checkNum: 'CHK-881204', payer: 'BCBS', paymentDate: '2024-05-28',
    totalPayment: 842.00, status: 'pending',
    claims: [
      { claimNum: 'CLM-2024-0087', patient: 'Sarah Mitchell', dos: '2024-05-14', billed: 175, allowed: 140, paid: 140, patientResp: 0,
        lines: [
          { cpt: '90837', description: 'Psychotherapy 60min', billed: 175, allowed: 140, paid: 140, adjustments: [{ code: 'CO-45', amount: 35 }] },
        ]
      },
      { claimNum: 'CLM-2024-0088', patient: 'James Torres', dos: '2024-05-14', billed: 250, allowed: 200, paid: 170, patientResp: 30,
        lines: [
          { cpt: '99215', description: 'Office Visit High', billed: 250, allowed: 200, paid: 170, adjustments: [{ code: 'CO-45', amount: 50 }, { code: 'PR-1', amount: 30 }] },
        ]
      },
      { claimNum: 'CLM-2024-0089', patient: 'Linda Chen', dos: '2024-05-15', billed: 350, allowed: 280, paid: 252, patientResp: 28,
        lines: [
          { cpt: '90792', description: 'Psych Eval w/ Medical', billed: 350, allowed: 280, paid: 252, adjustments: [{ code: 'CO-45', amount: 70 }, { code: 'PR-2', amount: 28 }] },
        ]
      },
      { claimNum: 'CLM-2024-0090', patient: 'Robert Kim', dos: '2024-05-15', billed: 400, allowed: 340, paid: 280, patientResp: 60,
        lines: [
          { cpt: '99215', description: 'Office Visit High', billed: 250, allowed: 200, paid: 165, adjustments: [{ code: 'CO-45', amount: 50 }, { code: 'PR-1', amount: 35 }] },
          { cpt: '90833', description: 'Psych Add-On', billed: 150, allowed: 140, paid: 115, adjustments: [{ code: 'CO-45', amount: 10 }, { code: 'PR-2', amount: 25 }] },
        ]
      },
    ]
  },
  {
    id: 'ERA-2024-0040', checkNum: 'CHK-443851', payer: 'Aetna', paymentDate: '2024-05-24',
    totalPayment: 1248.50, status: 'pending',
    claims: [
      { claimNum: 'CLM-2024-0081', patient: 'Marcus Johnson', dos: '2024-05-10', billed: 212, allowed: 212, paid: 180, patientResp: 32,
        lines: [
          { cpt: '99215', description: 'Office Visit High', billed: 212, allowed: 212, paid: 180, adjustments: [{ code: 'PR-3', amount: 32 }] },
        ]
      },
      { claimNum: 'CLM-2024-0082', patient: 'Priya Sharma', dos: '2024-05-10', billed: 152, allowed: 152, paid: 152, patientResp: 0,
        lines: [
          { cpt: '90837', description: 'Psychotherapy 60min', billed: 152, allowed: 152, paid: 152, adjustments: [] },
        ]
      },
      { claimNum: 'CLM-2024-0083', patient: 'Nicole Foster', dos: '2024-05-11', billed: 295, allowed: 295, paid: 248, patientResp: 47,
        lines: [
          { cpt: '90792', description: 'Psych Eval w/ Medical', billed: 295, allowed: 295, paid: 248, adjustments: [{ code: 'PR-1', amount: 47 }] },
        ]
      },
      { claimNum: 'CLM-2024-0084', patient: 'David Kim', dos: '2024-05-13', billed: 668, allowed: 668, paid: 668, patientResp: 0,
        lines: [
          { cpt: '99214', description: 'Office Visit Mod', billed: 157, allowed: 157, paid: 157, adjustments: [] },
          { cpt: '90833', description: 'Psych Add-On', billed: 80, allowed: 80, paid: 80, adjustments: [] },
          { cpt: '90837', description: 'Psychotherapy 60min', billed: 152, allowed: 152, paid: 152, adjustments: [] },
          { cpt: '96127', description: 'Brief Assessment', billed: 26, allowed: 26, paid: 26, adjustments: [] },
          { cpt: '90792', description: 'Psych Eval w/ Medical', billed: 253, allowed: 253, paid: 253, adjustments: [] },
        ]
      },
    ]
  },
  {
    id: 'ERA-2024-0039', checkNum: 'CHK-221977', payer: 'UHC', paymentDate: '2024-05-20',
    totalPayment: 516.00, status: 'posted',
    claims: [
      { claimNum: 'CLM-2024-0075', patient: 'Emily Watson', dos: '2024-05-06', billed: 205, allowed: 185, paid: 148, patientResp: 37,
        lines: [
          { cpt: '99215', description: 'Office Visit High', billed: 205, allowed: 185, paid: 148, adjustments: [{ code: 'CO-45', amount: 20 }, { code: 'PR-1', amount: 37 }] },
        ]
      },
      { claimNum: 'CLM-2024-0076', patient: 'Tyler Brooks', dos: '2024-05-07', billed: 368, allowed: 368, paid: 368, patientResp: 0,
        lines: [
          { cpt: '90837', description: 'Psychotherapy 60min', billed: 144, allowed: 144, paid: 144, adjustments: [] },
          { cpt: '90834', description: 'Psychotherapy 45min', billed: 224, allowed: 224, paid: 224, adjustments: [] },
        ]
      },
    ]
  },
  {
    id: 'ERA-2024-0038', checkNum: 'CHK-118200', payer: 'Medicare', paymentDate: '2024-05-17',
    totalPayment: 383.00, status: 'posted',
    claims: [
      { claimNum: 'CLM-2024-0070', patient: 'Harold Simmons', dos: '2024-05-03', billed: 185, allowed: 185, paid: 166, patientResp: 19,
        lines: [
          { cpt: '99215', description: 'Office Visit High', billed: 185, allowed: 185, paid: 166, adjustments: [{ code: 'PR-2', amount: 19 }] },
        ]
      },
      { claimNum: 'CLM-2024-0071', patient: 'Dorothy Phillips', dos: '2024-05-03', billed: 255, allowed: 255, paid: 217, patientResp: 38,
        lines: [
          { cpt: '90792', description: 'Psych Eval w/ Medical', billed: 255, allowed: 255, paid: 217, adjustments: [{ code: 'PR-2', amount: 38 }] },
        ]
      },
    ]
  },
  {
    id: 'ERA-2024-0037', checkNum: 'CHK-009381', payer: 'Cigna', paymentDate: '2024-05-15',
    totalPayment: 0, status: 'exception',
    claims: [
      { claimNum: 'CLM-2024-0065', patient: 'Amanda Price', dos: '2024-04-30', billed: 208, allowed: 0, paid: 0, patientResp: 0,
        lines: [
          { cpt: '99215', description: 'Office Visit High', billed: 208, allowed: 0, paid: 0, adjustments: [{ code: 'CO-B7', amount: 208 }] },
        ]
      },
    ]
  },
  {
    id: 'ERA-2024-0036', checkNum: 'CHK-774512', payer: 'Anthem', paymentDate: '2024-05-10',
    totalPayment: 690.00, status: 'posted',
    claims: [
      { claimNum: 'CLM-2024-0058', patient: 'Kevin O\'Brien', dos: '2024-04-26', billed: 275, allowed: 275, paid: 240, patientResp: 35,
        lines: [
          { cpt: '90792', description: 'Psych Eval w/ Medical', billed: 275, allowed: 275, paid: 240, adjustments: [{ code: 'PR-1', amount: 35 }] },
        ]
      },
      { claimNum: 'CLM-2024-0059', patient: 'Rachel Green', dos: '2024-04-27', billed: 450, allowed: 412, paid: 450, patientResp: 0,
        lines: [
          { cpt: '90837', description: 'Psychotherapy 60min', billed: 138, allowed: 138, paid: 138, adjustments: [] },
          { cpt: '99214', description: 'Office Visit Mod', billed: 145, allowed: 145, paid: 145, adjustments: [] },
          { cpt: '90833', description: 'Psych Add-On', billed: 167, allowed: 129, paid: 167, adjustments: [{ code: 'CO-45', amount: 38 }] },
        ]
      },
    ]
  },
];

const UNAPPLIED = [
  { id: 'UAP-001', payer: 'BCBS', checkNum: 'CHK-000099', amount: 35.00, date: '2024-05-02', reason: 'No matching claim found for ICN 20240502001' },
  { id: 'UAP-002', payer: 'Aetna', checkNum: 'CHK-554431', amount: 152.00, date: '2024-04-28', reason: 'Claim CLM-2024-0045 already paid; duplicate remittance' },
];

const fmt$ = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d) => new Date(d + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const STATUS_STYLE = {
  pending:   { bg: '#eff6ff', color: '#1d4ed8', label: '⏳ Pending' },
  posted:    { bg: '#f0fdf4', color: '#166534', label: '✅ Posted' },
  exception: { bg: '#fef2f2', color: '#dc2626', label: '❌ Exception' },
};

// ─── Adjustment Code Badge ────────────────────────────────────────────────────
function AdjBadge({ code }) {
  const meta = ADJ_CODES[code] || { label: code, color: '#6b7280', bg: '#f3f4f6' };
  return (
    <span title={meta.desc} style={{ fontSize: 10, fontWeight: 700, background: meta.bg, color: meta.color, padding: '2px 6px', borderRadius: 4, marginRight: 4, display: 'inline-block', cursor: 'default' }}>
      {code}
    </span>
  );
}

// ─── ERA Row ──────────────────────────────────────────────────────────────────
function EraRow({ era, expanded, onToggle, onPost, posting }) {
  const status = STATUS_STYLE[era.status] || STATUS_STYLE.pending;
  const totalBilled = era.claims.reduce((s, c) => s + c.billed, 0);
  const totalPR     = era.claims.reduce((s, c) => s + c.patientResp, 0);
  const writeOff    = totalBilled - era.totalPayment - totalPR;

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
      {/* ERA header */}
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', background: expanded ? '#f8fafc' : '#fff', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: '#1d4ed8' }}>{era.id}</span>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: PAYER_COLOR[era.payer] || '#6b7280', flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 12 }}>{era.payer}</span>
        <span style={{ fontSize: 11, color: '#6b7280' }}>Check #{era.checkNum}</span>
        <span style={{ fontSize: 11, color: '#6b7280' }}>{fmtDate(era.paymentDate)}</span>
        <span style={{ fontSize: 11, color: '#6b7280' }}>{era.claims.length} claim{era.claims.length !== 1 ? 's' : ''}</span>
        <span style={{ marginLeft: 'auto', fontWeight: 900, fontSize: 14, color: era.totalPayment > 0 ? '#059669' : '#dc2626' }}>{fmt$(era.totalPayment)}</span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: status.bg, color: status.color }}>{status.label}</span>
        {era.status === 'pending' && (
          <button onClick={e => { e.stopPropagation(); onPost(era.id); }}
            disabled={posting}
            style={{ padding: '5px 12px', borderRadius: 7, background: '#059669', color: '#fff', border: 'none', cursor: posting ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700, opacity: posting ? 0.6 : 1 }}>
            {posting ? 'Posting…' : '✓ Post ERA'}
          </button>
        )}
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* ERA summary bar */}
      {expanded && (
        <div style={{ padding: '0 16px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { l: 'Total Billed', v: fmt$(totalBilled), c: '#374151' },
              { l: 'Payer Payment', v: fmt$(era.totalPayment), c: '#059669' },
              { l: 'Patient Resp.', v: fmt$(totalPR), c: '#d97706' },
              { l: 'Contractual W/O', v: fmt$(writeOff), c: '#6366f1' },
            ].map(s => (
              <div key={s.l} style={{ background: '#fff', borderRadius: 6, padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{s.l}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claims detail */}
      {expanded && (
        <div style={{ padding: '12px 16px' }}>
          {era.claims.map((claim, ci) => (
            <div key={ci} style={{ marginBottom: ci < era.claims.length - 1 ? 14 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11, color: '#374151', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{claim.claimNum}</span>
                <span style={{ fontWeight: 600, fontSize: 12 }}>{claim.patient}</span>
                <span style={{ fontSize: 11, color: '#6b7280' }}>DOS: {fmtDate(claim.dos)}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#374151' }}>
                  Billed: <strong>{fmt$(claim.billed)}</strong> → Paid: <strong style={{ color: '#059669' }}>{fmt$(claim.paid)}</strong>
                  {claim.patientResp > 0 && <span style={{ color: '#d97706' }}> · PR: {fmt$(claim.patientResp)}</span>}
                </span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['CPT', 'Description', 'Billed', 'Allowed', 'Paid', 'Adjustments'].map(h => (
                      <th key={h} style={{ padding: '5px 10px', textAlign: ['Billed','Allowed','Paid'].includes(h) ? 'right' : 'left', fontWeight: 700, fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {claim.lines.map((line, li) => (
                    <tr key={li} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 700, fontFamily: 'monospace', color: '#1d4ed8' }}>{line.cpt}</td>
                      <td style={{ padding: '6px 10px', color: '#374151' }}>{line.description}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>{fmt$(line.billed)}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#6366f1' }}>{fmt$(line.allowed)}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: line.paid > 0 ? '#059669' : '#dc2626' }}>{fmt$(line.paid)}</td>
                      <td style={{ padding: '6px 10px' }}>
                        {line.adjustments.length > 0 ? (
                          line.adjustments.map((a, ai) => (
                            <span key={ai} title={ADJ_CODES[a.code]?.desc}>
                              <AdjBadge code={a.code} /> <span style={{ fontSize: 10, color: '#6b7280', marginRight: 6 }}>{fmt$(a.amount)}</span>
                            </span>
                          ))
                        ) : <span style={{ color: '#059669', fontSize: 10, fontWeight: 700 }}>✓ No adjustments</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RemittancePosting() {
  const [eras, setEras] = useState(SEED_ERAS);
  const [expandedId, setExpandedId] = useState('ERA-2024-0041');
  const [posting, setPosting] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showLegend, setShowLegend] = useState(false);
  const [toast, setToast] = useState(null);
  const [unapplied, setUnapplied] = useState(UNAPPLIED);
  const [dismissedUA, setDismissedUA] = useState([]);

  const pending = eras.filter(e => e.status === 'pending');
  const posted  = eras.filter(e => e.status === 'posted');
  const exceptions = eras.filter(e => e.status === 'exception');

  const totalPending  = pending.reduce((s, e) => s + e.totalPayment, 0);
  const totalPosted   = posted.reduce((s, e) => s + e.totalPayment, 0);
  const totalUnapplied = unapplied.filter(u => !dismissedUA.includes(u.id)).reduce((s, u) => s + u.amount, 0);

  const allPatientResp = eras.reduce((s, era) => s + era.claims.reduce((cs, c) => cs + c.patientResp, 0), 0);

  const handlePost = (eraId) => {
    setPosting(eraId);
    setTimeout(() => {
      setEras(prev => prev.map(e => e.id === eraId ? { ...e, status: 'posted' } : e));
      setPosting(null);
      setToast({ msg: `ERA ${eraId} posted successfully`, type: 'success' });
      setTimeout(() => setToast(null), 3500);
    }, 1200);
  };

  const handleBulkPost = () => {
    const ids = pending.map(e => e.id);
    if (ids.length === 0) return;
    setPosting('bulk');
    setTimeout(() => {
      setEras(prev => prev.map(e => e.status === 'pending' ? { ...e, status: 'posted' } : e));
      setPosting(null);
      setToast({ msg: `${ids.length} ERA(s) posted successfully`, type: 'success' });
      setTimeout(() => setToast(null), 3500);
    }, 1500);
  };

  const filtered = useMemo(() => {
    let list = eras;
    if (filter !== 'all') list = list.filter(e => e.status === filter);
    if (search) list = list.filter(e =>
      e.id.toLowerCase().includes(search.toLowerCase()) ||
      e.payer.toLowerCase().includes(search.toLowerCase()) ||
      e.checkNum.toLowerCase().includes(search.toLowerCase()) ||
      e.claims.some(c => c.patient.toLowerCase().includes(search.toLowerCase()))
    );
    return list;
  }, [eras, filter, search]);

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, padding: '12px 20px', borderRadius: 10, background: toast.type === 'success' ? '#059669' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 13, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', animation: 'fade-in 0.2s' }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>💳 Remittance Posting</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>835 ERA processing, payment matching, adjustment code reconciliation, and bulk posting</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowLegend(!showLegend)} className="btn btn-secondary" style={{ fontSize: 12 }}>
            📋 Adj. Code Legend
          </button>
          {pending.length > 0 && (
            <button onClick={handleBulkPost} disabled={posting === 'bulk'}
              style={{ padding: '8px 16px', borderRadius: 8, background: '#059669', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              {posting === 'bulk' ? '⏳ Posting…' : `✓ Bulk Post ${pending.length} ERA${pending.length > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>

      {/* Adjustment Code Legend */}
      {showLegend && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Adjustment Code Reference</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
            {Object.entries(ADJ_CODES).map(([code, meta]) => (
              <div key={code} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 6, background: meta.bg, border: '1px solid ' + meta.color + '33' }}>
                <span style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: 11, color: meta.color, minWidth: 50 }}>{code}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{meta.label}</div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>{meta.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Pending ERAs', value: pending.length, sub: fmt$(totalPending), color: '#1d4ed8' },
          { label: 'Posted This Month', value: posted.length, sub: fmt$(totalPosted), color: '#059669' },
          { label: 'Exceptions', value: exceptions.length, sub: 'Needs review', color: '#dc2626' },
          { label: 'Unapplied Cash', value: fmt$(totalUnapplied), sub: unapplied.filter(u => !dismissedUA.includes(u.id)).length + ' payments', color: '#d97706' },
          { label: 'Patient Resp.', value: fmt$(allPatientResp), sub: 'Stmt-eligible', color: '#6366f1' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', borderLeft: '4px solid ' + s.color }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Unapplied payments */}
      {unapplied.filter(u => !dismissedUA.includes(u.id)).length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 16px', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#92400e', marginBottom: 8 }}>⚠️ Unapplied Payments — Require Action</div>
          {unapplied.filter(u => !dismissedUA.includes(u.id)).map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #fde68a', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: 12, color: PAYER_COLOR[u.payer] || '#374151' }}>{u.payer}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>#{u.checkNum}</span>
              <span style={{ fontSize: 11, color: '#6b7280' }}>{fmtDate(u.date)}</span>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#d97706' }}>{fmt$(u.amount)}</span>
              <span style={{ fontSize: 11, color: '#78350f', flex: 1 }}>{u.reason}</span>
              <button onClick={() => setDismissedUA(prev => [...prev, u.id])}
                style={{ padding: '3px 10px', borderRadius: 6, background: '#fff', border: '1px solid #fbbf24', color: '#92400e', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                Resolve
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <input className="form-input" placeholder="Search by ERA ID, payer, check #, patient…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 220, fontSize: 13 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all','All'], ['pending','Pending'], ['posted','Posted'], ['exception','Exception']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: filter === v ? '#1d4ed8' : '#fff',
                color: filter === v ? '#fff' : '#374151',
                borderColor: filter === v ? '#1d4ed8' : '#e2e8f0',
              }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ERA list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 14 }}>No ERAs match your filters.</div>
      ) : (
        filtered.map(era => (
          <EraRow
            key={era.id}
            era={era}
            expanded={expandedId === era.id}
            onToggle={() => setExpandedId(prev => prev === era.id ? null : era.id)}
            onPost={handlePost}
            posting={posting === era.id || posting === 'bulk'}
          />
        ))
      )}

      {/* Patient Responsibility Summary */}
      <div style={{ marginTop: 20, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>🧾 Patient Responsibility Queue — Pending Statements</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Claim #','Patient','Payer','DOS','PR Amount','Type','Action'].map(h => (
                <th key={h} style={{ padding: '7px 12px', textAlign: h === 'PR Amount' ? 'right' : 'left', fontWeight: 700, fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {eras.flatMap(era => era.claims
              .filter(c => c.patientResp > 0)
              .map((claim, i) => {
                const allAdj = claim.lines.flatMap(l => l.adjustments);
                const hasDeduct = allAdj.some(a => a.code === 'PR-1');
                const hasCoin   = allAdj.some(a => a.code === 'PR-2');
                const hasCopay  = allAdj.some(a => a.code === 'PR-3');
                const prType = hasDeduct ? 'Deductible' : hasCoin ? 'Coinsurance' : hasCopay ? 'Copay' : 'Patient Resp.';
                return (
                  <tr key={era.id + '-' + i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 10, color: '#1d4ed8' }}>{claim.claimNum}</td>
                    <td style={{ padding: '7px 12px', fontWeight: 600 }}>{claim.patient}</td>
                    <td style={{ padding: '7px 12px', color: PAYER_COLOR[era.payer] || '#374151', fontWeight: 700, fontSize: 11 }}>{era.payer}</td>
                    <td style={{ padding: '7px 12px', color: '#6b7280' }}>{fmtDate(claim.dos)}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 800, color: '#d97706' }}>{fmt$(claim.patientResp)}</td>
                    <td style={{ padding: '7px 12px' }}><span style={{ fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4 }}>{prType}</span></td>
                    <td style={{ padding: '7px 12px' }}>
                      <button style={{ fontSize: 10, padding: '3px 9px', borderRadius: 5, background: '#eff6ff', border: '1px solid #93c5fd', color: '#1d4ed8', cursor: 'pointer', fontWeight: 700 }}>
                        Queue Statement
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
