import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { auth as authApi, setToken } from '../services/api';
// Fallback to mock data if backend is unavailable
import { users as mockUsers } from '../data/mockData';

const AuthContext = createContext(null);

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity timeout

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('unknown'); // 'backend' | 'mock'
  const epcsOTPRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // ── Session Timeout Management ────────────────────────
  const resetSessionTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const logout = useCallback(async () => {
    try {
      if (localStorage.getItem('ehr_token')) {
        await authApi.logout?.().catch(() => {});
      }
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
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('ehr_token');
      if (!token) { setLoading(false); return; }
      try {
        const data = await authApi.me();
        const user = data.user;
        const mockUser = mockUsers.find(u => u.id === user.id || u.username === user.username);
        const enriched = {
          ...user,
          name: user.name || `${user.firstName} ${user.lastName || ''}`.trim(),
          epcsPin: mockUser?.epcsPin || null,
          photo: mockUser?.photo || null,
        };
        setCurrentUser(enriched);
        setIsAuthenticated(true);
        setAuthMode('backend');
      } catch {
        setToken(null);
      }
      setLoading(false);
    };
    restoreSession();
  }, []);

  // ── Login ─────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    setLoginError('');
    // Try backend auth first
    try {
      const data = await authApi.login(username, password);
      setToken(data.token);
      const user = data.user;
      const mockUser = mockUsers.find(u => u.id === user.id || u.username === user.username);
      const enriched = {
        ...user,
        name: user.name || `${user.firstName} ${user.lastName || ''}`.trim(),
        epcsPin: mockUser?.epcsPin || null,
        photo: mockUser?.photo || null,
      };
      setCurrentUser(enriched);
      setIsAuthenticated(true);
      setAuthMode('backend');
      lastActivityRef.current = Date.now();
      return true;
    } catch (backendErr) {
      console.warn('Backend auth failed, trying mock fallback:', backendErr.message);
    }
    // Fallback to mock data (development only)
    const user = mockUsers.find(
      (u) => u.username === username && u.password === password
    );
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      setAuthMode('mock');
      lastActivityRef.current = Date.now();
      return true;
    }
    setLoginError('Invalid username or password');
    return false;
  }, []);

  // ── EPCS PIN Verification ─────────────────────────────
  const verifyEPCS = useCallback(
    async (pin) => {
      if (!currentUser) return false;
      if (authMode === 'backend') {
        try {
          const result = await authApi.verifyEpcsPin(pin);
          return result.valid;
        } catch { /* fall through */ }
      }
      return currentUser.epcsPin === pin;
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
      } catch { /* fall through */ }
    }
    const record = epcsOTPRef.current;
    if (!record) return false;
    if (Date.now() > record.expiry) { epcsOTPRef.current = null; return false; }
    const ok = record.code === String(input).trim();
    if (ok) epcsOTPRef.current = null;
    return ok;
  }, [authMode]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg, #f8fafc)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🧠</div>
          <p style={{ color: '#64748b', fontSize: 14 }}>Loading Clarity EHR…</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        loginError,
        authMode,
        login,
        logout,
        verifyEPCS,
        generateEPCSOTP,
        verifyEPCSOTP,
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
