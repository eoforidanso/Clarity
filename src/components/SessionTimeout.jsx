import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const IDLE_WARNING_MS = 10 * 60 * 1000; // 10 min → show warning
const IDLE_LOGOUT_MS  = 15 * 60 * 1000; // 15 min → auto-logout
const CHECK_INTERVAL  = 15000;           // check every 15s

export default function SessionTimeout() {
  const { isAuthenticated, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(300);
  const lastActivity = useRef(Date.now());

  const resetTimer = useCallback(() => {
    lastActivity.current = Date.now();
    setShowWarning(false);
  }, []);

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated) return;
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    const handler = () => { lastActivity.current = Date.now(); };
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, handler));
  }, [isAuthenticated]);

  // Check idle time
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= IDLE_LOGOUT_MS) {
        setShowWarning(false);
        logout();
      } else if (idle >= IDLE_WARNING_MS) {
        setShowWarning(true);
        setCountdown(Math.ceil((IDLE_LOGOUT_MS - idle) / 1000));
      } else {
        setShowWarning(false);
      }
    }, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [isAuthenticated, logout]);

  // Countdown timer when warning is shown
  useEffect(() => {
    if (!showWarning) return;
    const timer = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      const remaining = Math.ceil((IDLE_LOGOUT_MS - idle) / 1000);
      if (remaining <= 0) {
        logout();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [showWarning, logout]);

  if (!showWarning || !isAuthenticated) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="session-timeout-overlay">
      <div className="session-timeout-modal">
        <div className="session-timeout-icon">⏱️</div>
        <h3>Session Expiring Soon</h3>
        <p>Your session will expire due to inactivity in:</p>
        <div className="session-timeout-countdown">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          HIPAA requires automatic logout after 15 minutes of inactivity.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={resetTimer}>
            Continue Session
          </button>
          <button className="btn btn-secondary" onClick={logout}>
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
}
