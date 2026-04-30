import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../contexts/PatientContext';

const STORAGE_KEY = 'clarity_recent_patients';
const MAX_RECENT = 6;

export function useRecentPatients() {
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  });

  const addRecent = (patient) => {
    if (!patient) return;
    const entry = {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      mrn: patient.mrn,
      dob: patient.dob,
      ts: Date.now(),
    };
    setRecent(prev => {
      const filtered = prev.filter(p => p.id !== patient.id);
      const next = [entry, ...filtered].slice(0, MAX_RECENT);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { recent, addRecent };
}

export default function RecentPatients() {
  const { recent } = useRecentPatients();
  const { selectPatient } = usePatient();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  if (recent.length === 0) return null;

  const handleClick = (p) => {
    selectPatient(p.id);
    navigate(`/chart/${p.id}/summary`);
  };

  return (
    <div className={`recent-patients-dock ${expanded ? 'expanded' : ''}`}>
      <button
        className="recent-patients-toggle"
        onClick={() => setExpanded(!expanded)}
        title="Recent patients"
      >
        <span className="recent-patients-icon">🕐</span>
        <span className="recent-patients-count">{recent.length}</span>
      </button>
      {expanded && (
        <div className="recent-patients-list">
          <div className="recent-patients-header">
            <span>Recent Patients</span>
            <button className="recent-patients-close" onClick={() => setExpanded(false)}>✕</button>
          </div>
          {recent.map(p => (
            <div key={p.id} className="recent-patient-item" onClick={() => { handleClick(p); setExpanded(false); }}>
              <div className="recent-patient-avatar">
                {p.firstName?.[0] || ''}{p.lastName?.[0] || ''}
              </div>
              <div className="recent-patient-info">
                <div className="recent-patient-name">{p.lastName}, {p.firstName}</div>
                <div className="recent-patient-meta">MRN {p.mrn}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
