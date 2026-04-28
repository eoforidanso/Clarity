import React, { useState, useMemo } from 'react';
import { usePatient } from '../contexts/PatientContext';

/* ── MIPS/HEDIS Quality Measures ─────────────────────────── */
const MEASURES = [
  {
    id: 'phq9',
    code: 'CMS-159',
    name: 'Depression Remission at 12 Months',
    category: 'MIPS',
    type: 'Outcome',
    description: 'Percentage of patients with major depression who achieved remission at 12 months.',
    target: 70,
    current: 68,
    eligible: 42,
    met: 29,
    trend: 'up',
  },
  {
    id: 'bmi',
    code: 'CMS-69',
    name: 'Preventive Care & Screening: BMI',
    category: 'MIPS',
    type: 'Process',
    description: 'BMI documented during the current encounter with follow-up plan if outside normal.',
    target: 85,
    current: 91,
    eligible: 64,
    met: 58,
    trend: 'up',
  },
  {
    id: 'tobacco',
    code: 'CMS-138',
    name: 'Tobacco Use Screening & Cessation',
    category: 'MIPS',
    type: 'Process',
    description: 'Tobacco use assessed and intervention provided or not applicable.',
    target: 90,
    current: 88,
    eligible: 64,
    met: 56,
    trend: 'stable',
  },
  {
    id: 'depression-screen',
    code: 'CMS-2',
    name: 'Screening for Depression & Follow-Up',
    category: 'MIPS',
    type: 'Process',
    description: 'Patients screened for depression with PHQ-2/PHQ-9 and follow-up documented.',
    target: 95,
    current: 96,
    eligible: 64,
    met: 61,
    trend: 'up',
  },
  {
    id: 'controlled-sub',
    code: 'CMS-460',
    name: 'Controlled Substance Risk Monitoring',
    category: 'MIPS',
    type: 'Process',
    description: 'PDMP checked for patients prescribed controlled substances.',
    target: 100,
    current: 97,
    eligible: 18,
    met: 17,
    trend: 'stable',
  },
  {
    id: 'followup-7day',
    code: 'HEDIS-FUH',
    name: 'Follow-Up After Hospitalization — 7 Day',
    category: 'HEDIS',
    type: 'Outcome',
    description: 'Follow-up within 7 days of mental health hospitalization discharge.',
    target: 80,
    current: 75,
    eligible: 8,
    met: 6,
    trend: 'down',
  },
  {
    id: 'followup-30day',
    code: 'HEDIS-FUM',
    name: 'Follow-Up After ED Visit — 30 Day',
    category: 'HEDIS',
    type: 'Outcome',
    description: 'Follow-up within 30 days of ED visit for mental health conditions.',
    target: 75,
    current: 82,
    eligible: 11,
    met: 9,
    trend: 'up',
  },
  {
    id: 'metabolic',
    code: 'HEDIS-SSD',
    name: 'Metabolic Monitoring — Antipsychotics',
    category: 'HEDIS',
    type: 'Process',
    description: 'Patients on antipsychotics with glucose and lipid testing in past year.',
    target: 85,
    current: 72,
    eligible: 14,
    met: 10,
    trend: 'down',
  },
  {
    id: 'med-adherence',
    code: 'HEDIS-SAA',
    name: 'Antidepressant Medication Management',
    category: 'HEDIS',
    type: 'Outcome',
    description: 'Continuation phase: remained on antidepressant for 180 days.',
    target: 60,
    current: 64,
    eligible: 28,
    met: 18,
    trend: 'stable',
  },
];

function MiniGauge({ pct, target, size = 60 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const targetDash = (target / 100) * circ;
  const color = pct >= target ? 'var(--success)' : pct >= target * 0.9 ? 'var(--warning)' : 'var(--danger)';
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-light)" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      {/* Target marker */}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--text-muted)" strokeWidth={1}
        strokeDasharray={`2 ${circ - 2}`} strokeDashoffset={-targetDash + 1} opacity={0.4}
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" style={{ fontSize: 13, fontWeight: 800, fill: color }}>{pct}%</text>
    </svg>
  );
}

export default function QualityMeasures() {
  const [filter, setFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [mipsSubmitted, setMipsSubmitted] = useState(false);
  const [mipsSubmitting, setMipsSubmitting] = useState(false);
  const [showImprovementActivities, setShowImprovementActivities] = useState(false);

  const filtered = useMemo(() => {
    return MEASURES.filter(m => {
      if (filter !== 'All' && m.category !== filter) return false;
      if (typeFilter !== 'All' && m.type !== typeFilter) return false;
      return true;
    });
  }, [filter, typeFilter]);

  const overall = useMemo(() => {
    const total = MEASURES.reduce((s, m) => s + m.eligible, 0);
    const met = MEASURES.reduce((s, m) => s + m.met, 0);
    return total > 0 ? Math.round((met / total) * 100) : 0;
  }, []);

  const meetingTarget = MEASURES.filter(m => m.current >= m.target).length;
  const needsImprovement = MEASURES.filter(m => m.current < m.target).length;

  // MIPS Score Calculations
  const mipsQualityScore = useMemo(() => {
    const weights = MEASURES.filter(m => m.category === 'MIPS');
    if (weights.length === 0) return 0;
    const avg = weights.reduce((s, m) => s + (m.current / m.target) * 100, 0) / weights.length;
    return Math.min(Math.round(avg * 0.45), 45); // Quality = 45% of MIPS
  }, []);
  const mipsCostScore = 22; // Simulated cost category score (max 30)
  const mipsIAScore = 15; // Improvement Activities (max 15)
  const mipsPIScore = useMemo(() => Math.round(overall * 0.1), [overall]); // Promoting Interoperability (max 10)
  const mipsFinalScore = mipsQualityScore + mipsCostScore + mipsIAScore + mipsPIScore;
  const mipsPaymentAdjustment = mipsFinalScore >= 75 ? '+2.34%' : mipsFinalScore >= 60 ? '+0.87%' : mipsFinalScore >= 45 ? '0%' : '-4%';

  const handleMipsSubmit = () => {
    setMipsSubmitting(true);
    setTimeout(() => {
      setMipsSubmitting(false);
      setMipsSubmitted(true);
    }, 2500);
  };

  const IMPROVEMENT_ACTIVITIES = [
    { name: 'Use of Telehealth Services', status: 'complete', weight: 'High', category: 'Access' },
    { name: 'Depression Screening', status: 'complete', weight: 'High', category: 'Population Management' },
    { name: 'Use of CDSM Tools', status: 'complete', weight: 'Medium', category: 'Clinical Decision Support' },
    { name: 'Collection of Patient Experience Data', status: 'in-progress', weight: 'Medium', category: 'Patient Safety' },
    { name: 'Evidence-Based Care Coordination', status: 'complete', weight: 'High', category: 'Care Coordination' },
    { name: 'Regular Training in QI Methods', status: 'in-progress', weight: 'Medium', category: 'QI' },
  ];

  const trendIcon = (t) => t === 'up' ? '📈' : t === 'down' ? '📉' : '➡️';

  return (
    <div className="fade-in" style={{ padding: 0 }}>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1>📊 Quality Measures (MIPS/HEDIS)</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Track clinical quality metrics for value-based reimbursement and regulatory compliance.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => alert('Report exported as PDF')}>📄 Export Report</button>
          <button className="btn btn-primary btn-sm">🔄 Refresh Data</button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card row blue fade-in">
          <div className="stat-icon blue">📊</div>
          <div className="stat-info"><h3>{overall}%</h3><p>Overall Performance</p></div>
        </div>
        <div className="stat-card row green fade-in">
          <div className="stat-icon green">✅</div>
          <div className="stat-info"><h3>{meetingTarget}</h3><p>Meeting Target</p></div>
        </div>
        <div className="stat-card row yellow fade-in">
          <div className="stat-icon yellow">⚠️</div>
          <div className="stat-info"><h3>{needsImprovement}</h3><p>Needs Improvement</p></div>
        </div>
        <div className="stat-card row teal fade-in">
          <div className="stat-icon teal">📋</div>
          <div className="stat-info"><h3>{MEASURES.length}</h3><p>Total Measures</p></div>
        </div>
      </div>

      {/* ── MIPS Auto-Reporting Panel ──────────── */}
      <div className="mips-auto-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3>🏛️ MIPS Auto-Reporting — Performance Year 2026</h3>
            <p>Automated CMS submission with real-time composite score calculation</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontWeight: 700, fontSize: 11 }}
              onClick={() => setShowImprovementActivities(!showImprovementActivities)}>
              📋 Improvement Activities
            </button>
          </div>
        </div>
        <div className="mips-submission-grid">
          <div className="mips-submission-card">
            <div className="label">Quality (45%)</div>
            <div className="value">{mipsQualityScore}<span style={{ fontSize: 12, opacity: 0.7 }}>/45</span></div>
            <div className="mips-improvement-badge">
              📈 {MEASURES.filter(m => m.category === 'MIPS' && m.trend === 'up').length} measures trending up
            </div>
          </div>
          <div className="mips-submission-card">
            <div className="label">Cost (30%)</div>
            <div className="value">{mipsCostScore}<span style={{ fontSize: 12, opacity: 0.7 }}>/30</span></div>
            <div className="mips-improvement-badge">📊 TPCC calculated</div>
          </div>
          <div className="mips-submission-card">
            <div className="label">Improvement (15%)</div>
            <div className="value">{mipsIAScore}<span style={{ fontSize: 12, opacity: 0.7 }}>/15</span></div>
            <div className="mips-improvement-badge">✅ 4/6 activities complete</div>
          </div>
          <div className="mips-submission-card">
            <div className="label">Promoting Interop (10%)</div>
            <div className="value">{mipsPIScore}<span style={{ fontSize: 12, opacity: 0.7 }}>/10</span></div>
            <div className="mips-improvement-badge">🔗 e-Prescribing active</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>
              {mipsFinalScore}<span style={{ fontSize: 14, opacity: 0.7 }}>/100</span>
              <span style={{ fontSize: 14, marginLeft: 12, padding: '4px 12px', borderRadius: 20, background: mipsFinalScore >= 75 ? 'rgba(34,197,94,0.3)' : mipsFinalScore >= 60 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)' }}>
                {mipsFinalScore >= 75 ? '🌟 Exceptional' : mipsFinalScore >= 60 ? '✅ Good' : '⚠️ Needs Work'}
              </span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
              Projected Payment Adjustment: <strong>{mipsPaymentAdjustment}</strong>
            </div>
          </div>
          <button
            className={`mips-submit-btn ${mipsSubmitted ? 'submitted' : ''}`}
            onClick={handleMipsSubmit}
            disabled={mipsSubmitting || mipsSubmitted}
          >
            {mipsSubmitting ? '⏳ Submitting to CMS...' : mipsSubmitted ? '✅ Submitted to CMS QPP' : '📤 Auto-Submit to CMS'}
          </button>
        </div>
      </div>

      {/* ── Improvement Activities ──────────── */}
      {showImprovementActivities && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h2>📋 MIPS Improvement Activities ({IMPROVEMENT_ACTIVITIES.filter(a => a.status === 'complete').length}/{IMPROVEMENT_ACTIVITIES.length} Complete)</h2>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowImprovementActivities(false)}>✕</button>
          </div>
          <div className="card-body no-pad">
            <table className="data-table">
              <thead>
                <tr><th>Activity</th><th>Category</th><th>Weight</th><th>Status</th></tr>
              </thead>
              <tbody>
                {IMPROVEMENT_ACTIVITIES.map((a, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</td>
                    <td><span className="badge badge-gray">{a.category}</span></td>
                    <td><span className={`badge ${a.weight === 'High' ? 'badge-purple' : 'badge-info'}`}>{a.weight}</span></td>
                    <td>
                      <span className={`badge ${a.status === 'complete' ? 'badge-success' : 'badge-warning'}`}>
                        {a.status === 'complete' ? '✅ Complete' : '🔄 In Progress'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {['All', 'MIPS', 'HEDIS'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f)}>{f}</button>
        ))}
        <div style={{ borderLeft: '1px solid var(--border)', margin: '0 4px' }} />
        {['All', 'Process', 'Outcome'].map(f => (
          <button key={f} className={`btn btn-sm ${typeFilter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTypeFilter(f)}>{f}</button>
        ))}
      </div>

      {/* Measures table */}
      <div className="card">
        <div className="card-body no-pad">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 50 }}>Score</th>
                  <th>Measure</th>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Eligible</th>
                  <th>Met</th>
                  <th>Target</th>
                  <th>Trend</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const met = m.current >= m.target;
                  const close = m.current >= m.target * 0.9;
                  return (
                    <tr key={m.id}>
                      <td><MiniGauge pct={m.current} target={m.target} size={48} /></td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.description}</div>
                      </td>
                      <td><span className="badge badge-gray">{m.code}</span></td>
                      <td><span className={`badge ${m.type === 'Process' ? 'badge-info' : 'badge-purple'}`}>{m.type}</span></td>
                      <td style={{ fontWeight: 600 }}>{m.eligible}</td>
                      <td style={{ fontWeight: 600 }}>{m.met}</td>
                      <td style={{ fontWeight: 600 }}>{m.target}%</td>
                      <td style={{ fontSize: 18 }}>{trendIcon(m.trend)}</td>
                      <td>
                        <span className={`badge ${met ? 'badge-success' : close ? 'badge-warning' : 'badge-danger'}`}>
                          {met ? '✓ Met' : close ? 'Close' : '✗ Not Met'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
