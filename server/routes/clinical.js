import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { logAudit } from '../db/softDelete.js';
import { routeError } from '../utils/routeError.js';
import { validate } from '../middleware/validate.js';
import { AllergySchema, ProblemSchema, VitalsSchema, ImmunizationSchema, AssessmentSchema } from '../schemas/clinicalSchema.js';
import { logPhiRead } from '../middleware/phiAudit.js';
import { validateResponse } from '../middleware/validateResponse.js';
import { AnyResponseSchema } from '../schemas/responseSchemas.js';

const router = Router();
router.use(authenticate);
router.use(validateResponse(AnyResponseSchema));

// ── IDOR guard — all clinical sub-routes require patient access ───────────────
async function requirePatientAccess(req, res, next) { const patientId = req.params.patientId;
  if (!patientId) return next();

  const patient = await db.prepare('SELECT id, assigned_provider, primary_location FROM patients WHERE id = $1').get(patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const { role, id: userId, location_id } = req.user;
  if (['admin', 'front_desk'].includes(role)) return next();

  const isAssigned   = patient.assigned_provider === userId;
  const sameLocation = location_id && patient.primary_location === location_id;

  if (!isAssigned && !sameLocation) { logAudit({
      actorId: userId, actorName: `${req.user.first_name } ${ req.user.last_name || '' }`.trim(),
      action: 'IDOR_BLOCKED', targetId: patientId, targetType: 'patient',
      details: { role, path: req.path }, ip: req.ip,
    });
    return res.status(403).json({ error: 'Access denied — not your patient' });
  }
  next();
}

// Apply IDOR guard to ALL clinical routes
router.use('/:patientId/*', requirePatientAccess);

// ─── ALLERGIES ────────────────────────────────────────────────

router.get('/:patientId/allergies', async (req, res) => {
  try {
    logPhiRead(req, req.params.patientId, 'allergies');
    const rows = await db.prepare('SELECT * FROM allergies WHERE patient_id = $1 ORDER BY created_at DESC').all(req.params.patientId);
    res.json(rows.map(r => ({
      id: r.id, allergen: r.allergen, type: r.type, reaction: r.reaction, severity: r.severity, status: r.status, onsetDate: r.onset_date, source: r.source,
    })));
  } catch (err) {
    routeError(req, '[clinical] GET allergies', err);
    res.status(500).json({ error: 'Failed to load allergies' });
  }
});

router.post('/:patientId/allergies', validate(AllergySchema), async (req, res) => {
  try {
    const b = req.body;
    const id = uuidv4();
    await db.prepare(
      'INSERT INTO allergies (id, patient_id, allergen, type, reaction, severity, status, onset_date, source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)'
    ).run(id, req.params.patientId, b.allergen, b.type, b.reaction || '', b.severity || '', b.status || 'Active', b.onsetDate || '', b.source || '');
    res.status(201).json({ id, ...b });
  } catch (err) {
    routeError(req, '[clinical] POST allergies', err);
    res.status(500).json({ error: 'Failed to create allergy' });
  }
});

router.put('/:patientId/allergies/:allergyId', validate(AllergySchema.partial()), async (req, res) => {
  try {
    const b = req.body;
    await db.prepare('UPDATE allergies SET allergen=$1, type=$2, reaction=$3, severity=$4, status=$5, onset_date=$6, source=$7 WHERE id=$8 AND patient_id=$9').run(
      b.allergen, b.type, b.reaction, b.severity, b.status, b.onsetDate, b.source, req.params.allergyId, req.params.patientId
    );
    res.json({ id: req.params.allergyId, ...b });
  } catch (err) {
    routeError(req, '[clinical] PUT allergies', err);
    res.status(500).json({ error: 'Failed to update allergy' });
  }
});

router.delete('/:patientId/allergies/:allergyId', async (req, res) => {
  try {
    await db.prepare('DELETE FROM allergies WHERE id = $1 AND patient_id = $2').run(req.params.allergyId, req.params.patientId);
    res.json({ success: true });
  } catch (err) {
    routeError(req, '[clinical] DELETE allergies', err);
    res.status(500).json({ error: 'Failed to delete allergy' });
  }
});

// ─── PROBLEMS ─────────────────────────────────────────────────

router.get('/:patientId/problems', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM problems WHERE patient_id = $1 ORDER BY created_at DESC').all(req.params.patientId);
    res.json(rows.map(r => ({
      id: r.id, code: r.code, description: r.description, status: r.status, onsetDate: r.onset_date, diagnosedBy: r.diagnosed_by,
    })));
  } catch (err) {
    routeError(req, '[clinical] GET problems', err);
    res.status(500).json({ error: 'Failed to load problems' });
  }
});

router.post('/:patientId/problems', validate(ProblemSchema), async (req, res) => {
  try {
    const b = req.body;
    const id = uuidv4();
    await db.prepare(
      'INSERT INTO problems (id, patient_id, code, description, status, onset_date, diagnosed_by) VALUES ($1, $2, $3, $4, $5, $6, $7)'
    ).run(id, req.params.patientId, b.code, b.description, b.status || 'Active', b.onsetDate || '', b.diagnosedBy || '');
    res.status(201).json({ id, ...b });
  } catch (err) {
    routeError(req, '[clinical] POST problems', err);
    res.status(500).json({ error: 'Failed to create problem' });
  }
});

router.put('/:patientId/problems/:problemId', validate(ProblemSchema.partial()), async (req, res) => {
  try {
    const b = req.body;
    await db.prepare('UPDATE problems SET code=$1, description=$2, status=$3, onset_date=$4, diagnosed_by=$5 WHERE id=$6 AND patient_id=$7').run(
      b.code, b.description, b.status, b.onsetDate, b.diagnosedBy, req.params.problemId, req.params.patientId
    );
    res.json({ id: req.params.problemId, ...b });
  } catch (err) {
    routeError(req, '[clinical] PUT problems', err);
    res.status(500).json({ error: 'Failed to update problem' });
  }
});

// ─── VITALS ───────────────────────────────────────────────────

router.get('/:patientId/vitals', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM vitals WHERE patient_id = $1 ORDER BY date DESC, time DESC').all(req.params.patientId);
    res.json(rows.map(r => ({
      id: r.id, date: r.date, time: r.time, bp: r.bp, hr: r.hr, rr: r.rr, temp: r.temp, spo2: r.spo2, weight: r.weight, height: r.height, bmi: r.bmi, pain: r.pain, takenBy: r.taken_by,
    })));
  } catch (err) {
    routeError(req, '[clinical] GET vitals', err);
    res.status(500).json({ error: 'Failed to load vitals' });
  }
});

router.post('/:patientId/vitals', validate(VitalsSchema), async (req, res) => {
  try {
    const b = req.body;
    const id = uuidv4();
    await db.prepare(
      'INSERT INTO vitals (id, patient_id, date, time, bp, hr, rr, temp, spo2, weight, height, bmi, pain, taken_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)'
    ).run(id, req.params.patientId, b.date, b.time, b.bp || '', b.hr, b.rr, b.temp, b.spo2, b.weight, b.height, b.bmi, b.pain, b.takenBy || '');
    res.status(201).json({ id, ...b });
  } catch (err) {
    routeError(req, '[clinical] POST vitals', err);
    res.status(500).json({ error: 'Failed to save vitals' });
  }
});

// ─── IMMUNIZATIONS ────────────────────────────────────────────

router.get('/:patientId/immunizations', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM immunizations WHERE patient_id = $1 ORDER BY date DESC').all(req.params.patientId);
    res.json(rows.map(r => ({
      id: r.id, vaccine: r.vaccine, date: r.date, site: r.site, route: r.route, lot: r.lot, manufacturer: r.manufacturer, administeredBy: r.administered_by, nextDue: r.next_due,
    })));
  } catch (err) {
    routeError(req, '[clinical] GET immunizations', err);
    res.status(500).json({ error: 'Failed to load immunizations' });
  }
});

router.post('/:patientId/immunizations', validate(ImmunizationSchema), async (req, res) => {
  try {
    const b = req.body;
    const id = uuidv4();
    await db.prepare(
      'INSERT INTO immunizations (id, patient_id, vaccine, date, site, route, lot, manufacturer, administered_by, next_due) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)'
    ).run(id, req.params.patientId, b.vaccine, b.date, b.site || '', b.route || '', b.lot || '', b.manufacturer || '', b.administeredBy || '', b.nextDue || null);
    res.status(201).json({ id, ...b });
  } catch (err) {
    routeError(req, '[clinical] POST immunizations', err);
    res.status(500).json({ error: 'Failed to save immunization' });
  }
});

// ─── ASSESSMENTS ──────────────────────────────────────────────

router.get('/:patientId/assessments', async (req, res) => {
  try {
    logPhiRead(req, req.params.patientId, 'assessments');
    const rows = await db.prepare('SELECT * FROM assessments WHERE patient_id = $1 ORDER BY date DESC').all(req.params.patientId);
    res.json(rows.map(r => ({
      id: r.id, tool: r.tool, score: r.score, interpretation: r.interpretation, date: r.date, administeredBy: r.administered_by, answers: JSON.parse(r.answers || '[]'),
    })));
  } catch (err) {
    routeError(req, '[clinical] GET assessments', err);
    res.status(500).json({ error: 'Failed to load assessments' });
  }
});

router.post('/:patientId/assessments', validate(AssessmentSchema), async (req, res) => {
  try {
    const b = req.body;
    const id = uuidv4();
    await db.prepare(
      'INSERT INTO assessments (id, patient_id, tool, score, interpretation, date, administered_by, answers) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)'
    ).run(id, req.params.patientId, b.tool, b.score, b.interpretation || '', b.date, b.administeredBy || '', JSON.stringify(b.answers || []));
    res.status(201).json({ id, ...b });
  } catch (err) {
    routeError(req, '[clinical] POST assessments', err);
    res.status(500).json({ error: 'Failed to save assessment' });
  }
});

export default router;
