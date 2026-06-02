import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../demo/DemoContext';
import { DEMO_USER } from '../demo/demoData';
import SystemStatus from '../components/SystemStatus';

const CERTS = ['HIPAA', 'EPCS', 'ONC', '42 CFR Part 2'];

const DEMO_ACCOUNTS = [
  { role: 'Prescriber',   username: 'dr.danso',    password: 'Pass123!', name: 'Dr. Danso',      icon: '🩺', color: '#3b82f6', desc: 'Full clinical access — notes, e-prescribe, charts' },
  { role: 'Therapist',    username: 'april.t',     password: 'Pass123!', name: 'April T., LCSW',    icon: '🧠', color: '#8b5cf6', desc: 'Therapy sessions, treatment plans, assessments' },
  { role: 'Nurse / MA',   username: 'nurse.kelly', password: 'Pass123!', name: 'Kelly Chen, RN',    icon: '💉', color: '#10b981', desc: 'Vitals, triage, medication reconciliation' },
  { role: 'Front Desk',   username: 'baz',         password: 'Pass123!', name: 'Baz',               icon: '🗓️', color: '#f59e0b', desc: 'Scheduling, check-in, patient registration' },
  { role: 'Biller',       username: 'biller1',     password: 'Pass123!', name: 'Sandra Okonkwo',    icon: '💳', color: '#ec4899', desc: 'Claims, ERA posting, denial management' },
  { role: 'Admin',        username: 'harriet',     password: 'Pass123!', name: 'Harriet Appiah',    icon: '⚙️', color: '#64748b', desc: 'Full system access — users, settings, analytics' },
];
const MAX_ATTEMPTS = 5;

const IconNetwork = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
);
const IconWarning = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);
const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
);

function getErrorConfig(msg) {
  if (!msg) return null;
  if (msg.includes('reach server') || msg.includes('internet connection') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return { type: 'network', icon: <IconNetwork />, title: 'Cannot reach server', canRetry: true };
  }
  if (msg.includes('Server error') || msg.includes('500') || msg.includes('502') || msg.includes('503')) {
    return { type: 'server', icon: <IconWarning />, title: 'Server error', canRetry: true };
  }
  return { type: 'credentials', icon: <IconLock />, title: 'Sign-in failed', canRetry: false };
}

export default function LoginPage() {
  const { login, loginDemo, completeTwoFactor, changePassword: authChangePassword,
          loginError, clearLoginError, serverDown,
          sessionChecking, cancelSessionCheck } = useAuth();
  const navigate = useNavigate();

  // Track how many seconds the session probe has been running
  const [checkElapsed, setCheckElapsed] = useState(0);
  useEffect(() => {
    if (!sessionChecking) { setCheckElapsed(0); return; }
    const t0 = Date.now();
    const id = setInterval(() => setCheckElapsed(Math.round((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(id);
  }, [sessionChecking]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [showPassword, setShowPassword] = useState(false);  // password visibility toggle
  const [shakeForm, setShakeForm] = useState(false);        // error shake animation
  const [fieldErrors, setFieldErrors] = useState({});       // inline empty-field errors
  const usernameRef = useRef(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('login-theme') === 'dark');
  const [showDemo, setShowDemo] = useState(false);
  const [demoLoading, setDemoLoading] = useState(null);
  const { startDemo } = useDemo();

  const handleDemoLogin = (account) => {
    setDemoLoading(account.username);
    clearLoginError();
    setFieldErrors({});
    const result = loginDemo(account.username, account.password);
    if (result?.ok) {
      navigate('/dashboard');
    }
    setDemoLoading(null);
  };

  const handleStartGuidedDemo = () => {
    setDemoLoading('guided');
    clearLoginError();
    const result = loginDemo('dr.danso', 'Pass123!');
    if (result?.ok) {
      startDemo();
      navigate('/dashboard');
    }
    setDemoLoading(null);
  };
  useEffect(() => {
    localStorage.setItem('login-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Shake and refocus on failure
  const triggerErrorShake = (focusId = 'login-username') => {
    setShakeForm(true);
    setTimeout(() => setShakeForm(false), 500);
    setTimeout(() => document.getElementById(focusId)?.focus(), 60);
  };
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFAError, setTwoFAError] = useState('');
  const [pendingTempToken, setPendingTempToken] = useState(null);
  const [emailHint, setEmailHint] = useState('');
  const [mockCode, setMockCode] = useState(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNext, setPwNext] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwDone, setPwDone] = useState(false);

  const pwRules = [
    { test: (p) => p.length >= 8,           label: 'At least 8 characters' },
    { test: (p) => /[A-Z]/.test(p),         label: 'One uppercase letter' },
    { test: (p) => /[0-9]/.test(p),         label: 'One number' },
    { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'One special character (recommended)' },
  ];
  const pwValid = pwRules.slice(0, 3).every(r => r.test(pwNext));
  const pwMatches = pwNext === pwConfirm;

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setPwError('');
    if (!pwValid)             return setPwError('Password does not meet the requirements below.');
    if (!pwMatches)           return setPwError('New passwords do not match.');
    if (pwNext === pwCurrent) return setPwError('New password must be different from your current password.');
    setPwSaving(true);
    try {
      await authChangePassword(pwCurrent, pwNext);
      setPwDone(true);
      setTimeout(() => navigate('/dashboard'), 1800);
    } catch (err) {
      setPwError(err.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side empty-field validation (Epic/athena pattern: instant inline feedback)
    const errs = {};
    if (!username.trim()) errs.username = 'Username is required';
    if (!password)        errs.password = 'Password is required';
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      triggerErrorShake(errs.username ? 'login-username' : 'login-password');
      return;
    }
    setFieldErrors({});

    setLoading(true);
    try {
      const result = await login(username, password);
      if (!result?.ok && !result?.requiresTwoFactor) {
        setLoginAttempts(a => a + 1);
        triggerErrorShake();
      }
      if (result?.requiresTwoFactor) {
        setPendingTempToken(result.tempToken);
        setEmailHint(result.emailHint || '');
        setMockCode(result.mockCode || null);
        setShow2FA(true);
        setLoading(false);
        return;
      }
      if (result?.ok) {
        if (result.mustChangePassword) { setShowPasswordChange(true); }
        else { navigate('/dashboard'); }
      }
    } catch (err) {
      console.error('Login error:', err);
    }
    setLoading(false);
  };

  const handle2FAVerify = async () => {
    setLoading(true);
    setTwoFAError('');
    const result = await completeTwoFactor(pendingTempToken, twoFactorCode);
    setLoading(false);
    if (result?.ok) {
      setShow2FA(false);
      setTwoFactorCode('');
      setPendingTempToken(null);
      if (result.mustChangePassword) { setShowPasswordChange(true); }
      else { navigate('/dashboard'); }
    } else {
      setTwoFAError(result?.error || 'Invalid code. Please try again.');
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    setForgotSent(true);
  };

  const closeForgotModal = () => {
    setShowForgotPassword(false);
    setForgotEmail('');
    setForgotSent(false);
  };

  return (
    <div className={`login-page${darkMode ? ' login-page--dark' : ''}`}>
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* ── Top Nav ── */}
      <nav className="login-topnav" aria-label="Application header">
        <div className="login-topnav-left">
          <svg className="login-topnav-logomark" width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <rect width="26" height="26" rx="7" fill="#0891b2"/>
            <rect x="11.5" y="6" width="3" height="14" rx="1.5" fill="white"/>
            <rect x="6" y="11.5" width="14" height="3" rx="1.5" fill="white"/>
          </svg>
          <span className="login-topnav-wordmark" aria-label="Clarity EHR">Clarity<span>EHR</span></span>
          <span className="login-version-pill" aria-label="Version 14.2">v14.2</span>
        </div>
        <div className="login-topnav-right">
          <div className="login-topnav-badges" aria-label="Compliance certifications">
            {CERTS.map(c => (
              <span key={c} className="login-topnav-cert">{c}</span>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Main Card ── */}
      <main className="login-main" id="main-content">
        <div className="login-card">

          {/* LEFT — Brand Panel */}
          <div className="login-brand-panel" aria-label="Clarity EHR information">
            <div className="login-brand-inner">
              <div className="login-brand-logo">
                <svg width="32" height="32" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                  <rect width="26" height="26" rx="7" fill="rgba(255,255,255,0.18)"/>
                  <rect x="11.5" y="6" width="3" height="14" rx="1.5" fill="white"/>
                  <rect x="6" y="11.5" width="14" height="3" rx="1.5" fill="white"/>
                </svg>
                <span>Clarity EHR</span>
              </div>

              <div className="product-frame" aria-hidden="true">
                <div className="product-frame-bar">
                  <span className="product-frame-dot" />
                  <span className="product-frame-dot" />
                  <span className="product-frame-dot" />
                  <span className="product-frame-url">clarity-ehr.com/dashboard</span>
                </div>
                <div className="product-frame-screen">
                <svg viewBox="0 0 280 218" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Orbit rings */}
                  <circle cx="140" cy="109" r="98" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
                  <circle cx="140" cy="109" r="72" stroke="rgba(255,255,255,0.09)" strokeWidth="1"/>
                  <circle cx="140" cy="109" r="46" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
                  {/* Dot mesh — top edge */}
                  <circle cx="20" cy="18" r="1.5" fill="rgba(255,255,255,0.18)"/>
                  <circle cx="56" cy="18" r="1.5" fill="rgba(255,255,255,0.15)"/>
                  <circle cx="92" cy="18" r="1.5" fill="rgba(255,255,255,0.12)"/>
                  <circle cx="140" cy="14" r="2" fill="rgba(255,255,255,0.22)"/>
                  <circle cx="188" cy="18" r="1.5" fill="rgba(255,255,255,0.12)"/>
                  <circle cx="224" cy="18" r="1.5" fill="rgba(255,255,255,0.15)"/>
                  <circle cx="260" cy="18" r="1.5" fill="rgba(255,255,255,0.18)"/>
                  {/* Dot mesh — bottom edge */}
                  <circle cx="20" cy="196" r="1.5" fill="rgba(255,255,255,0.18)"/>
                  <circle cx="56" cy="196" r="1.5" fill="rgba(255,255,255,0.15)"/>
                  <circle cx="92" cy="196" r="1.5" fill="rgba(255,255,255,0.12)"/>
                  <circle cx="140" cy="200" r="2" fill="rgba(255,255,255,0.22)"/>
                  <circle cx="188" cy="196" r="1.5" fill="rgba(255,255,255,0.12)"/>
                  <circle cx="224" cy="196" r="1.5" fill="rgba(255,255,255,0.15)"/>
                  <circle cx="260" cy="196" r="1.5" fill="rgba(255,255,255,0.18)"/>
                  {/* Dot mesh — left/right edges */}
                  <circle cx="14" cy="56" r="1.5" fill="rgba(255,255,255,0.13)"/>
                  <circle cx="14" cy="90" r="1.5" fill="rgba(255,255,255,0.13)"/>
                  <circle cx="14" cy="130" r="1.5" fill="rgba(255,255,255,0.13)"/>
                  <circle cx="14" cy="162" r="1.5" fill="rgba(255,255,255,0.13)"/>
                  <circle cx="266" cy="56" r="1.5" fill="rgba(255,255,255,0.13)"/>
                  <circle cx="266" cy="90" r="1.5" fill="rgba(255,255,255,0.13)"/>
                  <circle cx="266" cy="130" r="1.5" fill="rgba(255,255,255,0.13)"/>
                  <circle cx="266" cy="162" r="1.5" fill="rgba(255,255,255,0.13)"/>
                  {/* Dot mesh — inner scattered */}
                  <circle cx="54" cy="56" r="1.2" fill="rgba(255,255,255,0.1)"/>
                  <circle cx="226" cy="56" r="1.2" fill="rgba(255,255,255,0.1)"/>
                  <circle cx="54" cy="162" r="1.2" fill="rgba(255,255,255,0.1)"/>
                  <circle cx="226" cy="162" r="1.2" fill="rgba(255,255,255,0.1)"/>
                  {/* 4 data nodes at corners */}
                  <circle cx="38" cy="38" r="8" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.28)" strokeWidth="1"/>
                  <circle cx="38" cy="38" r="3" fill="rgba(255,255,255,0.75)"/>
                  <circle cx="242" cy="38" r="8" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.28)" strokeWidth="1"/>
                  <circle cx="242" cy="38" r="3" fill="rgba(255,255,255,0.75)"/>
                  <circle cx="38" cy="180" r="8" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.28)" strokeWidth="1"/>
                  <circle cx="38" cy="180" r="3" fill="rgba(255,255,255,0.75)"/>
                  <circle cx="242" cy="180" r="8" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.28)" strokeWidth="1"/>
                  <circle cx="242" cy="180" r="3" fill="rgba(255,255,255,0.75)"/>
                  {/* Dashed connector lines node → cross */}
                  <line x1="45" y1="44" x2="113" y2="100" stroke="rgba(255,255,255,0.13)" strokeWidth="1" strokeDasharray="4 4"/>
                  <line x1="235" y1="44" x2="167" y2="100" stroke="rgba(255,255,255,0.13)" strokeWidth="1" strokeDasharray="4 4"/>
                  <line x1="45" y1="174" x2="113" y2="118" stroke="rgba(255,255,255,0.13)" strokeWidth="1" strokeDasharray="4 4"/>
                  <line x1="235" y1="174" x2="167" y2="118" stroke="rgba(255,255,255,0.13)" strokeWidth="1" strokeDasharray="4 4"/>
                  {/* ECG pulse line */}
                  <polyline
                    points="14,109 50,109 58,91 64,128 70,109 77,101 81,117 85,109 126,109 134,79 144,139 150,109 196,109 204,93 212,125 218,109 266,109"
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Central cross — glow halo */}
                  <rect x="124" y="82" width="32" height="54" rx="8" fill="rgba(255,255,255,0.1)"/>
                  <rect x="107" y="99" width="66" height="20" rx="8" fill="rgba(255,255,255,0.1)"/>
                  {/* Central cross — solid */}
                  <rect x="128" y="86" width="24" height="46" rx="6" fill="white" fillOpacity="0.88"/>
                  <rect x="112" y="103" width="56" height="18" rx="6" fill="white" fillOpacity="0.88"/>
                  {/* Floating data chip — top left */}
                  <rect x="62" y="50" width="42" height="18" rx="5" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.22)" strokeWidth="0.75"/>
                  <circle cx="72" cy="59" r="2.5" fill="rgba(255,255,255,0.55)"/>
                  <rect x="78" y="56" width="20" height="2.5" rx="1.2" fill="rgba(255,255,255,0.35)"/>
                  <rect x="78" y="61" width="14" height="2.5" rx="1.2" fill="rgba(255,255,255,0.2)"/>
                  {/* Floating data chip — bottom right */}
                  <rect x="176" y="150" width="42" height="18" rx="5" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.22)" strokeWidth="0.75"/>
                  <circle cx="186" cy="159" r="2.5" fill="rgba(255,255,255,0.55)"/>
                  <rect x="192" y="156" width="20" height="2.5" rx="1.2" fill="rgba(255,255,255,0.35)"/>
                  <rect x="192" y="161" width="14" height="2.5" rx="1.2" fill="rgba(255,255,255,0.2)"/>
                </svg>
                </div>
              </div>

              <div className="login-brand-tagline">
                <h2>Clinical care,<br/>simplified.</h2>
                <p className="login-brand-designed-tagline">Clarity — Designed for healing</p>
                <p>HIPAA-compliant electronic health records for outpatient behavioral health.</p>
              </div>

              {/* brand pills removed — moved below form */}
            </div>
          </div>

          {/* RIGHT — Form Panel */}
          <div className="login-form-panel">
            <div className="login-form-inner">
              <div className="login-form-header">
                <div className="login-form-header-row">
                  <h1 className="login-form-title" id="signin-heading">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="login-form-title-icon"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Sign In
                  </h1>
                  <button
                    type="button"
                    className="login-theme-toggle"
                    onClick={() => setDarkMode(d => !d)}
                    aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    title={darkMode ? 'Light mode' : 'Dark mode'}
                  >
                    {darkMode ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                    )}
                  </button>
                </div>
                <p className="login-form-sub">Access your Clarity EHR workspace</p>
              </div>

              {/* Session check — dismissible, never blocks the form */}
              {sessionChecking && (
                <div className="session-check-banner" role="status" aria-live="polite" aria-label="Checking for active session">
                  <span className="session-check-spinner" aria-hidden="true" />
                  <span className="session-check-text">
                    Checking for an active session
                    {checkElapsed > 0 && (
                      <span className="session-check-elapsed" aria-label={`${checkElapsed} seconds elapsed`}> · {checkElapsed}s</span>
                    )}
                  </span>
                  <button
                    type="button"
                    className="session-check-skip"
                    onClick={cancelSessionCheck}
                    aria-label="Skip session check and sign in manually"
                  >
                    Sign in now →
                  </button>
                </div>
              )}

              {/* Error banner — only after a login attempt */}
              <div role="alert" aria-live="assertive" aria-atomic="true">
                {loginError && (() => {
                  const msg = loginError;
                  const cfg = getErrorConfig(msg);
                  return (
                    <div className={`login-error login-error--${cfg.type}`}>
                      <div className="login-error__header">
                        <span className="login-error__icon">{cfg.icon}</span>
                        <strong>{cfg.title}</strong>
                        <button
                          type="button"
                          className="login-error__dismiss"
                          onClick={clearLoginError}
                          aria-label="Dismiss error"
                        >✕</button>
                      </div>
                      <p className="login-error__msg">{msg}</p>
                      {loginAttempts > 0 && cfg.type === 'credentials' && (
                        <p className="login-error__attempts">
                          {loginAttempts} failed attempt{loginAttempts !== 1 ? 's' : ''}
                          {loginAttempts >= 3 && ` — account locks after ${MAX_ATTEMPTS}`}
                        </p>
                      )}
                      <div className="login-error__actions">
                        {cfg.canRetry && (
                          <button
                            type="button"
                            className="login-error__btn"
                            onClick={() => { clearLoginError(); document.getElementById('login-username')?.focus(); }}
                          >
                            Retry
                          </button>
                        )}
                        <a href="https://status.clarity-ehr.com" target="_blank" rel="noopener noreferrer" className="login-error__btn login-error__btn--ghost">
                          System status ↗
                        </a>
                        <a href="mailto:support@clarity-ehr.org" className="login-error__btn login-error__btn--ghost">
                          Contact IT
                        </a>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* System Notice — yellow alert bar above fields */}
              {serverDown && loginAttempts === 0 && !loginError && (
                <div className="login-server-note" role="alert" aria-live="polite">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span className="login-server-note-label">⚠ System Notice</span>
                    <span style={{ fontSize: 10, color: '#92400e', opacity: 0.7 }}>
                      Updated {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <span>The server is currently experiencing delays. You may still attempt to sign in.</span>
                  <a href="https://status.clarity-ehr.com" target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, fontWeight: 700, color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                    View system status →
                  </a>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                autoComplete="on"
                aria-labelledby="signin-heading"
                noValidate
                className={shakeForm ? 'login-form--shake' : undefined}
                style={{ marginTop: 16 }}
              >
                {/* Username — floating label */}
                <div className="lf-group">
                  <div className={`lf-float-wrapper${username ? ' has-value' : ''}${fieldErrors.username ? ' has-error' : ''}`}>
                    <label className="lf-float-label" htmlFor="login-username">Username</label>
                    <input
                      ref={usernameRef}
                      id="login-username"
                      type="text"
                      className={`lf-input${fieldErrors.username ? ' lf-input--error' : ''}`}
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); if (fieldErrors.username) setFieldErrors(f => ({...f, username: ''})); }}
                      placeholder="e.g. dr.jane"
                      autoComplete="username"
                      required
                      aria-required="true"
                      aria-invalid={fieldErrors.username ? 'true' : 'false'}
                      aria-describedby={fieldErrors.username ? 'username-error' : undefined}
                      autoFocus
                      enterKeyHint="next"
                    />
                  </div>
                  {fieldErrors.username && (
                    <span id="username-error" className="field-error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {fieldErrors.username}
                    </span>
                  )}
                </div>

                {/* Password — floating label + show/hide toggle */}
                <div className="lf-group">
                  <div className="lf-label-row">
                    <button
                      type="button"
                      className="lf-forgot"
                      onClick={() => setShowForgotPassword(true)}
                      aria-haspopup="dialog"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className={`lf-float-wrapper${password ? ' has-value' : ''}${fieldErrors.password ? ' has-error' : ''}`}>
                    <label className="lf-float-label" htmlFor="login-password">Password</label>
                    <div className="password-field-wrapper">
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        className={`lf-input${fieldErrors.password ? ' lf-input--error' : ''}`}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors(f => ({...f, password: ''})); }}
                        placeholder="Min 8 chars, 1 uppercase, 1 number"
                        autoComplete="current-password"
                        required
                        aria-required="true"
                        aria-invalid={fieldErrors.password ? 'true' : 'false'}
                        aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                        enterKeyHint="go"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={0}
                      >
                        {showPassword ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  {fieldErrors.password && (
                    <span id="password-error" className="field-error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {fieldErrors.password}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  className="lf-submit"
                  disabled={loading || loginAttempts >= MAX_ATTEMPTS}
                  aria-busy={loading}
                  aria-live="polite"
                >
                  {loading ? (
                    <><span className="btn-spinner" aria-hidden="true" />Signing In…</>
                  ) : loginAttempts >= MAX_ATTEMPTS ? (
                    'Account Locked — Contact IT'
                  ) : 'Sign In'}
                </button>

                {/* ── Demo divider ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 0' }}>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>or explore a demo</span>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                </div>

                {/* ── Demo buttons ── */}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={handleStartGuidedDemo}
                    disabled={demoLoading === 'guided'}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      padding: '10px 0', borderRadius: 9,
                      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
                      border: 'none', cursor: 'pointer', color: '#fff',
                      fontSize: 12, fontWeight: 700, transition: 'opacity 0.15s',
                      opacity: demoLoading === 'guided' ? 0.7 : 1,
                    }}
                  >
                    {demoLoading === 'guided'
                      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
                      : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    }
                    {demoLoading === 'guided' ? 'Loading…' : '🎯 Guided Tour'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDemo(d => !d)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '10px 0', borderRadius: 9,
                      border: '1.5px solid #e2e8f0', background: '#f8fafc',
                      cursor: 'pointer', color: '#475569', fontSize: 12, fontWeight: 600,
                    }}
                  >
                    👤 Pick a role
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: showDemo ? 'rotate(180deg)' : 'rotate(0)' }}><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                </div>

                {/* ── Role picker ── */}
                {showDemo && (
                  <div style={{
                    marginTop: 10, borderRadius: 12, border: '1px solid #e2e8f0',
                    background: '#f8fafc', overflow: 'hidden',
                    animation: 'demo-panel-in 0.18s ease',
                  }}>
                    {DEMO_ACCOUNTS.map((acc, i) => (
                      <button
                        key={acc.username}
                        type="button"
                        onClick={() => handleDemoLogin(acc)}
                        disabled={!!demoLoading}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px', border: 'none', borderBottom: i < DEMO_ACCOUNTS.length - 1 ? '1px solid #e2e8f0' : 'none',
                          background: 'transparent', cursor: 'pointer', textAlign: 'left',
                          transition: 'background 0.12s',
                          opacity: demoLoading && demoLoading !== acc.username ? 0.4 : 1,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = `${acc.color}08`}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${acc.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                          {demoLoading === acc.username
                            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={acc.color} strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
                            : acc.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{acc.name}</span>
                            <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 3, background: `${acc.color}18`, color: acc.color, textTransform: 'uppercase', letterSpacing: 0.3 }}>{acc.role}</span>
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{acc.desc}</div>
                        </div>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={acc.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    ))}
                  </div>
                )}

              </form>

              <div className="lf-footer">

                {/* 1. System status strip — directly below Sign In, first thing seen */}
                <a
                  href="https://status.clarity-ehr.com"
                  target="_blank" rel="noopener noreferrer"
                  className={`lf-status-strip${serverDown ? ' lf-status-strip--degraded' : ''}`}
                  aria-label={`System status: ${serverDown ? 'Degraded' : 'All systems operational'}`}
                >
                  <span className={`lf-status-strip-dot${serverDown ? ' lf-status-strip-dot--degraded' : ' lf-status-strip-dot--ok'}`} aria-hidden="true" />
                  <span className={`lf-status-strip-label${serverDown ? ' lf-status-strip-label--degraded' : ' lf-status-strip-label--ok'}`}>
                    {serverDown ? 'Service degraded' : 'All systems operational'}
                  </span>
                  <span className="lf-status-strip-link">View status →</span>
                </a>

                {/* 2. Security certification pills — tight cluster */}
                <div className="lf-cert-pills" role="list" aria-label="Security certifications">
                  {[
                    { icon: '🔐', label: 'MFA',        tip: 'Multi-factor authentication required for all users' },
                    { icon: '🏥', label: 'HIPAA',      tip: 'Full HIPAA Privacy & Security Rule compliance' },
                    { icon: '💊', label: 'EPCS',       tip: 'Electronic Prescribing of Controlled Substances certified' },
                    { icon: '🔒', label: '42 CFR Pt2', tip: 'Substance use disorder records protected under federal law' },
                    { icon: '📋', label: 'Audit Log',  tip: 'All access and modifications are logged and auditable' },
                  ].map(b => (
                    <span key={b.label} className="lf-cert-pill" role="listitem" title={b.tip} aria-label={`${b.label}: ${b.tip}`}>
                      <span aria-hidden="true">{b.icon}</span>{b.label}
                      <span className="lf-cert-tooltip" aria-hidden="true">{b.tip}</span>
                    </span>
                  ))}
                </div>

                {/* 3. Security line + IT support */}
                <div className="lf-support-row">
                  <span className="lf-security-line" role="note">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    AES-256 · HIPAA · All access monitored
                  </span>
                  <a href="tel:+15554007748" className="lf-it-card" aria-label="Call IT Support at (555) 400-7748">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/></svg>
                    IT Support · (555) 400-7748
                  </a>
                </div>

                {/* Patient Portal CTA */}
                <div className="lf-patient-cta">
                  <span className="lf-patient-label">Are you a patient?</span>
                  <Link to="/patient-portal-login" className="lf-patient-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Sign in to Patient Portal
                  </Link>
                </div>

              </div>
            </div>
          </div>

        </div>


        <style>{`
          @keyframes demo-panel-in {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>

      </main>

      {/* ── Footer ── */}
      <footer className="login-footer">
        <span>© {new Date().getFullYear()} Clarity EHR. All rights reserved.</span>
        <span className="login-footer-sep">·</span>
        <button type="button" className="footer-privacy-link" onClick={() => setShowPrivacyPolicy(true)}>Privacy Policy</button>
        <span className="login-footer-sep">·</span>
        <span>v14.2</span>
      </footer>

      {/* ── Forgot Password Modal ── */}
      {showForgotPassword && (
        <div className="login-modal-overlay" role="presentation" onClick={closeForgotModal}>
          <div
            className="login-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-pw-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="login-modal-close" onClick={closeForgotModal} aria-label="Close password reset dialog">✕</button>
            <h2 id="forgot-pw-title">Reset Your Password</h2>
            {!forgotSent ? (
              <>
                <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
                  Enter your work email and we'll send you a secure link to reset your password.
                </p>
                <form onSubmit={handleForgotSubmit}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="forgot-email">Work Email</label>
                    <input
                      id="forgot-email"
                      type="email"
                      className="form-input"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@clarity.org"
                      required
                      aria-required="true"
                      autoFocus
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    Send Reset Link
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
                <p style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                  Check your inbox
                </p>
                <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
                  If <strong style={{ color: '#60a5fa' }}>{forgotEmail}</strong> is associated with an account, you'll receive a password reset link within a few minutes.
                </p>
                <button className="btn btn-primary" style={{ width: '100%', marginTop: 20 }} onClick={closeForgotModal}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 2FA Verification Modal ── */}
      {show2FA && (
        <div className="login-modal-overlay" role="presentation" onClick={() => { setShow2FA(false); setPendingTempToken(null); setTwoFAError(''); setEmailHint(''); setMockCode(null); }}>
          <div
            className="login-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="twofa-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 400, textAlign: 'center' }}
          >
            <button className="login-modal-close" onClick={() => { setShow2FA(false); setPendingTempToken(null); setTwoFAError(''); setEmailHint(''); setMockCode(null); }} aria-label="Close two-factor verification dialog">✕</button>
            <div style={{ fontSize: 48, marginBottom: 12 }} aria-hidden="true">📧</div>
            <h2 id="twofa-title" style={{ fontSize: 20, marginBottom: 8 }}>Check Your Email</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              We sent a 6-digit code to <strong>{emailHint || 'your registered email'}</strong>. Enter it below.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => { setTwoFactorCode(e.target.value.replace(/\D/g, '')); setTwoFAError(''); }}
                placeholder="000000"
                aria-label="6-digit verification code"
                aria-required="true"
                aria-invalid={twoFAError ? 'true' : 'false'}
                aria-describedby={twoFAError ? 'twofa-error' : undefined}
                style={{
                  width: 200, textAlign: 'center', fontSize: 28, letterSpacing: 8,
                  padding: '10px 16px', borderRadius: 10, border: `2px solid ${twoFAError ? '#ef4444' : 'var(--border)'}`,
                  fontFamily: 'var(--font-mono)', fontWeight: 700,
                  outline: 'none',
                }}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && twoFactorCode.length === 6) handle2FAVerify(); }}
              />
            </div>
            <div role="alert" aria-live="assertive" aria-atomic="true">
              {twoFAError && (
                <p id="twofa-error" style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{twoFAError}</p>
              )}
            </div>
            <button
              className="btn btn-primary"
              disabled={twoFactorCode.length !== 6 || loading}
              onClick={handle2FAVerify}
              aria-busy={loading}
              style={{ width: '100%', padding: '10px', fontSize: 14, marginBottom: 12 }}
            >
              {loading ? 'Verifying…' : 'Verify & Sign In'}
            </button>
            {mockCode ? (
              <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 8, background: '#fefce8', border: '1px solid #fbbf24', fontSize: 13 }}>
                <span style={{ color: '#92400e', fontWeight: 600 }}>🔧 Dev mode — verification code: </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, letterSpacing: 4, color: '#1d4ed8' }}>{mockCode}</span>
              </div>
            ) : (
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Didn't receive it? Check your spam folder or contact your administrator.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Force Password Change Step ── */}
      {showPasswordChange && (
        <div className="login-modal-overlay" role="presentation">
          <div
            className="login-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwchange-title"
            style={{ maxWidth: 440, padding: 0, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              padding: '20px 24px',
            }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>🔒</div>
              <h2 id="pwchange-title" style={{ margin: 0, color: '#fff', fontSize: 17, fontWeight: 800 }}>Password Change Required</h2>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: '4px 0 0' }}>
                Your account is using a temporary password. Set a new one to continue.
              </p>
            </div>
            {pwDone ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <h3 style={{ margin: 0 }}>Password Changed</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Taking you to your dashboard…</p>
              </div>
            ) : (
              <form onSubmit={handlePasswordChangeSubmit} style={{ padding: '22px 24px' }}>
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="pw-current" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Password</label>
                  <input id="pw-current" type="password" className="form-input" style={{ marginTop: 4 }} value={pwCurrent} autoComplete="current-password" onChange={e => setPwCurrent(e.target.value)} required aria-required="true" />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="pw-new" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>New Password</label>
                  <input id="pw-new" type="password" className="form-input" style={{ marginTop: 4 }} value={pwNext} autoComplete="new-password" onChange={e => setPwNext(e.target.value)} required aria-required="true" aria-describedby="pw-rules" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="pw-confirm" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Confirm New Password</label>
                  <input id="pw-confirm" type="password" className="form-input" style={{ marginTop: 4, borderColor: pwConfirm && !pwMatches ? '#ef4444' : undefined }} value={pwConfirm} autoComplete="new-password" onChange={e => setPwConfirm(e.target.value)} required aria-required="true" aria-invalid={pwConfirm && !pwMatches ? 'true' : 'false'} />
                </div>
                <ul id="pw-rules" style={{ marginBottom: 16, listStyle: 'none', padding: 0, margin: '0 0 16px' }} aria-label="Password requirements">
                  {pwRules.map(r => {
                    const ok = r.test(pwNext);
                    return (
                      <li key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span aria-hidden="true" style={{ fontSize: 12, color: ok ? '#10b981' : (pwNext ? '#ef4444' : 'var(--text-muted)') }}>{ok ? '✓' : '○'}</span>
                        <span style={{ fontSize: 12, color: ok ? '#10b981' : 'var(--text-muted)' }}>
                          <span className="sr-only">{ok ? 'Met: ' : 'Not met: '}</span>{r.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div role="alert" aria-live="assertive" aria-atomic="true">
                  {pwError && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '9px 12px', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>
                      {pwError}
                    </div>
                  )}
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={pwSaving || !pwCurrent || !pwNext || !pwConfirm}>
                  {pwSaving ? 'Saving…' : 'Set New Password'}
                </button>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
                  Logged in as <strong>{username}</strong>
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Privacy Policy Modal ── */}
      {showPrivacyPolicy && (
        <div className="login-modal-overlay" role="presentation" onClick={() => setShowPrivacyPolicy(false)}>
          <div
            className="login-modal login-modal-wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="login-modal-close" onClick={() => setShowPrivacyPolicy(false)} aria-label="Close privacy policy dialog">✕</button>
            <h2 id="privacy-title">Privacy Policy</h2>
            <div className="privacy-policy-content">
              <p className="privacy-updated">Last Updated: January 1, {new Date().getFullYear()}</p>

              <h3>1. Introduction</h3>
              <p>
                Clarity EHR ("we," "our," or "us") is committed to protecting the privacy and security of
                all personal and health information entrusted to us. This Privacy Policy describes how we
                collect, use, disclose, and safeguard your information in compliance with the Health Insurance
                Portability and Accountability Act (HIPAA), 42 CFR Part 2, and applicable state and federal laws.
              </p>

              <h3>2. Information We Collect</h3>
              <p>We may collect the following categories of information:</p>
              <ul>
                <li><strong>Protected Health Information (PHI):</strong> Diagnoses, treatment records, medications, lab results, clinical notes, insurance details, and billing information.</li>
                <li><strong>Personally Identifiable Information (PII):</strong> Name, date of birth, Social Security Number, contact information, and emergency contacts.</li>
                <li><strong>Technical Data:</strong> Login credentials, IP addresses, device identifiers, access timestamps, and audit log entries.</li>
                <li><strong>Substance Use Disorder Records:</strong> Records protected under 42 CFR Part 2, which receive additional confidentiality protections.</li>
              </ul>

              <h3>3. How We Use Your Information</h3>
              <p>PHI and PII are used solely for:</p>
              <ul>
                <li>Treatment — coordinating and managing patient care across authorized providers.</li>
                <li>Payment — processing claims, billing, and insurance verification.</li>
                <li>Healthcare Operations — quality assurance, auditing, staff training, and compliance activities.</li>
                <li>As required or permitted by law (e.g., public health reporting, court orders).</li>
              </ul>

              <h3>4. HIPAA Compliance</h3>
              <p>
                Clarity EHR maintains full compliance with HIPAA Privacy, Security, and Breach Notification Rules.
                We implement administrative, physical, and technical safeguards including:
              </p>
              <ul>
                <li>AES-256 encryption for data at rest and TLS 1.3 for data in transit.</li>
                <li>Role-based access controls (RBAC) with minimum necessary access.</li>
                <li>Multi-factor authentication for all system users.</li>
                <li>Comprehensive audit logging of all PHI access and modifications.</li>
                <li>Annual risk assessments and workforce security training.</li>
                <li>Business Associate Agreements (BAAs) with all third-party vendors.</li>
              </ul>

              <h3>5. 42 CFR Part 2 Protections</h3>
              <p>
                Substance use disorder (SUD) treatment records receive heightened protection under federal regulation
                42 CFR Part 2. These records may not be disclosed without explicit written patient consent, except
                in medical emergencies or as otherwise permitted by Part 2 regulations.
              </p>

              <h3>6. Breach Notification</h3>
              <p>In the event of a breach of unsecured PHI, Clarity EHR will:</p>
              <ul>
                <li>Notify affected individuals in writing within 60 days of discovery.</li>
                <li>Report the breach to the U.S. Department of Health and Human Services (HHS).</li>
                <li>Notify prominent media outlets if the breach affects 500+ individuals in a state or jurisdiction.</li>
                <li>Provide a description of the breach, types of information involved, steps taken, and recommended protective actions.</li>
              </ul>

              <h3>7. Patient Rights</h3>
              <p>Under HIPAA, patients have the right to:</p>
              <ul>
                <li><strong>Access</strong> — Request and obtain copies of their PHI.</li>
                <li><strong>Amendment</strong> — Request corrections to inaccurate or incomplete records.</li>
                <li><strong>Accounting of Disclosures</strong> — Receive a list of certain disclosures of their PHI.</li>
                <li><strong>Restriction Requests</strong> — Request limitations on how their PHI is used or disclosed.</li>
                <li><strong>Confidential Communications</strong> — Request communication through alternative means or locations.</li>
                <li><strong>Complaint</strong> — File a complaint with Clarity EHR or HHS if they believe their privacy rights have been violated.</li>
              </ul>

              <h3>8. Data Retention</h3>
              <p>
                Medical records are retained in accordance with applicable federal and state retention requirements
                (minimum 7 years for adults; until age 21 for minors). Audit logs are retained for a minimum of 6 years.
              </p>

              <h3>9. Contact Information</h3>
              <p>For privacy-related inquiries, requests, or complaints, contact:</p>
              <div className="privacy-contact">
                <p><strong>Clarity EHR Privacy Office</strong></p>
                <p>Email: privacy@clarity-ehr.org</p>
                <p>Phone: (555) 400-PRIV (7748)</p>
                <p>Mail: 200 Wellness Blvd, Suite 400, Austin, TX 78701</p>
              </div>
              <p style={{ marginTop: 14, fontSize: 12, color: '#64748b' }}>
                You may also file a complaint with the Secretary of the U.S. Department of Health and Human Services
                at <em>www.hhs.gov/hipaa/filing-a-complaint</em>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
