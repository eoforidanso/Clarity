import { Router }    from 'express';
import { v4 as uuidv4 } from 'uuid';
import db              from '../db/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { GoalsService } from '../services/GoalsService.js';
import { validate } from '../middleware/validate.js';
import { CreateTreatmentPlanSchema, AddGoalSchema } from '../schemas/treatmentPlanSchema.js';
import { validateResponse } from '../middleware/validateResponse.js';
import { TreatmentPlanResponseSchema, TreatmentPlanListResponseSchema } from '../schemas/responseSchemas.js';

const router = Router();
router.use(authenticate);

// Only therapists (and admins via Harriet bypass) can touch treatment plans.
const therapistOnly = authorize('therapist');

// ── Helpers ───────────────────────────────────────────────────────────────────

function scopeClause(req) {
  const { isGlobal, facility_id } = req.user;
  if (isGlobal) return { clause: '', params: [] };
  if (facility_id) return { clause: ' AND location_id = ?', params: [facility_id] };
  return { clause: ' AND provider_id = ?', params: [req.user.id] };
}

function formatPlan(row) {
  return {
    id:                  row.id,
    patientId:           row.patient_id,
    patientName:         row.patient_name,
    providerId:          row.provider_id,
    providerName:        row.provider_name,
    status:              row.status,
    diagnoses:           row.diagnoses    || [],
    goals:               row.goals        || [],
    sessionFrequency:    row.session_frequency,
    anticipatedDuration: row.anticipated_duration,
    reviewDate:          row.review_date,
    nextReviewDate:      row.next_review_date,
    createdDate:         row.created_at?.split?.('T')?.[0] ?? row.created_at,
    lastUpdated:         row.updated_at?.split?.('T')?.[0] ?? row.updated_at,
  };
}

// ── GET /api/treatment-plans ──────────────────────────────────────────────────
// List all plans visible to the logged-in user (scoped by facility or provider).

router.get('/', validateResponse(TreatmentPlanListResponseSchema), async (req, res) => {
  try {
    const { clause, params } = scopeClause(req);
    const { patientId, status } = req.query;

    let sql = 'SELECT * FROM treatment_plans WHERE 1=1' + clause;
    const args = [...params];

    if (patientId) { sql += ' AND patient_id = ?'; args.push(patientId); }
    if (status)    { sql += ' AND status = ?';     args.push(status); }

    sql += ' ORDER BY updated_at DESC';

    const rows = await db.prepare(sql).all(...args);
    res.json(rows.map(formatPlan));
  } catch (err) {
    console.error('[treatment-plans] GET /', err);
    res.status(500).json({ error: 'Failed to load treatment plans' });
  }
});

// ── GET /api/treatment-plans/:planId ─────────────────────────────────────────

router.get('/:planId', validateResponse(TreatmentPlanResponseSchema), async (req, res) => {
  try {
    const { clause, params } = scopeClause(req);
    const row = await db.prepare(
      `SELECT * FROM treatment_plans WHERE id = ?${clause}`
    ).get(req.params.planId, ...params);

    if (!row) return res.status(404).json({ error: 'Treatment plan not found' });
    res.json(formatPlan(row));
  } catch (err) {
    console.error('[treatment-plans] GET /:planId', err);
    res.status(500).json({ error: 'Failed to load treatment plan' });
  }
});

// ── POST /api/treatment-plans ─────────────────────────────────────────────────
// Create a new plan. Therapist-only.

router.post('/', therapistOnly, validate(CreateTreatmentPlanSchema), validateResponse(TreatmentPlanResponseSchema), async (req, res) => {
  try {
    const b   = req.body;
    const id  = uuidv4();
    const now = new Date().toISOString().split('T')[0];

    const reviewDate     = b.reviewDate     || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
    const nextReviewDate = b.nextReviewDate || new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];
    const providerName   = `${req.user.first_name} ${req.user.last_name}`.trim();
    const locationId     = req.user.facility_id || null;

    // Resolve patient name from DB if not provided
    let patientName = b.patientName || '';
    if (!patientName && b.patientId) {
      const p = await db.prepare('SELECT first_name, last_name FROM patients WHERE id = ?').get(b.patientId);
      if (p) patientName = `${p.first_name} ${p.last_name}`;
    }

    await db.prepare(`
      INSERT INTO treatment_plans
        (id, patient_id, provider_id, location_id, patient_name, provider_name,
         status, diagnoses, goals, session_frequency, anticipated_duration,
         review_date, next_review_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?, ?, ?)
    `).run(
      id,
      b.patientId,
      req.user.id,
      locationId,
      patientName,
      providerName,
      b.status || 'Active',
      JSON.stringify(b.diagnoses || []),
      JSON.stringify(b.goals     || []),
      b.sessionFrequency    || 'Weekly',
      b.anticipatedDuration || '6 months',
      reviewDate,
      nextReviewDate,
    );

    const row = await db.prepare('SELECT * FROM treatment_plans WHERE id = ?').get(id);
    res.status(201).json(formatPlan(row));
  } catch (err) {
    console.error('[treatment-plans] POST /', err);
    res.status(500).json({ error: 'Failed to create treatment plan' });
  }
});

// ── PATCH /api/treatment-plans/:planId ───────────────────────────────────────
// Update plan header fields (status, review dates, diagnoses, session frequency).

router.patch('/:planId', therapistOnly, validateResponse(TreatmentPlanResponseSchema), async (req, res) => {
  try {
    const { clause, params } = scopeClause(req);
    const b = req.body;

    const row = await db.prepare(
      `SELECT * FROM treatment_plans WHERE id = ?${clause}`
    ).get(req.params.planId, ...params);
    if (!row) return res.status(404).json({ error: 'Treatment plan not found' });

    await db.prepare(`
      UPDATE treatment_plans SET
        status               = COALESCE(?, status),
        diagnoses            = COALESCE(?::jsonb, diagnoses),
        session_frequency    = COALESCE(?, session_frequency),
        anticipated_duration = COALESCE(?, anticipated_duration),
        review_date          = COALESCE(?, review_date),
        next_review_date     = COALESCE(?, next_review_date),
        updated_at           = NOW()
      WHERE id = ?
    `).run(
      b.status              ?? null,
      b.diagnoses != null   ? JSON.stringify(b.diagnoses) : null,
      b.sessionFrequency    ?? null,
      b.anticipatedDuration ?? null,
      b.reviewDate          ?? null,
      b.nextReviewDate      ?? null,
      req.params.planId,
    );

    const updated = await db.prepare('SELECT * FROM treatment_plans WHERE id = ?').get(req.params.planId);
    res.json(formatPlan(updated));
  } catch (err) {
    console.error('[treatment-plans] PATCH /:planId', err);
    res.status(500).json({ error: 'Failed to update treatment plan' });
  }
});

// ── POST /api/treatment-plans/:planId/goals ───────────────────────────────────
// Add a goal to a plan.

router.post('/:planId/goals', therapistOnly, validate(AddGoalSchema), async (req, res) => {
  try {
    const { clause, params } = scopeClause(req);
    const row = await db.prepare(
      `SELECT * FROM treatment_plans WHERE id = ?${clause}`
    ).get(req.params.planId, ...params);
    if (!row) return res.status(404).json({ error: 'Treatment plan not found' });

    const authorName = `${req.user.first_name} ${req.user.last_name}`.trim();
    const updatedGoals = GoalsService.applyAddGoal(row.goals || [], req.body, authorName);

    await db.prepare(
      `UPDATE treatment_plans SET goals = ?::jsonb, updated_at = NOW() WHERE id = ?`
    ).run(JSON.stringify(updatedGoals), req.params.planId);

    const newGoal = updatedGoals.at(-1);
    res.status(201).json(GoalsService.computeMeta(newGoal));
  } catch (err) {
    console.error('[treatment-plans] POST /:planId/goals', err);
    res.status(500).json({ error: 'Failed to add goal' });
  }
});

// ── PATCH /api/treatment-plans/:planId/goals/:goalId ─────────────────────────
// Update a goal's status, progress, notes, or measure scores.

router.patch('/:planId/goals/:goalId', therapistOnly, async (req, res) => {
  try {
    const { clause, params } = scopeClause(req);
    const row = await db.prepare(
      `SELECT * FROM treatment_plans WHERE id = ?${clause}`
    ).get(req.params.planId, ...params);
    if (!row) return res.status(404).json({ error: 'Treatment plan not found' });

    const goals = (row.goals || []).map(g => {
      if (g.id !== req.params.goalId) return g;
      return { ...g, ...req.body };
    });

    const found = goals.find(g => g.id === req.params.goalId);
    if (!found) return res.status(404).json({ error: 'Goal not found' });

    await db.prepare(
      `UPDATE treatment_plans SET goals = ?::jsonb, updated_at = NOW() WHERE id = ?`
    ).run(JSON.stringify(goals), req.params.planId);

    res.json(GoalsService.computeMeta(found));
  } catch (err) {
    console.error('[treatment-plans] PATCH /:planId/goals/:goalId', err);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

export default router;
