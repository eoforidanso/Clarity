import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';
import { useNotifications } from '../contexts/NotificationContext';

export default function Header() {
  const { currentUser } = useAuth();
  const { patients, selectPatient, openChart, closeChart, openCharts, selectedPatient, inboxMessages } = usePatient();
  const { unreadCount: notifUnread, togglePanel } = useNotifications();
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [now, setNow] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState('main');
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  const LOCATIONS = [
    { id: 'main', name: 'Main Campus', addr: '123 Medical Center Dr' },
    { id: 'downtown', name: 'Downtown Clinic', addr: '456 Broadway St' },
    { id: 'westside', name: 'Westside Office', addr: '789 West Blvd' },
  ];

  const unreadCount = inboxMessages.filter(
    (m) => !m.read && (m.to === currentUser?.id || currentUser?.role === 'front_desk')
  ).length;

  const filteredPatients = search.length > 1
    ? patients.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          p.mrn.toLowerCase().includes(q) ||
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
        );
      })
    : [];

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectPatient = useCallback((patient) => {
    openChart(patient.id);
    setSearch('');
    setShowResults(false);
    navigate(`/chart/${patient.id}/summary`);
  }, [openChart, navigate]);

  // Page title from current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return '🏠 Dashboard';
    if (path.includes('/schedule')) return '📅 Schedule';
    if (path.includes('/patients')) return '🔍 Patient Search';
    if (path.includes('/chart/'))   return '📋 Patient Chart';
    if (path.includes('/inbox'))    return '📥 Clinical Inbox';
    if (path.includes('/prescribe')) return '💊 E-Prescribe';
    if (path.includes('/telehealth')) return '📹 Telehealth';
    if (path.includes('/smart-phrases')) return '⚡ Smart Phrases';
    if (path.includes('/btg-audit')) return '🔒 BTG Audit Log';
    if (path.includes('/admin-toolkit')) return '🛠️ Admin Toolkit';
    if (path.includes('/session/')) return '🩺 Clinical Session';
    if (path.includes('/analytics')) return '📊 Analytics';
    if (path.includes('/care-gaps')) return '🎯 Care Gaps';
    if (path.includes('/staff-messaging')) return '💬 Staff Messaging';
    if (path.includes('/settings')) return '⚙️ Settings';
    if (path.includes('/billing-dashboard')) return '💰 Billing Dashboard';
    if (path.includes('/claims-management')) return '📋 Claims Management';
    if (path.includes('/denial-management')) return '⚠️ Denial Management';
    if (path.includes('/telehealth-billing')) return '💻 Telehealth Billing';
    if (path.includes('/patient-portal-billing')) return '🧾 Patient Billing';
    if (path.includes('/quality-measures')) return '📊 Quality Measures';
    if (path.includes('/documents')) return '📂 Documents';
    if (path.includes('/audit-trail')) return '📜 Audit Trail';
    if (path.includes('/referrals')) return '🔄 Referral Management';
    if (path.includes('/prior-auth')) return '🔐 Prior Authorization';
    if (path.includes('/treatment-plans')) return '📋 Treatment Plans';
    if (path.includes('/intake-forms')) return '📝 Intake Forms';
    if (path.includes('/superbills')) return '🧮 Superbill Capture';
    if (path.includes('/efax')) return '📠 eFax Center';
    if (path.includes('/provider-performance')) return '🏆 Provider Performance';
    if (path.includes('/waitlist')) return '⏳ Patient Waitlist';
    if (path.includes('/eligibility')) return '✅ Eligibility Verification';
    if (path.includes('/patient-statements')) return '📄 Patient Statements';
    if (path.includes('/batch-claims')) return '📦 Batch Claim Submission';
    if (path.includes('/tasks')) return '✅ Task Management';
    if (path.includes('/med-rec')) return '💊 Medication Reconciliation';
    if (path.includes('/patient-recall')) return '📞 Patient Recall & Outreach';
    if (path.includes('/cds-alerts')) return '🧠 Clinical Decision Support';
    if (path.includes('/report-builder')) return '📊 Report Builder';
    if (path.includes('/consents')) return '✍️ Consent Management';
    if (path.includes('/patient-education')) return '📚 Patient Education';
    if (path.includes('/secure-notes')) return '🔒 Secure Notes';
    if (path.includes('/insurance-cards')) return '🪪 Insurance Card Capture';
    if (path.includes('/fee-schedules')) return '💲 Fee Schedule Manager';
    if (path.includes('/scheduling-templates')) return '📅 Scheduling Templates';
    if (path.includes('/lab-tracking')) return '🔬 Lab Order Tracking';
    if (path.includes('/vitals-trending')) return '📈 Vitals Trending';
    if (path.includes('/network-integrations')) return '🌐 Network Integrations';
    if (path.includes('/ai-triage')) return '🤖 AI Triage & Patient Chat';
    if (path.includes('/patient-checkin')) return '📱 Patient Self Check-In';
    if (path.includes('/cost-estimator')) return '💲 Patient Cost Estimator';
    if (path.includes('/marketplace')) return '🏪 App Marketplace';
    if (path.includes('/api-docs')) return '🔧 API Documentation';
    return 'Clarity';
  };

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <header className="header">
      {/* Page context breadcrumb */}
      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap', marginRight: 8 }}>
        {getPageTitle()}
      </div>

      {/* Search */}
      <div className="header-search" ref={searchRef}>
        <span className="search-icon">🔍</span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search patients — name or MRN..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
          onFocus={() => search.length > 1 && setShowResults(true)}
        />
        <span className="search-kbd">Ctrl+K</span>

        {showResults && filteredPatients.length > 0 && (
          <div className="search-results">
            {filteredPatients.map((p) => (
              <div key={p.id} className="search-result-item" onClick={() => handleSelectPatient(p)}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                  {p.firstName[0]}{p.lastName[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}>
                    {p.lastName}, {p.firstName}
                    {p.isBTG && <span className="badge badge-danger" style={{ fontSize: 10 }}>BTG</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    MRN {p.mrn} · DOB {p.dob} · {p.gender}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {showResults && search.length > 1 && filteredPatients.length === 0 && (
          <div className="search-results">
            <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No patients found for "{search}"
            </div>
          </div>
        )}
      </div>

      {/* Open chart tabs */}
      {openCharts.length > 0 && (
        <>
          <div className="header-divider" />
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', overflow: 'hidden', maxWidth: 520, minWidth: 0 }}>
            {openCharts.map((p) => {
              const isActive = selectedPatient?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => { selectPatient(p.id); navigate(`/chart/${p.id}/summary`); }}
                  title={`${p.lastName}, ${p.firstName} — MRN ${p.mrn}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 8px 4px 6px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: isActive ? 'var(--primary)' : 'var(--bg)',
                    color: isActive ? 'white' : 'var(--text-primary)',
                    border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                    fontSize: 12, fontWeight: isActive ? 700 : 500,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                    minWidth: 0,
                    flexShrink: 1,
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 800, flexShrink: 0,
                  }}>
                    {p.firstName[0]}{p.lastName[0]}
                  </div>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.lastName}, {p.firstName[0]}.
                  </span>
                  <span
                    onClick={(e) => { e.stopPropagation(); closeChart(p.id); }}
                    title="Close chart"
                    style={{
                      marginLeft: 2, fontSize: 13, lineHeight: 1,
                      opacity: 0.6, cursor: 'pointer', fontWeight: 400,
                      borderRadius: 4, width: 16, height: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.2)' : 'var(--border)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    ✕
                  </span>
                </div>
              );
            })}
            {openCharts.length < 4 && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {4 - openCharts.length} slot{4 - openCharts.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </>
      )}

      {/* Right actions */}
      <div className="header-actions">
        {/* Location picker */}
        <select
          value={selectedLocation}
          onChange={e => setSelectedLocation(e.target.value)}
          style={{
            padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
            fontSize: 11, fontWeight: 600, background: 'var(--bg)', color: 'var(--text-secondary)',
            cursor: 'pointer', maxWidth: 140,
          }}
          title="Select Location"
        >
          {LOCATIONS.map(l => (
            <option key={l.id} value={l.id}>📍 {l.name}</option>
          ))}
        </select>

        <button className="header-btn" title="Settings" onClick={() => navigate('/settings')}>
          ⚙️
        </button>
        <button className="header-btn" title="Staff Messaging" onClick={() => navigate('/staff-messaging')}>
          💬
        </button>
        <button className="header-btn notif-bell-btn" title="Notifications" onClick={togglePanel}>
          🔔
          {notifUnread > 0 && <span className="badge-count">{notifUnread}</span>}
        </button>
        <button className="header-btn" title="Inbox" onClick={() => navigate('/inbox')}>
          �
          {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}
        </button>
        <div className="header-divider" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 10, fontWeight: 800, flexShrink: 0,
          }}>
            {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
          </div>
          <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)' }}>
              {currentUser?.firstName} {currentUser?.lastName?.[0]}.
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {currentUser?.credentials || currentUser?.role}
            </div>
          </div>
        </div>
        <div className="header-divider" />
        <div style={{ textAlign: 'right', userSelect: 'none' }}>
          <div className="header-clock-time">{timeStr}</div>
          <div className="header-clock-date">{dateStr}</div>
        </div>
      </div>
    </header>
  );
}

