import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { db } from '../db/database.js';
import { RefillService } from '../services/RefillService.js';
import { PharmacyEmailService } from '../services/PharmacyEmailService.js';
import { SMSService } from '../services/SMSService.js';
import { InsuranceEligibilityService } from '../services/InsuranceEligibilityService.js';
import { routeError } from '../utils/routeError.js';
import { validate } from '../middleware/validate.js';
import { CreateRefillSchema, SendToPharmacySchema, ResendNotificationSchema } from '../schemas/refillSchema.js';
import { validateResponse } from '../middleware/validateResponse.js';
import { AnyResponseSchema } from '../schemas/responseSchemas.js';

const router = express.Router();

// Middleware
router.use(authenticate);
router.use(validateResponse(AnyResponseSchema));

// Create refill
router.post('/', validate(CreateRefillSchema), async (req, res) => {
  try {
    const { patientId, medicationId, medicationName, dose, frequency } = req.body;

    if (!patientId || !medicationName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const refillId = await RefillService.createRefill(
      patientId,
      medicationId,
      medicationName,
      dose,
      frequency,
      req.user.id
    );

    res.json({ refillId, status: 'pending' });
  } catch (error) {
    routeError(req, '[Refills] Create error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all refills (no status filter) — used by RefillQueue page
router.get('/', async (req, res) => {
  try {
    const { limit = 200, offset = 0 } = req.query;
    const rows = await db.prepare(`
      SELECT r.*,
        p.first_name, p.last_name, p.date_of_birth,
        u.first_name AS creator_first, u.last_name AS creator_last
      FROM refills r
      JOIN patients p ON r.patient_id = p.id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.deleted_at IS NULL
      ORDER BY
        CASE r.status WHEN 'pending' THEN 0 WHEN 'queued' THEN 1 ELSE 2 END,
        r.days_remaining ASC NULLS LAST,
        r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const refills = rows.map(r => ({
      id:               r.id,
      patientId:        r.patient_id,
      patientName:      `${r.first_name || ''} ${r.last_name || ''}`.trim(),
      medicationId:     r.medication_id     || '',
      medicationName:   r.medication_name,
      dose:             r.dose              || '',
      frequency:        r.frequency         || '',
      refillsRemaining: r.refills_remaining ?? 0,
      daysRemaining:    r.days_remaining    ?? 0,
      pharmacy:         r.pharmacy_name     || '',
      pharmacyAddress:  r.pharmacy_address  || '',
      pharmacyPhone:    r.pharmacy_phone    || '',
      pharmacyFax:      r.pharmacy_fax      || '',
      status:           r.status,
      priority:         r.priority,
      createdBy:        r.creator_first
        ? `${r.creator_first} ${r.creator_last || ''}`.trim()
        : (r.created_by || ''),
      createdAt:        r.created_at,
      queuedAt:         r.queued_at         || null,
      sentAt:           r.sent_at           || null,
      filledAt:         r.filled_at         || null,
      notes:            r.notes             || '',
      copayAmount:      r.copay_amount      != null ? parseFloat(r.copay_amount) : null,
    }));

    res.json(refills);
  } catch (error) {
    routeError(req, '[Refills] GET all error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get refill statistics — must come before /:id to avoid path conflict
router.get('/admin/stats', async (req, res) => {
  try {
    const stats = await RefillService.getStats();
    res.json(stats);
  } catch (error) {
    routeError(req, '[Refills] Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get refills by status
router.get('/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const refills = await RefillService.getRefillsByStatus(status, limit, offset);
    res.json(refills);
  } catch (error) {
    routeError(req, '[Refills] Get status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single refill
router.get('/:id', async (req, res) => {
  try {
    const refill = await RefillService.getRefill(req.params.id);

    if (!refill) {
      return res.status(404).json({ error: 'Refill not found' });
    }

    res.json(refill);
  } catch (error) {
    routeError(req, '[Refills] Get error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get refills for patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const refills = await RefillService.getPatientRefills(req.params.patientId);
    res.json(refills);
  } catch (error) {
    routeError(req, '[Refills] Get patient error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update refill status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, metadata } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    await RefillService.updateStatus(id, status, metadata);
    res.json({ success: true, status });
  } catch (error) {
    routeError(req, '[Refills] Update status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify insurance eligibility
router.post('/:id/verify-insurance', async (req, res) => {
  try {
    const refill = await RefillService.getRefill(req.params.id);

    if (!refill) {
      return res.status(404).json({ error: 'Refill not found' });
    }

    const eligibility = await InsuranceEligibilityService.checkRefillEligibility(req.params.id);

    // Update refill copay
    if (eligibility.copayAmount) {
      await RefillService.updateStatus(req.params.id, refill.status, {
        copayAmount: eligibility.copayAmount,
      });
    }

    res.json({
      eligible: eligibility.eligible,
      copayAmount: eligibility.copayAmount,
      coverageType: eligibility.coverageType,
      deductible: eligibility.deductible,
      cached: eligibility.cached,
    });
  } catch (error) {
    routeError(req, '[Refills] Verify insurance error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send refill to pharmacy
router.post('/:id/send-to-pharmacy', validate(SendToPharmacySchema), async (req, res) => {
  try {
    const { pharmacyEmail, pharmacyName, verifyInsurance = false } = req.body;
    const refill = await RefillService.getRefill(req.params.id);

    if (!refill) {
      return res.status(404).json({ error: 'Refill not found' });
    }

    // Optional: verify insurance first
    if (verifyInsurance) {
      await InsuranceEligibilityService.checkRefillEligibility(req.params.id);
    }

    // Send email to pharmacy
    const emailResult = await PharmacyEmailService.sendRefillRequest({
      refillId: req.params.id,
      pharmacyEmail,
      pharmacyName,
      patientName: `${refill.first_name} ${refill.last_name}`,
      patientDOB: refill.date_of_birth,
      medicationName: refill.medication_name,
      dose: refill.dose,
      frequency: refill.frequency,
      refillCount: refill.refills_remaining,
      priority: refill.priority,
      notes: refill.notes,
    });

    // Optional: send SMS to patient (if phone provided)
    let smsResult = null;
    if (refill.phone) {
      try {
        smsResult = await SMSService.sendPatientRefillReady({
          refillId: req.params.id,
          patientPhone: refill.phone,
          patientName: `${refill.first_name} ${refill.last_name}`,
          medicationName: refill.medication_name,
          pharmacyName,
        });
      } catch (smsError) {
        routeError(req, '[Refills] SMS failed, continuing', smsError);
        // Don't fail the whole request if SMS fails
      }
    }

    // Update refill status to sent
    await RefillService.updateStatus(req.params.id, 'sent', {
      sentVia: 'email',
      pharmacyEmail,
    });

    res.json({
      success: true,
      email: emailResult,
      sms: smsResult,
    });
  } catch (error) {
    routeError(req, '[Refills] Send to pharmacy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get refill notifications
router.get('/:id/notifications', async (req, res) => {
  try {
    const refill = await RefillService.getRefill(req.params.id);

    if (!refill) {
      return res.status(404).json({ error: 'Refill not found' });
    }

    res.json(refill.notifications || []);
  } catch (error) {
    routeError(req, '[Refills] Get notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get refill audit trail
router.get('/:id/audit-trail', async (req, res) => {
  try {
    const trail = await RefillService.getAuditTrail(req.params.id);
    res.json(trail);
  } catch (error) {
    routeError(req, '[Refills] Get audit trail error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resend failed notification
router.post('/:id/resend-notification', validate(ResendNotificationSchema), async (req, res) => {
  try {
    const { type } = req.body;
    const refill = await RefillService.getRefill(req.params.id);

    if (!refill) {
      return res.status(404).json({ error: 'Refill not found' });
    }

    let result;

    if (type === 'email') {
      result = await PharmacyEmailService.retrySendEmail(
        req.params.id,
        refill.pharmacy_email
      );
    } else if (type === 'sms') {
      result = await SMSService.retrySendSMS(req.params.id, refill.phone);
    } else {
      return res.status(400).json({ error: 'Invalid notification type' });
    }

    res.json({ success: true, result });
  } catch (error) {
    routeError(req, '[Refills] Resend notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update pharmacy fields on a refill
router.patch('/:id/pharmacy', async (req, res) => {
  try {
    const { pharmacy, pharmacyAddress, pharmacyPhone, pharmacyFax } = req.body;
    await db.prepare(`
      UPDATE refills
      SET pharmacy_name    = ?,
          pharmacy_address = ?,
          pharmacy_phone   = ?,
          pharmacy_fax     = ?,
          updated_at       = NOW()
      WHERE id = ? AND deleted_at IS NULL
    `).run(
      pharmacy        || '',
      pharmacyAddress || '',
      pharmacyPhone   || '',
      pharmacyFax     || '',
      req.params.id,
    );
    res.json({ ok: true });
  } catch (error) {
    routeError(req, '[Refills] PATCH pharmacy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Soft delete refill
router.delete('/:id', async (req, res) => {
  try {
    await RefillService.deleteRefill(req.params.id);
    res.json({ success: true });
  } catch (error) {
    routeError(req, '[Refills] Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
