import React, { useState, useMemo } from 'react';

// ─── Reference Data ────────────────────────────────────────────────────────────
// Contracted rates per payer per CPT (from PAYER_ALLOWED in ClaimsManagement)
const CONTRACTED = {
  'Blue Cross Blue Shield': { '99213': 96, '99214': 148, '99215': 200, '90837': 140, '90792': 280, '90834': 112, '90832': 84, '96127': 24, '90833': 76 },
  'Aetna':                  { '99213': 102,'99214': 157, '99215': 212, '90837': 152, '90792': 295, '90834': 120, '90832': 89, '96127': 26, '90833': 80 },
  'UnitedHealthcare':       { '99213': 98, '99214': 152, '99215': 205, '90837': 144, '90792': 288, '90834': 116, '90832': 86, '96127': 25, '90833': 78 },
  'Cigna':                  { '99213': 100,'99214': 155, '99215': 208, '90837': 148, '90792': 292, '90834': 118, '90832': 88, '96127': 25, '90833': 79 },
  'Anthem':                 { '99213': 94, '99214': 145, '99215': 196, '90837': 138, '90792': 275, '90834': 110, '90832': 82, '96127': 23, '90833': 74 },
  'Medicare Part B':        { '99213': 88, '99214': 135, '99215': 185, '90837': 128, '90792': 255, '90834': 102, '90832': 76, '96127': 21, '90833': 68 },
};

const CPT_DESC = {
  '99213': 'Office Visit, Low Complexity',
  '99214': 'Office Visit, Moderate Complexity',
  '99215': 'Office Visit, High Complexity',
  '90792': 'Psychiatric Eval w/ Medical Services',
  '90791': 'Psychiatric Diagnostic Evaluation',
  '90837': 'Psychotherapy, 60 min',
  '90834': 'Psychotherapy, 45 min',
  '90832': 'Psychotherapy, 30 min',
  '90833': 'Psychotherapy Add-On',
  '90853': 'Group Psychotherapy',
  '96127': 'Brief Behavioral Assessment',
};

// ─── Actual Paid Claim Data ───────────────────────────────────────────────────
// Sourced from SEED_CLAIMS — paid claims with insurance_payment, cpt_codes, payer
const PAID_CLAIMS = [
  { id: 'clm-001', payer: 'Blue Cross Blue Shield', cpt: '99214', contractedRate: 148, actualPaid: 140, charged: 185, dos: '2026-03-12', provider: 'Martinez' },
  { id: 'clm-002', payer: 'Blue Cross Blue Shield', cpt: '99214', contractedRate: 148, actualPaid: 140, charged: 185, dos: '2026-02-14', provider: 'Martinez' },
  { id: 'clm-003', payer: 'Aetna',                  cpt: '99215', contractedRate: 212, actualPaid: 210, charged: 250, dos: '2026-03-25', provider: 'Martinez' },
  { id: 'clm-004', payer: 'Cigna',                  cpt: '99214', contractedRate: 155, actualPaid: 155, charged: 185, dos: '2026-03-15', provider: 'Johnson' },
  { id: 'clm-006a',payer: 'Blue Cross Blue Shield', cpt: '90792', contractedRate: 280, actualPaid: 140, charged: 350, dos: '2025-11-03', provider: 'Martinez' },
  { id: 'clm-006b',payer: 'Blue Cross Blue Shield', cpt: '96127', contractedRate: 24,  actualPaid: 24,  charged: 30,  dos: '2025-11-03', provider: 'Martinez' },
  { id: 'clm-era5a',payer: 'Medicare Part B',       cpt: '90792', contractedRate: 255, actualPaid: 204, charged: 350, dos: '2026-05-05', provider: 'Martinez' },
  // Additional historical data for richer variance analysis
  { id: 'hist-001', payer: 'Blue Cross Blue Shield', cpt: '99214', contractedRate: 148, actualPaid: 148, charged: 185, dos: '2026-01-10', provider: 'Martinez' },
  { id: 'hist-002', payer: 'Aetna',                  cpt: '90837', contractedRate: 152, actualPaid: 152, charged: 175, dos: '2026-01-14', provider: 'Tanner' },
  { id: 'hist-003', payer: 'UnitedHealthcare',        cpt: '90837', contractedRate: 144, actualPaid: 144, charged: 175, dos: '2026-01-22', provider: 'Tanner' },
  { id: 'hist-004', payer: 'Anthem',                  cpt: '99213', contractedRate: 94,  actualPaid: 80,  charged: 120, dos: '2026-02-01', provider: 'Johnson' },
  { id: 'hist-005', payer: 'Anthem',                  cpt: '99214', contractedRate: 145, actualPaid: 120, charged: 185, dos: '2026-02-08', provider: 'Johnson' },
  { id: 'hist-006', payer: 'Medicare Part B',          cpt: '99214', contractedRate: 135, actualPaid: 108, charged: 185, dos: '2026-02-15', provider: 'Martinez' },
  { id: 'hist-007', payer: 'Medicare Part B',          cpt: '90837', contractedRate: 128, actualPaid: 102, charged: 175, dos: '2026-03-03', provider: 'Tanner' },
  { id: 'hist-008', payer: 'Blue Cross Blue Shield',   cpt: '99213', contractedRate: 96,  actualPaid: 96,  charged: 120, dos: '2026-03-10', provider: 'Martinez' },
  { id: 'hist-009', payer: 'Cigna',                    cpt: '90837', contractedRate: 148, actualPaid: 148, charged: 175, dos: '2026-03-18', provider: 'Tanner' },
  { id: 'hist-010', payer: 'Aetna',                    cpt: '99214', contractedRate: 157, actualPaid: 157, charged: 185, dos: '2026-04-02', provider: 'Martinez' },
  { id: 'hist-011', payer: 'Anthem',                   cpt: '90837', contractedRate: 138, actualPaid: 100, charged: 175, dos: '2026-04-10', provider: 'Tanner' },
  { id: 'hist-012', payer: 'UnitedHealthcare',          cpt: '99214', contractedRate: 152, actualPaid: 152, charged: 185, dos: '2026-04-22', provider: 'Johnson' },
  { id: 'hist-013', payer: 'Medicare Part B',           cpt: '99213', contractedRate: 88,  actualPaid: 70,  charged: 120, dos: '2026-05-01', provider: 'Martinez' },
  { id: 'hist-014', payer: 'Blue Cross Blue Shield',    cpt: '90837', contractedRate: 140, actualPaid: 140, charged: 175, dos: '2026-05-08', provider: 'Tanner' },
  { id: 'hist-015', payer: 'Cigna',                     cpt: '99215', contractedRate: 208, actualPaid: 200, charged: 250, dos: '2026-05-15', provider: 'Johnson' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt$ = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtPct = (n) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';

const PAYER_COLORS = {
  'Blue Cross Blue Shield': '#1e40af',
  'Aetna':                  '#c2410c',
  'UnitedHealthcare':       '#15803d',
  'Cigna':                  '#0e7490',
  'Anthem':                 '#6d28d9',
  'Medicare Part B':        '#b91c1c',
};

// ─── SVG Bar Chart ─────────────────────────────────────────────────────────────
function VarianceBarChart({ data }) {
  const maxAbs = Math.max(...data.map(d => Math.abs(d.variance)), 1);
  const barW = 32;
  const gap  = 14;
  const chartW = data.length * (barW + gap) + gap;
  const chartH = 120;
  const baseline = chartH / 2;
  const scale = (baseline - 16) / maxAbs;

  return (
    <svg width={chartW} height={chartH + 30} style={{ overflow: 'visible', display: 'block' }}>
      {/* Baseline */}
      <line x1={0} y1={baseline} x2={chartW} y2={baseline} stroke="#e2e8f0" strokeWidth={1} />
      {data.map((d, i) => {
        const x = gap + i * (barW + gap);
        const barH = Math.abs(d.variance) * scale;
        const isNeg = d.variance < 0;
        const y = isNeg ? baseline : baseline - barH;
        const color = isNeg ? '#ef4444' : '#10b981';
        return (
          <g key={d.payer}>
            <rect x={x} y={y} width={barW} height={barH || 2} fill={color} rx={3} opacity={0.85} />
            <text x={x + barW / 2} y={isNeg ? baseline + barH + 14 : baseline - barH - 6} textAnchor="middle" fontSize={9} fill={color} fontWeight={700}>
              {d.variance >= 0 ? '+' : ''}{d.variance.toFixed(0)}
            </text>
            <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize={9} fill="#6b7280">
              {d.short}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Claim Detail Modal ────────────────────────────────────────────────────────
function ClaimListModal({ title, claims, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 680, maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3>📋 {title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid var(--border)' }}>
                {['Claim ID','Payer','CPT','DOS','Provider','Charged','Contracted','Actual Paid','Variance $','Var %'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: ['Charged','Contracted','Actual Paid','Variance $','Var %'].includes(h) ? 'right' : 'left', fontWeight: 700, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {claims.map((c, i) => {
                const variance = c.actualPaid - c.contractedRate;
                const varPct = c.contractedRate > 0 ? (variance / c.contractedRate) * 100 : 0;
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 11, color: '#1d4ed8', fontWeight: 700 }}>{c.id}</td>
                    <td style={{ padding: '8px 10px', fontSize: 11 }}>{c.payer}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', padding: '2px 5px', borderRadius: 3, fontSize: 11 }}>{c.cpt}</span>
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDate(c.dos)}</td>
                    <td style={{ padding: '8px 10px', fontSize: 11 }}>{c.provider}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{fmt$(c.charged)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0284c7', fontWeight: 600 }}>{fmt$(c.contractedRate)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>{fmt$(c.actualPaid)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: variance < 0 ? '#dc2626' : variance > 0 ? '#059669' : '#6b7280' }}>{fmt$(variance)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: varPct < 0 ? '#dc2626' : varPct > 0 ? '#059669' : '#6b7280' }}>{fmtPct(varPct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ContractVarianceReport() {
  const [viewType, setViewType] = useState('payer'); // 'payer' | 'cpt' | 'claims'
  const [filterPayer, setFilterPayer] = useState('All');
  const [filterCpt, setFilterCpt] = useState('All');
  const [sortBy, setSortBy] = useState('variance_asc'); // variance_asc | variance_desc | pct_asc
  const [drillClaims, setDrillClaims] = useState(null);

  const payers = [...new Set(PAID_CLAIMS.map(c => c.payer))].sort();
  const cpts   = [...new Set(PAID_CLAIMS.map(c => c.cpt))].sort();

  // ── Summary stats ─────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalContracted = PAID_CLAIMS.reduce((s, c) => s + c.contractedRate, 0);
    const totalActual     = PAID_CLAIMS.reduce((s, c) => s + c.actualPaid, 0);
    const totalCharged    = PAID_CLAIMS.reduce((s, c) => s + c.charged, 0);
    const variance        = totalActual - totalContracted;
    const varPct          = totalContracted > 0 ? (variance / totalContracted) * 100 : 0;
    const collectionRate  = totalCharged > 0 ? (totalActual / totalCharged) * 100 : 0;
    const underpaid       = PAID_CLAIMS.filter(c => c.actualPaid < c.contractedRate);
    const underpaidAmt    = underpaid.reduce((s, c) => s + (c.contractedRate - c.actualPaid), 0);
    return { totalContracted, totalActual, totalCharged, variance, varPct, collectionRate, underpaid: underpaid.length, underpaidAmt };
  }, []);

  // ── Per-Payer variance ────────────────────────────────────────────────────
  const payerVariance = useMemo(() => {
    const map = {};
    PAID_CLAIMS.forEach(c => {
      if (!map[c.payer]) map[c.payer] = { payer: c.payer, totalContracted: 0, totalActual: 0, totalCharged: 0, claims: [] };
      map[c.payer].totalContracted += c.contractedRate;
      map[c.payer].totalActual     += c.actualPaid;
      map[c.payer].totalCharged    += c.charged;
      map[c.payer].claims.push(c);
    });
    return Object.values(map).map(r => ({
      ...r,
      variance: r.totalActual - r.totalContracted,
      varPct: r.totalContracted > 0 ? ((r.totalActual - r.totalContracted) / r.totalContracted) * 100 : 0,
      collectionRate: r.totalCharged > 0 ? (r.totalActual / r.totalCharged) * 100 : 0,
      claimCount: r.claims.length,
    })).sort((a, b) => a.variance - b.variance);
  }, []);

  // ── Per-CPT variance ──────────────────────────────────────────────────────
  const cptVariance = useMemo(() => {
    const filtered = PAID_CLAIMS.filter(c => filterPayer === 'All' || c.payer === filterPayer);
    const map = {};
    filtered.forEach(c => {
      if (!map[c.cpt]) map[c.cpt] = { cpt: c.cpt, totalContracted: 0, totalActual: 0, totalCharged: 0, claims: [] };
      map[c.cpt].totalContracted += c.contractedRate;
      map[c.cpt].totalActual     += c.actualPaid;
      map[c.cpt].totalCharged    += c.charged;
      map[c.cpt].claims.push(c);
    });
    return Object.values(map).map(r => ({
      ...r,
      variance: r.totalActual - r.totalContracted,
      varPct: r.totalContracted > 0 ? ((r.totalActual - r.totalContracted) / r.totalContracted) * 100 : 0,
      avgVariancePerClaim: r.claims.length > 0 ? (r.totalActual - r.totalContracted) / r.claims.length : 0,
      claimCount: r.claims.length,
    })).sort((a, b) => a.variance - b.variance);
  }, [filterPayer]);

  // ── Filtered claim list ───────────────────────────────────────────────────
  const filteredClaims = useMemo(() => PAID_CLAIMS.filter(c => {
    if (filterPayer !== 'All' && c.payer !== filterPayer) return false;
    if (filterCpt   !== 'All' && c.cpt   !== filterCpt)   return false;
    return true;
  }), [filterPayer, filterCpt]);

  // ── Chart data ────────────────────────────────────────────────────────────
  const chartData = payerVariance.map(r => ({
    payer: r.payer,
    short: r.payer.split(' ').map(w => w[0]).join('').slice(0, 4),
    variance: r.variance,
  }));

  // ── Variance color ────────────────────────────────────────────────────────
  const varColor = (v) => v < -20 ? '#dc2626' : v < 0 ? '#d97706' : v === 0 ? '#6b7280' : '#059669';
  const varBg    = (v) => v < -20 ? '#fef2f2' : v < 0 ? '#fef3c7' : v === 0 ? '#f3f4f6' : '#f0fdf4';

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>📊 Contract Variance Report</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Compare contracted rates vs actual payments received — identify underpayments and payer compliance</p>
        </div>
        <button className="btn btn-secondary" style={{ fontSize: 12 }}
          onClick={() => {
            const rows = [['Payer','CPT','Contracted','Actual Paid','Variance $','Variance %','DOS','Provider']];
            PAID_CLAIMS.forEach(c => {
              const v = c.actualPaid - c.contractedRate;
              const vp = c.contractedRate > 0 ? ((v / c.contractedRate) * 100).toFixed(1) : '0';
              rows.push([c.payer, c.cpt, c.contractedRate, c.actualPaid, v.toFixed(2), vp, c.dos, c.provider]);
            });
            const csv = rows.map(r => r.join(',')).join('\n');
            const a = document.createElement('a');
            a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
            a.download = 'contract-variance-' + new Date().toISOString().slice(0, 10) + '.csv';
            a.click();
          }}>
          ⬇️ Export CSV
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total Contracted', value: fmt$(summary.totalContracted), accent: '#3b82f6', sub: PAID_CLAIMS.length + ' claims' },
          { label: 'Total Actual Paid', value: fmt$(summary.totalActual), accent: '#10b981' },
          { label: 'Net Variance', value: fmt$(summary.variance), accent: summary.variance < 0 ? '#ef4444' : '#10b981', sub: fmtPct(summary.varPct) },
          { label: 'Underpaid Claims', value: summary.underpaid, accent: '#f59e0b', sub: fmt$(summary.underpaidAmt) + ' gap' },
          { label: 'Collection Rate', value: summary.collectionRate.toFixed(1) + '%', accent: '#6366f1', sub: 'of billed charges' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '13px 15px', borderLeft: '4px solid ' + s.accent }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', marginBottom: '1.25rem' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Variance by Payer (Actual − Contracted)</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          Green = overpaid vs contract · Red = underpaid vs contract
        </div>
        <div style={{ overflowX: 'auto' }}>
          <VarianceBarChart data={chartData} />
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
          {chartData.map(d => (
            <div key={d.payer} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: d.variance < 0 ? '#ef4444' : '#10b981', flexShrink: 0 }} />
              <span style={{ color: '#374151' }}>{d.short} = {d.payer.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* View Toggle + Filters */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {[['payer','By Payer'],['cpt','By CPT Code'],['claims','All Claims']].map(([v, l]) => (
            <button key={v} onClick={() => setViewType(v)}
              style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)', background: viewType === v ? 'var(--primary)' : '#fff', color: viewType === v ? '#fff' : 'var(--text-secondary)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              {l}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            {viewType !== 'payer' && (
              <select value={filterPayer} onChange={e => setFilterPayer(e.target.value)} className="form-input" style={{ fontSize: 12, height: 36 }}>
                <option value="All">All Payers</option>
                {payers.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            {viewType === 'claims' && (
              <select value={filterCpt} onChange={e => setFilterCpt(e.target.value)} className="form-input" style={{ fontSize: 12, height: 36 }}>
                <option value="All">All CPTs</option>
                {cpts.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ── By Payer View ─────────────────────────────────────────────────── */}
      {viewType === 'payer' && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
            Payer Variance Summary ({payerVariance.length} payers)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: '#f8fafc' }}>
                  {['Payer','Claims','Total Contracted','Total Actual','Variance $','Variance %','Collection Rate','Underpayment Risk','Action'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: ['Total Contracted','Total Actual','Variance $','Variance %','Collection Rate'].includes(h) ? 'right' : 'left', fontWeight: 700, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payerVariance.map((row, i) => {
                  const riskLevel = row.varPct < -10 ? 'High' : row.varPct < -3 ? 'Medium' : 'Low';
                  const riskColor = riskLevel === 'High' ? '#dc2626' : riskLevel === 'Medium' ? '#d97706' : '#059669';
                  return (
                    <tr key={row.payer} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: PAYER_COLORS[row.payer] || '#6b7280', flexShrink: 0 }} />
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{row.payer}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'center' }}>{row.claimCount}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0284c7', fontWeight: 600 }}>{fmt$(row.totalContracted)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>{fmt$(row.totalActual)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <span style={{ fontWeight: 800, color: varColor(row.variance), background: varBg(row.variance), padding: '3px 8px', borderRadius: 5 }}>
                          {row.variance >= 0 ? '+' : ''}{fmt$(row.variance)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, color: varColor(row.variance) }}>{fmtPct(row.varPct)}</span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <div style={{ width: 60, height: 6, borderRadius: 3, background: '#e5e7eb', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: Math.min(row.collectionRate, 100) + '%', background: row.collectionRate >= 80 ? '#10b981' : row.collectionRate >= 65 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: 12, color: row.collectionRate >= 80 ? '#059669' : row.collectionRate >= 65 ? '#d97706' : '#dc2626' }}>
                            {row.collectionRate.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontWeight: 700, fontSize: 11, color: riskColor, background: riskColor + '18', padding: '3px 8px', borderRadius: 5 }}>
                          {riskLevel === 'High' ? '⚠️ ' : riskLevel === 'Medium' ? '⚡ ' : '✅ '}{riskLevel}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <button onClick={() => setDrillClaims({ title: row.payer + ' — All Claims', claims: row.claims })}
                          style={{ fontSize: 10, padding: '4px 10px', borderRadius: 5, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          Drill Down ↗
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f1f5f9', borderTop: '2px solid var(--border)' }}>
                  <td colSpan={2} style={{ padding: '10px 14px', fontWeight: 800, fontSize: 12 }}>TOTAL ({PAID_CLAIMS.length} claims)</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#0284c7' }}>{fmt$(summary.totalContracted)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>{fmt$(summary.totalActual)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: varColor(summary.variance) }}>{summary.variance >= 0 ? '+' : ''}{fmt$(summary.variance)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: varColor(summary.variance) }}>{fmtPct(summary.varPct)}</td>
                  <td colSpan={3} style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>
                    Overall Collection: {summary.collectionRate.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── By CPT View ────────────────────────────────────────────────────── */}
      {viewType === 'cpt' && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
            CPT Code Variance {filterPayer !== 'All' ? '— ' + filterPayer : '(All Payers)'}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: '#f8fafc' }}>
                  {['CPT','Description','Claims','Total Contracted','Total Actual','Net Variance','Avg Var/Claim','Variance %','Trend'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: ['Total Contracted','Total Actual','Net Variance','Avg Var/Claim','Variance %'].includes(h) ? 'right' : 'left', fontWeight: 700, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cptVariance.map((row, i) => (
                  <tr key={row.cpt} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <code style={{ fontWeight: 800, fontSize: 13, background: '#eff6ff', color: '#1d4ed8', padding: '3px 7px', borderRadius: 4 }}>{row.cpt}</code>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', maxWidth: 220 }}>{CPT_DESC[row.cpt] || '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>{row.claimCount}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0284c7', fontWeight: 600 }}>{fmt$(row.totalContracted)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>{fmt$(row.totalActual)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <span style={{ fontWeight: 800, color: varColor(row.variance), background: varBg(row.variance), padding: '3px 8px', borderRadius: 5 }}>
                        {row.variance >= 0 ? '+' : ''}{fmt$(row.variance)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: varColor(row.avgVariancePerClaim) }}>
                      {row.avgVariancePerClaim >= 0 ? '+' : ''}{fmt$(row.avgVariancePerClaim)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: varColor(row.variance) }}>
                      {fmtPct(row.varPct)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {/* Mini sparkline dots showing variance direction */}
                      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                        {row.claims.slice(-6).map((c, j) => {
                          const v = c.actualPaid - c.contractedRate;
                          return <span key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: v < 0 ? '#ef4444' : v > 0 ? '#10b981' : '#d1d5db' }} title={c.dos + ': ' + fmt$(v)} />;
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── All Claims View ────────────────────────────────────────────────── */}
      {viewType === 'claims' && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
            Claim-Level Variance ({filteredClaims.length} claims)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: '#f8fafc' }}>
                  {['ID','Payer','CPT','DOS','Provider','Charged','Contracted','Actual Paid','Variance $','Var %','Status'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: ['Charged','Contracted','Actual Paid','Variance $','Var %'].includes(h) ? 'right' : 'left', fontWeight: 700, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((c, i) => {
                  const variance = c.actualPaid - c.contractedRate;
                  const varPct   = c.contractedRate > 0 ? (variance / c.contractedRate) * 100 : 0;
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', background: variance < -10 ? '#fff7f7' : i % 2 === 1 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 10, color: '#64748b', fontWeight: 600 }}>{c.id}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: PAYER_COLORS[c.payer] || '#6b7280', flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: 600 }}>{c.payer}</span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <code style={{ fontWeight: 800, background: '#eff6ff', color: '#1d4ed8', padding: '2px 5px', borderRadius: 3, fontSize: 11 }}>{c.cpt}</code>
                      </td>
                      <td style={{ padding: '9px 12px', fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDate(c.dos)}</td>
                      <td style={{ padding: '9px 12px', fontSize: 11 }}>{c.provider}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>{fmt$(c.charged)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#0284c7', fontWeight: 600 }}>{fmt$(c.contractedRate)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>{fmt$(c.actualPaid)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                        <span style={{ fontWeight: 800, color: varColor(variance), background: varBg(variance), padding: '2px 7px', borderRadius: 4 }}>
                          {variance >= 0 ? '+' : ''}{fmt$(variance)}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: varColor(variance) }}>{fmtPct(varPct)}</td>
                      <td style={{ padding: '9px 12px' }}>
                        {variance < -15 ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '2px 6px', borderRadius: 4 }}>Underpaid</span>
                        ) : variance === 0 ? (
                          <span style={{ fontSize: 10, color: '#6b7280', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>On Contract</span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#f0fdf4', padding: '2px 6px', borderRadius: 4 }}>On Contract</span>
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

      {/* Underpayment Alert Box */}
      {summary.underpaidAmt > 100 && (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px', marginTop: 16 }}>
          <div style={{ fontWeight: 800, color: '#92400e', fontSize: 13, marginBottom: 6 }}>
            💡 Underpayment Recovery Opportunity
          </div>
          <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>
            Based on contracted rates, <strong>{summary.underpaid} claims</strong> were paid below the contracted amount,
            representing a <strong>{fmt$(summary.underpaidAmt)}</strong> recovery opportunity.
            Consider filing underpayment disputes with {payerVariance.filter(p => p.varPct < -3).map(p => p.payer.split(' ')[0]).join(', ')}.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setDrillClaims({ title: 'Underpaid Claims', claims: PAID_CLAIMS.filter(c => c.actualPaid < c.contractedRate) })}>
              View Underpaid Claims
            </button>
          </div>
        </div>
      )}

      {drillClaims && <ClaimListModal title={drillClaims.title} claims={drillClaims.claims} onClose={() => setDrillClaims(null)} />}
    </div>
  );
}
