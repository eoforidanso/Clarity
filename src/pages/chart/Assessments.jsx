import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePatient } from '../../contexts/PatientContext';

const PHQ9_QUESTIONS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure',
  'Trouble concentrating on things',
  'Moving or speaking slowly, or being fidgety/restless',
  'Thoughts that you would be better off dead or of hurting yourself',
];

const GAD7_QUESTIONS = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it\'s hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid as if something awful might happen',
];

const CSSRS_QUESTIONS = [
  'Have you wished you were dead or wished you could go to sleep and not wake up?',
  'Have you actually had any thoughts of killing yourself?',
  'Have you been thinking about how you might do this?',
  'Have you had these thoughts and had some intention of acting on them?',
  'Have you started to work out or worked out the details of how to kill yourself?',
  'Have you ever done anything, started to do anything, or prepared to do anything to end your life?',
];

const AUDIT_C_QUESTIONS = [
  'How often do you have a drink containing alcohol?',
  'How many drinks containing alcohol do you have on a typical day when you are drinking?',
  'How often do you have 6 or more drinks on one occasion?',
];

const SCORING_OPTIONS = [
  { value: 0, label: 'Not at all (0)' },
  { value: 1, label: 'Several days (1)' },
  { value: 2, label: 'More than half the days (2)' },
  { value: 3, label: 'Nearly every day (3)' },
];

function getPhq9Interpretation(score) {
  if (score <= 4) return 'Minimal Depression';
  if (score <= 9) return 'Mild Depression';
  if (score <= 14) return 'Moderate Depression';
  if (score <= 19) return 'Moderately Severe Depression';
  return 'Severe Depression';
}

function getGad7Interpretation(score) {
  if (score <= 4) return 'Minimal Anxiety';
  if (score <= 9) return 'Mild Anxiety';
  if (score <= 14) return 'Moderate Anxiety';
  return 'Severe Anxiety';
}

function getCssrsInterpretation(score) {
  if (score === 0) return 'No Risk Identified';
  if (score <= 1) return 'Low Risk - Wish to be dead';
  if (score <= 2) return 'Low Risk - Non-specific active suicidal thoughts';
  if (score <= 3) return 'Moderate Risk - Active suicidal ideation with some intent';
  if (score <= 4) return 'High Risk - Active suicidal ideation with plan';
  return 'Imminent Risk - Active suicidal ideation with plan and intent';
}

function getAuditCInterpretation(score) {
  if (score <= 2) return 'Low Risk';
  if (score <= 5) return 'Moderate Risk - Brief Intervention Recommended';
  return 'High Risk - Further Evaluation Needed';
}

// ── SVG Trend Chart ──────────────────────────────────────────────────────────
function TrendChart({ scores }) {
  const PHQ_MAX = 27;
  const GAD_MAX = 21;
  const W = 560;
  const H = 160;
  const PAD = { top: 16, right: 16, bottom: 32, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const phqScores = scores.filter(s => s.tool === 'PHQ-9').slice(-8).reverse();
  const gadScores = scores.filter(s => s.tool === 'GAD-7').slice(-8).reverse();

  const allDates = Array.from(new Set([...phqScores.map(s => s.date), ...gadScores.map(s => s.date)])).sort();
  if (allDates.length < 2) return null;

  const xPos = (date) => PAD.left + (allDates.indexOf(date) / (allDates.length - 1)) * chartW;
  const yPosPhq = (score) => PAD.top + chartH - (score / PHQ_MAX) * chartH;
  const yPosGad = (score) => PAD.top + chartH - (score / GAD_MAX) * chartH;

  const makePath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

  const phqPts = phqScores.map(s => ({ x: xPos(s.date), y: yPosPhq(s.score), score: s.score, date: s.date }));
  const gadPts = gadScores.map(s => ({ x: xPos(s.date), y: yPosGad(s.score), score: s.score, date: s.date }));

  // Severity bands (as % of chart height from top): mild ≥ 33%, moderate ≥ 55%, severe ≥ 74%
  const bands = [
    { label: 'Severe', y: PAD.top, h: chartH * 0.26, fill: '#fee2e220' },
    { label: 'Moderate', y: PAD.top + chartH * 0.26, h: chartH * 0.19, fill: '#fef3c720' },
    { label: 'Mild', y: PAD.top + chartH * 0.45, h: chartH * 0.22, fill: '#dcfce720' },
  ];

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
        📈 Score Trends
        <span style={{ display: 'flex', gap: 12, fontWeight: 600, fontSize: 11, textTransform: 'none' }}>
          <span style={{ color: '#4f46e5' }}>● PHQ-9 (Depression)</span>
          <span style={{ color: '#d97706' }}>● GAD-7 (Anxiety)</span>
        </span>
      </div>
      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 10, border: '1px solid var(--border)', padding: '8px 4px 4px' }}>
        <svg width={W} height={H} style={{ display: 'block', minWidth: W }}>
          {/* Severity bands */}
          {bands.map(b => (
            <rect key={b.label} x={PAD.left} y={b.y} width={chartW} height={b.h} fill={b.fill} />
          ))}
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(r => {
            const y = PAD.top + r * chartH;
            return <line key={r} x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y} stroke="#e2e8f0" strokeWidth={1} />;
          })}
          {/* Y axis labels */}
          {[0, 7, 14, 21, 27].map(v => (
            <text key={v} x={PAD.left - 5} y={PAD.top + chartH - (v / PHQ_MAX) * chartH + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{v}</text>
          ))}
          {/* X axis labels */}
          {allDates.map(d => (
            <text key={d} x={xPos(d)} y={H - 6} textAnchor="middle" fontSize={9} fill="#94a3b8">{d.slice(5)}</text>
          ))}
          {/* PHQ-9 line */}
          {phqPts.length >= 2 && (
            <path d={makePath(phqPts)} fill="none" stroke="#4f46e5" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          )}
          {phqPts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={5} fill="#4f46e5" stroke="#fff" strokeWidth={2} />
              <title>PHQ-9 {p.date}: {p.score}</title>
            </g>
          ))}
          {/* GAD-7 line */}
          {gadPts.length >= 2 && (
            <path d={makePath(gadPts)} fill="none" stroke="#d97706" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          )}
          {gadPts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={5} fill="#d97706" stroke="#fff" strokeWidth={2} />
              <title>GAD-7 {p.date}: {p.score}</title>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── Score Worsening Alerts ────────────────────────────────────────────────────
function ScoreAlerts({ scores }) {
  const alerts = useMemo(() => {
    const out = [];
    const check = (tool, max, threshold, label, color) => {
      const list = scores.filter(s => s.tool === tool).sort((a, b) => b.date.localeCompare(a.date));
      if (list.length < 2) return;
      const latest = list[0].score;
      const prev = list[1].score;
      const delta = latest - prev;
      if (delta >= 5) {
        out.push({ tool, label, delta, latest, max, color, severity: delta >= 8 ? 'critical' : 'warning' });
      }
      // Absolute severity alerts
      if (tool === 'PHQ-9' && latest >= 15) {
        out.push({ tool, label: `${label} Severe`, delta: 0, latest, max, color: '#dc2626', severity: latest >= 20 ? 'critical' : 'warning', absolute: true });
      }
      if (tool === 'GAD-7' && latest >= 15) {
        out.push({ tool, label: `${label} Severe`, delta: 0, latest, max, color: '#d97706', severity: 'warning', absolute: true });
      }
    };
    check('PHQ-9', 27, 5, 'PHQ-9 Depression', '#dc2626');
    check('GAD-7', 21, 5, 'GAD-7 Anxiety', '#d97706');
    return out;
  }, [scores]);

  if (alerts.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      {alerts.map((a, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '12px 16px', borderRadius: 10, marginBottom: 8,
          background: a.severity === 'critical' ? '#fee2e2' : '#fef3c7',
          border: `1px solid ${a.severity === 'critical' ? '#fca5a5' : '#fde68a'}`,
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>{a.severity === 'critical' ? '🚨' : '⚠️'}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: a.severity === 'critical' ? '#991b1b' : '#92400e' }}>
              {a.absolute
                ? `${a.label} range — score ${a.latest}/${a.max}`
                : `${a.label} increased by +${a.delta} points since last visit (score: ${a.latest}/${a.max})`}
            </div>
            <div style={{ fontSize: 12, color: a.severity === 'critical' ? '#b91c1c' : '#a16207', marginTop: 3 }}>
              {a.severity === 'critical' ? 'Consider immediate safety assessment and crisis protocol review.' : 'Consider reviewing treatment plan and coping strategies with patient.'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── C-SSRS Safety Plan Modal ──────────────────────────────────────────────────
const BLANK_SAFETY_PLAN = {
  warningSigns: '',
  internalCoping: '',
  socialDistraction: '',
  socialSupport: '',
  professionalContacts: '',
  meansRestriction: '',
  safeEnvironment: '',
};

function SafetyPlanModal({ onSave, onDismiss, cssrsScore }) {
  const [plan, setPlan] = useState(BLANK_SAFETY_PLAN);
  const set = (k, v) => setPlan(p => ({ ...p, [k]: v }));

  const riskLevel = cssrsScore >= 5 ? 'Imminent Risk' : cssrsScore >= 4 ? 'High Risk' : cssrsScore >= 3 ? 'Moderate Risk' : 'Low–Moderate Risk';
  const riskColor = cssrsScore >= 4 ? '#dc2626' : cssrsScore >= 3 ? '#d97706' : '#f59e0b';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #dc2626, #7f1d1d)', color: '#fff', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>🚨 Safety Planning Worksheet</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
            C-SSRS Score: <strong>{cssrsScore}</strong> — <span style={{ color: '#fde68a' }}>{riskLevel}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#991b1b' }}>
            <strong>⚠️ C-SSRS score &gt; 0 detected.</strong> Complete a collaborative safety plan with the patient before ending this session.
            If immediate risk, contact 988 Suicide & Crisis Lifeline or 911.
          </div>

          {[
            { key: 'warningSigns', label: '🔴 Warning Signs', placeholder: 'What thoughts, images, moods, situations, or behaviors indicate a crisis may be developing?\ne.g., "I start feeling hopeless", "I stop answering my phone", "I begin giving things away"' },
            { key: 'internalCoping', label: '🟡 Internal Coping Strategies', placeholder: 'Things the patient can do on their own to take their mind off the urge to hurt themselves:\ne.g., "Take a walk", "Listen to music", "Distract with a TV show", "Do breathing exercises"' },
            { key: 'socialDistraction', label: '🟢 Social Contacts / Distractions', placeholder: 'People and social settings that provide distraction:\ne.g., "Call my sister", "Go to the coffee shop", "Visit a public place"' },
            { key: 'socialSupport', label: '🔵 People to Ask for Help', placeholder: 'People the patient can ask for help (name + phone):\ne.g., "Mom — (555) 111-2222", "Friend Alex — (555) 333-4444"' },
            { key: 'professionalContacts', label: '🟣 Professional & Crisis Contacts', placeholder: 'Clinician, crisis line, emergency services:\n988 Suicide & Crisis Lifeline — call or text 988\nLocal ER: ___\nThis office: (555) 800-1234' },
            { key: 'meansRestriction', label: '🔒 Means Restriction / Safe Environment', placeholder: 'Steps to make the environment safer:\ne.g., "Store firearms in a gun safe off premises", "Have family hold medications", "Remove sharp objects"' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 12.5, color: '#1e293b', marginBottom: 6 }}>{f.label}</label>
              <textarea className="form-input" rows={3}
                placeholder={f.placeholder}
                value={plan[f.key]}
                onChange={e => set(f.key, e.target.value)}
                style={{ resize: 'vertical', fontSize: 12.5, lineHeight: 1.6 }} />
            </div>
          ))}

          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '12px 16px', fontSize: 12, marginBottom: 8 }}>
            <strong>📞 Crisis Resources:</strong> 988 Suicide &amp; Crisis Lifeline (call or text 988) · Crisis Text Line: Text HOME to 741741 · Emergency: 911
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, gap: 10 }}>
          <button onClick={onDismiss} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
            Skip for Now
          </button>
          <button onClick={() => onSave(plan)} style={{ background: '#dc2626', border: 'none', borderRadius: 8, padding: '10px 24px', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            ✅ Save Safety Plan
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Assessments({ patientId }) {
  const { currentUser } = useAuth();
  const { assessmentScores, addAssessment } = usePatient();
  const [activeTool, setActiveTool] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [safetyPlanTrigger, setSafetyPlanTrigger] = useState(null); // { cssrsScore }
  const [savedSafetyPlans, setSavedSafetyPlans] = useState([]);

  const patientScores = assessmentScores[patientId] || [];

  const tools = [
    { key: 'PHQ-9', name: 'PHQ-9 (Depression)', questions: PHQ9_QUESTIONS, interpret: getPhq9Interpretation, max: 27 },
    { key: 'GAD-7', name: 'GAD-7 (Anxiety)', questions: GAD7_QUESTIONS, interpret: getGad7Interpretation, max: 21 },
    { key: 'Columbia Suicide Severity Rating', name: 'C-SSRS (Suicide Risk)', questions: CSSRS_QUESTIONS, interpret: getCssrsInterpretation, max: 6, yesNo: true },
    { key: 'AUDIT-C', name: 'AUDIT-C (Alcohol Use)', questions: AUDIT_C_QUESTIONS, interpret: getAuditCInterpretation, max: 12 },
  ];

  const startTool = (tool) => {
    setActiveTool(tool);
    setAnswers(new Array(tool.questions.length).fill(0));
  };

  const submitAssessment = () => {
    if (!activeTool) return;
    const score = answers.reduce((sum, a) => sum + a, 0);
    addAssessment(patientId, {
      tool: activeTool.key,
      score,
      interpretation: activeTool.interpret(score),
      date: new Date().toISOString().split('T')[0],
      administeredBy: `${currentUser.firstName} ${currentUser.lastName}`,
      answers,
    });
    const isCssrs = activeTool.key === 'Columbia Suicide Severity Rating';
    setActiveTool(null);
    setAnswers([]);
    if (isCssrs && score > 0) {
      setSafetyPlanTrigger({ cssrsScore: score });
    }
  };

  return (
    <div>
      {/* Safety Plan Modal */}
      {safetyPlanTrigger && (
        <SafetyPlanModal
          cssrsScore={safetyPlanTrigger.cssrsScore}
          onSave={(plan) => {
            setSavedSafetyPlans(prev => [...prev, { ...plan, savedAt: new Date().toISOString(), cssrsScore: safetyPlanTrigger.cssrsScore }]);
            setSafetyPlanTrigger(null);
          }}
          onDismiss={() => setSafetyPlanTrigger(null)}
        />
      )}

      {/* Assessment Tool Selection */}
      {!activeTool && (
        <>
          <div className="grid-4 mb-5">
            {tools.map((t) => (
              <div key={t.key} className="card" style={{ cursor: 'pointer' }} onClick={() => startTool(t)}>
                <div className="card-body" style={{ textAlign: 'center', padding: 24 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                  <h3 style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</h3>
                  <p className="text-sm text-muted mt-2">{t.questions.length} questions · Max score: {t.max}</p>
                  <button className="btn btn-sm btn-primary mt-3">Administer</button>
                </div>
              </div>
            ))}
          </div>

          {/* Active Safety Plans */}
          {savedSafetyPlans.length > 0 && (
            <div className="card mb-4" style={{ border: '2px solid #fca5a5' }}>
              <div className="card-header" style={{ background: '#fee2e2' }}>
                <h2 style={{ color: '#991b1b' }}>🚨 Active Safety Plans ({savedSafetyPlans.length})</h2>
              </div>
              <div className="card-body">
                {savedSafetyPlans.map((sp, i) => (
                  <div key={i} style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 13, marginBottom: 4 }}>
                      Safety Plan #{i + 1} — C-SSRS Score: {sp.cssrsScore} · Saved {sp.savedAt?.slice(0, 10)}
                    </div>
                    {sp.warningSigns && <div style={{ fontSize: 12 }}><strong>Warning Signs:</strong> {sp.warningSigns}</div>}
                    {sp.professionalContacts && <div style={{ fontSize: 12, marginTop: 4 }}><strong>Crisis Contacts:</strong> {sp.professionalContacts}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trend Chart + Alerts */}
          {patientScores.length >= 2 && (
            <div className="card mb-4">
              <div className="card-header"><h2>📈 Score Trends & Alerts</h2></div>
              <div className="card-body">
                <ScoreAlerts scores={patientScores} />
                <TrendChart scores={patientScores} />
              </div>
            </div>
          )}

          {/* Historical Scores */}
          <div className="card">
            <div className="card-header">
              <h2>📊 Assessment History</h2>
            </div>
            <div className="card-body no-pad">
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>Tool</th><th>Score</th><th>Interpretation</th><th>Administered By</th></tr>
                </thead>
                <tbody>
                  {patientScores.map((s) => {
                    const maxScores = { 'PHQ-9': 27, 'GAD-7': 21, 'PCL-5': 80, 'AUDIT-C': 12, 'Columbia Suicide Severity Rating': 6, 'ASRS v1.1': 24, 'MoCA': 30, 'MDQ': 13, 'DAST-10': 10 };
                    const max = maxScores[s.tool] || 30;
                    const pct = Math.min((s.score / max) * 100, 100);
                    const level = pct > 70 ? 'severe' : pct > 50 ? 'high' : pct > 30 ? 'moderate' : 'low';
                    return (
                      <tr key={s.id}>
                        <td className="font-medium">{s.date}</td>
                        <td><span className="badge badge-primary">{s.tool}</span></td>
                        <td>
                          <span className="font-bold" style={{ fontSize: 16 }}>{s.score}</span>
                          <span className="text-muted text-xs"> / {max}</span>
                          <div className="score-bar" style={{ width: 100, marginTop: 4 }}>
                            <div className={`fill ${level}`} style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td>
                          <span className={
                            level === 'severe' ? 'text-danger font-bold' :
                            level === 'high' ? 'text-warning font-bold' :
                            level === 'moderate' ? 'text-warning' : 'text-success'
                          }>
                            {s.interpretation}
                          </span>
                        </td>
                        <td className="text-sm text-muted">{s.administeredBy}</td>
                      </tr>
                    );
                  })}
                  {patientScores.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No assessments recorded</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Active Assessment */}
      {activeTool && (
        <div className="card">
          <div className="card-header">
            <h2>📊 {activeTool.name}</h2>
            <button className="btn btn-sm btn-secondary" onClick={() => setActiveTool(null)}>Cancel</button>
          </div>
          <div className="card-body">
            <div className="alert alert-info mb-4">
              Over the <strong>last 2 weeks</strong>, how often have you been bothered by any of the following problems?
            </div>

            {activeTool.questions.map((q, qi) => (
              <div key={qi} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                <div style={{ marginBottom: 8 }}>
                  <span className="font-bold" style={{ color: 'var(--primary)', marginRight: 8 }}>{qi + 1}.</span>
                  <span className="font-medium">{q}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {activeTool.yesNo ? (
                    <>
                      <button
                        className={`btn btn-sm ${answers[qi] === 0 ? 'btn-secondary' : 'btn-primary'}`}
                        style={answers[qi] === 0 ? { border: '2px solid var(--border)' } : {}}
                        onClick={() => { const a = [...answers]; a[qi] = 0; setAnswers(a); }}
                      >No (0)</button>
                      <button
                        className={`btn btn-sm ${answers[qi] === 1 ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={() => { const a = [...answers]; a[qi] = 1; setAnswers(a); }}
                      >Yes (1)</button>
                    </>
                  ) : (
                    SCORING_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        className={`btn btn-sm ${answers[qi] === opt.value ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => { const a = [...answers]; a[qi] = opt.value; setAnswers(a); }}
                      >
                        {opt.label}
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))}

            <div style={{ background: 'var(--bg)', padding: 20, borderRadius: 'var(--radius-lg)', marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="text-sm text-muted">Total Score</div>
                  <div style={{ fontSize: 32, fontWeight: 800 }}>
                    {answers.reduce((sum, a) => sum + a, 0)} <span className="text-muted text-sm font-medium">/ {activeTool.max}</span>
                  </div>
                  <div className="font-semibold mt-2">
                    {activeTool.interpret(answers.reduce((sum, a) => sum + a, 0))}
                  </div>
                </div>
                <button className="btn btn-primary btn-lg" onClick={submitAssessment}>
                  Submit Assessment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
