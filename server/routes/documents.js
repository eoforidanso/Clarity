import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/auditLog.js';
import db from '../db/database.js';

const router = Router();

/**
 * PDF Generation (text-based, no external dependencies)
 * Generates structured text documents that can be rendered as PDF on the frontend
 * using the browser's print functionality or a client-side PDF library.
 */

// ── Utility: Build structured document data ─────────────

function getPatientHeader(patientId) {
  const p = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
  if (!p) return null;
  return {
    name: `${p.first_name} ${p.last_name}`,
    mrn: p.mrn,
    dob: p.dob,
    gender: p.gender,
    phone: p.phone || p.cell_phone || '',
    address: [p.address_street, p.address_city, p.address_state, p.address_zip].filter(Boolean).join(', '),
    insurance: p.insurance_primary_name || 'Self Pay',
    memberId: p.insurance_primary_member_id || '',
  };
}

function getProviderInfo(userId) {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!u) return { name: 'Unknown', credentials: '', npi: '', specialty: '' };
  return {
    name: `${u.first_name} ${u.last_name || ''}`.trim(),
    credentials: u.credentials || '',
    npi: u.npi || '',
    specialty: u.specialty || '',
    deaNumber: u.dea_number || '',
  };
}

// ── POST /api/documents/progress-note ─────────────────
router.post('/progress-note', authenticate, (req, res) => {
  const { encounterId, patientId } = req.body;
  if (!encounterId || !patientId) {
    return res.status(400).json({ error: 'encounterId and patientId are required' });
  }

  const patient = getPatientHeader(patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const enc = db.prepare('SELECT * FROM encounters WHERE id = ? AND patient_id = ?').get(encounterId, patientId);
  if (!enc) return res.status(404).json({ error: 'Encounter not found' });

  const provider = enc.provider ? getProviderInfo(enc.provider) : { name: enc.provider_name || 'Unknown', credentials: enc.credentials || '' };

  // Get active problems for this patient
  const problems = db.prepare('SELECT * FROM problems WHERE patient_id = ? AND status = ?').all(patientId, 'Active');

  // Get active meds
  const meds = db.prepare('SELECT * FROM medications WHERE patient_id = ? AND status = ?').all(patientId, 'Active');

  // Get allergies
  const allergies = db.prepare('SELECT * FROM allergies WHERE patient_id = ?').all(patientId);

  // Get recent vitals
  const vitals = db.prepare('SELECT * FROM vitals WHERE patient_id = ? ORDER BY date DESC LIMIT 1').get(patientId);

  // Get assessments for this date
  const assessments = db.prepare('SELECT * FROM assessments WHERE patient_id = ? AND date = ?').all(patientId, enc.date);

  const document = {
    type: 'progress_note',
    title: 'PSYCHIATRIC PROGRESS NOTE',
    generatedAt: new Date().toISOString(),
    generatedBy: `${req.user.first_name} ${req.user.last_name || ''}`.trim(),
    facility: {
      name: 'Clarity EHR — Academic Medical Center',
      address: '1000 Health Sciences Drive, Springfield, IL 62704',
      phone: '(555) 100-2000',
      fax: '(555) 100-2001',
      npi: '1234567890',
    },
    patient,
    encounter: {
      date: enc.date,
      time: enc.time,
      visitType: enc.visit_type,
      cptCode: enc.cpt_code,
      icdCode: enc.icd_code,
      duration: enc.duration,
      reason: enc.reason,
    },
    provider: {
      name: typeof provider === 'object' ? provider.name : enc.provider_name,
      credentials: typeof provider === 'object' ? provider.credentials : enc.credentials,
      npi: typeof provider === 'object' ? provider.npi : '',
      specialty: typeof provider === 'object' ? provider.specialty : '',
    },
    sections: {
      chiefComplaint: enc.chief_complaint || '',
      hpi: enc.hpi || '',
      intervalNote: enc.interval_note || '',
      mentalStatusExam: enc.mse || '',
      assessment: enc.assessment || '',
      plan: enc.plan || '',
      safety: {
        siLevel: enc.safety_si_level || 'None',
        hiLevel: enc.safety_hi_level || 'None',
        selfHarm: !!enc.safety_self_harm,
        substanceUse: !!enc.safety_substance_use,
        safetyPlanUpdated: !!enc.safety_plan_updated,
        crisisResources: !!enc.safety_crisis_resources,
        notes: enc.safety_notes || '',
      },
      followUp: enc.follow_up || '',
      disposition: enc.disposition || '',
    },
    activeMedications: meds.map(m => ({
      name: m.name,
      dose: m.dose,
      frequency: m.frequency,
      sig: m.sig,
    })),
    activeProblems: problems.map(p => ({
      code: p.code,
      description: p.description,
    })),
    allergies: allergies.map(a => ({
      allergen: a.allergen,
      reaction: a.reaction,
      severity: a.severity,
    })),
    vitals: vitals ? {
      date: vitals.date,
      bp: vitals.bp,
      hr: vitals.hr,
      temp: vitals.temp,
      weight: vitals.weight,
      bmi: vitals.bmi,
    } : null,
    assessmentScores: assessments.map(a => ({
      tool: a.tool,
      score: a.score,
      interpretation: a.interpretation,
    })),
    signature: {
      line: `Electronically signed by ${typeof provider === 'object' ? provider.name : enc.provider_name}, ${typeof provider === 'object' ? provider.credentials : enc.credentials}`,
      date: new Date().toISOString(),
      npi: typeof provider === 'object' ? provider.npi : '',
    },
  };

  logAuditEvent({
    userId: req.user.id,
    userName: `${req.user.first_name} ${req.user.last_name || ''}`.trim(),
    userRole: req.user.role,
    action: 'GENERATE_DOCUMENT',
    resourceType: 'progress_note',
    resourceId: encounterId,
    patientId,
    patientName: patient.name,
    details: { documentType: 'progress_note' },
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
  });

  res.json(document);
});

// ── POST /api/documents/prescription ──────────────────
router.post('/prescription', authenticate, (req, res) => {
  const { medicationId, patientId } = req.body;
  if (!medicationId || !patientId) {
    return res.status(400).json({ error: 'medicationId and patientId are required' });
  }

  const patient = getPatientHeader(patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const med = db.prepare('SELECT * FROM medications WHERE id = ? AND patient_id = ?').get(medicationId, patientId);
  if (!med) return res.status(404).json({ error: 'Medication not found' });

  const provider = getProviderInfo(req.user.id);
  const allergies = db.prepare('SELECT * FROM allergies WHERE patient_id = ?').all(patientId);

  const document = {
    type: 'prescription',
    title: med.is_controlled ? 'CONTROLLED SUBSTANCE PRESCRIPTION' : 'PRESCRIPTION',
    generatedAt: new Date().toISOString(),
    generatedBy: `${req.user.first_name} ${req.user.last_name || ''}`.trim(),
    facility: {
      name: 'Clarity EHR — Academic Medical Center',
      address: '1000 Health Sciences Drive, Springfield, IL 62704',
      phone: '(555) 100-2000',
      dea: provider.deaNumber,
    },
    patient,
    prescriber: {
      name: provider.name,
      credentials: provider.credentials,
      npi: provider.npi,
      dea: provider.deaNumber,
      specialty: provider.specialty,
    },
    medication: {
      name: med.name,
      dose: med.dose,
      route: med.route,
      frequency: med.frequency,
      sig: med.sig,
      refillsRemaining: med.refills_left,
      isControlled: !!med.is_controlled,
      schedule: med.schedule || '',
      pharmacy: med.pharmacy,
      startDate: med.start_date,
    },
    allergies: allergies.map(a => a.allergen).join(', '),
    dispense: {
      quantity: 30,
      unit: 'tablets',
      daysSupply: 30,
      refills: med.refills_left,
      substitutionAllowed: !med.is_controlled,
    },
    signature: {
      line: `Electronically signed by ${provider.name}, ${provider.credentials}`,
      date: new Date().toISOString(),
      dea: provider.deaNumber,
      npi: provider.npi,
    },
  };

  logAuditEvent({
    userId: req.user.id,
    userName: provider.name,
    userRole: req.user.role,
    action: 'GENERATE_DOCUMENT',
    resourceType: 'prescription',
    resourceId: medicationId,
    patientId,
    patientName: patient.name,
    details: { documentType: 'prescription', medication: med.name, controlled: !!med.is_controlled },
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
  });

  res.json(document);
});

// ── POST /api/documents/patient-summary ───────────────
router.post('/patient-summary', authenticate, (req, res) => {
  const { patientId } = req.body;
  if (!patientId) return res.status(400).json({ error: 'patientId is required' });

  const patient = getPatientHeader(patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const problems = db.prepare('SELECT * FROM problems WHERE patient_id = ?').all(patientId);
  const meds = db.prepare('SELECT * FROM medications WHERE patient_id = ?').all(patientId);
  const allergies = db.prepare('SELECT * FROM allergies WHERE patient_id = ?').all(patientId);
  const vitals = db.prepare('SELECT * FROM vitals WHERE patient_id = ? ORDER BY date DESC LIMIT 5').all(patientId);
  const assessments = db.prepare('SELECT * FROM assessments WHERE patient_id = ? ORDER BY date DESC LIMIT 10').all(patientId);
  const immunizations = db.prepare('SELECT * FROM immunizations WHERE patient_id = ?').all(patientId);
  const recentEncounters = db.prepare('SELECT * FROM encounters WHERE patient_id = ? ORDER BY date DESC LIMIT 5').all(patientId);

  const document = {
    type: 'patient_summary',
    title: 'CLINICAL CONTINUITY OF CARE DOCUMENT (CCD)',
    generatedAt: new Date().toISOString(),
    generatedBy: `${req.user.first_name} ${req.user.last_name || ''}`.trim(),
    facility: {
      name: 'Clarity EHR — Academic Medical Center',
      address: '1000 Health Sciences Drive, Springfield, IL 62704',
    },
    patient,
    activeProblems: problems.filter(p => p.status === 'Active').map(p => ({ code: p.code, description: p.description, onset: p.onset_date })),
    resolvedProblems: problems.filter(p => p.status !== 'Active').map(p => ({ code: p.code, description: p.description, status: p.status })),
    activeMedications: meds.filter(m => m.status === 'Active').map(m => ({ name: m.name, dose: m.dose, frequency: m.frequency, prescriber: m.prescriber })),
    discontinuedMedications: meds.filter(m => m.status !== 'Active').map(m => ({ name: m.name, dose: m.dose, status: m.status })),
    allergies: allergies.map(a => ({ allergen: a.allergen, type: a.type, reaction: a.reaction, severity: a.severity })),
    recentVitals: vitals.map(v => ({ date: v.date, bp: v.bp, hr: v.hr, temp: v.temp, weight: v.weight, bmi: v.bmi })),
    assessmentScores: assessments.map(a => ({ tool: a.tool, score: a.score, interpretation: a.interpretation, date: a.date })),
    immunizations: immunizations.map(i => ({ vaccine: i.vaccine, date: i.date, nextDue: i.next_due })),
    recentEncounters: recentEncounters.map(e => ({ date: e.date, visitType: e.visit_type, reason: e.reason, provider: e.provider_name, assessment: e.assessment })),
  };

  logAuditEvent({
    userId: req.user.id,
    userName: `${req.user.first_name} ${req.user.last_name || ''}`.trim(),
    userRole: req.user.role,
    action: 'GENERATE_DOCUMENT',
    resourceType: 'patient_summary',
    patientId,
    patientName: patient.name,
    details: { documentType: 'patient_summary' },
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
  });

  res.json(document);
});

// ── POST /api/documents/discharge-summary ─────────────
router.post('/discharge-summary', authenticate, (req, res) => {
  const { patientId, encounterId, dischargePlan, followUpInstructions } = req.body;
  if (!patientId) return res.status(400).json({ error: 'patientId is required' });

  const patient = getPatientHeader(patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const enc = encounterId ? db.prepare('SELECT * FROM encounters WHERE id = ?').get(encounterId) : null;
  const activeMeds = db.prepare('SELECT * FROM medications WHERE patient_id = ? AND status = ?').all(patientId, 'Active');
  const problems = db.prepare('SELECT * FROM problems WHERE patient_id = ? AND status = ?').all(patientId, 'Active');

  const document = {
    type: 'discharge_summary',
    title: 'DISCHARGE SUMMARY',
    generatedAt: new Date().toISOString(),
    generatedBy: `${req.user.first_name} ${req.user.last_name || ''}`.trim(),
    facility: {
      name: 'Clarity EHR — Academic Medical Center',
      address: '1000 Health Sciences Drive, Springfield, IL 62704',
    },
    patient,
    encounter: enc ? {
      date: enc.date,
      visitType: enc.visit_type,
      diagnosis: enc.icd_code,
      assessment: enc.assessment,
      plan: enc.plan,
    } : null,
    activeDiagnoses: problems.map(p => ({ code: p.code, description: p.description })),
    dischargeMedications: activeMeds.map(m => ({
      name: m.name,
      dose: m.dose,
      frequency: m.frequency,
      sig: m.sig,
    })),
    dischargePlan: dischargePlan || '',
    followUpInstructions: followUpInstructions || '',
    safetyPlan: enc ? {
      siLevel: enc.safety_si_level,
      crisisResources: '988 Suicide & Crisis Lifeline, Local ER',
    } : null,
    signature: {
      line: `Electronically signed by ${req.user.first_name} ${req.user.last_name || ''}, ${req.user.credentials || ''}`.trim(),
      date: new Date().toISOString(),
    },
  };

  logAuditEvent({
    userId: req.user.id,
    userName: `${req.user.first_name} ${req.user.last_name || ''}`.trim(),
    userRole: req.user.role,
    action: 'GENERATE_DOCUMENT',
    resourceType: 'discharge_summary',
    patientId,
    patientName: patient.name,
    ipAddress: req.ip || '',
    userAgent: req.get('User-Agent') || '',
  });

  res.json(document);
});

export default router;
