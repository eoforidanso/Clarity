/**
 * Clinical Assessment Templates
 * PHQ-9, GAD-7, Columbia Suicide Severity Rating Scale (C-SSRS Screener)
 * Scoring logic and severity thresholds included.
 */

// Shared response options for PHQ-9 and GAD-7
const FREQ_OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
];

export const ASSESSMENTS = {
  // ── PHQ-9 ──────────────────────────────────────────────────────────────────
  PHQ9: {
    id: 'PHQ9',
    name: 'PHQ-9',
    fullName: 'Patient Health Questionnaire-9',
    description: 'Depression screening and severity measurement',
    estimatedMinutes: 3,
    maxScore: 27,
    instructions: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
    questions: [
      { id: 'phq1',  text: 'Little interest or pleasure in doing things' },
      { id: 'phq2',  text: 'Feeling down, depressed, or hopeless' },
      { id: 'phq3',  text: 'Trouble falling or staying asleep, or sleeping too much' },
      { id: 'phq4',  text: 'Feeling tired or having little energy' },
      { id: 'phq5',  text: 'Poor appetite or overeating' },
      { id: 'phq6',  text: 'Feeling bad about yourself — or that you are a failure, or have let yourself or your family down' },
      { id: 'phq7',  text: 'Trouble concentrating on things, such as reading the newspaper or watching television' },
      { id: 'phq8',  text: 'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual' },
      { id: 'phq9',  text: 'Thoughts that you would be better off dead, or of hurting yourself in some way', isSuicidal: true },
    ],
    options: FREQ_OPTIONS,
    scoring: (score) => {
      if (score <= 4)  return { severity: 'Minimal',  color: '#16a34a', bg: '#f0fdf4', description: 'Minimal depression', recommendation: 'No action needed. Rescreen in 12 months.' };
      if (score <= 9)  return { severity: 'Mild',     color: '#65a30d', bg: '#f7fee7', description: 'Mild depression',    recommendation: 'Watchful waiting, repeat PHQ-9 at follow-up.' };
      if (score <= 14) return { severity: 'Moderate', color: '#d97706', bg: '#fffbeb', description: 'Moderate depression', recommendation: 'Treatment plan, counseling and/or pharmacotherapy.' };
      if (score <= 19) return { severity: 'Moderately Severe', color: '#dc2626', bg: '#fef2f2', description: 'Moderately severe depression', recommendation: 'Active treatment — pharmacotherapy and/or psychotherapy.' };
      return              { severity: 'Severe',   color: '#7f1d1d', bg: '#fef2f2', description: 'Severe depression', recommendation: 'Immediate initiation of pharmacotherapy and expedited referral.' };
    },
    followUpQuestion: {
      text: 'If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?',
      options: ['Not difficult at all', 'Somewhat difficult', 'Very difficult', 'Extremely difficult'],
    },
  },

  // ── GAD-7 ──────────────────────────────────────────────────────────────────
  GAD7: {
    id: 'GAD7',
    name: 'GAD-7',
    fullName: 'Generalized Anxiety Disorder 7-item Scale',
    description: 'Anxiety screening and severity measurement',
    estimatedMinutes: 3,
    maxScore: 21,
    instructions: 'Over the last 2 weeks, how often have you been bothered by the following problems?',
    questions: [
      { id: 'gad1', text: 'Feeling nervous, anxious, or on edge' },
      { id: 'gad2', text: 'Not being able to stop or control worrying' },
      { id: 'gad3', text: 'Worrying too much about different things' },
      { id: 'gad4', text: 'Trouble relaxing' },
      { id: 'gad5', text: 'Being so restless that it is hard to sit still' },
      { id: 'gad6', text: 'Becoming easily annoyed or irritable' },
      { id: 'gad7', text: 'Feeling afraid, as if something awful might happen' },
    ],
    options: FREQ_OPTIONS,
    scoring: (score) => {
      if (score <= 4)  return { severity: 'Minimal',  color: '#16a34a', bg: '#f0fdf4', description: 'Minimal anxiety', recommendation: 'No action needed.' };
      if (score <= 9)  return { severity: 'Mild',     color: '#65a30d', bg: '#f7fee7', description: 'Mild anxiety',    recommendation: 'Monitor, consider watchful waiting.' };
      if (score <= 14) return { severity: 'Moderate', color: '#d97706', bg: '#fffbeb', description: 'Moderate anxiety', recommendation: 'Consider therapy and/or pharmacotherapy.' };
      return              { severity: 'Severe',   color: '#dc2626', bg: '#fef2f2', description: 'Severe anxiety', recommendation: 'Active treatment required. Consider referral.' };
    },
    followUpQuestion: {
      text: 'If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?',
      options: ['Not difficult at all', 'Somewhat difficult', 'Very difficult', 'Extremely difficult'],
    },
  },

  // ── C-SSRS Screener ────────────────────────────────────────────────────────
  CSSRS: {
    id: 'CSSRS',
    name: 'C-SSRS',
    fullName: 'Columbia Suicide Severity Rating Scale (Screener)',
    description: 'Suicide risk assessment — ideation and behavior screener',
    estimatedMinutes: 5,
    maxScore: null, // risk level based, not a numeric total
    instructions: 'Please answer the following questions about thoughts you may have had. Answer YES or NO.',
    questions: [
      {
        id: 'cssrs1',
        text: 'Have you wished you were dead or wished you could go to sleep and not wake up?',
        category: 'ideation', weight: 1,
        followUp: null,
      },
      {
        id: 'cssrs2',
        text: 'Have you had any actual thoughts of killing yourself?',
        category: 'ideation', weight: 2,
        followUp: 'How often did you have these thoughts?',
      },
      {
        id: 'cssrs3',
        text: 'Have you thought about how you might do this (kill yourself)?',
        category: 'ideation', weight: 3,
        followUp: null,
      },
      {
        id: 'cssrs4',
        text: 'Have you had these thoughts and had some intention of acting on them?',
        category: 'intent', weight: 4,
        followUp: null,
      },
      {
        id: 'cssrs5',
        text: 'Have you started to work out or worked out the details of how to kill yourself? Do you intend to carry out this plan?',
        category: 'intent', weight: 5,
        followUp: null,
      },
      {
        id: 'cssrs6',
        text: 'Have you ever done anything, started to do anything, or prepared to do anything to end your life?',
        category: 'behavior', weight: 6,
        followUp: 'When was the most recent time?',
      },
    ],
    options: [
      { value: 0, label: 'No'  },
      { value: 1, label: 'Yes' },
    ],
    scoring: (answers) => {
      const yesIds = Object.entries(answers)
        .filter(([, v]) => v === 1)
        .map(([k]) => k);

      const hasBehavior = yesIds.includes('cssrs6');
      const hasIntent   = yesIds.some(id => ['cssrs4','cssrs5'].includes(id));
      const hasIdeation = yesIds.some(id => ['cssrs2','cssrs3'].includes(id));
      const hasPassive  = yesIds.includes('cssrs1');

      if (hasBehavior || hasIntent)
        return { severity: 'HIGH RISK',    color: '#dc2626', bg: '#fef2f2', recommendation: '⚠ Immediate safety evaluation required. Do not leave patient unattended.' };
      if (hasIdeation)
        return { severity: 'MODERATE RISK', color: '#d97706', bg: '#fffbeb', recommendation: 'Complete safety plan. Means restriction counseling. Close follow-up within 24–48 hours.' };
      if (hasPassive)
        return { severity: 'LOW RISK',     color: '#65a30d', bg: '#f7fee7', recommendation: 'Acknowledge distress. Safety plan counseling. Schedule timely follow-up.' };
      return   { severity: 'NO RISK',      color: '#16a34a', bg: '#f0fdf4', recommendation: 'No suicidal ideation or behavior reported.' };
    },
  },
};

export const ASSESSMENT_LIST = Object.values(ASSESSMENTS);
