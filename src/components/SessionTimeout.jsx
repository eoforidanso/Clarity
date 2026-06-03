/**
 * SessionTimeout — HIPAA-compliant inactivity auto-logout
 *
 * Timings:
 *   0–13 min  — active, no UI
 *   13–14 min — subtle bottom banner ("2 min remaining")
 *   14–15 min — full modal with countdown + progress ring
 *   15 min    — auto-logout
 *
 * Activity events that reset the timer:
 *   mousedown, keydown, touchstart, scroll, click
 *
 * Does NOT reset on mousemove (prevents accidental resets from
 * screensavers / hover effects).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const IDLE_MS        = 15 * 60 * 1000;  // 15 min total — HIPAA minimum
const BANNER_MS      = 13 * 60 * 1000;  // show banner at 13 min
const MODAL_MS       = 14 * 60 * 1000;  // show full modal at 14 min
const CHECK_MS       = 5_000;           // check every 5s (fine-grained)
const COUNTDOWN_FROM = (IDLE_MS - MODAL_MS) / 1000; // 60s

export default function SessionTimeout() {
  const { isAuthenticated, logout } = useAuth();
  const [phase, setPhase]       = useState('active'); // 'active' | 'banner' | 'modal'
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const lastActivity = useRef(Date.now());
  const intervalRef  = useRef(null);
  const countdownRef = useRef(null);

  const resetTimer = useCallback(() => {
    lastActivity.current = Date.now();
    setPhase('active');
    setCountdown(COUNTDOWN_FROM);
  }, []);

  // Track meaningful activity
  useEffect(() => {
    if (!isAuthenticated) return;
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, resetTimer));
  }, [isAuthenticated, resetTimer]);

  // Main idle checker
  useEffect(() => {
    if (!isAuthenticated) return;
    intervalRef.current = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= IDLE_MS) {
        clearInterval(intervalRef.current);
        logout();
      } else if (idle >= MODAL_MS) {
        setPhase('modal');
        setCountdown(Math.ceil((IDLE_MS - idle) / 1000));
      } else if (idle >= BANNER_MS) {
        setPhase('banner');
        setCountdown(Math.ceil((IDLE_MS - idle) / 1000));
      } else {
        setPhase('active');
      }
    }, CHECK_MS);
    return () => clearInterval(intervalRef.current);
  }, [isAuthenticated, logout]);

  // 1-second countdown when modal is showing
  useEffect(() => {
    if (phase !== 'modal') { clearInterval(countdownRef.current); return; }
    countdownRef.current = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      const remaining = Math.ceil((IDLE_MS - idle) / 1000);
      if (remaining <= 0) { logout(); return; }
      setCountdown(remaining);
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [phase, logout]);

  if (!isAuthenticated || phase === 'active') return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const timeStr  = `${minutes}:${String(seconds).padStart(2, '0')}`;

  // Progress ring (SVG) — depletes as countdown approaches 0
  const progress     = countdown / COUNTDOWN_FROM;          // 1 → 0
  const RADIUS       = 28;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDash   = progress * CIRCUMFERENCE;
  const ringColor    = countdown > 30 ? '#f59e0b' : '#ef4444';

  // ── Banner (subtle, bottom of screen) ─────────────────────────────────────
  if (phase === 'banner') {
    return (
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 99998, display: 'flex', alignItems: 'center', gap: 12,
        background: '#1e293b', color: '#f1f5f9', borderRadius: 12,
        padding: '10px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        fontSize: 13, fontWeight: 600,
        animation: 'slideUp 0.3s ease',
      }}>
        <span style={{ fontSize: 16 }}>⏱️</span>
        <span>Session expires in <strong style={{ color: '#fbbf24' }}>{timeStr}</strong> due to inactivity</span>
        <button onClick={resetTimer} style={{
          marginLeft: 8, padding: '4px 12px', borderRadius: 6,
          background: '#3b82f6', color: '#fff', border: 'none',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>
          Stay logged in
        </button>
        <button onClick={logout} style={{
          padding: '4px 10px', borderRadius: 6,
          background: 'transparent', color: '#94a3b8',
          border: '1px solid #334155', fontSize: 12, cursor: 'pointer',
        }}>
          Logout
        </button>
      </div>
    );
  }

  // ── Modal (full overlay, last 60s) ─────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,0.75)',
      backdropFilter: 'blur(6px)',
      zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.25s ease',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20,
        padding: '40px 36px', textAlign: 'center',
        maxWidth: 380, width: '90%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
      }}>
        {/* Progress ring */}
        <div style={{ position: 'relative', display: 'inline-flex', marginBottom: 20 }}>
          <svg width={72} height={72} style={{ transform: 'rotate(-90deg)' }}>
            {/* Track */}
            <circle cx={36} cy={36} r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth={5} />
            {/* Progress */}
            <circle
              cx={36} cy={36} r={RADIUS} fill="none"
              stroke={ringColor} strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${CIRCUMFERENCE}`}
              style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.5s' }}
            />
          </svg>
          {/* Countdown inside ring */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 900, color: ringColor,
            fontFamily: 'monospace',
          }}>
            {timeStr}
          </div>
        </div>

        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
          Session expiring
        </h3>
        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 6 }}>
          You'll be automatically logged out due to inactivity.
        </p>
        <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 24 }}>
          HIPAA requires automatic logout after 15 minutes of inactivity.
          Any unsaved changes will be lost.
        </p>

        {/* Progress bar */}
        <div style={{ background: '#f1f5f9', borderRadius: 99, height: 4, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${progress * 100}%`,
            background: countdown > 30
              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
              : 'linear-gradient(90deg, #ef4444, #f87171)',
            transition: 'width 0.9s linear, background 0.5s',
          }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={resetTimer} style={{
            flex: 1, padding: '11px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(180deg, #1872c8, #0055a8)',
            color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,85,168,0.3)',
          }}>
            ✓ Continue Session
          </button>
          <button onClick={logout} style={{
            padding: '11px 16px', borderRadius: 8,
            border: '1px solid #e2e8f0', background: '#fff',
            color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
