import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '/api';

// ── Shared styles ─────────────────────────────────────────────────────────────
const S = {
  input: {
    width: '100%', padding: '11px 14px', borderRadius: 7,
    border: '1.5px solid #d8dfe8', fontSize: 14, outline: 'none',
    background: '#fff', color: '#0e1e30', boxSizing: 'border-box', marginBottom: 14,
  },
  btnPrimary: (disabled) => ({
    width: '100%', padding: '12px', borderRadius: 7, fontWeight: 700, fontSize: 14,
    background: disabled ? '#cce0f5' : 'linear-gradient(180deg,#1872c8 0%,#0055a8 100%)',
    color: '#fff', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : '0 2px 8px rgba(0,85,168,0.2)',
  }),
  label: { display: 'block', fontSize: 11, fontWeight: 700, color: '#445568', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 },
  err:   { padding: '10px 14px', borderRadius: 7, fontSize: 13, marginBottom: 18, background: '#fdeaea', color: '#a81f1f', border: '1px solid rgba(201,43,43,0.2)', display: 'flex', alignItems: 'center', gap: 8 },
  info:  { padding: '10px 14px', borderRadius: 7, fontSize: 13, marginBottom: 18, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' },
  back:  { background: 'none', border: 'none', color: '#6b7ea0', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 },
  row:   { display: 'flex', gap: 12 },
};

function inputFocus(e)  { e.target.style.borderColor = '#0060b6'; }
function inputBlur(e)   { e.target.style.borderColor = '#d8dfe8'; }
function Input({ label, ...props }) {
  return (
    <div>
      {label && <label style={S.label}>{label}</label>}
      <input style={S.input} onFocus={inputFocus} onBlur={inputBlur} {...props} />
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────
const STEP_LABELS = {
  email:    ['Email', 'Verify', 'Code'],
  register: ['Email', 'Verify', 'Code'],
  otp:      ['Email', 'Verify', 'Code'],
  invite:   ['Invite', 'Details', 'Code'],
  invite_details: ['Invite', 'Details', 'Code'],
  invite_otp:     ['Invite', 'Details', 'Code'],
  pending:  [],
};
const STEP_INDEX = {
  email: 0, register: 1, otp: 2,
  invite: 0, invite_details: 1, invite_otp: 2,
};

function StepIndicator({ step }) {
  const labels = STEP_LABELS[step] || [];
  if (!labels.length) return null;
  const active = STEP_INDEX[step] ?? 0;
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
      {labels.map((label, i) => {
        const done    = i < active;
        const current = i === active;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
              background: done ? '#16a34a' : current ? '#0060b6' : '#e2e8f0',
              color: (done || current) ? '#fff' : '#94a3b8',
            }}>
              {done ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: current ? '#0060b6' : done ? '#16a34a' : '#94a3b8' }}>
              {label}
            </span>
            {i < labels.length - 1 && <div style={{ width: 24, height: 2, background: done ? '#16a34a' : '#e2e8f0', borderRadius: 1 }} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PatientPortalLogin() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const inviteCode    = params.get('code');

  // ── State ─────────────────────────────────────────────────────────────────
  const [step, setStep]       = useState(inviteCode ? 'invite' : 'email');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // Email / OTP step
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState('');
  const [hint, setHint]       = useState('');

  // Self-registration step
  const [reg, setReg] = useState({
    firstName: '', lastName: '', dob: '', phone: '', zip: '', password: '',
  });

  // Invite step
  const [invitePrefill, setInvitePrefill] = useState(null);
  const [inviteForm, setInviteForm] = useState({ email: '', phone: '', password: '' });

  // Pending message (when identity couldn't be matched)
  const [pendingMessage, setPendingMessage] = useState('');

  // ── Load invite code on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!inviteCode) return;
    setLoading(true);
    fetch(`${API}/patient-portal/invite/${inviteCode}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setStep('email'); }
        else {
          setInvitePrefill(data.prefill);
          setInviteForm(f => ({ ...f, email: data.prefill?.email || '' }));
          setStep('invite_details');
        }
      })
      .catch(() => { setError('Could not validate invite link'); setStep('email'); })
      .finally(() => setLoading(false));
  }, [inviteCode]);

  const setReg1 = (k, v) => setReg(f => ({ ...f, [k]: v }));

  // ── Step 1: Email ─────────────────────────────────────────────────────────
  const handleEmail = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(''); setLoading(true);
    try {
      const res  = await fetch(`${API}/patient-portal/request-access`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      if (data.needsVerification) {
        // Start self-registration
        setStep('register');
      } else {
        setHint(data.hint || email);
        setStep('otp');
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ── Step 2: Self-registration identity form ───────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email.trim() || !reg.firstName.trim() || !reg.lastName.trim() || !reg.dob) return;
    setError(''); setLoading(true);
    try {
      // Ensure portal_users row exists before identity match
      await fetch(`${API}/patient-portal/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ email: email.trim() }),
      });

      const res  = await fetch(`${API}/patient-portal/verify-identity`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email:     email.trim(),
          firstName: reg.firstName.trim(),
          lastName:  reg.lastName.trim(),
          dob:       reg.dob,
          phone:     reg.phone.trim(),
          zip:       reg.zip.trim(),
          password:  reg.password || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 202 && data.pending) {
        // Needs staff review
        setPendingMessage(data.message);
        setStep('pending');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Could not verify identity');
      setHint(data.hint || email);
      setStep('otp');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ── Invite details step ───────────────────────────────────────────────────
  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteForm.email.trim()) return;
    setError(''); setLoading(true);
    try {
      const res  = await fetch(`${API}/patient-portal/register-invite`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code:     inviteCode,
          email:    inviteForm.email.trim(),
          phone:    inviteForm.phone.trim(),
          password: inviteForm.password || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not complete registration');
      setHint(data.hint || inviteForm.email);
      setStep('invite_otp');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ── OTP step ──────────────────────────────────────────────────────────────
  const handleOtp = async (e) => {
    e?.preventDefault();
    if (otp.length !== 6) return;
    setError(''); setLoading(true);
    const usedEmail = step === 'invite_otp' ? inviteForm.email : email;
    try {
      const res  = await fetch(`${API}/patient-portal/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: usedEmail.trim(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      navigate('/patient-portal', { replace: true });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const resendOtp = async () => {
    const usedEmail = step === 'invite_otp' ? inviteForm.email : email;
    await fetch(`${API}/patient-portal/request-access`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({ email: usedEmail.trim() }),
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f0f4f8', fontFamily: 'Inter,-apple-system,sans-serif' }}>

      {/* Left brand panel */}
      <div style={{ width: 420, background: 'linear-gradient(160deg,#0d2444 0%,#1b3d6e 60%,#0060b6 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 40px', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 56 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: '1px solid rgba(255,255,255,0.2)' }}>🏥</div>
            <div>
              <div style={{ color: '#fff', fontSize: 17, fontWeight: 800 }}>Clarity</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px' }}>Patient Portal</div>
            </div>
          </div>
          <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.5px', marginBottom: 14 }}>Your health,<br />your connection.</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.7 }}>Securely message your care team, request prescription refills, and stay connected with your provider — anytime.</p>
          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[['💬','Message your provider'],['💊','Request medication refills'],['📅','View upcoming appointments'],['📋','Review your medications']].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>🔒 HIPAA-compliant · 256-bit encryption</div>
      </div>

      {/* Right form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          <StepIndicator step={step} />
          {error && <div style={S.err}>⚠️ {error}</div>}

          {/* ── Loading (invite code check) ── */}
          {step === 'invite' && (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔗</div>
              <p>Validating your invite link…</p>
            </div>
          )}

          {/* ── Step 1: Email ── */}
          {step === 'email' && (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0e1e30', marginBottom: 6 }}>Sign in to your account</h1>
              <p style={{ color: '#6b7ea0', fontSize: 13, marginBottom: 24 }}>Enter your email to receive a one-time sign-in code.</p>
              <form onSubmit={handleEmail}>
                <Input label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required autoFocus />
                <button type="submit" disabled={loading || !email.trim()} style={S.btnPrimary(loading || !email.trim())}>
                  {loading ? 'Checking…' : '→ Sign In'}
                </button>
              </form>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>OR</span>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              </div>

              <button
                onClick={() => { setError(''); setStep('register'); }}
                style={{ width: '100%', padding: '12px', borderRadius: 7, fontWeight: 700, fontSize: 14, background: '#fff', color: '#0060b6', border: '2px solid #0060b6', cursor: 'pointer' }}
              >
                Create a new account
              </button>
              <p style={{ marginTop: 12, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
                Already received a clinic invite? Check your email for the activation link.
              </p>
            </>
          )}

          {/* ── Step 2: Self-registration ── */}
          {step === 'register' && (
            <>
              <button style={S.back} onClick={() => { setStep('email'); setError(''); }}>← Back</button>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0e1e30', marginBottom: 6 }}>Create your account</h1>
              <p style={{ color: '#6b7ea0', fontSize: 13, marginBottom: 20 }}>
                Enter your details as they appear in your medical records so we can link your chart.
              </p>
              <form onSubmit={handleRegister}>
                <Input label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
                <div style={S.row}>
                  <Input label="First name" value={reg.firstName} onChange={e => setReg1('firstName', e.target.value)} placeholder="Jane" required />
                  <Input label="Last name"  value={reg.lastName}  onChange={e => setReg1('lastName',  e.target.value)} placeholder="Doe"  required />
                </div>
                <Input label="Date of birth" type="date" value={reg.dob} onChange={e => setReg1('dob', e.target.value)} required />
                <div style={S.row}>
                  <Input
                    label={<>Phone <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#94a3b8', fontSize: 10 }}>(helps match your chart)</span></>}
                    type="tel" value={reg.phone} onChange={e => setReg1('phone', e.target.value)} placeholder="(555) 000-0000"
                  />
                  <Input label="ZIP code" value={reg.zip} onChange={e => setReg1('zip', e.target.value)} placeholder="60601" maxLength={10} />
                </div>
                <Input
                  label={<>Password <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#94a3b8', fontSize: 10 }}>(optional — leave blank for code-only access)</span></>}
                  type="password" value={reg.password} onChange={e => setReg1('password', e.target.value)} placeholder="Optional"
                />
                <button type="submit" disabled={loading || !reg.firstName.trim() || !reg.lastName.trim() || !reg.dob} style={S.btnPrimary(loading || !reg.firstName || !reg.lastName || !reg.dob)}>
                  {loading ? 'Verifying…' : '🔍 Find my record & continue'}
                </button>
              </form>
              <p style={{ marginTop: 14, fontSize: 12, color: '#8a9bb0', textAlign: 'center' }}>
                Not a patient yet? Contact our office to be registered.
              </p>
            </>
          )}

          {/* ── Pending review ── */}
          {step === 'pending' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0e1e30', marginBottom: 12 }}>Account under review</h2>
              <p style={{ color: '#6b7ea0', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>{pendingMessage}</p>
              <button style={{ ...S.btnPrimary(false), width: 'auto', padding: '10px 24px' }} onClick={() => setStep('email')}>
                ← Back to sign in
              </button>
            </div>
          )}

          {/* ── Invite registration form ── */}
          {step === 'invite_details' && invitePrefill && (
            <>
              <div style={{ padding: '14px 16px', borderRadius: 8, background: '#f0fdf4', border: '1.5px solid #86efac', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>✓ Invite verified for {invitePrefill.firstName} {invitePrefill.lastName}</div>
                <div style={{ fontSize: 12, color: '#15803d', marginTop: 3 }}>DOB: {invitePrefill.dob} · Invited to your clinic's patient portal</div>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0e1e30', marginBottom: 6 }}>Activate your account</h1>
              <p style={{ color: '#6b7ea0', fontSize: 13, marginBottom: 20 }}>Confirm your email and optionally set a password.</p>
              <form onSubmit={handleInviteSubmit}>
                <Input label="Email address" type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" required autoFocus />
                <Input label="Phone (optional)" type="tel" value={inviteForm.phone} onChange={e => setInviteForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" />
                <Input
                  label={<>Password <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#94a3b8', fontSize: 10 }}>(optional — leave blank for code-only access)</span></>}
                  type="password" value={inviteForm.password} onChange={e => setInviteForm(f => ({ ...f, password: e.target.value }))} placeholder="Optional"
                />
                <button type="submit" disabled={loading || !inviteForm.email.trim()} style={S.btnPrimary(loading || !inviteForm.email.trim())}>
                  {loading ? 'Setting up…' : '→ Activate my account'}
                </button>
              </form>
            </>
          )}

          {/* ── OTP ── */}
          {(step === 'otp' || step === 'invite_otp') && (
            <>
              <button style={S.back} onClick={() => { setStep(step === 'invite_otp' ? 'invite_details' : 'email'); setOtp(''); setError(''); }}>← Back</button>
              <div style={{ padding: 20, borderRadius: 10, background: '#f0f7ff', border: '1.5px solid #b8d4f0', textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📬</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0e1e30', marginBottom: 6 }}>Check your email</h3>
                <p style={{ fontSize: 13, color: '#6b7ea0', lineHeight: 1.5 }}>
                  We sent a 6-digit code to<br />
                  <strong style={{ color: '#0e1e30' }}>{hint}</strong>
                </p>
                <p style={{ fontSize: 11, color: '#9ba8b8', marginTop: 6 }}>Code expires in 10 minutes</p>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0e1e30', marginBottom: 20 }}>Enter your code</h1>
              <form onSubmit={handleOtp}>
                <input
                  type="text" value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" maxLength={6} autoFocus inputMode="numeric"
                  style={{ ...S.input, fontSize: 32, textAlign: 'center', letterSpacing: '12px', fontWeight: 800, marginBottom: 20 }}
                  onFocus={inputFocus} onBlur={inputBlur}
                />
                <button type="submit" disabled={loading || otp.length !== 6} style={S.btnPrimary(loading || otp.length !== 6)}>
                  {loading ? 'Verifying…' : '🔓 Verify & Sign In'}
                </button>
              </form>
              <button onClick={resendOtp} disabled={loading} style={{ width: '100%', padding: '10px', borderRadius: 7, fontWeight: 600, fontSize: 13, background: 'none', color: '#6b7ea0', border: '1px solid #d8dfe8', cursor: 'pointer', marginTop: 10 }}>
                Resend code
              </button>
            </>
          )}

          <p style={{ marginTop: 28, fontSize: 12, color: '#8a9bb0', textAlign: 'center' }}>
            Staff? <Link to="/login" style={{ color: '#0060b6', fontWeight: 600, textDecoration: 'none' }}>Sign in to the clinical portal →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
