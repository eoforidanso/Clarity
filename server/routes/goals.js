import { Router }    from 'express';
import db              from '../db/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { GoalsService } from '../services/GoalsService.js';
import { routeError } from '../utils/routeError.js';
import { validateResponse } from '../middleware/validateResponse.js';
import { AnyResponseSchema } from '../schemas/responseSchemas.js';

const router = Router();
router.use(authenticate);
router.use(authorize('therapist'));
router.use(validateResponse(AnyResponseSchema));

// ── Helpers ───────────────────────────────────────────────────────────────────

function scopeClause(req) {
  const { isGlobal, facility_id } = req.user;
  if (isGlobal) return { clause: '', params: [] };
  if (facility_id) return { clause: ' AND location_id = ?', params: [facility_id] };
  return { clause: ' AND provider_id = ?', params: [req.user.id] };
}

async function loadPlans(req) {
  const { clause, params } = scopeClause(req);
  return db.prepare(
    `SELECT * FROM treatment_plans WHERE status != 'Discharged'${clause} ORDER BY updated_at DESC`
  ).all(...params);
}

// ── GET /api/goals ────────────────────────────────────────────────────────────
// Flat list of all goals across all plans the caller can see.

router.get('/', async (req, res) => {
  try {
    const plans = await loadPlans(req);
    const goals = GoalsService.flattenGoals(plans).map(GoalsService.computeMeta);
    res.json(goals);
  } catch (err) {
    routeError(req, '[goals] GET /', err);
    res.status(500).json({ error: 'Failed to load goals' });
  }
});

// ── GET /api/goals/search ─────────────────────────────────────────────────────
// Filter goals by client, status, domain, or due date.
// ?client=<name>&status=active&domain=anxiety&overdue=true

router.get('/search', async (req, res) => {
  try {
    const plans  = await loadPlans(req);
    let   goals  = GoalsService.flattenGoals(plans).map(GoalsService.computeMeta);
    const { client, status, domain, overdue } = req.query;

    if (client)  goals = goals.filter(g => g.clientName?.toLowerCase().includes(client.toLowerCase()));
    if (status)  goals = goals.filter(g => g.status?.toLowerCase() === status.toLowerCase());
    if (domain)  goals = goals.filter(g => g.domain?.toLowerCase().includes(domain.toLowerCase()));
    if (overdue === 'true') goals = goals.filter(g => g.overdue);

    res.json(goals);
  } catch (err) {
    routeError(req, '[goals] GET /search', err);
    res.status(500).json({ error: 'Failed to search goals' });
  }
});

// ── GET /api/goals/:goalId ────────────────────────────────────────────────────

router.get('/:goalId', async (req, res) => {
  try {
    const plans  = await loadPlans(req);
    const result = GoalsService.findGoal(plans, req.params.goalId);
    if (!result) return res.status(404).json({ error: 'Goal not found' });
    res.json(GoalsService.computeMeta(result.goal));
  } catch (err) {
    routeError(req, '[goals] GET /:goalId', err);
    res.status(500).json({ error: 'Failed to load goal' });
  }
});

// ── GET /api/goals/:goalId/checkins ──────────────────────────────────────────

router.get('/:goalId/checkins', async (req, res) => {
  try {
    const plans  = await loadPlans(req);
    const result = GoalsService.findGoal(plans, req.params.goalId);
    if (!result) return res.status(404).json({ error: 'Goal not found' });
    res.json(result.goal.checkIns || []);
  } catch (err) {
    routeError(req, '[goals] GET /:goalId/checkins', err);
    res.status(500).json({ error: 'Failed to load check-ins' });
  }
});

// ── POST /api/goals/:goalId/checkins ─────────────────────────────────────────
// Add a check-in to a goal. Derives new status from progress automatically.
// Body: { date, progress (0–100), note }

router.post('/:goalId/checkins', async (req, res) => {
  try {
    const plans  = await loadPlans(req);
    const result = GoalsService.findGoal(plans, req.params.goalId);
    if (!result) return res.status(404).json({ error: 'Goal not found' });

    const authorName = `${req.user.first_name} ${req.user.last_name}`.trim();
    const checkIn    = GoalsService.buildCheckIn(req.body, authorName);

    const updatedGoals = GoalsService.applyCheckIn(
      result.plan.goals || [],
      req.params.goalId,
      checkIn
    );

    await db.prepare(
      `UPDATE treatment_plans SET goals = ?::jsonb, updated_at = NOW() WHERE id = ?`
    ).run(JSON.stringify(updatedGoals), result.plan.id);

    const updatedGoal = updatedGoals.find(g => g.id === req.params.goalId);
    res.status(201).json({
      checkIn,
      goal: GoalsService.computeMeta(updatedGoal),
    });
  } catch (err) {
    routeError(req, '[goals] POST /:goalId/checkins', err);
    res.status(500).json({ error: 'Failed to add check-in' });
  }
});

// ── PATCH /api/goals/:goalId/status ──────────────────────────────────────────
// Update a goal's status directly.
// Body: { status: 'Met' | 'Active' | 'Progressing' | 'Discontinued' | 'Deferred' }

router.patch('/:goalId/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });

    const plans  = await loadPlans(req);
    const result = GoalsService.findGoal(plans, req.params.goalId);
    if (!result) return res.status(404).json({ error: 'Goal not found' });

    const updatedGoals = GoalsService.applyStatusUpdate(
      result.plan.goals || [],
      req.params.goalId,
      status
    );

    await db.prepare(
      `UPDATE treatment_plans SET goals = ?::jsonb, updated_at = NOW() WHERE id = ?`
    ).run(JSON.stringify(updatedGoals), result.plan.id);

    const updatedGoal = updatedGoals.find(g => g.id === req.params.goalId);
    res.json(GoalsService.computeMeta(updatedGoal));
  } catch (err) {
    routeError(req, '[goals] PATCH /:goalId/status', err);
    res.status(500).json({ error: 'Failed to update goal status' });
  }
});

export default router;
