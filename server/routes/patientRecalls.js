import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { routeError } from '../utils/routeError.js';

const router = Router();
router.use(authenticate);

function scopeClause(req) {
  const { isGlobal, facility_id } = req.user;
  if (isGlobal) return { clause: '', params: [] };
  if (facility_id) return { clause: ' AND location_id = ?', params: [facility_id] };
  return { clause: '', params: [] };
}

function formatRecall(r) {
  return {
    id:             r.id,
    patientId:      r.patient_id,
    patientName:    r.patient_name,
    mrn:            r.mrn,
    phone:          r.phone,
    email:          r.email,
    reason:         r.reason,
    detail:         r.detail,
    lastVisit:      r.last_visit,
    nextDue:        r.next_due,
    outreachStatus: r.outreach_status,
    attempts:       r.attempts,
    lastAttempt:    r.last_attempt,
    method:         r.method,
    notes:          r.notes,
    provider:       r.provider,
  };
}

// GET /api/patient-recalls
router.get('/', async (req, res) => {
  try {
    const { clause, params } = scopeClause(req);
    const { status, patientId } = req.query;
    let sql = 'SELECT * FROM patient_recalls WHERE 1=1' + clause;
    const args = [...params];
    if (patientId) { sql += ' AND patient_id = ?'; args.push(patientId); }
    if (status && status !== 'All') { sql += ' AND outreach_status = ?'; args.push(status); }
    sql += ' ORDER BY next_due ASC NULLS LAST';
    const rows = await db.prepare(sql).all(...args);
    res.json(rows.map(formatRecall));
  } catch (err) {
    routeError(req, '[patient-recalls] GET', err);
    res.status(500).json({ error: 'Failed to load recalls' });
  }
});

// POST /api/patient-recalls
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    const { clause, params } = scopeClause(req);
    const locationId = params[0] || null;
    const id = uuidv4();
    await db.prepare(`
      INSERT INTO patient_recalls
        (id, patient_id, patient_name, mrn, phone, email, reason, detail,
         last_visit, next_due, outreach_status, attempts, last_attempt, method, notes, provider, location_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, b.patientId || null, b.patientName || '', b.mrn || '', b.phone || '', b.email || '',
      b.reason || '', b.detail || '', b.lastVisit || null, b.nextDue || null,
      b.outreachStatus || 'Not Started', 0, null, '', b.notes || '',
      b.provider || '', locationId
    );
    const row = await db.prepare('SELECT * FROM patient_recalls WHERE id = ?').get(id);
    res.status(201).json(formatRecall(row));
  } catch (err) {
    routeError(req, '[patient-recalls] POST', err);
    res.status(500).json({ error: 'Failed to create recall' });
  }
});

// PUT /api/patient-recalls/:id
router.put('/:id', async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM patient_recalls WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Recall not found' });
    const b = req.body;
    await db.prepare(`
      UPDATE patient_recalls SET
        outreach_status = ?, attempts = ?, last_attempt = ?, method = ?,
        notes = ?, next_due = ?, updated_at = NOW()
      WHERE id = ?
    `).run(
      b.outreachStatus ?? existing.outreach_status,
      b.attempts       ?? existing.attempts,
      b.lastAttempt    ?? existing.last_attempt,
      b.method         ?? existing.method,
      b.notes          ?? existing.notes,
      b.nextDue        ?? existing.next_due,
      req.params.id
    );
    const row = await db.prepare('SELECT * FROM patient_recalls WHERE id = ?').get(req.params.id);
    res.json(formatRecall(row));
  } catch (err) {
    routeError(req, '[patient-recalls] PUT', err);
    res.status(500).json({ error: 'Failed to update recall' });
  }
});

// DELETE /api/patient-recalls/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.prepare('DELETE FROM patient_recalls WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    routeError(req, '[patient-recalls] DELETE', err);
    res.status(500).json({ error: 'Failed to delete recall' });
  }
});

export default router;
