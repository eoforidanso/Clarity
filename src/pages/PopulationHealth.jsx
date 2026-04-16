import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';

/* ─── Population Health Dashboard (athenaOne-style) ───────────────────────── */

const CHRONIC_CONDITIONS = [
  { name: 'Major Depressive Disorder', icd10: 'F33', count: 142, managed: 118, gap: 24, color: '#4f46e5' },
  { name: 'Generalized Anxiety Disorder', icd10: 'F41.1', count: 98, managed: 84, gap: 14, color: '#0891b2' },
  { name: 'Bipolar Disorder', icd10: 'F31', count: 34, managed: 28, gap: 6, color: '#d97706' },
  { name: 'PTSD', icd10: 'F43.1', count: 56, managed: 42, gap: 14, color: '#dc2626' },
  { name: 'ADHD', icd10: 'F90', count: 67, managed: 58, gap: 9, color: '#7c3aed' },
  { name: 'Substance Use Disorder', icd10: 'F10-F19', count: 41, managed: 29, gap: 12, color: '#ea580c' },
  { name: 'OCD', icd10: 'F42', count: 22, managed: 19, gap: 3, color: '#0d9488' },
  { name: 'Eating Disorders', icd10: 'F50', count: 18, managed: 14, gap: 4, color: '#be123c' },
];

const QUALITY_METRICS = [
  { measure: 'PHQ-9 Screening Rate (Depression)', target: 95, actual: 87, unit: '%' },
  { measure: 'Follow-Up After Hospitalization (7-day)', target: 90, actual: 82, unit: '%' },
  { measure: 'Antidepressant Medication Management (Acute)', target: 85, actual: 78, unit: '%' },
  { measure: 'Antidepressant Medication Management (Continuation)', target: 80, actual: 71, unit: '%' },
  { measure: 'Metabolic Monitoring (Antipsychotics)', target: 90, actual: 84, unit: '%' },
  { measure: 'Suicide Risk Assessment Documentation', target: 100, actual: 94, unit: '%' },
  { measure: 'Substance Use Screening (SBIRT)', target: 85, actual: 76, unit: '%' },
  { measure: 'Adherence to Mood Stabilizer Lab Monitoring', target: 90, actual: 86, unit: '%' },
];

const RISK_STRAT = [
  { tier: 'Critical Risk', count: 8, color: '#dc2626', bg: '#fef2f2', desc: 'Active SI, recent hospitalization, non-adherent' },
  { tier: 'High Risk', count: 24, color: '#f59e0b', bg: '#fffbeb', desc: 'Multiple comorbidities, frequent no-shows, polypharmacy' },
  { tier: 'Moderate Risk', count: 87, color: '#0891b2', bg: '#ecfeff', desc: 'Stable but elevated symptom scores, occasional gaps' },
  { tier: 'Low Risk', count: 359, color: '#16a34a', bg: '#f0fdf4', desc: 'Stable, compliant, meeting treatment goals' },
];

const INTERVENTION_OPPS = [
  { patient: 'James Anderson', issue: 'PHQ-9 score 18 — no medication adjustment in 6 weeks', action: 'Review medication regimen', urgency: 'High', icon: '🔴' },
  { patient: 'Maria Garcia', issue: 'Missed 2 consecutive appointments — GAD-7 rising', action: 'Outreach call + reschedule', urgency: 'High', icon: '🔴' },
  { patient: 'David Thompson', issue: 'Lithium level overdue by 3 weeks', action: 'Order lab stat', urgency: 'Critical', icon: '🚨' },
  { patient: 'Emily Chen', issue: 'No follow-up after ER visit 5 days ago', action: 'Schedule urgent follow-up', urgency: 'Critical', icon: '🚨' },
  { patient: 'Robert Wilson', issue: 'Metabolic panel overdue — on olanzapine', action: 'Order fasting labs', urgency: 'Medium', icon: '🟡' },
  { patient: 'Aisha Patel', issue: 'AUDIT-C score 8 — no SUD referral initiated', action: 'Initiate SUD assessment', urgency: 'High', icon: '🔴' },
];

export default function PopulationHealth() {
  const { currentUser } = useAuth();
  const { patients } = usePatient();
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');

  const totalPatients = CHRONIC_CONDITIONS.reduce((s, c) => s + c.count, 0);
  const totalManaged = CHRONIC_CONDITIONS.reduce((s, c) => s + c.managed, 0);
  const overallRate = Math.round((totalManaged / totalPatients) * 100);

  const card = {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            🌍 Population Health Dashboard
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Track patient populations, chronic condition management, and quality metrics across your practice
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['7d', '30d', '90d', '1y'].map(r => (
            <button key={r} onClick={() => setTimeRange(r)}
              style={{ padding: '8px 14px', borderRadius: 8, border: timeRange === r ? '2px solid #4f46e5' : '1.5px solid #e2e8f0', background: timeRange === r ? '#eff6ff' : '#fff', color: timeRange === r ? '#4f46e5' : '#64748b', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '90d' ? '90 Days' : '1 Year'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Active Patients', value: totalPatients, icon: '👥', color: '#4f46e5' },
          { label: 'Managed / On Track', value: totalManaged, icon: '✅', color: '#16a34a' },
          { label: 'Care Gap Patients', value: totalPatients - totalManaged, icon: '⚠️', color: '#f59e0b' },
          { label: 'Management Rate', value: `${overallRate}%`, icon: '📊', color: '#0891b2' },
          { label: 'Critical Interventions', value: INTERVENTION_OPPS.filter(i => i.urgency === 'Critical').length, icon: '🚨', color: '#dc2626' },
        ].map(s => (
          <div key={s.label} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: 16 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: `${s.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Chronic Condition Registry */}
        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            📋 Chronic Condition Registry
          </h3>
          {CHRONIC_CONDITIONS.map(c => (
            <div key={c.name} onClick={() => setSelectedCondition(selectedCondition === c.name ? null : c.name)}
              style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{c.name}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>{c.icd10}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: c.color }}>{c.count}</span>
                  <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>{c.gap} gaps</span>
                </div>
              </div>
              <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${(c.managed / c.count) * 100}%`, background: c.color, borderRadius: 3 }} />
              </div>
              {selectedCondition === c.name && (
                <div style={{ marginTop: 8, padding: 10, background: '#f7f9fc', borderRadius: 8, fontSize: 12, color: '#475569' }}>
                  <div><strong>Total:</strong> {c.count} patients · <strong>Managed:</strong> {c.managed} ({Math.round((c.managed / c.count) * 100)}%) · <strong>Gaps:</strong> {c.gap}</div>
                  <div style={{ marginTop: 4 }}>Action needed for {c.gap} patients with overdue screenings, missed follow-ups, or unmet treatment goals.</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Risk Stratification */}
        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            🎯 Risk Stratification
          </h3>
          {RISK_STRAT.map(r => (
            <div key={r.tier} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', marginBottom: 10, background: r.bg, borderRadius: 12, border: `1px solid ${r.color}22` }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: '#fff', border: `2px solid ${r.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: r.color }}>
                {r.count}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: r.color }}>{r.tier}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{r.desc}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: 12, background: '#f7f9fc', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Total Active Panel: <strong>{RISK_STRAT.reduce((s, r) => s + r.count, 0)}</strong> patients</div>
          </div>
        </div>
      </div>

      {/* Quality Metrics */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          📊 Quality Metrics & Performance
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {QUALITY_METRICS.map(m => {
            const pct = m.actual;
            const gap = m.target - m.actual;
            const met = m.actual >= m.target;
            return (
              <div key={m.measure} style={{ padding: '12px 16px', background: '#fafbfc', borderRadius: 10, border: `1px solid ${met ? '#bbf7d0' : '#fde68a'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', flex: 1 }}>{m.measure}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: met ? '#16a34a' : '#d97706' }}>{m.actual}{m.unit}</span>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>/ {m.target}{m.unit}</span>
                  </div>
                </div>
                <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: met ? '#16a34a' : pct >= m.target - 5 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                </div>
                {!met && <div style={{ fontSize: 10, color: '#d97706', marginTop: 4, fontWeight: 600 }}>↑ {gap}{m.unit} to target</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Intervention Opportunities */}
      <div style={card}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          🚨 Intervention Opportunities
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {INTERVENTION_OPPS.map((i, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 10,
              background: i.urgency === 'Critical' ? '#fef2f2' : i.urgency === 'High' ? '#fffbeb' : '#f7f9fc',
              border: `1px solid ${i.urgency === 'Critical' ? '#fecaca' : i.urgency === 'High' ? '#fde68a' : '#e2e8f0'}`,
            }}>
              <span style={{ fontSize: 20 }}>{i.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{i.patient}</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{i.issue}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: i.urgency === 'Critical' ? '#dc2626' : i.urgency === 'High' ? '#d97706' : '#0891b2', textTransform: 'uppercase' }}>{i.urgency}</div>
                <button style={{ marginTop: 4, padding: '4px 12px', borderRadius: 6, background: '#4f46e5', color: '#fff', border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                  {i.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
