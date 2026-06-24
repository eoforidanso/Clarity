import express from 'express';
import { db } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { routeError } from '../utils/routeError.js';

const router = express.Router();
router.use(authenticate);

function mapRow(row) {
  return {
    encounterId:      row.encounter_id,
    patientId:        row.patient_id      || null,
    billingStatus:    row.billing_status  || 'unbilled',
    claimStatus:      row.claim_status    || '',
    billedAmount:     row.billed_amount   != null ? parseFloat(row.billed_amount)     : null,
    paidAmount:       row.paid_amount     != null ? parseFloat(row.paid_amount)       : null,
    adjustmentAmount: row.adjustment_amount != null ? parseFloat(row.adjustment_amount) : null,
    payer:            row.payer           || '',
    claimNumber:      row.claim_number    || '',
    dateSubmitted:    row.date_submitted  || null,
    datePaid:         row.date_paid       || null,
    notes:            row.notes           || '',
    lastUpdated:      row.last_updated,
    updatedBy:        row.updated_by      || '',
  };
}

// GET /api/superbills/statuses — all statuses keyed by encounterId
router.get('/statuses', async (req, res) => {
  try {
    const rows = await db.prepare(`SELECT * FROM superbill_statuses ORDER BY last_updated DESC`).all();
    const map = {};
    for (const row of rows) map[row.encounter_id] = mapRow(row);
    res.json(map);
  } catch (err) {
    routeError(req, '[Superbills] GET statuses error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/superbills/status/:encounterId — single status
router.get('/status/:encounterId', async (req, res) => {
  try {
    const row = await db.prepare(
      `SELECT * FROM superbill_statuses WHERE encounter_id = ?`
    ).get(req.params.encounterId);
    res.json(row ? mapRow(row) : null);
  } catch (err) {
    routeError(req, '[Superbills] GET status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/superbills/status/:encounterId — upsert status overrides
router.put('/status/:encounterId', async (req, res) => {
  try {
    const { encounterId } = req.params;
    const r = req.body;
    const updatedBy = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim();

    await db.prepare(`
      INSERT INTO superbill_statuses (
        encounter_id, patient_id, billing_status, claim_status,
        billed_amount, paid_amount, adjustment_amount,
        payer, claim_number, date_submitted, date_paid, notes,
        last_updated, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
      ON CONFLICT (encounter_id) DO UPDATE SET
        patient_id        = EXCLUDED.patient_id,
        billing_status    = EXCLUDED.billing_status,
        claim_status      = EXCLUDED.claim_status,
        billed_amount     = EXCLUDED.billed_amount,
        paid_amount       = EXCLUDED.paid_amount,
        adjustment_amount = EXCLUDED.adjustment_amount,
        payer             = EXCLUDED.payer,
        claim_number      = EXCLUDED.claim_number,
        date_submitted    = EXCLUDED.date_submitted,
        date_paid         = EXCLUDED.date_paid,
        notes             = EXCLUDED.notes,
        last_updated      = NOW(),
        updated_by        = EXCLUDED.updated_by
    `).run(
      encounterId,
      r.patientId        || null,
      r.billingStatus    || 'unbilled',
      r.claimStatus      || '',
      r.billedAmount     != null ? r.billedAmount     : null,
      r.paidAmount       != null ? r.paidAmount       : null,
      r.adjustmentAmount != null ? r.adjustmentAmount : null,
      r.payer            || '',
      r.claimNumber      || '',
      r.dateSubmitted    || null,
      r.datePaid         || null,
      r.notes            || '',
      updatedBy,
    );
    res.json({ ok: true });
  } catch (err) {
    routeError(req, '[Superbills] PUT status error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
