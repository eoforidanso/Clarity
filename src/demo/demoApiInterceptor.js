/**
 * Clarity EHR — Demo API Interceptor
 *
 * Wraps fetch() globally in demo mode.
 * Blocked requests return a generic 403 with a demo-safe message.
 * No internal error text, stack traces, or server details are exposed.
 *
 * Install once at app startup (called by DemoContext when demo activates).
 */

import { isDemoMode, demoDenied, mask } from './demoFeatureFlag';
import { demoRateLimit } from './demoRateLimit';

// API path patterns that are blocked in demo
const BLOCKED_API_PATTERNS = [
  // Clearinghouse engine
  /\/api\/edi\//,
  /\/api\/clearinghouse/,
  /\/api\/837/,
  /\/api\/835/,
  /\/api\/270/,
  /\/api\/271/,
  /\/api\/999/,
  /\/api\/routing/,
  /\/api\/transport/,
  /\/api\/sftp/,
  /\/api\/payers\/[^/]+\/credentials/,
  // Developer / API
  /\/api\/webhooks/,
  /\/api\/integrations/,
  /\/api\/marketplace/,
  /\/api\/hie/,
  // Admin & system
  /\/api\/admin\//,
  /\/api\/users/,
  /\/api\/auth\/register/,
  /\/api\/auth\/change-password/,
  /\/api\/audit/,
  /\/api\/roles/,
  /\/api\/permissions/,
  // Export / download
  /\/api\/export/,
  /\/api\/download/,
  /\/api\/reports\/.*\/export/,
];

// Methods blocked in demo (no writes except read-only)
const BLOCKED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Safe read-only endpoints allowed even in demo
const DEMO_ALLOWED_WRITES = [
  /\/api\/auth\/login/,
  /\/api\/auth\/verify/,
];

let _interceptorInstalled = false;
const _originalFetch = typeof window !== 'undefined' ? window.fetch.bind(window) : null;

export function installDemoInterceptor() {
  if (_interceptorInstalled || typeof window === 'undefined') return;
  _interceptorInstalled = true;

  window.fetch = async (input, init = {}) => {
    if (!isDemoMode()) return _originalFetch(input, init);

    const url = typeof input === 'string' ? input : input?.url || '';
    const method = (init?.method || 'GET').toUpperCase();
    const path = url.replace(window.location.origin, '');

    // Rate limit check
    const rateCheck = demoRateLimit.checkRequest(path);
    if (!rateCheck.allowed) {
      return mockResponse({
        ok: false, status: 429,
        error: 'Demo rate limit reached. Please wait a moment.',
        demo: true,
        retryAfter: rateCheck.retryAfter,
      }, 429);
    }

    // Check if blocked pattern
    const isBlocked = BLOCKED_API_PATTERNS.some(p => p.test(path));
    if (isBlocked) {
      demoRateLimit.logBlocked(path, method);
      return mockResponse(demoDenied('this API endpoint'), 403);
    }

    // Block write operations (except allowed ones)
    if (BLOCKED_METHODS.includes(method)) {
      const isAllowedWrite = DEMO_ALLOWED_WRITES.some(p => p.test(path));
      if (!isAllowedWrite) {
        demoRateLimit.logBlocked(path, method);
        return mockResponse(demoDenied(`${method} operations`), 403);
      }
    }

    // Allow request but sanitize response
    try {
      const response = await _originalFetch(input, init);
      return sanitizeResponse(response, path);
    } catch (err) {
      // Never expose internal errors in demo
      if (isDemoMode()) {
        return mockResponse({
          ok: false, status: 503,
          error: 'The service is temporarily unavailable.',
          demo: true,
        }, 503);
      }
      throw err;
    }
  };
}

export function uninstallDemoInterceptor() {
  if (!_interceptorInstalled || typeof window === 'undefined') return;
  window.fetch = _originalFetch;
  _interceptorInstalled = false;
}

// ── Response sanitizer — strips server internals from demo responses ──────────
async function sanitizeResponse(response, path) {
  if (!isDemoMode()) return response;
  const ct = response.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return response;

  try {
    const body = await response.json();
    const clean = scrubResponseBody(body);
    return mockResponse(clean, response.status);
  } catch {
    return response;
  }
}

// Remove internal fields that expose architecture
const SCRUB_KEYS = ['stack', 'trace', 'query', 'sql', 'connectionString',
  'apiKey', 'secret', 'token', 'privateKey', 'sftpPassword', 'dbUrl',
  'internalId', '__v', '_id', 'createdBy', 'updatedBy'];

function scrubResponseBody(obj) {
  if (Array.isArray(obj)) return obj.map(scrubResponseBody);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (SCRUB_KEYS.includes(k)) {
        out[k] = '[hidden]';
      } else {
        out[k] = scrubResponseBody(v);
      }
    }
    return out;
  }
  return obj;
}

// ── Mock Response builder ─────────────────────────────────────────────────────
function mockResponse(body, status = 200) {
  const json = JSON.stringify(body);
  return new Response(json, {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Demo-Mode': 'true' },
  });
}
