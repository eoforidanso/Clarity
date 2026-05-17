import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const rules = [
  { test: (p) => p.length >= 8,           label: 'At least 8 characters' },
  { test: (p) => /[A-Z]/.test(p),         label: 'One uppercase letter' },
  { test: (p) => /[0-9]/.test(p),         label: 'One number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'One special character (recommended)' },
];

export default function ForcePasswordChange() {
  const { currentUser, refreshUser, changePassword } = useAuth();
  const [current, setCurrent]   = useState('');
  const [next, setNext]         = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [done, setDone]         = useState(false);

  const valid = rules.slice(0, 3).every(r => r.test(next));
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
      setDone(true);
      setTimeout(() => {
        if (typeof refreshUser === 'function') refreshUser();
        else window.location.reload();
      }, 1800);
    } catch (err) {
      setError(err.message || 'Failed to change password');
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
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Current Password
            </label>
            <input
              type="password" style={inputStyle} value={current} autoComplete="current-password"
              onChange={e => setCurrent(e.target.value)} required
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
