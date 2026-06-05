import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';

const GOAL_STATUSES = ['Active', 'Progressing', 'Met', 'Discontinued', 'Deferred'];
const GOAL_STATUS_COLORS = {
  Active:       { bg: '#dbeafe', color: '#1e40af' },
  Progressing:  { bg: '#fef3c7', color: '#92400e' },
  Met:          { bg: '#dcfce7', color: '#166534' },
  Discontinued: { bg: '#fee2e2', color: '#991b1b' },
  Deferred:     { bg: '#f1f5f9', color: '#475569' },
};

const DOMAINS = ['Mood & Affect', 'Anxiety & Stress', 'Substance Use', 'Trauma & PTSD', 'Psychosis', 'Sleep', 'Social Functioning', 'Occupational', 'Self-Care', 'Safety & Crisis', 'ADHD / Executive Function', 'Eating / Body Image'];

const INTERVENTION_TEMPLATES = [
  'Cognitive Behavioral Therapy (CBT)',
  'Dialectical Behavior Therapy (DBT)',
  'EMDR — Eye Movement Desensitization',
  'Motivational Interviewing',
  'Medication Management',
  'Psychoeducation',
  'Behavioral Activation',
  'Exposure & Response Prevention',
  'Mindfulness-Based Stress Reduction',
  'Supportive Psychotherapy',
  'Family Systems Therapy',
  'Crisis Safety Planning',
  'Harm Reduction Counseling',
  'Sleep Hygiene Education',
  'Social Skills Training',
];

const FREQUENCY = ['Weekly', 'Biweekly', 'Monthly', 'As Needed', 'PRN'];

const MOCK_PLANS = [
  // ── Rolling Meadows (loc-apmg) ──────────────────────────────────────────────
  {
    id: 'tp-1', patientId: 'p1', patientName: 'James Anderson', createdDate: '2026-01-15', reviewDate: '2026-04-15', nextReviewDate: '2026-07-15',
    provider: 'Dr. Chris L.', status: 'Active',
    diagnoses: ['F31.81 — Bipolar II Disorder', 'F90.0 — ADHD, Predominantly Inattentive'],
    goals: [
      { id: 'g1', domain: 'Mood & Affect', description: 'Patient will achieve mood stability with < 2 hypomanic episodes per quarter', status: 'Progressing', targetDate: '2026-07-15', measure: 'MDQ score, mood chart', progress: 65, interventions: ['Medication Management', 'Psychoeducation', 'CBT'], notes: 'Lithium therapeutic, 1 brief hypomanic episode in Q1', outcomeMeasure: 'MDQ', baselineScore: 9, currentScore: 4, checkIns: [{ id: 'ci1', date: '2026-02-01', progress: 20, note: 'Initial mood charting begun. Discussing triggers and sleep patterns.', author: 'Dr. Chris L.' }, { id: 'ci2', date: '2026-03-01', progress: 45, note: 'MDQ improved from 9 → 6. 1 brief hypomanic episode, self-reported. Lithium level therapeutic.', author: 'Dr. Chris L.' }, { id: 'ci3', date: '2026-04-10', progress: 65, note: 'MDQ now 4. No hospitalizations. Sleep diary consistent. On track for Q2 goal.', author: 'Dr. Chris L.' }] },
      { id: 'g2', domain: 'ADHD / Executive Function', description: 'Patient will implement organizational strategies and improve focus in work tasks', status: 'Active', targetDate: '2026-07-15', measure: 'ASRS score, self-report', progress: 40, interventions: ['Medication Management', 'Behavioral Activation', 'Psychoeducation'], notes: 'Started Vyvanse, titrating dose', outcomeMeasure: 'ASRS', baselineScore: 24, currentScore: 15, checkIns: [{ id: 'ci4', date: '2026-02-15', progress: 15, note: 'Vyvanse 20mg started. Patient reporting slight improvement in morning focus.', author: 'Dr. Chris L.' }, { id: 'ci5', date: '2026-03-15', progress: 40, note: 'Dose titrated to 40mg. ASRS down from 24 → 15. Work task completion improved per self-report.', author: 'Dr. Chris L.' }] },
      { id: 'g3', domain: 'Sleep', description: 'Patient will establish consistent sleep schedule (10pm-6am) 5+ nights/week', status: 'Met', targetDate: '2026-04-15', measure: 'Sleep diary', progress: 100, interventions: ['Sleep Hygiene Education', 'CBT'], notes: 'Goal met — averaging 6.5 nights consistent', outcomeMeasure: null, baselineScore: null, currentScore: null, checkIns: [{ id: 'ci6', date: '2026-02-01', progress: 30, note: 'Sleep hygiene education complete. Patient began sleep diary.', author: 'Dr. Chris L.' }, { id: 'ci7', date: '2026-03-01', progress: 70, note: '5 of 7 nights on schedule. Some difficulty on weekends.', author: 'Dr. Chris L.' }, { id: 'ci8', date: '2026-04-10', progress: 100, note: 'Goal achieved. 6.5 nights/week consistent for 3 weeks. Goal marked Met.', author: 'Dr. Chris L.' }] },
    ],
    sessionFrequency: 'Biweekly', anticipatedDuration: '6 months', lastUpdated: '2026-04-10',
  },
  {
    id: 'tp-2', patientId: 'p2', patientName: 'Maria Garcia', createdDate: '2026-02-01', reviewDate: '2026-05-01', nextReviewDate: '2026-08-01',
    provider: 'April Torres, LCSW', status: 'Active',
    diagnoses: ['F41.1 — Generalized Anxiety Disorder', 'F43.10 — PTSD, Unspecified'],
    goals: [
      { id: 'g4', domain: 'Anxiety & Stress', description: 'Patient will reduce GAD-7 score from 16 (severe) to < 10 (moderate)', status: 'Progressing', targetDate: '2026-08-01', measure: 'GAD-7', progress: 50, interventions: ['CBT', 'Mindfulness-Based Stress Reduction', 'Medication Management'], notes: 'GAD-7 currently 13 — improved from 16', outcomeMeasure: 'GAD-7', baselineScore: 16, currentScore: 9, checkIns: [{ id: 'ci9', date: '2026-02-20', progress: 15, note: 'CBT skills introduced. Patient identifying thought distortions.', author: 'April Torres, LCSW' }, { id: 'ci10', date: '2026-03-20', progress: 35, note: 'GAD-7 13 (down from 16). Medication adjustment made by prescriber.', author: 'April Torres, LCSW' }, { id: 'ci11', date: '2026-04-20', progress: 50, note: 'GAD-7 now 9 — within moderate range. Continuing CBT, patient reporting reduced worry frequency.', author: 'April Torres, LCSW' }] },
      { id: 'g5', domain: 'Trauma & PTSD', description: 'Patient will develop and utilize trauma coping skills without avoidance behaviors', status: 'Active', targetDate: '2026-08-01', measure: 'PCL-5, session observation', progress: 25, interventions: ['EMDR', 'Exposure & Response Prevention', 'Supportive Psychotherapy'], notes: 'Beginning EMDR phase 3, tolerating well', outcomeMeasure: 'PCL-5', baselineScore: 52, currentScore: 38, checkIns: [{ id: 'ci12', date: '2026-02-15', progress: 10, note: 'EMDR history-taking phase complete. Identified target memories and disturbances.', author: 'April Torres, LCSW' }, { id: 'ci13', date: '2026-04-01', progress: 25, note: 'Phase 3 active processing begun. PCL-5 52 → 44. Tolerating sessions with grounding techniques.', author: 'April Torres, LCSW' }] },
      { id: 'g6', domain: 'Social Functioning', description: 'Patient will attend 1+ social activity per week', status: 'Active', targetDate: '2026-08-01', measure: 'Self-report, activity log', progress: 30, interventions: ['Behavioral Activation', 'Social Skills Training'], notes: 'Joined a book club, attending ~2x/month', outcomeMeasure: null, baselineScore: null, currentScore: null, checkIns: [{ id: 'ci14', date: '2026-03-10', progress: 20, note: 'Patient identified book club as low-anxiety social option. Will attempt first session.', author: 'April Torres, LCSW' }, { id: 'ci15', date: '2026-04-10', progress: 30, note: 'Attended 2 of 4 sessions. Reports mild anxiety but tolerable. Activity log started.', author: 'April Torres, LCSW' }] },
    ],
    sessionFrequency: 'Weekly', anticipatedDuration: '9 months', lastUpdated: '2026-04-08',
  },
  // ── Emmanus Wellness (bdaec5ec-...) ─────────────────────────────────────────
  {
    id: 'tp-3', patientId: 'pe1', patientName: 'Nadia Osei', createdDate: '2026-03-10', reviewDate: '2026-06-10', nextReviewDate: '2026-09-10',
    provider: 'Emmanuel Ofori-Danso, NP', status: 'Active',
    diagnoses: ['F41.1 — Generalized Anxiety Disorder', 'F32.1 — Major Depressive Disorder, Moderate'],
    goals: [
      { id: 'g-pe1-1', domain: 'Anxiety & Stress', description: 'Patient will reduce GAD-7 score from 14 to < 8 within 6 months', status: 'Progressing', targetDate: '2026-09-10', measure: 'GAD-7', progress: 40, interventions: ['Medication Management', 'CBT', 'Mindfulness-Based Stress Reduction'], notes: 'Escitalopram titrated to 10mg, GAD-7 improving', outcomeMeasure: 'GAD-7', baselineScore: 14, currentScore: 10, checkIns: [{ id: 'ci-pe1-1', date: '2026-04-01', progress: 20, note: 'Escitalopram 5mg started. Patient reporting mild side effects, tolerable.', author: 'Emmanuel Ofori-Danso, NP' }, { id: 'ci-pe1-2', date: '2026-05-01', progress: 40, note: 'Dose increased to 10mg. GAD-7 14 → 10. Patient reporting improved sleep quality.', author: 'Emmanuel Ofori-Danso, NP' }] },
      { id: 'g-pe1-2', domain: 'Mood & Affect', description: 'Patient will report PHQ-9 < 10 and sustained mood improvement', status: 'Active', targetDate: '2026-09-10', measure: 'PHQ-9', progress: 30, interventions: ['Medication Management', 'Behavioral Activation'], notes: 'PHQ-9 baseline 12, currently 9', outcomeMeasure: 'PHQ-9', baselineScore: 12, currentScore: 9, checkIns: [{ id: 'ci-pe1-3', date: '2026-05-15', progress: 30, note: 'PHQ-9 reduced to 9. Patient re-engaged with social activities. Mood tracking initiated.', author: 'Emmanuel Ofori-Danso, NP' }] },
    ],
    sessionFrequency: 'Biweekly', anticipatedDuration: '6 months', lastUpdated: '2026-05-15',
  },
  {
    id: 'tp-4', patientId: 'pe2', patientName: 'Kofi Mensah', createdDate: '2026-02-15', reviewDate: '2026-05-15', nextReviewDate: '2026-08-15',
    provider: 'Emmanuel Ofori-Danso, NP', status: 'Active',
    diagnoses: ['F90.0 — ADHD, Predominantly Inattentive', 'F32.0 — Major Depressive Disorder, Mild'],
    goals: [
      { id: 'g-pe2-1', domain: 'ADHD / Executive Function', description: 'Patient will implement task management strategies and improve workplace focus', status: 'Progressing', targetDate: '2026-08-15', measure: 'ASRS, self-report', progress: 55, interventions: ['Medication Management', 'Behavioral Activation', 'Psychoeducation'], notes: 'Sertraline + ADHD coaching underway', outcomeMeasure: 'ASRS', baselineScore: 22, currentScore: 13, checkIns: [{ id: 'ci-pe2-1', date: '2026-03-15', progress: 25, note: 'ASRS baseline 22. Task list system introduced. Patient engaged.', author: 'Emmanuel Ofori-Danso, NP' }, { id: 'ci-pe2-2', date: '2026-05-01', progress: 55, note: 'ASRS 13. Using Pomodoro timer at work. Supervisor feedback positive.', author: 'Emmanuel Ofori-Danso, NP' }] },
    ],
    sessionFrequency: 'Monthly', anticipatedDuration: '9 months', lastUpdated: '2026-05-28',
  },
];

export default function TreatmentPlans() {
  const { currentUser } = useAuth();
  const { patients } = usePatient();

  // Filter mock plans to only those belonging to patients this user can see
  const accessiblePatientIds = useMemo(() => new Set(patients.map(p => p.id)), [patients]);
  const filteredMockPlans = useMemo(
    () => MOCK_PLANS.filter(plan => accessiblePatientIds.has(plan.patientId)),
    [accessiblePatientIds]
  );

  const [plans, setPlans] = useState(filteredMockPlans);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [newGoal, setNewGoal] = useState({ domain: '', description: '', targetDate: '', measure: '', interventions: [], notes: '' });
  const [newPlanPatient, setNewPlanPatient] = useState('');
  const [newPlanDiagnoses, setNewPlanDiagnoses] = useState('');
  const [newPlanFreq, setNewPlanFreq] = useState('Weekly');
  const [showCheckInGoalId, setShowCheckInGoalId] = useState(null);
  const [expandedCheckIns, setExpandedCheckIns] = useState({});
  const [newCheckIn, setNewCheckIn] = useState({ date: new Date().toISOString().split('T')[0], progress: 50, note: '' });

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const addCheckIn = (planId, goalId) => {
    if (!newCheckIn.note.trim()) return;
    const entry = { id: `ci-${Date.now()}`, ...newCheckIn, author: `${currentUser.firstName} ${currentUser.lastName}` };
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, goals: p.goals.map(g => g.id === goalId ? { ...g, checkIns: [...(g.checkIns || []), entry], progress: newCheckIn.progress } : g) } : p));
    setShowCheckInGoalId(null);
    setNewCheckIn({ date: new Date().toISOString().split('T')[0], progress: 50, note: '' });
  };

  const isSmartGoal = (goal) => {
    const hasDescription = goal.description && goal.description.length > 20;
    const hasMeasure = goal.measure && goal.measure.length > 2;
    const hasDate = !!goal.targetDate;
    const hasInterventions = goal.interventions && goal.interventions.length > 0;
    return { hasDescription, hasMeasure, hasDate, hasInterventions, score: [hasDescription, hasMeasure, hasDate, hasInterventions].filter(Boolean).length };
  };

  const updateGoalProgress = (planId, goalId, progress) => {
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, goals: p.goals.map(g => g.id === goalId ? { ...g, progress: Math.min(100, Math.max(0, progress)), status: progress >= 100 ? 'Met' : progress > 0 ? 'Progressing' : 'Active' } : g) } : p));
  };

  const updateGoalStatus = (planId, goalId, status) => {
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, goals: p.goals.map(g => g.id === goalId ? { ...g, status } : g) } : p));
  };

  const addGoalToPlan = (planId) => {
    if (!newGoal.domain || !newGoal.description) return;
    const goal = { id: `g-${Date.now()}`, ...newGoal, status: 'Active', progress: 0 };
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, goals: [...p.goals, goal] } : p));
    setShowNewGoal(false);
    setNewGoal({ domain: '', description: '', targetDate: '', measure: '', interventions: [], notes: '' });
  };

  const createPlan = () => {
    const patient = patients.find(p => p.id === newPlanPatient);
    if (!patient) return;
    const plan = {
      id: `tp-${Date.now()}`, patientId: patient.id, patientName: `${patient.firstName} ${patient.lastName}`,
      createdDate: new Date().toISOString().split('T')[0], reviewDate: new Date(Date.now() + 90*86400000).toISOString().split('T')[0],
      nextReviewDate: new Date(Date.now() + 180*86400000).toISOString().split('T')[0],
      provider: `${currentUser.firstName} ${currentUser.lastName}`, status: 'Active',
      diagnoses: newPlanDiagnoses.split('\n').filter(Boolean), goals: [],
      sessionFrequency: newPlanFreq, anticipatedDuration: '6 months', lastUpdated: new Date().toISOString().split('T')[0],
    };
    setPlans(prev => [plan, ...prev]);
    setSelectedPlanId(plan.id);
    setShowNewPlan(false);
    setNewPlanPatient(''); setNewPlanDiagnoses(''); setNewPlanFreq('Weekly');
  };

  const ProgressRing = ({ pct, size = 52, stroke = 5 }) => {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    const color = pct >= 100 ? '#059669' : pct >= 60 ? '#3b82f6' : pct >= 30 ? '#f59e0b' : '#ef4444';
    const fontSize = size <= 40 ? 9 : 12;
    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize, fontWeight: 800, color, lineHeight: 1,
        }}>{pct}%</div>
      </div>
    );
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>📋 Treatment Plans</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Build goal-oriented treatment plans with measurable outcomes, interventions, and progress tracking</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewPlan(true)}>➕ New Treatment Plan</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, minHeight: 500 }}>
        {/* Plan list */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>
            Treatment Plans ({plans.length})
          </div>
          {plans.map(plan => {
            const totalProgress = plan.goals.length > 0 ? Math.round(plan.goals.reduce((s, g) => s + g.progress, 0) / plan.goals.length) : 0;
            const isSelected = selectedPlanId === plan.id;
            return (
              <div key={plan.id} onClick={() => setSelectedPlanId(plan.id)}
                style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isSelected ? 'var(--primary-light)' : 'transparent', transition: 'background 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{plan.patientName}</span>
                  <ProgressRing pct={totalProgress} size={36} stroke={4} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {plan.goals.length} goal{plan.goals.length !== 1 ? 's' : ''} · {plan.sessionFrequency} · Review: {plan.nextReviewDate}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                  {plan.diagnoses.slice(0, 2).join(' | ')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Plan detail */}
        {selectedPlan ? (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{selectedPlan.patientName}</h2>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Created {selectedPlan.createdDate} · {selectedPlan.provider} · {selectedPlan.sessionFrequency} sessions
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>🖨️ Print</button>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowNewGoal(true)}>➕ Add Goal</button>
                </div>
              </div>
              {/* Diagnoses */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {selectedPlan.diagnoses.map(d => (
                  <span key={d} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: '#dbeafe', color: '#1e40af', fontWeight: 700 }}>{d}</span>
                ))}
              </div>
            </div>

            {/* Goals */}
            <div style={{ padding: 20, overflowY: 'auto', maxHeight: 480 }}>
              {selectedPlan.goals.map((goal, i) => {
                const gsc = GOAL_STATUS_COLORS[goal.status] || GOAL_STATUS_COLORS.Active;
                return (
                  <div key={goal.id} style={{ marginBottom: 16, padding: 18, borderRadius: 12, border: '1px solid var(--border)', background: '#fafbfc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#eff6ff', color: '#1e40af', fontWeight: 700 }}>{goal.domain}</span>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: gsc.bg, color: gsc.color, fontWeight: 700 }}>{goal.status}</span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.5, color: 'var(--text-primary)' }}>
                          Goal {i + 1}: {goal.description}
                        </div>
                      </div>
                      <ProgressRing pct={goal.progress} size={56} stroke={5} />
                    </div>

                    {/* Progress slider */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Progress</span>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>{goal.progress}%</span>
                      </div>
                      <input type="range" min={0} max={100} step={5} value={goal.progress}
                        onChange={e => updateGoalProgress(selectedPlan.id, goal.id, parseInt(e.target.value))}
                        style={{ width: '100%', height: 6, borderRadius: 3, appearance: 'none', background: `linear-gradient(to right, ${goal.progress >= 100 ? '#059669' : '#3b82f6'} ${goal.progress}%, #e2e8f0 ${goal.progress}%)`, cursor: 'pointer' }} />
                    </div>

                    {/* Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10, fontSize: 12 }}>
                      <div><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Measure:</span> {goal.measure}</div>
                      <div><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Target:</span> {goal.targetDate}</div>
                    </div>

                    {/* Interventions */}
                    <div style={{ marginBottom: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Interventions</span>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        {goal.interventions.map(iv => (
                          <span key={iv} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: '#f0fdf4', color: '#166534', fontWeight: 600, border: '1px solid #86efac' }}>{iv}</span>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    {goal.notes && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 12px', background: '#fffbeb', borderRadius: 6, border: '1px solid #fde68a', lineHeight: 1.5, marginBottom: 10 }}>
                        📝 {goal.notes}
                      </div>
                    )}

                    {/* Outcome Measure Score */}
                    {goal.outcomeMeasure && goal.baselineScore != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd', marginBottom: 10 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>{goal.outcomeMeasure}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Baseline: <strong>{goal.baselineScore}</strong></span>
                        <span style={{ fontSize: 16, color: '#d1d5db' }}>→</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: goal.currentScore <= goal.baselineScore ? '#059669' : '#dc2626' }}>Current: <strong>{goal.currentScore}</strong></span>
                        {goal.baselineScore > 0 && (
                          <span style={{ fontSize: 12, fontWeight: 800, color: goal.currentScore <= goal.baselineScore ? '#059669' : '#dc2626', marginLeft: 4 }}>
                            {goal.currentScore < goal.baselineScore ? `↓ ${Math.round(((goal.baselineScore - goal.currentScore) / goal.baselineScore) * 100)}% reduction` : goal.currentScore > goal.baselineScore ? '↑ Increased' : '→ Unchanged'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Check-in History */}
                    {goal.checkIns && goal.checkIns.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <button onClick={() => setExpandedCheckIns(prev => ({ ...prev, [goal.id]: !prev[goal.id] }))}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#6366f1', padding: '4px 0', marginBottom: 4 }}>
                          {expandedCheckIns[goal.id] ? '▾' : '▸'} Check-in History ({goal.checkIns.length})
                        </button>
                        {expandedCheckIns[goal.id] && (
                          <div style={{ borderLeft: '3px solid #c7d2fe', paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {goal.checkIns.map(ci => (
                              <div key={ci.id} style={{ position: 'relative' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                  <span style={{ fontSize: 10, fontWeight: 800, color: '#4f46e5', background: '#eef2ff', padding: '1px 6px', borderRadius: 4 }}>{ci.date}</span>
                                  <span style={{ fontSize: 10, color: '#6b7280' }}>{ci.author}</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: ci.progress >= 100 ? '#059669' : '#3b82f6', marginLeft: 'auto' }}>{ci.progress}%</span>
                                </div>
                                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.4 }}>{ci.note}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SMART badge + Status actions */}
                    <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      {(() => { const sm = isSmartGoal(goal); const full = sm.score === 4; return (
                        <span title={`SMART: ${sm.hasDescription ? '✓' : '✕'} Specific  ${sm.hasMeasure ? '✓' : '✕'} Measurable  ${sm.hasDate ? '✓' : '✕'} Time-bound  ${sm.hasInterventions ? '✓' : '✕'} Actionable`}
                          style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, border: '1px solid ' + (full ? '#86efac' : '#fde68a'), background: full ? '#f0fdf4' : '#fffbeb', color: full ? '#166534' : '#92400e', fontWeight: 800, cursor: 'help' }}>
                          {full ? '✅ SMART' : `⚠ SMART ${sm.score}/4`}
                        </span>
                      ); })()}
                      {GOAL_STATUSES.map(s => (
                        <button key={s} onClick={() => updateGoalStatus(selectedPlan.id, goal.id, s)}
                          style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, border: goal.status === s ? '2px solid var(--primary)' : '1px solid var(--border)', background: goal.status === s ? 'var(--primary-light)' : '#fff', color: goal.status === s ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer' }}>
                          {s}
                        </button>
                      ))}
                      <button onClick={() => { setShowCheckInGoalId(goal.id); setNewCheckIn(p => ({ ...p, progress: goal.progress })); }}
                        style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4f46e5', fontWeight: 700, cursor: 'pointer', marginLeft: 'auto' }}>
                        📝 Add Check-in
                      </button>
                    </div>
                  </div>
                );
              })}

              {selectedPlan.goals.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🎯</div>
                  <div style={{ fontWeight: 600 }}>No goals yet — click "Add Goal" to begin</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Select a treatment plan</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Choose a plan from the list to view goals and track progress</div>
            </div>
          </div>
        )}
      </div>

      {/* Add Goal Modal */}
      {showNewGoal && selectedPlan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowNewGoal(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #059669, #065f46)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>🎯 Add Treatment Goal</div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>For {selectedPlan.patientName}</div>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Domain *</label>
                <select className="form-input" value={newGoal.domain} onChange={e => setNewGoal(g => ({ ...g, domain: e.target.value }))}>
                  <option value="">Select domain...</option>
                  {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Goal Description *</label>
                <textarea className="form-textarea" rows={2} value={newGoal.description} onChange={e => setNewGoal(g => ({ ...g, description: e.target.value }))} placeholder="Patient will..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Target Date</label>
                  <input type="date" className="form-input" value={newGoal.targetDate} onChange={e => setNewGoal(g => ({ ...g, targetDate: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Outcome Measure</label>
                  <input className="form-input" value={newGoal.measure} onChange={e => setNewGoal(g => ({ ...g, measure: e.target.value }))} placeholder="e.g. PHQ-9 score" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Interventions</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {INTERVENTION_TEMPLATES.map(iv => (
                    <button key={iv} onClick={() => setNewGoal(g => ({ ...g, interventions: g.interventions.includes(iv) ? g.interventions.filter(x => x !== iv) : [...g.interventions, iv] }))}
                      style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6, border: newGoal.interventions.includes(iv) ? '2px solid #059669' : '1px solid var(--border)', background: newGoal.interventions.includes(iv) ? '#dcfce7' : '#fff', color: newGoal.interventions.includes(iv) ? '#065f46' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>
                      {newGoal.interventions.includes(iv) ? '✓ ' : ''}{iv}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea className="form-textarea" rows={2} value={newGoal.notes} onChange={e => setNewGoal(g => ({ ...g, notes: e.target.value }))} placeholder="Additional notes..." />
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowNewGoal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => addGoalToPlan(selectedPlan.id)} disabled={!newGoal.domain || !newGoal.description}>🎯 Add Goal</button>
            </div>
          </div>
        </div>
      )}

      {/* Check-in Modal */}
      {showCheckInGoalId && selectedPlan && (() => {
        const goal = selectedPlan.goals.find(g => g.id === showCheckInGoalId);
        if (!goal) return null;
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget) setShowCheckInGoalId(null); }}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #4f46e5, #3730a3)', color: '#fff' }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>📝 Add Goal Check-In</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{goal.domain} — {goal.description.slice(0, 60)}{goal.description.length > 60 ? '…' : ''}</div>
              </div>
              <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Check-In Date</label>
                    <input type="date" className="form-input" value={newCheckIn.date} onChange={e => setNewCheckIn(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Progress: {newCheckIn.progress}%</label>
                    <input type="range" min={0} max={100} step={5} value={newCheckIn.progress} onChange={e => setNewCheckIn(p => ({ ...p, progress: parseInt(e.target.value) }))}
                      style={{ width: '100%', height: 6, borderRadius: 3, appearance: 'none', background: `linear-gradient(to right, #4f46e5 ${newCheckIn.progress}%, #e2e8f0 ${newCheckIn.progress}%)`, cursor: 'pointer', marginTop: 8 }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Session Note *</label>
                  <textarea className="form-textarea" rows={4} value={newCheckIn.note} onChange={e => setNewCheckIn(p => ({ ...p, note: e.target.value }))} placeholder="Describe progress, barriers, interventions used, and plan for next session…" />
                </div>
              </div>
              <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setShowCheckInGoalId(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => addCheckIn(selectedPlan.id, showCheckInGoalId)} disabled={!newCheckIn.note.trim()}>📝 Save Check-In</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* New Plan Modal */}
      {showNewPlan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowNewPlan(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #4f46e5, #3730a3)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>📋 New Treatment Plan</div>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Patient *</label>
                <select className="form-input" value={newPlanPatient} onChange={e => setNewPlanPatient(e.target.value)}>
                  <option value="">Select patient...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.lastName}, {p.firstName}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Diagnoses (one per line)</label>
                <textarea className="form-textarea" rows={3} value={newPlanDiagnoses} onChange={e => setNewPlanDiagnoses(e.target.value)} placeholder="F33.1 — Major Depressive Disorder, Recurrent&#10;F41.1 — Generalized Anxiety Disorder" />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Session Frequency</label>
                <select className="form-input" value={newPlanFreq} onChange={e => setNewPlanFreq(e.target.value)}>
                  {FREQUENCY.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowNewPlan(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createPlan} disabled={!newPlanPatient}>📋 Create Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
