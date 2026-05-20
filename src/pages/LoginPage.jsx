import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const CERTS = ['HIPAA', 'EPCS', 'ONC', '42 CFR Part 2'];

export default function LoginPage() {
  const { login, completeTwoFactor, changePassword: authChangePassword, loginError } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    try {
      const result = await login(username, password);
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
    <div className="login-page">
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />

      {/* ── Sticky Top Nav ── */}
      <nav className="login-topnav">
        <div className="login-topnav-left">
          <span className="login-topnav-logo">🧠</span>
          <span className="login-topnav-wordmark">Clarity<span>EHR</span></span>
          <span className="login-version-pill">V14.2</span>
        </div>
        <div className="login-topnav-badges">
          {CERTS.map(c => (
            <span key={c} className="login-topnav-cert">{c}</span>
          ))}
        </div>
      </nav>

      {/* ── Two-Column Body ── */}
      <div className="login-two-col">

        {/* LEFT — Sign-In Card */}
        <div className="login-col login-col-form">
          <div className="glass-card glass-card-sign-in">
            <h2 className="glass-card-title">
              <span className="glass-card-lock">🔒</span> Secure Sign In
            </h2>

            {loginError && (
              <div className="login-error">⚠️ {loginError}</div>
            )}

            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={username}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUsername(val);
                  }}
                  placeholder="Enter your username"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="form-group">
                <div className="form-label-row">
                  <label className="form-label">Password</label>
                  <button type="button" className="forgot-password-link" onClick={() => setShowForgotPassword(true)}>
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary login-submit-btn" disabled={loading}>
                {loading ? '⏳ Signing In…' : 'Sign In'}
              </button>
            </form>

            <div className="login-hipaa-footer">
              <span>🛡️</span>
              <span>Protected by 256-bit AES encryption · HIPAA compliant · All access monitored &amp; logged</span>
            </div>
          </div>
        </div>

        {/* RIGHT — System Info */}
        <div className="login-col login-col-demo">
          <div className="glass-card glass-card-demo">
            <h2 className="glass-card-title">🧠 Clarity EHR</h2>
            <p className="glass-card-subtitle">Secure, HIPAA-compliant electronic health records</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              {[
                { icon: '🔐', title: 'Multi-Factor Authentication', desc: 'Every login protected by 2FA with email verification' },
                { icon: '🛡️', title: 'HIPAA & 42 CFR Part 2', desc: 'Full compliance with federal privacy and substance use protections' },
                { icon: '📋', title: 'Complete Audit Trail', desc: 'Every access and change is logged and time-stamped' },
                { icon: '💊', title: 'DEA-Compliant EPCS', desc: 'Electronic prescribing for controlled substances with dual-factor auth' },
              ].map(f => (
                <div key={f.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{f.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9' }}>{f.title}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, color: '#94a3b8' }}>
              <strong style={{ color: '#e2e8f0' }}>IT Support</strong><br />
              Contact your system administrator if you need help accessing your account.
            </div>
          </div>

          {/* Patient Portal CTA */}
          <div className="glass-card glass-card-patient-cta">
            <span>Are you a patient?</span>
            <Link to="/patient-portal-login">Sign in to the Patient Portal →</Link>
          </div>
        </div>
      </div>

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
        <div className="login-modal-overlay" onClick={closeForgotModal}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <button className="login-modal-close" onClick={closeForgotModal}>✕</button>
            <h2>Reset Your Password</h2>
            {!forgotSent ? (
              <>
                <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
                  Enter your work email and we'll send you a secure link to reset your password.
                </p>
                <form onSubmit={handleForgotSubmit}>
                  <div className="form-group">
                    <label className="form-label">Work Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@clarity.org"
                      required
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
        <div className="login-modal-overlay" onClick={() => { setShow2FA(false); setPendingTempToken(null); setTwoFAError(''); setEmailHint(''); setMockCode(null); }}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center' }}>
            <button className="login-modal-close" onClick={() => { setShow2FA(false); setPendingTempToken(null); setTwoFAError(''); setEmailHint(''); setMockCode(null); }}>✕</button>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>Check Your Email</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              We sent a 6-digit code to <strong>{emailHint || 'your registered email'}</strong>. Enter it below.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => { setTwoFactorCode(e.target.value.replace(/\D/g, '')); setTwoFAError(''); }}
                placeholder="000000"
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
            {twoFAError && (
              <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{twoFAError}</p>
            )}
            <button
              className="btn btn-primary"
              disabled={twoFactorCode.length !== 6 || loading}
              onClick={handle2FAVerify}
              style={{ width: '100%', padding: '10px', fontSize: 14, marginBottom: 12 }}
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
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
        <div className="login-modal-overlay">
          <div className="login-modal" style={{ maxWidth: 440, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              padding: '20px 24px',
            }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>🔒</div>
              <h2 style={{ margin: 0, color: '#fff', fontSize: 17, fontWeight: 800 }}>Password Change Required</h2>
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
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Password</label>
                  <input type="password" className="form-input" style={{ marginTop: 4 }} value={pwCurrent} autoComplete="current-password" onChange={e => setPwCurrent(e.target.value)} required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>New Password</label>
                  <input type="password" className="form-input" style={{ marginTop: 4 }} value={pwNext} autoComplete="new-password" onChange={e => setPwNext(e.target.value)} required />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Confirm New Password</label>
                  <input type="password" className="form-input" style={{ marginTop: 4, borderColor: pwConfirm && !pwMatches ? '#ef4444' : undefined }} value={pwConfirm} autoComplete="new-password" onChange={e => setPwConfirm(e.target.value)} required />
                </div>
                <div style={{ marginBottom: 16 }}>
                  {pwRules.map(r => {
                    const ok = r.test(pwNext);
                    return (
                      <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: ok ? '#10b981' : (pwNext ? '#ef4444' : 'var(--text-muted)') }}>{ok ? '✓' : '○'}</span>
                        <span style={{ fontSize: 12, color: ok ? '#10b981' : 'var(--text-muted)' }}>{r.label}</span>
                      </div>
                    );
                  })}
                </div>
                {pwError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '9px 12px', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>
                    {pwError}
                  </div>
                )}
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
        <div className="login-modal-overlay" onClick={() => setShowPrivacyPolicy(false)}>
          <div className="login-modal login-modal-wide" onClick={(e) => e.stopPropagation()}>
            <button className="login-modal-close" onClick={() => setShowPrivacyPolicy(false)}>✕</button>
            <h2>Privacy Policy</h2>
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
