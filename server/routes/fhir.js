import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/auditLog.js';
import db from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * FHIR R4 Basic API
 * Implements: Patient, Encounter, Observation, Condition, MedicationStatement, AllergyIntolerance
 * Follows HL7 FHIR R4 specification: https://hl7.org/fhir/R4/
 */

const BASE_URL = '/api/fhir';

// ── Metadata / CapabilityStatement ────────────────────
router.get('/metadata', (req, res) => {
  res.json({
    resourceType: 'CapabilityStatement',
    status: 'active',
    date: new Date().toISOString(),
    kind: 'instance',
    fhirVersion: '4.0.1',
    format: ['json'],
    rest: [{
      mode: 'server',
      resource: [
        { type: 'Patient', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Encounter', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Observation', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Condition', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'MedicationStatement', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'AllergyIntolerance', interaction: [{ code: 'read' }, { code: 'search-type' }] },
      ],
    }],
  });
});

// ── Helper: FHIR Bundle ───────────────────────────────
function bundle(type, entries, total) {
  return {
    resourceType: 'Bundle',
    type,
    total: total ?? entries.length,
    entry: entries.map(e => ({
      fullUrl: `${BASE_URL}/${e.resourceType}/${e.id}`,
      resource: e,
    })),
  };
}

// ── FHIR Patient ──────────────────────────────────────

function toFhirPatient(p) {
  return {
    resourceType: 'Patient',
    id: p.id,
    meta: { lastUpdated: p.updated_at || p.created_at },
    identifier: [
      { use: 'usual', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR' }] }, value: p.mrn },
    ],
    active: !!p.is_active,
    name: [{ use: 'official', family: p.last_name, given: [p.first_name] }],
    gender: p.gender?.toLowerCase() === 'male' ? 'male' : p.gender?.toLowerCase() === 'female' ? 'female' : 'other',
    birthDate: p.dob,
    telecom: [
      p.phone ? { system: 'phone', value: p.phone, use: 'home' } : null,
      p.cell_phone ? { system: 'phone', value: p.cell_phone, use: 'mobile' } : null,
      p.email ? { system: 'email', value: p.email } : null,
    ].filter(Boolean),
    address: p.address_street ? [{
      use: 'home',
      line: [p.address_street],
      city: p.address_city,
      state: p.address_state,
      postalCode: p.address_zip,
    }] : [],
    contact: p.emergency_contact_name ? [{
      relationship: [{ text: p.emergency_contact_relationship }],
      name: { text: p.emergency_contact_name },
      telecom: [{ system: 'phone', value: p.emergency_contact_phone }],
    }] : [],
    communication: [{ language: { text: p.language || 'English' }, preferred: true }],
    extension: [
      p.race ? { url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race', valueString: p.race } : null,
      p.ethnicity ? { url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity', valueString: p.ethnicity } : null,
    ].filter(Boolean),
  };
}

// GET /api/fhir/Patient
router.get('/Patient', authenticate, (req, res) => {
  const { name, _id, identifier } = req.query;
  let patients;

  if (_id) {
    const p = db.prepare('SELECT * FROM patients WHERE id = ?').get(_id);
    patients = p ? [p] : [];
  } else if (identifier) {
    const p = db.prepare('SELECT * FROM patients WHERE mrn = ?').get(identifier);
    patients = p ? [p] : [];
  } else if (name) {
    patients = db.prepare("SELECT * FROM patients WHERE first_name LIKE ? OR last_name LIKE ?").all(`%${name}%`, `%${name}%`);
  } else {
    patients = db.prepare('SELECT * FROM patients WHERE is_active = 1').all();
  }

  logAuditEvent({
    userId: req.user?.id, userName: `${req.user?.first_name || ''} ${req.user?.last_name || ''}`.trim(),
    userRole: req.user?.role, action: 'FHIR_SEARCH', resourceType: 'Patient',
    details: { query: req.query }, ipAddress: req.ip, userAgent: req.get('User-Agent'),
  });

  res.json(bundle('searchset', patients.map(toFhirPatient)));
});

// GET /api/fhir/Patient/:id
router.get('/Patient/:id', authenticate, (req, res) => {
  const p = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found' }] });

  logAuditEvent({
    userId: req.user?.id, userName: `${req.user?.first_name || ''} ${req.user?.last_name || ''}`.trim(),
    userRole: req.user?.role, action: 'FHIR_READ', resourceType: 'Patient', resourceId: req.params.id,
    patientId: req.params.id, patientName: `${p.first_name} ${p.last_name}`,
    ipAddress: req.ip, userAgent: req.get('User-Agent'),
  });

  res.json(toFhirPatient(p));
});

// ── FHIR Encounter ────────────────────────────────────

function toFhirEncounter(e) {
  return {
    resourceType: 'Encounter',
    id: e.id,
    meta: { lastUpdated: e.updated_at || e.created_at },
    status: 'finished',
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' },
    type: [{ coding: [{ system: 'http://www.ama-assn.org/go/cpt', code: e.cpt_code, display: e.visit_type }] }],
    subject: { reference: `Patient/${e.patient_id}` },
    participant: e.provider ? [{ individual: { display: `${e.provider_name || ''} ${e.credentials || ''}`.trim() } }] : [],
    period: { start: `${e.date}T${e.time || '00:00'}:00`, end: `${e.date}T${e.time || '00:00'}:00` },
    reasonCode: e.chief_complaint ? [{ text: e.chief_complaint }] : [],
    diagnosis: e.icd_code ? [{ condition: { display: e.icd_code }, rank: 1 }] : [],
  };
}

router.get('/Encounter', authenticate, (req, res) => {
  const { patient, date } = req.query;
  let encounters;

  if (patient) {
    encounters = db.prepare('SELECT * FROM encounters WHERE patient_id = ? ORDER BY date DESC').all(patient);
  } else {
    encounters = db.prepare('SELECT * FROM encounters ORDER BY date DESC LIMIT 100').all();
  }

  res.json(bundle('searchset', encounters.map(toFhirEncounter)));
});

router.get('/Encounter/:id', authenticate, (req, res) => {
  const e = db.prepare('SELECT * FROM encounters WHERE id = ?').get(req.params.id);
  if (!e) return res.status(404).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found' }] });
  res.json(toFhirEncounter(e));
});

// ── FHIR Observation (Vitals + Assessments) ───────────

function toFhirVital(v) {
  const components = [];
  if (v.bp) {
    const [sys, dia] = v.bp.split('/');
    components.push({ code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic BP' }] }, valueQuantity: { value: parseFloat(sys), unit: 'mmHg' } });
    components.push({ code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic BP' }] }, valueQuantity: { value: parseFloat(dia), unit: 'mmHg' } });
  }
  if (v.hr) components.push({ code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart Rate' }] }, valueQuantity: { value: v.hr, unit: 'bpm' } });
  if (v.temp) components.push({ code: { coding: [{ system: 'http://loinc.org', code: '8310-5', display: 'Body Temperature' }] }, valueQuantity: { value: v.temp, unit: '°F' } });
  if (v.weight) components.push({ code: { coding: [{ system: 'http://loinc.org', code: '29463-7', display: 'Body Weight' }] }, valueQuantity: { value: v.weight, unit: 'lbs' } });
  if (v.bmi) components.push({ code: { coding: [{ system: 'http://loinc.org', code: '39156-5', display: 'BMI' }] }, valueQuantity: { value: v.bmi, unit: 'kg/m2' } });
  if (v.spo2) components.push({ code: { coding: [{ system: 'http://loinc.org', code: '2708-6', display: 'SpO2' }] }, valueQuantity: { value: v.spo2, unit: '%' } });

  return {
    resourceType: 'Observation',
    id: v.id,
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '85353-1', display: 'Vital Signs Panel' }] },
    subject: { reference: `Patient/${v.patient_id}` },
    effectiveDateTime: `${v.date}T${v.time || '00:00'}:00`,
    component: components,
  };
}

function toFhirAssessment(a) {
  return {
    resourceType: 'Observation',
    id: a.id,
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'survey', display: 'Survey' }] }],
    code: { text: a.tool },
    subject: { reference: `Patient/${a.patient_id}` },
    effectiveDateTime: a.date,
    valueInteger: a.score,
    interpretation: [{ text: a.interpretation }],
    performer: a.administered_by ? [{ display: a.administered_by }] : [],
  };
}

router.get('/Observation', authenticate, (req, res) => {
  const { patient, category } = req.query;
  const results = [];

  if (!patient) return res.json(bundle('searchset', []));

  if (!category || category === 'vital-signs') {
    const vitals = db.prepare('SELECT * FROM vitals WHERE patient_id = ? ORDER BY date DESC').all(patient);
    results.push(...vitals.map(toFhirVital));
  }

  if (!category || category === 'survey') {
    const assessments = db.prepare('SELECT * FROM assessments WHERE patient_id = ? ORDER BY date DESC').all(patient);
    results.push(...assessments.map(toFhirAssessment));
  }

  res.json(bundle('searchset', results));
});

// ── FHIR Condition (Problem List) ─────────────────────

function toFhirCondition(p) {
  return {
    resourceType: 'Condition',
    id: p.id,
    clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: p.status?.toLowerCase() === 'active' ? 'active' : 'resolved' }] },
    code: {
      coding: [{ system: 'http://hl7.org/fhir/sid/icd-10-cm', code: p.code, display: p.description }],
      text: p.description,
    },
    subject: { reference: `Patient/${p.patient_id}` },
    onsetDateTime: p.onset_date || undefined,
    recorder: p.diagnosed_by ? { display: p.diagnosed_by } : undefined,
  };
}

router.get('/Condition', authenticate, (req, res) => {
  const { patient } = req.query;
  if (!patient) return res.json(bundle('searchset', []));

  const problems = db.prepare('SELECT * FROM problems WHERE patient_id = ?').all(patient);
  res.json(bundle('searchset', problems.map(toFhirCondition)));
});

router.get('/Condition/:id', authenticate, (req, res) => {
  const p = db.prepare('SELECT * FROM problems WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found' }] });
  res.json(toFhirCondition(p));
});

// ── FHIR MedicationStatement ──────────────────────────

function toFhirMedicationStatement(m) {
  return {
    resourceType: 'MedicationStatement',
    id: m.id,
    status: m.status?.toLowerCase() === 'active' ? 'active' : 'stopped',
    medicationCodeableConcept: { text: m.name },
    subject: { reference: `Patient/${m.patient_id}` },
    effectivePeriod: { start: m.start_date },
    dosage: [{
      text: m.sig || `${m.dose} ${m.route} ${m.frequency}`,
      route: { text: m.route },
      doseAndRate: [{ doseQuantity: { value: parseFloat(m.dose) || 0, unit: m.dose?.replace(/[0-9.]/g, '').trim() || 'mg' } }],
    }],
    informationSource: m.prescriber ? { display: m.prescriber } : undefined,
  };
}

router.get('/MedicationStatement', authenticate, (req, res) => {
  const { patient } = req.query;
  if (!patient) return res.json(bundle('searchset', []));

  const meds = db.prepare('SELECT * FROM medications WHERE patient_id = ?').all(patient);
  res.json(bundle('searchset', meds.map(toFhirMedicationStatement)));
});

// ── FHIR AllergyIntolerance ──────────────────────────

function toFhirAllergy(a) {
  return {
    resourceType: 'AllergyIntolerance',
    id: a.id,
    clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: a.status?.toLowerCase() === 'active' ? 'active' : 'inactive' }] },
    type: a.type?.toLowerCase() === 'medication' ? 'allergy' : 'intolerance',
    category: [a.type?.toLowerCase() === 'medication' ? 'medication' : a.type?.toLowerCase() === 'food' ? 'food' : 'environment'],
    criticality: a.severity?.toLowerCase() === 'severe' ? 'high' : a.severity?.toLowerCase() === 'moderate' ? 'low' : 'low',
    code: { text: a.allergen },
    patient: { reference: `Patient/${a.patient_id}` },
    onsetDateTime: a.onset_date || undefined,
    reaction: a.reaction ? [{ manifestation: [{ text: a.reaction }], severity: a.severity?.toLowerCase() || 'moderate' }] : [],
  };
}

router.get('/AllergyIntolerance', authenticate, (req, res) => {
  const { patient } = req.query;
  if (!patient) return res.json(bundle('searchset', []));

  const allergies = db.prepare('SELECT * FROM allergies WHERE patient_id = ?').all(patient);
  res.json(bundle('searchset', allergies.map(toFhirAllergy)));
});

export default router;
