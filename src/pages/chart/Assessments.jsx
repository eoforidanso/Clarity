import React, { useState } from 'react';
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

export default function Assessments({ patientId }) {
  const { currentUser } = useAuth();
  const { assessmentScores, addAssessment } = usePatient();
  const [activeTool, setActiveTool] = useState(null);
  const [answers, setAnswers] = useState([]);

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
    setActiveTool(null);
    setAnswers([]);
  };

  return (
    <div>
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
