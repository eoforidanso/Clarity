import { requirePatientAccess } from '../middleware/idor.js';
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { routeError } from '../utils/routeError.js';
import { validate } from '../middleware/validate.js';
import { CreateEncounterSchema, UpdateEncounterSchema } from '../schemas/encounterSchema.js';
import { logPhiRead } from '../middleware/phiAudit.js';

const router = Router();
router.use(authenticate);
router.use('/:patientId', requirePatientAccess);
router.use('/:patientId/*', requirePatientAccess);

function formatEncounter(row) { return {
    id: row.id, date: row.date, time: row.time, provider: row.provider, providerName: row.provider_name, credentials: row.credentials, visitType: row.visit_type, cptCode: row.cpt_code, icdCode: row.icd_code, reason: row.reason, duration: row.duration, chiefComplaint: row.chief_complaint, hpi: row.hpi, intervalNote: row.interval_note, mse: row.mse, assessment: row.assessment, plan: row.plan, safety: {
      siLevel: row.safety_si_level, hiLevel: row.safety_hi_level, selfHarm: !!row.safety_self_harm, substanceUse: !!row.safety_substance_use, safetyPlanUpdated: !!row.safety_plan_updated, crisisResources: !!row.safety_crisis_resources, safetyNotes: row.safety_notes,  },
    followUp: row.follow_up, disposition: row.disposition,
    isSigned: !!row.is_signed,
    signedBy: row.signed_by || '',
    signedAt: row.signed_at || null,
  };
}

// GET /api/patients/:patientId/encounters
router.get('/:patientId/encounters', async (req, res) => {
  try {
    logPhiRead(req, req.params.patientId, 'encounters');
    const facilityId = req.user.facility_id;
    const isGlobal   = req.access.canSeeAll;
    const fClause    = (!isGlobal && facilityId) ? ' AND facility_id = ?' : '';
    const fParam     = (!isGlobal && facilityId) ? [facilityId] : [];

    const rows = await db.prepare(
      `SELECT * FROM encounters WHERE patient_id = ?${fClause} ORDER BY date DESC`
    ).all(req.params.patientId, ...fParam);
    res.json(rows.map(formatEncounter));
  } catch (err) {
    routeError(req, '[encounters] GET', err);
    res.status(500).json({ error: 'Failed to load encounters' });
  }
});

// GET /api/patients/:patientId/encounters/:encId
router.get('/:patientId/encounters/:encId', async (req, res) => {
  try {
    logPhiRead(req, req.params.patientId, 'encounter');
    const facilityId = req.user.facility_id;
    const isGlobal   = req.access.canSeeAll;
    const fClause    = (!isGlobal && facilityId) ? ' AND facility_id = ?' : '';
    const fParam     = (!isGlobal && facilityId) ? [facilityId] : [];

    const row = await db.prepare(
      `SELECT * FROM encounters WHERE id = ? AND patient_id = ?${fClause}`
    ).get(req.params.encId, req.params.patientId, ...fParam);
    if (!row) return res.status(404).json({ error: 'Encounter not found' });
    res.json(formatEncounter(row));
  } catch (err) {
    routeError(req, '[encounters] GET /:encId', err);
    res.status(500).json({ error: 'Failed to load encounter' });
  }
});

// POST /api/patients/:patientId/encounters
router.post('/:patientId/encounters', validate(CreateEncounterSchema), async (req, res) => {
  try {
    const b = req.body;
    const id = uuidv4();
    const safety = b.safety || {};
    const facilityId = req.user.facility_id || null;

    await db.prepare(`
      INSERT INTO encounters (
        id, patient_id, date, time, provider, provider_name, credentials,
        visit_type, cpt_code, icd_code, reason, duration, chief_complaint,
        hpi, interval_note, mse, assessment, plan,
        safety_si_level, safety_hi_level, safety_self_harm, safety_substance_use,
        safety_plan_updated, safety_crisis_resources, safety_notes,
        follow_up, disposition, facility_id
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id, req.params.patientId, b.date, b.time || '', b.provider || '',
      b.providerName || '', b.credentials || '', b.visitType || '',
      b.cptCode || '', b.icdCode || '', b.reason || '', b.duration || '',
      b.chiefComplaint || '', b.hpi || '', b.intervalNote || '', b.mse || '',
      b.assessment || '', b.plan || '',
      safety.siLevel || 'None', safety.hiLevel || 'None',
      safety.selfHarm ? 1 : 0, safety.substanceUse ? 1 : 0,
      safety.safetyPlanUpdated ? 1 : 0, safety.crisisResources ? 1 : 0,
      safety.safetyNotes || '', b.followUp || '', b.disposition || '',
      facilityId
    );

    const row = await db.prepare('SELECT * FROM encounters WHERE id = ?').get(id);
    res.status(201).json(formatEncounter(row));
  } catch (err) {
    routeError(req, '[encounters] POST', err);
    res.status(500).json({ error: 'Failed to create encounter' });
  }
});

// PUT /api/patients/:patientId/encounters/:encId
router.put('/:patientId/encounters/:encId', validate(UpdateEncounterSchema), async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM encounters WHERE id = ? AND patient_id = ?').get(req.params.encId, req.params.patientId);
    if (!existing) return res.status(404).json({ error: 'Encounter not found' });

    // Block editing a signed encounter unless the requesting user is an admin
    if (existing.is_signed && req.user?.role !== 'admin') { return res.status(403).json({ error: 'This encounter has been signed and locked. Contact an administrator to make corrections.' });
    }

    const b = req.body;
    const safety = b.safety || {};

    // Determine signing fields — only sign if not already signed
    const becomingSigned = !existing.is_signed && (b.signedBy || b.isSigned);
    const newIsSigned = existing.is_signed ? 1 : (becomingSigned ? 1 : 0);
    const newSignedBy = existing.is_signed ? existing.signed_by : (becomingSigned ? (b.signedBy || '') : (existing.signed_by || ''));
    const newSignedAt = existing.is_signed ? existing.signed_at : (becomingSigned ? (b.signedAt || new Date().toISOString()) : (existing.signed_at || null));

    await db.prepare(`UPDATE encounters SET date=?, time=?, provider=?, provider_name=?, credentials=?, visit_type=?, cpt_code=?, icd_code=?, reason=?, duration=?, chief_complaint=?, hpi=?, interval_note=?, mse=?, assessment=?, plan=?, safety_si_level=?, safety_hi_level=?, safety_self_harm=?, safety_substance_use=?, safety_plan_updated=?, safety_crisis_resources=?, safety_notes=?, follow_up=?, disposition=?, is_signed=?, signed_by=?, signed_at=?, updated_at=NOW() WHERE id=?`).run(
      b.date ?? existing.date, b.time ?? existing.time, b.provider ?? existing.provider, b.providerName ?? existing.provider_name, b.credentials ?? existing.credentials, b.visitType ?? existing.visit_type, b.cptCode ?? existing.cpt_code, b.icdCode ?? existing.icd_code, b.reason ?? existing.reason, b.duration ?? existing.duration, b.chiefComplaint ?? existing.chief_complaint, b.hpi ?? existing.hpi, b.intervalNote ?? existing.interval_note, b.mse ?? existing.mse, b.assessment ?? existing.assessment, b.plan ?? existing.plan, safety.siLevel ?? existing.safety_si_level, safety.hiLevel ?? existing.safety_hi_level, safety.selfHarm !== undefined ? (safety.selfHarm ? 1 : 0) : existing.safety_self_harm, safety.substanceUse !== undefined ? (safety.substanceUse ? 1 : 0) : existing.safety_substance_use, safety.safetyPlanUpdated !== undefined ? (safety.safetyPlanUpdated ? 1 : 0) : existing.safety_plan_updated, safety.crisisResources !== undefined ? (safety.crisisResources ? 1 : 0) : existing.safety_crisis_resources, safety.safetyNotes ?? existing.safety_notes, b.followUp ?? existing.follow_up, b.disposition ?? existing.disposition, newIsSigned, newSignedBy, newSignedAt, req.params.encId
    );

    const row = await db.prepare('SELECT * FROM encounters WHERE id = ?').get(req.params.encId);
    res.json(formatEncounter(row));
  } catch (err) {
    routeError(req, '[encounters] PUT', err);
    res.status(500).json({ error: 'Failed to update encounter' });
  }
});

export default router;
