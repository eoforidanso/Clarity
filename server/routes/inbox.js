import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { routeError } from '../utils/routeError.js';
import { validate } from '../middleware/validate.js';
import { InboxMessageSchema, InboxUpdateSchema, InboxStatusUpdateSchema } from '../schemas/messagingSchema.js';
import { validateResponse } from '../middleware/validateResponse.js';
import { InboxMessageResponseSchema, InboxListResponseSchema } from '../schemas/responseSchemas.js';

const router = Router();
router.use(authenticate);

function formatMsg(r) { return {
    id: r.id, type: r.type, from: r.from_name, to: r.to_user, patient: r.patient_id, patientName: r.patient_name, subject: r.subject, body: r.body, date: r.date, time: r.time, read: !!r.read, priority: r.priority, status: r.status, urgent: !!r.urgent,  };
}

// GET /api/inbox
router.get('/', validateResponse(InboxListResponseSchema), async (req, res) => {
  try {
    const { userId, type, status, priority } = req.query;
    const facilityId = req.user.facility_id;
    const isGlobal   = req.access.canSeeAll;

    let query = 'SELECT * FROM inbox_messages WHERE 1=1';
    const params = [];

    if (!isGlobal) {
      query += ' AND (to_user = ? OR patient_id IN (SELECT id FROM patients WHERE primary_location = ?))';
      params.push(req.user.id, facilityId || '');
    }

    if (userId)   { query += ' AND to_user = ?';   params.push(userId); }
    if (type)     { query += ' AND type = ?';       params.push(type); }
    if (status)   { query += ' AND status = ?';     params.push(status); }
    if (priority) { query += ' AND priority = ?';   params.push(priority); }
    query += ' ORDER BY date DESC, time DESC';

    const rows = await db.prepare(query).all(...params);
    res.json(rows.map(formatMsg));
  } catch (err) {
    routeError(req, '[inbox] GET /', err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// POST /api/inbox
router.post('/', validate(InboxMessageSchema), validateResponse(InboxMessageResponseSchema), async (req, res) => {
  try {
    const b = req.body;
    const id = uuidv4();
    await db.prepare('INSERT INTO inbox_messages (id, type, from_name, to_user, patient_id, patient_name, subject, body, date, time, read, priority, status, urgent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, b.type, b.from, b.to, b.patient || null, b.patientName || '', b.subject || '', b.body || '', b.date || new Date().toISOString().split('T')[0], b.time || new Date().toTimeString().slice(0, 5), b.read ? 1 : 0, b.priority || 'Normal', b.status || 'Unread', b.urgent ? 1 : 0
    );
    const row = await db.prepare('SELECT * FROM inbox_messages WHERE id = ?').get(id);
    res.status(201).json(formatMsg(row));
  } catch (err) {
    routeError(req, '[inbox] POST /', err);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// PUT /api/inbox/:id
router.put('/:id', validate(InboxUpdateSchema), validateResponse(InboxMessageResponseSchema), async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM inbox_messages WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Message not found' });

    const b = req.body;
    await db.prepare(`UPDATE inbox_messages SET read=?, status=?, priority=?, updated_at=NOW() WHERE id=?`).run(
      b.read !== undefined ? (b.read ? 1 : 0) : existing.read,
      b.status ?? existing.status,
      b.priority ?? existing.priority,
      req.params.id
    );
    const row = await db.prepare('SELECT * FROM inbox_messages WHERE id = ?').get(req.params.id);
    res.json(formatMsg(row));
  } catch (err) {
    routeError(req, '[inbox] PUT /:id', err);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// PUT /api/inbox/:id/status  (convenience endpoint)
router.put('/:id/status', validate(InboxStatusUpdateSchema), async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

    await db.prepare(`UPDATE inbox_messages SET status=?, read=true, updated_at=NOW() WHERE id=?`).run(status, req.params.id);
    const row = await db.prepare('SELECT * FROM inbox_messages WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Message not found' });
    res.json(formatMsg(row));
  } catch (err) {
    routeError(req, '[inbox] PUT /:id/status', err);
    res.status(500).json({ error: 'Failed to update message status' });
  }
});

export default router;
