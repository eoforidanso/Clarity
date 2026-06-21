import { Router } from 'express';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { routeError } from '../utils/routeError.js';

const router = Router();
router.use(authenticate);

function formatLabOrder(r) {
  return {
    id:          r.id,
    patientId:   r.patient_id,
    patientName: r.patient_name,
    mrn:         r.mrn,
    test:        r.test_name || r.name || '',
    cptCode:     r.cpt_code || '',
    status:      r.status || '',
    orderedDate: r.ordered_date || r.created_at?.split?.('T')?.[0] || '',
    provider:    r.ordered_by || r.provider_name || '',
    facility:    r.location_id || '',
    resultDate:  r.result_date || null,
    resultValue: r.result_value || null,
    refRange:    r.ref_range || null,
    resultFlag:  r.result_flag || null,
    notes:       r.notes || '',
  };
}

// GET /api/lab-tracking — cross-patient lab orders joined with patient info
router.get('/', async (req, res) => {
  try {
    const { isGlobal, facility_id } = req.user;
    const { patientId, status, resultFlag } = req.query;

    let sql = `
      SELECT o.*, p.name AS patient_name, p.mrn
      FROM orders o
      LEFT JOIN patients p ON p.id = o.patient_id
      WHERE o.type = 'Lab'
    `;
    const args = [];

    if (!isGlobal && facility_id) {
      sql += ' AND o.location_id = ?';
      args.push(facility_id);
    }
    if (patientId) { sql += ' AND o.patient_id = ?'; args.push(patientId); }
    if (status && status !== 'All') { sql += ' AND o.status = ?'; args.push(status); }
    if (resultFlag && resultFlag !== 'All') { sql += ' AND o.result_flag = ?'; args.push(resultFlag); }

    sql += ' ORDER BY o.created_at DESC';

    const rows = await db.prepare(sql).all(...args);
    res.json(rows.map(formatLabOrder));
  } catch (err) {
    routeError(req, '[lab-tracking] GET', err);
    res.status(500).json({ error: 'Failed to load lab orders' });
  }
});

// PUT /api/lab-tracking/:orderId — update result fields
router.put('/:orderId', async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM orders WHERE id = ? AND type = ?').get(req.params.orderId, 'Lab');
    if (!existing) return res.status(404).json({ error: 'Lab order not found' });

    const b = req.body;
    await db.prepare(`
      UPDATE orders SET
        result_date  = ?,
        result_value = ?,
        ref_range    = ?,
        result_flag  = ?,
        status       = ?,
        notes        = ?,
        updated_at   = NOW()
      WHERE id = ?
    `).run(
      b.resultDate  ?? existing.result_date,
      b.resultValue ?? existing.result_value,
      b.resultFlag  ?? existing.result_flag,
      b.refRange    ?? existing.ref_range,
      b.status      ?? existing.status,
      b.notes       ?? existing.notes,
      req.params.orderId
    );

    const updated = await db.prepare(`
      SELECT o.*, p.name AS patient_name, p.mrn
      FROM orders o LEFT JOIN patients p ON p.id = o.patient_id
      WHERE o.id = ?
    `).get(req.params.orderId);
    res.json(formatLabOrder(updated));
  } catch (err) {
    routeError(req, '[lab-tracking] PUT', err);
    res.status(500).json({ error: 'Failed to update lab order' });
  }
});

export default router;
