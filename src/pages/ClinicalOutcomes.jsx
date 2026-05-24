import React, { useState, useMemo } from 'react';

// ─── Outcome Measure Data ─────────────────────────────────────────────────────
const OUTCOME_PATIENTS = [
  {
    id: 'op1', name: 'James Anderson', mrn: 'MRN-00001', provider: 'Dr. Chris L.',
    diagnoses: ['F31.81 Bipolar II', 'F90.0 ADHD'],
    treatmentStart: '2025-11-01',
    measures: {
      'PHQ-9': [
        { date: '2025-11-01', score: 18, label: 'Moderate-Severe' },
        { date: '2025-12-01', score: 15, label: 'Moderate' },
        { date: '2026-01-15', score: 12, label: 'Moderate' },
        { date: '2026-02-14', score: 9,  label: 'Mild' },
        { date: '2026-03-12', score: 7,  label: 'Mild' },
        { date: '2026-04-15', score: 5,  label: 'None-Minimal' },
        { date: '2026-05-14', score: 4,  label: 'None-Minimal' },
      ],
      'MDQ': [
        { date: '2025-11-01', score: 9,  label: 'High Risk' },
        { date: '2026-01-15', score: 6,  label: 'Moderate Risk' },
        { date: '2026-03-12', score: 4,  label: 'Low Risk' },
        { date: '2026-05-14', score: 3,  label: 'Low Risk' },
      ],
    },
    goalProgress: 72, goalsMet: 1, goalsTotal: 3,
    sessionAttendance: 92, crisisEvents: 0, hospitalizations: 0,
    clinicId: 'clinic-main',
  },
  {
    id: 'op2', name: 'Maria Garcia', mrn: 'MRN-00002', provider: 'April Torres, LCSW',
    diagnoses: ['F41.1 GAD', 'F43.10 PTSD'],
    treatmentStart: '2026-02-01',
    measures: {
      'GAD-7': [
        { date: '2026-02-01', score: 16, label: 'Severe' },
        { date: '2026-03-01', score: 14, label: 'Severe' },
        { date: '2026-04-01', score: 11, label: 'Moderate' },
        { date: '2026-05-01', score: 9,  label: 'Moderate' },
      ],
      'PCL-5': [
        { date: '2026-02-01', score: 52, label: 'Probable PTSD' },
        { date: '2026-03-15', score: 44, label: 'Elevated' },
        { date: '2026-05-01', score: 38, label: 'Elevated' },
      ],
    },
    goalProgress: 35, goalsMet: 0, goalsTotal: 3,
    sessionAttendance: 88, crisisEvents: 0, hospitalizations: 0,
    clinicId: 'clinic-main',
  },
  {
    id: 'op3', name: 'David Thompson', mrn: 'MRN-00003', provider: 'April Torres, LCSW',
    diagnoses: ['F11.20 Opioid Use Disorder'],
    treatmentStart: '2025-09-15',
    measures: {
      'PHQ-9': [
        { date: '2025-09-15', score: 14, label: 'Moderate' },
        { date: '2025-11-01', score: 11, label: 'Moderate' },
        { date: '2026-01-01', score: 8,  label: 'Mild' },
        { date: '2026-03-01', score: 6,  label: 'Mild' },
        { date: '2026-05-01', score: 4,  label: 'None-Minimal' },
      ],
      'AUDIT-C': [
        { date: '2025-09-15', score: 11, label: 'Harmful Use' },
        { date: '2026-01-01', score: 5,  label: 'Hazardous' },
        { date: '2026-05-01', score: 2,  label: 'Low Risk' },
      ],
    },
    goalProgress: 68, goalsMet: 2, goalsTotal: 4,
    sessionAttendance: 79, crisisEvents: 1, hospitalizations: 0,
    clinicId: 'clinic-north',
  },
  {
    id: 'op4', name: 'Emily Chen', mrn: 'MRN-00004', provider: 'Dr. Michael Johnson',
    diagnoses: ['F90.0 ADHD'],
    treatmentStart: '2025-08-01',
    measures: {
      'ASRS': [
        { date: '2025-08-01', score: 24, label: 'High ADHD' },
        { date: '2025-10-01', score: 20, label: 'High ADHD' },
        { date: '2026-01-01', score: 15, label: 'Moderate' },
        { date: '2026-03-01', score: 10, label: 'Mild' },
        { date: '2026-05-01', score: 7,  label: 'Low' },
      ],
    },
    goalProgress: 85, goalsMet: 3, goalsTotal: 4,
    sessionAttendance: 95, crisisEvents: 0, hospitalizations: 0,
    clinicId: 'clinic-north',
  },
  {
    id: 'op5', name: 'Aisha Patel', mrn: 'MRN-00005', provider: 'Dr. Chris L.',
    diagnoses: ['F31.32 Bipolar Depressed'],
    treatmentStart: '2026-01-10',
    measures: {
      'PHQ-9': [
        { date: '2026-01-10', score: 19, label: 'Severe' },
        { date: '2026-02-10', score: 17, label: 'Moderate-Severe' },
        { date: '2026-03-10', score: 14, label: 'Moderate' },
        { date: '2026-04-10', score: 11, label: 'Moderate' },
        { date: '2026-05-10', score: 9,  label: 'Mild' },
      ],
      'MDQ': [
        { date: '2026-01-10', score: 8,  label: 'High Risk' },
        { date: '2026-03-10', score: 5,  label: 'Moderate Risk' },
        { date: '2026-05-10', score: 3,  label: 'Low Risk' },
      ],
    },
    goalProgress: 48, goalsMet: 0, goalsTotal: 2,
    sessionAttendance: 83, crisisEvents: 1, hospitalizations: 1,
    clinicId: 'clinic-main',
  },
  {
    id: 'op6', name: 'Marcus Johnson', mrn: 'MRN-00006', provider: 'Dr. Michael Johnson',
    diagnoses: ['F33.1 MDD Recurrent', 'F41.1 GAD'],
    treatmentStart: '2025-06-01',
    measures: {
      'PHQ-9': [
        { date: '2025-06-01', score: 22, label: 'Severe' },
        { date: '2025-08-01', score: 17, label: 'Moderate-Severe' },
        { date: '2025-10-01', score: 12, label: 'Moderate' },
        { date: '2025-12-01', score: 8,  label: 'Mild' },
        { date: '2026-02-01', score: 5,  label: 'None-Minimal' },
        { date: '2026-04-01', score: 3,  label: 'None-Minimal' },
      ],
      'GAD-7': [
        { date: '2025-06-01', score: 18, label: 'Severe' },
        { date: '2025-10-01', score: 12, label: 'Moderate' },
        { date: '2026-02-01', score: 7,  label: 'Mild' },
        { date: '2026-04-01', score: 4,  label: 'Minimal' },
      ],
    },
    goalProgress: 100, goalsMet: 4, goalsTotal: 4,
    sessionAttendance: 97, crisisEvents: 0, hospitalizations: 0,
    clinicId: 'clinic-south',
  },
];

// Outcome measure thresholds for severity bands
const MEASURE_BANDS = {
  'PHQ-9':  [{ max: 4, label: 'Minimal', color: '#059669' }, { max: 9, label: 'Mild', color: '#84cc16' }, { max: 14, label: 'Moderate', color: '#f59e0b' }, { max: 19, label: 'Mod-Severe', color: '#f97316' }, { max: 27, label: 'Severe', color: '#dc2626' }],
  'GAD-7':  [{ max: 4, label: 'Minimal', color: '#059669' }, { max: 9, label: 'Mild', color: '#84cc16' }, { max: 14, label: 'Moderate', color: '#f59e0b' }, { max: 21, label: 'Severe', color: '#dc2626' }],
  'ASRS':   [{ max: 10, label: 'Low', color: '#059669' }, { max: 17, label: 'Moderate', color: '#f59e0b' }, { max: 24, label: 'High', color: '#dc2626' }],
  'PCL-5':  [{ max: 31, label: 'Below Threshold', color: '#059669' }, { max: 50, label: 'Elevated', color: '#f59e0b' }, { max: 80, label: 'Probable PTSD', color: '#dc2626' }],
  'MDQ':    [{ max: 4, label: 'Low Risk', color: '#059669' }, { max: 7, label: 'Moderate Risk', color: '#f59e0b' }, { max: 13, label: 'High Risk', color: '#dc2626' }],
  'AUDIT-C':[{ max: 3, label: 'Low Risk', color: '#059669' }, { max: 7, label: 'Hazardous', color: '#f59e0b' }, { max: 12, label: 'Harmful', color: '#dc2626' }],
};

const PROVIDERS = ['All Providers', 'Dr. Chris L.', 'April Torres, LCSW', 'Dr. Michael Johnson'];
const CLINICS   = ['All Clinics', 'Main Clinic', 'North Clinic', 'South Clinic'];
const CLINIC_MAP = { 'clinic-main': 'Main Clinic', 'clinic-north': 'North Clinic', 'clinic-south': 'South Clinic' };

function getSeverityColor(measure, score) {
  const bands = MEASURE_BANDS[measure];
  if (!bands) return '#6366f1';
  for (const b of bands) if (score <= b.max) return b.color;
  return '#dc2626';
}

function getReduction(measures) {
  const allMeasures = Object.values(measures);
  let totalReduction = 0, count = 0;
  allMeasures.forEach(pts => {
    if (pts.length >= 2) {
      const first = pts[0].score, last = pts[pts.length - 1].score;
      if (first > 0) { totalReduction += ((first - last) / first) * 100; count++; }
    }
  });
  return count > 0 ? Math.round(totalReduction / count) : 0;
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────
function OutcomeLineChart({ data, measure, width = 460, height = 160 }) {
  if (!data || data.length < 2) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>Insufficient data points</div>;

  const bands = MEASURE_BANDS[measure] || [];
  const maxBand = bands.length > 0 ? bands[bands.length - 1].max : Math.max(...data.map(d => d.score)) * 1.2;
  const padX = 40, padY = 18, padBottom = 28, padRight = 12;
  const chartW = width - padX - padRight;
  const chartH = height - padY - padBottom;

  const xScale = (i) => padX + (i / (data.length - 1)) * chartW;
  const yScale = (v) => padY + chartH - (v / maxBand) * chartH;

  const pathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(d.score).toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${xScale(data.length - 1).toFixed(1)} ${(padY + chartH).toFixed(1)} L ${xScale(0).toFixed(1)} ${(padY + chartH).toFixed(1)} Z`;

  const scoreColor = getSeverityColor(measure, data[data.length - 1].score);
  const improving  = data[data.length - 1].score <= data[0].score;

  // Y-axis ticks
  const yTicks = [0, Math.round(maxBand * 0.25), Math.round(maxBand * 0.5), Math.round(maxBand * 0.75), Math.round(maxBand)];

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${measure}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={improving ? '#059669' : '#dc2626'} stopOpacity="0.18" />
          <stop offset="100%" stopColor={improving ? '#059669' : '#dc2626'} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTicks.map(t => (
        <g key={t}>
          <line x1={padX} x2={padX + chartW} y1={yScale(t)} y2={yScale(t)} stroke="#f1f5f9" strokeWidth={1} />
          <text x={padX - 4} y={yScale(t) + 4} textAnchor="end" fontSize={9} fill="#9ca3af">{t}</text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaD} fill={`url(#grad-${measure})`} />

      {/* Line */}
      <path d={pathD} fill="none" stroke={improving ? '#059669' : '#dc2626'} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points + labels */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xScale(i)} cy={yScale(d.score)} r={4} fill={getSeverityColor(measure, d.score)} stroke="#fff" strokeWidth={1.5} />
          <text x={xScale(i)} y={yScale(d.score) - 8} textAnchor="middle" fontSize={9} fontWeight={700} fill={getSeverityColor(measure, d.score)}>{d.score}</text>
          <text x={xScale(i)} y={padY + chartH + 16} textAnchor="middle" fontSize={8.5} fill="#9ca3af">
            {new Date(d.date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </text>
        </g>
      ))}

      {/* Y-axis line */}
      <line x1={padX} x2={padX} y1={padY} y2={padY + chartH} stroke="#e2e8f0" strokeWidth={1} />
    </svg>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function MiniSparkline({ data, color, w = 60, h = 22 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Score Badge ──────────────────────────────────────────────────────────────
function ScoreBadge({ measure, score }) {
  const c = getSeverityColor(measure, score);
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 12, background: c + '22', color: c, border: '1px solid ' + c + '55' }}>
      {measure} {score}
    </span>
  );
}

// ─── Patient Outcome Card ─────────────────────────────────────────────────────
function PatientOutcomeRow({ patient, selected, onClick }) {
  const reduction = getReduction(patient.measures);
  const latestMeasure = Object.keys(patient.measures)[0];
  const measureData = patient.measures[latestMeasure] || [];
  const latestScore = measureData[measureData.length - 1]?.score ?? 0;
  const firstScore  = measureData[0]?.score ?? latestScore;
  const trend = latestScore < firstScore ? '↓ Improving' : latestScore > firstScore ? '↑ Worsening' : '→ Stable';
  const trendColor = latestScore < firstScore ? '#059669' : latestScore > firstScore ? '#dc2626' : '#6366f1';

  return (
    <div onClick={onClick} style={{ padding: '12px 14px', cursor: 'pointer', background: selected ? '#eff6ff' : '#fff', borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s', borderLeft: '3px solid ' + (selected ? '#3b82f6' : 'transparent') }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{patient.name}</div>
          <div style={{ fontSize: 10, color: '#6b7280' }}>{patient.mrn} · {patient.provider}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: trendColor }}>{trend}</div>
          <div style={{ fontSize: 10, color: '#9ca3af' }}>{reduction}% reduction</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {Object.entries(patient.measures).map(([m, pts]) => (
          <ScoreBadge key={m} measure={m} score={pts[pts.length - 1].score} />
        ))}
        <MiniSparkline data={measureData.map(p => p.score)} color={trendColor} />
      </div>
    </div>
  );
}

// ─── Practice Bar ─────────────────────────────────────────────────────────────
function HBar({ label, value, max, color }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
        <span style={{ fontWeight: 600, color: '#374151', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ fontWeight: 800, color }}>{value}%</span>
      </div>
      <div style={{ height: 7, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: value + '%', height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ClinicalOutcomes() {
  const [selectedPatientId, setSelectedPatientId] = useState('op1');
  const [providerFilter, setProviderFilter] = useState('All Providers');
  const [clinicFilter, setClinicFilter] = useState('All Clinics');
  const [activeMeasure, setActiveMeasure] = useState(null);
  const [tab, setTab] = useState('individual');

  const filteredPatients = useMemo(() => {
    return OUTCOME_PATIENTS.filter(p => {
      if (providerFilter !== 'All Providers' && p.provider !== providerFilter) return false;
      if (clinicFilter !== 'All Clinics' && CLINIC_MAP[p.clinicId] !== clinicFilter) return false;
      return true;
    });
  }, [providerFilter, clinicFilter]);

  const selectedPatient = OUTCOME_PATIENTS.find(p => p.id === selectedPatientId) || OUTCOME_PATIENTS[0];

  // Practice-level stats
  const totalPatients = filteredPatients.length;
  const avgReduction = Math.round(filteredPatients.reduce((s, p) => s + getReduction(p.measures), 0) / (totalPatients || 1));
  const pctImproved  = Math.round(filteredPatients.filter(p => getReduction(p.measures) > 20).length / (totalPatients || 1) * 100);
  const totalGoalsMet = filteredPatients.reduce((s, p) => s + p.goalsMet, 0);
  const totalGoals    = filteredPatients.reduce((s, p) => s + p.goalsTotal, 0);
  const goalAchRate   = totalGoals > 0 ? Math.round((totalGoalsMet / totalGoals) * 100) : 0;
  const crisisCount   = filteredPatients.reduce((s, p) => s + p.crisisEvents, 0);
  const hospCount     = filteredPatients.reduce((s, p) => s + p.hospitalizations, 0);
  const avgAttendance = Math.round(filteredPatients.reduce((s, p) => s + p.sessionAttendance, 0) / (totalPatients || 1));

  // Provider outcomes
  const providerStats = useMemo(() => {
    const map = {};
    filteredPatients.forEach(p => {
      if (!map[p.provider]) map[p.provider] = { reduction: [], count: 0 };
      map[p.provider].reduction.push(getReduction(p.measures));
      map[p.provider].count++;
    });
    return Object.entries(map).map(([prov, d]) => ({
      provider: prov,
      avgReduction: Math.round(d.reduction.reduce((s, v) => s + v, 0) / d.reduction.length),
      count: d.count,
    })).sort((a, b) => b.avgReduction - a.avgReduction);
  }, [filteredPatients]);

  // Diagnosis outcomes
  const diagnosisStats = useMemo(() => {
    const map = {};
    filteredPatients.forEach(p => {
      p.diagnoses.forEach(dx => {
        const key = dx.split(' ')[0]; // ICD code only
        if (!map[key]) map[key] = { label: dx, reductions: [], count: 0 };
        map[key].reductions.push(getReduction(p.measures));
        map[key].count++;
      });
    });
    return Object.values(map).map(d => ({
      label: d.label,
      avgReduction: Math.round(d.reductions.reduce((s, v) => s + v, 0) / d.reductions.length),
      count: d.count,
    })).sort((a, b) => b.avgReduction - a.avgReduction).slice(0, 6);
  }, [filteredPatients]);

  const patientMeasures = Object.keys(selectedPatient.measures);
  const currentMeasure  = activeMeasure && patientMeasures.includes(activeMeasure) ? activeMeasure : patientMeasures[0];
  const currentData     = selectedPatient.measures[currentMeasure] || [];
  const latestScore     = currentData[currentData.length - 1]?.score ?? 0;
  const firstScore      = currentData[0]?.score ?? latestScore;
  const scoreReduction  = firstScore > 0 ? Math.round(((firstScore - latestScore) / firstScore) * 100) : 0;

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>📈 Clinical Outcomes</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>PHQ-9 · GAD-7 · PCL-5 · ASRS · MDQ trending, goal achievement, and population analytics</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)} className="form-input" style={{ fontSize: 12 }}>
            {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={clinicFilter} onChange={e => setClinicFilter(e.target.value)} className="form-input" style={{ fontSize: 12 }}>
            {CLINICS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* KPI bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Patients Tracked', value: totalPatients, color: '#6366f1', icon: '👥' },
          { label: '% Improved (>20%)', value: pctImproved + '%', color: '#059669', icon: '📉' },
          { label: 'Avg Score Reduction', value: avgReduction + '%', color: '#3b82f6', icon: '📊' },
          { label: 'Goal Achievement', value: goalAchRate + '%', color: '#f59e0b', icon: '🎯' },
          { label: 'Attendance Rate', value: avgAttendance + '%', color: '#10b981', icon: '📅' },
          { label: 'Crisis Events', value: crisisCount, color: crisisCount > 0 ? '#dc2626' : '#059669', icon: '🚨' },
          { label: 'Hospitalizations', value: hospCount, color: hospCount > 0 ? '#dc2626' : '#059669', icon: '🏥' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', borderLeft: '4px solid ' + s.color }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[['individual','👤 Patient View'], ['population','🏥 Population View']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 18px', border: 'none', background: 'transparent', fontWeight: tab === t ? 700 : 500, fontSize: 13, cursor: 'pointer', color: tab === t ? '#2563eb' : '#6b7280', borderBottom: '2px solid ' + (tab === t ? '#2563eb' : 'transparent'), transition: 'all 0.15s' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Individual Patient View ── */}
      {tab === 'individual' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
          {/* Patient list */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 12, color: '#374151', background: '#f8fafc' }}>
              Patients ({filteredPatients.length})
            </div>
            {filteredPatients.length === 0
              ? <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>No patients match filters</div>
              : filteredPatients.map(p => (
                <PatientOutcomeRow key={p.id} patient={p} selected={selectedPatientId === p.id} onClick={() => { setSelectedPatientId(p.id); setActiveMeasure(null); }} />
              ))
            }
          </div>

          {/* Patient detail */}
          <div>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
              {/* Patient header */}
              <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg, #eff6ff, #f0f9ff)', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{selectedPatient.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{selectedPatient.provider} · Treatment started {new Date(selectedPatient.treatmentStart + 'T00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · {CLINIC_MAP[selectedPatient.clinicId]}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {selectedPatient.diagnoses.map(d => <span key={d} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#dbeafe', color: '#1e40af', fontWeight: 700 }}>{d}</span>)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[['Goal Progress', selectedPatient.goalProgress + '%', selectedPatient.goalProgress >= 75 ? '#059669' : '#d97706'], ['Attendance', selectedPatient.sessionAttendance + '%', selectedPatient.sessionAttendance >= 85 ? '#059669' : '#d97706'], ['Goals Met', selectedPatient.goalsMet + '/' + selectedPatient.goalsTotal, '#6366f1']].map(([l, v, c]) => (
                      <div key={l} style={{ textAlign: 'center', padding: '8px 12px', borderRadius: 8, background: '#fff', border: '1px solid #e2e8f0', minWidth: 72 }}>
                        <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Measure tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 4px' }}>
                {patientMeasures.map(m => (
                  <button key={m} onClick={() => setActiveMeasure(m)}
                    style={{ padding: '9px 16px', border: 'none', background: 'transparent', fontWeight: currentMeasure === m ? 700 : 500, fontSize: 12, cursor: 'pointer', color: currentMeasure === m ? getSeverityColor(m, latestScore) : '#6b7280', borderBottom: '2px solid ' + (currentMeasure === m ? getSeverityColor(m, latestScore) : 'transparent') }}>
                    {m}
                    <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 800, color: getSeverityColor(m, selectedPatient.measures[m][selectedPatient.measures[m].length - 1].score) }}>
                      {selectedPatient.measures[m][selectedPatient.measures[m].length - 1].score}
                    </span>
                  </button>
                ))}
              </div>

              {/* Chart area */}
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{currentMeasure} Trajectory</span>
                    <span style={{ marginLeft: 10, fontSize: 11, padding: '2px 8px', borderRadius: 8, background: getSeverityColor(currentMeasure, latestScore) + '22', color: getSeverityColor(currentMeasure, latestScore), fontWeight: 700 }}>
                      Current: {latestScore} — {currentData[currentData.length - 1]?.label}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: scoreReduction > 0 ? '#059669' : '#dc2626' }}>
                      {scoreReduction > 0 ? '↓ ' : '↑ '}{Math.abs(scoreReduction)}% vs baseline
                    </span>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>Baseline: {firstScore}</div>
                  </div>
                </div>
                <OutcomeLineChart data={currentData} measure={currentMeasure} />

                {/* Score scale legend */}
                {MEASURE_BANDS[currentMeasure] && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {MEASURE_BANDS[currentMeasure].map((b, i) => (
                      <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: b.color + '18', color: b.color, fontWeight: 700, border: '1px solid ' + b.color + '44' }}>
                        {b.label} (≤{b.max})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* All measures summary */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>All Outcome Measures</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {Object.entries(selectedPatient.measures).map(([m, pts]) => {
                  const latest = pts[pts.length - 1];
                  const first  = pts[0];
                  const red    = first.score > 0 ? Math.round(((first.score - latest.score) / first.score) * 100) : 0;
                  const c      = getSeverityColor(m, latest.score);
                  return (
                    <div key={m} onClick={() => setActiveMeasure(m)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid ' + (currentMeasure === m ? c : '#e2e8f0'), background: currentMeasure === m ? c + '0d' : '#f8fafc', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#374151' }}>{m}</span>
                        <span style={{ fontSize: 14, fontWeight: 900, color: c }}>{latest.score}</span>
                      </div>
                      <div style={{ fontSize: 10, color: c, fontWeight: 700, marginBottom: 4 }}>{latest.label}</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>{red > 0 ? '↓ ' + red + '% reduction' : '→ Baseline: ' + first.score}</div>
                      <MiniSparkline data={pts.map(p => p.score)} color={c} w={80} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Population View ── */}
      {tab === 'population' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* Provider outcomes */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>👨‍⚕️ Outcomes by Provider</div>
            {providerStats.map(p => (
              <HBar key={p.provider} label={`${p.provider} (n=${p.count})`} value={p.avgReduction} max={100} color={p.avgReduction >= 50 ? '#059669' : p.avgReduction >= 30 ? '#f59e0b' : '#dc2626'} />
            ))}
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 8 }}>Average symptom score reduction vs. baseline</div>
          </div>

          {/* Diagnosis outcomes */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🧪 Outcomes by Diagnosis</div>
            {diagnosisStats.map(d => (
              <HBar key={d.label} label={`${d.label} (n=${d.count})`} value={d.avgReduction} max={100} color={d.avgReduction >= 50 ? '#059669' : d.avgReduction >= 30 ? '#f59e0b' : '#dc2626'} />
            ))}
          </div>

          {/* Goal achievement breakdown */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🎯 Goal Achievement Rates</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 14 }}>
              <svg width={88} height={88} viewBox="0 0 88 88">
                {(() => {
                  const r = 36, cx = 44, cy = 44, circ = 2 * Math.PI * r;
                  const offset = circ - (goalAchRate / 100) * circ;
                  return (
                    <>
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={9} />
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke={goalAchRate >= 70 ? '#059669' : '#f59e0b'} strokeWidth={9} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
                      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={16} fontWeight={800} fill={goalAchRate >= 70 ? '#059669' : '#f59e0b'}>{goalAchRate}%</text>
                    </>
                  );
                })()}
              </svg>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Overall Goal Achievement</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{totalGoalsMet} of {totalGoals} goals met</div>
              </div>
            </div>
            {filteredPatients.map(p => {
              const pct = p.goalsTotal > 0 ? Math.round((p.goalsMet / p.goalsTotal) * 100) : 0;
              return <HBar key={p.id} label={`${p.name} (${p.goalsMet}/${p.goalsTotal})`} value={pct} max={100} color={pct >= 75 ? '#059669' : pct >= 50 ? '#f59e0b' : '#dc2626'} />;
            })}
          </div>

          {/* Session attendance + safety */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>📅 Attendance & Safety Outcomes</div>
            {filteredPatients.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ fontSize: 12, fontWeight: 600, flex: 1, color: '#374151' }}>{p.name}</span>
                <div style={{ width: 80, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: p.sessionAttendance + '%', height: '100%', background: p.sessionAttendance >= 85 ? '#059669' : '#f59e0b', borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: p.sessionAttendance >= 85 ? '#059669' : '#f59e0b', minWidth: 34 }}>{p.sessionAttendance}%</span>
                {p.crisisEvents > 0 && <span style={{ fontSize: 10, padding: '2px 5px', background: '#fef2f2', color: '#dc2626', borderRadius: 4, fontWeight: 700 }}>🚨 {p.crisisEvents}</span>}
                {p.hospitalizations > 0 && <span style={{ fontSize: 10, padding: '2px 5px', background: '#fff7ed', color: '#c2410c', borderRadius: 4, fontWeight: 700 }}>🏥 {p.hospitalizations}</span>}
              </div>
            ))}
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 3 }}>Practice Average</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>{avgAttendance}% attendance · {crisisCount} crisis events · {hospCount} hospitalizations</div>
            </div>
          </div>

          {/* All patients outcome table */}
          <div style={{ gridColumn: '1/-1', background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 13 }}>📋 Outcomes Summary Table</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Patient', 'Provider', 'Clinic', 'Diagnoses', 'Primary Measure', 'Baseline', 'Current', 'Reduction', 'Goals Met', 'Attendance'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: ['Baseline','Current','Reduction','Goals Met','Attendance'].includes(h) ? 'center' : 'left', fontWeight: 700, fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p, i) => {
                  const primaryM = Object.keys(p.measures)[0];
                  const pts = p.measures[primaryM];
                  const baseline = pts[0].score;
                  const current  = pts[pts.length - 1].score;
                  const red      = baseline > 0 ? Math.round(((baseline - current) / baseline) * 100) : 0;
                  const redColor = red >= 40 ? '#059669' : red >= 20 ? '#f59e0b' : '#dc2626';
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 1 ? '#fafafa' : '#fff', cursor: 'pointer' }} onClick={() => { setSelectedPatientId(p.id); setTab('individual'); }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>{p.name}</td>
                      <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: 11 }}>{p.provider}</td>
                      <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: 11 }}>{CLINIC_MAP[p.clinicId]}</td>
                      <td style={{ padding: '8px 12px', fontSize: 10 }}>{p.diagnoses.map(d => d.split(' ')[0]).join(', ')}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366f1' }}>{primaryM}</span></td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: getSeverityColor(primaryM, baseline) }}>{baseline}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: getSeverityColor(primaryM, current) }}>{current}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: redColor }}>{red > 0 ? '↓ ' + red + '%' : '→ ' + Math.abs(red) + '%'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}><span style={{ fontWeight: 700, color: p.goalsMet === p.goalsTotal && p.goalsTotal > 0 ? '#059669' : '#f59e0b' }}>{p.goalsMet}/{p.goalsTotal}</span></td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: p.sessionAttendance >= 85 ? '#059669' : '#d97706' }}>{p.sessionAttendance}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
