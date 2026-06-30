import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { CreatePatientSchema, UpdatePatientSchema } from '../schemas/patientSchema.js';
import { logAudit } from '../db/softDelete.js';
import { detectPatientConflicts } from '../utils/patientConflicts.js';
import { logPhiRead } from '../middleware/phiAudit.js';
import { validateResponse } from '../middleware/validateResponse.js';
import { PatientResponseSchema, PatientListResponseSchema } from '../schemas/responseSchemas.js';

/**
 * IDOR guard — verifies the requesting user has access to this patient.
 * Rules:
 *   - admin / front_desk  → can access any patient (global roles)
 *   - prescriber / nurse / therapist → must be the assigned provider OR share location
 *   - BTG-protected patients → require explicit BTG access grant (checked separately)
 */
async function requirePatientAccess(req, res, next) { const patientId = req.params.id || req.params.patientId;
  if (!patientId) return next();

  const patient = await db.prepare('SELECT id, assigned_provider, primary_location, is_btg FROM patients WHERE id = $1').get(patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const { role, id: userId, location_id } = req.user;
  const canSeeAll = ['admin', 'front_desk'].includes(role);

  if (canSeeAll) return next();

  // Scoped roles: must be assigned provider, same location, or patient is untagged (no location)
  const isAssignedProvider = patient.assigned_provider === userId;
  const untagged           = !patient.primary_location;
  const sameLocation       = location_id && patient.primary_location === location_id;

  if (!isAssignedProvider && !untagged && !sameLocation) { logAudit({
      actorId: userId, actorName: `${req.user.first_name } ${ req.user.last_name || '' }`.trim(),
      action: 'IDOR_BLOCKED', targetId: patientId, targetType: 'patient',
      details: { role, reason: 'Not assigned provider and not same location' },
      ip: req.ip,
    });
    return res.status(403).json({ error: 'Access denied — not your patient' });
  }

  next();
}

const router = Router();
router.use(authenticate);

function maskSSN(ssn) { if (!ssn || ssn.length < 4) return ssn ? '***-**-***' : '';
  return `***-**-${ssn.slice(-4) }`;
}

function formatPatient(row, opts = {}) { return {
    id: row.id, mrn: row.mrn, firstName: row.first_name, lastName: row.last_name, dob: row.dob, age: row.dob ? Math.floor((Date.now() - new Date(row.dob).getTime()) / 31557600000) : null, gender: row.gender, pronouns: row.pronouns, ssn: opts.fullSsn ? row.ssn : maskSSN(row.ssn), race: row.race, ethnicity: row.ethnicity, language: row.language, maritalStatus: row.marital_status, phone: row.phone, cellPhone: row.cell_phone, email: row.email, address: { street: row.address_street, city: row.address_city, state: row.address_state, zip: row.address_zip },
    emergencyContact: { name: row.emergency_contact_name, relationship: row.emergency_contact_relationship, phone: row.emergency_contact_phone },
    insurance: { primary: { name: row.insurance_primary_name, memberId: row.insurance_primary_member_id, groupNumber: row.insurance_primary_group_number, copay: row.insurance_primary_copay },
      secondary: row.insurance_secondary_name ? { name: row.insurance_secondary_name, memberId: row.insurance_secondary_member_id, groupNumber: row.insurance_secondary_group_number, copay: row.insurance_secondary_copay } : null,
    },
    pcp: row.pcp,
    assignedProvider: row.assigned_provider,
    preferredPharmacy: row.preferred_pharmacy || '',
    preferredPharmacyAddress: row.preferred_pharmacy_address || '',
    preferredPharmacyPhone: row.preferred_pharmacy_phone || '',
    preferredPharmacyFax: row.preferred_pharmacy_fax || '',
    photo: row.photo_url || row.photo || null,
    isBTG: !!row.is_btg,
    isActive: !!row.is_active,
    lastVisit: row.last_visit,
    nextAppointment: row.next_appointment,
    flags: (() => { try { const v = row.flags || '[]'; return JSON.parse(v); } catch { return []; } })(),
    locationId: row.primary_location || null,
    stickyNote: row.sticky_note || '',
  };
}

// GET /api/patients
router.get('/', validateResponse(PatientListResponseSchema), async (req, res) => { const { search, active, limit: limitParam, offset: offsetParam } = req.query;
  const limit = Math.min(parseInt(limitParam) || 100, 200); // cap at 200
  const offset = Math.max(parseInt(offsetParam) || 0, 0);

  const { clause: locClause, params: locParams } = req.access.locationClause('primary_location');

  let query = `SELECT * FROM patients WHERE 1=1${ locClause }`;
  const params = [...locParams];

  if (active !== undefined) { query += ' AND is_active = ?';
    params.push(active === 'true' ? true : false); }
  if (search) { query += ' AND (first_name LIKE ? OR last_name LIKE ? OR mrn LIKE ? OR email LIKE ?)';
    const s = `%${search }%`;
    params.push(s, s, s, s);
  }
  query += ' ORDER BY last_name, first_name LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = await db.prepare(query).all(...params);
  res.json(rows.map(row => formatPatient(row)));
});

// GET /api/patients/next-mrn — generate the next available MRN (preview, not reserved)
// Must be before /:id so Express doesn't treat "next-mrn" as a patient UUID.
router.get('/next-mrn', async (_req, res) => {
  const { cnt } = await db.prepare('SELECT COUNT(*) AS cnt FROM patients').get();
  const mrn = `MRN-${String(Number(cnt) + 1).padStart(5, '0')}`;
  res.json({ mrn });
});

// GET /api/patients/zip/:zip — city/state lookup via zippopotam.us (free, no key)
// Must be before /:id for the same reason.
router.get('/zip/:zip', async (req, res) => {
  const zip = req.params.zip?.replace(/\D/g, '').slice(0, 5);
  if (!zip || zip.length < 5) return res.status(400).json({ error: 'Invalid ZIP' });
  try {
    const r = await fetch(`https://api.zippopotam.us/us/${zip}`, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return res.status(404).json({ error: 'ZIP not found' });
    const data = await r.json();
    const place = data.places?.[0];
    res.json({ zip, city: place?.['place name'] || '', state: place?.['state abbreviation'] || '' });
  } catch {
    res.status(503).json({ error: 'ZIP lookup unavailable' });
  }
});

// GET /api/patients/:id — IDOR protected
router.get('/:id', requirePatientAccess, validateResponse(PatientResponseSchema), async (req, res) => {
  const row = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Patient not found' });
  logPhiRead(req, req.params.id, 'patient');
  const fullSsn = ['prescriber', 'billing'].includes(req.user?.role);
  res.json(formatPatient(row, { fullSsn }));
});

// POST /api/patients
router.post('/', authorize('prescriber', 'nurse', 'front_desk', 'admin'), validate(CreatePatientSchema), validateResponse(PatientResponseSchema), async (req, res) => { const b = req.body;
  const id = uuidv4();
  const countRow = await db.prepare('SELECT COUNT(*) as cnt FROM patients').get();
  const count = Number(countRow?.cnt ?? 0);
  const mrn = `MRN-${String(count + 1).padStart(5, '0') }-${ uuidv4().replace(/-/g, '').slice(0, 4).toUpperCase() }`;

  // Scope new patients to the creating user's facility unless a specific location is provided
  const primaryLocation = b.locationId || req.user.facility_id || null;

  // Duplicate chart prevention — skip if staff explicitly acknowledged the warning
  if (!b.forceCreate) {
    const conflict = await detectPatientConflicts({
      firstName: b.firstName, lastName: b.lastName, dob: b.dob,
      email: b.email || '',
      phone: b.phone || '', cellPhone: b.cellPhone || '',
      street: b.address?.street || '', zip: b.address?.zip || '',
      memberId: b.insurance?.primary?.memberId || '',
      insuranceName: b.insurance?.primary?.name || '',
      guardianName: b.emergencyContact?.name || '',
      guardianPhone: b.emergencyContact?.phone || '',
    });
    if (conflict.hasConflict) {
      return res.status(409).json({
        error: conflict.reason,  // becomes err.message on the client
        details: {               // becomes err.details on the client
          type: 'PATIENT_CONFLICT',
          conflicts: conflict.conflicts,
          matches: conflict.matches,
        },
      });
    }
  }

  await db.prepare(`INSERT INTO patients (id, mrn, first_name, last_name, dob, gender, pronouns, ssn, race, ethnicity, language, marital_status, phone, cell_phone, email, address_street, address_city, address_state, address_zip, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, insurance_primary_name, insurance_primary_member_id, insurance_primary_group_number, insurance_primary_copay, pcp, assigned_provider, is_btg, flags, primary_location, preferred_pharmacy, preferred_pharmacy_address, preferred_pharmacy_phone, preferred_pharmacy_fax) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, mrn, b.firstName, b.lastName, b.dob, b.gender, b.pronouns || '', b.ssn || '', b.race || '', b.ethnicity || '', b.language || 'English', b.maritalStatus || '', b.phone || '', b.cellPhone || '', b.email || '', b.address?.street || '', b.address?.city || '', b.address?.state || '', b.address?.zip || '', b.emergencyContact?.name || '', b.emergencyContact?.relationship || '', b.emergencyContact?.phone || '', b.insurance?.primary?.name || '', b.insurance?.primary?.memberId || '', b.insurance?.primary?.groupNumber || '', b.insurance?.primary?.copay || 0, b.pcp || '', b.assignedProvider || '', b.isBTG ? 1 : 0, JSON.stringify(b.flags || []), primaryLocation,
    b.preferredPharmacy || '', b.preferredPharmacyAddress || '', b.preferredPharmacyPhone || '', b.preferredPharmacyFax || ''
  );

  const row = await db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  res.status(201).json(formatPatient(row));
});

// PUT /api/patients/:id — IDOR protected
router.put('/:id', authorize('prescriber', 'nurse', 'front_desk'), requirePatientAccess, validate(UpdatePatientSchema), validateResponse(PatientResponseSchema), async (req, res) => { const existing = await db.prepare('SELECT * FROM patients WHERE id = $1').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Patient not found' });

  // Validate email format if provided
  const b = req.body;
  if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) { return res.status(400).json({ error: 'Invalid email address format' });
  }

  await db.prepare(`
    UPDATE patients SET
      first_name=$1, last_name=$2, dob=$3, gender=$4, pronouns=$5,
      race=$6, ethnicity=$7, language=$8, marital_status=$9,
      phone=$10, cell_phone=$11, email=$12,
      address_street=$13, address_city=$14, address_state=$15, address_zip=$16,
      emergency_contact_name=$17, emergency_contact_relationship=$18, emergency_contact_phone=$19,
      insurance_primary_name=$20, insurance_primary_member_id=$21,
      insurance_primary_group_number=$22, insurance_primary_copay=$23,
      insurance_secondary_name=$24, insurance_secondary_member_id=$25,
      insurance_secondary_group_number=$26, insurance_secondary_copay=$27,
      pcp=$28, assigned_provider=$29, is_btg=$30, flags=$31,
      preferred_pharmacy=$32, preferred_pharmacy_address=$33,
      preferred_pharmacy_phone=$34, preferred_pharmacy_fax=$35,
      updated_at=NOW()
    WHERE id=$36
  `).run(
    b.firstName ?? existing.first_name,
    b.lastName ?? existing.last_name,
    b.dob ?? existing.dob,
    b.gender ?? existing.gender,
    b.pronouns ?? existing.pronouns,
    b.race ?? existing.race,
    b.ethnicity ?? existing.ethnicity,
    b.language ?? existing.language,
    b.maritalStatus ?? existing.marital_status,
    b.phone ?? existing.phone,
    b.cellPhone ?? existing.cell_phone,
    b.email ?? existing.email,
    b.address?.street ?? existing.address_street,
    b.address?.city ?? existing.address_city,
    b.address?.state ?? existing.address_state,
    b.address?.zip ?? existing.address_zip,
    b.emergencyContact?.name ?? existing.emergency_contact_name,
    b.emergencyContact?.relationship ?? existing.emergency_contact_relationship,
    b.emergencyContact?.phone ?? existing.emergency_contact_phone,
    b.insurance?.primary?.name ?? existing.insurance_primary_name,
    b.insurance?.primary?.memberId ?? existing.insurance_primary_member_id,
    b.insurance?.primary?.groupNumber ?? existing.insurance_primary_group_number,
    b.insurance?.primary?.copay ?? existing.insurance_primary_copay,
    b.insurance?.secondary?.name ?? existing.insurance_secondary_name,
    b.insurance?.secondary?.memberId ?? existing.insurance_secondary_member_id,
    b.insurance?.secondary?.groupNumber ?? existing.insurance_secondary_group_number,
    b.insurance?.secondary?.copay ?? existing.insurance_secondary_copay,
    b.pcp ?? existing.pcp,
    b.assignedProvider ?? existing.assigned_provider,
    b.isBTG !== undefined ? (b.isBTG ? 1 : 0) : existing.is_btg,
    b.flags ? JSON.stringify(b.flags) : existing.flags,
    b.preferredPharmacy ?? existing.preferred_pharmacy ?? '',
    b.preferredPharmacyAddress ?? existing.preferred_pharmacy_address ?? '',
    b.preferredPharmacyPhone ?? existing.preferred_pharmacy_phone ?? '',
    b.preferredPharmacyFax ?? existing.preferred_pharmacy_fax ?? '',
    req.params.id
  );

  const row = await db.prepare('SELECT * FROM patients WHERE id = $1').get(req.params.id);
  res.json(formatPatient(row));
});

// PATCH /api/patients/:id/photo — save or remove patient photo URL
router.patch('/:id/photo', authenticate, requirePatientAccess, async (req, res) => { const { photoUrl } = req.body;
  // photoUrl can be a data URL (base64) or null to remove
  if (photoUrl !== null && typeof photoUrl !== 'string') { return res.status(400).json({ error: 'photoUrl must be a string or null' });
  }

  await db.prepare(
    `UPDATE patients SET photo_url = $1, updated_at = NOW() WHERE id = $2`
  ).run(photoUrl || null, req.params.id);

  await logAudit({ actorId: req.user.id, actorName: `${req.user.first_name } ${ req.user.last_name || '' }`.trim(),
    action: photoUrl ? 'PATIENT_PHOTO_UPDATED' : 'PATIENT_PHOTO_REMOVED',
    targetId: req.params.id, targetType: 'patient',
    details: {},
    ip: req.ip || '',
  });

  res.json({ ok: true });
});

// PATCH /api/patients/:id/sticky-note — save or clear sticky note
router.patch('/:id/sticky-note', authenticate, requirePatientAccess, async (req, res) => { const { note } = req.body;
  if (typeof note !== 'string') return res.status(400).json({ error: 'note must be a string' });
  if (note.length > 5000) return res.status(400).json({ error: 'Note too long (max 5000 chars)' });

  await db.prepare(
    `UPDATE patients SET sticky_note = $1, updated_at = NOW() WHERE id = $2`
  ).run(note.trim(), req.params.id);

  await logAudit({ actorId: req.user.id, actorName: `${req.user.first_name } ${ req.user.last_name || '' }`.trim(),
    action: note.trim() ? 'STICKY_NOTE_UPDATED' : 'STICKY_NOTE_CLEARED',
    targetId: req.params.id, targetType: 'patient',
    details: { note: note.trim().slice(0, 80) },
    ip: req.ip || '',
  });

  res.json({ ok: true, note: note.trim() });
});

export default router;
