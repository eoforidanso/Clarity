import { requirePatientAccess } from '../middleware/idor.js';
import { requirePatientId } from '../middleware/accessControl.js';
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { routeError } from '../utils/routeError.js';
import { validate } from '../middleware/validate.js';
import { CreateLabSchema } from '../schemas/labSchema.js';
import { logPhiRead } from '../middleware/phiAudit.js';
import { resolveTaskProvider } from '../utils/resolveTaskProvider.js';
import { validateResponse } from '../middleware/validateResponse.js';
import { LabResultResponseSchema, LabListResponseSchema } from '../schemas/responseSchemas.js';

// Flags that warrant auto-urgent and an inbox message
const CRITICAL_FLAGS  = new Set(['HH', 'LL', 'C', 'CH', 'CL', 'AA']);
const ABNORMAL_FLAGS  = new Set(['H', 'L', 'HH', 'LL', 'C', 'CH', 'CL', 'A', 'AA']);

async function triageLabResult(patientId, labResultId, orderedBy, tests) {
  // Find abnormal components across all tests
  const abnormalComponents = [];
  let hasCritical = false;

  for (const test of tests || []) {
    for (const r of test.results || []) {
      const flag = (r.flag || '').trim().toUpperCase();
      if (ABNORMAL_FLAGS.has(flag)) {
        abnormalComponents.push({ test: test.name, component: r.component, value: r.value, unit: r.unit, range: r.range, flag });
        if (CRITICAL_FLAGS.has(flag)) hasCritical = true;
      }
    }
  }

  if (abnormalComponents.length === 0) return; // all normal — no triage needed

  const providerId = await resolveTaskProvider({ candidateId: orderedBy, patientId });

  const patient = await db.prepare(`SELECT first_name, last_name FROM patients WHERE id = $1`).get(patientId);
  const patientName = patient ? `${patient.first_name} ${patient.last_name}` : '';

  // Build summary: first 3 abnormal components
  const summaryLines = abnormalComponents.slice(0, 3).map(c =>
    `${c.test}: ${c.component} ${c.flag} (${c.value}${c.unit ? ' ' + c.unit : ''}, ref ${c.range || 'N/A'})`
  );
  if (abnormalComponents.length > 3) summaryLines.push(`…and ${abnormalComponents.length - 3} more abnormal value(s)`);
  const testSummary = summaryLines.join('\n');

  const now        = new Date();
  const msgId      = uuidv4();
  const taskId     = uuidv4();
  const threadKey  = `${patientId}:${providerId || 'unassigned'}`;

  const msgBody = [
    hasCritical ? '🚨 CRITICAL value(s) require immediate attention.\n' : '⚠️ Abnormal lab result(s) require review.\n',
    testSummary,
    '\nPlease review the full results in the patient chart.',
  ].join('\n');

  await db.prepare(`
    INSERT INTO inbox_messages
      (id, type, from_name, to_user, provider_id, patient_id, patient_name,
       subject, body, date, time, read, priority, status, urgent,
       from_user_type, to_user_type, is_active, thread_key, category)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,$12,'Unread',$13,'system','provider',true,$14,'Labs')
  `).run(
    msgId, 'Lab Result',
    'Lab System',
    providerId, providerId,
    patientId, patientName,
    `${hasCritical ? '🚨 Critical' : '⚠️ Abnormal'} Lab Result — ${patientName}`,
    msgBody,
    now.toISOString().split('T')[0],
    now.toTimeString().slice(0, 5),
    hasCritical ? 'Urgent' : 'Normal',
    hasCritical,
    threadKey
  );

  await db.prepare(`
    INSERT INTO lab_review_tasks
      (id, patient_id, provider_id, order_id, linked_message_id,
       test_summary, abnormal_flag, status, auto_urgent)
    VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8)
  `).run(taskId, patientId, providerId, labResultId, msgId, testSummary, hasCritical ? 'critical' : 'abnormal', hasCritical);
}

const router = Router();
router.use(authenticate);
router.use('/:patientId', requirePatientId, requirePatientAccess);
router.use('/:patientId/*', requirePatientId, requirePatientAccess);

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
router.get('/:patientId/labs', validateResponse(LabListResponseSchema), async (req, res) => {
  try {
    logPhiRead(req, req.params.patientId, 'labs');
    const rows = await db.prepare('SELECT * FROM lab_results WHERE patient_id = ? ORDER BY order_date DESC').all(req.params.patientId);
    res.json(await Promise.all(rows.map(formatLabResult)));
  } catch (err) {
    routeError(req, '[labs] GET', err);
    res.status(500).json({ error: 'Failed to load lab results' });
  }
});

// GET /api/patients/:patientId/labs/:labId
router.get('/:patientId/labs/:labId', validateResponse(LabResultResponseSchema), async (req, res) => {
  try {
    const row = await db.prepare('SELECT * FROM lab_results WHERE id = ? AND patient_id = ?').get(req.params.labId, req.params.patientId);
    if (!row) return res.status(404).json({ error: 'Lab result not found' });
    res.json(await formatLabResult(row));
  } catch (err) {
    routeError(req, '[labs] GET /:labId', err);
    res.status(500).json({ error: 'Failed to load lab result' });
  }
});

// POST /api/patients/:patientId/labs
router.post('/:patientId/labs', validate(CreateLabSchema), validateResponse(LabResultResponseSchema), async (req, res) => {
  try {
    const b = req.body;
    const id = uuidv4();

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
    const formatted = await formatLabResult(row);

    // Fire-and-forget: triage abnormal results into the inbox
    triageLabResult(req.params.patientId, id, b.orderedBy || '', b.tests || [])
      .catch(err => routeError(req, '[labs] auto-triage failed — abnormal result may be unrouted', err));

    res.status(201).json(formatted);
  } catch (err) {
    routeError(req, '[labs] POST', err);
    res.status(500).json({ error: 'Failed to create lab result' });
  }
});

export default router;
