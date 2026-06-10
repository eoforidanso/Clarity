/**
 * providerSignature.js
 * ─────────────────────────────────────────────────────────────────
 * Single source of truth for provider electronic signature.
 *
 * Storage (3-tier fallback):
 *   1. Backend  → /provider-signatures/{providerId} (source of truth)
 *   2. Memory   → currentUser.signature (injected by AuthContext at login)
 *   3. LocalStorage → `clarity_signature` (offline fallback cache)
 *
 * Flow:
 *   • On login: fetch from backend, hydrate currentUser, sync to localStorage
 *   • On update: save to backend, update currentUser, update localStorage
 *   • On offline: read from localStorage
 *
 * Payload:
 *   Every Rx / Order carries providerSignature + providerSignatureTimestamp
 *   so historical records show the signature that was active at signing time.
 *
 * Architecture mirrors Epic / Athena / DrFirst:
 *   Provider Profile → stores signature (backend table)
 *   Payload injection → freezes signature on the Rx at signing time
 *   Frontend display  → inline preview + PDF/print block
 */

const STORAGE_KEY = 'clarity_signature';

// Lazy-loaded to avoid circular imports
let providerSignaturesApi = null;
function getSignaturesApi() {
  if (!providerSignaturesApi) {
    const api = require('../services/api');
    providerSignaturesApi = api.providerSignatures;
  }
  return providerSignaturesApi;
}

/** ─────────────────────────────────────────────────────────────────
 *  BACKEND LAYER — Fetch / update signature from server
 * ─────────────────────────────────────────────────────────────────*/

/**
 * Fetch a provider's signature from the backend.
 * Falls back to localStorage if backend is unavailable.
 * Called by AuthContext during login.
 *
 * @param {string} providerId
 * @returns {string|null} base64 data-URL or null
 */
export async function fetchProviderSignatureFromBackend(providerId) {
  try {
    const api = getSignaturesApi();
    const result = await api.get(providerId);
    const sig = result?.signature || null;
    // Cache in localStorage for offline access
    if (sig) {
      saveProviderSignatureLocal(providerId, sig);
    }
    return sig;
  } catch (err) {
    // Backend unavailable — fall back to localStorage
    console.warn(`Failed to fetch signature from backend for provider ${providerId}:`, err.message);
    return getProviderSignature(providerId);
  }
}

/**
 * Save a provider's signature to the backend.
 * Falls back to localStorage if backend is unavailable.
 * Called by Settings.jsx and AuthContext.updateUserSignature.
 *
 * @param {string} providerId
 * @param {string|null} dataUrl — base64 data-URL (or null to clear)
 * @returns {Promise<boolean>} true if saved to backend, false if fallback-only
 */
export async function saveProviderSignatureToBackend(providerId, dataUrl) {
  try {
    const api = getSignaturesApi();
    await api.update(providerId, dataUrl);
    // Also update localStorage for offline cache
    saveProviderSignatureLocal(providerId, dataUrl);
    return true; // saved to backend
  } catch (err) {
    console.warn(`Failed to save signature to backend for provider ${providerId}:`, err.message);
    // Fallback: save to localStorage only
    saveProviderSignatureLocal(providerId, dataUrl);
    return false; // fallback only
  }
}

/** ─────────────────────────────────────────────────────────────────
 *  STORAGE LAYER — localStorage cache (fallback)
 * ─────────────────────────────────────────────────────────────────*/

/** Read a provider's saved signature data-URL from localStorage (or null). */
export function getProviderSignature(userId) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return userId ? (all[userId] || null) : null;
  } catch { return null; }
}

/** Persist a provider's signature data-URL to localStorage (pass null to clear). */
export function saveProviderSignatureLocal(userId, dataUrl) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (dataUrl) { all[userId] = dataUrl; } else { delete all[userId]; }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* noop — storage full or unavailable */ }
}

/**
 * Build the HTML string for the provider signature block used in
 * print windows and PDF exports.
 *
 * Includes:
 *   • Signature image (or blank line)
 *   • Provider name & credentials
 *   • NPI & DEA (pharmacies love this — reduces callbacks)
 *   • Timestamp
 *
 * @param {object} opts
 * @param {object} opts.provider            — currentUser shape (with npi, deaNumber)
 * @param {string|null} opts.sigDataUrl     — base64 data-URL (or null → blank line)
 * @param {string|null} opts.timestamp      — ISO string of when Rx was signed
 */
export function buildSignatureBlockHtml({ provider, sigDataUrl, timestamp }) {
  const name = `${provider.firstName} ${provider.lastName}${provider.credentials ? ', ' + provider.credentials : ''}`;
  const ts   = timestamp ? new Date(timestamp) : new Date();
  const dateStr = ts.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const imageHtml = sigDataUrl
    ? `<img src="${sigDataUrl}" style="max-height:60px;max-width:200px;display:block;margin-bottom:4px" alt="Provider signature"/>`
    : `<div style="border-bottom:1.5px solid #374151;width:220px;height:44px;margin-bottom:4px;"></div>`;

  return `
<div class="sig-area">
  <div>
    ${imageHtml}
    <div style="font-size:11.5px;font-weight:700;color:#111;">${name}</div>
    ${provider.npi       ? `<div style="font-size:10.5px;color:#6b7280;">NPI: ${provider.npi}</div>` : ''}
    ${provider.deaNumber ? `<div style="font-size:10.5px;color:#6b7280;">DEA: ${provider.deaNumber}</div>` : ''}
  </div>
  <div style="font-size:10.5px;color:#6b7280;text-align:right;align-self:flex-end;">
    Electronically signed<br/>
    ${dateStr} · ${timeStr}
  </div>
</div>`;
}

/**
 * Build the full signature payload object to inject into every Rx / Order.
 * This "freezes" the provider's identity + signature at the moment of signing
 * so historical records remain accurate even if the provider updates their sig later.
 */
export function buildSignaturePayload(provider) {
  return {
    providerSignature:          provider.signature || null,
    providerSignatureTimestamp: new Date().toISOString(),
    providerSignedBy: {
      id:          provider.id,
      firstName:   provider.firstName,
      lastName:    provider.lastName,
      credentials: provider.credentials || '',
      npi:         provider.npi         || '',
      deaNumber:   provider.deaNumber   || '',
    },
  };
}

/** ─────────────────────────────────────────────────────────────────
 *  WATERMARK & PRINT UTILITIES
 * ─────────────────────────────────────────────────────────────────*/

/**
 * Return CSS for "Signature on File" watermark (non-EPCS scripts only).
 * Renders a faint diagonal watermark: standard for non-controlled prescriptions.
 */
export function getSignatureOnFileWatermarkCss() {
  return `
<style>
  .sig-on-file-watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-45deg);
    font-size: 72px;
    font-weight: 300;
    color: rgba(100, 116, 139, 0.08);
    white-space: nowrap;
    pointer-events: none;
    z-index: 0;
  }
  @media print {
    .sig-on-file-watermark { display: block; }
  }
</style>`;
}

/**
 * Return HTML for "Signature on File" watermark div.
 * Must be placed in the body before main content for print rendering.
 */
export function getSignatureOnFileWatermarkHtml() {
  return `<div class="sig-on-file-watermark">Signature on File</div>`;
}
