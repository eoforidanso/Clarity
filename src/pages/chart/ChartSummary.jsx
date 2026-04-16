import React, { useState } from 'react';
import { usePatient } from '../../contexts/PatientContext';
import { useAuth } from '../../contexts/AuthContext';

export default function ChartSummary({ patientId }) {
  const { allergies, problemList, vitalSigns, meds, assessmentScores, orders, encounters } = usePatient();
  const { currentUser } = useAuth();
  const [aiPrepDismissed, setAiPrepDismissed] = useState(false);

  const patientAllergies = allergies[patientId] || [];
  const patientProblems = problemList[patientId] || [];
  const patientVitals = vitalSigns[patientId] || [];
  const patientMeds = meds[patientId] || [];
  const patientScores = assessmentScores[patientId] || [];
  const patientOrders = orders[patientId] || [];
  const patientEncounters = encounters[patientId] || [];
  const latestVital = patientVitals[0];
  const activeMeds = patientMeds.filter(m => m.status === 'Active');
  const activeProblems = patientProblems.filter(p => p.status === 'Active');
  const pendingOrders = patientOrders.filter(o => o.status === 'Pending' || o.status === 'Pending EPCS Auth');
  const recentEncounters = patientEncounters.slice(0, 3);
  const lastEncounter = patientEncounters[0];

  // ── Care gap detection (Athena-style inline alerts) ──────
  const careGaps = [];
  const latestPHQ = patientScores.find(s => s.tool === 'PHQ-9');
  const latestGAD = patientScores.find(s => s.tool === 'GAD-7');
  const latestCSSRS = patientScores.find(s => s.tool === 'Columbia Suicide Severity Rating');

  if (!latestPHQ) careGaps.push({ icon: '📊', text: 'PHQ-9 screening overdue', severity: 'warning' });
  else if (latestPHQ.score >= 15) careGaps.push({ icon: '🚨', text: `PHQ-9 score ${latestPHQ.score} — consider treatment adjustment`, severity: 'critical' });
  if (!latestGAD) careGaps.push({ icon: '📊', text: 'GAD-7 screening overdue', severity: 'warning' });
  if (!latestCSSRS) careGaps.push({ icon: '🛡️', text: 'C-SSRS not administered this visit cycle', severity: 'info' });
  if (patientAllergies.length === 0 && patientMeds.filter(m => m.status === 'Active').length > 0) {
    careGaps.push({ icon: '⚠️', text: 'Active medications but no allergy review documented', severity: 'warning' });
  }
  const controlledMeds = activeMeds.filter(m => m.isControlled);
  if (controlledMeds.length > 0) {
    careGaps.push({ icon: '💊', text: `${controlledMeds.length} controlled substance(s) — verify PDMP check`, severity: 'info' });
  }

  // ── AI Chart Prep summary ───────────────────────────────
  const aiSummary = [];
  if (activeProblems.length > 0) aiSummary.push(`${activeProblems.length} active problem(s): ${activeProblems.slice(0, 3).map(p => p.description || p.code).join(', ')}${activeProblems.length > 3 ? '...' : ''}`);
  if (activeMeds.length > 0) aiSummary.push(`${activeMeds.length} active medication(s), ${controlledMeds.length} controlled`);
  if (latestPHQ) aiSummary.push(`Last PHQ-9: ${latestPHQ.score} (${latestPHQ.interpretation})`);
  if (latestGAD) aiSummary.push(`Last GAD-7: ${latestGAD.score} (${latestGAD.interpretation})`);
  if (latestVital) aiSummary.push(`Vitals from ${latestVital.date}: BP ${latestVital.bp}, HR ${latestVital.hr}`);
  if (pendingOrders.length > 0) aiSummary.push(`${pendingOrders.length} pending order(s) awaiting action`);

  return (
    <div className="athena-summary">

      {/* ── AI Chart Prep Banner (Athena-style) ─────────── */}
      {!aiPrepDismissed && aiSummary.length > 0 && (
        <div className="athena-ai-prep">
          <div className="athena-ai-prep-header">
            <div className="athena-ai-prep-title">
              <span className="athena-ai-sparkle">✨</span>
              AI Chart Prep
              <span className="athena-ai-badge">Auto-generated</span>
            </div>
            <button className="athena-ai-dismiss" onClick={() => setAiPrepDismissed(true)}>✕</button>
          </div>
          <div className="athena-ai-prep-body">
            {aiSummary.map((s, i) => (
              <div key={i} className="athena-ai-prep-item">
                <span className="athena-ai-bullet">•</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Care Gap Alerts (Athena-style inline) ─────────── */}
      {careGaps.length > 0 && (
        <div className="athena-care-gaps-bar">
          <div className="athena-care-gaps-title">
            <span>🎯</span> Care Gaps & Alerts
            <span className="athena-panel-count alert">{careGaps.length}</span>
          </div>
          <div className="athena-care-gaps-list">
            {careGaps.map((g, i) => (
              <div key={i} className={`athena-care-gap-item ${g.severity}`}>
                <span className="athena-care-gap-icon">{g.icon}</span>
                <span>{g.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Top row: 2 columns */}
      <div className="athena-summary-row-2">
        {/* Active Problems */}
        <div className="athena-panel">
          <div className="athena-panel-header">
            <div className="athena-panel-title">
              <span className="athena-panel-icon">🩺</span>
              Active Problems
              <span className="athena-panel-count">{activeProblems.length}</span>
            </div>
          </div>
          <div className="athena-panel-body athena-panel-table">
            <table className="athena-table">
              <thead>
                <tr>
                  <th>ICD-10</th>
                  <th>Description</th>
                  <th>Onset</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeProblems.map((p) => (
                  <tr key={p.id}>
                    <td className="athena-code">{p.code}</td>
                    <td className="athena-desc">{p.description}</td>
                    <td className="athena-date">{p.onset || '—'}</td>
                    <td><span className="athena-status active">Active</span></td>
                  </tr>
                ))}
                {activeProblems.length === 0 && (
                  <tr><td colSpan="4" className="athena-empty">No active problems</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Medications */}
        <div className="athena-panel">
          <div className="athena-panel-header">
            <div className="athena-panel-title">
              <span className="athena-panel-icon">💊</span>
              Active Medications
              <span className="athena-panel-count">{activeMeds.length}</span>
            </div>
          </div>
          <div className="athena-panel-body athena-panel-table">
            <table className="athena-table">
              <thead>
                <tr>
                  <th>Medication</th>
                  <th>Dose</th>
                  <th>Frequency</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {activeMeds.map((m) => (
                  <tr key={m.id}>
                    <td className="athena-desc">{m.name}</td>
                    <td>{m.dose}</td>
                    <td className="athena-date">{m.frequency}</td>
                    <td>
                      {m.isControlled
                        ? <span className="athena-status warning">{m.schedule}</span>
                        : <span className="athena-status neutral">Standard</span>}
                    </td>
                  </tr>
                ))}
                {activeMeds.length === 0 && (
                  <tr><td colSpan="4" className="athena-empty">No active medications</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Middle row: 3 columns */}
      <div className="athena-summary-row-3">
        {/* Allergies */}
        <div className="athena-panel">
          <div className="athena-panel-header athena-panel-header-alert">
            <div className="athena-panel-title">
              <span className="athena-panel-icon">⚠️</span>
              Allergies
              <span className="athena-panel-count">{patientAllergies.length}</span>
            </div>
          </div>
          <div className="athena-panel-body">
            {patientAllergies.length > 0 ? patientAllergies.map((a) => (
              <div key={a.id} className="athena-allergy-item">
                <div className="athena-allergy-name">
                  <span className={`athena-severity-dot ${a.severity === 'Severe' ? 'severe' : a.severity === 'Moderate' ? 'moderate' : 'mild'}`} />
                  {a.allergen}
                </div>
                <div className="athena-allergy-detail">
                  <span className={`athena-severity-tag ${a.severity === 'Severe' ? 'severe' : a.severity === 'Moderate' ? 'moderate' : 'mild'}`}>
                    {a.severity}
                  </span>
                  {a.reaction && <span className="athena-reaction">{a.reaction}</span>}
                </div>
              </div>
            )) : (
              <div className="athena-nkda-badge">✓ NKDA — No Known Drug Allergies</div>
            )}
          </div>
        </div>

        {/* Latest Vitals */}
        <div className="athena-panel">
          <div className="athena-panel-header">
            <div className="athena-panel-title">
              <span className="athena-panel-icon">💓</span>
              Latest Vitals
            </div>
            {latestVital && <span className="athena-panel-date">{latestVital.date}</span>}
          </div>
          <div className="athena-panel-body">
            {latestVital ? (
              <div className="athena-vitals-summary-grid">
                <div className="athena-vital-cell">
                  <div className="athena-vital-cell-label">Blood Pressure</div>
                  <div className="athena-vital-cell-value">{latestVital.bp}</div>
                </div>
                <div className="athena-vital-cell">
                  <div className="athena-vital-cell-label">Heart Rate</div>
                  <div className="athena-vital-cell-value">{latestVital.hr} <small>bpm</small></div>
                </div>
                <div className="athena-vital-cell">
                  <div className="athena-vital-cell-label">Temp</div>
                  <div className="athena-vital-cell-value">{latestVital.temp}°F</div>
                </div>
                <div className="athena-vital-cell">
                  <div className="athena-vital-cell-label">SpO2</div>
                  <div className="athena-vital-cell-value">{latestVital.spo2}%</div>
                </div>
                <div className="athena-vital-cell">
                  <div className="athena-vital-cell-label">Weight</div>
                  <div className="athena-vital-cell-value">{latestVital.weight} <small>lbs</small></div>
                </div>
                <div className="athena-vital-cell">
                  <div className="athena-vital-cell-label">BMI</div>
                  <div className="athena-vital-cell-value">{latestVital.bmi}</div>
                </div>
                <div className="athena-vital-cell">
                  <div className="athena-vital-cell-label">Resp Rate</div>
                  <div className="athena-vital-cell-value">{latestVital.rr}</div>
                </div>
                <div className="athena-vital-cell">
                  <div className="athena-vital-cell-label">Pain Scale</div>
                  <div className="athena-vital-cell-value">{latestVital.pain}/10</div>
                </div>
              </div>
            ) : (
              <div className="athena-empty-state">No vitals recorded</div>
            )}
          </div>
        </div>

        {/* Assessment Scores */}
        <div className="athena-panel">
          <div className="athena-panel-header">
            <div className="athena-panel-title">
              <span className="athena-panel-icon">📊</span>
              Assessment Scores
            </div>
          </div>
          <div className="athena-panel-body">
            {patientScores.slice(0, 4).map((s) => {
              const maxScores = { 'PHQ-9': 27, 'GAD-7': 21, 'PCL-5': 80, 'AUDIT-C': 12, 'Columbia Suicide Severity Rating': 6, 'ASRS v1.1': 24, 'MoCA': 30, 'MDQ': 13, 'DAST-10': 10 };
              const max = maxScores[s.tool] || 30;
              const pct = Math.min((s.score / max) * 100, 100);
              const level = pct > 70 ? 'critical' : pct > 50 ? 'high' : pct > 30 ? 'moderate' : 'low';
              return (
                <div key={s.id} className="athena-score-item">
                  <div className="athena-score-header">
                    <span className="athena-score-name">{s.tool}</span>
                    <span className={`athena-score-value ${level}`}>{s.score}/{max}</span>
                  </div>
                  <div className="athena-score-bar">
                    <div className={`athena-score-fill ${level}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="athena-score-interp">{s.interpretation}</div>
                </div>
              );
            })}
            {patientScores.length === 0 && (
              <div className="athena-empty-state">No assessments</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row: Pending orders + Recent encounters */}
      <div className="athena-summary-row-2">
        {/* Pending Orders */}
        <div className="athena-panel">
          <div className="athena-panel-header">
            <div className="athena-panel-title">
              <span className="athena-panel-icon">📝</span>
              Pending Orders
              {pendingOrders.length > 0 && <span className="athena-panel-count alert">{pendingOrders.length}</span>}
            </div>
          </div>
          <div className="athena-panel-body athena-panel-table">
            <table className="athena-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Ordered</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map((o) => (
                  <tr key={o.id}>
                    <td><span className="athena-status info">{o.type}</span></td>
                    <td className="athena-desc">{o.description}</td>
                    <td><span className={`athena-status ${o.status.includes('EPCS') ? 'warning' : 'neutral'}`}>{o.status}</span></td>
                    <td className="athena-date">{o.orderedDate}</td>
                    <td><span className={`athena-status ${o.priority === 'Urgent' ? 'danger' : 'neutral'}`}>{o.priority}</span></td>
                  </tr>
                ))}
                {pendingOrders.length === 0 && (
                  <tr><td colSpan="5" className="athena-empty">No pending orders</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Encounters */}
        <div className="athena-panel">
          <div className="athena-panel-header">
            <div className="athena-panel-title">
              <span className="athena-panel-icon">🗒️</span>
              Recent Encounters
            </div>
          </div>
          <div className="athena-panel-body athena-panel-table">
            <table className="athena-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Provider</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentEncounters.map((e) => (
                  <tr key={e.id}>
                    <td className="athena-date">{e.date}</td>
                    <td>{e.type || 'Office Visit'}</td>
                    <td>{e.provider || e.createdBy || '—'}</td>
                    <td><span className={`athena-status ${e.status === 'Signed' ? 'active' : e.status === 'In Progress' ? 'warning' : 'neutral'}`}>{e.status}</span></td>
                  </tr>
                ))}
                {recentEncounters.length === 0 && (
                  <tr><td colSpan="4" className="athena-empty">No encounters found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Last Encounter Preview (Athena-style) ──────── */}
      {lastEncounter && (
        <div className="athena-panel athena-last-encounter">
          <div className="athena-panel-header">
            <div className="athena-panel-title">
              <span className="athena-panel-icon">📄</span>
              Last Encounter — {lastEncounter.date}
              <span className={`athena-status ${lastEncounter.status === 'Signed' ? 'active' : 'warning'}`}>{lastEncounter.status}</span>
            </div>
            <span className="athena-panel-date">{lastEncounter.type || 'Office Visit'} • {lastEncounter.provider || lastEncounter.createdBy || '—'}</span>
          </div>
          <div className="athena-panel-body">
            <div className="athena-encounter-preview">
              {lastEncounter.subjective && (
                <div className="athena-encounter-section">
                  <div className="athena-encounter-label">S — Subjective</div>
                  <div className="athena-encounter-text">{lastEncounter.subjective.slice(0, 200)}{lastEncounter.subjective.length > 200 ? '...' : ''}</div>
                </div>
              )}
              {lastEncounter.assessment && (
                <div className="athena-encounter-section">
                  <div className="athena-encounter-label">A — Assessment</div>
                  <div className="athena-encounter-text">{lastEncounter.assessment.slice(0, 200)}{lastEncounter.assessment.length > 200 ? '...' : ''}</div>
                </div>
              )}
              {lastEncounter.plan && (
                <div className="athena-encounter-section">
                  <div className="athena-encounter-label">P — Plan</div>
                  <div className="athena-encounter-text">{lastEncounter.plan.slice(0, 200)}{lastEncounter.plan.length > 200 ? '...' : ''}</div>
                </div>
              )}
              {!lastEncounter.subjective && !lastEncounter.assessment && !lastEncounter.plan && (
                <div className="athena-encounter-section">
                  <div className="athena-encounter-text" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Encounter note content — click to view full encounter
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Connected Networks Quick-Status ──────────── */}
      <div className="athena-panel" style={{ borderColor: '#3b82f6' }}>
        <div className="athena-panel-header" style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🌐</span>
            <span style={{ fontWeight: 800, fontSize: 11 }}>Connected Networks</span>
          </div>
          <span style={{ fontSize: 10, opacity: 0.85 }}>Real-time</span>
        </div>
        <div className="athena-panel-body" style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {[
              { name: 'Surescripts', icon: '💊', status: 'connected', detail: '95K+ pharmacies' },
              { name: 'Quest / LabCorp', icon: '🔬', status: 'connected', detail: 'Lab results' },
              { name: 'CommonWell HIE', icon: '🏥', status: 'connected', detail: '176M patients' },
              { name: 'State PDMP', icon: '🔒', status: 'connected', detail: 'Controlled Rx' },
              { name: 'CMS QPP', icon: '🏛️', status: 'connected', detail: 'MIPS reporting' },
            ].map((n, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 6,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                fontSize: 11, fontWeight: 600,
              }}>
                <span>{n.icon}</span>
                <span style={{ color: 'var(--text-primary)' }}>{n.name}</span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
