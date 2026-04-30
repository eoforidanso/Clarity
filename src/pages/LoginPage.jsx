import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTraining } from '../contexts/TrainingContext';
import { users } from '../data/mockData';

const ROLE_ICONS = {
  prescriber: '🩺',
  front_desk: '🏥',
  nurse: '💉',
  therapist: '🧠',
};

const ROLE_LABELS = {
  prescriber: 'Provider',
  front_desk: 'Front Desk Staff',
  nurse: 'Nurse / MA',
  therapist: 'Therapist',
};

const ROLE_COLORS = {
  prescriber: 'linear-gradient(135deg,#3b82f6,#6366f1)',
  nurse: 'linear-gradient(135deg,#10b981,#059669)',
  front_desk: 'linear-gradient(135deg,#f59e0b,#d97706)',
  therapist: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
};

const CERTS = ['HIPAA', 'EPCS', 'ONC', '42 CFR Part 2'];

export default function LoginPage() {
  const { login, loginError } = useAuth();
  const { enableTraining } = useTraining();
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
  const [pending2FALogin, setPending2FALogin] = useState(null);

  /* Derive selected role from username match */
  const matchedUser = users.find(u => u.username === username);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Simulate 2FA for users with twoFactorEnabled
      const matchedUser2FA = users.find(u => u.username === username && u.twoFactorEnabled);
      if (matchedUser2FA && !show2FA) {
        setPending2FALogin({ username, password });
        setShow2FA(true);
        setLoading(false);
        return;
      }
      const success = await login(username, password);
      if (success) navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
    }
    setLoading(false);
  };

  const handle2FAVerify = async () => {
    setLoading(true);
    // 2FA verification — code must be 121314
    if (twoFactorCode === '121314') {
      const success = await login(pending2FALogin.username, pending2FALogin.password);
      if (success) navigate('/dashboard');
    }
    setLoading(false);
    setShow2FA(false);
    setTwoFactorCode('');
    setPending2FALogin(null);
  };

  const handleDemoLogin = (u) => {
    setUsername(u.username);
    setPassword(u.password);
  };

  const handleEnterTrainingMode = async () => {
    // Auto-login as demo provider
    const demoUser = users.find(u => u.role === 'prescriber');
    if (!demoUser) return;
    setLoading(true);
    try {
      const success = await login(demoUser.username, demoUser.password);
      if (success) {
        enableTraining();
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Training login error:', err);
    }
    setLoading(false);
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
                    const matched = users.find(u => u.username === val);
                    if (matched) setPassword(matched.password);
                    else setPassword('');
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

              {/* Selected-role preview chip */}
              {matchedUser && (
                <div className="login-role-chip">
                  <span className="login-role-chip-dot" style={{ background: ROLE_COLORS[matchedUser.role] || ROLE_COLORS.front_desk }} />
                  Signing in as <strong>{matchedUser.firstName} {matchedUser.lastName}</strong>
                  {matchedUser.credentials && <span className="login-role-chip-cred">{matchedUser.credentials}</span>}
                  <span className="login-role-chip-tag">{ROLE_LABELS[matchedUser.role] || matchedUser.role}</span>
                  {matchedUser.twoFactorEnabled && <span style={{ marginLeft: 6, fontSize: 11, color: '#10b981', fontWeight: 600 }}>🔐 2FA</span>}
                </div>
              )}

              <button type="submit" className="btn btn-primary login-submit-btn" disabled={loading}>
                {loading ? '⏳ Signing In…' : 'Sign In'}
              </button>
            </form>

            <p className="login-demo-hint">
              Demo password for all accounts: <code>Pass123!</code>
            </p>

            <div className="login-hipaa-footer">
              <span>🛡️</span>
              <span>Protected by 256-bit AES encryption · HIPAA compliant · All access monitored &amp; logged</span>
            </div>
          </div>
        </div>

        {/* RIGHT — Demo Accounts */}
        <div className="login-col login-col-demo">
          <div className="glass-card glass-card-demo">
            <h2 className="glass-card-title">Quick Access — Demo Accounts</h2>
            <p className="glass-card-subtitle">Select an account to auto-fill credentials</p>

            <div className="login-demo-grid">
              {users.filter(u => u.role !== 'patient').map((u, idx) => (
                <div
                  key={u.id}
                  className={`login-demo-account${username === u.username ? ' active' : ''}`}
                  onClick={() => handleDemoLogin(u)}
                  style={{ animationDelay: `${0.15 + idx * 0.05}s` }}
                >
                  <span className="login-demo-avatar" style={{ background: ROLE_COLORS[u.role] || ROLE_COLORS.front_desk }}>
                    {ROLE_ICONS[u.role] || '🏥'}
                  </span>
                  <span className="login-demo-info">
                    <span className="login-demo-name">
                      {u.firstName} {u.lastName}
                      {u.credentials && <span className="login-demo-cred">{u.credentials}</span>}
                    </span>
                    <span className="login-demo-role">
                      {u.role === 'prescriber' ? u.specialty : ROLE_LABELS[u.role] || u.role}
                      {u.twoFactorEnabled && <span style={{ marginLeft: 6, fontSize: 10, color: '#10b981', fontWeight: 600 }}>🔐 2FA</span>}
                    </span>
                  </span>
                  <span className="login-demo-arrow">→</span>
                </div>
              ))}
            </div>
          </div>

          {/* Training Mode CTA */}
          <div style={{
            background: 'linear-gradient(135deg,rgba(124,45,18,0.85),rgba(194,65,12,0.85))',
            backdropFilter: 'blur(12px)', borderRadius: 14,
            border: '1px solid rgba(234,88,12,0.4)', padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 14, marginBottom: 8,
          }}>
            <div>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: 14, marginBottom: 3 }}>
                🎓 Staff Training Mode
              </div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                Safe sandbox with mock data — auto-logs in as demo provider
              </div>
            </div>
            <button
              type="button"
              onClick={handleEnterTrainingMode}
              style={{
                background: '#fff', color: '#c2410c',
                border: 'none', borderRadius: 8,
                padding: '7px 16px', fontSize: 12, fontWeight: 800,
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              Enter Training Mode
            </button>
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
        <div className="login-modal-overlay" onClick={() => { setShow2FA(false); setPending2FALogin(null); }}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center' }}>
            <button className="login-modal-close" onClick={() => { setShow2FA(false); setPending2FALogin(null); }}>✕</button>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>Two-Factor Authentication</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              A 6-digit code has been sent to your registered device. Enter it below to continue.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
              <input
                type="text"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                style={{
                  width: 200, textAlign: 'center', fontSize: 28, letterSpacing: 8,
                  padding: '10px 16px', borderRadius: 10, border: '2px solid var(--border)',
                  fontFamily: 'var(--font-mono)', fontWeight: 700,
                  outline: 'none',
                }}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && twoFactorCode.length === 6) handle2FAVerify(); }}
              />
            </div>
            <button
              className="btn btn-primary"
              disabled={twoFactorCode.length !== 6 || loading}
              onClick={handle2FAVerify}
              style={{ width: '100%', padding: '10px', fontSize: 14, marginBottom: 12 }}
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              💡 Demo: Enter code <strong>121314</strong>
            </p>
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
