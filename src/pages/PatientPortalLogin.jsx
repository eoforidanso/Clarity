import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '/api';

export default function PatientPortalLogin() {
  const navigate = useNavigate();

  // step: 'email' | 'otp' | 'loading'
  const [step, setStep]       = useState('email');
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState('');
  const [hint, setHint]       = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // ── Step 1: request OTP ───────────────────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/patient-portal/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setHint(data.hint || email);
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (otp.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/patient-portal/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      navigate('/patient-portal', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', background: '#f0f4f8',
      fontFamily: 'Inter, -apple-system, sans-serif',
    }}>
      {/* Left brand panel */}
      <div style={{
        width: 420, background: 'linear-gradient(160deg, #0d2444 0%, #1b3d6e 60%, #0060b6 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 40px', flexShrink: 0,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 56 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, border: '1px solid rgba(255,255,255,0.2)',
            }}>🏥</div>
            <div>
              <div style={{ color: '#fff', fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px' }}>Clarity</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px' }}>Patient Portal</div>
            </div>
          </div>

          <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.5px', marginBottom: 14 }}>
            Your health,<br />your connection.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.7 }}>
            Securely message your care team, request prescription refills, and stay connected with your provider — anytime.
          </p>

          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['💬', 'Message your provider directly'],
              ['💊', 'Request medication refills'],
              ['📅', 'View upcoming appointments'],
              ['📋', 'Review your medications'],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'rgba(255,255,255,0.09)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
                }}>{icon}</div>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
          🔒 HIPAA-compliant secure messaging &nbsp;·&nbsp; 256-bit encryption
        </div>
      </div>

      {/* Right form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* ── Step 1: Email ── */}
          {step === 'email' && (
            <>
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0e1e30', letterSpacing: '-0.4px' }}>
                  Sign in to your account
                </h1>
                <p style={{ color: '#6b7ea0', fontSize: 13, marginTop: 6 }}>
                  Enter the email address on file with your care team. We'll send a one-time code.
                </p>
                <div style={{
                  marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', background: '#edf6ff', borderRadius: 20,
                  border: '1px solid #c4ddf5',
                }}>
                  <span style={{ fontSize: 12 }}>🔐</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#1a5fa8' }}>No password needed — email verification</span>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 7, fontSize: 13, marginBottom: 18,
                  background: '#fdeaea', color: '#a81f1f', border: '1px solid rgba(201,43,43,0.2)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>⚠️ {error}</div>
              )}

              <form onSubmit={handleRequestOtp}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#445568', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoFocus
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 7,
                    border: '1.5px solid #d8dfe8', fontSize: 14, outline: 'none',
                    background: '#fff', color: '#0e1e30', boxSizing: 'border-box',
                    marginBottom: 20,
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0060b6'}
                  onBlur={(e) => e.target.style.borderColor = '#d8dfe8'}
                />
                <button type="submit" disabled={loading || !email.trim()} style={{
                  width: '100%', padding: '12px', borderRadius: 7, fontWeight: 700, fontSize: 14,
                  background: loading || !email.trim() ? '#cce0f5' : 'linear-gradient(180deg, #1872c8 0%, #0055a8 100%)',
                  color: '#fff', border: 'none', cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(0,85,168,0.2)',
                }}>
                  {loading ? 'Sending…' : '📧 Send verification code'}
                </button>
              </form>
            </>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <>
              <div style={{ marginBottom: 28 }}>
                <button onClick={() => { setStep('email'); setOtp(''); setError(''); }} style={{
                  background: 'none', border: 'none', color: '#6b7ea0', fontSize: 13,
                  cursor: 'pointer', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4,
                }}>← Back</button>

                <div style={{
                  padding: 20, borderRadius: 10, background: '#f0f7ff',
                  border: '1.5px solid #b8d4f0', textAlign: 'center', marginBottom: 24,
                }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📬</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0e1e30', marginBottom: 6 }}>
                    Check your email
                  </h3>
                  <p style={{ fontSize: 13, color: '#6b7ea0', lineHeight: 1.5 }}>
                    We sent a 6-digit code to<br />
                    <strong style={{ color: '#0e1e30' }}>{hint}</strong>
                  </p>
                  <p style={{ fontSize: 11, color: '#9ba8b8', marginTop: 6 }}>
                    Code expires in 10 minutes
                  </p>
                </div>

                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0e1e30', letterSpacing: '-0.4px', marginBottom: 4 }}>
                  Enter your code
                </h1>
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 7, fontSize: 13, marginBottom: 18,
                  background: '#fdeaea', color: '#a81f1f', border: '1px solid rgba(201,43,43,0.2)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>⚠️ {error}</div>
              )}

              <form onSubmit={handleVerifyOtp}>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  inputMode="numeric"
                  style={{
                    width: '100%', padding: '16px', borderRadius: 7,
                    border: '1.5px solid #d8dfe8', fontSize: 32, outline: 'none',
                    background: '#fff', color: '#0e1e30', boxSizing: 'border-box',
                    textAlign: 'center', letterSpacing: '12px', fontWeight: 800,
                    marginBottom: 20,
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0060b6'}
                  onBlur={(e) => e.target.style.borderColor = '#d8dfe8'}
                />
                <button type="submit" disabled={loading || otp.length !== 6} style={{
                  width: '100%', padding: '12px', borderRadius: 7, fontWeight: 700, fontSize: 14,
                  background: loading || otp.length !== 6 ? '#cce0f5' : 'linear-gradient(180deg, #1872c8 0%, #0055a8 100%)',
                  color: '#fff', border: 'none', cursor: loading || otp.length !== 6 ? 'not-allowed' : 'pointer',
                  boxShadow: otp.length === 6 ? '0 2px 8px rgba(0,85,168,0.25)' : 'none',
                }}>
                  {loading ? 'Verifying…' : '🔓 Verify & Sign In'}
                </button>
              </form>

              <button onClick={handleRequestOtp} disabled={loading} style={{
                width: '100%', padding: '10px', borderRadius: 7, fontWeight: 600, fontSize: 13,
                background: 'none', color: '#6b7ea0', border: '1px solid #d8dfe8',
                cursor: 'pointer', marginTop: 10,
              }}>
                Resend code
              </button>
            </>
          )}

          <p style={{ marginTop: 28, fontSize: 12, color: '#8a9bb0', textAlign: 'center' }}>
            Staff?{' '}
            <Link to="/login" style={{ color: '#0060b6', fontWeight: 600, textDecoration: 'none' }}>
              Sign in to the clinical portal →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
