import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SEVERITY = ['Critical', 'High', 'Moderate', 'Low', 'Info'];
const SEV_CLR = {
  Critical: { bg: '#991b1b', color: '#fff', border: '#dc2626', icon: '🚨' },
  High:     { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', icon: '🔴' },
  Moderate: { bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: '🟡' },
  Low:      { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe', icon: '🔵' },
  Info:     { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', icon: 'ℹ️' },
};

const CATEGORIES = ['Drug Interaction', 'Allergy Alert', 'Duplicate Therapy', 'Dosage Check', 'Preventive Care', 'Lab Monitoring', 'Age/Weight Check', 'Diagnosis-Drug', 'Formulary', 'Guideline'];

const MOCK_ALERTS = [
  { id: 'a1', patient: 'James Anderson', mrn: 'MRN-001', severity: 'Critical', category: 'Drug Interaction', title: 'Sertraline ↔ Tramadol — Serotonin Syndrome Risk',
    description: 'Concurrent use of sertraline (SSRI) and tramadol (opioid) significantly increases risk of serotonin syndrome. Symptoms include agitation, hyperthermia, tachycardia, and clonus.',
    recommendation: 'Avoid combination. Consider alternative analgesic (acetaminophen, NSAIDs). If unavoidable, use lowest effective dose and monitor closely.',
    evidence: 'FDA Black Box Warning; APA Practice Guidelines 2024', source: 'Automated — Rx Check', triggered: '2026-04-15T09:30:00', status: 'Active', overrideReason: '' },
  { id: 'a2', patient: 'James Anderson', mrn: 'MRN-001', severity: 'High', category: 'Lab Monitoring', title: 'Lithium Level Overdue — Last Drawn 2/25/2026',
    description: 'Patient is on Lithium Carbonate 600 mg BID. Serum lithium level has not been checked in 49 days. Recommended monitoring interval: every 3 months (stable) or after dose change.',
    recommendation: 'Order Lithium level + BMP + TSH today. Hold dose adjustment until results available.',
    evidence: 'APA Lithium Monitoring Guidelines; NICE CG185', source: 'Automated — Lab Monitor', triggered: '2026-04-15T08:00:00', status: 'Active', overrideReason: '' },
  { id: 'a3', patient: 'Maria Garcia', mrn: 'MRN-002', severity: 'Moderate', category: 'Preventive Care', title: 'PHQ-9 Screening Due — Depression Monitoring',
    description: 'Patient has diagnosis of Major Depressive Disorder. Last PHQ-9 was 8 weeks ago (score: 14, moderate). CMS quality measure requires rescreening per treatment plan interval.',
    recommendation: 'Administer PHQ-9 at today\'s visit. Document score and treatment response.',
    evidence: 'CMS Quality ID 134; HEDIS MDD Measure', source: 'Quality Measure Engine', triggered: '2026-04-15T07:00:00', status: 'Active', overrideReason: '' },
  { id: 'a4', patient: 'Robert Chen', mrn: 'MRN-003', severity: 'High', category: 'Dosage Check', title: 'Aripiprazole — Dose Exceeds Max for Age > 65',
    description: 'Patient age: 72. Prescribed Aripiprazole 30 mg/day. FDA max recommended dose for elderly: 15 mg/day due to increased fall risk and orthostatic hypotension.',
    recommendation: 'Reduce dose to ≤ 15 mg/day. Consider starting at 2 mg and titrating slowly per Beers Criteria.',
    evidence: 'AGS Beers Criteria 2023; FDA Label', source: 'Automated — Age Check', triggered: '2026-04-14T14:00:00', status: 'Active', overrideReason: '' },
  { id: 'a5', patient: 'Ashley Kim', mrn: 'MRN-004', severity: 'Moderate', category: 'Duplicate Therapy', title: 'Duplicate Benzodiazepine — Alprazolam + Clonazepam',
    description: 'Patient has active prescriptions for both Alprazolam 0.5 mg and Clonazepam 1 mg. Concurrent benzodiazepine use increases sedation, fall risk, and respiratory depression.',
    recommendation: 'Consolidate to one benzodiazepine. Prefer clonazepam for longer half-life if ongoing anxiety management needed. Taper alprazolam.',
    evidence: 'VA/DoD PTSD Guidelines 2023; CDC Benzo Safety Alert', source: 'Automated — Duplicate Rx', triggered: '2026-04-14T11:00:00', status: 'Active', overrideReason: '' },
  { id: 'a6', patient: 'Dorothy Wilson', mrn: 'MRN-005', severity: 'Critical', category: 'Allergy Alert', title: 'Sulfonamide Allergy — Ordered Sulfamethoxazole',
    description: 'Patient has documented allergy to Sulfonamides (reaction: anaphylaxis). Sulfamethoxazole/Trimethoprim was ordered for UTI.',
    recommendation: 'CANCEL ORDER. Use alternative antibiotic: Nitrofurantoin, Ciprofloxacin, or Fosfomycin per culture sensitivity.',
    evidence: 'Drug-Allergy Cross-Reactivity Database', source: 'Automated — Allergy Check', triggered: '2026-04-15T10:15:00', status: 'Active', overrideReason: '' },
  { id: 'a7', patient: 'Sophia Martinez', mrn: 'MRN-006', severity: 'Low', category: 'Formulary', title: 'Brand-Name Abilify Prescribed — Generic Available',
    description: 'Aripiprazole generic is available and preferred on patient\'s Cigna formulary. Brand-name Abilify requires prior authorization and higher copay ($65 vs $10).',
    recommendation: 'Switch to generic Aripiprazole to reduce patient cost and avoid PA requirement.',
    evidence: 'Cigna National Formulary 2026; Orange Book', source: 'Formulary Check', triggered: '2026-04-14T09:00:00', status: 'Active', overrideReason: '' },
  { id: 'a8', patient: 'Brian Foster', mrn: 'MRN-007', severity: 'Info', category: 'Guideline', title: 'AUDIT-C Rescreening Due — Alcohol Use Monitoring',
    description: 'Patient has AUD diagnosis. Last AUDIT-C: 12/2025 (score: 6). SBIRT guidelines recommend rescreening every 3–6 months during active treatment.',
    recommendation: 'Administer AUDIT-C today. If score ≥ 4, repeat full AUDIT and reassess treatment intensity.',
    evidence: 'SAMHSA SBIRT Guidelines; USPSTF Recommendation', source: 'Quality Measure Engine', triggered: '2026-04-15T07:30:00', status: 'Acknowledged', overrideReason: '' },
  { id: 'a9', patient: 'James Anderson', mrn: 'MRN-001', severity: 'High', category: 'Diagnosis-Drug', title: 'QTc Prolongation Risk — Citalopram + Ondansetron',
    description: 'Both Citalopram and Ondansetron prolong QTc interval. Combined use increases risk of Torsades de Pointes, especially with electrolyte abnormalities.',
    recommendation: 'Obtain baseline ECG and electrolytes (K+, Mg2+). Consider alternative antiemetic (promethazine). Limit citalopram to 20 mg/day.',
    evidence: 'FDA Drug Safety Communication 2011; CredibleMeds QTc Drug List', source: 'Automated — QTc Check', triggered: '2026-04-15T10:00:00', status: 'Active', overrideReason: '' },
];

export default function ClinicalDecisionSupport() {
  const { currentUser } = useAuth();
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [filterSev, setFilterSev] = useState('All');
  const [filterCat, setFilterCat] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const filtered = useMemo(() => {
    let list = alerts.filter(a => a.status === 'Active' || a.status === 'Acknowledged');
    if (filterSev !== 'All') list = list.filter(a => a.severity === filterSev);
    if (filterCat !== 'All') list = list.filter(a => a.category === filterCat);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.patient.toLowerCase().includes(q));
    }
    const order = { Critical: 0, High: 1, Moderate: 2, Low: 3, Info: 4 };
    return list.sort((a, b) => order[a.severity] - order[b.severity]);
  }, [alerts, filterSev, filterCat, search]);

  const stats = useMemo(() => ({
    total: alerts.filter(a => a.status === 'Active').length,
    critical: alerts.filter(a => a.severity === 'Critical' && a.status === 'Active').length,
    high: alerts.filter(a => a.severity === 'High' && a.status === 'Active').length,
    overridden: alerts.filter(a => a.status === 'Overridden').length,
  }), [alerts]);

  const acknowledgeAlert = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'Acknowledged' } : a));
  };

  const overrideAlert = () => {
    if (!selectedAlert || !overrideReason) return;
    setAlerts(prev => prev.map(a => a.id === selectedAlert.id ? { ...a, status: 'Overridden', overrideReason } : a));
    setShowOverride(false);
    setOverrideReason('');
    setSelectedAlert(null);
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>🧠 Clinical Decision Support</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Real-time drug-drug, drug-allergy, dosage, duplicate therapy, and preventive care alerts</p>
        </div>
        <button className="btn btn-secondary" onClick={() => alert('⚙️ Opening CDS rules configuration...')}>⚙️ Configure Rules</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '🔔', val: stats.total, label: 'Active Alerts', bg: '#eff6ff' },
          { icon: '🚨', val: stats.critical, label: 'Critical', bg: '#fee2e2' },
          { icon: '🔴', val: stats.high, label: 'High Priority', bg: '#fef3c7' },
          { icon: '🛡️', val: stats.overridden, label: 'Overridden', bg: '#f1f5f9' },
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

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="form-input" placeholder="Search alerts or patients..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 180, fontSize: 13 }} />
        <select className="form-input" value={filterSev} onChange={e => setFilterSev(e.target.value)} style={{ width: 140, fontSize: 12 }}>
          <option value="All">All Severities</option>
          {SEVERITY.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="form-input" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width: 160, fontSize: 12 }}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Alert Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(alert => {
          const sc = SEV_CLR[alert.severity];
          return (
            <div key={alert.id} onClick={() => setSelectedAlert(alert)}
              style={{ background: '#fff', borderRadius: 12, border: `1px solid ${sc.border}`, borderLeft: `5px solid ${alert.severity === 'Critical' ? '#dc2626' : sc.border}`, padding: '14px 18px', cursor: 'pointer', transition: 'box-shadow 0.2s', ...(alert.severity === 'Critical' ? { boxShadow: '0 0 12px rgba(220,38,38,0.15)' } : {}) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <span style={{ fontSize: 16 }}>{sc.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{alert.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>👤 {alert.patient} · {alert.category} · {alert.source}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: sc.bg, color: sc.color }}>{alert.severity}</span>
                  {alert.status === 'Acknowledged' && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: '#e0e7ff', color: '#3730a3' }}>👁 Seen</span>}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>{alert.description}</div>
              <div style={{ fontSize: 11, color: '#166534', background: '#f0fdf4', padding: '8px 12px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                💡 <strong>Recommendation:</strong> {alert.recommendation}
              </div>
            </div>
          );
        })}
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && !showOverride && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedAlert(null); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: selectedAlert.severity === 'Critical' ? 'linear-gradient(135deg, #991b1b, #dc2626)' : selectedAlert.severity === 'High' ? 'linear-gradient(135deg, #c2410c, #ea580c)' : 'linear-gradient(135deg, #1e40af, #3b82f6)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{SEV_CLR[selectedAlert.severity].icon} {selectedAlert.title}</div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{selectedAlert.patient} · {selectedAlert.category} · {selectedAlert.severity}</div>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Alert Description</div>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>{selectedAlert.description}</div>
              </div>
              <div style={{ padding: 14, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Recommendation</div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: '#166534' }}>{selectedAlert.recommendation}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Evidence Source</div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>{selectedAlert.evidence}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Triggered</div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>{new Date(selectedAlert.triggered).toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setSelectedAlert(null)}>Close</button>
              {selectedAlert.status === 'Active' && (
                <button className="btn btn-secondary" onClick={() => { acknowledgeAlert(selectedAlert.id); setSelectedAlert(null); }}>👁 Acknowledge</button>
              )}
              <button className="btn" style={{ background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }}
                onClick={() => setShowOverride(true)}>🛡️ Override</button>
            </div>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {showOverride && selectedAlert && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowOverride(false); } }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>🛡️ Override Clinical Alert</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>This action will be logged in the audit trail</div>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ padding: 12, background: '#fef2f2', borderRadius: 8, border: '1px solid #fca5a5', marginBottom: 16, fontSize: 12, color: '#991b1b' }}>
                <strong>⚠️ Warning:</strong> Overriding a {selectedAlert.severity.toLowerCase()}-severity CDS alert requires clinical justification. All overrides are audited per compliance policy.
              </div>
              <div style={{ marginBottom: 4, fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>Alert Being Overridden</div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 14 }}>{selectedAlert.title}</div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Override Reason (Required)</label>
                <textarea className="form-textarea" rows={3} value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="Clinical justification for overriding this alert. E.g., 'Patient has tolerated this combination for 2+ years with ECG monitoring.'" />
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => { setShowOverride(false); }}>Cancel</button>
              <button className="btn" disabled={!overrideReason.trim()} onClick={overrideAlert}
                style={{ background: overrideReason.trim() ? '#dc2626' : '#ccc', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, padding: '8px 14px', borderRadius: 8, cursor: overrideReason.trim() ? 'pointer' : 'not-allowed' }}>
                🛡️ Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
