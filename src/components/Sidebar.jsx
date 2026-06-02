import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';
import { getNavPrefs, getAIFeatures } from '../pages/Settings';
import { useDemo } from '../demo/DemoContext';

export default function Sidebar() {
  const { currentUser, logout } = useAuth();
  const { isDemo } = useDemo();
  const { inboxMessages, selectedPatient, openCharts, appointments } = usePatient();
  const location = useLocation();
  const navigate = useNavigate();
  const navPrefs = getNavPrefs();
  const aiPrefs = getAIFeatures();
  const [chartExpanded, setChartExpanded] = useState(true);

  // ── Sidebar width collapse (icon-only mode) ──────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar_nav_collapsed') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-sidebar', sidebarCollapsed ? 'collapsed' : 'expanded');
    try { localStorage.setItem('sidebar_nav_collapsed', String(sidebarCollapsed)); } catch {}
  }, [sidebarCollapsed]);

  // ── Collapsible section state ────────────────────────────
  const [expanded, setExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_expanded');
      return saved ? JSON.parse(saved) : { navigation: true, chart: true, clinical: false, billing: false, clearinghouse: false, api: false, admin: false };
    } catch {
      return { navigation: true, chart: true, clinical: false, billing: false, clearinghouse: false, api: false, admin: false };
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
    (m) => !m.read && (m.to === currentUser?.id || currentUser?.role === 'front_desk' || currentUser?.role === 'admin')
  ).length;

  const todayApptCount = appointments.filter(
    (a) => (a.provider === currentUser?.id || currentUser?.role === 'front_desk' || currentUser?.role === 'admin') && a.status !== 'Completed'
  ).length;

  const isPrescriber = currentUser?.role === 'prescriber';
  const isNurse = currentUser?.role === 'nurse';
  const isFrontDesk = currentUser?.role === 'front_desk';
  const isAdmin = currentUser?.role === 'admin';
  const isAdminOrFrontDesk = isFrontDesk || isAdmin;
  const isTherapist = currentUser?.role === 'therapist';

  const initials = currentUser
    ? `${currentUser.firstName?.[0] || ''}${currentUser.lastName?.[0] || ''}`
    : '';

  const roleLabel = {
    prescriber: currentUser?.credentials || 'Prescriber',
    front_desk: 'Front Desk Staff',
    admin: 'System Administrator',
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
    <aside className="sidebar" role="navigation" aria-label="Main navigation">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-inner">
          <div className="logo-mark">🧠</div>
          <div className="logo-text">
            <h1>Clarity</h1>
            <span>Outpatient EHR</span>
          </div>
          {/* Collapse arrow — visible on expanded sidebar */}
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              title="Collapse sidebar"
              style={{ marginLeft: 'auto', width: 22, height: 22, borderRadius: 5, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
            >‹</button>
          )}
        </div>
        {/* Expand arrow — visible only when collapsed */}
        {sidebarCollapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 0' }}>
            <button
              onClick={() => setSidebarCollapsed(false)}
              title="Expand sidebar"
              style={{ width: 28, height: 22, borderRadius: 5, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
            >›</button>
          </div>
        )}
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

      {/* ── DOMAIN: CLINICAL ── */}
      <div className="sidebar-section">
        <div
          className="sidebar-section-title"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none', borderLeft: '3px solid #3b82f6', paddingLeft: 6 }}
          onClick={() => toggleSection('clinical')}
        >
          <span style={{ color: '#93c5fd' }}>🩺 Clinical</span>
          <span style={{ fontSize: 9, opacity: 0.6 }}>{expanded.clinical ? '▼' : '▶'}</span>
        </div>
        {expanded.clinical && (
        <ul className="sidebar-nav">
          {navItem('/telehealth',       '📹', 'Telehealth')}
          {navItem('/group-telehealth', '👥', 'Group Telehealth')}
          {(isPrescriber || isNurse) && navItem('/prescribe', '💊', 'E-Prescribe')}
          {isTherapist && navItem('/prescribe', '🔀', 'Refill Requests')}
          {navItem('/smart-phrases',    '⚡', 'Smart Phrases')}
          {navItem('/patient-chat',     '💬', 'Patient Chat')}
          {navItem('/treatment-plans',  '📋', 'Treatment Plans')}
          {navItem('/referrals',        '🔄', 'Referrals')}
          {navItem('/prior-auth',       '🔐', 'Prior Auth')}
          {navItem('/med-rec',          '💊', 'Med Reconciliation')}
          {aiPrefs.cdsAlerts && navItem('/cds-alerts', '🧠', 'CDS Alerts')}
          {navItem('/patient-recall',   '📞', 'Patient Recall')}
          {navItem('/patient-education','📚', 'Patient Education')}
          {navItem('/consents',         '✍️', 'Consent Forms')}
          {navItem('/secure-notes',     '🔒', 'Secure Notes')}
          {navItem('/lab-tracking',     '🔬', 'Lab Tracking')}
          {navItem('/vitals-trending',  '📈', 'Vitals Trending')}
          {aiPrefs.aiTriage && navItem('/ai-triage', '🤖', 'AI Triage Chat')}
          {aiPrefs.ambientSoap && navItem('/ambient-scribe', '🎙️', 'Ambient AI Scribe')}
          {navItem('/order-sets',       '📦', 'Order Set Templates')}
          {navItem('/analytics',        '📊', 'Analytics')}
          {navItem('/care-gaps',        '🎯', 'Care Gaps')}
          {navItem('/quality-measures', '📊', 'Quality Measures')}
          {navItem('/clinical-outcomes','📉', 'Clinical Outcomes')}
          {navItem('/provider-performance', '🏆', 'Provider Performance')}
          {navItem('/report-builder',   '📊', 'Report Builder')}
          {navItem('/population-health','🌍', 'Population Health')}
          {navItem('/operational-signals', '⚡', 'Operational Signals')}
        </ul>
        )}
      </div>

      {/* ── DOMAIN: BILLING ── */}
      <div className="sidebar-section">
        <div
          className="sidebar-section-title"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none', borderLeft: '3px solid #8b5cf6', paddingLeft: 6 }}
          onClick={() => toggleSection('billing')}
        >
          <span style={{ color: '#c4b5fd' }}>💰 Billing & RCM</span>
          <span style={{ fontSize: 9, opacity: 0.6 }}>{expanded.billing ? '▼' : '▶'}</span>
        </div>
        {expanded.billing && (
        <ul className="sidebar-nav">
          {navItem('/billing-dashboard',     '💰', 'Billing Dashboard')}
          {navItem('/claims-management',     '📋', 'Claims')}
          {navItem('/denial-management',     '⚠️', 'Denials & Appeals')}
          {navItem('/telehealth-billing',    '💻', 'Telehealth Billing')}
          {navItem('/patient-portal-billing','🧾', 'Patient Billing')}
          {navItem('/superbills',            '🧮', 'Superbills')}
          {navItem('/eligibility',           '✅', 'Eligibility Check')}
          {navItem('/patient-statements',    '📄', 'Patient Statements')}
          {navItem('/batch-claims',          '📦', 'Batch Claims')}
          {navItem('/payer-profiles',        '🏥', 'Payer Profiles')}
          {navItem('/remittance-posting',    '💳', 'Remittance Posting')}
          {navItem('/scrubber-rules',        '🔍', 'Scrubber Rules')}
          {navItem('/era-posting',           '💡', 'ERA Auto-Posting')}
          {navItem('/contract-variance',     '📊', 'Contract Variance')}
          {navItem('/fee-schedules',         '💲', 'Fee Schedules')}
          {navItem('/insurance-cards',       '🪪', 'Insurance Cards')}
          {navItem('/cost-estimator',        '💲', 'Cost Estimator')}
          {navItem('/charge-posting',        '💰', 'Charge Posting')}
        </ul>
        )}
      </div>

      {/* ── DOMAIN: CLEARINGHOUSE ── */}
      {isDemo ? (
        <div style={{
          margin: '4px 10px 8px',
          padding: '11px 13px',
          borderRadius: 9,
          background: 'rgba(20,184,166,0.07)',
          border: '1px solid rgba(20,184,166,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <span style={{ fontSize: 11 }}>🔀</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#5eead4', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clearinghouse</span>
            <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>Demo</span>
          </div>
          <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, margin: '0 0 7px' }}>
            EDI Transport, 837P, 835 ERA, and routing tools are available in live environments.
          </p>
          <a href="mailto:info@clarity-ehr.com?subject=Clarity EHR Demo Request"
            style={{ fontSize: 10, fontWeight: 700, color: '#5eead4', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            Request full access →
          </a>
        </div>
      ) : (
        <div className="sidebar-section">
          <div
            className="sidebar-section-title"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none', borderLeft: '3px solid #14b8a6', paddingLeft: 6 }}
            onClick={() => toggleSection('clearinghouse')}
          >
            <span style={{ color: '#5eead4' }}>🔀 Clearinghouse</span>
            <span style={{ fontSize: 9, opacity: 0.6 }}>{expanded.clearinghouse ? '▼' : '▶'}</span>
          </div>
          {expanded.clearinghouse && (
          <ul className="sidebar-nav">
            {navItem('/edi-transport',  '🔌', 'EDI Transport')}
            {navItem('/edi-routing',    '🔀', 'EDI Routing Engine')}
            {navItem('/edi-837',        '⚙️', '837P Generator')}
            {navItem('/edi-999',        '✅', '999 / 277CA Parser')}
            {navItem('/edi-270',        '🔍', '270 / 271 Engine')}
            {navItem('/edi-835',        '💰', '835 ERA Listener')}
            {navItem('/edi-monitoring', '📡', 'EDI Monitoring')}
            {navItem('/edi-api',        '🌐', 'EDI API Portal')}
          </ul>
          )}
        </div>
      )}

      {/* ── DOMAIN: DEVELOPER / API ── */}
      {isDemo ? (
        <div style={{
          margin: '0 10px 12px',
          padding: '11px 13px',
          borderRadius: 9,
          background: 'rgba(249,115,22,0.07)',
          border: '1px solid rgba(249,115,22,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <span style={{ fontSize: 11 }}>🔧</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#fdba74', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Developer / API</span>
            <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>Demo</span>
          </div>
          <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, margin: '0 0 7px' }}>
            API docs, network integrations, and developer tools are available in live environments.
          </p>
          <a href="mailto:info@clarity-ehr.com?subject=Clarity EHR Demo Request"
            style={{ fontSize: 10, fontWeight: 700, color: '#fdba74', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            Request full access →
          </a>
        </div>
      ) : (
        <div className="sidebar-section">
          <div
            className="sidebar-section-title"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none', borderLeft: '3px solid #f97316', paddingLeft: 6 }}
            onClick={() => toggleSection('api')}
          >
            <span style={{ color: '#fdba74' }}>🔧 Developer / API</span>
            <span style={{ fontSize: 9, opacity: 0.6 }}>{expanded.api ? '▼' : '▶'}</span>
          </div>
          {expanded.api && (
          <ul className="sidebar-nav">
            {navItem('/api-docs',             '📖', 'API Documentation')}
            {navItem('/network-integrations', '🌐', 'Network Integrations')}
            {navItem('/care-everywhere',      '🔄', 'Care Everywhere (HIE)')}
            {navItem('/marketplace',          '🏪', 'App Marketplace')}
          </ul>
          )}
        </div>
      )}

      {/* ── ADMINISTRATION ── */}
      <div className="sidebar-section">
        <div
          className="sidebar-section-title"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
          onClick={() => toggleSection('admin')}
        >
          <span>Administration</span>
          <span style={{ fontSize: 9, opacity: 0.6 }}>{expanded.admin ? '▼' : '▶'}</span>
        </div>
        {expanded.admin && (
        <ul className="sidebar-nav">
          {navItem('/admin-toolkit',          '🗂️', 'Admin Toolkit')}
          {navItem('/documents',              '📂', 'Documents')}
          {navItem('/intake-forms',           '📝', 'Intake Forms')}
          {navItem('/efax',                   '📠', 'eFax Center')}
          {navItem('/waitlist',               '⏳', 'Patient Waitlist')}
          {navItem('/patient-checkin',        '📱', 'Patient Check-In')}
          {navItem('/tasks',                  '✅', 'Task Manager')}
          {navItem('/scheduling-templates',   '📅', 'Schedule Templates')}
          {navPrefs.showApptReminders && navItem('/appointment-reminders', '📣', 'Appt Reminders')}
          {navItem('/immunization-registry',  '💉', 'Immunization Registry')}
          {navItem('/multi-location',         '🏢', 'Multi-Location')}
          {navItem('/practice-marketing',     '📢', 'Marketing & Reputation')}
          {navItem('/ehr-comparison',         '🏆', 'EHR Comparison')}
          {isAdminOrFrontDesk && navItem('/audit-trail',       '📜', 'Audit Trail')}
          {isAdminOrFrontDesk && navItem('/btg-audit',         '🔓', 'BTG Audit Log')}
          {isAdminOrFrontDesk && navItem('/role-permissions',  '🔐', 'Role Permissions')}
          {isAdminOrFrontDesk && navItem('/user-management',   '👥', 'User Management')}
          {isAdminOrFrontDesk && navItem('/provider-management','🩺','Provider NPI/DEA')}
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
      {/* Sidebar collapse toggle — bottom strip */}
      <div style={{ padding: '4px 10px 6px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={() => setSidebarCollapsed(v => !v)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: 6,
            padding: '5px 8px', borderRadius: 6,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.15s',
            textTransform: 'uppercase', letterSpacing: '0.4px',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
        >
          <span style={{ fontSize: 14 }}>{sidebarCollapsed ? '›' : '‹'}</span>
          {!sidebarCollapsed && <span>Collapse sidebar</span>}
        </button>
      </div>
    </aside>
  );
}
