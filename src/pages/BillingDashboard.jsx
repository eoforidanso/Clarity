import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DemoGuard, { DemoDisabled } from '../demo/DemoGuard';

// ─── Claims Timeline Mock Data ────────────────────────────────────────────────
const CLAIM_STAGES = [
  { id: 'generated',    label: 'Generated',    color: '#6b7280', bg: '#f9fafb', icon: '📄' },
  { id: 'scrubbed',     label: 'Scrubbed',     color: '#7c3aed', bg: '#f5f3ff', icon: '🔍' },
  { id: 'submitted',    label: 'Submitted',    color: '#2563eb', bg: '#eff6ff', icon: '📤' },
  { id: 'acknowledged', label: 'Acknowledged', color: '#0369a1', bg: '#e0f2fe', icon: '✉️' },
  { id: 'era_posted',   label: 'ERA Posted',   color: '#0891b2', bg: '#ecfeff', icon: '💳' },
  { id: 'paid',         label: 'Paid',         color: '#059669', bg: '#f0fdf4', icon: '✅' },
  { id: 'denied',       label: 'Denied',       color: '#dc2626', bg: '#fef2f2', icon: '❌' },
];

const TIMELINE_CLAIMS = [
  { id: 'CLM-2401', patient: 'Johnson, M.', payer: 'BCBS', cpt: '90837', amount: 185, stage: 'paid',         age: 12, scrubScore: 98 },
  { id: 'CLM-2402', patient: 'Williams, S.', payer: 'Aetna', cpt: '99213', amount: 142, stage: 'paid',        age: 15, scrubScore: 95 },
  { id: 'CLM-2403', patient: 'Brown, T.', payer: 'UHC', cpt: '90834', amount: 165, stage: 'era_posted',      age: 8,  scrubScore: 100 },
  { id: 'CLM-2404', patient: 'Davis, R.', payer: 'Medicare', cpt: '99214', amount: 198, stage: 'era_posted',  age: 10, scrubScore: 97 },
  { id: 'CLM-2405', patient: 'Garcia, A.', payer: 'Cigna', cpt: '90837', amount: 185, stage: 'acknowledged',  age: 5,  scrubScore: 99 },
  { id: 'CLM-2406', patient: 'Martinez, L.', payer: 'BCBS', cpt: '90847', amount: 220, stage: 'acknowledged', age: 6,  scrubScore: 96 },
  { id: 'CLM-2407', patient: 'Wilson, K.', payer: 'Aetna', cpt: '99215', amount: 267, stage: 'submitted',     age: 3,  scrubScore: 100 },
  { id: 'CLM-2408', patient: 'Moore, J.', payer: 'UHC', cpt: '90791', amount: 375, stage: 'submitted',       age: 2,  scrubScore: 94 },
  { id: 'CLM-2409', patient: 'Taylor, P.', payer: 'Medicare', cpt: '99213', amount: 142, stage: 'scrubbed',   age: 1,  scrubScore: 88 },
  { id: 'CLM-2410', patient: 'Anderson, C.', payer: 'Cigna', cpt: '90837', amount: 185, stage: 'scrubbed',    age: 1,  scrubScore: 72 },
  { id: 'CLM-2411', patient: 'Thomas, D.', payer: 'BCBS', cpt: '90838', amount: 305, stage: 'generated',      age: 0,  scrubScore: null },
  { id: 'CLM-2412', patient: 'Jackson, M.', payer: 'Aetna', cpt: '99214', amount: 198, stage: 'generated',   age: 0,  scrubScore: null },
  { id: 'CLM-2413', patient: 'White, B.', payer: 'UHC', cpt: '90837', amount: 185, stage: 'denied',           age: 22, scrubScore: 78 },
  { id: 'CLM-2414', patient: 'Harris, N.', payer: 'BCBS', cpt: '99215', amount: 267, stage: 'denied',         age: 30, scrubScore: 65 },
];

const ERA_ACTIVITY = [
  { id: 'ERA-835-001', payer: 'BCBS',    date: '2025-05-20', claims: 42, paid: 38, adjusted: 3, denied: 1, total: 7840, status: 'Posted' },
  { id: 'ERA-835-002', payer: 'Aetna',   date: '2025-05-19', claims: 31, paid: 28, adjusted: 2, denied: 1, total: 5920, status: 'Posted' },
  { id: 'ERA-835-003', payer: 'UHC',     date: '2025-05-18', claims: 24, paid: 21, adjusted: 2, denied: 1, total: 4380, status: 'Posted' },
  { id: 'ERA-835-004', payer: 'Medicare',date: '2025-05-17', claims: 18, paid: 17, adjusted: 1, denied: 0, total: 3560, status: 'Posted' },
  { id: 'ERA-835-005', payer: 'Cigna',   date: '2025-05-16', claims: 12, paid: 10, adjusted: 1, denied: 1, total: 2180, status: 'Pending' },
];

const SCRUBBER_STATS = [
  { label: 'Clean Claims',      value: 187, pct: 76, color: '#059669', bg: '#f0fdf4' },
  { label: 'Warnings (Minor)', value: 38,  pct: 15, color: '#d97706', bg: '#fef3c7' },
  { label: 'Errors (Major)',   value: 18,  pct: 7,  color: '#ef4444', bg: '#fef2f2' },
  { label: 'Held for Review',  value: 4,   pct: 2,  color: '#7c3aed', bg: '#f5f3ff' },
];

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MONTHLY_TRENDS = [
  { month: 'Dec', charges: 118500, collections: 103200, denialRate: 4.2, cashflow: 98400 },
  { month: 'Jan', charges: 124200, collections: 108100, denialRate: 3.8, cashflow: 103800 },
  { month: 'Feb', charges: 131800, collections: 115400, denialRate: 4.5, cashflow: 109600 },
  { month: 'Mar', charges: 142800, collections: 124300, denialRate: 5.1, cashflow: 118200 },
  { month: 'Apr', charges: 138600, collections: 120700, denialRate: 4.8, cashflow: 115400 },
  { month: 'May', charges: 145200, collections: 126400, denialRate: 3.9, cashflow: 120800 },
];

const FORECAST = [
  { month: 'Jun', projected: 149000, lower: 139000, upper: 159000 },
  { month: 'Jul', projected: 153500, lower: 142000, upper: 165000 },
  { month: 'Aug', projected: 151000, lower: 139500, upper: 162500 },
];

const AR_AGING = [
  { bucket: '0–30 days',  amount: 45200, count: 98,  color: '#10b981', pct: 44 },
  { bucket: '31–60 days', amount: 28700, count: 62,  color: '#f59e0b', pct: 28 },
  { bucket: '61–90 days', amount: 16400, count: 35,  color: '#f97316', pct: 16 },
  { bucket: '90+ days',   amount: 12300, count: 28,  color: '#ef4444', pct: 12 },
];

const PAYER_MIX = [
  { payer: 'Blue Cross Blue Shield', percent: 32, amount: 46500, color: '#1d4ed8' },
  { payer: 'Aetna',                  percent: 24, amount: 34900, color: '#c2410c' },
  { payer: 'UnitedHealthcare',       percent: 18, amount: 26200, color: '#15803d' },
  { payer: 'Medicare Part B',        percent: 14, amount: 20300, color: '#b91c1c' },
  { payer: 'Cigna',                  percent: 8,  amount: 11600, color: '#0e7490' },
  { payer: 'Self-Pay',               percent: 4,  amount: 5800,  color: '#6b7280' },
];

const PAYER_PERFORMANCE = [
  { payer: 'Blue Cross Blue Shield', avgDays: 18, denialRate: 3.2, collectionRate: 91, score: 88, trend: 'up' },
  { payer: 'UnitedHealthcare',       avgDays: 16, denialRate: 4.1, collectionRate: 92, score: 85, trend: 'stable' },
  { payer: 'Medicare Part B',        avgDays: 28, denialRate: 6.5, collectionRate: 94, score: 82, trend: 'up' },
  { payer: 'Aetna',                  avgDays: 22, denialRate: 5.8, collectionRate: 87, score: 78, trend: 'down' },
  { payer: 'Cigna',                  avgDays: 25, denialRate: 7.2, collectionRate: 85, score: 71, trend: 'down' },
];

const PROVIDER_STATS_MOCK = [
  { name: 'Dr. Chris L., MD',   encounters: 124, charges: 56680, collections: 49312, denials: 8 },
  { name: 'Kelly Chen, NP',      encounters: 98,  charges: 44786, collections: 37960, denials: 12 },
  { name: 'April T., LCSW',      encounters: 90,  charges: 41334, collections: 36220, denials: 5 },
  { name: 'Joseph Park, LPC',    encounters: 74,  charges: 32100, collections: 27900, denials: 9 },
];

const CODING_ACCURACY = [
  { category: 'E&M Coding',     accuracy: 94, issues: 6 },
  { category: 'Psychotherapy',  accuracy: 97, issues: 3 },
  { category: 'Modifiers',      accuracy: 88, issues: 12 },
  { category: 'ICD-10 Linkage', accuracy: 95, issues: 5 },
  { category: 'New Patient',    accuracy: 91, issues: 9 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt$ = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);
const fmtK = (n) => n >= 1000 ? (n / 1000).toFixed(0) + 'k' : String(n);

// ─── SVG Line Chart ───────────────────────────────────────────────────────────
function LineChart({ series, months, height = 180, showArea = false }) {
  const W = 560, H = height;
  const PAD = { top: 12, right: 12, bottom: 24, left: 48 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const allVals = series.flatMap(s => s.data);
  const maxVal = Math.max(...allVals) * 1.1;
  const minVal = 0;

  const xp = (i) => PAD.left + (months.length <= 1 ? cW / 2 : (i / (months.length - 1)) * cW);
  const yp = (v) => PAD.top + (1 - (v - minVal) / (maxVal - minVal)) * cH;

  const gridTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} style={{ width: '100%', height }}>
      {gridTicks.map(t => {
        const yv = minVal + t * (maxVal - minVal);
        return (
          <g key={t}>
            <line x1={PAD.left} y1={yp(yv)} x2={W - PAD.right} y2={yp(yv)} stroke="#f1f5f9" strokeWidth={1} />
            <text x={PAD.left - 6} y={yp(yv) + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{fmtK(Math.round(yv))}</text>
          </g>
        );
      })}
      {months.map((m, i) => (
        <text key={m} x={xp(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="#94a3b8">{m}</text>
      ))}
      {series.map(s => {
        const pts = s.data.map((v, i) => xp(i) + ',' + yp(v)).join(' ');
        const areaPoints = s.data.map((v, i) => xp(i) + ',' + yp(v)).join(' ') + ' ' + xp(s.data.length - 1) + ',' + (PAD.top + cH) + ' ' + xp(0) + ',' + (PAD.top + cH);
        return (
          <g key={s.name}>
            {showArea && <polygon points={areaPoints} fill={s.color} fillOpacity={0.08} />}
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {s.data.map((v, i) => (
              <circle key={i} cx={xp(i)} cy={yp(v)} r={3} fill={s.color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Mini Sparkline ───────────────────────────────────────────────────────────
function Sparkline({ data, color, width = 72, height = 28 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return x + ',' + y;
  }).join(' ');
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const lastX = width;
  const lastY = height - ((last - min) / range) * (height - 4) - 2;
  return (
    <svg width={width} height={height} style={{ overflow: 'visible', display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
    </svg>
  );
}

// ─── Horizontal Bar Chart (AR Aging) ─────────────────────────────────────────
function HBarChart({ data }) {
  const maxAmt = Math.max(...data.map(d => d.amount));
  return (
    <div>
      {data.map(d => (
        <div key={d.bucket} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
            <span style={{ fontWeight: 600, color: '#374151' }}>{d.bucket}</span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ color: '#6b7280', fontSize: 11 }}>{d.count} claims</span>
              <span style={{ fontWeight: 700, color: d.color }}>{fmt$(d.amount)}</span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>({d.pct}%)</span>
            </div>
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: 6, height: 10, overflow: 'hidden' }}>
            <div style={{ width: (d.amount / maxAmt * 100) + '%', height: '100%', background: d.color, borderRadius: 6, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Donut Chart (Payer Mix) ──────────────────────────────────────────────────
function DonutChart({ data }) {
  const SIZE = 150, r = 52, cx = 75, cy = 75;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.percent, 0);
  let cumAngle = -90;
  const segments = data.map(d => {
    const angle = (d.percent / total) * 360;
    const dashLen = (d.percent / total) * circ;
    const startAngle = cumAngle;
    cumAngle += angle;
    return { ...d, dashLen, startAngle };
  });
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={SIZE} height={SIZE} style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={22} />
        {segments.map(seg => (
          <circle key={seg.payer} cx={cx} cy={cy} r={r}
            fill="none" stroke={seg.color} strokeWidth={22}
            strokeDasharray={seg.dashLen + ' ' + (circ - seg.dashLen)}
            transform={'rotate(' + seg.startAngle + ' ' + cx + ' ' + cy + ')'}
          />
        ))}
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize={10} fontWeight="700" fill="#1e293b">Payer</text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize={10} fill="#64748b">Mix</text>
      </svg>
      <div style={{ flex: 1, minWidth: 160 }}>
        {data.map(d => (
          <div key={d.payer} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: d.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 11, flex: 1, color: '#374151' }}>{d.payer}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b' }}>{d.percent}%</span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>{fmt$(d.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Provider Bar ─────────────────────────────────────────────────────────────
function ProviderBars({ data, metric, color, label }) {
  const max = Math.max(...data.map(d => d[metric]));
  return (
    <div>
      {data.map((d, i) => (
        <div key={d.name} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
            <span style={{ fontWeight: 600 }}>{d.name}</span>
            <span style={{ fontWeight: 700, color }}>{typeof d[metric] === 'number' && d[metric] > 1000 ? fmt$(d[metric]) : d[metric]}</span>
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: 6, height: 8, overflow: 'hidden' }}>
            <div style={{ width: (d[metric] / max * 100) + '%', height: '100%', background: color, borderRadius: 6, opacity: 1 - i * 0.15, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Score Badge ──────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const color = score >= 85 ? '#059669' : score >= 75 ? '#d97706' : '#dc2626';
  const label = score >= 85 ? 'A' : score >= 75 ? 'B' : 'C';
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', width: 40, height: 40, borderRadius: '50%', border: '2px solid ' + color, justifyContent: 'center' }}>
      <span style={{ fontSize: 14, fontWeight: 800, color, lineHeight: 1 }}>{label}</span>
      <span style={{ fontSize: 8, color, lineHeight: 1 }}>{score}</span>
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BillingDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [period, setPeriod] = useState('month');
  const [selectedTab, setSelectedTab] = useState('overview');

  const multiplier = { week: 0.25, month: 1, quarter: 3, year: 12 }[period] || 1;

  const metrics = useMemo(() => {
    const gross = Math.round(145200 * multiplier);
    const payments = Math.round(gross * 0.87);
    return {
      gross_charges: gross,
      total_payments: payments,
      outstanding_balance: Math.round(gross * 0.116),
      total_claims: Math.round(312 * multiplier),
      avg_charge_per_claim: 457,
      collection_rate: 87,
      denial_rate: 4.2,
    };
  }, [period]);

  const trendData = useMemo(() => {
    return period === 'year'
      ? MONTHLY_TRENDS.map(m => ({ ...m, charges: Math.round(m.charges * 1), collections: Math.round(m.collections * 1) }))
      : MONTHLY_TRENDS.slice(-4);
  }, [period]);

  const forecastMonths = trendData.map(d => d.month).concat(FORECAST.map(f => f.month));
  const chargesWithForecast = trendData.map(d => d.charges).concat(FORECAST.map(f => f.projected));
  const collectionsWithForecast = trendData.map(d => d.collections).concat(FORECAST.map(f => Math.round(f.projected * 0.87)));

  const sparkCharges = MONTHLY_TRENDS.map(d => d.charges);
  const sparkCollections = MONTHLY_TRENDS.map(d => d.collections);
  const sparkDenials = MONTHLY_TRENDS.map(d => d.denialRate);

  const trendPct = (arr) => {
    const last = arr[arr.length - 1], prev = arr[arr.length - 2];
    const pct = ((last - prev) / prev * 100).toFixed(1);
    return { pct, up: last >= prev };
  };

  const tabs = [
    { id: 'overview',    label: '📊 Overview',        desc: 'Key metrics' },
    { id: 'trends',      label: '📈 Trends',           desc: 'Charts' },
    { id: 'aging',       label: '🕐 AR Aging',         desc: 'Aging buckets' },
    { id: 'payers',      label: '🏥 Payer Performance', desc: 'Scoring' },
    { id: 'providers',   label: '👤 Providers',        desc: 'Productivity' },
    { id: 'claims',      label: '📋 Claims & RCM',     desc: 'Timeline & tools' },
    { id: 'forecasting', label: '🔮 Forecasting',      desc: 'AI projections' },
  ];

  return (
    <div className="billing-dashboard fade-in" style={{ paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>💰 Revenue Cycle Management</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Financial analytics, AR aging, payer performance, and AI-powered forecasting</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Period:</label>
          <select value={period} onChange={e => setPeriod(e.target.value)} className="form-input" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap', background: '#f8fafc', borderRadius: 10, padding: 4, border: '1px solid var(--border)' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setSelectedTab(tab.id)}
            style={{ flex: 1, minWidth: 100, padding: '8px 10px', border: 'none', borderRadius: 8, background: selectedTab === tab.id ? '#fff' : 'transparent', color: selectedTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: selectedTab === tab.id ? 700 : 500, fontSize: 12, cursor: 'pointer', boxShadow: selectedTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            <div>{tab.label}</div>
            <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>{tab.desc}</div>
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {selectedTab === 'overview' && (
        <div>
          {/* KPI Cards with sparklines */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { icon: '💰', label: 'Total Charges',    value: fmt$(metrics.gross_charges), spark: sparkCharges, color: '#059669', sub: metrics.total_claims + ' claims' },
              { icon: '💳', label: 'Collections',      value: fmt$(metrics.total_payments), spark: sparkCollections, color: '#3b82f6', sub: metrics.collection_rate + '% rate' },
              { icon: '📊', label: 'Outstanding AR',   value: fmt$(metrics.outstanding_balance), spark: sparkCharges.map(v => v * 0.13), color: '#dc2626', sub: 'Accounts receivable' },
              { icon: '⚠️', label: 'Denial Rate',      value: metrics.denial_rate + '%', spark: sparkDenials, color: '#f59e0b', sub: 'Avg this period' },
              { icon: '🏥', label: 'Avg Charge/Claim', value: fmt$(metrics.avg_charge_per_claim), spark: sparkCharges.map(v => v / 310), color: '#8b5cf6', sub: 'Per encounter' },
            ].map(k => {
              const t = trendPct(k.spark);
              return (
                <div key={k.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', borderLeft: '4px solid ' + k.color }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{k.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>{k.value}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{k.sub}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Sparkline data={k.spark} color={k.color} />
                      <div style={{ fontSize: 10, color: t.up ? '#059669' : '#dc2626', fontWeight: 700, marginTop: 2 }}>
                        {t.up ? '▲' : '▼'} {Math.abs(t.pct)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charges vs Collections mini chart */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Charges vs Collections</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>6-month trend</div>
              <LineChart
                months={MONTHLY_TRENDS.map(m => m.month)}
                series={[
                  { name: 'Charges', data: MONTHLY_TRENDS.map(m => m.charges), color: '#6366f1' },
                  { name: 'Collections', data: MONTHLY_TRENDS.map(m => m.collections), color: '#10b981' },
                ]}
                height={140}
                showArea={true}
              />
              <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                {[['#6366f1','Charges'], ['#10b981','Collections']].map(([c, l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                    <span style={{ width: 12, height: 3, background: c, display: 'inline-block', borderRadius: 2 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Payer Mix</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Revenue by payer — current period</div>
              <DonutChart data={PAYER_MIX} />
            </div>
          </div>

          {/* Claims by status */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Claims by Status</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {[
                { status: 'Paid',      count: Math.round(218 * multiplier), charges: Math.round(99600 * multiplier), color: '#10b981', bg: '#f0fdf4' },
                { status: 'Submitted', count: Math.round(54 * multiplier),  charges: Math.round(24700 * multiplier), color: '#3b82f6', bg: '#eff6ff' },
                { status: 'Processed', count: Math.round(21 * multiplier),  charges: Math.round(9600 * multiplier),  color: '#f59e0b', bg: '#fef3c7' },
                { status: 'Denied',    count: Math.round(14 * multiplier),  charges: Math.round(6400 * multiplier),  color: '#ef4444', bg: '#fef2f2' },
                { status: 'Generated', count: Math.round(5 * multiplier),   charges: Math.round(2500 * multiplier),  color: '#6b7280', bg: '#f9fafb' },
              ].map(s => (
                <div key={s.status} style={{ background: s.bg, borderRadius: 10, padding: '12px 14px', borderLeft: '4px solid ' + s.color }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, margin: '3px 0' }}>{s.status}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt$(s.charges)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Trends Tab ── */}
      {selectedTab === 'trends' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Monthly Charges vs Collections</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Historical 6 months + 3-month AI forecast (shaded area)</div>
            <LineChart
              months={forecastMonths}
              series={[
                { name: 'Charges',     data: chargesWithForecast, color: '#6366f1' },
                { name: 'Collections', data: collectionsWithForecast, color: '#10b981' },
              ]}
              height={200}
              showArea={true}
            />
            <div style={{ display: 'flex', gap: 20, marginTop: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
              {[['#6366f1','Charges'], ['#10b981','Collections']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ width: 16, height: 3, background: c, display: 'inline-block', borderRadius: 2 }} />
                  <span>{l}</span>
                </div>
              ))}
              <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>Jun–Aug = AI Forecast</div>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Denial Rate Trend</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Monthly denial % — lower is better</div>
            <LineChart
              months={MONTHLY_TRENDS.map(m => m.month)}
              series={[{ name: 'Denial Rate', data: MONTHLY_TRENDS.map(m => m.denialRate), color: '#ef4444' }]}
              height={140}
            />
            <div style={{ marginTop: 12, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {MONTHLY_TRENDS.map(m => (
                <div key={m.month} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: m.denialRate > 5 ? '#ef4444' : m.denialRate > 4 ? '#f59e0b' : '#059669' }}>{m.denialRate}%</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.month}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Cashflow Trend</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Net cash received by month</div>
            <LineChart
              months={MONTHLY_TRENDS.map(m => m.month)}
              series={[{ name: 'Cashflow', data: MONTHLY_TRENDS.map(m => m.cashflow), color: '#0284c7' }]}
              height={140}
              showArea={true}
            />
          </div>
        </div>
      )}

      {/* ── AR Aging Tab ── */}
      {selectedTab === 'aging' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Accounts Receivable Aging</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Total outstanding: {fmt$(AR_AGING.reduce((s, d) => s + d.amount, 0))}</div>
              </div>
              <div style={{ padding: '6px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', fontSize: 12, fontWeight: 700, color: '#dc2626' }}>
                ⚠️ {fmt$(AR_AGING.filter(d => d.bucket === '90+ days')[0].amount)} over 90 days
              </div>
            </div>
            <HBarChart data={AR_AGING} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {AR_AGING.map(d => (
              <div key={d.bucket} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', borderTop: '4px solid ' + d.color }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>{d.bucket}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: d.color }}>{fmt$(d.amount)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{d.count} claims · {d.pct}%</div>
                {d.bucket === '90+ days' && (
                  <div style={{ marginTop: 8, padding: '4px 8px', borderRadius: 5, background: '#fef2f2', fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                    Action required
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Aging by Payer</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                  {['Payer','0–30 days','31–60 days','61–90 days','90+ days','Total'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: h === 'Payer' ? 'left' : 'right', fontWeight: 700, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PAYER_MIX.slice(0, 5).map((p, i) => {
                  const t = Math.round(p.amount * 0.116);
                  return (
                    <tr key={p.payer} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 600 }}>{p.payer}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#059669' }}>{fmt$(Math.round(t * 0.44))}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#d97706' }}>{fmt$(Math.round(t * 0.28))}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#f97316' }}>{fmt$(Math.round(t * 0.16))}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>{fmt$(Math.round(t * 0.12))}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt$(t)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Payer Performance Tab ── */}
      {selectedTab === 'payers' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Payer Performance Scorecard</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Composite score based on payment speed, denial rate, and collection rate</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                  {['Payer','Score','Avg Days to Pay','Denial Rate','Collection Rate','Trend'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: ['Avg Days to Pay','Denial Rate','Collection Rate'].includes(h) ? 'center' : h === 'Score' ? 'center' : 'left', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PAYER_PERFORMANCE.map((p, i) => (
                  <tr key={p.payer} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 28, height: 28, borderRadius: 5, background: PAYER_MIX.find(m => m.payer === p.payer)?.color || '#6b7280', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
                          {p.payer.slice(0, 2).toUpperCase()}
                        </span>
                        {p.payer}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <ScoreBadge score={p.score} />
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: p.avgDays <= 20 ? '#059669' : p.avgDays <= 25 ? '#d97706' : '#dc2626' }}>{p.avgDays}d</span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: p.denialRate < 4 ? '#059669' : p.denialRate < 6 ? '#d97706' : '#dc2626' }}>{p.denialRate}%</span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <div style={{ width: 60, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: p.collectionRate + '%', height: '100%', background: p.collectionRate >= 90 ? '#059669' : p.collectionRate >= 80 ? '#d97706' : '#dc2626', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontWeight: 700, color: '#374151', fontSize: 12 }}>{p.collectionRate}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{ fontSize: 16 }}>{p.trend === 'up' ? '📈' : p.trend === 'down' ? '📉' : '➡️'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Payer Mix by Revenue</div>
            <DonutChart data={PAYER_MIX} />
          </div>
        </div>
      )}

      {/* ── Providers Tab ── */}
      {selectedTab === 'providers' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Gross Charges by Provider</div>
              <ProviderBars data={PROVIDER_STATS_MOCK} metric="charges" color="#6366f1" label="Charges" />
            </div>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Collections by Provider</div>
              <ProviderBars data={PROVIDER_STATS_MOCK} metric="collections" color="#10b981" label="Collections" />
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Provider Productivity Summary</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                  {['Provider','Encounters','Gross Charges','Collections','Denial Rate','Avg/Encounter','Collection Rate'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: ['Gross Charges','Collections','Avg/Encounter'].includes(h) ? 'right' : ['Encounters','Denial Rate','Collection Rate'].includes(h) ? 'center' : 'left', fontWeight: 700, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PROVIDER_STATS_MOCK.map((p, i) => {
                  const rate = Math.round(p.collections / p.charges * 100);
                  const denialRate = Math.round(p.denials / p.encounters * 100 * 10) / 10;
                  return (
                    <tr key={p.name} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{p.name}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{p.encounters}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{fmt$(p.charges)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>{fmt$(p.collections)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ color: denialRate < 5 ? '#059669' : denialRate < 10 ? '#d97706' : '#dc2626', fontWeight: 700 }}>{denialRate}%</span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt$(Math.round(p.charges / p.encounters))}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: rate >= 90 ? '#059669' : rate >= 80 ? '#d97706' : '#dc2626' }}>{rate}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🤖 Coding Accuracy Analytics</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {CODING_ACCURACY.map(c => (
                <div key={c.category} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: c.accuracy >= 95 ? '#f0fdf4' : c.accuracy >= 90 ? '#fef3c7' : '#fef2f2' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>{c.category}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: c.accuracy >= 95 ? '#059669' : c.accuracy >= 90 ? '#d97706' : '#dc2626' }}>{c.accuracy}%</div>
                  <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: c.accuracy + '%', height: '100%', background: c.accuracy >= 95 ? '#059669' : c.accuracy >= 90 ? '#d97706' : '#dc2626', borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{c.issues} issues found</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Claims & RCM Tab ── */}
      {selectedTab === 'claims' && (
        <div style={{ display: 'grid', gap: 16 }}>

          {/* RCM Quick Links */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { icon: '🔍', label: 'Claim Scrubber', sub: '187 claims scrubbed today', color: '#7c3aed', bg: '#f5f3ff', path: '/billing/claims' },
              { icon: '🏥', label: 'Payer Profiles', sub: '6 payer contracts configured', color: '#2563eb', bg: '#eff6ff', path: '/payer-profiles' },
              { icon: '💳', label: 'ERA Auto-Posting', sub: '5 remittances pending review', color: '#0891b2', bg: '#ecfeff', path: '/remittance-posting' },
            ].map(link => (
              <button key={link.label} onClick={() => navigate(link.path)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 12, background: link.bg, border: '2px solid ' + link.color + '40', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                onMouseOver={e => e.currentTarget.style.borderColor = link.color}
                onMouseOut={e => e.currentTarget.style.borderColor = link.color + '40'}>
                <span style={{ fontSize: 28 }}>{link.icon}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: link.color }}>{link.label}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{link.sub}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 16, color: link.color }}>→</span>
              </button>
            ))}
          </div>

          {/* Claim Scrubber Summary */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>🔍 Claim Scrubber — Today's Batch</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>247 claims processed · 76% first-pass clean rate</div>
              </div>
              <button onClick={() => navigate('/billing/claims')} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: '#7c3aed', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Open Scrubber →</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {SCRUBBER_STATS.map(s => (
                <div key={s.label} style={{ padding: '12px 14px', borderRadius: 10, background: s.bg, borderLeft: '3px solid ' + s.color }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginTop: 2 }}>{s.label}</div>
                  <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: s.pct + '%', height: '100%', background: s.color, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3 }}>{s.pct}% of total</div>
                </div>
              ))}
            </div>
          </div>

          {/* Claims Kanban Timeline */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>⏱️ Claims Lifecycle — Kanban View</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Practice-wide claim status distribution · {TIMELINE_CLAIMS.length} recent claims</div>
              </div>
              <button onClick={() => navigate('/billing/claims')} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Manage All Claims →</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', gap: 12, minWidth: 960, paddingBottom: 8 }}>
                {CLAIM_STAGES.map(stage => {
                  const stageClaims = TIMELINE_CLAIMS.filter(c => c.stage === stage.id);
                  const total = stageClaims.reduce((s, c) => s + c.amount, 0);
                  return (
                    <div key={stage.id} style={{ flex: 1, minWidth: 130, background: stage.bg, borderRadius: 10, border: '1px solid ' + stage.color + '30', overflow: 'hidden' }}>
                      {/* Column header */}
                      <div style={{ padding: '10px 12px', background: stage.color + '15', borderBottom: '1px solid ' + stage.color + '30' }}>
                        <div style={{ fontSize: 16, marginBottom: 3 }}>{stage.icon}</div>
                        <div style={{ fontWeight: 800, fontSize: 11, color: stage.color, textTransform: 'uppercase', letterSpacing: 0.3 }}>{stage.label}</div>
                        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{stageClaims.length} claims · {fmt$(total)}</div>
                      </div>
                      {/* Claim cards */}
                      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
                        {stageClaims.length === 0 && (
                          <div style={{ textAlign: 'center', padding: '20px 8px', fontSize: 11, color: '#9ca3af' }}>No claims</div>
                        )}
                        {stageClaims.map(claim => (
                          <div key={claim.id} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', border: '1px solid ' + stage.color + '25', fontSize: 11, cursor: 'pointer' }}
                            onClick={() => navigate('/billing/claims')}>
                            <div style={{ fontWeight: 800, color: stage.color, marginBottom: 2 }}>{claim.id}</div>
                            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 1 }}>{claim.patient}</div>
                            <div style={{ color: '#6b7280', marginBottom: 4 }}>{claim.payer} · {claim.cpt}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, color: '#059669', fontSize: 12 }}>{fmt$(claim.amount)}</span>
                              {claim.scrubScore !== null && (
                                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: claim.scrubScore >= 95 ? '#f0fdf4' : claim.scrubScore >= 80 ? '#fef3c7' : '#fef2f2', color: claim.scrubScore >= 95 ? '#059669' : claim.scrubScore >= 80 ? '#d97706' : '#dc2626', border: '1px solid ' + (claim.scrubScore >= 95 ? '#86efac' : claim.scrubScore >= 80 ? '#fde68a' : '#fca5a5') }}>
                                  {claim.scrubScore}%
                                </span>
                              )}
                              {claim.age > 0 && <span style={{ fontSize: 9, color: '#9ca3af' }}>{claim.age}d</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ERA Auto-Posting Activity */}
          <DemoGuard reason="clearinghouse">
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>💳 ERA Auto-Posting Activity</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>835 remittance files · last 5 transactions</div>
              </div>
              <button onClick={() => navigate('/remittance-posting')} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: '#0891b2', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Open ERA Posting →</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                  {['ERA File','Payer','Date','Claims','Paid','Adj','Denied','Total','Status'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: ['Total','Paid','Adj','Denied','Claims'].includes(h) ? 'center' : 'left', fontWeight: 700, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ERA_ACTIVITY.map((era, i) => (
                  <tr key={era.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#1d4ed8' }}>{era.id}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 600 }}>{era.payer}</td>
                    <td style={{ padding: '9px 12px', color: '#6b7280' }}>{era.date}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700 }}>{era.claims}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', color: '#059669', fontWeight: 700 }}>{era.paid}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', color: '#d97706', fontWeight: 600 }}>{era.adjusted}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>{era.denied}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 800 }}>{fmt$(era.total)}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: era.status === 'Posted' ? '#f0fdf4' : '#fef3c7', color: era.status === 'Posted' ? '#059669' : '#d97706', border: '1px solid ' + (era.status === 'Posted' ? '#86efac' : '#fde68a') }}>
                        {era.status === 'Posted' ? '✓ Posted' : '⏳ Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </DemoGuard>

          {/* Color-coded Status Summary */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>🏷️ Claim Status at a Glance</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {[
                { label: 'Paid',        count: 92, color: '#059669', bg: '#f0fdf4', border: '#86efac' },
                { label: 'Submitted',   count: 47, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                { label: 'Acknowledged',count: 31, color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' },
                { label: 'ERA Posted',  count: 24, color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
                { label: 'Scrubbing',   count: 18, color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
                { label: 'Generated',   count: 12, color: '#6b7280', bg: '#f9fafb', border: '#d1d5db' },
                { label: 'Denied',      count: 14, color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
                { label: 'On Hold',     count:  6, color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
              ].map(s => (
                <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: s.bg, border: '1px solid ' + s.border, fontSize: 12, fontWeight: 700, color: s.color, cursor: 'pointer' }}
                  onClick={() => navigate('/billing/claims')}>
                  {s.label}
                  <span style={{ background: s.color, color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>{s.count}</span>
                </span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click any status to filter in Claims Management →</div>
          </div>
        </div>
      )}

      {/* ── Forecasting Tab ── */}
      {selectedTab === 'forecasting' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: 'linear-gradient(135deg, #1e40af, #1d4ed8)', borderRadius: 12, padding: '20px 24px', color: '#fff' }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>🔮 AI Revenue Forecasting</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 16 }}>Powered by trend analysis across charges, collections, and denial patterns</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {FORECAST.map(f => (
                <div key={f.month} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, textTransform: 'uppercase', fontWeight: 700 }}>{f.month} Forecast</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt$(f.projected)}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>Range: {fmt$(f.lower)} – {fmt$(f.upper)}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>Expected collected: {fmt$(Math.round(f.projected * 0.87))}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>6-Month + Forecast Chart</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Historical data (solid) + AI forecast (dashed projection)</div>
            <LineChart
              months={forecastMonths}
              series={[
                { name: 'Charges', data: chargesWithForecast, color: '#6366f1' },
                { name: 'Collections', data: collectionsWithForecast, color: '#10b981' },
              ]}
              height={220}
              showArea={true}
            />
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              ℹ️ Forecast is based on 6-month trend regression. Actual results may vary based on payer mix changes, staff productivity, and seasonal patterns.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>💰 Cashflow Projections</div>
              {[...MONTHLY_TRENDS.slice(-3), ...FORECAST.map(f => ({ month: f.month, cashflow: Math.round(f.projected * 0.83), projected: true }))].map(m => (
                <div key={m.month} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ width: 32, fontWeight: 700, color: 'var(--text-muted)' }}>{m.month}</span>
                  <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: ((m.cashflow || 0) / 130000 * 100) + '%', height: '100%', background: m.projected ? '#a5b4fc' : '#6366f1', borderRadius: 4 }} />
                  </div>
                  <span style={{ fontWeight: 700, color: m.projected ? '#818cf8' : '#1e293b', minWidth: 70, textAlign: 'right' }}>{fmt$(m.cashflow || 0)}</span>
                  {m.projected && <span style={{ fontSize: 9, color: '#818cf8', fontWeight: 700 }}>PROJ</span>}
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📊 Key Assumptions</div>
              {[
                { label: 'Collection Rate', value: '87%', note: 'Based on 6mo avg' },
                { label: 'Denial Rate', value: '4.2%', note: 'Improving trend' },
                { label: 'Avg Charge/Visit', value: fmt$(457), note: 'Stable' },
                { label: 'Monthly Visit Volume', value: '312', note: '+3% QoQ growth' },
                { label: 'AR Days Outstanding', value: '24d', note: 'Target: < 30d' },
              ].map(a => (
                <div key={a.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{a.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.note}</div>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>{a.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
