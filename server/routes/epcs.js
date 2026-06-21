/**
 * EPCS & BTG Routes
 * Electronic Prescription for Controlled Substances
 * Behind The Glass emergency prescribing
 *
 * All EPCS operations require elevation (short-lived token from /reauth)
 * BTG operations require elevation + documented justification
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, requireElevated } from '../middleware/auth.js';
import { requireEpcsElevation, requireBtgElevation, checkEpcsAuthorization, checkBtgAuthorization, raiseBtgRisk } from '../middleware/epcs.js';
import { logAuditEvent } from '../middleware/auditLog.js';
import db from '../db/database.js';
import { validate } from '../middleware/validate.js';
import { EpcsSendSchema, EpcsBtgSchema } from '../schemas/epcsSchema.js';
import { validateResponse } from '../middleware/validateResponse.js';
import { AnyResponseSchema } from '../schemas/responseSchemas.js';

const router = Router();
router.use(validateResponse(AnyResponseSchema));

/**
 * POST /api/epcs/send — transmit controlled substance prescription
 *
 * Requires: elevation (5-min timeout), EPCS capability
 * Body: { patientId, drugId, quantity, daysSupply, dispenseAsWritten, ... }
 */
router.post('/send', authenticate, requireEpcsElevation, validate(EpcsSendSchema), async (req, res) => {
  const { patientId, drugId, quantity, daysSupply } = req.body;

  // Validate inputs
  if (!patientId || !drugId || !quantity) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check authorization
  const epcsAuth = await checkEpcsAuthorization(db, req.user.id);
  if (!epcsAuth.authorized) {
    logAuditEvent({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'EPCS_UNAUTHORIZED',
      resourceType: 'epcs',
      resourceId: patientId,
      details: { reason: epcsAuth.reason },
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') || '',
      sessionId: req.user.session_id
    });

    return res.status(403).json({
      error: 'Not authorized for EPCS',
      reason: epcsAuth.reason
    });
  }

  try {
    const b = req.body;
    const transmissionId = uuidv4();
    const providerName = [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || req.user.username;
    const deaConfirmId = `DEA-${Date.now()}-${transmissionId.slice(0, 8).toUpperCase()}`;

    // Store transmission record in DB
    await db.prepare(`
      INSERT INTO epcs_transmissions
        (id, patient_id, drug_id, drug_name, quantity, days_supply, refills, sig,
         pharmacy_npi, pharmacy_name, provider_id, provider_name, dea_number,
         status, dea_confirmation_id, transmitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'transmitted', ?, NOW())
    `).run(
      transmissionId,
      b.patientId,
      b.drugId || '',
      b.drugName || b.drugId || '',
      b.quantity || 0,
      b.daysSupply || 0,
      b.refills || 0,
      b.sig || '',
      b.pharmacyNpi || '',
      b.pharmacyName || '',
      req.user.id,
      providerName,
      req.user.deaNumber || '',
      deaConfirmId
    );

    logAuditEvent({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'EPCS_SENT',
      resourceType: 'epcs',
      resourceId: b.patientId,
      details: { transmissionId, drugId: b.drugId, quantity: b.quantity, daysSupply: b.daysSupply, deaConfirmId },
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') || '',
      sessionId: req.user.session_id
    });

    await raiseBtgRisk(db, req.user.session_id);

    res.json({
      success: true,
      prescriptionId: transmissionId,
      deaConfirmationId: deaConfirmId,
      status: 'transmitted',
      transmittedAt: new Date().toISOString(),
      message: 'EPCS prescription transmitted',
      riskScore: 'Elevated for next 30 minutes — re-auth required for next sensitive operation'
    });
  } catch (err) {
    console.error('[epcs/send]', err);
    return res.status(500).json({ error: 'EPCS transmission failed' });
  }
});

/**
 * POST /api/epcs/status — check DEA transmission status
 * Requires: elevation
 */
router.get('/status/:prescriptionId', authenticate, requireEpcsElevation, async (req, res) => {
  const { prescriptionId } = req.params;

  try {
    const tx = await db.prepare(`
      SELECT t.*, p.first_name, p.last_name, p.mrn
      FROM epcs_transmissions t
      LEFT JOIN patients p ON p.id = t.patient_id
      WHERE t.id = ?
    `).get(prescriptionId);

    if (!tx) {
      return res.status(404).json({ error: 'Prescription transmission not found' });
    }

    logAuditEvent({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'EPCS_STATUS_CHECK',
      resourceType: 'epcs',
      resourceId: prescriptionId,
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') || '',
      sessionId: req.user.session_id
    });

    res.json({
      prescriptionId: tx.id,
      status: tx.status,
      deaConfirmationId: tx.dea_confirmation_id,
      patientId: tx.patient_id,
      patientName: tx.first_name ? `${tx.first_name} ${tx.last_name}` : '',
      mrn: tx.mrn || '',
      drugName: tx.drug_name,
      quantity: tx.quantity,
      daysSupply: tx.days_supply,
      pharmacyName: tx.pharmacy_name,
      providerName: tx.provider_name,
      transmittedAt: tx.transmitted_at,
      acknowledgedAt: tx.acknowledged_at || null,
      dispensedAt: tx.dispensed_at || null,
      cancelledAt: tx.cancelled_at || null,
    });
  } catch (err) {
    console.error('[epcs/status]', err);
    return res.status(500).json({ error: 'Status check failed' });
  }
});

/**
 * PUT /api/epcs/status/:prescriptionId — update transmission status
 * Called by pharmacy webhook or manual admin update
 */
router.put('/status/:prescriptionId', authenticate, async (req, res) => {
  const { prescriptionId } = req.params;
  const { status } = req.body;
  const validStatuses = ['transmitted', 'acknowledged', 'dispensed', 'cancelled', 'error'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const tx = await db.prepare('SELECT id FROM epcs_transmissions WHERE id = ?').get(prescriptionId);
    if (!tx) return res.status(404).json({ error: 'Prescription transmission not found' });

    const tsCol = { acknowledged: 'acknowledged_at', dispensed: 'dispensed_at', cancelled: 'cancelled_at' }[status];
    const tsUpdate = tsCol ? `, ${tsCol} = NOW()` : '';
    await db.prepare(`UPDATE epcs_transmissions SET status = ?${tsUpdate} WHERE id = ?`).run(status, prescriptionId);

    logAuditEvent({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'EPCS_STATUS_UPDATE',
      resourceType: 'epcs',
      resourceId: prescriptionId,
      details: { status },
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') || '',
      sessionId: req.user.session_id
    });

    const updated = await db.prepare('SELECT * FROM epcs_transmissions WHERE id = ?').get(prescriptionId);
    res.json({ ok: true, prescriptionId, status: updated.status });
  } catch (err) {
    console.error('[epcs/status/update]', err);
    return res.status(500).json({ error: 'Status update failed' });
  }
});

/**
 * POST /api/prescriptions/btg — Behind The Glass emergency prescribing
 *
 * Requires: elevation + documented justification
 * Body: {
 *   patientId,
 *   drugId,
 *   quantity,
 *   justification: "Patient in ER, normal pharmacy closed, immediate need"
 * }
 */
router.post('/btg', authenticate, requireBtgElevation, validate(EpcsBtgSchema), async (req, res) => {
  const { patientId, drugId, quantity } = req.body;
  const justification = req.btgJustification;

  // Validate inputs
  if (!patientId || !drugId || !quantity) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check BTG authorization
  const btgAuth = await checkBtgAuthorization(db, req.user.id);
  if (!btgAuth.authorized) {
    logAuditEvent({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'BTG_UNAUTHORIZED',
      resourceType: 'btg',
      resourceId: patientId,
      details: { reason: btgAuth.reason },
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') || '',
      sessionId: req.user.session_id
    });

    return res.status(403).json({
      error: 'Not authorized for BTG',
      reason: btgAuth.reason
    });
  }

  try {
    // Record BTG prescription with justification
    logAuditEvent({
      userId: req.user.id,
      userName: req.user.username,
      userRole: req.user.role,
      action: 'BTG_PRESCRIBED',
      resourceType: 'btg',
      resourceId: patientId,
      details: {
        drugId,
        quantity,
        justification,
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip || '',
      userAgent: req.get('User-Agent') || '',
      sessionId: req.user.session_id
    });

    // Raise risk score significantly after BTG
    await raiseBtgRisk(db, req.user.session_id);

    res.json({
      success: true,
      message: 'BTG prescription issued',
      warning: 'This operation has been logged and will be audited',
      riskScore: 'Critical — re-auth required immediately'
    });
  } catch (err) {
    console.error('[btg/prescribe]', err);
    return res.status(500).json({ error: 'BTG prescription failed' });
  }
});

export default router;
