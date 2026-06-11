import { requirePatientAccess } from '../middleware/idor.js';
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.use('/:patientId', requirePatientAccess);
router.use('/:patientId/*', requirePatientAccess);

async function formatLabResult(row) { const tests = await db.prepare('SELECT * FROM lab_result_tests WHERE lab_result_id = ?').all(row.id);
  const testsFormatted = await Promise.all(tests.map(async t => {
    const components = await db.prepare('SELECT * FROM lab_result_components WHERE test_id = ?').all(t.id);
    return {
      name: t.name, results: components.map(c => ({
        component: c.component, value: c.value, unit: c.unit, range: c.range, flag: c.flag,  })),
    };
  }));
  return { id: row.id, orderDate: row.order_date, resultDate: row.result_date, orderedBy: row.ordered_by, status: row.status, tests: testsFormatted,  };
}

// GET /api/patients/:patientId/labs
router.get('/:patientId/labs', async (req, res) => { const rows = await db.prepare('SELECT * FROM lab_results WHERE patient_id = ? ORDER BY order_date DESC').all(req.params.patientId);
  res.json(await Promise.all(rows.map(formatLabResult))); });

// GET /api/patients/:patientId/labs/:labId
router.get('/:patientId/labs/:labId', async (req, res) => { const row = await db.prepare('SELECT * FROM lab_results WHERE id = ? AND patient_id = ?').get(req.params.labId, req.params.patientId);
  if (!row) return res.status(404).json({ error: 'Lab result not found' });
  res.json(await formatLabResult(row));
});

// POST /api/patients/:patientId/labs
router.post('/:patientId/labs', async (req, res) => { const b = req.body;
  const id = b.id || uuidv4();

  await db.prepare('INSERT INTO lab_results (id, patient_id, order_date, result_date, ordered_by, status) VALUES ($1,$2,$3,$4,$5,$6)').run(
    id, req.params.patientId, b.orderDate, b.resultDate || null, b.orderedBy || '', b.status || 'Pending'
  );

  if (b.tests) {
    for (const test of b.tests) {
      const testId = uuidv4();
      await db.prepare('INSERT INTO lab_result_tests (id, lab_result_id, name) VALUES ($1,$2,$3)').run(testId, id, test.name);
      if (test.results) {
        for (const r of test.results) {
          await db.prepare('INSERT INTO lab_result_components (id, test_id, component, value, unit, range, flag) VALUES ($1,$2,$3,$4,$5,$6,$7)').run(
            uuidv4(), testId, r.component, r.value || '', r.unit || '', r.range || '', r.flag || ''
          );
        }
      }
    }
  }

  const row = await db.prepare('SELECT * FROM lab_results WHERE id = $1').get(id);
  res.status(201).json(await formatLabResult(row));
});

export default router;
