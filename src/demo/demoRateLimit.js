/**
 * Clarity EHR — Demo Rate Limiter & Session Logger
 *
 * Tracks demo tenant activity:
 *   - Requests per minute (soft cap: 60 RPM)
 *   - Blocked endpoint attempts
 *   - Page navigation events
 *   - Session duration
 *   - Feature engagement (which pages/features viewed)
 *
 * All data stored in sessionStorage — cleared when browser tab closes.
 * Optionally POSTs a summary to an analytics endpoint on exit.
 */

const RATE_LIMIT_RPM = 60;           // max requests per minute
const RATE_WINDOW_MS = 60_000;       // 1 minute window
const SESSION_KEY    = 'clarity_demo_session';
const ANALYTICS_URL  = null;         // set to your endpoint e.g. 'https://analytics.clarity-ehr.com/demo'

// ── Session state ─────────────────────────────────────────────────────────────
function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : createSession();
  } catch {
    return createSession();
  }
}

function saveSession(session) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* noop */ }
}

function createSession() {
  const session = {
    id: Math.random().toString(36).slice(2, 10),
    startedAt: Date.now(),
    requestCount: 0,
    blockedCount: 0,
    pagesVisited: [],
    featuresUsed: [],
    blockedAttempts: [],
    requestWindow: [],   // timestamps for rate limiting
    lastActivity: Date.now(),
  };
  saveSession(session);
  return session;
}

// ── Rate limiter ──────────────────────────────────────────────────────────────
const checkRequest = (path) => {
  const session = getSession();
  const now = Date.now();

  // Slide the window
  session.requestWindow = session.requestWindow.filter(t => now - t < RATE_WINDOW_MS);
  const rpm = session.requestWindow.length;

  if (rpm >= RATE_LIMIT_RPM) {
    const oldest = session.requestWindow[0];
    const retryAfter = Math.ceil((oldest + RATE_WINDOW_MS - now) / 1000);
    saveSession(session);
    return { allowed: false, retryAfter, rpm };
  }

  session.requestWindow.push(now);
  session.requestCount++;
  session.lastActivity = now;
  saveSession(session);
  return { allowed: true, rpm: rpm + 1 };
};

// ── Event loggers ─────────────────────────────────────────────────────────────
const logBlocked = (path, method) => {
  const session = getSession();
  session.blockedCount++;
  session.blockedAttempts.push({ path, method, at: Date.now() });
  // Keep last 20 only
  if (session.blockedAttempts.length > 20) session.blockedAttempts.shift();
  saveSession(session);
};

const logNavigation = (path) => {
  const session = getSession();
  const last = session.pagesVisited[session.pagesVisited.length - 1];
  if (last?.path !== path) {
    session.pagesVisited.push({ path, at: Date.now() });
    if (session.pagesVisited.length > 50) session.pagesVisited.shift();
    session.lastActivity = Date.now();
    saveSession(session);
  }
};

const logFeature = (feature) => {
  const session = getSession();
  if (!session.featuresUsed.includes(feature)) {
    session.featuresUsed.push(feature);
    saveSession(session);
  }
};

// ── Session summary (for display in DemoBar) ──────────────────────────────────
const getSummary = () => {
  const session = getSession();
  const durationMs = Date.now() - session.startedAt;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return {
    sessionId: session.id,
    duration: `${minutes}m ${seconds}s`,
    pagesVisited: session.pagesVisited.length,
    requestCount: session.requestCount,
    blockedCount: session.blockedCount,
    featuresUsed: session.featuresUsed,
    uniquePages: [...new Set(session.pagesVisited.map(p => p.path))],
  };
};

// ── Send summary on demo exit (if analytics endpoint configured) ─────────────
const sendExitSummary = () => {
  if (!ANALYTICS_URL) return;
  const summary = getSummary();
  const session = getSession();
  const payload = { ...summary, blockedAttempts: session.blockedAttempts };
  // Use sendBeacon for reliability on page unload
  if (navigator.sendBeacon) {
    navigator.sendBeacon(ANALYTICS_URL, JSON.stringify(payload));
  } else {
    fetch(ANALYTICS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => { /* noop */ });
  }
};

// ── Clear session on demo exit ────────────────────────────────────────────────
const clearSession = () => {
  sendExitSummary();
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
};

export const demoRateLimit = {
  checkRequest,
  logBlocked,
  logNavigation,
  logFeature,
  getSummary,
  clearSession,
  getSession,
};
