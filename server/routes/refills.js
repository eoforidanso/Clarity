import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { RefillService } from '../services/RefillService.js';
import { PharmacyEmailService } from '../services/PharmacyEmailService.js';
import { SMSService } from '../services/SMSService.js';
import { InsuranceEligibilityService } from '../services/InsuranceEligibilityService.js';

const router = express.Router();

// Middleware
router.use(authenticate);

// Create refill
router.post('/', async (req, res) => {
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
    console.error('[Refills] Create error:', error);
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
    console.error('[Refills] Get status error:', error);
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
    console.error('[Refills] Get error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get refills for patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const refills = await RefillService.getPatientRefills(req.params.patientId);
    res.json(refills);
  } catch (error) {
    console.error('[Refills] Get patient error:', error);
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
    console.error('[Refills] Update status error:', error);
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
    console.error('[Refills] Verify insurance error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send refill to pharmacy
router.post('/:id/send-to-pharmacy', async (req, res) => {
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
        console.warn('[Refills] SMS failed, continuing:', smsError.message);
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
    console.error('[Refills] Send to pharmacy error:', error);
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
    console.error('[Refills] Get notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get refill audit trail
router.get('/:id/audit-trail', async (req, res) => {
  try {
    const trail = await RefillService.getAuditTrail(req.params.id);
    res.json(trail);
  } catch (error) {
    console.error('[Refills] Get audit trail error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resend failed notification
router.post('/:id/resend-notification', async (req, res) => {
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
    console.error('[Refills] Resend notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get refill statistics
router.get('/admin/stats', async (req, res) => {
  try {
    const stats = await RefillService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('[Refills] Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Soft delete refill
router.delete('/:id', async (req, res) => {
  try {
    await RefillService.deleteRefill(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('[Refills] Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
