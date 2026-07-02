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
    id: r.id, type: r.type, from: r.from_name, to: r.to_user, patient: r.patient_id, patientName: r.patient_name, subject: r.subject, body: r.body, date: r.date, time: r.time, read: !!r.read, priority: r.priority, status: r.status, urgent: !!r.urgent,
    category:  r.category   || 'General',
    threadKey: r.thread_key || '',
    isActive:  r.is_active  !== false,
}; }

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
      id, b.type, b.from, b.to, b.patient || null, b.patientName || '', b.subject || '', b.body || '', b.date || new Date().toISOString().split('T')[0], b.time || new Date().toTimeString().slice(0, 5), b.read ? true : false, b.priority || 'Normal', b.status || 'Unread', b.urgent ? true : false
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
      b.read !== undefined ? (b.read ? true : false) : existing.read,
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
// For Rx Refill Request: Approved/Denied triggers auto-close + portal system reply
router.put('/:id/status', validate(InboxStatusUpdateSchema), async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

    const row = await db.prepare('SELECT * FROM inbox_messages WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Message not found' });

    const isRefillResolution = row.type === 'Rx Refill Request' && (status === 'Approved' || status === 'Denied');

    // Refill resolution: close the task + the thread, then send a portal reply
    if (isRefillResolution) {
      const resolvedStatus = status === 'Approved' ? 'approved' : 'denied';

      // Close the inbox message thread
      await db.prepare(
        `UPDATE inbox_messages SET status=?, read=true, is_active=false, updated_at=NOW() WHERE id=?`
      ).run(status, req.params.id);

      // Resolve the refill_task
      await db.prepare(
        `UPDATE refill_tasks SET status=$1, resolved_at=NOW() WHERE linked_message_id=$2`
      ).run(resolvedStatus, req.params.id);

      // Resolve the refills row itself
      await db.prepare(
        `UPDATE refills SET status=$1, updated_at=NOW()
         WHERE id = (SELECT refill_id FROM refill_tasks WHERE linked_message_id=$2 LIMIT 1)`
      ).run(resolvedStatus, req.params.id);

      // Insert portal-visible system reply so patient sees the outcome
      const now = new Date();
      const approvedText = status === 'Approved'
        ? 'Your refill request has been approved. Your pharmacy will be notified. Please allow 24–48 hours for processing.'
        : 'Your refill request has been reviewed. Please contact the clinic for next steps or to discuss alternatives.';

      await db.prepare(`
        INSERT INTO inbox_messages
          (id, type, from_name, to_user, provider_id, patient_id, patient_name,
           subject, body, date, time, read, priority, status, urgent,
           from_user_type, to_user_type, is_active, thread_key, category)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,'Normal','Unread',false,'provider','patient',true,$12,'Refill')
      `).run(
        uuidv4(), 'Staff Message',
        'Care Team',
        row.patient_id, row.provider_id || '',
        row.patient_id, row.patient_name || '',
        `Re: ${row.subject}`,
        approvedText,
        now.toISOString().split('T')[0],
        now.toTimeString().slice(0, 5),
        row.thread_key || `${row.patient_id}:unassigned`
      );
    } else {
      await db.prepare(`UPDATE inbox_messages SET status=?, read=true, updated_at=NOW() WHERE id=?`).run(status, req.params.id);
    }

    const updated = await db.prepare('SELECT * FROM inbox_messages WHERE id = ?').get(req.params.id);
    res.json(formatMsg(updated));
  } catch (err) {
    routeError(req, '[inbox] PUT /:id/status', err);
    res.status(500).json({ error: 'Failed to update message status' });
  }
});

// ── Provider Refill Queue ─────────────────────────────────────────────────────
// GET /api/inbox/refill-queue — pending refill tasks for this provider
router.get('/refill-queue', async (req, res) => {
  try {
    const isGlobal = ['admin', 'front_desk'].includes(req.user.role);
    const params   = [];

    let query = `
      SELECT rt.id, rt.patient_id, rt.provider_id, rt.refill_id,
             rt.linked_message_id, rt.medication_name, rt.medication_id,
             rt.auto_urgent, rt.created_at,
             p.first_name || ' ' || p.last_name AS patient_name,
             p.mrn,
             rf.refills_remaining, rf.pharmacy_name AS pharmacy
      FROM   refill_tasks rt
      LEFT   JOIN patients p  ON p.id  = rt.patient_id
      LEFT   JOIN refills  rf ON rf.id = rt.refill_id
      WHERE  rt.status = 'pending'
    `;

    if (!isGlobal) {
      query += ' AND rt.provider_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY rt.auto_urgent DESC, rt.created_at ASC';

    const rows = await db.prepare(query).all(...params);
    res.json(rows.map(r => ({
      id:               r.id,
      patientId:        r.patient_id,
      patientName:      r.patient_name  || '',
      mrn:              r.mrn           || '',
      providerId:       r.provider_id,
      medicationName:   r.medication_name,
      pharmacyName:     r.pharmacy      || '',
      refillsRemaining: r.refills_remaining ?? null,
      urgent:           !!r.auto_urgent,
      linkedMessageId:  r.linked_message_id,
      requestedAt:      r.created_at,
    })));
  } catch (err) {
    routeError(req, '[inbox] GET /refill-queue', err);
    res.status(500).json({ error: 'Failed to load refill queue' });
  }
});

// GET /api/inbox/refill-queue/:taskId/thread
router.get('/refill-queue/:taskId/thread', async (req, res) => {
  try {
    const task = await db.prepare('SELECT * FROM refill_tasks WHERE id = ?').get(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (!task.linked_message_id) return res.json([]);
    const anchor = await db.prepare('SELECT thread_key, patient_id FROM inbox_messages WHERE id = ?').get(task.linked_message_id);
    if (!anchor) return res.json([]);

    const msgs = await db.prepare(`
      SELECT id, from_name, body, date, time, from_user_type, subject, urgent, status
      FROM   inbox_messages
      WHERE  thread_key = ? AND patient_id = ?
      ORDER  BY date ASC, time ASC
    `).all(anchor.thread_key, anchor.patient_id);

    res.json(msgs.map(m => ({
      id:           m.id,
      from:         m.from_name,
      fromUserType: m.from_user_type,
      subject:      m.subject,
      body:         m.body,
      date:         m.date,
      time:         m.time,
      urgent:       !!m.urgent,
    })));
  } catch (err) {
    routeError(req, '[inbox] GET /refill-queue/:taskId/thread', err);
    res.status(500).json({ error: 'Failed to load thread' });
  }
});

// POST /api/inbox/refill-queue/:taskId/approve
router.post('/refill-queue/:taskId/approve', async (req, res) => {
  try {
    const task = await db.prepare('SELECT * FROM refill_tasks WHERE id = ?').get(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status !== 'pending') return res.status(409).json({ error: 'Already resolved' });

    await db.prepare('UPDATE refill_tasks SET status=?, resolved_at=NOW() WHERE id=?').run('approved', task.id);

    if (task.linked_message_id) {
      await db.prepare(
        'UPDATE inbox_messages SET status=?, read=true, is_active=false, updated_at=NOW() WHERE id=?'
      ).run('Approved', task.linked_message_id);
    }
    if (task.refill_id) {
      await db.prepare('UPDATE refills SET status=?, updated_at=NOW() WHERE id=?').run('approved', task.refill_id);
    }

    // Portal system reply
    const anchor = task.linked_message_id
      ? await db.prepare('SELECT * FROM inbox_messages WHERE id = ?').get(task.linked_message_id)
      : null;
    if (anchor) {
      const now = new Date();
      await db.prepare(`
        INSERT INTO inbox_messages
          (id, type, from_name, to_user, provider_id, patient_id, patient_name,
           subject, body, date, time, read, priority, status, urgent,
           from_user_type, to_user_type, is_active, thread_key, category)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,false,'Normal','Unread',false,'provider','patient',true,?,'Refill')
      `).run(
        uuidv4(), 'Staff Message', 'Care Team',
        anchor.patient_id, anchor.provider_id || '',
        anchor.patient_id, anchor.patient_name || '',
        `Re: ${anchor.subject}`,
        'Your refill request has been approved. Your pharmacy will be notified. Please allow 24–48 hours for processing.',
        now.toISOString().split('T')[0], now.toTimeString().slice(0, 5),
        anchor.thread_key || `${anchor.patient_id}:unassigned`
      );
    }

    res.json({ ok: true });
  } catch (err) {
    routeError(req, '[inbox] POST /refill-queue/:taskId/approve', err);
    res.status(500).json({ error: 'Failed to approve' });
  }
});

// POST /api/inbox/refill-queue/:taskId/deny
router.post('/refill-queue/:taskId/deny', async (req, res) => {
  try {
    const { reason } = req.body || {};
    const task = await db.prepare('SELECT * FROM refill_tasks WHERE id = ?').get(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status !== 'pending') return res.status(409).json({ error: 'Already resolved' });

    await db.prepare('UPDATE refill_tasks SET status=?, resolved_at=NOW() WHERE id=?').run('denied', task.id);

    if (task.linked_message_id) {
      await db.prepare(
        'UPDATE inbox_messages SET status=?, read=true, is_active=false, updated_at=NOW() WHERE id=?'
      ).run('Denied', task.linked_message_id);
    }
    if (task.refill_id) {
      await db.prepare('UPDATE refills SET status=?, updated_at=NOW() WHERE id=?').run('denied', task.refill_id);
    }

    const anchor = task.linked_message_id
      ? await db.prepare('SELECT * FROM inbox_messages WHERE id = ?').get(task.linked_message_id)
      : null;
    if (anchor) {
      const now = new Date();
      const denialBody = reason
        ? `Your refill request has been reviewed. ${reason} Please contact our office for assistance.`
        : 'Your refill request has been reviewed. Please contact the clinic for next steps or to discuss alternatives.';
      await db.prepare(`
        INSERT INTO inbox_messages
          (id, type, from_name, to_user, provider_id, patient_id, patient_name,
           subject, body, date, time, read, priority, status, urgent,
           from_user_type, to_user_type, is_active, thread_key, category)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,false,'Normal','Unread',false,'provider','patient',true,?,'Refill')
      `).run(
        uuidv4(), 'Staff Message', 'Care Team',
        anchor.patient_id, anchor.provider_id || '',
        anchor.patient_id, anchor.patient_name || '',
        `Re: ${anchor.subject}`,
        denialBody,
        now.toISOString().split('T')[0], now.toTimeString().slice(0, 5),
        anchor.thread_key || `${anchor.patient_id}:unassigned`
      );
    }

    res.json({ ok: true });
  } catch (err) {
    routeError(req, '[inbox] POST /refill-queue/:taskId/deny', err);
    res.status(500).json({ error: 'Failed to deny' });
  }
});

export default router;
