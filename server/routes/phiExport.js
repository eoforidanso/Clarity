/**
 * PHI Export Routes
 * Protected Health Information export with monitoring & elevation requirements
 *
 * All exports are logged and monitored for:
 * - Exfiltration patterns (user A exporting for user B)
 * - Bulk exports (100+ records require elevation)
 * - Frequency anomalies (5+ exports in 5 minutes)
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { monitorPhiExport, requirePhiElevation } from '../middleware/phiExport.js';
import { logAuditEvent } from '../middleware/auditLog.js';
import db from '../db/database.js';
import { validateResponse } from '../middleware/validateResponse.js';
import { AnyResponseSchema } from '../schemas/responseSchemas.js';

const router = Router();
router.use(validateResponse(AnyResponseSchema));

/**
 * GET /api/patients/:id/export — export patient record
 * Format: pdf, csv, hl7
 * Requires: elevation if > 100 records
 */
router.get('/:id/export', authenticate, requirePhiElevation({ threshold: 100 }), async (req, res) => {
  const { id } = req.params;
  const { format = 'pdf' } = req.query;

  // Validate format
  if (!['pdf', 'csv', 'hl7'].includes(format)) {
    return res.status(400).json({ error: 'Invalid format' });
  }

  try {
    // Monitor the export
    const monitoring = await monitorPhiExport(db, req.user, {
      type: 'patient_export',
      patientIds: [id],
      format,
      recordCount: 1
    }, req);

    if (!monitoring.allowed) {
      return res.status(403).json({
        error: monitoring.message,
        action: 'require_elevation'
      });
    }

    // Gather all patient data from the DB
    const [
      patient,
      encounters,
      medications,
      allergies,
      problems,
      vitals,
      orders,
      labs,
      assessments,
      immunizations,
    ] = await Promise.all([
      db.prepare(`SELECT * FROM patients WHERE id = ?`).get(id),
      db.prepare(`SELECT * FROM encounters WHERE patient_id = ? ORDER BY encounter_date DESC`).all(id),
      db.prepare(`SELECT * FROM medications WHERE patient_id = ? ORDER BY prescribed_date DESC`).all(id),
      db.prepare(`SELECT * FROM allergies WHERE patient_id = ? ORDER BY created_at DESC`).all(id),
      db.prepare(`SELECT * FROM problems WHERE patient_id = ? ORDER BY date_diagnosed DESC`).all(id),
      db.prepare(`SELECT * FROM vitals WHERE patient_id = ? ORDER BY date DESC`).all(id),
      db.prepare(`SELECT * FROM orders WHERE patient_id = ? ORDER BY created_at DESC`).all(id),
      db.prepare(`SELECT * FROM labs WHERE patient_id = ? ORDER BY result_date DESC`).all(id).catch(() => []),
      db.prepare(`SELECT * FROM assessments WHERE patient_id = ? ORDER BY administered_date DESC`).all(id).catch(() => []),
      db.prepare(`SELECT * FROM immunizations WHERE patient_id = ? ORDER BY administered_date DESC`).all(id).catch(() => []),
    ]);

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const recordCount = encounters.length + medications.length + allergies.length +
      problems.length + vitals.length + orders.length + labs.length +
      assessments.length + immunizations.length;

    logAuditEvent({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'PHI_EXPORT',
      resourceType: 'phi',
      resourceId: id,
      details: { type: 'patient_export', format, recordCount },
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') || '',
      sessionId: req.user.session_id
    });

    if (format === 'csv') {
      // Build a multi-section CSV
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const row = (cols) => cols.map(esc).join(',');

      const sections = [];

      // Demographics
      sections.push('## DEMOGRAPHICS');
      sections.push(row(['MRN','Name','DOB','Gender','Phone','Email','Address','Insurance','Member ID','PCP']));
      sections.push(row([
        patient.mrn,
        `${patient.first_name} ${patient.last_name}`,
        patient.dob,
        patient.gender,
        patient.phone || patient.cell_phone,
        patient.email,
        [patient.address_street, patient.address_city, patient.address_state, patient.address_zip].filter(Boolean).join(', '),
        patient.insurance_primary_name,
        patient.insurance_primary_member_id,
        patient.pcp,
      ]));

      // Encounters
      if (encounters.length) {
        sections.push('');
        sections.push('## ENCOUNTERS');
        sections.push(row(['Date','Type','Provider','Chief Complaint','Assessment','Status','Signed']));
        encounters.forEach(e => sections.push(row([
          e.encounter_date, e.visit_type, e.provider_name || e.signed_by,
          e.chief_complaint, e.assessment, e.status, e.signed_at || '',
        ])));
      }

      // Medications
      if (medications.length) {
        sections.push('');
        sections.push('## MEDICATIONS');
        sections.push(row(['Name','Dose','Frequency','Prescriber','Start Date','Status','Refills']));
        medications.forEach(m => sections.push(row([
          m.name, m.dose, m.frequency, m.prescriber, m.prescribed_date, m.status, m.refills ?? '',
        ])));
      }

      // Allergies
      if (allergies.length) {
        sections.push('');
        sections.push('## ALLERGIES');
        sections.push(row(['Allergen','Type','Reaction','Severity','Status']));
        allergies.forEach(a => sections.push(row([a.allergen, a.type, a.reaction, a.severity, a.status])));
      }

      // Problems
      if (problems.length) {
        sections.push('');
        sections.push('## PROBLEM LIST');
        sections.push(row(['Description','ICD Code','Date Diagnosed','Status','Provider']));
        problems.forEach(p => sections.push(row([p.description, p.icd_code, p.date_diagnosed, p.status, p.provider])));
      }

      // Vitals
      if (vitals.length) {
        sections.push('');
        sections.push('## VITALS');
        sections.push(row(['Date','BP','HR','Temp','RR','SpO2','Weight','Height','BMI']));
        vitals.forEach(v => sections.push(row([v.date, v.bp, v.hr, v.temp, v.rr, v.spo2, v.weight, v.height, v.bmi])));
      }

      // Assessments
      if (assessments.length) {
        sections.push('');
        sections.push('## ASSESSMENTS');
        sections.push(row(['Date','Type','Score','Interpretation']));
        assessments.forEach(a => sections.push(row([a.administered_date, a.assessment_type, a.score, a.interpretation])));
      }

      const csv = sections.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="patient_${patient.mrn || id}_${new Date().toISOString().slice(0,10)}.csv"`);
      return res.send(csv);
    }

    if (format === 'hl7') {
      // HL7 v2.5-inspired JSON (FHIR Bundle for downstream use)
      const hl7Bundle = {
        resourceType: 'Bundle',
        type: 'document',
        exportedAt: new Date().toISOString(),
        exportedBy: req.user.username,
        patient: {
          resourceType: 'Patient',
          id: patient.id,
          mrn: patient.mrn,
          name: [{ use: 'official', family: patient.last_name, given: [patient.first_name] }],
          birthDate: patient.dob,
          gender: patient.gender,
          telecom: [
            { system: 'phone', value: patient.phone || patient.cell_phone },
            { system: 'email', value: patient.email },
          ].filter(t => t.value),
          address: [{
            line: [patient.address_street],
            city: patient.address_city,
            state: patient.address_state,
            postalCode: patient.address_zip,
          }],
          insurance: patient.insurance_primary_name ? {
            name: patient.insurance_primary_name,
            memberId: patient.insurance_primary_member_id,
            groupNumber: patient.insurance_primary_group_number,
          } : null,
        },
        entries: {
          encounters:    encounters.map(e => ({ resourceType: 'Encounter', ...e })),
          medications:   medications.map(m => ({ resourceType: 'MedicationStatement', ...m })),
          allergies:     allergies.map(a => ({ resourceType: 'AllergyIntolerance', ...a })),
          conditions:    problems.map(p => ({ resourceType: 'Condition', ...p })),
          observations:  vitals.map(v => ({ resourceType: 'Observation', category: 'vital-signs', ...v })),
          diagnosticReports: labs.map(l => ({ resourceType: 'DiagnosticReport', ...l })),
          assessments:   assessments.map(a => ({ resourceType: 'Observation', category: 'survey', ...a })),
          immunizations: immunizations.map(i => ({ resourceType: 'Immunization', ...i })),
        },
      };
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="patient_${patient.mrn || id}_hl7.json"`);
      return res.json(hl7Bundle);
    }

    // Default: structured JSON export
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.username,
      format: 'json',
      recordCount,
      patient: {
        id: patient.id,
        mrn: patient.mrn,
        name: `${patient.first_name} ${patient.last_name}`,
        dob: patient.dob,
        gender: patient.gender,
        phone: patient.phone || patient.cell_phone,
        email: patient.email,
        address: {
          street: patient.address_street,
          city: patient.address_city,
          state: patient.address_state,
          zip: patient.address_zip,
        },
        insurance: {
          primary: {
            name: patient.insurance_primary_name,
            memberId: patient.insurance_primary_member_id,
            groupNumber: patient.insurance_primary_group_number,
            copay: patient.insurance_primary_copay,
          },
        },
        emergencyContact: {
          name: patient.emergency_contact_name,
          relationship: patient.emergency_contact_relationship,
          phone: patient.emergency_contact_phone,
        },
        pcp: patient.pcp,
        assignedProvider: patient.assigned_provider,
      },
      clinicalData: {
        encounters,
        medications,
        allergies,
        problems,
        vitals,
        orders,
        labs,
        assessments,
        immunizations,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="patient_${patient.mrn || id}_${new Date().toISOString().slice(0,10)}.json"`);
    res.json(exportData);
  } catch (err) {
    console.error('[phi-export]', err);
    return res.status(500).json({ error: 'Export failed' });
  }
});

/**
 * GET /api/encounters/:id/download — download encounter data
 * Automatically monitored for bulk exports
 */
router.get('/encounters/:id/download', authenticate, async (req, res) => {
  const { id } = req.params;
  const { format = 'pdf', include_labs = false, include_imaging = false } = req.query;

  // Count records
  let recordCount = 1; // encounter itself
  if (include_labs === 'true') recordCount += 20; // estimate
  if (include_imaging === 'true') recordCount += 15; // estimate

  try {
    // Check if elevation required
    if (recordCount > 100 && !req.user?.elevated) {
      logAuditEvent({
        userId: req.user.id,
        userName: req.user.username,
        userRole: req.user.role,
        action: 'PHI_EXPORT_ELEVATION_REQUIRED',
        resourceType: 'phi',
        resourceId: id,
        details: { recordCount },
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || '',
        sessionId: req.user.session_id
      });

      return res.status(403).json({
        error: 'Bulk export requires re-authentication',
        action: 'require_elevation',
        recordCount
      });
    }

    // Monitor export
    const monitoring = await monitorPhiExport(db, req.user, {
      type: 'encounter_export',
      patientIds: [], // encounter doesn't directly link to patient in this model
      format,
      recordCount
    }, req);

    logAuditEvent({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'PHI_EXPORT',
      resourceType: 'phi',
      resourceId: id,
      details: {
        type: 'encounter_export',
        format,
        recordCount,
        includeLabs: include_labs,
        includeImaging: include_imaging
      },
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') || '',
      sessionId: req.user.session_id
    });

    // Fetch encounter with related data
    const encounter = await db.prepare(`SELECT * FROM encounters WHERE id = ?`).get(id);
    if (!encounter) return res.status(404).json({ error: 'Encounter not found' });

    const [encLabs, encOrders] = await Promise.all([
      include_labs === 'true'
        ? db.prepare(`SELECT * FROM labs WHERE patient_id = ? ORDER BY result_date DESC LIMIT 50`).all(encounter.patient_id).catch(() => [])
        : [],
      include_imaging === 'true'
        ? db.prepare(`SELECT * FROM orders WHERE patient_id = ? AND type = 'Imaging' ORDER BY created_at DESC LIMIT 30`).all(encounter.patient_id).catch(() => [])
        : [],
    ]);

    const actualCount = 1 + encLabs.length + encOrders.length;

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.username,
      recordCount: actualCount,
      encounter,
      labs: encLabs,
      imagingOrders: encOrders,
    };

    if (format === 'csv') {
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const rows = [
        'Field,Value',
        `Date,${esc(encounter.encounter_date)}`,
        `Type,${esc(encounter.visit_type)}`,
        `Provider,${esc(encounter.provider_name || encounter.signed_by)}`,
        `Chief Complaint,${esc(encounter.chief_complaint)}`,
        `Assessment,${esc(encounter.assessment)}`,
        `Plan,${esc(encounter.plan)}`,
        `Status,${esc(encounter.status)}`,
        `Signed At,${esc(encounter.signed_at)}`,
      ].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="encounter_${id}.csv"`);
      return res.send(rows);
    }

    res.json(exportData);
  } catch (err) {
    console.error('[encounter-download]', err);
    return res.status(500).json({ error: 'Download failed' });
  }
});

/**
 * GET /api/audit-logs/export — export audit logs (admin/security only)
 * High-sensitivity: always monitored, always requires elevation
 */
router.get('/audit-logs/export', authenticate, async (req, res) => {
  // Restrict to admin/security roles
  if (!['admin', 'security'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // Audit log export ALWAYS requires elevation
  if (!req.user?.elevated) {
    logAuditEvent({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'AUDIT_LOG_EXPORT_ELEVATION_REQUIRED',
      resourceType: 'audit_logs',
      details: { reason: 'Always requires elevation' },
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') || '',
      sessionId: req.user.session_id
    });

    return res.status(403).json({
      error: 'Audit log export requires re-authentication',
      action: 'require_elevation'
    });
  }

  const { days = 7, format = 'csv' } = req.query;

  try {
    // Fetch audit logs
    const logs = await db.prepare(`
      SELECT id, action, user_id, username, ip_address, created_at, details
      FROM audit_logs
      WHERE created_at > NOW() - INTERVAL '${parseInt(days)} days'
      ORDER BY created_at DESC
      LIMIT 10000
    `).all();

    logAuditEvent({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'AUDIT_LOG_EXPORT',
      resourceType: 'audit_logs',
      details: {
        days: parseInt(days),
        format,
        recordCount: logs.length
      },
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') || '',
      sessionId: req.user.session_id
    });

    // Format response
    if (format === 'json') {
      res.json({
        exportedAt: new Date().toISOString(),
        days: parseInt(days),
        recordCount: logs.length,
        logs
      });
    } else {
      // CSV format
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');

      const csv = [
        'Timestamp,User,Action,IP,Details'
      ].concat(
        logs.map(l =>
          `"${l.created_at}","${l.username}","${l.action}","${l.ip_address}","${(l.details || '').replace(/"/g, '""')}"`
        )
      ).join('\n');

      res.send(csv);
    }
  } catch (err) {
    console.error('[audit-export]', err);
    return res.status(500).json({ error: 'Export failed' });
  }
});

export default router;
