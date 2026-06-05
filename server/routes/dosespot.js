/**
 * DoseSpot e-Prescribing Integration
 *
 * Credentials needed in server .env:
 *   DOSESPOT_ENVIRONMENT=staging          # or production
 *   DOSESPOT_CLINIC_ID=12345
 *   DOSESPOT_API_USER=api_username
 *   DOSESPOT_API_PASSWORD=api_password
 *
 * Per-prescriber: users.dosespot_user_id must be set (DoseSpot enrolls each provider).
 * Per-patient:    patients.dosespot_patient_id is stored automatically after first sync.
 *
 * Docs: https://docs.dosespot.com  (requires DoseSpot portal login)
 * Staging: https://my.staging.dosespot.com
 * Production: https://my.dosespot.com
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import db from '../db/database.js';

const router = Router();
router.use(authenticate); // RBAC: all routes require authentication

const DS_BASE = () =>
  process.env.DOSESPOT_ENVIRONMENT === 'production'
    ? 'https://my.dosespot.com/webapi'
    : 'https://my.staging.dosespot.com/webapi';

const isConfigured = () =>
  !!(process.env.DOSESPOT_CLINIC_ID &&
     process.env.DOSESPOT_API_USER &&
     process.env.DOSESPOT_API_PASSWORD);

// Cache token in memory to avoid hammering the auth endpoint
let _tokenCache = { token: null, expiresAt: 0 };

async function getDSToken() { if (_tokenCache.token && Date.now() < _tokenCache.expiresAt) {
    return _tokenCache.token; }
  const body = new URLSearchParams({ grant_type: 'password', username: process.env.DOSESPOT_API_USER, password: process.env.DOSESPOT_API_PASSWORD,  });
  const r = await fetch(`${ DS_BASE() }/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!r.ok) { const txt = await r.text().catch(() => '');
    throw new Error(`DoseSpot auth failed (${r.status }): ${ txt }`);
  }
  const d = await r.json();
  _tokenCache = { token: d.access_token, expiresAt: Date.now() + (d.expires_in - 60) * 1000,  };
  return _tokenCache.token;
}

async function syncPatientToDS(token, patient) { const clinicId = parseInt(process.env.DOSESPOT_CLINIC_ID, 10);
  const body = {
    ClinicId: clinicId, FirstName: patient.first_name, LastName: patient.last_name, DateOfBirth: patient.dob, Gender: patient.gender === 'Male' ? 1 : patient.gender === 'Female' ? 2 : 0, ...(patient.phone_primary && {
      PrimaryPhone: patient.phone_primary.replace(/\D/g, ''), PrimaryPhoneType: 2,  }),
    ...(patient.address_line1 && { Address1: patient.address_line1, City: patient.address_city, State: patient.address_state, ZipCode: patient.address_zip,  }),
  };
  const r = await fetch(`${ DS_BASE() }/api/patients`, { method: 'POST', headers: {
      Authorization: `Bearer ${token }`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) { const txt = await r.text().catch(() => '');
    throw new Error(`DoseSpot patient sync failed (${r.status }): ${ txt }`);
  }
  const d = await r.json();
  return d.Item; // DoseSpot patient ID
}

// ── GET /api/dosespot/status ─────────────────────────────────────────────────
// Returns whether DoseSpot is configured + environment
router.get('/status', authenticate, async (req, res) => { res.json({
    configured: isConfigured(), environment: process.env.DOSESPOT_ENVIRONMENT || 'staging',  });
});

// ── GET /api/dosespot/sso?patientId=:localPatientId ──────────────────────────
// Prescribers only. Syncs patient if needed, returns DoseSpot iframe SSO URL.
router.get('/sso', authenticate, authorize('prescriber'), async (req, res) => { if (!isConfigured()) {
    return res.status(503).json({
      error: 'DoseSpot is not configured on this server.', code: 'NOT_CONFIGURED',  });
  }

  const prescriber = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!prescriber?.dosespot_user_id) { return res.status(400).json({
      error: 'Your account is not yet enrolled in DoseSpot. Contact your administrator.', code: 'NOT_ENROLLED',  });
  }

  try { const token = await getDSToken();
    const { patientId } = req.query;

    let dosespotPatientId = null;
    if (patientId) { let patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
      if (patient) {
        dosespotPatientId = patient.dosespot_patient_id;
        if (!dosespotPatientId) {
          dosespotPatientId = await syncPatientToDS(token, patient);
          await db.prepare('UPDATE patients SET dosespot_patient_id = ? WHERE id = ?')
            .run(dosespotPatientId, patientId); }
      }
    }

    // Request SSO URL from DoseSpot
    const params = new URLSearchParams({ userId: String(prescriber.dosespot_user_id) });
    if (dosespotPatientId) params.set('patientId', String(dosespotPatientId));

    const ssoRes = await fetch(`${ DS_BASE() }/api/sso?${ params }`, { headers: { Authorization: `Bearer ${token }` },
    });
    if (!ssoRes.ok) { const txt = await ssoRes.text().catch(() => '');
      throw new Error(`DoseSpot SSO request failed (${ssoRes.status }): ${ txt }`);
    }
    const ssoData = await ssoRes.json();
    const iframeUrl = ssoData.url || ssoData.LoginUrl || ssoData.Item || ssoData.item;

    if (!iframeUrl) throw new Error('DoseSpot returned no SSO URL');
    res.json({ url: iframeUrl, configured: true });
  } catch (err) { console.error('DoseSpot SSO error:', err.message);
    res.status(502).json({ error: err.message, code: 'DS_ERROR' });
  }
});

// ── POST /api/dosespot/webhook ───────────────────────────────────────────────
// DoseSpot calls this to notify prescription status changes.
// Register this URL in the DoseSpot portal: https://your-domain.com/api/dosespot/webhook
router.post('/webhook', async (req, res) => { try {
    const { Type, Data } = req.body || {};
    console.log('[DoseSpot webhook]', Type, JSON.stringify(Data || {}));

    if (Type === 'PrescriptionStatus' && Data?.PrescriptionId) { // Map DoseSpot status to internal order status
      const statusMap = {
        1: 'Active', // Entered
        2: 'Active', // Printed
        4: 'Active', // Sending
        8: 'Active', // eRxSent
        16: 'Active', // FaxSent
        32: 'Error', // Error
        64: 'Cancelled', // Deleted
        128: 'Pending EPCS Auth', // EpcsError
        256: 'Active', // EpcsSent
        512: 'Cancelled', // Voided
      };
      const status = statusMap[Data.Status] || 'Active';

      // Update order if we have a matching DoseSpot prescription ID stored
      await db.prepare(`
        UPDATE orders SET status = ? WHERE notes LIKE ?
      `).run(status, `%${ Data.PrescriptionId }%`);
    }
    res.json({ ok: true });
  } catch (err) { console.error('DoseSpot webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/dosespot/prescriber-status ──────────────────────────────────────
// Check if the current prescriber has a dosespot_user_id assigned
router.get('/prescriber-status', authenticate, authorize('prescriber'), async (req, res) => { const prescriber = await db.prepare('SELECT dosespot_user_id FROM users WHERE id = ?').get(req.user.id);
  res.json({ enrolled: !!prescriber?.dosespot_user_id });
});

export default router;
