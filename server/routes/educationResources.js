import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { routeError } from '../utils/routeError.js';

const router = Router();
router.use(authenticate);

function formatResource(r) {
  return {
    id:          r.id,
    title:       r.title,
    category:    r.category,
    format:      r.format,
    language:    r.language,
    pages:       r.pages,
    readTime:    r.read_time,
    description: r.description,
    tags:        r.tags || [],
    downloads:   r.downloads,
    lastUpdated: r.updated_at?.split?.('T')?.[0] ?? r.updated_at,
  };
}

// GET /api/education-resources
router.get('/', async (req, res) => {
  try {
    const { category, format, language } = req.query;
    let sql = 'SELECT * FROM education_resources WHERE 1=1';
    const args = [];
    if (category && category !== 'All') { sql += ' AND category = ?'; args.push(category); }
    if (format   && format   !== 'All') { sql += ' AND format = ?';   args.push(format); }
    if (language && language !== 'All') { sql += ' AND language = ?'; args.push(language); }
    sql += ' ORDER BY title ASC';
    const rows = await db.prepare(sql).all(...args);
    res.json(rows.map(formatResource));
  } catch (err) {
    routeError(req, '[education-resources] GET', err);
    res.status(500).json({ error: 'Failed to load education resources' });
  }
});

// POST /api/education-resources (add custom resource)
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    const id = uuidv4();
    await db.prepare(`
      INSERT INTO education_resources (id, title, category, format, language, pages, read_time, description, tags, downloads)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      id, b.title || 'Untitled', b.category || 'Wellness', b.format || 'PDF',
      b.language || 'English', b.pages || 0, b.readTime || '',
      b.description || '', JSON.stringify(b.tags || [])
    );
    const row = await db.prepare('SELECT * FROM education_resources WHERE id = ?').get(id);
    res.status(201).json(formatResource(row));
  } catch (err) {
    routeError(req, '[education-resources] POST', err);
    res.status(500).json({ error: 'Failed to add education resource' });
  }
});

// POST /api/education-resources/:id/download — increment download counter
router.post('/:id/download', async (req, res) => {
  try {
    await db.prepare(`UPDATE education_resources SET downloads = downloads + 1 WHERE id = ?`).run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    routeError(req, '[education-resources] download', err);
    res.status(500).json({ error: 'Failed to record download' });
  }
});

// DELETE /api/education-resources/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.prepare('DELETE FROM education_resources WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    routeError(req, '[education-resources] DELETE', err);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

export default router;
