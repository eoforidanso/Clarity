import { Router } from 'express';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { validateResponse } from '../middleware/validateResponse.js';
import { AnyResponseSchema } from '../schemas/responseSchemas.js';

const router = Router();
router.use(authenticate);
router.use(validateResponse(AnyResponseSchema));

// Helper: awaits the query then returns the scalar count
async function count(sql, ...params) {
  const row = await db.prepare(sql).get(...params);
  return Number(row?.count ?? row?.c ?? 0);
}

// GET /api/analytics/summary
router.get('/summary', async (req, res) => {
  const totalPatients  = await count('SELECT COUNT(*) as count FROM patients');
  const activePatients = await count('SELECT COUNT(*) as count FROM patients WHERE is_active = TRUE');

  const today   = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  const todayAppts = await count('SELECT COUNT(*) as count FROM appointments WHERE date = $1', today);
  const weekAppts  = await count('SELECT COUNT(*) as count FROM appointments WHERE date BETWEEN $1 AND $2', weekAgo, today);

  // Visit type breakdown
  const visitTypes = await db.prepare('SELECT type, COUNT(*) as count FROM appointments GROUP BY type').all();

  // Provider workload (appointments by provider)
  const providerWorkload = await db.prepare(
    'SELECT provider, COUNT(*) as count, COUNT(CASE WHEN date = $1 THEN 1 END) as today FROM appointments GROUP BY provider'
  ).all(today);

  // Appointment status distribution
  const apptStatuses = await db.prepare('SELECT status, COUNT(*) as count FROM appointments GROUP BY status').all();

  // Inbox volume
  const pendingInbox = await count("SELECT COUNT(*) as count FROM inbox_messages WHERE status IN ('New', 'Pending')");
  const inboxByType  = await db.prepare('SELECT type, COUNT(*) as count FROM inbox_messages GROUP BY type').all();

  // Medication stats
  const totalMeds      = await count('SELECT COUNT(*) as count FROM medications');
  const activeMeds     = await count("SELECT COUNT(*) as count FROM medications WHERE status = 'Active'");
  const controlledMeds = await count('SELECT COUNT(*) as count FROM medications WHERE is_controlled = TRUE');

  // Assessment trends
  const assessmentCounts  = await db.prepare('SELECT tool as type, COUNT(*) as count FROM assessments GROUP BY tool').all();
  const recentAssessments = await db.prepare('SELECT tool as type, score, date FROM assessments ORDER BY date DESC LIMIT 20').all();

  // Problem distribution
  const problemsByStatus = await db.prepare('SELECT status, COUNT(*) as count FROM problems GROUP BY status').all();

  // Demographics
  const genderDist = await db.prepare('SELECT gender, COUNT(*) as count FROM patients GROUP BY gender').all();

  res.json({
    patients:     { total: totalPatients, active: activePatients, genderDistribution: genderDist },
    appointments: { today: todayAppts, thisWeek: weekAppts, byType: visitTypes, byStatus: apptStatuses },
    providers:    providerWorkload,
    inbox:        { pending: pendingInbox, byType: inboxByType },
    medications:  { total: totalMeds, active: activeMeds, controlled: controlledMeds },
    assessments:  { byType: assessmentCounts, recent: recentAssessments },
    problems:     { byStatus: problemsByStatus },
  });
});

// GET /api/analytics/patient/:id — per-patient analytics
router.get('/patient/:id', async (req, res) => {
  const pid = req.params.id;
  const encCount  = await count('SELECT COUNT(*) as count FROM encounters WHERE patient_id = $1', pid);
  const medCount  = await count("SELECT COUNT(*) as count FROM medications WHERE patient_id = $1 AND status = 'Active'", pid);
  const assessments = await db.prepare('SELECT tool as type, score, date FROM assessments WHERE patient_id = $1 ORDER BY date DESC').all(pid);
  const appts       = await db.prepare('SELECT date, type, status FROM appointments WHERE patient_id = $1 ORDER BY date DESC LIMIT 10').all(pid);
  const vitals      = await db.prepare('SELECT date, bp, hr, weight FROM vitals WHERE patient_id = $1 ORDER BY date DESC LIMIT 10').all(pid);

  res.json({
    encounters: encCount,
    activeMedications: medCount,
    assessments,
    recentAppointments: appts,
    vitalsTrend: vitals.map(v => ({ date: v.date, bp: v.bp, heartRate: v.hr, weight: v.weight })),
  });
});

export default router;
