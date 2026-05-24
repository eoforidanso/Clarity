import React, { useState, useMemo } from 'react';

// ─── ERA Batch Data ───────────────────────────────────────────────────────────
// Simulates 835 Electronic Remittance Advice files received from payers
const PAYER_LOGO = {
  'Blue Cross Blue Shield': { bg: '#1e40af', initials: 'BC' },
  'Aetna':                  { bg: '#c2410c', initials: 'AE' },
  'UnitedHealthcare':       { bg: '#15803d', initials: 'UH' },
  'Cigna':                  { bg: '#0e7490', initials: 'CI' },
  'Anthem':                 { bg: '#6d28d9', initials: 'AN' },
  'Medicare Part B':        { bg: '#b91c1c', initials: 'MC' },
};

// CAS reason codes used in 835 adjustment segments
const ADJ_CODES = {
  'CO-45': 'Contractual Obligation — charge exceeds fee schedule/contracted rate',
  'PR-1':  'Patient deductible amount',
  'PR-2':  'Patient coinsurance amount',
  'PR-3':  'Patient co-payment amount',
  'CO-97': 'Service/benefit not covered under patients current benefit plan',
  'CO-4':  'Service code billed not payable — bundled with primary procedure',
  'CO-16': 'Claim/service lacks information needed for adjudication',
  'CO-50': 'Non-covered service — not deemed medically necessary',
  'OA-23': 'Payment adjusted — claim filing time limit exceeded',
};

const SEED_ERAS = [
  {
    id: 'era-001',
    batchNumber: 'ERA-2026-001',
    payer: 'Blue Cross Blue Shield',
    payerID: 'BCBSMA',
    checkNumber: 'CHK-BCB-045781',
    eraDate: '2026-04-28',
    depositDate: '2026-04-29',
    totalClaims: 3,
    totalCharged: 750,
    totalAllowed: 610,
    totalPaid: 420,
    totalAdjustment: 190,
    patientResponsibility: 90,
    status: 'Posted',
    autoPosted: true,
    lines: [
      { claimNumber: 'CLM-2026-001', patient: 'James Anderson', dos: '2026-03-12', cpt: '99214', charged: 185, allowed: 148, paid: 140, adjCode: 'CO-45', adjAmt: 37, patientAmt: 30, matchedClaimId: 'clm-001' },
      { claimNumber: 'CLM-2026-002', patient: 'James Anderson', dos: '2026-02-14', cpt: '99214', charged: 185, allowed: 148, paid: 140, adjCode: 'CO-45', adjAmt: 37, patientAmt: 30, matchedClaimId: 'clm-002' },
      { claimNumber: 'CLM-2025-006', patient: 'James Anderson', dos: '2025-11-03', cpt: '90792', charged: 380, allowed: 314, paid: 140, adjCode: 'PR-1', adjAmt: 116, patientAmt: 30, matchedClaimId: 'clm-006' },
    ],
  },
  {
    id: 'era-002',
    batchNumber: 'ERA-2026-002',
    payer: 'Aetna',
    payerID: 'AETNA',
    checkNumber: 'CHK-AET-012944',
    eraDate: '2026-05-02',
    depositDate: '2026-05-03',
    totalClaims: 2,
    totalCharged: 425,
    totalAllowed: 364,
    totalPaid: 362,
    totalAdjustment: 61,
    patientResponsibility: 50,
    status: 'Posted',
    autoPosted: true,
    lines: [
      { claimNumber: 'CLM-2026-003', patient: 'Maria Garcia', dos: '2026-03-25', cpt: '99215', charged: 250, allowed: 212, paid: 210, adjCode: 'CO-45', adjAmt: 38, patientAmt: 25, matchedClaimId: 'clm-003' },
      { claimNumber: 'CLM-2026-008', patient: 'Maria Garcia', dos: '2026-04-09', cpt: '90837', charged: 175, allowed: 152, paid: 152, adjCode: 'CO-45', adjAmt: 23, patientAmt: 25, matchedClaimId: 'clm-008' },
    ],
  },
  {
    id: 'era-003',
    batchNumber: 'ERA-2026-003',
    payer: 'UnitedHealthcare',
    payerID: 'UHC001',
    checkNumber: 'CHK-UHC-098712',
    eraDate: '2026-05-10',
    depositDate: null,
    totalClaims: 1,
    totalCharged: 175,
    totalAllowed: 144,
    totalPaid: 0,
    totalAdjustment: 31,
    patientResponsibility: 144,
    status: 'Exception',
    autoPosted: false,
    exceptionReason: 'Claim number CLM-2026-007 not found in practice management system — manual match required.',
    lines: [
      { claimNumber: 'CLM-2026-007', patient: 'David Thompson', dos: '2026-04-01', cpt: '90837', charged: 175, allowed: 144, paid: 0, adjCode: 'CO-97', adjAmt: 31, patientAmt: 144, matchedClaimId: null },
    ],
  },
  {
    id: 'era-004',
    batchNumber: 'ERA-2026-004',
    payer: 'Cigna',
    payerID: 'CIGNA1',
    checkNumber: null,
    eraDate: '2026-05-15',
    depositDate: null,
    totalClaims: 1,
    totalCharged: 185,
    totalAllowed: 155,
    totalPaid: 155,
    totalAdjustment: 30,
    patientResponsibility: 20,
    status: 'Pending',
    autoPosted: false,
    lines: [
      { claimNumber: 'CLM-2026-004', patient: 'Emily Chen', dos: '2026-03-15', cpt: '99214', charged: 185, allowed: 155, paid: 155, adjCode: 'CO-45', adjAmt: 30, patientAmt: 20, matchedClaimId: 'clm-004' },
    ],
  },
  {
    id: 'era-005',
    batchNumber: 'ERA-2026-005',
    payer: 'Medicare Part B',
    payerID: 'MCRB01',
    checkNumber: 'CHK-MCR-774421',
    eraDate: '2026-05-18',
    depositDate: '2026-05-19',
    totalClaims: 1,
    totalCharged: 350,
    totalAllowed: 255,
    totalPaid: 204,
    totalAdjustment: 95,
    patientResponsibility: 51,
    status: 'Posted',
    autoPosted: true,
    lines: [
      { claimNumber: 'CLM-2025-MCR-001', patient: 'Robert Hughes', dos: '2026-05-05', cpt: '90792', charged: 350, allowed: 255, paid: 204, adjCode: 'CO-45', adjAmt: 95, patientAmt: 51, matchedClaimId: null },
    ],
  },
  {
    id: 'era-006',
    batchNumber: 'ERA-2026-006',
    payer: 'Anthem',
    payerID: 'ANTBCBS',
    checkNumber: null,
    eraDate: '2026-05-20',
    depositDate: null,
    totalClaims: 1,
    totalCharged: 185,
    totalAllowed: 0,
    totalPaid: 0,
    totalAdjustment: 185,
    patientResponsibility: 0,
    status: 'Exception',
    autoPosted: false,
    exceptionReason: 'Claim denied — CO-97: Prior authorization required. Appeal or resubmit with valid PA number.',
    lines: [
      { claimNumber: 'CLM-2026-005', patient: 'Aisha Patel', dos: '2026-03-20', cpt: '99214', charged: 185, allowed: 0, paid: 0, adjCode: 'CO-97', adjAmt: 185, patientAmt: 0, matchedClaimId: 'clm-005' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt$ = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const STATUS_STYLE = {
  Posted:    { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7', icon: '✅' },
  Pending:   { bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: '⏳' },
  Exception: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', icon: '⚠️' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Pending;
  return (
    <span style={{ background: s.bg, color: s.color, border: '1px solid ' + s.border, padding: '3px 9px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>
      {s.icon} {status}
    </span>
  );
}

function PayerLogo({ payer }) {
  const l = PAYER_LOGO[payer] || { bg: '#6b7280', initials: '??' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 24, height: 24, borderRadius: 5, background: l.bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, flexShrink: 0 }}>{l.initials}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{payer}</span>
    </div>
  );
}

// ─── ERA Detail Modal ─────────────────────────────────────────────────────────
function ERADetailModal({ era, onClose, onPost }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 780, maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', color: '#fff', margin: -20, padding: 20, marginBottom: 0, borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{era.batchNumber}</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
              {era.payer} · ERA Date: {fmtDate(era.eraDate)} · Payer ID: {era.payerID}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <StatusBadge status={era.status} />
            <button className="modal-close" onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 6, width: 28, height: 28, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>

        <div className="modal-body">
          {/* Financial Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              ['Total Charged', fmt$(era.totalCharged), '#1e293b'],
              ['Allowed',       fmt$(era.totalAllowed), '#0284c7'],
              ['Paid',          fmt$(era.totalPaid),    '#059669'],
              ['Adjustments',   fmt$(era.totalAdjustment), '#d97706'],
              ['Patient Resp.', fmt$(era.patientResponsibility), '#7c3aed'],
            ].map(([l, v, c]) => (
              <div key={l} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: c }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Check / Deposit Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              ['Check / EFT Number', era.checkNumber || '—'],
              ['ERA Date', fmtDate(era.eraDate)],
              ['Deposit Date', fmtDate(era.depositDate)],
            ].map(([k, v]) => (
              <div key={k} style={{ background: '#f8fafc', borderRadius: 7, padding: '10px 12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Exception Banner */}
          {era.status === 'Exception' && era.exceptionReason && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 12, marginBottom: 3 }}>⚠️ Exception — Manual Review Required</div>
              <div style={{ fontSize: 13, color: '#7f1d1d' }}>{era.exceptionReason}</div>
            </div>
          )}

          {/* Claim Lines */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Claim Detail Lines (835)</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid var(--border)' }}>
                  {['Claim #','Patient','DOS','CPT','Charged','Allowed','Paid','Adj Code','Adj Amt','Pt Resp','Matched'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: ['Charged','Allowed','Paid','Adj Amt','Pt Resp'].includes(h) ? 'right' : 'left', fontWeight: 700, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {era.lines.map((line, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#1e293b' }}>{line.claimNumber}</td>
                    <td style={{ padding: '8px 10px', fontSize: 11 }}>{line.patient}</td>
                    <td style={{ padding: '8px 10px', fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDate(line.dos)}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11, background: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: 4 }}>{line.cpt}</span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{fmt$(line.charged)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0284c7', fontWeight: 600 }}>{fmt$(line.allowed)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>{fmt$(line.paid)}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span title={ADJ_CODES[line.adjCode] || line.adjCode}
                        style={{ fontFamily: 'monospace', fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4, fontWeight: 700, cursor: 'help' }}>
                        {line.adjCode}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#d97706', fontWeight: 600 }}>{fmt$(line.adjAmt)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#7c3aed', fontWeight: 600 }}>{fmt$(line.patientAmt)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      {line.matchedClaimId ? (
                        <span style={{ color: '#059669', fontSize: 14, fontWeight: 700 }} title={'Matched: ' + line.matchedClaimId}>✓</span>
                      ) : (
                        <span style={{ color: '#dc2626', fontSize: 14, fontWeight: 700 }} title="No match found">✗</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Adj Code Legend */}
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)', marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Adjustment Code Reference (CAS)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
              {[...new Set(era.lines.map(l => l.adjCode))].map(code => (
                <div key={code} style={{ fontSize: 11, color: '#374151' }}>
                  <strong style={{ fontFamily: 'monospace', color: '#92400e' }}>{code}</strong> — {ADJ_CODES[code] || 'Unknown adjustment code'}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {era.status === 'Pending' && (
            <button className="btn btn-primary" onClick={() => onPost(era.id)}>
              💾 Post ERA
            </button>
          )}
          {era.status === 'Exception' && (
            <button className="btn btn-secondary">✍️ Manual Match</button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Upload ERA Modal ─────────────────────────────────────────────────────────
function UploadERAModal({ onClose, onUpload }) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
  };

  const handleUpload = () => {
    if (!file) return;
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      onUpload(file.name);
      onClose();
    }, 1800);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 500 }}>
        <div className="modal-header">
          <h3>📥 Upload ERA / 835 File</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            style={{ border: '2px dashed ' + (dragOver ? 'var(--primary)' : 'var(--border)'), borderRadius: 12, padding: '32px 24px', textAlign: 'center', background: dragOver ? 'var(--primary-light)' : '#fafafa', transition: 'all 0.2s', cursor: 'pointer' }}
            onClick={() => document.getElementById('era-file-input').click()}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: dragOver ? 'var(--primary)' : '#374151', marginBottom: 4 }}>
              {file ? file.name : 'Drop 835 file here or click to browse'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supports .835, .txt, .dat, .edi formats</div>
            <input id="era-file-input" type="file" accept=".835,.txt,.dat,.edi" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          </div>
          {file && !processing && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div style={{ fontWeight: 700, color: '#166534', fontSize: 12, marginBottom: 2 }}>✅ File ready</div>
              <div style={{ fontSize: 12, color: '#374151' }}>{file.name} · {(file.size / 1024).toFixed(1)} KB</div>
            </div>
          )}
          {processing && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>⏳ Processing ERA file…</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Matching claims and calculating adjustments</div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!file || processing} onClick={handleUpload}>
            {processing ? 'Processing…' : '📥 Upload & Process'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ERAPosting() {
  const [eras, setEras] = useState(SEED_ERAS);
  const [viewERA, setViewERA] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPayer, setFilterPayer] = useState('All');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [expandedAdj, setExpandedAdj] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const postERA = (id) => {
    setEras(prev => prev.map(e => e.id === id ? { ...e, status: 'Posted', autoPosted: true, depositDate: '2026-05-23' } : e));
    setViewERA(null);
    showToast('ERA posted and payments applied to claim ledger.');
  };

  const handleUpload = (filename) => {
    showToast(`ERA file "${filename}" uploaded — auto-matching in progress. Check back shortly.`, 'info');
  };

  const stats = useMemo(() => ({
    total: eras.length,
    posted: eras.filter(e => e.status === 'Posted').length,
    pending: eras.filter(e => e.status === 'Pending').length,
    exceptions: eras.filter(e => e.status === 'Exception').length,
    totalPaid: eras.filter(e => e.status === 'Posted').reduce((s, e) => s + e.totalPaid, 0),
    totalAdjustments: eras.reduce((s, e) => s + e.totalAdjustment, 0),
    autoPosted: eras.filter(e => e.autoPosted).length,
    matchRate: eras.length > 0 ? Math.round((eras.flatMap(e => e.lines).filter(l => l.matchedClaimId).length / eras.flatMap(e => e.lines).length) * 100) : 0,
  }), [eras]);

  const filtered = useMemo(() => eras.filter(e => {
    if (filterStatus !== 'All' && e.status !== filterStatus) return false;
    if (filterPayer !== 'All' && e.payer !== filterPayer) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!e.batchNumber.toLowerCase().includes(q) &&
          !e.payer.toLowerCase().includes(q) &&
          !(e.checkNumber || '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [eras, filterStatus, filterPayer, search]);

  const exceptions = eras.filter(e => e.status === 'Exception');
  const pending = eras.filter(e => e.status === 'Pending');

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'info' ? '#0284c7' : '#059669', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', maxWidth: 420 }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>💡 ERA Auto-Posting</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Electronic Remittance Advice (835) receipt, auto-matching, and payment posting</p>
        </div>
        <button className="btn btn-primary" style={{ fontSize: 13, fontWeight: 700 }} onClick={() => setShowUpload(true)}>
          📥 Upload ERA File
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'ERA Batches', value: stats.total, accent: '#6366f1' },
          { label: 'Auto-Posted', value: stats.autoPosted, accent: '#10b981', sub: 'Auto-matched' },
          { label: 'Pending Post', value: stats.pending, accent: '#f59e0b' },
          { label: 'Exceptions', value: stats.exceptions, accent: '#ef4444', sub: 'Need review' },
          { label: 'Claim Match Rate', value: stats.matchRate + '%', accent: '#3b82f6' },
          { label: 'Total Posted', value: fmt$(stats.totalPaid), accent: '#059669' },
          { label: 'Adjustments', value: fmt$(stats.totalAdjustments), accent: '#d97706', sub: 'CO + PR' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', borderLeft: '4px solid ' + s.accent }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Exception / Pending Alerts */}
      {(exceptions.length > 0 || pending.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: exceptions.length > 0 && pending.length > 0 ? '1fr 1fr' : '1fr', gap: 12, marginBottom: '1.25rem' }}>
          {exceptions.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontWeight: 800, color: '#dc2626', fontSize: 13, marginBottom: 8 }}>⚠️ Exceptions Requiring Action ({exceptions.length})</div>
              {exceptions.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #fecaca', fontSize: 12 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{e.batchNumber}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{e.payer}</span>
                    <div style={{ fontSize: 11, color: '#7f1d1d', marginTop: 2 }}>{e.exceptionReason?.slice(0, 80)}…</div>
                  </div>
                  <button onClick={() => setViewERA(e)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 10, cursor: 'pointer', flexShrink: 0, marginLeft: 10 }}>
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
          {pending.length > 0 && (
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontWeight: 800, color: '#92400e', fontSize: 13, marginBottom: 8 }}>⏳ Pending ERA Posting ({pending.length})</div>
              {pending.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #fde68a', fontSize: 12 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{e.batchNumber}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{e.payer}</span>
                    <div style={{ fontSize: 11, color: '#92400e', marginTop: 2 }}>{fmt$(e.totalPaid)} to post · {e.totalClaims} claim(s)</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 10 }}>
                    <button onClick={() => setViewERA(e)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fde68a', background: '#fff', fontWeight: 700, fontSize: 10, cursor: 'pointer', color: '#92400e' }}>Review</button>
                    <button onClick={() => postERA(e.id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#d97706', color: '#fff', fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>Post</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 200px 80px', gap: 10, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Search</div>
            <input className="form-input" placeholder="Batch #, payer, check number…" value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: 13 }} />
          </div>
          <div>
            <label className="form-label">Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-input" style={{ fontSize: 12 }}>
              <option value="All">All</option>
              <option value="Posted">Posted</option>
              <option value="Pending">Pending</option>
              <option value="Exception">Exception</option>
            </select>
          </div>
          <div>
            <label className="form-label">Payer</label>
            <select value={filterPayer} onChange={e => setFilterPayer(e.target.value)} className="form-input" style={{ fontSize: 12 }}>
              <option value="All">All Payers</option>
              {Object.keys(PAYER_LOGO).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button onClick={() => { setSearch(''); setFilterStatus('All'); setFilterPayer('All'); }} className="btn btn-secondary" style={{ height: 38, fontSize: 12 }}>Clear</button>
        </div>
      </div>

      {/* ERA Table */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>ERA Batches ({filtered.length})</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Adjustment code key: CO = Contractual Obligation · PR = Patient Responsibility · OA = Other</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', background: '#f8fafc' }}>
                {['Batch #','Payer','ERA Date','Deposit Date','Claims','Charged','Allowed','Paid','Adjustments','Pt Resp','Auto?','Status','Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: ['Charged','Allowed','Paid','Adjustments','Pt Resp'].includes(h) ? 'right' : 'left', fontWeight: 700, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={13} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32 }}>📭</div>
                  <p style={{ margin: '8px 0 0' }}>No ERA batches found.</p>
                </td></tr>
              ) : filtered.map((era, i) => (
                <tr key={era.id} style={{ borderBottom: '1px solid var(--border)', background: era.status === 'Exception' ? '#fff7f7' : era.status === 'Pending' ? '#fffbeb' : i % 2 === 1 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, fontSize: 11, cursor: 'pointer', color: '#1d4ed8' }} onClick={() => setViewERA(era)}>
                    {era.batchNumber}
                  </td>
                  <td style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={() => setViewERA(era)}>
                    <PayerLogo payer={era.payer} />
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDate(era.eraDate)}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDate(era.depositDate)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>{era.totalClaims}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{fmt$(era.totalCharged)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0284c7', fontWeight: 600 }}>{fmt$(era.totalAllowed)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>{fmt$(era.totalPaid)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#d97706', fontWeight: 600 }}>{fmt$(era.totalAdjustment)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#7c3aed', fontWeight: 600 }}>{fmt$(era.patientResponsibility)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {era.autoPosted ? (
                      <span style={{ color: '#059669', fontSize: 13, fontWeight: 700 }} title="Auto-posted">✓</span>
                    ) : (
                      <span style={{ color: '#d1d5db', fontSize: 13 }} title="Manual required">—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}><StatusBadge status={era.status} /></td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => setViewERA(era)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)' }}>View 835</button>
                      {era.status === 'Pending' && (
                        <button onClick={() => postERA(era.id)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: 'none', background: '#1d4ed8', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Post</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adj Code Reference */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, cursor: 'pointer' }} onClick={() => setExpandedAdj(expandedAdj ? null : 'open')}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>📚 CAS Adjustment Code Reference</div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{expandedAdj ? '▲ Collapse' : '▼ Expand'}</span>
        </div>
        {expandedAdj && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
            {Object.entries(ADJ_CODES).map(([code, desc]) => (
              <div key={code} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                <code style={{ fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '1px 5px', borderRadius: 3, flexShrink: 0, alignSelf: 'flex-start' }}>{code}</code>
                <span style={{ color: '#374151' }}>{desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewERA && <ERADetailModal era={viewERA} onClose={() => setViewERA(null)} onPost={postERA} />}
      {showUpload && <UploadERAModal onClose={() => setShowUpload(false)} onUpload={handleUpload} />}
    </div>
  );
}
