import React, { useState, useMemo, useEffect, useRef } from 'react';

// ─── Adjustment Reason Codes ──────────────────────────────────────────────────
const CARC = {
  '1':  'Deductible amount',
  '2':  'Coinsurance amount',
  '3':  'Co-payment amount',
  '4':  'The service/equipment/drug is not covered by the plan',
  '45': 'Charge exceeds fee schedule/maximum allowable',
  '97': 'Payment is included in the allowance for another service',
  'CO': 'Contractual Obligation',
  'PR': 'Patient Responsibility',
  'OA': 'Other Adjustment',
};
const RARC = {
  'N30':  'Patient cannot be identified as our insured',
  'N115': 'This decision was based on a Local Coverage Determination (LCD)',
  'N20':  'Service not furnished directly to the patient and/or not documented',
  'MA01': 'If you do not agree with what we approved for these services, you may appeal our decision',
  'MA04': 'Secondary payment cannot be considered without the identity of or payment information from the primary payer',
};

// ─── Seed 835 Records ─────────────────────────────────────────────────────────
const SEED_835 = [
  {
    id: 'era-001', receivedAt: '2026-05-23T08:00:00', payer: 'Blue Cross Blue Shield', payerId: '00510',
    checkNum: 'BCB-CHK-20260523-001', checkDate: '2026-05-20', totalPaid: 1478.00,
    partner: 'Availity', fileId: 'ERA_BCBS_20260523_001.edi', status: 'Posted',
    claimLines: [
      { claimId: 'CLM-2026-001', patient: 'James Anderson', dos: '2026-03-12', billed: 185, allowed: 148, paid: 118.40, deductible: 0, coinsurance: 29.60, copay: 0, carc: '45', rarc: null, adjCode: 'CO', status: 'Paid', cpt: '99214' },
      { claimId: 'CLM-2026-002', patient: 'James Anderson', dos: '2026-02-14', billed: 185, allowed: 148, paid: 118.40, deductible: 0, coinsurance: 29.60, copay: 0, carc: '45', rarc: null, adjCode: 'CO', status: 'Paid', cpt: '99214' },
      { claimId: 'CLM-2025-006', patient: 'James Anderson', dos: '2025-11-03', billed: 380, allowed: 304, paid: 243.20, deductible: 60.80, coinsurance: 0, copay: 0, carc: '1', rarc: 'MA01', adjCode: 'PR', status: 'Partial', cpt: '90792' },
    ],
  },
  {
    id: 'era-002', receivedAt: '2026-05-23T08:15:00', payer: 'Aetna', payerId: 'AETNA',
    checkNum: 'AET-EFT-20260523-002', checkDate: '2026-05-21', totalPaid: 912.00,
    partner: 'Change Healthcare', fileId: 'ERA_AETNA_20260523_002.edi', status: 'Posted',
    claimLines: [
      { claimId: 'CLM-2026-003', patient: 'Maria Garcia', dos: '2026-03-25', billed: 250, allowed: 212, paid: 148.40, deductible: 0, coinsurance: 63.60, copay: 0, carc: '2', rarc: null, adjCode: 'PR', status: 'Paid', cpt: '99215' },
      { claimId: 'CLM-2026-008', patient: 'Maria Garcia', dos: '2026-04-09', billed: 175, allowed: 152, paid: 121.60, deductible: 0, coinsurance: 30.40, copay: 0, carc: '2', rarc: null, adjCode: 'PR', status: 'Paid', cpt: '90837' },
    ],
  },
  {
    id: 'era-003', receivedAt: '2026-05-23T09:00:00', payer: 'UnitedHealthcare', payerId: 'UHC001',
    checkNum: 'UHC-EFT-20260523-003', checkDate: '2026-05-22', totalPaid: 0,
    partner: 'Optum / UHC Direct', fileId: 'ERA_UHC_20260523_003.edi', status: 'Exception',
    claimLines: [
      { claimId: 'CLM-2026-007', patient: 'David Thompson', dos: '2026-04-01', billed: 175, allowed: 0, paid: 0, deductible: 0, coinsurance: 0, copay: 0, carc: '4', rarc: 'N30', adjCode: 'CO', status: 'Denied', cpt: '90837', denialMsg: 'Service not covered under current benefit plan. Verify member eligibility.' },
    ],
  },
  {
    id: 'era-004', receivedAt: '2026-05-22T15:30:00', payer: 'Cigna', payerId: 'CIGNA',
    checkNum: 'CIG-CHK-20260522-041', checkDate: '2026-05-19', totalPaid: 620.00,
    partner: 'Waystar', fileId: 'ERA_CIGNA_20260522_041.edi', status: 'Posted',
    claimLines: [
      { claimId: 'CLM-2026-004', patient: 'Emily Chen', dos: '2026-03-15', billed: 185, allowed: 155, paid: 124.00, deductible: 0, coinsurance: 31.00, copay: 0, carc: '2', rarc: null, adjCode: 'PR', status: 'Paid', cpt: '99214' },
    ],
  },
];

// ─── Variance Analysis ─────────────────────────────────────────────────────────
const calcVariance = (billed, paid) => {
  if (!billed) return 0;
  return ((paid / billed) * 100).toFixed(1);
};

// ─── Build Raw 835 ────────────────────────────────────────────────────────────
const build835 = (era) => {
  const date = era.checkDate.replace(/-/g,'');
  const lines = [
    `ISA*00*          *00*          *01*${era.payerId.padEnd(15)}*ZZ*CLARITYEHR     *260523*0800*^*00501*000000200*1*P*:~`,
    `GS*HP*${era.payerId}*CLARITYEHR*20260523*0800*200*X*005010X221A1~`,
    `ST*835*0001~`,
    `BPR*I*${era.totalPaid.toFixed(2)}*C*ACH*CCP*01*${era.payerId}*DA*CHECKNUM${era.checkNum.slice(-6)}*1234567890*DA*98765*${date}~`,
    `TRN*1*${era.checkNum}*1${era.payerId}~`,
    `DTM*405*${date}~`,
    `N1*PR*${era.payer.toUpperCase()}*XV*${era.payerId}~`,
    `N1*PE*CLARITY BEHAVIORAL HEALTH*XX*1234567890~`,
    `N3*123 MAIN ST~`,
    `N4*ANYTOWN*CA*90210~`,
    ...era.claimLines.map(cl => [
      `CLP*${cl.claimId}*${cl.status === 'Denied' ? '4' : cl.status === 'Partial' ? '2' : '1'}*${cl.billed.toFixed(2)}*${cl.paid.toFixed(2)}*${cl.deductible.toFixed(2)}*MC*${cl.claimId}~`,
      `CAS*${cl.adjCode}*${cl.carc}*${(cl.billed - cl.paid).toFixed(2)}~`,
      `NM1*QC*1*${cl.patient.split(' ').reverse()[0]}*${cl.patient.split(' ')[0]}~`,
      `NM1*74*1*PROVIDER*NAME~`,
      `DTM*232*${cl.dos.replace(/-/g,'')}~`,
      `SVC*HC:${cl.cpt}*${cl.billed.toFixed(2)}*${cl.paid.toFixed(2)}~`,
      `CAS*${cl.adjCode}*${cl.carc}*${(cl.billed - cl.paid).toFixed(2)}~`,
      cl.rarc ? `MOA**${cl.rarc}~` : null,
    ].filter(Boolean).join('\n')).join('\n'),
    `PLB*1234567890*${date}*WO:${era.checkNum}*-0.00~`,
    `SE*${30 + era.claimLines.length * 7}*0001~`,
    `GE*1*200~`,
    `IEA*1*000000200~`,
  ];
  return lines.join('\n');
};

const fmt$ = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
const fmtDt = (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const STATUS_C = {
  Posted:    { bg: '#d1fae5', col: '#065f46' },
  Exception: { bg: '#fee2e2', col: '#991b1b' },
  Pending:   { bg: '#fef3c7', col: '#92400e' },
  Partial:   { bg: '#fce7f3', col: '#9d174d' },
};
function StatusBadge({ s }) {
  const c = STATUS_C[s] || STATUS_C.Pending;
  return <span style={{ background: c.bg, color: c.col, padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{s}</span>;
}

export default function EDI835Listener() {
  const [records, setRecords] = useState(SEED_835);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('era');
  const [detailTab, setDetailTab] = useState('lines');
  const [toast, setToast] = useState(null);

  // ── Live Polling simulation ───────────────────────────────
  const [isPolling, setIsPolling] = useState(false);
  const [pollState, setPollState] = useState('Idle');
  const [pollCycles, setPollCycles] = useState(0);
  const [pollLog, setPollLog] = useState([]);
  const pollRef = useRef(null);
  const cycleRef = useRef(0);

  // ── Auto-Post queue ───────────────────────────────────────
  const [autoPostQueue, setAutoPostQueue] = useState([
    { id: 'ap-001', claimId: 'CLM-2026-001', patient: 'James Anderson', payer: 'Blue Cross Blue Shield', billed: 185, paid: 118.40, variance: 66.60, variancePct: 35.99, status: 'Pending', eraId: 'era-001' },
    { id: 'ap-002', claimId: 'CLM-2026-002', patient: 'James Anderson', payer: 'Blue Cross Blue Shield', billed: 185, paid: 118.40, variance: 66.60, variancePct: 35.99, status: 'Pending', eraId: 'era-001' },
    { id: 'ap-003', claimId: 'CLM-2026-003', patient: 'Maria Garcia', payer: 'Aetna', billed: 250, paid: 148.40, variance: 101.60, variancePct: 40.64, status: 'Pending', eraId: 'era-002' },
    { id: 'ap-004', claimId: 'CLM-2026-004', patient: 'Emily Chen', payer: 'Cigna', billed: 185, paid: 124.00, variance: 61.00, variancePct: 32.97, status: 'Posted', eraId: 'era-004' },
    { id: 'ap-005', claimId: 'CLM-2025-006', patient: 'James Anderson', payer: 'Blue Cross Blue Shield', billed: 380, paid: 243.20, variance: 136.80, variancePct: 36.00, status: 'Review', eraId: 'era-001' },
  ]);

  const startPolling = () => {
    setIsPolling(true);
    cycleRef.current = 0;
    pollRef.current = setInterval(() => {
      cycleRef.current += 1;
      const cycle = cycleRef.current;
      setPollCycles(cycle);
      const states = ['Connecting', 'Polling', 'Polling', 'Receiving', 'Processing', 'Posted'];
      let delay = 0;
      states.forEach((s, i) => {
        setTimeout(() => { setPollState(s); }, delay);
        delay += 300 + Math.random() * 200;
      });
      // Every 3rd cycle, "discover" a new ERA
      if (cycle % 3 === 0) {
        setTimeout(() => {
          const newEra = {
            id: 'era-live-' + cycle, receivedAt: new Date().toISOString(),
            payer: ['Aetna', 'Medicare Part B', 'Cigna'][cycle % 3], payerId: ['AETNA', 'MCRB', 'CIGNA'][cycle % 3],
            checkNum: 'LIVE-' + cycle + '-' + Date.now().toString().slice(-4),
            checkDate: new Date().toISOString().split('T')[0], totalPaid: (Math.random() * 500 + 100).toFixed(2) * 1,
            partner: 'Availity', fileId: 'ERA_LIVE_' + cycle + '.edi', status: 'Received',
            claimLines: [],
          };
          setRecords(prev => [newEra, ...prev]);
          setPollLog(prev => [{ ts: new Date().toLocaleTimeString(), msg: '✅ New ERA received: ' + newEra.fileId + ' ($' + newEra.totalPaid.toFixed(2) + ')' }, ...prev.slice(0, 19)]);
          showToast('New ERA received from ' + newEra.payer + ': $' + newEra.totalPaid.toFixed(2));
        }, delay + 200);
      } else {
        setPollLog(prev => [{ ts: new Date().toLocaleTimeString(), msg: '○ Poll cycle #' + cycle + ' — no new ERAs' }, ...prev.slice(0, 19)]);
        setTimeout(() => setPollState('Idle'), delay + 100);
      }
    }, 7000);
  };

  const stopPolling = () => {
    clearInterval(pollRef.current);
    setIsPolling(false);
    setPollState('Idle');
  };

  useEffect(() => () => clearInterval(pollRef.current), []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const stats = useMemo(() => ({
    total: records.length,
    posted: records.filter(r => r.status === 'Posted').length,
    exceptions: records.filter(r => r.status === 'Exception').length,
    totalPaid: records.reduce((s, r) => s + (r.totalPaid || 0), 0),
    totalLines: records.reduce((s, r) => s + r.claimLines.length, 0),
    denials: records.reduce((s, r) => s + r.claimLines.filter(cl => cl.status === 'Denied').length, 0),
  }), [records]);

  // ── Variance data ─────────────────────────────────────────
  const varianceByPayer = useMemo(() => {
    const map = {};
    records.forEach(era => {
      if (!map[era.payer]) map[era.payer] = { payer: era.payer, billed: 0, allowed: 0, paid: 0, lines: 0 };
      era.claimLines.forEach(cl => {
        map[era.payer].billed += cl.billed;
        map[era.payer].allowed += cl.allowed;
        map[era.payer].paid += cl.paid;
        map[era.payer].lines += 1;
      });
    });
    return Object.values(map).map(row => ({
      ...row,
      collectionPct: row.billed > 0 ? ((row.paid / row.billed) * 100).toFixed(1) : '0',
      allowedPct: row.billed > 0 ? ((row.allowed / row.billed) * 100).toFixed(1) : '0',
    })).sort((a, b) => b.billed - a.billed);
  }, [records]);

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#059669', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>💰 835 ERA Listener Service</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Inbound 835 Electronic Remittance Advice processing — parse, auto-post, and reconcile claim payments with CARC/RARC analysis</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isPolling ? (
            <button onClick={stopPolling} style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff7f7', color: '#dc2626', fontWeight: 700, cursor: 'pointer' }}>⏹ Stop Listener</button>
          ) : (
            <button onClick={startPolling} className="btn btn-primary" style={{ fontSize: 12, padding: '8px 14px' }}>▶ Start Listener</button>
          )}
          <div style={{ padding: '8px 14px', borderRadius: 8, background: isPolling ? '#d1fae5' : '#f3f4f6', border: '1px solid ' + (isPolling ? '#6ee7b7' : '#e5e7eb'), fontSize: 12, fontWeight: 700, color: isPolling ? '#065f46' : '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isPolling ? '#10b981' : '#9ca3af', display: 'inline-block', animation: isPolling ? 'pulse 2s infinite' : 'none' }} />
            {isPolling ? `${pollState} (cycle #${pollCycles})` : 'Listener Stopped'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'ERAs Received', value: stats.total, accent: '#6366f1' },
          { label: 'Auto-Posted', value: stats.posted, accent: '#10b981' },
          { label: 'Exceptions', value: stats.exceptions, accent: '#ef4444' },
          { label: 'Total Remitted', value: fmt$(stats.totalPaid), accent: '#3b82f6' },
          { label: 'Claim Lines', value: stats.totalLines, accent: '#7c3aed' },
          { label: 'Denials in ERA', value: stats.denials, accent: '#dc2626' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', borderLeft: '4px solid ' + s.accent }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 16 }}>
        {[['era','📬 ERA Inbox'], ['autopost','✅ Auto-Post Queue'], ['variance','📊 Variance Report'], ['carc','📖 CARC/RARC Reference'], ['config','⚙️ Listener Config']].map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '10px 18px', border: 'none', background: 'transparent', color: activeTab === t ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: activeTab === t ? 700 : 500, fontSize: 13, cursor: 'pointer', borderBottom: '3px solid ' + (activeTab === t ? 'var(--primary)' : 'transparent'), marginBottom: -2 }}>
            {l}
          </button>
        ))}
      </div>

      {activeTab === 'era' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {records.map(era => (
            <div key={era.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 16, cursor: 'pointer', borderLeft: '4px solid ' + (era.status === 'Exception' ? '#ef4444' : '#10b981') }} onClick={() => { setSelected(era); setDetailTab('lines'); }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 13 }}>{era.payer}</span>
                    <StatusBadge s={era.status} />
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{era.checkNum}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>Partner: <strong style={{ color: '#374151' }}>{era.partner}</strong></span>
                    <span>File: <strong style={{ color: '#374151' }}>{era.fileId}</strong></span>
                    <span>Check Date: <strong style={{ color: '#374151' }}>{era.checkDate}</strong></span>
                    <span>Claims: <strong style={{ color: '#374151' }}>{era.claimLines.length}</strong></span>
                    <span>Total Paid: <strong style={{ color: '#059669' }}>{fmt$(era.totalPaid)}</strong></span>
                    <span>Received: <strong style={{ color: '#374151' }}>{fmtDt(era.receivedAt)}</strong></span>
                  </div>
                  {era.status === 'Exception' && (
                    <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fca5a5', fontSize: 11, color: '#dc2626' }}>
                      ⛔ {era.claimLines.filter(c => c.status === 'Denied').length} denial(s) — manual review required
                    </div>
                  )}
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {era.claimLines.map(cl => (
                      <span key={cl.claimId} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 700, background: cl.status === 'Paid' ? '#d1fae5' : cl.status === 'Denied' ? '#fee2e2' : '#fef3c7', color: cl.status === 'Paid' ? '#065f46' : cl.status === 'Denied' ? '#991b1b' : '#92400e' }}>
                        {cl.claimId}: {fmt$(cl.paid)}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={e => { e.stopPropagation(); setSelected(era); setDetailTab('lines'); }} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer' }}>View Details</button>
                  {era.status !== 'Posted' && (
                    <button onClick={e => { e.stopPropagation(); showToast('Manual post initiated for ' + era.checkNum); }} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>⚡ Post</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Auto-Post Queue ── */}
      {activeTab === 'autopost' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>✅ Auto-Post Queue</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Variance &lt; $5: eligible for auto-post · Variance ≥ $5: requires manual review</div>
            </div>
            <button onClick={() => {
              const pending = autoPostQueue.filter(i => i.status === 'Pending' && i.variance < 5);
              if (!pending.length) { showToast('No items eligible for auto-post.'); return; }
              setAutoPostQueue(prev => prev.map(i => (i.status === 'Pending' && i.variance < 5) ? { ...i, status: 'Posted' } : i));
              showToast(pending.length + ' item(s) auto-posted successfully.');
            }} className="btn btn-primary" style={{ fontSize: 13 }}>⚡ Post All Auto-Eligible</button>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Claim ID', 'Patient', 'Payer', 'Billed', 'Paid', 'Variance $', 'Variance %', 'ERA', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {autoPostQueue.map((item, i) => {
                  const eligible = item.status === 'Pending' && item.variance < 5;
                  const needsReview = item.status === 'Pending' && item.variance >= 5;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', background: item.status === 'Posted' ? '#f0fdf4' : item.status === 'Review' ? '#fff7ed' : i % 2 === 1 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#1d4ed8' }}>{item.claimId}</td>
                      <td style={{ padding: '9px 12px', fontSize: 12 }}>{item.patient}</td>
                      <td style={{ padding: '9px 12px', fontSize: 11 }}>{item.payer}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 600 }}>${item.billed.toFixed(2)}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#059669' }}>${item.paid.toFixed(2)}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: item.variance > 100 ? '#dc2626' : item.variance > 50 ? '#d97706' : '#374151' }}>${item.variance.toFixed(2)}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: item.variancePct > 40 ? '#dc2626' : item.variancePct > 30 ? '#d97706' : '#374151' }}>{item.variancePct.toFixed(1)}%</td>
                      <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{item.eraId}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: item.status === 'Posted' ? '#d1fae5' : item.status === 'Review' ? '#fef3c7' : '#eff6ff', color: item.status === 'Posted' ? '#065f46' : item.status === 'Review' ? '#92400e' : '#1d4ed8' }}>{item.status}</span>
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        {item.status === 'Pending' && (
                          <button onClick={() => { setAutoPostQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: eligible ? 'Posted' : 'Review' } : q)); showToast(eligible ? item.claimId + ' auto-posted.' : item.claimId + ' flagged for review.'); }} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid ' + (eligible ? '#86efac' : '#fcd34d'), background: eligible ? '#f0fdf4' : '#fef3c7', color: eligible ? '#166534' : '#92400e', fontWeight: 700, cursor: 'pointer' }}>
                            {eligible ? '⚡ Auto-Post' : '👁 Review'}
                          </button>
                        )}
                        {item.status === 'Posted' && <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>✓ Posted</span>}
                        {item.status === 'Review' && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => { setAutoPostQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'Posted' } : q)); showToast(item.claimId + ' approved and posted.'); }} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: '1px solid #86efac', background: '#f0fdf4', color: '#166534', fontWeight: 700, cursor: 'pointer' }}>✓ Approve</button>
                            <button onClick={() => { setAutoPostQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'Rejected' } : q)); showToast(item.claimId + ' rejected.'); }} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: '1px solid #fca5a5', background: '#fff7f7', color: '#dc2626', fontWeight: 700, cursor: 'pointer' }}>✗ Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Variance Report ── */}
      {activeTab === 'variance' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>📊 Payment Variance Report</div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {[
              { label: 'Total Billed', value: '$' + records.reduce((s, r) => s + r.claimLines.reduce((ss, cl) => ss + cl.billed, 0), 0).toFixed(2), accent: '#3b82f6' },
              { label: 'Total Allowed', value: '$' + records.reduce((s, r) => s + r.claimLines.reduce((ss, cl) => ss + cl.allowed, 0), 0).toFixed(2), accent: '#8b5cf6' },
              { label: 'Total Paid', value: '$' + records.reduce((s, r) => s + r.claimLines.reduce((ss, cl) => ss + cl.paid, 0), 0).toFixed(2), accent: '#10b981' },
              { label: 'Collection Rate', value: (() => { const b = records.reduce((s,r) => s+r.claimLines.reduce((ss,cl) => ss+cl.billed,0),0); const p = records.reduce((s,r) => s+r.claimLines.reduce((ss,cl) => ss+cl.paid,0),0); return b > 0 ? (p/b*100).toFixed(1)+'%' : '0%'; })(), accent: '#059669' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', borderLeft: '4px solid ' + s.accent }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Payer breakdown table */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>Variance by Payer</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Payer', 'Lines', 'Total Billed', 'Total Allowed', 'Total Paid', 'Collection %', 'Allowed %', 'Collection Bar'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {varianceByPayer.map((row, i) => {
                  const pct = parseFloat(row.collectionPct);
                  const barColor = pct >= 90 ? '#10b981' : pct >= 80 ? '#f59e0b' : '#ef4444';
                  return (
                    <tr key={row.payer} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{row.payer}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{row.lines}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>${row.billed.toFixed(2)}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#7c3aed' }}>${row.allowed.toFixed(2)}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>${row.paid.toFixed(2)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: barColor }}>{row.collectionPct}%</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{row.allowedPct}%</td>
                      <td style={{ padding: '10px 12px', minWidth: 120 }}>
                        <div style={{ height: 10, background: '#e5e7eb', borderRadius: 5, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: row.collectionPct + '%', background: barColor, borderRadius: 5, transition: 'width 0.5s' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Claim-level variance */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>Claim-Level Variance Detail</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Claim ID', 'Patient', 'CPT', 'Billed', 'Allowed', 'Paid', 'Patient Resp.', 'CARC', 'Variance $', 'Variance %'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.flatMap(era => era.claimLines.map(cl => ({ ...cl, eraId: era.id }))).map((cl, i) => {
                  const variance = cl.billed - cl.paid;
                  const variancePct = cl.billed > 0 ? ((variance / cl.billed) * 100).toFixed(1) : 0;
                  const vColor = variancePct > 50 ? '#dc2626' : variancePct > 30 ? '#d97706' : '#374151';
                  return (
                    <tr key={cl.claimId + '-' + i} style={{ borderBottom: '1px solid var(--border)', background: cl.status === 'Denied' ? '#fff7f7' : i % 2 === 1 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: '#1d4ed8', fontWeight: 700 }}>{cl.claimId}</td>
                      <td style={{ padding: '8px 12px', fontSize: 11 }}>{cl.patient}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{cl.cpt}</td>
                      <td style={{ padding: '8px 12px' }}>${cl.billed.toFixed(2)}</td>
                      <td style={{ padding: '8px 12px', color: '#7c3aed' }}>${cl.allowed.toFixed(2)}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: cl.paid > 0 ? '#059669' : '#dc2626' }}>${cl.paid.toFixed(2)}</td>
                      <td style={{ padding: '8px 12px', color: '#d97706' }}>${(cl.deductible + cl.coinsurance + cl.copay).toFixed(2)}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{cl.adjCode}-{cl.carc}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: vColor }}>${variance.toFixed(2)}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: vColor }}>{variancePct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Polling log */}
          {pollLog.length > 0 && (
            <div style={{ background: '#0f172a', borderRadius: 12, padding: 16 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', marginBottom: 8, fontWeight: 700 }}>LISTENER ACTIVITY LOG</div>
              {pollLog.map((entry, i) => (
                <div key={i} style={{ fontFamily: 'monospace', fontSize: 11, color: i === 0 ? '#34d399' : '#64748b', marginBottom: 2 }}>[{entry.ts}] {entry.msg}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'carc' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: 14 }}>CARC — Claim Adjustment Reason Codes</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Code</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Description</th>
              </tr></thead>
              <tbody>
                {Object.entries(CARC).map(([code, desc], i) => (
                  <tr key={code} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontWeight: 800, color: '#7c3aed', fontSize: 13 }}>{code}</td>
                    <td style={{ padding: '9px 14px', color: '#374151' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: 14 }}>RARC — Remittance Advice Remark Codes</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Code</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Description</th>
              </tr></thead>
              <tbody>
                {Object.entries(RARC).map(([code, desc], i) => (
                  <tr key={code} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontWeight: 800, color: '#1d4ed8', fontSize: 13 }}>{code}</td>
                    <td style={{ padding: '9px 14px', color: '#374151' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>⚙️ 835 Listener Configuration</div>
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { label: 'Poll Interval', value: '15 minutes', type: 'select', options: ['5 minutes', '15 minutes', '30 minutes', '1 hour'] },
              { label: 'Auto-Post Threshold', value: 'Post if variance < $5.00', type: 'select', options: ['Always auto-post', 'Post if variance < $1.00', 'Post if variance < $5.00', 'Manual post only'] },
              { label: 'Denial Auto-Alert', value: 'Immediate', type: 'select', options: ['Immediate', '15 minutes', '1 hour', 'Daily digest'] },
              { label: 'ERA File Retention', value: '7 years (HIPAA)', type: 'select', options: ['1 year', '3 years', '7 years (HIPAA)', '10 years'] },
            ].map(c => (
              <div key={c.label} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <label style={{ fontWeight: 700, fontSize: 12 }}>{c.label}</label>
                <select className="form-input" style={{ maxWidth: 300, fontSize: 12 }}>
                  {c.options.map(o => <option key={o} selected={o === c.value}>{o}</option>)}
                </select>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => showToast('Listener configuration saved.')} className="btn btn-primary">Save Configuration</button>
            </div>
          </div>
        </div>
      )}

      {/* ERA Detail Modal */}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 820, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ background: selected.status === 'Exception' ? 'linear-gradient(135deg, #7f1d1d, #991b1b)' : 'linear-gradient(135deg, #064e3b, #065f46)', color: '#fff', margin: -20, padding: '16px 20px', marginBottom: 0, borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>835 ERA — {selected.payer}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{selected.checkNum} · {selected.checkDate} · {fmt$(selected.totalPaid)}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <StatusBadge s={selected.status} />
                <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 18 }}>×</button>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              {[['lines','📋 Claim Lines'], ['raw','📄 Raw 835 EDI']].map(([t, l]) => (
                <button key={t} onClick={() => setDetailTab(t)} style={{ flex: 1, padding: '10px', border: 'none', background: detailTab === t ? '#eff6ff' : 'transparent', color: detailTab === t ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: detailTab === t ? 700 : 500, fontSize: 12, cursor: 'pointer', borderBottom: '2px solid ' + (detailTab === t ? 'var(--primary)' : 'transparent') }}>
                  {l}
                </button>
              ))}
            </div>

            <div className="modal-body">
              {detailTab === 'lines' && (
                <div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                      {['Claim ID', 'Patient', 'DOS', 'CPT', 'Billed', 'Allowed', 'Paid', 'Deductible', 'Co-ins', 'CARC', 'RARC', 'Status'].map(h => (
                        <th key={h} style={{ padding: '9px 10px', textAlign: ['Billed','Allowed','Paid','Deductible','Co-ins'].includes(h) ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {selected.claimLines.map((cl, i) => (
                        <tr key={cl.claimId} style={{ borderBottom: '1px solid var(--border)', background: cl.status === 'Denied' ? '#fff7f7' : i % 2 ? '#fafafa' : '#fff' }}>
                          <td style={{ padding: '9px 10px', fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}>{cl.claimId}</td>
                          <td style={{ padding: '9px 10px', fontSize: 11 }}>{cl.patient}</td>
                          <td style={{ padding: '9px 10px', fontSize: 11, whiteSpace: 'nowrap' }}>{cl.dos}</td>
                          <td style={{ padding: '9px 10px' }}><span style={{ fontFamily: 'monospace', fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>{cl.cpt}</span></td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600 }}>{fmt$(cl.billed)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right' }}>{fmt$(cl.allowed)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: cl.paid > 0 ? '#059669' : '#dc2626' }}>{fmt$(cl.paid)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: cl.deductible > 0 ? '#d97706' : 'var(--text-muted)' }}>{fmt$(cl.deductible)}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', color: cl.coinsurance > 0 ? '#7c3aed' : 'var(--text-muted)' }}>{fmt$(cl.coinsurance)}</td>
                          <td style={{ padding: '9px 10px' }}><span title={CARC[cl.carc]} style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11, color: '#7c3aed', cursor: 'help' }}>{cl.adjCode}-{cl.carc}</span></td>
                          <td style={{ padding: '9px 10px' }}>{cl.rarc ? <span title={RARC[cl.rarc]} style={{ fontFamily: 'monospace', fontSize: 11, color: '#1d4ed8', cursor: 'help' }}>{cl.rarc}</span> : '—'}</td>
                          <td style={{ padding: '9px 10px' }}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: cl.status === 'Paid' ? '#d1fae5' : cl.status === 'Denied' ? '#fee2e2' : '#fef3c7', color: cl.status === 'Paid' ? '#065f46' : cl.status === 'Denied' ? '#991b1b' : '#92400e' }}>{cl.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {[
                      ['Total Billed', fmt$(selected.claimLines.reduce((s,c) => s+c.billed,0)), '#374151'],
                      ['Total Paid', fmt$(selected.totalPaid), '#059669'],
                      ['Contractual Adj.', fmt$(selected.claimLines.reduce((s,c) => s+c.billed-c.paid,0)), '#7c3aed'],
                    ].map(([l,v,col]) => (
                      <div key={l} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{l}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: col }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailTab === 'raw' && (
                <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 10, fontSize: 11, lineHeight: 1.8, overflowX: 'auto', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 480, overflowY: 'auto', margin: 0 }}>
                  {build835(selected)}
                </pre>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { showToast('ERA payments posted to claim ledger.'); setSelected(null); }}>💰 Post Payments</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
