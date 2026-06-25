// API URL — staging branch uses VITE_API_URL_STAGING, production uses VITE_API_URL
const API_BASE = import.meta.env?.VITE_API_URL || '/api';

// No-op — token is now managed as an httpOnly cookie set by the server
export function setToken(_token) {}

// ── CSRF token management ─────────────────────────────────────────────────────
// Server issues a single-use token per request; responds with X-New-CSRF-Token
// for the next one. We keep the latest token in memory and fetch lazily.
let _csrfToken = null;
let _csrfFetching = null;

async function ensureCsrfToken() {
  if (_csrfToken) return _csrfToken;
  if (_csrfFetching) return _csrfFetching;
  _csrfFetching = fetch(`${API_BASE}/csrf-token`, { credentials: 'include' })
    .then(r => r.ok ? r.json() : null)
    .then(data => { _csrfToken = data?.token ?? null; _csrfFetching = null; return _csrfToken; })
    .catch(() => { _csrfFetching = null; return null; });
  return _csrfFetching;
}

// Call this after logout so the next login fetches a fresh token
export function clearCsrfToken() { _csrfToken = null; }

// ── Silent token refresh ──────────────────────────────────────────────────────
// Called automatically when any request returns 401.
// Tries POST /auth/refresh (uses the 30-day ehr_refresh cookie).
// Returns true if refresh succeeded (caller should retry), false otherwise.
let _refreshing = false;
let _refreshQueue = [];

async function tryRefresh() {
  // Deduplicate — if already refreshing, wait for it
  if (_refreshing) {
    return new Promise((resolve) => _refreshQueue.push(resolve));
  }
  _refreshing = true;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    const ok = res.status === 200;
    _refreshQueue.forEach(r => r(ok));
    _refreshQueue = [];
    return ok;
  } catch {
    _refreshQueue.forEach(r => r(false));
    _refreshQueue = [];
    return false;
  } finally {
    _refreshing = false;
  }
}

/**
 * ApiError — extends Error with a `code` field so callers can branch on
 * error type without parsing message strings.
 *   code: 'network' | 'auth' | 'server' | 'client'
 */
export class ApiError extends Error {
  constructor(message, status, code, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details; // array of { field, message } from Zod validation failures
  }
}

const STATE_CHANGING = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);
// Routes that either don't need CSRF or run before a session exists.
// All /auth/* routes are excluded — the server doesn't validate CSRF on them.
const CSRF_SKIP_PREFIXES = ['/auth/', '/patient-portal'];

async function request(path, options = {}, _isRetry = false) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  const method = (options.method || 'GET').toUpperCase();
  const needsCsrf = STATE_CHANGING.has(method) && !CSRF_SKIP_PREFIXES.some(p => path.startsWith(p));
  if (needsCsrf) {
    const token = await ensureCsrfToken();
    if (token) headers['X-CSRF-Token'] = token;
    _csrfToken = null; // consumed — will be refreshed from X-New-CSRF-Token
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include', // send/receive httpOnly cookies cross-origin
    });
  } catch {
    // fetch() itself threw — network failure, DNS error, or server completely down
    throw new ApiError(
      'Unable to reach the Clarity EHR server. The service may be temporarily unavailable.',
      0,
      'network'
    );
  }

  // Capture rotated CSRF token for the next request
  const nextCsrf = res.headers.get('X-New-CSRF-Token');
  if (nextCsrf) _csrfToken = nextCsrf;

  // ── Auto-refresh on 401 (expired 8h access token) ──────────────────────
  if (res.status === 401 && !_isRetry && !path.includes('/auth/')) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request(path, options, true); // retry once with new access token
    }
    // Refresh failed — fall through to throw auth error (user logs in again)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));

    // ── Auto-retry on CSRF token invalid/expired (e.g. after server restart) ──
    if (res.status === 403 && body.action === 'get_csrf_token' && !_isRetry) {
      _csrfToken = null;
      await ensureCsrfToken();
      return request(path, options, true);
    }

    const message =
      body.error ||
      (res.status === 401 ? 'Session expired — please log in again' : `Request failed (${res.status})`);
    const code =
      res.status >= 500 ? 'server' :
      res.status === 401 || res.status === 403 ? 'auth' :
      'client';
    throw new ApiError(message, res.status, code, body.details || null);
  }

  if (res.status === 204) return null;
  return res.json();
}

const get   = (path, options) => request(path, options);
const post  = (path, data) => request(path, { method: 'POST',  body: JSON.stringify(data) });
const put   = (path, data) => request(path, { method: 'PUT',   body: JSON.stringify(data) });
const patch = (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data) });
const del   = (path, elevatedToken) => request(path, {
  method: 'DELETE',
  ...(elevatedToken && { headers: { Authorization: `Bearer ${elevatedToken}` } }),
});

// ─── Auth ────────────────────────────────────────────
export const auth = {
  login: (username, password) => post('/auth/login', { username, password }),
  logout: () => post('/auth/logout', {}),
  me: (options) => get('/auth/me', options),
  refresh: () => tryRefresh(),
  changePassword: (currentPassword, newPassword) => post('/auth/change-password', { currentPassword, newPassword }),
  verifyEpcsPin: (pin) => post('/auth/verify-epcs-pin', { pin }),
  generateEpcsOtp: () => post('/auth/generate-epcs-otp', {}),
  verifyEpcsOtp: (otp) => post('/auth/verify-epcs-otp', { otp }),
  verify2FA: (tempToken, code) => post('/auth/mfa/verify', { tempToken, code }),
  setup2FA: () => post('/auth/2fa/setup', {}),
  enable2FA: (secret, code) => post('/auth/2fa/enable', { secret, code }),
  // Re-authenticate to get a short-lived elevated token for sensitive actions
  // Returns { elevatedToken, expiresAt, expiresInSeconds }
  reauth: (password) => post('/auth/reauth', { password }),
  reauthOtp: (otp)  => post('/auth/reauth', { otp }),
};

// ─── Telehealth ──────────────────────────────────────
export const telehealth = {
  token:       (appointmentId)             => post('/telehealth/token', { appointmentId }),
  breakout:    (appointmentId, participants) => post('/telehealth/breakout', { appointmentId, participants }),
  admit:       (appointmentId, participantIdentity) => post('/telehealth/admit', { appointmentId, participantIdentity }),
  guestInvite: (appointmentId, guestName)  => post('/telehealth/guest-invite', { appointmentId, guestName }),
  join:        (appointmentId, mode)       => post('/appointments/telehealth-session/join', { appointmentId, mode }),
  leave:       (appointmentId)             => post('/appointments/telehealth-session/leave', { appointmentId }),
  checkin:     (appointmentId, checkinData) => post('/appointments/telehealth-session/checkin', { appointmentId, checkinData }),
  participants:(appointmentId)             => get(`/appointments/telehealth-session/${appointmentId}/participants`),
  consent:     (data)                      => post('/appointments/telehealth-consent', data),
  getConsent:  (sessionId)                 => get(`/appointments/telehealth-consent/${sessionId}`),
};

// ─── Patients ────────────────────────────────────────
export const patients = {
  list:             (params)     => get(`/patients?${new URLSearchParams(params)}`),
  get:              (id)         => get(`/patients/${id}`),
  create:           (data)       => post('/patients', data),
  update:           (id, data)   => put(`/patients/${id}`, data),
  updateStickyNote: (id, note)   => patch(`/patients/${id}/sticky-note`, { note }),
};

// ─── Clinical (per-patient) ──────────────────────────
export const allergies = {
  list: (patientId) => get(`/patients/${patientId}/allergies`),
  create: (patientId, data) => post(`/patients/${patientId}/allergies`, data),
  update: (patientId, id, data) => put(`/patients/${patientId}/allergies/${id}`, data),
  remove: (patientId, id) => del(`/patients/${patientId}/allergies/${id}`),
};

export const problems = {
  list: (patientId) => get(`/patients/${patientId}/problems`),
  create: (patientId, data) => post(`/patients/${patientId}/problems`, data),
  update: (patientId, id, data) => put(`/patients/${patientId}/problems/${id}`, data),
};

export const vitals = {
  list: (patientId) => get(`/patients/${patientId}/vitals`),
  create: (patientId, data) => post(`/patients/${patientId}/vitals`, data),
};

export const immunizations = {
  list: (patientId) => get(`/patients/${patientId}/immunizations`),
  create: (patientId, data) => post(`/patients/${patientId}/immunizations`, data),
};

export const assessments = {
  list: (patientId) => get(`/patients/${patientId}/assessments`),
  create: (patientId, data) => post(`/patients/${patientId}/assessments`, data),
};

// ─── Medications ─────────────────────────────────────
export const medications = {
  list: (patientId) => get(`/patients/${patientId}/medications`),
  get: (patientId, id) => get(`/patients/${patientId}/medications/${id}`),
  create: (patientId, data) => post(`/patients/${patientId}/medications`, data),
  update: (patientId, id, data) => put(`/patients/${patientId}/medications/${id}`, data),
  remove: (patientId, id) => del(`/patients/${patientId}/medications/${id}`),
  addRxHistory: (patientId, id, entry) => post(`/patients/${patientId}/medications/${id}/rx-history`, entry),
};

// ─── Orders ──────────────────────────────────────────
export const orders = {
  list: (patientId) => get(`/patients/${patientId}/orders`),
  create: (patientId, data) => post(`/patients/${patientId}/orders`, data),
  update: (patientId, id, data) => put(`/patients/${patientId}/orders/${id}`, data),
};

// ─── Labs ────────────────────────────────────────────
export const labs = {
  list: (patientId) => get(`/patients/${patientId}/labs`),
  get: (patientId, id) => get(`/patients/${patientId}/labs/${id}`),
  create: (patientId, data) => post(`/patients/${patientId}/labs`, data),
};

// ─── Encounters ──────────────────────────────────────
export const encounters = {
  list: (patientId) => get(`/patients/${patientId}/encounters`),
  get: (patientId, id) => get(`/patients/${patientId}/encounters/${id}`),
  create: (patientId, data) => post(`/patients/${patientId}/encounters`, data),
  update: (patientId, id, data) => put(`/patients/${patientId}/encounters/${id}`, data),
};

// ─── Appointments ────────────────────────────────────
export const appointments = {
  list: (params) => get(`/appointments?${new URLSearchParams(params)}`),
  create: (data) => post('/appointments', data),
  update: (id, data) => put(`/appointments/${id}`, data),
  remove: (id) => del(`/appointments/${id}`),
  blockedDays: () => get('/appointments/blocked-days/list'),
  addBlockedDay: (data) => post('/appointments/blocked-days', data),
  removeBlockedDay: (id) => del(`/appointments/blocked-days/${id}`),
};

// ─── Inbox ───────────────────────────────────────────
export const inbox = {
  list: (params) => get(`/inbox?${new URLSearchParams(params)}`),
  create: (data) => post('/inbox', data),
  update: (id, data) => put(`/inbox/${id}`, data),
  updateStatus: (id, status) => put(`/inbox/${id}/status`, { status }),
};

// ─── Messaging ───────────────────────────────────────
export const messaging = {
  channels: () => get('/messaging/channels'),
  messages: (channelId) => get(`/messaging/channels/${channelId}/messages`),
  send: (channelId, data) => post(`/messaging/channels/${channelId}/messages`, data),
  react: (messageId, data) => put(`/messaging/messages/${messageId}/reactions`, data),
  dm: {
    messages: (userId) => get(`/messaging/dm/${userId}/messages`),
    send: (userId, data) => post(`/messaging/dm/${userId}/messages`, data),
    react: (messageId, data) => put(`/messaging/dm/messages/${messageId}/reactions`, data),
    unreadCounts: () => get('/messaging/dm/unread-counts'),
  },
};

// ─── BTG ─────────────────────────────────────────────
export const btg = {
  requestAccess: (patientId, reason) => post('/btg/request-access', { patientId, reason }),
  checkAccess: (patientId) => get(`/btg/check-access/${patientId}`),
  auditLog: (params) => get(`/btg/audit-log?${new URLSearchParams(params)}`),
};

// ─── E-Prescribe ─────────────────────────────────────
export const eprescribe = {
  searchMeds: (search) => get(`/eprescribe/medication-database?search=${encodeURIComponent(search)}`),
  prescribe: (data) => post('/eprescribe/prescribe', data),
};

// ─── Smart Phrases ───────────────────────────────────
export const smartPhrases = {
  list: (params) => get(`/smart-phrases?${new URLSearchParams(params)}`),
  create: (data) => post('/smart-phrases', data),
  update: (id, data) => put(`/smart-phrases/${id}`, data),
  remove: (id) => del(`/smart-phrases/${id}`),
};

// ─── Analytics ───────────────────────────────────────
export const analytics = {
  summary: () => get('/analytics/summary'),
  patient: (patientId) => get(`/analytics/patient/${patientId}`),
};

// ─── Care Gaps ───────────────────────────────────────
export const careGaps = {
  list: () => get('/care-gaps'),
};

// ─── External APIs (RxNorm, ICD-10, OpenFDA) ────────
// These try the backend proxy first, then fall back to direct NLM/FDA calls
async function tryProxyThenDirect(proxyPath, directUrl) {
  try {
    return await get(proxyPath);
  } catch {
    // Backend not available — call NLM/FDA directly from browser
    const res = await fetch(directUrl);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }
}

export const rxnorm = {
  searchDrugs: async (search) => {
    try {
      return await get(`/external/rxnorm/drugs?search=${encodeURIComponent(search)}`);
    } catch {
      // Direct call to NLM RxNorm (CORS-enabled, free)
      const res = await fetch(`https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(search)}&maxEntries=15`);
      if (!res.ok) throw new Error('RxNorm unavailable');
      const data = await res.json();
      return (data?.approximateGroup?.candidate || []).slice(0, 15).map(c => ({
        rxcui: c.rxcui, name: c.name || `RXCUI:${c.rxcui}`, tty: c.tty || '',
      }));
    }
  },
  getStrengths: (rxcui) => get(`/external/rxnorm/strengths/${rxcui}`),
  checkInteractions: (rxcuis) => get(`/external/rxnorm/interactions?rxcuis=${encodeURIComponent(rxcuis)}`),
};

export const icd10 = {
  search: async (search) => {
    try {
      return await get(`/external/icd10/search?search=${encodeURIComponent(search)}`);
    } catch {
      // Direct call to NLM Clinical Tables (CORS-enabled, free)
      const res = await fetch(`https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(search)}&maxList=25`);
      if (!res.ok) throw new Error('ICD-10 unavailable');
      const data = await res.json();
      const codes = data[1] || [];
      const display = data[3] || [];
      return codes.map((code, i) => ({ code, description: display[i]?.[1] || display[i] || '' }));
    }
  },
};

export const openfda = {
  drugLabel: (search) => get(`/external/openfda/drug-label?search=${encodeURIComponent(search)}`),
};

// NPPES pharmacy search — backend proxy (CMS blocks browser CORS).
// Returns { results, total, hasMore, skip }
// NPI Registry pharmacy taxonomy codes
export const PHARMACY_SUBTYPES = {
  '3336C0003X': 'Pharmacy',
  '3336C0002X': 'Clinic Pharmacy',
  '3336C0004X': 'Compounding Pharmacy',
  '3336M0002X': 'Mail Order Pharmacy',
};

// Nearest pharmacies by patient ZIP — sorted by Haversine distance
export const nearbyPharmacies = (zip) =>
  get(`/pharmacies/near/${encodeURIComponent(zip)}`).catch(() => ({ results: [] }));

// Nearest labs by patient ZIP — sorted by Haversine distance
export const nearbyLabs = (zip) =>
  get(`/lab-facilities/near/${encodeURIComponent(zip)}`).catch(() => ({ results: [] }));

export const LAB_SUBTYPES = {
  '291U00000X': 'Clinical Lab',
  '261QH0100X': 'Hospital Lab',
  '261QR0200X': 'Radiology',
  '291900000X': 'Military Lab',
};

export const nppes = {
  // search — ?search=name|zip|npi  &city=  &state=  &skip=  &subtype=3336C0003X,3336M0002X
  searchPharmacies: async ({ search = '', city = '', state = '', skip = 0, subtype = '' } = {}) => {
    const params = new URLSearchParams();
    if (search)  params.set('search',  search);
    if (city)    params.set('city',    city);
    if (state)   params.set('state',   state);
    if (skip)    params.set('skip',    String(skip));
    if (subtype) params.set('subtype', subtype);
    try {
      const data = await get(`/external/nppes/pharmacies?${params}`);
      if (Array.isArray(data)) return { results: data, total: data.length, hasMore: false, skip: 0 };
      return data || { results: [], total: 0, hasMore: false, skip: 0 };
    } catch {
      return { results: [], total: 0, hasMore: false, skip: 0 };
    }
  },

  searchLabs: async ({ search = '', city = '', state = '', skip = 0 } = {}) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (city)   params.set('city',   city);
    if (state)  params.set('state',  state);
    if (skip)   params.set('skip',   String(skip));
    try {
      const data = await get(`/external/nppes/labs?${params}`);
      if (Array.isArray(data)) return { results: data, total: data.length, hasMore: false, skip: 0 };
      return data || { results: [], total: 0, hasMore: false, skip: 0 };
    } catch {
      return { results: [], total: 0, hasMore: false, skip: 0 };
    }
  },
};

// ─── Locations ───────────────────────────────────────
export const locations = {
  list: () => get('/locations'),
  create: (data) => post('/locations', data),
  update: (id, data) => put(`/locations/${id}`, data),
  remove: (id) => del(`/locations/${id}`),
};

// ─── DoseSpot ePrescribing ────────────────────────────
export const dosespot = {
  status:              ()              => get('/dosespot/status'),
  prescriberStatus:    ()              => get('/dosespot/prescriber-status'),
  getSsoUrl:           (patientId)     => get(`/dosespot/sso${patientId ? `?patientId=${patientId}` : ''}`),
  getNotifications:    ()              => get('/dosespot/notifications'),
  getPatientRx:        (patientId)     => get(`/dosespot/patients/${patientId}/prescriptions`),
  syncPatient:         (patientId)     => post(`/dosespot/patients/${patientId}/sync`, {}),
  enrollPrescriber:    (userId, body)  => put(`/dosespot/prescribers/${userId}/enroll`, body),
  unenrollPrescriber:  (userId)        => del(`/dosespot/prescribers/${userId}/enroll`),
};

// ─── Provider Signatures ───────────────────────────
// Server-side storage for electronic signatures, indexed by provider ID.
// Endpoint: /provider-signatures/{providerId}
export const providerSignatures = {
  // GET /provider-signatures/{providerId}
  // Returns { signature: dataUrl|null, uploadedAt: ISO string|null, providerId }
  get: (providerId) => get(`/provider-signatures/${providerId}`),

  // PUT /provider-signatures/{providerId}
  // Payload: { signature: dataUrl }
  // Returns { signature: dataUrl, uploadedAt: ISO string, providerId }
  update: (providerId, dataUrl) => put(`/provider-signatures/${providerId}`, { signature: dataUrl }),
};

// ─── Users (admin) ─────────────────────────────────
export const users = {
  list: () => get('/users'),
  directory: () => get('/users/directory'),
  create: (data) => post('/users', data),
  update: (id, data) => put(`/users/${id}`, data),
  remove: (id) => del(`/users/${id}`),
  resetPassword: (id, newPassword, elevatedToken) => request(`/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
    ...(elevatedToken && { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${elevatedToken}` } }),
  }),
  unlock: (id) => post(`/users/${id}/unlock`, {}),
};

export const admin = {
  users,
  locations,
};

// ─── Audit Log ───────────────────────────────────────
export const security = {
  events:  (limit = 100, action) => get(`/security/events?limit=${limit}${action ? `&action=${action}` : ''}`),
  summary: () => get('/security/summary'),
};

export const auditLog = {
  list: (params) => get(`/audit-log?${new URLSearchParams(params)}`),
  forPatient: (patientId, params) => get(`/audit-log/patient/${patientId}?${new URLSearchParams(params || {})}`),
  forUser: (userId, params) => get(`/audit-log/user/${userId}?${new URLSearchParams(params || {})}`),
};

// ─── Document Generation ─────────────────────────────
export const documents = {
  progressNote: (encounterId, patientId) => post('/documents/progress-note', { encounterId, patientId }),
  prescription: (medicationId, patientId) => post('/documents/prescription', { medicationId, patientId }),
  patientSummary: (patientId) => post('/documents/patient-summary', { patientId }),
  dischargeSummary: (data) => post('/documents/discharge-summary', data),
};

// ─── Treatment Plans ────────────────────────────────
export const treatmentPlans = {
  list: (params) => get(`/treatment-plans?${new URLSearchParams(params || {})}`),
  get: (id) => get(`/treatment-plans/${id}`),
  create: (data) => post('/treatment-plans', data),
  update: (id, data) => request(`/treatment-plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addGoal: (planId, data) => post(`/treatment-plans/${planId}/goals`, data),
  updateGoal: (planId, goalId, data) => request(`/treatment-plans/${planId}/goals/${goalId}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Secure Notes ────────────────────────────────────
export const secureNotes = {
  list: (params) => get(`/secure-notes?${new URLSearchParams(params || {})}`),
  create: (data) => post('/secure-notes', data),
  update: (id, data) => request(`/secure-notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id) => del(`/secure-notes/${id}`),
};

// ─── FHIR R4 API ────────────────────────────────────
export const fhir = {
  metadata: () => get('/fhir/metadata'),
  // Patient
  searchPatients: (params) => get(`/fhir/Patient?${new URLSearchParams(params)}`),
  getPatient: (id) => get(`/fhir/Patient/${id}`),
  // Encounter
  searchEncounters: (params) => get(`/fhir/Encounter?${new URLSearchParams(params)}`),
  getEncounter: (id) => get(`/fhir/Encounter/${id}`),
  // Observation (vitals + assessments)
  searchObservations: (params) => get(`/fhir/Observation?${new URLSearchParams(params)}`),
  // Condition (problem list)
  searchConditions: (params) => get(`/fhir/Condition?${new URLSearchParams(params)}`),
  getCondition: (id) => get(`/fhir/Condition/${id}`),
  // MedicationStatement
  searchMedicationStatements: (params) => get(`/fhir/MedicationStatement?${new URLSearchParams(params)}`),
  // AllergyIntolerance
  searchAllergyIntolerances: (params) => get(`/fhir/AllergyIntolerance?${new URLSearchParams(params)}`),
};

// ─── Prior Authorizations ────────────────────────────
export const priorAuths = {
  list:   (params = {}) => get(`/prior-auths?${new URLSearchParams(params)}`),
  create: (data)        => post('/prior-auths', data),
  update: (id, data)    => put(`/prior-auths/${id}`, data),
  remove: (id)          => del(`/prior-auths/${id}`),
};

// ─── Patient Recalls ─────────────────────────────────
export const patientRecalls = {
  list:   (params = {}) => get(`/patient-recalls?${new URLSearchParams(params)}`),
  create: (data)        => post('/patient-recalls', data),
  update: (id, data)    => put(`/patient-recalls/${id}`, data),
  remove: (id)          => del(`/patient-recalls/${id}`),
};

// ─── Education Resources ─────────────────────────────
export const educationResources = {
  list:     (params = {}) => get(`/education-resources?${new URLSearchParams(params)}`),
  create:   (data)        => post('/education-resources', data),
  download: (id)          => post(`/education-resources/${id}/download`, {}),
  remove:   (id)          => del(`/education-resources/${id}`),
};

// ─── Lab Order Tracking ──────────────────────────────
export const labTracking = {
  list:   (params = {}) => get(`/lab-tracking?${new URLSearchParams(params)}`),
  update: (id, data)    => put(`/lab-tracking/${id}`, data),
};

// ─── Pharmacy Directory (NCPDP / DoseSpot) ───────────
export const pharmacies = {
  search:  (params = {}) => get(`/pharmacies?${new URLSearchParams(params)}`),
  recent:  ()            => get('/pharmacies/recent'),
  getById: (ncpdpId)     => get(`/pharmacies/${ncpdpId}`),
  lookup:  (ncpdpId)     => post('/pharmacies/lookup', { ncpdpId }),
};

// ─── Patient Chart Status ────────────────────────────
export const patientStatus = {
  get:  (patientId)       => get(`/patient-status/${patientId}`),
  save: (patientId, data) => put(`/patient-status/${patientId}`, data),
};

// ─── Superbill Statuses ──────────────────────────────
export const superbills = {
  getStatuses:  ()                        => get('/superbills/statuses'),
  saveStatus:   (encounterId, data)       => put(`/superbills/status/${encounterId}`, data),
};

// ─── Refill Queue ────────────────────────────────────
export const refillQueue = {
  getAll:          ()                     => get('/refills'),
  create:          (data)                 => post('/refills', data),
  updateStatus:    (id, status, metadata) => patch(`/refills/${id}/status`, { status, metadata }),
  updatePharmacy:  (id, data)             => patch(`/refills/${id}/pharmacy`, data),
  remove:          (id)                   => del(`/refills/${id}`),
  sendToPharmacy:  (id, data)             => post(`/refills/${id}/send-to-pharmacy`, data),
  verifyInsurance: (id)                   => post(`/refills/${id}/verify-insurance`, {}),
};
