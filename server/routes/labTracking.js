import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { routeError } from '../utils/routeError.js';
import { resolveTaskProvider } from '../utils/resolveTaskProvider.js';

const CRITICAL_FLAGS = new Set(['HH', 'LL', 'C', 'CH', 'CL', 'AA']);
const ABNORMAL_FLAGS = new Set(['H', 'L', 'HH', 'LL', 'C', 'CH', 'CL', 'A', 'AA']);

async function triageOrderResult(order, newFlag) {
  const flag = (newFlag || '').trim().toUpperCase();
  if (!ABNORMAL_FLAGS.has(flag)) return;

  const hasCritical = CRITICAL_FLAGS.has(flag);

  // Skip if a pending task already covers this order — unless the flag has
  // escalated to critical (e.g. H → HH), which must not be swallowed
  const existing = await db.prepare(
    `SELECT id, auto_urgent FROM lab_review_tasks WHERE order_id = $1 AND status = 'pending'`
  ).get(order.id);
  if (existing && (!hasCritical || existing.auto_urgent)) return;

  const providerId = await resolveTaskProvider({ candidateId: order.ordered_by, patientId: order.patient_id });

  const patient = await db.prepare(`SELECT first_name, last_name FROM patients WHERE id = $1`).get(order.patient_id);
  const patientName = patient ? `${patient.first_name} ${patient.last_name}` : '';

  const testDesc   = order.description || order.test_name || 'Lab Order';
  const resultLine = `${testDesc}: ${order.result_value || '?'} ${flag} (ref ${order.ref_range || 'N/A'})`;
  const now        = new Date();
  const msgId      = uuidv4();
  const taskId     = uuidv4();
  const threadKey  = `${order.patient_id}:${providerId || 'unassigned'}`;
  const msgBody    = [
    hasCritical ? '🚨 CRITICAL value requires immediate attention.\n' : '⚠️ Abnormal result filed.\n',
    resultLine,
    '\nPlease review in the patient chart.',
  ].join('\n');

  await db.prepare(`
    INSERT INTO inbox_messages
      (id, type, from_name, to_user, provider_id, patient_id, patient_name,
       subject, body, date, time, read, priority, status, urgent,
       from_user_type, to_user_type, is_active, thread_key, category)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,$12,'Unread',$13,'system','provider',true,$14,'Labs')
  `).run(
    msgId, 'Lab Result', 'Lab System',
    providerId, providerId, order.patient_id, patientName,
    `${hasCritical ? '🚨 Critical' : '⚠️ Abnormal'} Result — ${patientName}`,
    msgBody,
    now.toISOString().split('T')[0], now.toTimeString().slice(0, 5),
    hasCritical ? 'Urgent' : 'Normal', hasCritical, threadKey
  );

  if (existing) {
    // Escalation: upgrade the pending task in place instead of duplicating it
    await db.prepare(`
      UPDATE lab_review_tasks
      SET auto_urgent = true, abnormal_flag = 'critical', test_summary = $1, linked_message_id = $2
      WHERE id = $3
    `).run(resultLine, msgId, existing.id);
  } else {
    await db.prepare(`
      INSERT INTO lab_review_tasks
        (id, patient_id, provider_id, order_id, linked_message_id,
         test_summary, abnormal_flag, status, auto_urgent)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8)
    `).run(taskId, order.patient_id, providerId, order.id, msgId, resultLine, hasCritical ? 'critical' : 'abnormal', hasCritical);
  }
}

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

    // Auto-triage: file inbox message if result has an abnormal flag being set for the first time
    if (b.resultFlag && b.resultFlag !== existing.result_flag) {
      triageOrderResult(updated, b.resultFlag)
        .catch(err => routeError(req, '[lab-tracking] auto-triage failed — abnormal result may be unrouted', err));
    }

    res.json(formatLabOrder(updated));
  } catch (err) {
    routeError(req, '[lab-tracking] PUT', err);
    res.status(500).json({ error: 'Failed to update lab order' });
  }
});

export default router;
