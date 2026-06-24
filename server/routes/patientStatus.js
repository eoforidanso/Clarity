import express from 'express';
import { db } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { routeError } from '../utils/routeError.js';

const router = express.Router();
router.use(authenticate);

function mapRow(row) {
  return {
    status:          row.status,
    effectiveDate:   row.effective_date   || null,
    dateOfDeath:     row.date_of_death    || null,
    causeOfDeath:    row.cause_of_death   || '',
    dischargeReason: row.discharge_reason || '',
    dischargeDate:   row.discharge_date   || null,
    dischargeSummary: row.discharge_summary || '',
    finalMedStatus:  row.final_med_status  || '',
    transferTo:      row.transfer_to       || '',
    transferDate:    row.transfer_date     || null,
    lastContactDate: row.last_contact_date || null,
    contactAttempts: row.contact_attempts  || 0,
    notes:           row.notes             || '',
    history:         typeof row.history === 'string' ? JSON.parse(row.history) : (row.history || []),
    lastModifiedBy:  row.last_modified_by  || '',
    lastModified:    row.last_modified     || null,
  };
}

// GET /api/patient-status/:patientId
router.get('/:patientId', async (req, res) => {
  try {
    const row = await db.prepare(
      `SELECT * FROM patient_status_records WHERE patient_id = ?`
    ).get(req.params.patientId);
    res.json(row ? mapRow(row) : { status: 'active', history: [] });
  } catch (err) {
    routeError(req, '[PatientStatus] GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/patient-status/:patientId — upsert full record
router.put('/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const r = req.body;
    await db.prepare(`
      INSERT INTO patient_status_records (
        patient_id, status, effective_date, date_of_death, cause_of_death,
        discharge_reason, discharge_date, discharge_summary, final_med_status,
        transfer_to, transfer_date, last_contact_date, contact_attempts,
        notes, history, last_modified_by, last_modified, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, NOW(), NOW())
      ON CONFLICT (patient_id) DO UPDATE SET
        status            = EXCLUDED.status,
        effective_date    = EXCLUDED.effective_date,
        date_of_death     = EXCLUDED.date_of_death,
        cause_of_death    = EXCLUDED.cause_of_death,
        discharge_reason  = EXCLUDED.discharge_reason,
        discharge_date    = EXCLUDED.discharge_date,
        discharge_summary = EXCLUDED.discharge_summary,
        final_med_status  = EXCLUDED.final_med_status,
        transfer_to       = EXCLUDED.transfer_to,
        transfer_date     = EXCLUDED.transfer_date,
        last_contact_date = EXCLUDED.last_contact_date,
        contact_attempts  = EXCLUDED.contact_attempts,
        notes             = EXCLUDED.notes,
        history           = EXCLUDED.history,
        last_modified_by  = EXCLUDED.last_modified_by,
        last_modified     = NOW(),
        updated_at        = NOW()
    `).run(
      patientId,
      r.status           || 'active',
      r.effectiveDate    || null,
      r.dateOfDeath      || null,
      r.causeOfDeath     || '',
      r.dischargeReason  || '',
      r.dischargeDate    || null,
      r.dischargeSummary || '',
      r.finalMedStatus   || '',
      r.transferTo       || '',
      r.transferDate     || null,
      r.lastContactDate  || null,
      r.contactAttempts  || 0,
      r.notes            || '',
      JSON.stringify(r.history || []),
      r.lastModifiedBy   || '',
    );
    res.json({ ok: true });
  } catch (err) {
    routeError(req, '[PatientStatus] PUT error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
