import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';
import { getNavPrefs, getAIFeatures } from '../pages/Settings';

export default function Sidebar() {
  const { currentUser, logout } = useAuth();
  const { inboxMessages, selectedPatient, openCharts, appointments } = usePatient();
  const location = useLocation();
  const navigate = useNavigate();
  const navPrefs = getNavPrefs();
  const aiPrefs = getAIFeatures();
  const [chartExpanded, setChartExpanded] = useState(true);

  // ── Collapsible section state ────────────────────────────
  const [expanded, setExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_expanded');
      return saved ? JSON.parse(saved) : { navigation: true, chart: true, clinical: false, reporting: false, billing: false, admin: false };
    } catch {
      return { navigation: true, chart: true, clinical: false, reporting: false, billing: false, admin: false };
    }
  });

  useEffect(() => {
    try { localStorage.setItem('sidebar_expanded', JSON.stringify(expanded)); } catch {}
  }, [expanded]);

  const toggleSection = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  const allExpanded = Object.values(expanded).every(Boolean);
  const toggleAll = () => {
    const newVal = !allExpanded;
    setExpanded(prev => Object.fromEntries(Object.keys(prev).map(k => [k, newVal])));
    setChartExpanded(newVal);
  };

  const unreadCount = inboxMessages.filter(
    (m) => !m.read && (m.to === currentUser?.id || currentUser?.role === 'front_desk')
  ).length;

  const todayApptCount = appointments.filter(
    (a) => (a.provider === currentUser?.id || currentUser?.role === 'front_desk') && a.status !== 'Completed'
  ).length;

  const isPrescriber = currentUser?.role === 'prescriber';
  const isNurse = currentUser?.role === 'nurse';
  const isFrontDesk = currentUser?.role === 'front_desk';
  const isTherapist = currentUser?.role === 'therapist';

  const initials = currentUser
    ? `${currentUser.firstName?.[0] || ''}${currentUser.lastName?.[0] || ''}`
    : '';

  const roleLabel = {
    prescriber: currentUser?.credentials || 'Prescriber',
    front_desk: 'Front Desk Staff',
    nurse: 'Nurse / MA',
    therapist: currentUser?.credentials || 'Therapist',
  };

  const navItem = (to, icon, label, badge) => (
    <li key={to}>
      <NavLink to={to} className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="sidebar-nav-icon">{icon}</span>
        {label}
        {badge != null && badge > 0 && <span className="nav-badge">{badge}</span>}
      </NavLink>
    </li>
  );

  const chartActive = (seg) => location.pathname.includes(seg) ? 'active' : '';

  const chartLinks = [
    { key: 'summary',       icon: '📋', label: 'Chart Summary' },
    { key: 'encounters',    icon: '🗒️', label: 'Encounters' },
    { key: 'demographics',  icon: '👤', label: 'Demographics' },
    { key: 'allergies',     icon: '⚠️', label: 'Allergies' },
    { key: 'problems',      icon: '🩺', label: 'Problem List' },
    { key: 'vitals',        icon: '💓', label: 'Vitals' },
    { key: 'medications',   icon: '💊', label: 'Medications' },
    { key: 'orders',        icon: '📝', label: 'Orders' },
    { key: 'assessments',   icon: '📊', label: 'Assessments' },
    { key: 'immunizations', icon: '💉', label: 'Immunizations' },
    { key: 'labs',          icon: '🔬', label: 'Lab Results' },
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-inner">
          <div className="logo-mark">🧠</div>
          <div className="logo-text">
            <h1>Clarity</h1>
            <span>Outpatient EHR</span>
          </div>
        </div>
      </div>

      {/* Open patient charts */}
      {openCharts.length > 0 && (
        <div className="sidebar-patient-ctx" style={{ cursor: 'default', padding: '8px 14px' }}>
          <div className="sidebar-patient-ctx-label">📌 Open Charts ({openCharts.length}/4)</div>
          {openCharts.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/chart/${p.id}/summary`)}
              title={`Go to ${p.firstName} ${p.lastName}'s chart`}
              style={{
                cursor: 'pointer',
                padding: '4px 0',
                borderBottom: p.id !== openCharts[openCharts.length - 1]?.id ? '1px solid rgba(255,255,255,0.06)' : 'none',
                opacity: selectedPatient?.id === p.id ? 1 : 0.7,
                fontWeight: selectedPatient?.id === p.id ? 700 : 400,
              }}
            >
              <div className="sidebar-patient-ctx-name" style={{ fontSize: 12 }}>
                {selectedPatient?.id === p.id ? '▸ ' : ''}{p.lastName}, {p.firstName}
              </div>
              <div className="sidebar-patient-ctx-detail" style={{ fontSize: 10 }}>
                MRN {p.mrn}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expand/Collapse All toggle */}
      <div style={{ padding: '6px 14px 2px' }}>
        <button
          onClick={toggleAll}
          style={{
            width: '100%', padding: '5px 10px', borderRadius: 6,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.15s', letterSpacing: '0.3px', textTransform: 'uppercase',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
        >
          <span style={{ fontSize: 11 }}>{allExpanded ? '⊟' : '⊞'}</span>
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* Navigation */}
      <div className="sidebar-section">
        <div
          className="sidebar-section-title"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
          onClick={() => toggleSection('navigation')}
        >
          <span>Navigation</span>
          <span style={{ fontSize: 9, opacity: 0.6, transition: 'transform 0.15s' }}>
            {expanded.navigation ? '▼' : '▶'}
          </span>
        </div>
        {expanded.navigation && (
        <ul className="sidebar-nav">
          {navItem('/dashboard', '📊', 'Dashboard')}
          {navItem('/schedule',  '📅', 'Schedule', todayApptCount)}
          {navItem('/inbox',     '📬', 'Clinical Inbox', unreadCount)}
          {navItem('/patients',  '🔍', 'Patient Search')}
          {navItem('/staff-messaging', '💬', 'Staff Messaging')}
        </ul>
        )}
      </div>

      {/* Chart - expandable */}
      {selectedPatient && (
        <div className="sidebar-section">
          <div
            className="sidebar-section-title"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
            onClick={() => { setChartExpanded(!chartExpanded); setExpanded(prev => ({ ...prev, chart: !chartExpanded })); }}
          >
            <span>Chart</span>
            <span style={{ fontSize: 9, opacity: 0.6, transition: 'transform 0.15s' }}>
              {chartExpanded ? '▼' : '▶'}
            </span>
          </div>
          {chartExpanded && (
            <ul className="sidebar-nav">
              {chartLinks.map(({ key, icon, label }) => (
                <li key={key}>
                  <NavLink
                    to={`/chart/${selectedPatient.id}/${key}`}
                    className={chartActive(`/${key}`)}
                  >
                    <span className="sidebar-nav-icon">{icon}</span>
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Clinical Tools */}
      {(isPrescriber || isNurse || isTherapist) && (
        <div className="sidebar-section">
          <div
            className="sidebar-section-title"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
            onClick={() => toggleSection('clinical')}
          >
            <span>Clinical Tools</span>
            <span style={{ fontSize: 9, opacity: 0.6, transition: 'transform 0.15s' }}>
              {expanded.clinical ? '▼' : '▶'}
            </span>
          </div>
          {expanded.clinical && (
          <ul className="sidebar-nav">
            {navItem('/telehealth',   '📹', 'Telehealth')}
            {navItem('/group-telehealth', '👥', 'Group Telehealth')}
            {(isPrescriber || isNurse) && navItem('/prescribe', '💊', 'E-Prescribe')}
            {isTherapist && navItem('/prescribe', '🔀', 'Refill Requests')}
            {navItem('/smart-phrases','⚡', 'Smart Phrases')}
            {navItem('/patient-chat', '💬', 'Patient Chat')}
            {navItem('/treatment-plans', '📋', 'Treatment Plans')}
            {navItem('/referrals', '🔄', 'Referrals')}
            {navItem('/prior-auth', '🔐', 'Prior Auth')}
            {navItem('/med-rec', '💊', 'Med Reconciliation')}
            {aiPrefs.cdsAlerts && navItem('/cds-alerts', '🧠', 'CDS Alerts')}
            {navItem('/patient-recall', '📞', 'Patient Recall')}
            {navItem('/patient-education', '📚', 'Patient Education')}
            {navItem('/consents', '✍️', 'Consent Forms')}
            {navItem('/secure-notes', '🔒', 'Secure Notes')}
            {navItem('/lab-tracking', '🔬', 'Lab Tracking')}
            {navItem('/vitals-trending', '📈', 'Vitals Trending')}
            {navItem('/network-integrations', '🌐', 'Network Integrations')}
            {navItem('/care-everywhere', '🔄', 'Care Everywhere (HIE)')}
            {aiPrefs.aiTriage && navItem('/ai-triage', '🤖', 'AI Triage Chat')}
            {aiPrefs.ambientSoap && navItem('/ambient-scribe', '🎙️', 'Ambient AI Scribe')}
            {navItem('/order-sets', '📦', 'Order Set Templates')}
          </ul>
          )}
        </div>
      )}

      {/* Reporting & Analytics */}
      <div className="sidebar-section">
        <div
          className="sidebar-section-title"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
          onClick={() => toggleSection('reporting')}
        >
          <span>Reporting</span>
          <span style={{ fontSize: 9, opacity: 0.6, transition: 'transform 0.15s' }}>
            {expanded.reporting ? '▼' : '▶'}
          </span>
        </div>
        {expanded.reporting && (
        <ul className="sidebar-nav">
          {navItem('/analytics',  '📈', 'Analytics')}
          {navItem('/care-gaps',  '🎯', 'Care Gaps')}
          {navItem('/quality-measures', '📊', 'Quality Measures')}
          {navItem('/provider-performance', '🏆', 'Provider Performance')}
          {navItem('/report-builder', '📊', 'Report Builder')}
          {navItem('/population-health', '🌍', 'Population Health')}
          {navItem('/operational-signals', '⚡', 'Operational Signals')}
        </ul>
        )}
      </div>

      {/* Billing & Revenue Cycle */}
      <div className="sidebar-section">
        <div
          className="sidebar-section-title"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
          onClick={() => toggleSection('billing')}
        >
          <span>Billing & RCM</span>
          <span style={{ fontSize: 9, opacity: 0.6, transition: 'transform 0.15s' }}>
            {expanded.billing ? '▼' : '▶'}
          </span>
        </div>
        {expanded.billing && (
        <ul className="sidebar-nav">
          {navItem('/billing-dashboard', '💰', 'Billing Dashboard')}
          {navItem('/claims-management', '📋', 'Claims')}
          {navItem('/denial-management', '⚠️', 'Denials & Appeals')}
          {navItem('/telehealth-billing', '💻', 'Telehealth Billing')}
          {navItem('/patient-portal-billing', '🧾', 'Patient Billing')}
          {navItem('/superbills', '🧮', 'Superbills')}
          {navItem('/eligibility', '✅', 'Eligibility Check')}
          {navItem('/patient-statements', '📄', 'Patient Statements')}
          {navItem('/batch-claims', '📦', 'Batch Claims')}
          {navItem('/fee-schedules', '💲', 'Fee Schedules')}
          {navItem('/insurance-cards', '🪪', 'Insurance Cards')}
          {navItem('/cost-estimator', '💲', 'Cost Estimator')}
          {navItem('/charge-posting', '💰', 'Charge Posting')}
        </ul>
        )}
      </div>

      {/* Admin Toolkit — all roles */}
      <div className="sidebar-section">
        <div
          className="sidebar-section-title"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
          onClick={() => toggleSection('admin')}
        >
          <span>Administration</span>
          <span style={{ fontSize: 9, opacity: 0.6, transition: 'transform 0.15s' }}>
            {expanded.admin ? '▼' : '▶'}
          </span>
        </div>
        {expanded.admin && (
        <ul className="sidebar-nav">
          {navItem('/admin-toolkit','🗂️', 'Admin Toolkit')}
          {navItem('/documents', '📂', 'Documents')}
          {navItem('/intake-forms', '📝', 'Intake Forms')}
          {navItem('/efax', '📠', 'eFax Center')}
          {navItem('/waitlist', '⏳', 'Patient Waitlist')}
          {navItem('/patient-checkin', '📱', 'Patient Check-In')}
          {navItem('/tasks', '✅', 'Task Manager')}
          {navItem('/scheduling-templates', '📅', 'Schedule Templates')}
          {isFrontDesk && navItem('/audit-trail', '📜', 'Audit Trail')}
          {isFrontDesk && navItem('/btg-audit', '🔓', 'BTG Audit Log')}
          {navItem('/marketplace', '🏪', 'App Marketplace')}
          {navItem('/api-docs', '🔧', 'API Documentation')}
          {navPrefs.showApptReminders && navItem('/appointment-reminders', '📣', 'Appt Reminders')}
          {navItem('/immunization-registry', '💉', 'Immunization Registry')}
          {navItem('/multi-location', '🏢', 'Multi-Location')}
          {navItem('/practice-marketing', '📢', 'Marketing & Reputation')}
          {navItem('/ehr-comparison', '🏆', 'EHR Comparison')}
          {navItem('/settings', '⚙️', 'Settings')}
        </ul>
        )}
      </div>

      <div className="sidebar-user">
        <div className="sidebar-user-card">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-details">
            <div className="sidebar-user-name">
              {currentUser?.firstName} {currentUser?.lastName}
            </div>
            <div className="sidebar-user-role">
              {roleLabel[currentUser?.role] || currentUser?.role}
            </div>
          </div>
          <button
            onClick={() => { if (window.confirm('Sign out of Clarity? Any unsaved changes will be lost.')) logout(); }}
            className="sidebar-sign-out"
            title="Sign Out"
          >
            🚪
          </button>
        </div>
      </div>
    </aside>
  );
}
