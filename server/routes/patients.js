import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

function maskSSN(ssn) {
  if (!ssn || ssn.length < 4) return ssn ? '***-**-***' : '';
  return `***-**-${ssn.slice(-4)}`;
}

function formatPatient(row, opts = {}) {
  return {
    id: row.id,
    mrn: row.mrn,
    firstName: row.first_name,
    lastName: row.last_name,
    dob: row.dob,
    age: row.dob ? Math.floor((Date.now() - new Date(row.dob).getTime()) / 31557600000) : null,
    gender: row.gender,
    pronouns: row.pronouns,
    ssn: opts.fullSsn ? row.ssn : maskSSN(row.ssn),
    race: row.race,
    ethnicity: row.ethnicity,
    language: row.language,
    maritalStatus: row.marital_status,
    phone: row.phone,
    cellPhone: row.cell_phone,
    email: row.email,
    address: { street: row.address_street, city: row.address_city, state: row.address_state, zip: row.address_zip },
    emergencyContact: { name: row.emergency_contact_name, relationship: row.emergency_contact_relationship, phone: row.emergency_contact_phone },
    insurance: {
      primary: { name: row.insurance_primary_name, memberId: row.insurance_primary_member_id, groupNumber: row.insurance_primary_group_number, copay: row.insurance_primary_copay },
      secondary: row.insurance_secondary_name ? { name: row.insurance_secondary_name, memberId: row.insurance_secondary_member_id, groupNumber: row.insurance_secondary_group_number, copay: row.insurance_secondary_copay } : null,
    },
    pcp: row.pcp,
    assignedProvider: row.assigned_provider,
    photo: row.photo,
    isBTG: !!row.is_btg,
    isActive: !!row.is_active,
    lastVisit: row.last_visit,
    nextAppointment: row.next_appointment,
    flags: JSON.parse(row.flags || '[]'),
    locationId: row.primary_location || null,
  };
}

// GET /api/patients
router.get('/', async (req, res) => {
  const { search, active, limit: limitParam, offset: offsetParam } = req.query;
  const limit = Math.min(parseInt(limitParam) || 100, 200); // cap at 200
  const offset = Math.max(parseInt(offsetParam) || 0, 0);

  const { clause: locClause, params: locParams } = req.access.locationClause('primary_location');

  let query = `SELECT * FROM patients WHERE 1=1${locClause}`;
  const params = [...locParams];

  if (active !== undefined) {
    query += ' AND is_active = ?';
    params.push(active === 'true' ? 1 : 0);
  }
  if (search) {
    query += ' AND (first_name LIKE ? OR last_name LIKE ? OR mrn LIKE ? OR email LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  query += ' ORDER BY last_name, first_name LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = await db.prepare(query).all(...params);
  res.json(rows.map(row => formatPatient(row)));
});

// GET /api/patients/:id
router.get('/:id', async (req, res) => {
  const row = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Patient not found' });
  const fullSsn = ['prescriber', 'billing'].includes(req.user?.role);
  res.json(formatPatient(row, { fullSsn }));
});

// POST /api/patients
router.post('/', authorize('prescriber', 'nurse', 'front_desk'), async (req, res) => {
  const b = req.body;
  const id = uuidv4();
  const count = await db.prepare('SELECT COUNT(*) as cnt FROM patients').get().cnt;
  const mrn = `MRN-${String(count + 1).padStart(5, '0')}-${uuidv4().replace(/-/g,'').slice(0,4).toUpperCase()}`;

  await db.prepare(`INSERT INTO patients (id, mrn, first_name, last_name, dob, gender, pronouns, ssn, race, ethnicity, language, marital_status, phone, cell_phone, email, address_street, address_city, address_state, address_zip, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, insurance_primary_name, insurance_primary_member_id, insurance_primary_group_number, insurance_primary_copay, pcp, assigned_provider, is_btg, flags) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, mrn, b.firstName, b.lastName, b.dob, b.gender, b.pronouns || '', b.ssn || '', b.race || '', b.ethnicity || '', b.language || 'English', b.maritalStatus || '', b.phone || '', b.cellPhone || '', b.email || '', b.address?.street || '', b.address?.city || '', b.address?.state || '', b.address?.zip || '', b.emergencyContact?.name || '', b.emergencyContact?.relationship || '', b.emergencyContact?.phone || '', b.insurance?.primary?.name || '', b.insurance?.primary?.memberId || '', b.insurance?.primary?.groupNumber || '', b.insurance?.primary?.copay || 0, b.pcp || '', b.assignedProvider || '', b.isBTG ? 1 : 0, JSON.stringify(b.flags || [])
  );

  const row = await db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  res.status(201).json(formatPatient(row));
});

// PUT /api/patients/:id
router.put('/:id', authorize('prescriber', 'nurse', 'front_desk'), async (req, res) => {
  const existing = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Patient not found' });

  const b = req.body;
  await db.prepare(`UPDATE patients SET first_name=?, last_name=?, dob=?, gender=?, pronouns=?, race=?, ethnicity=?, language=?, marital_status=?, phone=?, cell_phone=?, email=?, address_street=?, address_city=?, address_state=?, address_zip=?, emergency_contact_name=?, emergency_contact_relationship=?, emergency_contact_phone=?, insurance_primary_name=?, insurance_primary_member_id=?, insurance_primary_group_number=?, insurance_primary_copay=?, insurance_secondary_name=?, insurance_secondary_member_id=?, insurance_secondary_group_number=?, insurance_secondary_copay=?, pcp=?, assigned_provider=?, is_btg=?, flags=?, updated_at=datetime('now') WHERE id=?`).run(
    b.firstName ?? existing.first_name, b.lastName ?? existing.last_name, b.dob ?? existing.dob, b.gender ?? existing.gender, b.pronouns ?? existing.pronouns, b.race ?? existing.race, b.ethnicity ?? existing.ethnicity, b.language ?? existing.language, b.maritalStatus ?? existing.marital_status, b.phone ?? existing.phone, b.cellPhone ?? existing.cell_phone, b.email ?? existing.email, b.address?.street ?? existing.address_street, b.address?.city ?? existing.address_city, b.address?.state ?? existing.address_state, b.address?.zip ?? existing.address_zip, b.emergencyContact?.name ?? existing.emergency_contact_name, b.emergencyContact?.relationship ?? existing.emergency_contact_relationship, b.emergencyContact?.phone ?? existing.emergency_contact_phone, b.insurance?.primary?.name ?? existing.insurance_primary_name, b.insurance?.primary?.memberId ?? existing.insurance_primary_member_id, b.insurance?.primary?.groupNumber ?? existing.insurance_primary_group_number, b.insurance?.primary?.copay ?? existing.insurance_primary_copay, b.insurance?.secondary?.name ?? existing.insurance_secondary_name, b.insurance?.secondary?.memberId ?? existing.insurance_secondary_member_id, b.insurance?.secondary?.groupNumber ?? existing.insurance_secondary_group_number, b.insurance?.secondary?.copay ?? existing.insurance_secondary_copay, b.pcp ?? existing.pcp, b.assignedProvider ?? existing.assigned_provider, b.isBTG !== undefined ? (b.isBTG ? 1 : 0) : existing.is_btg, b.flags ? JSON.stringify(b.flags) : existing.flags, req.params.id
  );

  const row = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  res.json(formatPatient(row));
});

export default router;
