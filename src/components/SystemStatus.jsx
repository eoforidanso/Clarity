import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env?.VITE_API_URL || '/api';

const STATUS_CONFIG = {
  checking: { color: '#94a3b8', dot: '#94a3b8', label: 'Checking…' },
  online:   { color: '#10b981', dot: '#10b981', label: 'All systems operational' },
  degraded: { color: '#f59e0b', dot: '#f59e0b', label: 'Degraded performance' },
  offline:  { color: '#ef4444', dot: '#ef4444', label: 'Server unreachable' },
};

export default function SystemStatus({ compact = false }) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!navigator.onLine) { if (!cancelled) setStatus('offline'); return; }
      try {
        const res = await fetch(`${API_BASE}/health`, {
          method: 'GET',
          credentials: 'include',
          signal: AbortSignal.timeout(5000),
        });
        if (!cancelled) setStatus(res.ok ? 'online' : 'degraded');
      } catch {
        if (!cancelled) setStatus('offline');
      }
    };

    check();
    const interval = setInterval(check, 30000);
    const goOnline  = () => check();
    const goOffline = () => { if (!cancelled) setStatus('offline'); };
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const { color, dot, label } = STATUS_CONFIG[status];

  return (
    <a
      href="https://status.clarity-ehr.com"
      target="_blank"
      rel="noopener noreferrer"
      className={`system-status-badge${compact ? ' system-status-badge--compact' : ''}`}
      aria-label={`System status: ${label}. Opens in new tab.`}
      title={label}
    >
      <span
        className={`system-status-dot${status === 'online' ? ' system-status-dot--pulse' : ''}`}
        style={{ background: dot }}
        aria-hidden="true"
      />
      {!compact && (
        <span className="system-status-label" style={{ color }}>{label}</span>
      )}
    </a>
  );
}
