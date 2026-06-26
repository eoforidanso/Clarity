import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { routeError } from '../utils/routeError.js';
import { validate } from '../middleware/validate.js';
import { SmartPhraseSchema } from '../schemas/messagingSchema.js';
import { validateResponse } from '../middleware/validateResponse.js';
import { AnyResponseSchema } from '../schemas/responseSchemas.js';

const router = Router();
router.use(authenticate);
router.use(validateResponse(AnyResponseSchema));

// GET /api/smart-phrases
router.get('/', async (req, res) => {
  try {
    const category = req.query.category;
    let query = 'SELECT * FROM smart_phrases WHERE (created_by = ? OR created_by IS NULL)';
    const params = [req.user.id];
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    query += ' ORDER BY name';
    const rows = await db.prepare(query).all(...params);
    res.json(rows.map(r => ({ id: r.id, name: r.name, triggerText: r.trigger_text, content: r.content, category: r.category, userId: r.created_by,
    })));
  } catch (err) {
    routeError(req, '[smartPhrases] GET /', err);
    res.status(500).json({ error: 'Failed to load smart phrases' });
  }
});

// POST /api/smart-phrases
router.post('/', validate(SmartPhraseSchema), async (req, res) => {
  try {
    const { name, triggerText, content, category } = req.body;
    const id = uuidv4();
    await db.prepare('INSERT INTO smart_phrases (id, created_by, name, trigger_text, content, category) VALUES (?,?,?,?,?,?)').run(
      id, req.user.id, name, triggerText, content, category || 'General'
    );
    res.status(201).json({ id, name, triggerText, content, category: category || 'General', userId: req.user.id });
  } catch (err) {
    routeError(req, '[smartPhrases] POST /', err);
    res.status(500).json({ error: 'Failed to create smart phrase' });
  }
});

// PUT /api/smart-phrases/:id
router.put('/:id', validate(SmartPhraseSchema.partial()), async (req, res) => {
  try {
    const { name, triggerText, content, category } = req.body;
    const existing = await db.prepare('SELECT * FROM smart_phrases WHERE id = ? AND created_by = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Smart phrase not found' });
    await db.prepare('UPDATE smart_phrases SET name=?, trigger_text=?, content=?, category=? WHERE id=?').run(
      name ?? existing.name, triggerText ?? existing.trigger_text, content ?? existing.content, category ?? existing.category, req.params.id
    );
    res.json({ id: req.params.id, name: name ?? existing.name, triggerText: triggerText ?? existing.trigger_text, content: content ?? existing.content, category: category ?? existing.category, userId: req.user.id });
  } catch (err) {
    routeError(req, '[smartPhrases] PUT /:id', err);
    res.status(500).json({ error: 'Failed to update smart phrase' });
  }
});

// DELETE /api/smart-phrases/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.prepare('DELETE FROM smart_phrases WHERE id = ? AND created_by = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Smart phrase not found' });
    res.json({ success: true });
  } catch (err) {
    routeError(req, '[smartPhrases] DELETE /:id', err);
    res.status(500).json({ error: 'Failed to delete smart phrase' });
  }
});

export default router;
