import { requirePatientAccess } from '../middleware/idor.js';
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { routeError } from '../utils/routeError.js';
import { validate } from '../middleware/validate.js';
import { CreateOrderSchema, UpdateOrderSchema } from '../schemas/orderSchema.js';

const router = Router();
router.use(authenticate);
router.use('/:patientId', requirePatientAccess);
router.use('/:patientId/*', requirePatientAccess);

// GET /api/patients/:patientId/orders
router.get('/:patientId/orders', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM orders WHERE patient_id = ? ORDER BY ordered_date DESC').all(req.params.patientId);
    res.json(rows.map(r => ({
      id: r.id, type: r.type, description: r.description, status: r.status, orderedDate: r.ordered_date, orderedBy: r.ordered_by, priority: r.priority, notes: r.notes, labFacility: r.lab_facility,
    })));
  } catch (err) {
    routeError(req, '[orders] GET', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

// POST /api/patients/:patientId/orders
router.post('/:patientId/orders', validate(CreateOrderSchema), async (req, res) => {
  try {
    const b = req.body;
    const id = uuidv4();
    await db.prepare('INSERT INTO orders (id, patient_id, type, description, status, ordered_date, ordered_by, priority, notes, lab_facility) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, req.params.patientId, b.type, b.description, b.status || 'Pending', b.orderedDate || new Date().toISOString().split('T')[0], b.orderedBy || '', b.priority || 'Routine', b.notes || '', b.labFacility || null
    );
    res.status(201).json({ id, ...b });
  } catch (err) {
    routeError(req, '[orders] POST', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PUT /api/patients/:patientId/orders/:orderId
router.put('/:patientId/orders/:orderId', validate(UpdateOrderSchema), async (req, res) => {
  try {
    const b = req.body;
    const existing = await db.prepare('SELECT * FROM orders WHERE id = ? AND patient_id = ?').get(req.params.orderId, req.params.patientId);
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    await db.prepare(`UPDATE orders SET status=?, notes=?, updated_at=NOW() WHERE id=?`).run(
      b.status ?? existing.status, b.notes ?? existing.notes, req.params.orderId
    );
    const row = await db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.orderId);
    res.json({ id: row.id, type: row.type, description: row.description, status: row.status, orderedDate: row.ordered_date, orderedBy: row.ordered_by, priority: row.priority, notes: row.notes, labFacility: row.lab_facility });
  } catch (err) {
    routeError(req, '[orders] PUT', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

export default router;
