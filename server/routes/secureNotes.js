import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { routeError } from '../utils/routeError.js';
import { validate } from '../middleware/validate.js';
import { SecureNoteSchema } from '../schemas/secureNoteSchema.js';
import { validateResponse } from '../middleware/validateResponse.js';
import { SecureNoteResponseSchema, SecureNoteListResponseSchema } from '../schemas/responseSchemas.js';

const router = Router();
router.use(authenticate);

function formatNote(row) {
  return {
    id:          row.id,
    patientId:   row.patient_id,
    patientName: row.patient_name,
    mrn:         row.mrn,
    type:        row.type,
    content:     row.content,
    color:       row.color,
    visibility:  row.visibility,
    author:      row.author,
    createdBy:   row.created_by,
    pinned:      !!row.pinned,
    expiresDate: row.expires_date || '',
    createdDate: row.created_at?.split?.('T')?.[0] ?? row.created_at,
    updatedAt:   row.updated_at,
  };
}

// Visibility rules: restrict which notes the caller can see
function visibilityClause(user) {
  if (user.role === 'admin' || user.isGlobal) return { clause: '', params: [] };
  if (user.role === 'prescriber' || user.role === 'nurse' || user.role === 'therapist') {
    // Clinical staff see everything except Admin Only
    return {
      clause: " AND visibility != 'Admin Only'",
      params: [],
    };
  }
  // Front desk / biller see All Staff and Admin Only only
  return {
    clause: " AND visibility IN ('All Staff', 'Admin Only')",
    params: [],
  };
}

// GET /api/secure-notes
router.get('/', validateResponse(SecureNoteListResponseSchema), async (req, res) => {
  try {
    const { clause, params } = visibilityClause(req.user);
    const { patientId, type } = req.query;

    let sql = `SELECT * FROM secure_notes WHERE 1=1${clause}`;
    const args = [...params];

    if (patientId) { sql += ' AND patient_id = ?'; args.push(patientId); }
    if (type)      { sql += ' AND type = ?';       args.push(type); }

    sql += ' ORDER BY pinned DESC, created_at DESC';

    const rows = await db.prepare(sql).all(...args);
    res.json(rows.map(formatNote));
  } catch (err) {
    routeError(req, '[secure-notes] GET /', err);
    res.status(500).json({ error: 'Failed to load notes' });
  }
});

// POST /api/secure-notes
router.post('/', validate(SecureNoteSchema), validateResponse(SecureNoteResponseSchema), async (req, res) => {
  try {
    const b = req.body;
    if (!b.content?.trim()) return res.status(400).json({ error: 'content is required' });

    const id = uuidv4();
    const author = `${req.user.first_name} ${req.user.last_name}`.trim();

    await db.prepare(`
      INSERT INTO secure_notes
        (id, patient_id, patient_name, mrn, type, content, color, visibility, author, created_by, pinned, expires_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      b.patientId   || null,
      b.patientName || '',
      b.mrn         || '',
      b.type        || 'Sticky Note',
      b.content,
      b.color       || 'yellow',
      b.visibility  || 'All Staff',
      author,
      req.user.id,
      b.pinned ? 1 : 0,
      b.expiresDate || null,
    );

    const row = await db.prepare('SELECT * FROM secure_notes WHERE id = ?').get(id);
    res.status(201).json(formatNote(row));
  } catch (err) {
    routeError(req, '[secure-notes] POST /', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PATCH /api/secure-notes/:id
router.patch('/:id', validateResponse(SecureNoteResponseSchema), async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM secure_notes WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Note not found' });

    // Only the author (or admin) can edit
    if (existing.created_by !== req.user.id && req.user.role !== 'admin' && !req.user.isGlobal) {
      return res.status(403).json({ error: 'Not authorized to edit this note' });
    }

    const b = req.body;
    await db.prepare(`
      UPDATE secure_notes SET
        type        = COALESCE(?, type),
        content     = COALESCE(?, content),
        color       = COALESCE(?, color),
        visibility  = COALESCE(?, visibility),
        pinned      = COALESCE(?, pinned),
        expires_date = COALESCE(?, expires_date),
        updated_at  = NOW()
      WHERE id = ?
    `).run(
      b.type        ?? null,
      b.content     ?? null,
      b.color       ?? null,
      b.visibility  ?? null,
      b.pinned != null ? (b.pinned ? 1 : 0) : null,
      b.expiresDate ?? null,
      req.params.id,
    );

    const updated = await db.prepare('SELECT * FROM secure_notes WHERE id = ?').get(req.params.id);
    res.json(formatNote(updated));
  } catch (err) {
    routeError(req, '[secure-notes] PATCH /:id', err);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// DELETE /api/secure-notes/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM secure_notes WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Note not found' });

    if (existing.created_by !== req.user.id && req.user.role !== 'admin' && !req.user.isGlobal) {
      return res.status(403).json({ error: 'Not authorized to delete this note' });
    }

    await db.prepare('DELETE FROM secure_notes WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    routeError(req, '[secure-notes] DELETE /:id', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
