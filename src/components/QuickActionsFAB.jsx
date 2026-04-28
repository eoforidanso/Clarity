import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../contexts/PatientContext';

const ACTIONS = [
  { icon: '🔍', label: 'Find Patient', path: '/patients', color: '#3b82f6' },
  { icon: '📅', label: 'New Appointment', path: '/schedule', color: '#8b5cf6' },
  { icon: '📹', label: 'Start Telehealth', path: '/telehealth', color: '#10b981' },
  { icon: '💊', label: 'E-Prescribe', path: '/prescribe', color: '#f59e0b' },
  { icon: '📬', label: 'Inbox', path: '/inbox', color: '#ef4444' },
  { icon: '✅', label: 'Tasks', path: '/tasks', color: '#06b6d4' },
];

export default function QuickActionsFAB() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const fabRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (fabRef.current && !fabRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleAction = (path) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <div className="quick-fab-container" ref={fabRef}>
      {open && (
        <div className="quick-fab-menu">
          {ACTIONS.map((a, i) => (
            <button
              key={a.path}
              className="quick-fab-item"
              onClick={() => handleAction(a.path)}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <span className="quick-fab-item-icon" style={{ background: a.color }}>{a.icon}</span>
              <span className="quick-fab-item-label">{a.label}</span>
            </button>
          ))}
        </div>
      )}
      <button
        className={`quick-fab-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        title="Quick Actions"
        aria-label="Quick Actions"
      >
        <span className="quick-fab-icon">{open ? '✕' : '⚡'}</span>
      </button>
    </div>
  );
}
