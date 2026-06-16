/**
 * Provider Signatures API
 * ─────────────────────────────────────────────────────────────────
 * Routes
 *   GET    /api/provider-signatures/me          → fetch my signature
 *   PUT    /api/provider-signatures/me          → upsert my signature
 *   DELETE /api/provider-signatures/me          → remove my signature
 *
 * All routes require authentication. Providers manage their own
 * signature only — no cross-provider access.
 *
 * Security
 *   • Authenticated via existing `authenticate` middleware (httpOnly JWT cookie)
 *   • Input validated: must be a valid data-URL, capped at 512 KB
 *   • Audit-logged on every write / delete
 *   • No admin override: even admins cannot read another provider's signature data
 */

import { Router } from 'express';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/auditLog.js';
import { routeError } from '../utils/routeError.js';

const router = Router();
router.use(authenticate);

// Max base64 payload: ~512 KB  →  roughly 384 KB raw image
const MAX_SIGNATURE_BYTES = 512 * 1024;

/** Validate that the value looks like a PNG/JPEG data-URL and fits within the size cap. */
function validateDataUrl(value) {
  if (typeof value !== 'string') return 'signature must be a string';
  if (!value.startsWith('data:image/')) return 'signature must be an image data-URL (data:image/…)';
  if (!value.includes(';base64,')) return 'signature must be a base64-encoded data-URL';
  if (Buffer.byteLength(value, 'utf8') > MAX_SIGNATURE_BYTES) {
    return `signature exceeds the 512 KB limit — please reduce the image size`;
  }
  return null; // valid
}

// ── GET /api/provider-signatures/me ─────────────────────────────────────────
// Returns { signatureDataUrl, updatedAt } or { signatureDataUrl: null } if none saved.
router.get('/me', async (req, res) => {
  try {
    const row = await db.prepare(
      `SELECT signature_data_url, updated_at FROM provider_signatures WHERE provider_id = $1`
    ).get(req.user.id);

    if (!row) {
      return res.json({ signatureDataUrl: null, updatedAt: null });
    }

    res.json({
      signatureDataUrl: row.signature_data_url,
      updatedAt:        row.updated_at,
    });
  } catch (err) {
    routeError(req, '[provider-signatures] GET /me', err);
    res.status(500).json({ error: 'Failed to fetch signature' });
  }
});

// ── PUT /api/provider-signatures/me ─────────────────────────────────────────
// Upsert the authenticated provider's signature.
// Body: { signatureDataUrl: "data:image/png;base64,…" }
router.put('/me', async (req, res) => {
  const { signatureDataUrl } = req.body;

  const validationError = validateDataUrl(signatureDataUrl);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    // UPSERT — one row per provider, update timestamp on change
    await db.prepare(`
      INSERT INTO provider_signatures (provider_id, signature_data_url, uploaded_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (provider_id)
      DO UPDATE SET
        signature_data_url = EXCLUDED.signature_data_url,
        updated_at         = NOW()
    `).run(req.user.id, signatureDataUrl);

    logAuditEvent({
      userId:       req.user.id,
      userName:     `${req.user.first_name} ${req.user.last_name || ''}`.trim(),
      userRole:     req.user.role,
      action:       'SIGNATURE_UPDATED',
      resourceType: 'provider_signature',
      resourceId:   req.user.id,
      details:      { sizeBytes: Buffer.byteLength(signatureDataUrl, 'utf8') },
      ipAddress:    req.ip || '',
      userAgent:    req.get('User-Agent') || '',
    });

    res.json({ ok: true, message: 'Signature saved successfully' });
  } catch (err) {
    routeError(req, '[provider-signatures] PUT /me', err);
    res.status(500).json({ error: 'Failed to save signature' });
  }
});

// ── DELETE /api/provider-signatures/me ──────────────────────────────────────
// Remove the authenticated provider's signature.
router.delete('/me', async (req, res) => {
  try {
    const result = await db.prepare(
      `DELETE FROM provider_signatures WHERE provider_id = $1`
    ).run(req.user.id);

    if (result.changes === 0) {
      // No row to delete — not an error, just a no-op
      return res.json({ ok: true, message: 'No signature on file' });
    }

    logAuditEvent({
      userId:       req.user.id,
      userName:     `${req.user.first_name} ${req.user.last_name || ''}`.trim(),
      userRole:     req.user.role,
      action:       'SIGNATURE_DELETED',
      resourceType: 'provider_signature',
      resourceId:   req.user.id,
      ipAddress:    req.ip || '',
      userAgent:    req.get('User-Agent') || '',
    });

    res.json({ ok: true, message: 'Signature removed' });
  } catch (err) {
    routeError(req, '[provider-signatures] DELETE /me', err);
    res.status(500).json({ error: 'Failed to delete signature' });
  }
});

export default router;
