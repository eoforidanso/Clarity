import React, { useState, useEffect, useRef } from 'react';

const SERVICES = [
  { name: 'EHR Core', status: 'operational' },
  { name: 'Clinical Data', status: 'operational' },
  { name: 'E-Prescribing', status: 'operational' },
  { name: 'Telehealth', status: 'operational' },
  { name: 'Lab Interface', status: 'operational' },
  { name: 'Claims/Billing', status: 'operational' },
  { name: 'Patient Portal', status: 'operational' },
  { name: 'FHIR API', status: 'operational' },
];

const STATUS_MAP = {
  operational: { color: '#10b981', label: 'Operational', icon: '✓' },
  degraded: { color: '#f59e0b', label: 'Degraded', icon: '!' },
  outage: { color: '#ef4444', label: 'Outage', icon: '✕' },
};

export default function SystemStatus() {
  const [showPanel, setShowPanel] = useState(false);
  const [services, setServices] = useState(SERVICES);
  const panelRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowPanel(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allOperational = services.every(s => s.status === 'operational');
  const uptimePercent = '99.98';

  return (
    <div className="system-status-container" ref={panelRef}>
      <button
        className="system-status-btn"
        onClick={() => setShowPanel(!showPanel)}
        title="System Status"
      >
        <span className={`status-dot ${allOperational ? 'green' : 'yellow'}`} />
        <span className="status-label-text">
          {allOperational ? 'All Systems' : 'Issues'}
        </span>
      </button>

      {showPanel && (
        <div className="system-status-panel">
          <div className="system-status-panel-header">
            <h3>System Status</h3>
            <span className={`status-overall ${allOperational ? 'ok' : 'warn'}`}>
              {allOperational ? '✓ All Operational' : '⚠ Some Issues'}
            </span>
          </div>
          <div className="system-status-services">
            {services.map(s => {
              const info = STATUS_MAP[s.status];
              return (
                <div key={s.name} className="system-status-service">
                  <span className="service-name">{s.name}</span>
                  <span className="service-status" style={{ color: info.color }}>
                    <span className="service-dot" style={{ background: info.color }} />
                    {info.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="system-status-footer">
            <span>Uptime: <strong>{uptimePercent}%</strong> (30 days)</span>
            <span>Last check: just now</span>
          </div>
        </div>
      )}
    </div>
  );
}
