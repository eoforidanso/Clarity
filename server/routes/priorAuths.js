import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { routeError } from '../utils/routeError.js';
import { logAuditEvent } from '../utils/auditLogger.js';

const router = Router();
router.use(authenticate);

function scopeClause(req) {
  const { isGlobal, facility_id } = req.user;
  if (isGlobal) return { clause: '', params: [] };
  if (facility_id) return { clause: ' AND location_id = ?', params: [facility_id] };
  return { clause: '', params: [] };
}

function formatAuth(r) {
  return {
    id:             r.id,
    patientId:      r.patient_id,
    patientName:    r.patient_name,
    insurance:      r.insurance,
    memberId:       r.member_id,
    serviceType:    r.service_type,
    medication:     r.medication,
    cptCode:        r.cpt_code,
    icdCodes:       r.icd_codes || [],
    requestedUnits: r.requested_units,
    approvedUnits:  r.approved_units,
    provider:       r.provider,
    status:         r.status,
    authNumber:     r.auth_number,
    submitDate:     r.submit_date,
    reviewDate:     r.review_date,
    effectiveDate:  r.effective_date,
    expirationDate: r.expiration_date,
    turnaroundDays: r.turnaround_days,
    notes:          r.notes,
    urgency:        r.urgency,
    denialReason:   r.denial_reason,
    createdAt:      r.created_at,
    updatedAt:      r.updated_at,
  };
}

// GET /api/prior-auths
router.get('/', async (req, res) => {
  try {
    const { clause, params } = scopeClause(req);
    const { patientId, status } = req.query;
    let sql = 'SELECT * FROM prior_authorizations WHERE 1=1' + clause;
    const args = [...params];
    if (patientId) { sql += ' AND patient_id = ?'; args.push(patientId); }
    if (status && status !== 'All') { sql += ' AND status = ?'; args.push(status); }
    sql += ' ORDER BY updated_at DESC';
    const rows = await db.prepare(sql).all(...args);
    res.json(rows.map(formatAuth));
  } catch (err) {
    routeError(req, '[prior-auths] GET', err);
    res.status(500).json({ error: 'Failed to load prior authorizations' });
  }
});

// POST /api/prior-auths
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    const { clause, params } = scopeClause(req);
    const locationId = params[0] || null;
    const id = uuidv4();
    await db.prepare(`
      INSERT INTO prior_authorizations
        (id, patient_id, patient_name, location_id, insurance, member_id, service_type, medication,
         cpt_code, icd_codes, requested_units, approved_units, provider, status, auth_number,
         submit_date, review_date, effective_date, expiration_date, turnaround_days, notes, urgency, denial_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, b.patientId || '', b.patientName || '', locationId,
      b.insurance || '', b.memberId || '', b.serviceType || '', b.medication || '',
      b.cptCode || '', JSON.stringify(b.icdCodes || []),
      b.requestedUnits ?? 1, b.approvedUnits ?? 0,
      b.provider || '', b.status || 'Pending Submission', b.authNumber || '',
      b.submitDate || null, b.reviewDate || null, b.effectiveDate || null, b.expirationDate || null,
      b.turnaroundDays ?? null, b.notes || '', b.urgency || 'Standard', b.denialReason || ''
    );
    logAuditEvent({ userId: req.user.id, userName: req.user.username, userRole: req.user.role, action: 'PRIOR_AUTH_CREATE', resourceType: 'prior_authorization', resourceId: id, ipAddress: req.ip || '', userAgent: req.get('User-Agent') || '', sessionId: req.user.session_id });
    const row = await db.prepare('SELECT * FROM prior_authorizations WHERE id = ?').get(id);
    res.status(201).json(formatAuth(row));
  } catch (err) {
    routeError(req, '[prior-auths] POST', err);
    res.status(500).json({ error: 'Failed to create prior authorization' });
  }
});

// PUT /api/prior-auths/:id
router.put('/:id', async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM prior_authorizations WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Prior authorization not found' });
    const b = req.body;
    await db.prepare(`
      UPDATE prior_authorizations SET
        status = ?, auth_number = ?, review_date = ?, effective_date = ?, expiration_date = ?,
        approved_units = ?, turnaround_days = ?, notes = ?, denial_reason = ?, updated_at = NOW()
      WHERE id = ?
    `).run(
      b.status ?? existing.status,
      b.authNumber ?? existing.auth_number,
      b.reviewDate ?? existing.review_date,
      b.effectiveDate ?? existing.effective_date,
      b.expirationDate ?? existing.expiration_date,
      b.approvedUnits ?? existing.approved_units,
      b.turnaroundDays ?? existing.turnaround_days,
      b.notes ?? existing.notes,
      b.denialReason ?? existing.denial_reason,
      req.params.id
    );
    logAuditEvent({ userId: req.user.id, userName: req.user.username, userRole: req.user.role, action: 'PRIOR_AUTH_UPDATE', resourceType: 'prior_authorization', resourceId: req.params.id, ipAddress: req.ip || '', userAgent: req.get('User-Agent') || '', sessionId: req.user.session_id });
    const row = await db.prepare('SELECT * FROM prior_authorizations WHERE id = ?').get(req.params.id);
    res.json(formatAuth(row));
  } catch (err) {
    routeError(req, '[prior-auths] PUT', err);
    res.status(500).json({ error: 'Failed to update prior authorization' });
  }
});

// DELETE /api/prior-auths/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.prepare('SELECT id FROM prior_authorizations WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Prior authorization not found' });
    await db.prepare('DELETE FROM prior_authorizations WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    routeError(req, '[prior-auths] DELETE', err);
    res.status(500).json({ error: 'Failed to delete prior authorization' });
  }
});

export default router;
