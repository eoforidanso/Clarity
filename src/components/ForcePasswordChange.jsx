import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const rules = [
  { test: (p) => p.length >= 8,            label: 'At least 8 characters',               req: true  },
  { test: (p) => /[A-Z]/.test(p),          label: 'One uppercase letter',                req: true  },
  { test: (p) => /[0-9]/.test(p),          label: 'One number',                          req: true  },
  { test: (p) => /[^A-Za-z0-9]/.test(p),  label: 'One special character (!@#$…)',        req: false },
  { test: (p) => p.length >= 12,           label: 'At least 12 characters (recommended)', req: false },
];

function strengthScore(p) {
  if (!p) return 0;
  return rules.filter(r => r.test(p)).length;
}
const STRENGTH = [
  { label: '',         color: '#e5e7eb' },
  { label: 'Weak',     color: '#ef4444' },
  { label: 'Fair',     color: '#f97316' },
  { label: 'Good',     color: '#f59e0b' },
  { label: 'Strong',   color: '#22c55e' },
  { label: 'Very strong', color: '#10b981' },
];

export default function ForcePasswordChange() {
  const { currentUser, refreshUser, changePassword } = useAuth();
  const [current, setCurrent]   = useState('');
  const [next, setNext]         = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [done, setDone]         = useState(false);

  const valid   = rules.filter(r => r.req).every(r => r.test(next));
  const score   = strengthScore(next);
  const strength = STRENGTH[Math.min(score, 5)];
  const matches = next === confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!valid)    return setError('Password does not meet the requirements below.');
    if (!matches)  return setError('New passwords do not match.');
    if (next === current) return setError('New password must be different from your current password.');

    setSaving(true);
    try {
      await changePassword(current, next);
      // AuthContext.changePassword already sets mustChangePassword: false in state.
      // Show success screen briefly, then App.jsx re-renders automatically
      // because currentUser.mustChangePassword is now false — no reload needed.
      setDone(true);
    } catch (err) {
      setError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px',
    borderRadius: 8, border: '1px solid var(--border)', fontSize: 14,
    background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none',
    marginTop: 4,
  };

  if (done) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '40px 36px', textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Password Changed</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Refreshing your session…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 420,
        boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
          borderRadius: '16px 16px 0 0', padding: '20px 24px',
        }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>🔒</div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: 17, fontWeight: 800 }}>
            Password Change Required
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: '4px 0 0' }}>
            Your account is using a temporary password. Please set a new one before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '22px 24px' }}>
          {/* Default password hint */}
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
            padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <span>Your temporary password is <strong style={{ fontFamily: 'monospace', letterSpacing: 1 }}>Welcome2026!</strong></span>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Current Password
            </label>
            <input
              type="password" style={inputStyle} value={current} autoComplete="current-password"
              onChange={e => setCurrent(e.target.value)} required
              placeholder="Enter Welcome2026!"
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              New Password
            </label>
            <input
              type="password" style={inputStyle} value={next} autoComplete="new-password"
              onChange={e => setNext(e.target.value)} required
            />
          </div>
          {/* Strength meter */}
          {next && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 4, borderRadius: 99,
                    background: i <= score ? strength.color : '#e5e7eb',
                    transition: 'background 0.2s',
                  }} />
                ))}
              </div>
              {strength.label && (
                <div style={{ fontSize: 11, fontWeight: 700, color: strength.color }}>
                  {strength.label}
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Confirm New Password
            </label>
            <input
              type="password"
              style={{ ...inputStyle, borderColor: confirm && !matches ? '#ef4444' : 'var(--border)' }}
              value={confirm} autoComplete="new-password"
              onChange={e => setConfirm(e.target.value)} required
            />
          </div>

          {/* Password strength rules */}
          <div style={{ marginBottom: 16 }}>
            {rules.map(r => {
              const ok = r.test(next);
              return (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: ok ? '#10b981' : (next ? '#ef4444' : 'var(--text-muted)') }}>
                    {ok ? '✓' : '○'}
                  </span>
                  <span style={{ fontSize: 12, color: ok ? '#10b981' : 'var(--text-muted)' }}>{r.label}</span>
                </div>
              );
            })}
          </div>

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
              padding: '9px 12px', color: '#dc2626', fontSize: 13, marginBottom: 14,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !current || !next || !confirm}
            style={{
              width: '100%', padding: '11px', borderRadius: 8, border: 'none',
              background: saving ? '#9ca3af' : '#4f46e5', color: '#fff',
              fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Set New Password'}
          </button>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
            Logged in as <strong>{currentUser?.username}</strong> · {currentUser?.role}
          </p>
        </form>
      </div>
    </div>
  );
}
