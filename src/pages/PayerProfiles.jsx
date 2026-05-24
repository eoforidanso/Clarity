import React, { useState, useMemo } from 'react';

// ─── Payer Data ───────────────────────────────────────────────────────────────
const PAYERS = [
  {
    id: 'bcbs', name: 'Blue Cross Blue Shield', initials: 'BC', color: '#1e40af',
    payerId: '00660', clearinghouse: 'Availity', submissionMethod: 'EDI 837P',
    portalUrl: 'https://www.bcbs.com/providers', phone: '1-800-676-2583',
    timelyFilingDays: 365, secondaryFilingDays: 180,
    avgDaysToPay: 14, denialRate: 6.2, collectionRate: 94.1,
    grade: 'A',
    authRequired: ['90791', '90792', 'H0035', 'H2019'],
    telehealthModifier: '95', telehealthPOS: '02',
    modifiers: ['Mod 25 required when E&M + therapy same day', 'Mod 59 for separate procedures'],
    notes: 'BCBS requires modifier 25 on E&M when billing psychotherapy add-on (90833) same day. Network: BluePath for behavioral health.',
    contractedRates: {
      '99213': 96, '99214': 148, '99215': 200,
      '90837': 140, '90834': 112, '90832': 84,
      '90792': 280, '90833': 76, '90853': 96, '96127': 24,
    },
    denialReasons: [
      { reason: 'Prior Auth Required', count: 12, pct: 42 },
      { reason: 'Missing Modifier', count: 8, pct: 28 },
      { reason: 'Timely Filing', count: 5, pct: 18 },
      { reason: 'Duplicate Claim', count: 3, pct: 12 },
    ],
    underpaymentAlerts: [
      { cpt: '90837', expected: 140, paid: 124, variance: -16, note: 'Check BluePath contract addendum' },
    ],
  },
  {
    id: 'aetna', name: 'Aetna', initials: 'AE', color: '#c2410c',
    payerId: '60054', clearinghouse: 'Availity', submissionMethod: 'EDI 837P',
    portalUrl: 'https://www.aetna.com/health-care-professionals', phone: '1-800-859-4004',
    timelyFilingDays: 180, secondaryFilingDays: 90,
    avgDaysToPay: 18, denialRate: 8.1, collectionRate: 91.7,
    grade: 'B',
    authRequired: ['90791', '90792', '90847', 'H0035'],
    telehealthModifier: '95', telehealthPOS: '02',
    modifiers: ['Mod 95 required for all telehealth services', 'POS 02 or 10 for telehealth'],
    notes: 'Aetna requires modifier 95 for telehealth. Verify POS code 02/10 per patient location. Behavioral Health managed by Aetna BH — separate auth portal.',
    contractedRates: {
      '99213': 102, '99214': 157, '99215': 212,
      '90837': 152, '90834': 120, '90832': 89,
      '90792': 295, '90833': 80, '90853': 104, '96127': 26,
    },
    denialReasons: [
      { reason: 'Missing Telehealth Modifier', count: 18, pct: 48 },
      { reason: 'Prior Auth Required', count: 10, pct: 27 },
      { reason: 'Wrong POS Code', count: 6, pct: 16 },
      { reason: 'Other', count: 3, pct: 9 },
    ],
    underpaymentAlerts: [],
  },
  {
    id: 'uhc', name: 'UnitedHealthcare', initials: 'UH', color: '#15803d',
    payerId: '87726', clearinghouse: 'Optum/Change Healthcare', submissionMethod: 'EDI 837P',
    portalUrl: 'https://www.uhcprovider.com', phone: '1-877-842-3210',
    timelyFilingDays: 90, secondaryFilingDays: 60,
    avgDaysToPay: 21, denialRate: 11.4, collectionRate: 88.2,
    grade: 'C',
    authRequired: ['90791', '90792', '90847', '90849', 'H0035', 'H2019'],
    telehealthModifier: '95', telehealthPOS: '02',
    modifiers: ['Mod 25 required on E&M with same-day procedure', 'Documented time required for 99215'],
    notes: 'UHC has the shortest timely filing window (90 days). High denial rate — requires documented time for 99215. Use Optum Insights portal for claim status. Mental Health Parity compliance audits common.',
    contractedRates: {
      '99213': 98, '99214': 152, '99215': 205,
      '90837': 144, '90834': 116, '90832': 86,
      '90792': 288, '90833': 78, '90853': 100, '96127': 25,
    },
    denialReasons: [
      { reason: 'Medical Necessity', count: 24, pct: 38 },
      { reason: 'Prior Auth Required', count: 19, pct: 30 },
      { reason: 'Missing Documentation', count: 12, pct: 19 },
      { reason: 'Timely Filing', count: 8, pct: 13 },
    ],
    underpaymentAlerts: [
      { cpt: '99215', expected: 205, paid: 185, variance: -20, note: 'Verify 99215 time documentation submitted' },
      { cpt: '90837', expected: 144, paid: 130, variance: -14, note: 'Check if modifier was missing on original claim' },
    ],
  },
  {
    id: 'cigna', name: 'Cigna', initials: 'CI', color: '#0e7490',
    payerId: '62308', clearinghouse: 'Availity', submissionMethod: 'EDI 837P',
    portalUrl: 'https://www.cigna.com/health-care-providers', phone: '1-800-88-CIGNA',
    timelyFilingDays: 180, secondaryFilingDays: 90,
    avgDaysToPay: 16, denialRate: 7.3, collectionRate: 92.5,
    grade: 'B',
    authRequired: ['90792', 'H0035', 'H2019'],
    telehealthModifier: '95', telehealthPOS: '02',
    modifiers: ['Mod 25 for E&M + same-day procedure'],
    notes: 'Cigna Behavioral Health uses a separate portal. Check for "Evicore" for prior auth on certain behavioral health codes. ERA posting typically within 5 business days of payment.',
    contractedRates: {
      '99213': 100, '99214': 155, '99215': 208,
      '90837': 148, '90834': 118, '90832': 88,
      '90792': 292, '90833': 79, '90853': 102, '96127': 25,
    },
    denialReasons: [
      { reason: 'Prior Auth Required', count: 9, pct: 41 },
      { reason: 'Missing Modifier', count: 7, pct: 32 },
      { reason: 'Coordination of Benefits', count: 4, pct: 18 },
      { reason: 'Other', count: 2, pct: 9 },
    ],
    underpaymentAlerts: [],
  },
  {
    id: 'anthem', name: 'Anthem', initials: 'AN', color: '#6d28d9',
    payerId: '00310', clearinghouse: 'Availity', submissionMethod: 'EDI 837P',
    portalUrl: 'https://www.anthem.com/provider', phone: '1-800-676-2583',
    timelyFilingDays: 365, secondaryFilingDays: 180,
    avgDaysToPay: 22, denialRate: 13.8, collectionRate: 85.9,
    grade: 'C',
    authRequired: ['90791', '90792', '90847', 'H0035', 'H2019', 'H2020'],
    telehealthModifier: '95', telehealthPOS: '02',
    modifiers: ['Mod 25 required same-day E&M + therapy', 'Prior auth required before 90791 and 90792'],
    notes: 'Anthem has the highest denial rate and longest pay times. Always obtain prior auth for psychiatric evaluations (90791/90792) BEFORE the visit. Behavioral Health managed through Sydney Health.',
    contractedRates: {
      '99213': 94, '99214': 145, '99215': 196,
      '90837': 138, '90834': 110, '90832': 82,
      '90792': 275, '90833': 74, '90853': 94, '96127': 23,
    },
    denialReasons: [
      { reason: 'Prior Auth Required', count: 31, pct: 52 },
      { reason: 'Medical Necessity', count: 15, pct: 25 },
      { reason: 'Missing Documentation', count: 9, pct: 15 },
      { reason: 'Timely Filing', count: 5, pct: 8 },
    ],
    underpaymentAlerts: [
      { cpt: '90792', expected: 275, paid: 240, variance: -35, note: 'Confirm auth number was included on claim' },
    ],
  },
  {
    id: 'medicare', name: 'Medicare Part B', initials: 'MC', color: '#b91c1c',
    payerId: '00884', clearinghouse: 'Novitas/CGS', submissionMethod: 'EDI 837P',
    portalUrl: 'https://www.cms.gov/medicare/provider-enrollment-and-certification', phone: '1-800-633-4227',
    timelyFilingDays: 365, secondaryFilingDays: 27,
    avgDaysToPay: 14, denialRate: 9.6, collectionRate: 90.1,
    grade: 'B',
    authRequired: [],
    telehealthModifier: '95', telehealthPOS: '02',
    modifiers: ['Place of Service code required on all claims', 'Modifier 25 for E&M + procedure same day', 'GT modifier (legacy telehealth)'],
    notes: 'Medicare: confirm rendering provider NPI and Place of Service code on all claims. Telehealth flexibilities post-COVID vary by LCD. Secondary payment window is only 27 months after primary.',
    contractedRates: {
      '99213': 88, '99214': 135, '99215': 185,
      '90837': 128, '90834': 102, '90832': 76,
      '90792': 255, '90833': 68, '90853': 88, '96127': 21,
    },
    denialReasons: [
      { reason: 'Missing NPI / POS', count: 14, pct: 40 },
      { reason: 'LCD Coverage Issue', count: 10, pct: 29 },
      { reason: 'Duplicate Claim', count: 7, pct: 20 },
      { reason: 'Other', count: 4, pct: 11 },
    ],
    underpaymentAlerts: [],
  },
];

const CPT_LABELS = {
  '99213': 'Office Visit (Low)', '99214': 'Office Visit (Mod)', '99215': 'Office Visit (High)',
  '90837': 'Psychotherapy 60m', '90834': 'Psychotherapy 45m', '90832': 'Psychotherapy 30m',
  '90792': 'Psych Eval w/Medical', '90833': 'Psych Add-On', '90853': 'Group Therapy', '96127': 'Brief Assessment',
};

const OUR_CHARGE = {
  '99213': 120, '99214': 185, '99215': 250,
  '90837': 175, '90834': 140, '90832': 105,
  '90792': 350, '90833': 95, '90853': 120, '96127': 30,
};

const GRADE_COLOR = { A: '#059669', B: '#d97706', C: '#dc2626' };
const GRADE_BG   = { A: '#f0fdf4', B: '#fef3c7', C: '#fef2f2' };

const fmt$ = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n || 0);
const fmtPct = (n) => (n || 0).toFixed(1) + '%';

// ─── Mini Bar ────────────────────────────────────────────────────────────────
function MiniBar({ pct, color = '#ef4444' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 10, color: '#64748b', minWidth: 28, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

// ─── Payer extra data (contract + contacts + claim activity) ──────────────────
const PAYER_EXTRA = {
  bcbs: {
    contractEffective: '2024-01-01', contractExpiry: '2026-12-31',
    networkName: 'BluePath Behavioral Health', planTypes: ['HMO', 'PPO', 'EPO', 'BlueCard'],
    credentialingStatus: 'Active', credentialingExpiry: '2026-08-15',
    eraTurnaround: '5 business days', eraFormat: '835 EDI',
    contacts: [
      { dept: 'Provider Relations', name: 'BCBS Provider Line', phone: '1-800-676-2583', email: 'provider@bcbs.com', hours: 'M–F 8a–6p ET' },
      { dept: 'Claims', name: 'Claims Inquiry', phone: '1-800-676-2583 x2', email: 'claims@bcbs.com', hours: 'M–F 8a–5p ET' },
      { dept: 'Prior Auth', name: 'Utilization Management', phone: '1-800-676-2583 x3', email: 'auth@bcbs.com', hours: 'M–F 8a–5p ET' },
      { dept: 'Appeals', name: 'Member Appeals Unit', phone: '1-800-676-2583 x4', email: 'appeals@bcbs.com', hours: 'M–F 9a–4p ET' },
    ],
    recentClaims: [
      { id: 'CLM-2026-001', date: '2026-03-28', cpt: '99214', amount: 140, status: 'Paid', days: 14 },
      { id: 'CLM-2026-002', date: '2026-02-28', cpt: '99214', amount: 140, status: 'Paid', days: 12 },
      { id: 'CLM-2025-006', date: '2025-11-05', cpt: '90792', amount: 0, status: 'Submitted', days: 200 },
    ],
    monthlyTrend: [7.1, 6.8, 6.4, 6.9, 6.2, 5.8],
  },
  aetna: {
    contractEffective: '2024-07-01', contractExpiry: '2026-06-30',
    networkName: 'Aetna Behavioral Health', planTypes: ['PPO', 'HMO', 'HDHP'],
    credentialingStatus: 'Active', credentialingExpiry: '2026-11-20',
    eraTurnaround: '7 business days', eraFormat: '835 EDI',
    contacts: [
      { dept: 'Provider Relations', name: 'Aetna Provider Services', phone: '1-800-859-4004', email: 'provider@aetna.com', hours: 'M–F 8a–6p ET' },
      { dept: 'Claims', name: 'Claims Department', phone: '1-800-859-4004 x2', email: 'claims@aetna.com', hours: 'M–F 8a–5p ET' },
      { dept: 'Prior Auth', name: 'Aetna BH Auth Team', phone: '1-800-859-4004 x3', email: 'auth@aetna.com', hours: 'M–F 8a–5p ET' },
      { dept: 'Appeals', name: 'Appeals & Grievances', phone: '1-800-859-4004 x4', email: 'appeals@aetna.com', hours: 'M–F 9a–4p ET' },
    ],
    recentClaims: [
      { id: 'CLM-2026-003', date: '2026-04-10', cpt: '99215', amount: 210, status: 'Paid', days: 14 },
      { id: 'CLM-2026-008', date: '2026-04-10', cpt: '90837', amount: 0, status: 'Generated', days: 43 },
    ],
    monthlyTrend: [9.2, 8.8, 8.5, 8.3, 8.1, 7.9],
  },
  uhc: {
    contractEffective: '2025-01-01', contractExpiry: '2026-12-31',
    networkName: 'UnitedHealthcare Behavioral', planTypes: ['Choice Plus', 'Navigate', 'Charter'],
    credentialingStatus: 'Active', credentialingExpiry: '2026-05-31',
    eraTurnaround: '10 business days', eraFormat: '835 EDI',
    contacts: [
      { dept: 'Provider Relations', name: 'UHC Provider Services', phone: '1-877-842-3210', email: 'provider@uhc.com', hours: 'M–F 8a–8p ET' },
      { dept: 'Claims', name: 'Optum Claims', phone: '1-877-842-3210 x2', email: 'claims@uhc.com', hours: 'M–F 8a–5p ET' },
      { dept: 'Prior Auth', name: 'Optum Auth', phone: '1-877-842-3210 x3', email: 'auth@uhc.com', hours: 'M–F 8a–5p ET' },
      { dept: 'Appeals', name: 'Appeals Team', phone: '1-877-842-3210 x5', email: 'appeals@uhc.com', hours: 'M–F 9a–4p ET' },
    ],
    recentClaims: [
      { id: 'CLM-2026-007', date: '2026-04-02', cpt: '90837', amount: 0, status: 'Generated', days: 51 },
    ],
    monthlyTrend: [13.1, 12.6, 11.9, 11.4, 12.0, 11.4],
  },
  cigna: {
    contractEffective: '2024-04-01', contractExpiry: '2027-03-31',
    networkName: 'Cigna Behavioral Health', planTypes: ['OAP', 'LocalPlus', 'HDHP'],
    credentialingStatus: 'Active', credentialingExpiry: '2027-01-10',
    eraTurnaround: '5 business days', eraFormat: '835 EDI',
    contacts: [
      { dept: 'Provider Relations', name: 'Cigna Provider Line', phone: '1-800-88-CIGNA', email: 'provider@cigna.com', hours: 'M–F 8a–6p ET' },
      { dept: 'Claims', name: 'Claims Inquiry', phone: '1-800-88-CIGNA x2', email: 'claims@cigna.com', hours: 'M–F 8a–5p ET' },
      { dept: 'Prior Auth', name: 'Evicore / Cigna Auth', phone: '1-888-693-3211', email: 'auth@cigna.com', hours: 'M–F 8a–5p ET' },
      { dept: 'Appeals', name: 'Cigna Appeals', phone: '1-800-88-CIGNA x4', email: 'appeals@cigna.com', hours: 'M–F 9a–4p ET' },
    ],
    recentClaims: [
      { id: 'CLM-2026-004', date: '2026-03-17', cpt: '99214', amount: 155, status: 'Processed', days: 69 },
    ],
    monthlyTrend: [8.1, 7.9, 7.5, 7.3, 7.2, 7.0],
  },
  anthem: {
    contractEffective: '2025-01-01', contractExpiry: '2025-12-31',
    networkName: 'Anthem Behavioral Health / Sydney Health', planTypes: ['HMO', 'PPO', 'Select'],
    credentialingStatus: 'Renewal Pending', credentialingExpiry: '2026-06-01',
    eraTurnaround: '12 business days', eraFormat: '835 EDI',
    contacts: [
      { dept: 'Provider Relations', name: 'Anthem Provider Services', phone: '1-800-676-2583', email: 'provider@anthem.com', hours: 'M–F 8a–6p ET' },
      { dept: 'Claims', name: 'Claims Department', phone: '1-800-676-2583 x2', email: 'claims@anthem.com', hours: 'M–F 8a–5p ET' },
      { dept: 'Prior Auth', name: 'Utilization Review', phone: '1-800-676-2583 x3', email: 'auth@anthem.com', hours: 'M–F 8a–5p ET' },
      { dept: 'Appeals', name: 'Member Appeals', phone: '1-800-676-2583 x4', email: 'appeals@anthem.com', hours: 'M–F 9a–4p ET' },
    ],
    recentClaims: [
      { id: 'CLM-2026-005', date: '2026-03-22', cpt: '99214', amount: 0, status: 'Denied', days: 62 },
    ],
    monthlyTrend: [15.2, 14.8, 14.1, 13.8, 14.5, 13.8],
  },
  medicare: {
    contractEffective: '2020-01-01', contractExpiry: null,
    networkName: 'Medicare Fee-For-Service', planTypes: ['Part B', 'MSSP', 'DCE'],
    credentialingStatus: 'Active', credentialingExpiry: null,
    eraTurnaround: '3 business days', eraFormat: '835 EDI / FISS',
    contacts: [
      { dept: 'Provider Relations', name: 'Medicare Provider Hotline', phone: '1-800-633-4227', email: 'cms.gov/contact', hours: 'M–F 8a–8p ET' },
      { dept: 'Claims', name: 'Novitas Solutions', phone: '1-855-252-8782', email: 'novitas-solutions.com', hours: 'M–F 8a–5p ET' },
      { dept: 'LCD/Coverage', name: 'Local Coverage Determinations', phone: '1-800-633-4227', email: 'cms.gov/lcds', hours: 'M–F 8a–5p ET' },
      { dept: 'Appeals', name: 'Qualified Independent Contractor', phone: '1-855-252-8782 x3', email: 'appeals@novitas.com', hours: 'M–F 9a–4p ET' },
    ],
    recentClaims: [],
    monthlyTrend: [10.8, 10.2, 9.9, 9.6, 9.8, 9.6],
  },
};

// ─── Payer Card (list view) ───────────────────────────────────────────────────
function PayerCard({ payer, onClick, selected }) {
  return (
    <div onClick={onClick}
      style={{ background: selected ? '#eff6ff' : '#fff', border: '1px solid ' + (selected ? '#93c5fd' : '#e2e8f0'), borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s', borderLeft: '4px solid ' + payer.color }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: payer.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
            {payer.initials}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{payer.name}</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>Payer ID: {payer.payerId} · {payer.clearinghouse}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: GRADE_COLOR[payer.grade], background: GRADE_BG[payer.grade], width: 32, height: 32, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{payer.grade}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          ['Avg Pay', payer.avgDaysToPay + 'd', payer.avgDaysToPay > 20 ? '#dc2626' : '#059669'],
          ['Denial %', fmtPct(payer.denialRate), payer.denialRate > 10 ? '#dc2626' : payer.denialRate > 7 ? '#d97706' : '#059669'],
          ['Collection', fmtPct(payer.collectionRate), payer.collectionRate > 92 ? '#059669' : '#d97706'],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: '#f8fafc', borderRadius: 6, padding: '6px 8px' }}>
            <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>{l}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: c }}>{v}</div>
          </div>
        ))}
      </div>
      {payer.underpaymentAlerts.length > 0 && (
        <div style={{ marginTop: 8, padding: '4px 8px', borderRadius: 6, background: '#fef3c7', fontSize: 10, color: '#92400e', fontWeight: 700 }}>
          ⚠️ {payer.underpaymentAlerts.length} underpayment alert{payer.underpaymentAlerts.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

// ─── Sparkline SVG (6-month trend) ───────────────────────────────────────────
function Sparkline({ data, color, width = 120, height = 36 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data) * 0.9;
  const max = Math.max(...data) * 1.05;
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return x + ',' + y;
  });
  const lastX = (data.length - 1) / (data.length - 1) * width;
  const lastY = height - ((data[data.length - 1] - min) / range) * height;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3.5" fill={color} />
    </svg>
  );
}

// ─── Grade Ring SVG ───────────────────────────────────────────────────────────
function GradeRing({ grade, size = 64 }) {
  const score = grade === 'A' ? 95 : grade === 'B' ? 75 : 50;
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = GRADE_COLOR[grade];
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#fff" strokeWidth="5"
        strokeDasharray={dash + ' ' + (circ - dash)} strokeLinecap="round" />
      <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
        style={{ fill: '#fff', fontSize: size * 0.32, fontWeight: 900, transform: 'rotate(90deg)', transformOrigin: (size/2) + 'px ' + (size/2) + 'px', fontFamily: 'inherit' }}>
        {grade}
      </text>
    </svg>
  );
}

// ─── Payer Detail Panel ───────────────────────────────────────────────────────
function PayerDetail({ payer }) {
  const [tab, setTab] = useState('overview');
  const extra = PAYER_EXTRA[payer.id] || {};
  const contractCPTs = Object.keys(payer.contractedRates);

  const totalVariance = contractCPTs.reduce((s, cpt) => {
    return s + ((OUR_CHARGE[cpt] || 0) - (payer.contractedRates[cpt] || 0));
  }, 0);
  const totalContracted = contractCPTs.reduce((s, cpt) => s + (payer.contractedRates[cpt] || 0), 0);
  const totalCharge = contractCPTs.reduce((s, cpt) => s + (OUR_CHARGE[cpt] || 0), 0);
  const overallCollection = totalCharge > 0 ? ((totalContracted / totalCharge) * 100).toFixed(1) : '—';

  const DENIAL_COLORS = ['#ef4444', '#f59e0b', '#6366f1', '#0ea5e9', '#10b981'];
  const totalDenials = payer.denialReasons.reduce((s, d) => s + d.count, 0);

  const tabs = [
    ['overview', '📊 Overview'],
    ['rates', '💲 Fee Schedule'],
    ['auth', '🔐 Auth & Rules'],
    ['denials', '⚠️ Denial Analytics'],
    ['contract', '📄 Contract & Contacts'],
    ['activity', '🔄 Claim Activity'],
  ];

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

      {/* ── Rich Header ── */}
      <div style={{ background: 'linear-gradient(135deg, ' + payer.color + 'f0, ' + payer.color + 'bb)', color: '#fff', padding: '20px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>

          {/* Left: logo + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, letterSpacing: 1, flexShrink: 0 }}>
              {payer.initials}
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: -0.3 }}>{payer.name}</div>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 3 }}>
                Payer ID <strong>{payer.payerId}</strong> · {payer.clearinghouse} · {payer.submissionMethod}
              </div>
              {extra.networkName && (
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>Network: {extra.networkName}</div>
              )}
            </div>
          </div>

          {/* Right: grade ring + KPI chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ textAlign: 'center' }}>
              <GradeRing grade={payer.grade} size={60} />
              <div style={{ fontSize: 10, opacity: 0.8, marginTop: 4, textAlign: 'center' }}>Performance</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Avg Days to Pay', val: payer.avgDaysToPay + 'd', warn: payer.avgDaysToPay > 20 },
                { label: 'Denial Rate', val: fmtPct(payer.denialRate), warn: payer.denialRate > 9 },
                { label: 'Collection', val: fmtPct(payer.collectionRate), warn: payer.collectionRate < 90 },
              ].map(k => (
                <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 7, padding: '4px 10px', minWidth: 160 }}>
                  <div style={{ fontSize: 10, opacity: 0.85, flex: 1 }}>{k.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: k.warn ? '#fde68a' : '#fff' }}>{k.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <a href={'tel:' + payer.phone.replace(/[^0-9]/g, '')}
            style={{ padding: '6px 13px', borderRadius: 8, background: 'rgba(255,255,255,0.18)', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700, border: '1px solid rgba(255,255,255,0.3)' }}>
            📞 {payer.phone}
          </a>
          <a href={payer.portalUrl} target="_blank" rel="noopener noreferrer"
            style={{ padding: '6px 13px', borderRadius: 8, background: 'rgba(255,255,255,0.18)', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700, border: '1px solid rgba(255,255,255,0.3)' }}>
            🌐 Provider Portal
          </a>
          {payer.underpaymentAlerts.length > 0 && (
            <span style={{ padding: '6px 13px', borderRadius: 8, background: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: 700 }}>
              ⚠️ {payer.underpaymentAlerts.length} Underpayment Alert{payer.underpaymentAlerts.length > 1 ? 's' : ''}
            </span>
          )}
          {extra.credentialingStatus === 'Renewal Pending' && (
            <span style={{ padding: '6px 13px', borderRadius: 8, background: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: 700 }}>
              🔄 Credentialing Renewal Pending
            </span>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
          {tabs.map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '9px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === t ? 700 : 500, whiteSpace: 'nowrap', background: tab === t ? '#fff' : 'transparent', color: tab === t ? payer.color : 'rgba(255,255,255,0.8)', borderRadius: '8px 8px 0 0', transition: 'all 0.1s', borderBottom: tab === t ? '3px solid ' + payer.color : '3px solid transparent' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div style={{ padding: '20px 24px', minHeight: 400 }}>

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div>
            {/* KPI grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
              {[
                { label: 'Primary Filing', val: payer.timelyFilingDays + ' days', sub: 'Timely filing limit', c: payer.timelyFilingDays < 120 ? '#dc2626' : '#059669', bg: payer.timelyFilingDays < 120 ? '#fef2f2' : '#f0fdf4' },
                { label: 'Secondary Filing', val: payer.secondaryFilingDays + (payer.secondaryFilingDays < 60 ? ' mo' : ' days'), sub: '2° claim limit', c: '#6366f1', bg: '#f5f3ff' },
                { label: 'Avg Days to Pay', val: payer.avgDaysToPay + ' days', sub: 'Payment turnaround', c: payer.avgDaysToPay > 20 ? '#dc2626' : '#059669', bg: payer.avgDaysToPay > 20 ? '#fef2f2' : '#f0fdf4' },
                { label: 'Overall Collection', val: overallCollection + '%', sub: 'Contract vs charge', c: parseFloat(overallCollection) > 85 ? '#059669' : '#d97706', bg: parseFloat(overallCollection) > 85 ? '#f0fdf4' : '#fef3c7' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '13px 15px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* 6-month trend + billing notes side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📈 6-Month Denial Trend</span>
                  <span style={{ fontSize: 10, color: '#6b7280' }}>Nov–Apr</span>
                </div>
                {extra.monthlyTrend ? (
                  <div>
                    <Sparkline data={extra.monthlyTrend} color={payer.color} width={200} height={40} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      {['Nov','Dec','Jan','Feb','Mar','Apr'].map((m, i) => (
                        <div key={m} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 9, color: '#9ca3af' }}>{m}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: payer.color }}>{extra.monthlyTrend[i]}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <div style={{ fontSize: 12, color: '#9ca3af' }}>No trend data</div>}
              </div>

              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>📋 Billing Notes</div>
                <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.6 }}>{payer.notes}</p>
              </div>
            </div>

            {/* Underpayment alerts */}
            {payer.underpaymentAlerts.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: '#92400e' }}>⚠️ Underpayment Alerts — Action Required</div>
                {payer.underpaymentAlerts.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 9, background: '#fffbeb', border: '1px solid #fde68a', marginBottom: 8 }}>
                    <span style={{ fontWeight: 800, fontFamily: 'monospace', background: '#fef3c7', padding: '3px 8px', borderRadius: 5, fontSize: 12, color: '#92400e', flexShrink: 0 }}>{a.cpt}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{CPT_LABELS[a.cpt] || a.cpt}</div>
                      <div style={{ fontSize: 11, color: '#78350f', marginTop: 1 }}>Expected {fmt$(a.expected)} · Paid {fmt$(a.paid)} · {a.note}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 900, color: '#dc2626', fontSize: 15 }}>{fmt$(a.variance)}</div>
                      <button style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, background: '#dc2626', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>Appeal</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Submission + modifiers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#eff6ff', borderRadius: 9, padding: '13px 15px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontWeight: 700, fontSize: 11, color: '#1d4ed8', marginBottom: 9 }}>📤 Submission Details</div>
                {[
                  ['Clearinghouse', payer.clearinghouse],
                  ['Method', payer.submissionMethod],
                  ['ERA Format', extra.eraFormat || '835 EDI'],
                  ['ERA Turnaround', extra.eraTurnaround || 'N/A'],
                  ['Telehealth Mod', payer.telehealthModifier],
                  ['Telehealth POS', payer.telehealthPOS],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #dbeafe' }}>
                    <span style={{ color: '#3b82f6' }}>{k}</span>
                    <span style={{ fontWeight: 600, color: '#1e3a8a' }}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: '#f0fdf4', borderRadius: 9, padding: '13px 15px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontWeight: 700, fontSize: 11, color: '#166534', marginBottom: 9 }}>✅ Modifier Requirements</div>
                {payer.modifiers.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#4ade80' }}>No special modifiers required.</div>
                ) : payer.modifiers.map((m, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#166534', padding: '4px 0', borderBottom: '1px solid #dcfce7', lineHeight: 1.45 }}>
                    <span style={{ fontWeight: 700 }}>Rule {i + 1}:</span> {m}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Fee Schedule ── */}
        {tab === 'rates' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>Contracted Rates vs. Our Charges</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Green = favorable (&gt;85%), amber = moderate, red = low (&lt;75%)</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#6b7280' }}>Total write-off per encounter set</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#dc2626' }}>{fmt$(totalVariance)}</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['CPT', 'Description', 'Our Charge', 'Contracted', 'Write-Off', 'Collection %', 'Rate Bar'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: ['Our Charge','Contracted','Write-Off','Collection %'].includes(h) ? 'right' : 'left', fontWeight: 700, fontSize: 10, color: '#6b7280', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contractCPTs.map((cpt, i) => {
                  const charge = OUR_CHARGE[cpt] || 0;
                  const allowed = payer.contractedRates[cpt] || 0;
                  const writeOff = charge - allowed;
                  const collPct = charge > 0 ? (allowed / charge) * 100 : 0;
                  const hasAlert = payer.underpaymentAlerts.some(a => a.cpt === cpt);
                  const barColor = collPct >= 85 ? '#10b981' : collPct >= 75 ? '#f59e0b' : '#ef4444';
                  return (
                    <tr key={cpt} style={{ borderBottom: '1px solid #f1f5f9', background: hasAlert ? '#fffbeb' : i % 2 === 1 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: 12, color: '#1d4ed8', background: '#eff6ff', padding: '2px 6px', borderRadius: 4 }}>{cpt}</span>
                        {hasAlert && <span style={{ marginLeft: 4, fontSize: 10 }}>⚠️</span>}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#374151', maxWidth: 200 }}>{CPT_LABELS[cpt] || cpt}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>{fmt$(charge)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>{fmt$(allowed)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{fmt$(writeOff)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <span style={{ fontWeight: 800, color: barColor, fontSize: 13 }}>{collPct.toFixed(1)}%</span>
                      </td>
                      <td style={{ padding: '10px 12px', minWidth: 100 }}>
                        <div style={{ height: 7, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: collPct + '%', height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.5s' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                  <td colSpan={2} style={{ padding: '10px 12px', fontWeight: 700, fontSize: 12 }}>TOTALS</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt$(totalCharge)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>{fmt$(totalContracted)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{fmt$(totalVariance)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: parseFloat(overallCollection) > 85 ? '#059669' : '#d97706' }}>{overallCollection}%</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── Auth & Rules ── */}
        {tab === 'auth' && (
          <div>
            {/* Auth codes */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>🔐 Prior Authorization Required</div>
              {payer.authRequired.length === 0 ? (
                <div style={{ padding: '14px 18px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', fontSize: 13, color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  ✅ No prior authorization required for standard behavioral health codes
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                  {payer.authRequired.map(code => (
                    <div key={code} style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 900, fontFamily: 'monospace', fontSize: 16, color: '#dc2626' }}>{code}</div>
                      <div style={{ fontSize: 10, color: '#7f1d1d', marginTop: 4, fontWeight: 600 }}>Auth required</div>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{CPT_LABELS[code] || 'H-code service'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Auth workflow */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>📋 Authorization Workflow</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { step: 1, text: 'Verify member eligibility and active coverage via ' + payer.clearinghouse + ' portal or by phone.', icon: '🔍' },
                  { step: 2, text: 'Submit prior auth request using ' + payer.clearinghouse + ' or call ' + payer.phone + '.', icon: '📤' },
                  { step: 3, text: 'Document the auth number in the patient record (EHR note + insurance tab).', icon: '📝' },
                  { step: 4, text: 'Include auth number in Box 23 of the CMS-1500 claim form before submission.', icon: '📋' },
                  { step: 5, text: 'Auth is typically valid for 90 days — set a reminder to re-authorize before expiry.', icon: '⏰' },
                ].map(s => (
                  <div key={s.step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 14px', background: '#f8fafc', borderRadius: 9, border: '1px solid #e2e8f0' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: payer.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{s.step}</div>
                    <div style={{ paddingTop: 3, fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{s.text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modifier rules */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>⚙️ Modifier & Billing Rules</div>
              {payer.modifiers.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '11px 14px', borderRadius: 9, marginBottom: 8, background: '#eff6ff', border: '1px solid #bfdbfe', alignItems: 'flex-start' }}>
                  <span style={{ background: '#1d4ed8', color: '#fff', borderRadius: 5, padding: '2px 7px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>Rule {i + 1}</span>
                  <span style={{ fontSize: 12, color: '#1e3a8a', lineHeight: 1.5 }}>{m}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Denial Analytics ── */}
        {tab === 'denials' && (
          <div>
            {/* Top KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
              <div style={{ background: '#fef2f2', borderRadius: 10, padding: '14px 16px', border: '1px solid #fca5a5' }}>
                <div style={{ fontSize: 9, color: '#7f1d1d', fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Denial Rate</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: '#dc2626', lineHeight: 1 }}>{fmtPct(payer.denialRate)}</div>
                <div style={{ fontSize: 10, color: '#7f1d1d', marginTop: 4 }}>Industry avg: 9.5%</div>
              </div>
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '14px 16px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 9, color: '#166534', fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Collection Rate</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: '#059669', lineHeight: 1 }}>{fmtPct(payer.collectionRate)}</div>
                <div style={{ fontSize: 10, color: '#166534', marginTop: 4 }}>Target: &gt;92%</div>
              </div>
              <div style={{ background: '#eff6ff', borderRadius: 10, padding: '14px 16px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: 9, color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Total Denials (Tracked)</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: '#1d4ed8', lineHeight: 1 }}>{totalDenials}</div>
                <div style={{ fontSize: 10, color: '#3b82f6', marginTop: 4 }}>{payer.denialReasons.length} distinct reasons</div>
              </div>
            </div>

            {/* Denial reasons with visual bars + donut */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, marginBottom: 18, alignItems: 'start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Top Denial Reasons</div>
                {payer.denialReasons.map((d, i) => (
                  <div key={i} style={{ marginBottom: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: DENIAL_COLORS[i] || '#6b7280', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{d.reason}</span>
                      </div>
                      <span style={{ color: '#6b7280', fontWeight: 700 }}>{d.count} claims · {d.pct}%</span>
                    </div>
                    <div style={{ height: 9, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ width: d.pct + '%', height: '100%', background: DENIAL_COLORS[i] || '#6b7280', borderRadius: 5, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Simple pie chart using SVG */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 8 }}>Distribution</div>
                <svg width={110} height={110} viewBox="0 0 110 110">
                  {(() => {
                    let start = -90;
                    return payer.denialReasons.map((d, i) => {
                      const angle = (d.pct / 100) * 360;
                      const r = 46;
                      const cx = 55, cy = 55;
                      const startRad = (start * Math.PI) / 180;
                      const endRad = ((start + angle) * Math.PI) / 180;
                      const x1 = cx + r * Math.cos(startRad);
                      const y1 = cy + r * Math.sin(startRad);
                      const x2 = cx + r * Math.cos(endRad);
                      const y2 = cy + r * Math.sin(endRad);
                      const large = angle > 180 ? 1 : 0;
                      const d2 = `M${cx},${cy} L${x1},${y1} A${r},${r},0,${large},1,${x2},${y2} Z`;
                      start += angle;
                      return <path key={i} d={d2} fill={DENIAL_COLORS[i] || '#6b7280'} stroke="#fff" strokeWidth="2" />;
                    });
                  })()}
                  <circle cx={55} cy={55} r={28} fill="#fff" />
                  <text x={55} y={52} textAnchor="middle" style={{ fontSize: 13, fontWeight: 900, fill: '#1e293b', fontFamily: 'inherit' }}>{fmtPct(payer.denialRate)}</text>
                  <text x={55} y={64} textAnchor="middle" style={{ fontSize: 8, fill: '#6b7280', fontFamily: 'inherit' }}>denial</text>
                </svg>
              </div>
            </div>

            {/* 6-month trend */}
            {extra.monthlyTrend && (
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '13px 15px', border: '1px solid #e2e8f0', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>📉 Denial Rate Trend (6 months)</div>
                <Sparkline data={extra.monthlyTrend} color="#ef4444" width={340} height={48} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingRight: 4 }}>
                  {['Nov','Dec','Jan','Feb','Mar','Apr'].map((m, i) => (
                    <div key={m} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: '#9ca3af' }}>{m}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444' }}>{extra.monthlyTrend[i]}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prevention tips */}
            <div style={{ background: '#fffbeb', borderRadius: 10, padding: '13px 16px', border: '1px solid #fde68a' }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#92400e', marginBottom: 8 }}>💡 Denial Prevention Recommendations</div>
              <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.75 }}>
                {payer.denialReasons[0] && <div>• <strong>{payer.denialReasons[0].reason}</strong> is your #1 denial cause — ensure pre-auth is obtained before every visit for required codes.</div>}
                {payer.underpaymentAlerts.length > 0 && <div>• Review {payer.underpaymentAlerts.length} underpayment alert{payer.underpaymentAlerts.length > 1 ? 's' : ''} — file appeals within 60 days of EOB receipt.</div>}
                <div>• Run eligibility checks within 24 hours of appointment for all {payer.name} patients.</div>
                <div>• Configure your workflow to flag claims older than 30 days as needing follow-up before the {payer.timelyFilingDays}-day timely filing deadline.</div>
                {payer.denialReasons.some(d => d.reason.toLowerCase().includes('modifier')) && <div>• Add a scrubber rule for modifier requirements specific to {payer.name}.</div>}
              </div>
            </div>
          </div>
        )}

        {/* ── Contract & Contacts ── */}
        {tab === 'contract' && (
          <div>
            {/* Contract info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
              {[
                { label: 'Contract Effective', val: extra.contractEffective ? new Date(extra.contractEffective + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A', icon: '📅' },
                { label: 'Contract Expiry', val: extra.contractExpiry ? new Date(extra.contractExpiry + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No expiry', icon: '⏳', warn: extra.contractExpiry && new Date(extra.contractExpiry) < new Date('2026-12-31') },
                { label: 'Credentialing Status', val: extra.credentialingStatus || 'Active', icon: '🏅', warn: extra.credentialingStatus === 'Renewal Pending' },
              ].map(s => (
                <div key={s.label} style={{ background: s.warn ? '#fffbeb' : '#f8fafc', borderRadius: 10, padding: '13px 15px', border: '1px solid ' + (s.warn ? '#fde68a' : '#e2e8f0') }}>
                  <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>{s.icon} {s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: s.warn ? '#92400e' : '#1e293b' }}>{s.val}</div>
                  {s.warn && <div style={{ fontSize: 10, color: '#d97706', marginTop: 3 }}>⚠️ Action may be needed</div>}
                </div>
              ))}
            </div>

            {/* Plan types + network */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '13px 15px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: 11, color: '#374151', marginBottom: 8 }}>🌐 Network & Plan Types</div>
                <div style={{ fontSize: 12, color: '#1e293b', fontWeight: 600, marginBottom: 6 }}>{extra.networkName || payer.name}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(extra.planTypes || []).map(pt => (
                    <span key={pt} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 5, padding: '3px 9px', fontSize: 11, fontWeight: 600 }}>{pt}</span>
                  ))}
                </div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '13px 15px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: 11, color: '#374151', marginBottom: 8 }}>💳 Credentialing Info</div>
                {[
                  ['Status', extra.credentialingStatus || 'Active'],
                  ['Expiry', extra.credentialingExpiry ? new Date(extra.credentialingExpiry + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'],
                  ['Clearinghouse', payer.clearinghouse],
                  ['EDI Payer ID', payer.payerId],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#6b7280' }}>{k}</span>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact directory */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>📞 Contact Directory</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {(extra.contacts || []).map((c, i) => {
                  const deptColors = { 'Provider Relations': '#1d4ed8', 'Claims': '#059669', 'Prior Auth': '#dc2626', 'Appeals': '#6d28d9', 'LCD/Coverage': '#b91c1c' };
                  const col = deptColors[c.dept] || '#374151';
                  return (
                    <div key={i} style={{ borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <div style={{ background: col, padding: '8px 13px', color: '#fff', fontWeight: 700, fontSize: 11 }}>{c.dept}</div>
                      <div style={{ padding: '11px 13px', background: '#f8fafc' }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: '#1e293b', marginBottom: 5 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: '#374151', marginBottom: 3 }}>
                          <a href={'tel:' + c.phone.replace(/[^0-9]/g, '')} style={{ color: col, fontWeight: 600, textDecoration: 'none' }}>📞 {c.phone}</a>
                        </div>
                        <div style={{ fontSize: 11, color: '#374151', marginBottom: 3 }}>✉️ {c.email}</div>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>⏰ {c.hours}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Claim Activity ── */}
        {tab === 'activity' && (
          <div>
            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
              {[
                { label: 'Claims on File', val: (extra.recentClaims || []).length, color: '#6366f1' },
                { label: 'Paid', val: (extra.recentClaims || []).filter(c => c.status === 'Paid').length, color: '#059669' },
                { label: 'Pending / Open', val: (extra.recentClaims || []).filter(c => !['Paid','Denied'].includes(c.status)).length, color: '#f59e0b' },
                { label: 'Denied', val: (extra.recentClaims || []).filter(c => c.status === 'Denied').length, color: '#dc2626' },
              ].map(s => (
                <div key={s.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #e2e8f0', borderLeft: '4px solid ' + s.color }}>
                  <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Recent claim table */}
            {(extra.recentClaims || []).length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9ca3af', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>No recent claims tracked for {payer.name}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Claims submitted to this payer will appear here.</div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Recent Claims</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      {['Claim #', 'Service Date', 'CPT', 'Paid', 'Status', 'Days to Pay'].map(h => (
                        <th key={h} style={{ padding: '9px 12px', textAlign: h === 'Paid' ? 'right' : 'left', fontWeight: 700, fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(extra.recentClaims || []).map((c, i) => {
                      const ST = { Paid: { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' }, Denied: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' }, Generated: { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' }, Processed: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' }, Submitted: { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' } };
                      const s = ST[c.status] || ST.Generated;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'monospace', fontSize: 11, color: '#1d4ed8' }}>{c.id}</td>
                          <td style={{ padding: '10px 12px', fontSize: 11 }}>{new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 7px', borderRadius: 4, fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}>{c.cpt}</span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: c.amount > 0 ? '#059669' : '#9ca3af' }}>{c.amount > 0 ? fmt$(c.amount) : '—'}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ background: s.bg, color: s.color, border: '1px solid ' + s.border, padding: '3px 9px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{c.status}</span>
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: c.days > 45 ? '#dc2626' : c.days > 20 ? '#d97706' : '#059669' }}>
                            {c.days}d {c.days > 45 ? '⚠️' : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ marginTop: 14, padding: '11px 14px', background: '#eff6ff', borderRadius: 9, border: '1px solid #bfdbfe', fontSize: 12, color: '#1e3a8a' }}>
                  <strong>💡 Tip:</strong> View the full claims register for {payer.name} in <a href="/billing/claims" style={{ color: payer.color, fontWeight: 700 }}>Claims Management</a> with advanced filtering, ERA posting, and appeal workflows.
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PayerProfiles() {
  const [selectedId, setSelectedId] = useState('bcbs');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const filteredPayers = useMemo(() => {
    let list = PAYERS.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'denialRate') return b.denialRate - a.denialRate;
      if (sortBy === 'avgDays') return b.avgDaysToPay - a.avgDaysToPay;
      if (sortBy === 'collection') return b.collectionRate - a.collectionRate;
      return 0;
    });
    return list;
  }, [search, sortBy]);

  const selectedPayer = PAYERS.find(p => p.id === selectedId) || PAYERS[0];

  const totalAlerts = PAYERS.reduce((s, p) => s + p.underpaymentAlerts.length, 0);
  const avgDenial = (PAYERS.reduce((s, p) => s + p.denialRate, 0) / PAYERS.length).toFixed(1);

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🏥 Payer Profiles</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Contract rates, auth requirements, timely filing limits, and denial analytics per payer</p>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Active Payers', value: PAYERS.length, color: '#6366f1' },
          { label: 'Avg Denial Rate', value: avgDenial + '%', color: '#ef4444' },
          { label: 'Underpayment Alerts', value: totalAlerts, color: '#f59e0b' },
          { label: 'Best Payer', value: 'BCBS', color: '#059669' },
          { label: 'Worst Payer', value: 'Anthem', color: '#dc2626' },
          { label: 'Shortest Filing', value: '90 days (UHC)', color: '#dc2626' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', borderLeft: '4px solid ' + s.color }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>

        {/* Left: payer list */}
        <div>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
            <input className="form-input" placeholder="Search payers..." value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: 13, marginBottom: 8 }} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="form-input" style={{ fontSize: 12 }}>
              <option value="name">Sort: Name</option>
              <option value="denialRate">Sort: Denial Rate ↓</option>
              <option value="avgDays">Sort: Slowest Payer</option>
              <option value="collection">Sort: Collection Rate ↓</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredPayers.map(p => (
              <PayerCard key={p.id} payer={p} selected={selectedId === p.id} onClick={() => setSelectedId(p.id)} />
            ))}
          </div>
        </div>

        {/* Right: detail */}
        <PayerDetail payer={selectedPayer} />
      </div>
    </div>
  );
}
