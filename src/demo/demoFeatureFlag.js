/**
 * Clarity EHR — Demo Mode Feature Flag
 *
 * Single source of truth for demo mode.
 * Checked by API interceptor, export guard, rate limiter, and masking utils.
 *
 * Priority order:
 *   1. ?demo=true  URL param  (public links)
 *   2. localStorage clarity_demo_active
 *   3. window.__CLARITY_DEMO__ (set by DemoContext)
 */

export const DEMO_FLAG_KEY = 'clarity_demo_active';

export function isDemoMode() {
  // URL param
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('demo') === 'true') return true;
  } catch { /* non-browser */ }
  // Global flag (set by DemoContext)
  if (typeof window !== 'undefined' && window.__CLARITY_DEMO__) return true;
  // localStorage
  try { return localStorage.getItem(DEMO_FLAG_KEY) === 'true'; } catch { return false; }
}

export function setDemoFlag(active) {
  if (typeof window !== 'undefined') window.__CLARITY_DEMO__ = active;
  try { localStorage.setItem(DEMO_FLAG_KEY, String(active)); } catch { /* noop */ }
}

export function clearDemoFlag() {
  if (typeof window !== 'undefined') window.__CLARITY_DEMO__ = false;
  try { localStorage.removeItem(DEMO_FLAG_KEY); } catch { /* noop */ }
}

// ── Demo-safe 403 response factory ───────────────────────────────────────────
export function demoDenied(resource = 'this resource') {
  return {
    ok: false,
    status: 403,
    error: `Access to ${resource} is not available in demo mode.`,
    hint: 'Contact us for a full walkthrough with your own data.',
    demo: true,
  };
}

// ── Identifier masking ────────────────────────────────────────────────────────
const MASK_CHAR = '█';

export const mask = {
  // SSN: 123-45-6789 → ███-██-████
  ssn: (v) => v ? '███-██-████' : '—',
  // NPI: 1234567890 → ██████████
  npi: (v) => v ? '██████████' : '—',
  // DEA: FM1234567 → ██████████
  dea: (v) => v ? '████████' : '—',
  // Member ID: BCB987654321 → ████████████
  memberId: (v) => v ? MASK_CHAR.repeat(Math.min((v?.length || 10), 12)) : '—',
  // Group number
  groupNumber: (v) => v ? '████████' : '—',
  // Email: sarah@example.com → s███@example.com
  email: (v) => {
    if (!v) return '—';
    const [local, domain] = v.split('@');
    if (!domain) return '████@████.com';
    return `${local[0]}${'█'.repeat(local.length - 1)}@${domain}`;
  },
  // Phone: (312) 555-0142 → (███) ███-████
  phone: (v) => v ? '(███) ███-████' : '—',
  // Username: dr.danso → d███████
  username: (v) => {
    if (!v) return '—';
    return v[0] + '█'.repeat(v.length - 1);
  },
  // Tax ID / EIN: 123456789 → ████████
  taxId: (v) => v ? '█████████' : '—',
  // IP address
  ip: (v) => v ? '███.███.██.██' : '—',
  // Generic ID truncation
  id: (v) => v ? String(v).slice(0, 4) + '████████' : '—',
  // URL: https://api.clarity-ehr.com/v1/users → [API endpoint hidden]
  url: () => '[endpoint hidden in demo]',
  // API key
  apiKey: () => 'cedi_████████████████████████████████',
  // JWT token
  jwt: () => 'eyJhbGci████.████████.████████',
};
