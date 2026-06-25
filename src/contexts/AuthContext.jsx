import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { auth as authApi, setToken } from '../services/api';
import { users as mockUsers } from '../data/mockData';
import { getProviderSignature, saveProviderSignatureLocal, fetchProviderSignatureFromBackend, saveProviderSignatureToBackend } from '../utils/providerSignature';

const AuthContext = createContext(null);

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity timeout

/** Attach the provider's stored signature to the user object at login time.
 *  Reads from localStorage first (fastest), then fetches from backend
 *  asynchronously to refresh the cache.
 */
function withSignature(user) {
  return { ...user, signature: getProviderSignature(user.id) };
}

/** After login, fetch signature from backend asynchronously (non-blocking).
 *  If backend returns a signature, update currentUser with the fresh copy.
 *  This keeps the localStorage cache in sync with the backend source of truth.
 */
async function hydrateSignatureFromBackend(user, setCurrentUser) {
  if (!user?.id) return;
  try {
    const sig = await fetchProviderSignatureFromBackend(user.id);
    setCurrentUser(prev => ({ ...prev, signature: sig || null }));
  } catch { /* silently ignore — localStorage version is still available */ }
}

const LOADING_MESSAGES = [
  'Checking your session…',
  'Connecting to server…',
  'Loading your workspace…',
  'Verifying credentials…',
  'Almost ready…',
];

function AppLoadingScreen() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [tooLong, setTooLong] = useState(false);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length);
    }, 2200);
    const slowTimer = setTimeout(() => setTooLong(true), 8000);
    return () => { clearInterval(msgTimer); clearTimeout(slowTimer); };
  }, []);

  return (
    <div className="app-loading-screen" role="status" aria-live="polite" aria-label="Loading Clarity EHR">
      <div className="app-loading-inner">
        <div className="app-loading-logo" aria-hidden="true">🧠</div>
        <div className="app-loading-spinner" aria-hidden="true" />
        <div className="app-loading-progress-track" aria-hidden="true">
          <div className="app-loading-progress-bar" />
        </div>
        <p className="app-loading-msg" key={msgIndex}>{LOADING_MESSAGES[msgIndex]}</p>

        {tooLong && (
          <div className="app-loading-slow" role="alert">
            <strong>⚠️ Taking longer than expected</strong>
            This may be due to a slow connection or a temporary server issue.
            {' '}<a href="https://status.clarity-ehr.com" target="_blank" rel="noopener noreferrer">
              Check system status ↗
            </a>
            <div className="app-loading-slow-actions">
              <button onClick={() => window.location.reload()} className="primary" aria-label="Reload the application">
                ↺ Reload
              </button>
              <button onClick={() => window.location.href = '/patient-portal-login'} aria-label="Go to patient portal instead">
                Patient Portal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);          // unused blocker — kept for safety
  const [sessionChecking, setSessionChecking] = useState(true); // background session probe
  const [authMode, setAuthMode] = useState('unknown'); // 'backend' | 'mock'
  const [serverDown, setServerDown] = useState(false); // true when API is unreachable at boot
  const epcsOTPRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const sessionControllerRef = useRef(null);   // AbortController for the boot-time /auth/me probe

  // Gives the login page an escape hatch — abort the session probe and go straight to login.
  const cancelSessionCheck = useCallback(() => {
    sessionControllerRef.current?.abort();
    setSessionChecking(false);
  }, []);

  // ── Session Timeout Management ────────────────────────
  const resetSessionTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout?.().catch(() => {});
    } catch { /* ok */ }
    setToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
    setAuthMode('unknown');
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetSessionTimer, { passive: true }));
    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current > SESSION_TIMEOUT_MS) {
        console.warn('Session timed out due to inactivity');
        logout();
      }
    }, 60000);
    return () => {
      events.forEach(e => window.removeEventListener(e, resetSessionTimer));
      clearInterval(interval);
    };
  }, [isAuthenticated, resetSessionTimer, logout]);

  // ── Restore Session on Mount ──────────────────────────
  // Runs in the background — login page is immediately interactive.
  // Auto-times-out after 2.5 s. User can also cancel via cancelSessionCheck().
  useEffect(() => {
    const controller = new AbortController();
    sessionControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const restoreSession = async () => {
      try {
        let data;
        try {
          data = await authApi.me({ signal: controller.signal });
        } catch (firstErr) {
          // Access token may be expired — try refreshing before giving up
          if (firstErr.status === 401) {
            const refreshed = await authApi.refresh();
            if (refreshed) {
              data = await authApi.me({ signal: controller.signal });
            } else {
              throw firstErr;
            }
          } else {
            throw firstErr;
          }
        }
        const user = data.user;
        const enriched = {
          ...user,
          name: user.name || `${user.firstName} ${user.lastName || ''}`.trim(),
        };
        const userWithSig = withSignature(enriched);
        setCurrentUser(userWithSig);
        setIsAuthenticated(true);
        setAuthMode('backend');
        // Fetch signature from backend asynchronously to refresh cache
        hydrateSignatureFromBackend(userWithSig, setCurrentUser);
      } catch (err) {
        const isAborted = err.name === 'AbortError' || err.name === 'TimeoutError';
        if (!isAborted) {
          if (err.code === 'network' || (err.status && err.status >= 500)) {
            setServerDown(true);
          }
        }
        setToken(null);
      } finally {
        clearTimeout(timeoutId);
        setSessionChecking(false);
      }
    };

    restoreSession();
    return () => { clearTimeout(timeoutId); controller.abort(); };
  }, []);

  // ── Login ─────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    setLoginError('');
    // Try backend auth first
    try {
      const data = await authApi.login(username, password);
      if (data.requiresMfa) {
        return { ok: false, requiresMfa: true, tempToken: data.tempToken, emailHint: data.emailHint, mockCode: data.mockCode };
      }
      const user = data.user;
      const enriched = {
        ...user,
        name: user.name || `${user.firstName} ${user.lastName || ''}`.trim(),
      };
      const userWithSig = withSignature(enriched);
      setCurrentUser(userWithSig);
      setIsAuthenticated(true);
      setAuthMode('backend');
      lastActivityRef.current = Date.now();
      // Fetch signature from backend asynchronously to refresh cache
      hydrateSignatureFromBackend(userWithSig, setCurrentUser);
      return { ok: true, mustChangePassword: !!enriched.mustChangePassword };
    } catch (backendErr) {
      const code = backendErr.code || 'client';
      // Offline fallback: try mock users when server is unreachable
      if (code === 'network') {
        const mockUser = mockUsers.find(
          u => u.username === username && u.password === password
        );
        if (mockUser) {
          const { password: _pw, epcsPin: _pin, ...safeUser } = mockUser;
          const enriched = {
            ...safeUser,
            name: safeUser.name || `${safeUser.firstName} ${safeUser.lastName || ''}`.trim(),
          };
          const userWithSig = withSignature(enriched);
          setCurrentUser(userWithSig);
          setIsAuthenticated(true);
          setAuthMode('mock');
          setServerDown(true);
          lastActivityRef.current = Date.now();
          // Attempt to fetch signature from backend asynchronously (non-blocking on offline)
          hydrateSignatureFromBackend(userWithSig, setCurrentUser);
          return { ok: true, mustChangePassword: !!enriched.mustChangePassword };
        }
        setLoginError('Unable to reach the Clarity EHR server. The service may be temporarily unavailable.');
      } else if (code === 'server') {
        setLoginError(`Server error (${backendErr.status || 500}). Please try again or check system status.`);
      } else {
        setLoginError(backendErr.message || 'Invalid username or password');
      }
      return { ok: false, errorCode: code };
    }
  }, []);

  // ── Demo Login — always uses mock, ignores backend/2FA ──────────────────
  const loginDemo = useCallback((username, password) => {
    const mockUser = mockUsers.find(u => u.username === username && u.password === password);
    if (!mockUser) return { ok: false };
    const { password: _pw, epcsPin: _pin, ...safeUser } = mockUser;
    const enriched = {
      ...safeUser,
      name: safeUser.name || `${safeUser.firstName} ${safeUser.lastName || ''}`.trim(),
    };
    const userWithSig = withSignature(enriched);
    setCurrentUser(userWithSig);
    setIsAuthenticated(true);
    setAuthMode('mock');
    lastActivityRef.current = Date.now();
    // Attempt to fetch signature from backend asynchronously (non-blocking on demo)
    hydrateSignatureFromBackend(userWithSig, setCurrentUser);
    return { ok: true, mustChangePassword: !!enriched.mustChangePassword };
  }, []);

  // ── Complete Two-Factor Login ─────────────────────────
  const completeTwoFactor = useCallback(async (tempToken, code) => {
    try {
      const data = await authApi.verify2FA(tempToken, code);
      const user = data.user;
      const enriched = {
        ...user,
        name: user.name || `${user.firstName} ${user.lastName || ''}`.trim(),
      };
      const userWithSig = withSignature(enriched);
      setCurrentUser(userWithSig);
      setIsAuthenticated(true);
      setAuthMode('backend');
      lastActivityRef.current = Date.now();
      // Fetch signature from backend asynchronously to refresh cache
      hydrateSignatureFromBackend(userWithSig, setCurrentUser);
      return { ok: true, mustChangePassword: !!enriched.mustChangePassword };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }, []);

  // ── EPCS PIN Verification ─────────────────────────────
  const verifyEPCS = useCallback(
    async (pin) => {
      if (!currentUser) return false;
      if (authMode === 'backend') {
        try {
          const result = await authApi.verifyEpcsPin(pin);
          return result.valid;
        } catch {
          return false; // Don't fall back to mock on backend failure
        }
      }
      return false;
    },
    [currentUser, authMode]
  );

  const generateEPCSOTP = useCallback(async () => {
    if (authMode === 'backend') {
      try {
        const result = await authApi.generateEpcsOtp();
        return result.otp;
      } catch { /* fall through */ }
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    epcsOTPRef.current = { code, expiry: Date.now() + 30000 };
    return code;
  }, [authMode]);

  const verifyEPCSOTP = useCallback(async (input) => {
    if (authMode === 'backend') {
      try {
        const result = await authApi.verifyEpcsOtp(input);
        return result.valid;
      } catch {
        return false; // Don't fall back to mock on backend failure
      }
    }
    const record = epcsOTPRef.current;
    if (!record) return false;
    if (Date.now() > record.expiry) { epcsOTPRef.current = null; return false; }
    const ok = record.code === String(input).trim();
    if (ok) epcsOTPRef.current = null;
    return ok;
  }, [authMode]);

  // ── Change Password ────────────────────────────────────
  const changePassword = useCallback(async (currentPw, newPw) => {
    if (authMode === 'backend') {
      await authApi.changePassword(currentPw, newPw);
    } else {
      // Offline / mock mode — verify current password against stored mock user
      const stored = mockUsers.find(u => u.username === currentUser?.username);
      if (!stored || stored.password !== currentPw) {
        throw new Error('Current password is incorrect');
      }
      // Persist the new password in the in-memory mock list so re-login works
      stored.password = newPw;
      // Also update clarity_demo_users in localStorage if present
      try {
        const raw = localStorage.getItem('clarity_demo_users');
        if (raw) {
          const list = JSON.parse(raw);
          const idx = list.findIndex(u => u.username === currentUser?.username);
          if (idx !== -1) { list[idx].mustChangePassword = false; localStorage.setItem('clarity_demo_users', JSON.stringify(list)); }
        }
      } catch { /* ignore */ }
    }
    setCurrentUser(prev => ({ ...prev, mustChangePassword: false }));
  }, [authMode, currentUser]);

  // ── Refresh current user (called after password change) ──
  const refreshUser = useCallback(async () => {
    try {
      const data = await authApi.me();
      if (data.user) {
        setCurrentUser(prev => ({ ...prev, ...data.user, mustChangePassword: !!data.user.mustChangePassword }));
      }
    } catch { /* session expired — logout will handle it */ }
  }, []);

  // ── Update provider signature ──────────────────────────────
  // Tries to save to backend first, falls back to localStorage.
  // Updates currentUser.signature in memory so all prescribing components
  // see the new signature immediately.
  const updateUserSignature = useCallback(async (dataUrl) => {
    if (!currentUser?.id) return;
    // Update in-memory immediately (optimistic)
    setCurrentUser(prev => ({ ...prev, signature: dataUrl || null }));
    // Then persist to backend (non-blocking)
    await saveProviderSignatureToBackend(currentUser.id, dataUrl);
  }, [currentUser?.id]);

  // Never block the entire render with a full-screen overlay.
  // Login page renders immediately; ProtectedLayout waits on sessionChecking.

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        sessionChecking,
        cancelSessionCheck,
        loginError,
        authMode,
        serverDown,
        clearLoginError: () => setLoginError(''),
        login,
        loginDemo,
        logout,
        refreshUser,
        changePassword,
        completeTwoFactor,
        verifyEPCS,
        generateEPCSOTP,
        verifyEPCSOTP,
        updateUserSignature,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
