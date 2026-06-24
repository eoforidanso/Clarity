/**
 * DoseSpot e-Prescribing Integration
 *
 * Credentials needed in server .env:
 *   DOSESPOT_ENVIRONMENT=staging          # or production
 *   DOSESPOT_CLINIC_ID=12345
 *   DOSESPOT_API_USER=api_username
 *   DOSESPOT_API_PASSWORD=api_password
 *   DOSESPOT_WEBHOOK_SECRET=<shared secret registered in DoseSpot portal> (optional)
 *
 * Per-prescriber: users.dosespot_user_id must be set (admin enrolls via PUT /api/dosespot/prescribers/:userId/enroll).
 * Per-patient:    patients.dosespot_patient_id is stored automatically after first sync.
 *
 * Docs: https://docs.dosespot.com  (requires DoseSpot portal login)
 * Staging: https://my.staging.dosespot.com
 * Production: https://my.dosespot.com
 */

import { Router } from 'express';
import crypto from 'crypto';
import { authenticate, authorize } from '../middleware/auth.js';
import db from '../db/database.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { validateResponse } from '../middleware/validateResponse.js';
import { AnyResponseSchema } from '../schemas/responseSchemas.js';

const ADMIN_ROLES = ['admin', 'global_admin'];
const PRESCRIBER_ROLES = ['prescriber', 'nurse_practitioner'];

const DosespotWebhookSchema = z.object({
  Type: z.string().optional(),
  Data: z.record(z.any()).optional(),
}).passthrough();

const DS_BASE = () =>
  process.env.DOSESPOT_ENVIRONMENT === 'production'
    ? 'https://my.dosespot.com/webapi'
    : 'https://my.staging.dosespot.com/webapi';

const isConfigured = () =>
  !!(process.env.DOSESPOT_CLINIC_ID &&
     process.env.DOSESPOT_API_USER &&
     process.env.DOSESPOT_API_PASSWORD);

// Token cache — avoid re-authenticating on every request
let _tokenCache = { token: null, expiresAt: 0 };

async function getDSToken() {
  if (_tokenCache.token && Date.now() < _tokenCache.expiresAt) {
    return _tokenCache.token;
  }
  const body = new URLSearchParams({
    grant_type: 'password',
    username: process.env.DOSESPOT_API_USER,
    password: process.env.DOSESPOT_API_PASSWORD,
  });
  const r = await fetch(`${DS_BASE()}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`DoseSpot auth failed (${r.status}): ${txt}`);
  }
  const d = await r.json();
  _tokenCache = { token: d.access_token, expiresAt: Date.now() + (d.expires_in - 60) * 1000 };
  return _tokenCache.token;
}

async function dsGet(path) {
  const token = await getDSToken();
  const r = await fetch(`${DS_BASE()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`DoseSpot API error at ${path} (${r.status}): ${txt}`);
  }
  return r.json();
}

async function dsPost(path, body) {
  const token = await getDSToken();
  const r = await fetch(`${DS_BASE()}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`DoseSpot POST error at ${path} (${r.status}): ${txt}`);
  }
  return r.json();
}

// Sync a patient to DoseSpot and persist the returned ID
async function syncPatientToDS(token, patient) {
  const clinicId = parseInt(process.env.DOSESPOT_CLINIC_ID, 10);
  const body = {
    ClinicId: clinicId,
    FirstName: patient.first_name,
    LastName: patient.last_name,
    DateOfBirth: patient.dob,
    Gender: patient.gender === 'Male' ? 1 : patient.gender === 'Female' ? 2 : 0,
    ...(patient.phone_primary && {
      PrimaryPhone: patient.phone_primary.replace(/\D/g, ''),
      PrimaryPhoneType: 2,
    }),
    ...(patient.address_line1 && {
      Address1: patient.address_line1,
      City: patient.address_city,
      State: patient.address_state,
      ZipCode: patient.address_zip,
    }),
  };
  const r = await fetch(`${DS_BASE()}/api/patients`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`DoseSpot patient sync failed (${r.status}): ${txt}`);
  }
  const d = await r.json();
  return d.Item; // DoseSpot patient ID
}

// Map DoseSpot prescription status codes to internal status strings
const DS_STATUS_MAP = {
  1:   'Active',            // Entered
  2:   'Active',            // Printed
  4:   'Active',            // Sending
  8:   'Active',            // eRxSent
  16:  'Active',            // FaxSent
  32:  'Error',             // Error
  64:  'Cancelled',         // Deleted
  128: 'Pending EPCS Auth', // EpcsError
  256: 'Active',            // EpcsSent
  512: 'Cancelled',         // Voided
};

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK ROUTER — no authentication (DoseSpot server calls this)
// This must be exported separately and mounted without auth middleware in index.js
// ─────────────────────────────────────────────────────────────────────────────
export const webhookRouter = Router();

webhookRouter.post('/webhook', validate(DosespotWebhookSchema), async (req, res) => {
  try {
    // HMAC-SHA256 webhook signature verification.
    // DoseSpot sends: X-DoseSpot-Signature: sha256=<hex>
    // We compute HMAC over the raw body and compare with timing-safe equality.
    const secret = process.env.DOSESPOT_WEBHOOK_SECRET;
    if (secret) {
      const sigHeader = req.headers['x-dosespot-signature'] || req.headers['x-webhook-signature'] || '';
      const rawBody   = JSON.stringify(req.body);               // re-serialise parsed body
      const expected  = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      const sigOk = sigHeader.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected));

      if (!sigOk) {
        console.warn('[DoseSpot webhook] signature mismatch — rejected');
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    const { Type, Data } = req.body || {};
    console.info('[DoseSpot webhook]', Type, JSON.stringify(Data || {}));

    if (Type === 'PrescriptionStatus' && Data?.PrescriptionId) {
      const status = DS_STATUS_MAP[Data.Status] || 'Active';
      const dsPrescriptionId = String(Data.PrescriptionId);

      // Update via indexed dosespot_prescription_id column (fast, exact match)
      const result = await db.prepare(`
        UPDATE orders SET status = ?, updated_at = NOW()
        WHERE dosespot_prescription_id = ?
      `).run(status, dsPrescriptionId);

      // Also check epcs_transmissions
      const epcsStatus = Data.Status === 512 ? 'cancelled'
        : Data.Status === 256 ? 'dispensed'
        : Data.Status === 32 ? 'error'
        : 'acknowledged';
      if ([32, 256, 512].includes(Data.Status)) {
        const tsCol = { dispensed: 'dispensed_at', cancelled: 'cancelled_at', error: null }[epcsStatus];
        const tsUpdate = tsCol ? `, ${tsCol} = NOW()` : '';
        await db.prepare(`
          UPDATE epcs_transmissions SET status = ?${tsUpdate}
          WHERE dosespot_prescription_id = ?
        `).run(epcsStatus, dsPrescriptionId);
      }

      console.info(`[DoseSpot webhook] Updated ${result.changes} order(s) for prescription ${dsPrescriptionId} → ${status}`);
    }

    if (Type === 'RefillRequest' && Data?.RefillRequestId) {
      // Refill requests can be surfaced in the app — log for now
      console.info('[DoseSpot webhook] Refill request received:', Data.RefillRequestId);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('DoseSpot webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ROUTER — all routes below require authentication
// ─────────────────────────────────────────────────────────────────────────────
const router = Router();
router.use(authenticate);
router.use(validateResponse(AnyResponseSchema));

// ── GET /api/dosespot/status ─────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  res.json({
    configured: isConfigured(),
    environment: process.env.DOSESPOT_ENVIRONMENT || 'staging',
  });
});

// ── GET /api/dosespot/sso?patientId=:localPatientId ─────────────────────────
// Prescribers only. Syncs patient if needed, returns DoseSpot iframe SSO URL.
router.get('/sso', authorize(...PRESCRIBER_ROLES), async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'DoseSpot is not configured on this server.', code: 'NOT_CONFIGURED' });
  }

  const prescriber = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!prescriber?.dosespot_user_id) {
    return res.status(400).json({
      error: 'Your account is not yet enrolled in DoseSpot. Contact your administrator.',
      code: 'NOT_ENROLLED',
    });
  }

  try {
    const token = await getDSToken();
    const { patientId } = req.query;

    let dosespotPatientId = null;
    if (patientId) {
      const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
      if (patient) {
        dosespotPatientId = patient.dosespot_patient_id;
        if (!dosespotPatientId) {
          dosespotPatientId = await syncPatientToDS(token, patient);
          await db.prepare('UPDATE patients SET dosespot_patient_id = ? WHERE id = ?')
            .run(dosespotPatientId, patientId);
        }
      }
    }

    const params = new URLSearchParams({ userId: String(prescriber.dosespot_user_id) });
    if (dosespotPatientId) params.set('patientId', String(dosespotPatientId));

    const ssoRes = await fetch(`${DS_BASE()}/api/sso?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!ssoRes.ok) {
      const txt = await ssoRes.text().catch(() => '');
      throw new Error(`DoseSpot SSO request failed (${ssoRes.status}): ${txt}`);
    }
    const ssoData = await ssoRes.json();
    const iframeUrl = ssoData.url || ssoData.LoginUrl || ssoData.Item || ssoData.item;
    if (!iframeUrl) throw new Error('DoseSpot returned no SSO URL');

    res.json({ url: iframeUrl, configured: true });
  } catch (err) {
    console.error('DoseSpot SSO error:', err.message);
    res.status(502).json({ error: err.message, code: 'DS_ERROR' });
  }
});

// ── GET /api/dosespot/prescriber-status ──────────────────────────────────────
router.get('/prescriber-status', authorize(...PRESCRIBER_ROLES), async (req, res) => {
  const prescriber = await db.prepare(
    'SELECT dosespot_user_id FROM users WHERE id = ?'
  ).get(req.user.id);
  res.json({ enrolled: !!prescriber?.dosespot_user_id, dosespotUserId: prescriber?.dosespot_user_id || null });
});

// ── GET /api/dosespot/notifications ─────────────────────────────────────────
// Returns pending refill request count + error count for the current prescriber.
router.get('/notifications', authorize(...PRESCRIBER_ROLES), async (req, res) => {
  if (!isConfigured()) {
    return res.json({ refillRequests: 0, errors: 0, total: 0, configured: false });
  }

  const prescriber = await db.prepare('SELECT dosespot_user_id FROM users WHERE id = ?').get(req.user.id);
  if (!prescriber?.dosespot_user_id) {
    return res.json({ refillRequests: 0, errors: 0, total: 0, enrolled: false });
  }

  try {
    // DoseSpot notification counts endpoint — per-prescriber within a clinic
    const data = await dsGet(
      `/api/clinics/${process.env.DOSESPOT_CLINIC_ID}/clinicians/${prescriber.dosespot_user_id}/notifications/counts`
    );
    // DoseSpot returns: { RefillRequestsCount, PendingPrescriptionsCount, TransactionErrorsCount, ... }
    const refillRequests = data.RefillRequestsCount ?? data.refillRequestsCount ?? 0;
    const errors = data.TransactionErrorsCount ?? data.transactionErrorsCount ?? 0;
    const pending = data.PendingPrescriptionsCount ?? data.pendingPrescriptionsCount ?? 0;
    res.json({
      refillRequests,
      errors,
      pending,
      total: refillRequests + errors,
      configured: true,
      enrolled: true,
    });
  } catch (err) {
    console.error('DoseSpot notifications error:', err.message);
    // Non-fatal: return zeros rather than erroring the UI
    res.json({ refillRequests: 0, errors: 0, total: 0, configured: true, enrolled: true, dsError: err.message });
  }
});

// ── GET /api/dosespot/patients/:id/prescriptions ─────────────────────────────
// Fetches a patient's prescriptions from DoseSpot and syncs them into our orders table.
router.get('/patients/:id/prescriptions', async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'DoseSpot is not configured', code: 'NOT_CONFIGURED' });
  }

  const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  try {
    const token = await getDSToken();
    let dsPatientId = patient.dosespot_patient_id;

    // Sync patient to DoseSpot if not already synced
    if (!dsPatientId) {
      dsPatientId = await syncPatientToDS(token, patient);
      await db.prepare('UPDATE patients SET dosespot_patient_id = ? WHERE id = ?')
        .run(dsPatientId, req.params.id);
    }

    const data = await dsGet(`/api/patients/${dsPatientId}/prescriptions`);
    const prescriptions = Array.isArray(data) ? data : (data.Items || data.items || []);

    // Upsert into our orders table so prescriptions appear in the patient's med list
    for (const rx of prescriptions) {
      const dsPrescriptionId = String(rx.PrescriptionId || rx.prescriptionId || rx.Id || rx.id);
      const existing = await db.prepare(
        'SELECT id FROM orders WHERE dosespot_prescription_id = ?'
      ).get(dsPrescriptionId);

      const status = DS_STATUS_MAP[rx.Status || rx.status] || 'Active';
      const drugName = rx.DisplayName || rx.DrugName || rx.drugName || rx.MedicationName || '';
      const sig = rx.Directions || rx.directions || rx.Sig || rx.sig || '';
      const quantity = rx.Quantity || rx.quantity || 0;
      const refills = rx.Refills || rx.refills || 0;
      const writtenDate = rx.WrittenDate || rx.writtenDate || rx.DateWritten || new Date().toISOString();

      if (existing) {
        await db.prepare(`
          UPDATE orders SET status = ?, updated_at = NOW() WHERE dosespot_prescription_id = ?
        `).run(status, dsPrescriptionId);
      } else {
        const { v4: uuidv4 } = await import('uuid');
        await db.prepare(`
          INSERT INTO orders
            (id, patient_id, type, name, status, notes, quantity, refills, sig,
             dosespot_prescription_id, ordered_by, ordered_date)
          VALUES (?, ?, 'Medication', ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (id) DO NOTHING
        `).run(
          uuidv4(),
          req.params.id,
          drugName,
          status,
          sig,
          quantity,
          refills,
          sig,
          dsPrescriptionId,
          req.user.id,
          writtenDate,
        );
      }
    }

    res.json({
      patientId: req.params.id,
      dosespotPatientId: dsPatientId,
      count: prescriptions.length,
      prescriptions: prescriptions.map(rx => ({
        dsPrescriptionId: String(rx.PrescriptionId || rx.Id || ''),
        drugName: rx.DisplayName || rx.DrugName || rx.MedicationName || '',
        sig: rx.Directions || rx.Sig || '',
        quantity: rx.Quantity ?? rx.quantity ?? null,
        refills: rx.Refills ?? rx.refills ?? null,
        status: DS_STATUS_MAP[rx.Status] || 'Active',
        writtenDate: rx.WrittenDate || rx.DateWritten || null,
        pharmacy: rx.PharmacyName || rx.Pharmacy?.StoreName || null,
      })),
    });
  } catch (err) {
    console.error('DoseSpot prescriptions error:', err.message);
    res.status(502).json({ error: err.message, code: 'DS_ERROR' });
  }
});

// ── POST /api/dosespot/patients/:id/sync ────────────────────────────────────
// Force-sync a patient record to DoseSpot (clears and re-creates if needed).
router.post('/patients/:id/sync', async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'DoseSpot is not configured', code: 'NOT_CONFIGURED' });
  }

  const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  try {
    const token = await getDSToken();
    const dsPatientId = await syncPatientToDS(token, patient);
    await db.prepare('UPDATE patients SET dosespot_patient_id = ? WHERE id = ?')
      .run(dsPatientId, req.params.id);

    res.json({ ok: true, dosespotPatientId: dsPatientId });
  } catch (err) {
    console.error('DoseSpot patient sync error:', err.message);
    res.status(502).json({ error: err.message, code: 'DS_ERROR' });
  }
});

// ── PUT /api/dosespot/prescribers/:userId/enroll ─────────────────────────────
// Admin: set (or auto-create) a prescriber's DoseSpot user ID.
// Body: { dosespotUserId: "12345" }        → manual assignment from DoseSpot portal
//   OR: { autoCreate: true }              → create the clinician via DoseSpot API
router.put('/prescribers/:userId/enroll', authorize(...ADMIN_ROLES), async (req, res) => {
  const { userId } = req.params;
  const { dosespotUserId, autoCreate } = req.body;

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!['prescriber', 'nurse_practitioner'].includes(user.role)) {
    return res.status(400).json({ error: 'Only prescribers can be enrolled in DoseSpot' });
  }

  if (dosespotUserId) {
    // Manual assignment: admin copies the ID from the DoseSpot portal
    await db.prepare('UPDATE users SET dosespot_user_id = ?, updated_at = NOW() WHERE id = ?')
      .run(String(dosespotUserId), userId);
    return res.json({ ok: true, dosespotUserId: String(dosespotUserId), method: 'manual' });
  }

  if (autoCreate) {
    if (!isConfigured()) {
      return res.status(503).json({ error: 'DoseSpot is not configured on this server.', code: 'NOT_CONFIGURED' });
    }
    try {
      const clinicId = parseInt(process.env.DOSESPOT_CLINIC_ID, 10);
      const clinicianData = await dsPost(
        `/api/clinics/${clinicId}/clinicians`,
        {
          ClinicId: clinicId,
          FirstName: user.first_name || '',
          LastName: user.last_name || '',
          Npi: user.npi || '',
          Dea: user.dea_number || '',
          Role: 3, // Prescriber
          Email: user.email || '',
        }
      );
      const newDsUserId = clinicianData.Item || clinicianData.id || clinicianData.ClinicianId;
      if (!newDsUserId) throw new Error('DoseSpot did not return a clinician ID');

      await db.prepare('UPDATE users SET dosespot_user_id = ?, updated_at = NOW() WHERE id = ?')
        .run(String(newDsUserId), userId);
      return res.json({ ok: true, dosespotUserId: String(newDsUserId), method: 'auto_created' });
    } catch (err) {
      console.error('DoseSpot prescriber auto-create error:', err.message);
      return res.status(502).json({ error: err.message, code: 'DS_ERROR' });
    }
  }

  return res.status(400).json({ error: 'Provide dosespotUserId or set autoCreate: true' });
});

// ── DELETE /api/dosespot/prescribers/:userId/enroll ─────────────────────────
// Admin: remove a prescriber's DoseSpot enrollment from our records.
router.delete('/prescribers/:userId/enroll', authorize(...ADMIN_ROLES), async (req, res) => {
  const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  await db.prepare('UPDATE users SET dosespot_user_id = NULL, updated_at = NOW() WHERE id = ?')
    .run(req.params.userId);
  res.json({ ok: true });
});

export default router;
