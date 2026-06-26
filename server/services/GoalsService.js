import { v4 as uuidv4 } from 'uuid';

const TODAY = () => new Date().toISOString().split('T')[0];

export class GoalsService {
  // Find a goal by ID across an array of plan rows from the DB.
  // Returns { goal, plan } or null.
  static findGoal(plans, goalId) {
    for (const plan of plans) {
      const goals = plan.goals || [];
      const goal = goals.find(g => g.id === goalId);
      if (goal) return { goal, plan };
    }
    return null;
  }

  // Flatten goals from all plans, enriching each with parent plan context.
  static flattenGoals(plans) {
    return plans.flatMap(plan =>
      (plan.goals || []).map(goal => ({
        ...goal,
        planId:     plan.id,
        clientName: plan.patient_name,
        patientId:  plan.patient_id,
        diagnoses:  plan.diagnoses || [],
      }))
    );
  }

  // Compute derived / display fields. Never touches the DB.
  static computeMeta(goal, today = TODAY()) {
    const overdue =
      goal.targetDate &&
      goal.targetDate < today &&
      !['Met', 'Discontinued'].includes(goal.status);

    const daysUntil = goal.targetDate
      ? Math.ceil((new Date(goal.targetDate) - new Date(today)) / 86400000)
      : null;

    const dueSoon =
      !overdue &&
      daysUntil != null &&
      daysUntil <= 30 &&
      !['Met', 'Discontinued'].includes(goal.status);

    const delta =
      goal.outcomeMeasure != null &&
      goal.baselineScore  != null &&
      goal.currentScore   != null
        ? {
            measure:   goal.outcomeMeasure,
            from:      goal.baselineScore,
            to:        goal.currentScore,
            change:    goal.currentScore - goal.baselineScore,
            pctChange: goal.baselineScore !== 0
              ? Math.round(((goal.currentScore - goal.baselineScore) / goal.baselineScore) * 100)
              : null,
          }
        : null;

    const lastCheckIn = (goal.checkIns || []).at(-1) ?? null;

    return { ...goal, overdue, dueSoon, delta, lastCheckIn };
  }

  // Derive new goal status from progress value.
  static statusFromProgress(progress) {
    if (progress >= 100) return 'Met';
    if (progress >    0) return 'Progressing';
    return 'Active';
  }

  // Return updated goals array after appending a check-in.
  // Does NOT mutate the input array.
  static applyCheckIn(goals, goalId, checkIn) {
    return goals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        checkIns: [...(g.checkIns || []), checkIn],
        progress: checkIn.progress,
        status:   GoalsService.statusFromProgress(checkIn.progress),
      };
    });
  }

  // Return updated goals array after changing a goal's status.
  static applyStatusUpdate(goals, goalId, status) {
    return goals.map(g => g.id === goalId ? { ...g, status } : g);
  }

  // Return updated goals array after appending a new goal.
  static applyAddGoal(goals, goalData, authorName) {
    const newGoal = {
      id:            uuidv4(),
      domain:        goalData.domain        || '',
      description:   goalData.description   || '',
      status:        'Active',
      targetDate:    goalData.targetDate     || null,
      measure:       goalData.measure        || '',
      progress:      0,
      interventions: goalData.interventions  || [],
      notes:         goalData.notes          || '',
      outcomeMeasure: goalData.outcomeMeasure || null,
      baselineScore:  goalData.baselineScore  ?? null,
      currentScore:   goalData.currentScore   ?? null,
      checkIns:      [],
    };
    return [...goals, newGoal];
  }

  // Build a check-in object from request body + author name.
  static buildCheckIn(body, authorName) {
    return {
      id:       uuidv4(),
      date:     body.date     || TODAY(),
      progress: Number(body.progress ?? 50),
      note:     body.note     || '',
      author:   authorName,
    };
  }
}
