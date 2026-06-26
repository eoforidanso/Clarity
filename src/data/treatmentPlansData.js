export const GOAL_STATUSES = ['Active', 'Progressing', 'Met', 'Discontinued', 'Deferred'];

export const GOAL_STATUS_COLORS = {
  Active:       { bg: '#dbeafe', color: '#1e40af' },
  Progressing:  { bg: '#fef3c7', color: '#92400e' },
  Met:          { bg: '#dcfce7', color: '#166534' },
  Discontinued: { bg: '#fee2e2', color: '#991b1b' },
  Deferred:     { bg: '#f1f5f9', color: '#475569' },
};

export const DOMAINS = [
  'Mood & Affect', 'Anxiety & Stress', 'Substance Use', 'Trauma & PTSD',
  'Psychosis', 'Sleep', 'Social Functioning', 'Occupational', 'Self-Care',
  'Safety & Crisis', 'ADHD / Executive Function', 'Eating / Body Image',
];

export const INTERVENTION_TEMPLATES = [
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

export const FREQUENCY = ['Weekly', 'Biweekly', 'Monthly', 'As Needed', 'PRN'];

export const MOCK_PLANS = [
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
      { id: 'g5', domain: 'Trauma & PTSD', description: 'Patient will develop and utilize trauma coping skills without avoidance behaviors', status: 'Active', targetDate: '2026-08-01', measure: 'PCL-5, session observation', progress: 25, interventions: ['EMDR — Eye Movement Desensitization', 'Exposure & Response Prevention', 'Supportive Psychotherapy'], notes: 'Beginning EMDR phase 3, tolerating well', outcomeMeasure: 'PCL-5', baselineScore: 52, currentScore: 38, checkIns: [{ id: 'ci12', date: '2026-02-15', progress: 10, note: 'EMDR history-taking phase complete. Identified target memories and disturbances.', author: 'April Torres, LCSW' }, { id: 'ci13', date: '2026-04-01', progress: 25, note: 'Phase 3 active processing begun. PCL-5 52 → 44. Tolerating sessions with grounding techniques.', author: 'April Torres, LCSW' }] },
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
