import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';
import { getAIFeatures } from '../pages/Settings';
import { useDemo } from '../demo/DemoContext';
import { useGuidedTour } from '../demo/DemoGuidedTourProvider';
import { useConfirm } from '../contexts/ConfirmContext';
import {
  Squares2X2Icon,
  CalendarDaysIcon,
  InboxIcon,
  MagnifyingGlassIcon,
  VideoCameraIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  UserCircleIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  CpuChipIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  LockClosedIcon,
  PhoneIcon,
  BoltIcon,
  UserGroupIcon,
  FlagIcon,
  ArrowTrendingDownIcon,
  FolderIcon,
  Cog6ToothIcon,
  PlusCircleIcon,
  CurrencyDollarIcon,
  MicrophoneIcon,
  BriefcaseIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

export default function ClinicalShell() {
  const { currentUser, logout } = useAuth();
  const { isDemo } = useDemo();
  const { isNavLocked } = useGuidedTour();
  const confirm = useConfirm();
  const { inboxMessages, selectedPatient, openCharts, appointments } = usePatient();
  const location = useLocation();
  const navigate = useNavigate();
  const aiPrefs = getAIFeatures();

  const [chartExpanded, setChartExpanded] = useState(true);
  const [expanded, setExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('clinical_shell_expanded');
      const parsed = saved ? JSON.parse(saved) : {};
      return {
        navigation:   parsed.navigation   ?? true,
        chart:        parsed.chart        ?? true,
        clinical:     parsed.clinical     ?? false,
        moreClinical: parsed.moreClinical ?? false,
      };
    } catch {
      return { navigation: true, chart: true, clinical: false, moreClinical: false };
    }
  });

  useEffect(() => {
    try { localStorage.setItem('clinical_shell_expanded', JSON.stringify(expanded)); } catch {}
  }, [expanded]);

  const toggleSection = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const unreadCount = inboxMessages.filter(
    m => !m.read && (m.to === currentUser?.id || currentUser?.role === 'nurse')
  ).length;

  const todayApptCount = appointments.filter(
    a => a.provider === currentUser?.id && a.status !== 'Completed'
  ).length;

  const canPrescribe = currentUser?.prescriptive_authority !== false &&
    currentUser?.role !== 'nurse';

  const initials = currentUser
    ? `${currentUser.firstName?.[0] || ''}${currentUser.lastName?.[0] || ''}`
    : '';

  const roleLabel = {
    prescriber: currentUser?.credentials || 'Prescriber',
    nurse: 'Nurse / MA',
  }[currentUser?.role] || 'Clinician';

  const navItem = (to, Icon, label, badge) => (
    <li key={to}>
      <NavLink
        to={to}
        className={({ isActive }) => isActive ? 'active' : ''}
        onClick={isNavLocked ? e => e.preventDefault() : undefined}
        style={isNavLocked ? { pointerEvents: 'none', opacity: 0.45, cursor: 'default' } : undefined}
        tabIndex={isNavLocked ? -1 : undefined}
      >
        <span className="sidebar-nav-icon"><Icon style={{ width: 16, height: 16 }} /></span>
        {label}
        {badge != null && badge > 0 && <span className="nav-badge">{badge}</span>}
      </NavLink>
    </li>
  );

  const chartLinks = [
    { key: 'summary',       Icon: ClipboardDocumentCheckIcon, label: 'Chart Summary' },
    { key: 'encounters',    Icon: DocumentTextIcon,           label: 'Encounters' },
    { key: 'demographics',  Icon: UserCircleIcon,             label: 'Demographics' },
    { key: 'allergies',     Icon: ExclamationTriangleIcon,    label: 'Allergies' },
    { key: 'problems',      Icon: ClipboardDocumentListIcon,  label: 'Problem List' },
    { key: 'vitals',        Icon: HeartIcon,                  label: 'Vitals' },
    { key: 'medications',   Icon: CpuChipIcon,                label: 'Medications' },
    { key: 'orders',        Icon: DocumentTextIcon,           label: 'Orders' },
    { key: 'assessments',   Icon: ChartBarIcon,               label: 'Assessments' },
    { key: 'immunizations', Icon: ShieldCheckIcon,            label: 'Immunizations' },
    { key: 'labs',          Icon: BeakerIcon,                 label: 'Lab Results' },
  ];

  const chartActive = seg => location.pathname.includes(seg) ? 'active' : '';

  const sectionTitle = (label, key, color, accent) => (
    <div
      className="sidebar-section-title"
      style={{
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', userSelect: 'none',
        ...(accent ? { borderLeft: `3px solid ${accent}`, paddingLeft: 6 } : {}),
      }}
      onClick={() => toggleSection(key)}
    >
      <span style={{ color: color || 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: 8, opacity: 0.5 }}>{expanded[key] ? '▼' : '▶'}</span>
    </div>
  );

  const moreToggle = (key) => (
    <li>
      <button
        onClick={() => toggleSection(key)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.38)', fontSize: 11,
          padding: '3px 8px 3px 28px', width: '100%', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        {expanded[key] ? '▴ Less' : '▾ More tools'}
      </button>
    </li>
  );

  return (
    <aside className="sidebar" role="navigation" aria-label="Clinical navigation">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-inner">
            <div className="logo-mark">🧠</div>
            <div className="logo-text">
              <h1>Clarity</h1>
              <span style={{ color: '#93c5fd', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Clinical</span>
            </div>
          </div>
        </div>
        {openCharts.length > 0 && (
          <div className="sidebar-patient-ctx" style={{ cursor: 'default', padding: '8px 14px' }}>
            <div className="sidebar-patient-ctx-label">📌 Open Charts ({openCharts.length}/4)</div>
            {openCharts.map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/chart/${p.id}/summary`)}
                title={`Go to ${p.firstName} ${p.lastName}'s chart`}
                style={{
                  cursor: 'pointer', padding: '4px 0',
                  borderBottom: p.id !== openCharts[openCharts.length - 1]?.id ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  opacity: selectedPatient?.id === p.id ? 1 : 0.7,
                  fontWeight: selectedPatient?.id === p.id ? 700 : 400,
                }}
              >
                <div className="sidebar-patient-ctx-name" style={{ fontSize: 12 }}>
                  {selectedPatient?.id === p.id ? '▸ ' : ''}{p.lastName}, {p.firstName}
                </div>
                <div className="sidebar-patient-ctx-detail" style={{ fontSize: 10 }}>MRN {p.mrn}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-content">
        <div className="sidebar-section">
          {sectionTitle('Navigation', 'navigation')}
          {expanded.navigation && (
            <ul className="sidebar-nav">
              {navItem('/dashboard',       Squares2X2Icon,          'Dashboard')}
              {navItem('/schedule',        CalendarDaysIcon,        'Schedule', todayApptCount)}
              {navItem('/inbox',           InboxIcon,               'Clinical Inbox', unreadCount)}
              {navItem('/patients',        MagnifyingGlassIcon,     'Patient Search')}
              {navItem('/telehealth',      VideoCameraIcon,         'Telehealth')}
              {navItem('/refill-queue',    ArrowPathIcon,           'Refill Queue')}
              {navItem('/staff-messaging', ChatBubbleLeftRightIcon, 'Staff Messaging')}
            </ul>
          )}
        </div>

        {selectedPatient && (
          <div className="sidebar-section">
            <div
              className="sidebar-section-title"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
              onClick={() => { setChartExpanded(!chartExpanded); setExpanded(prev => ({ ...prev, chart: !chartExpanded })); }}
            >
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                Chart
              </span>
              <span style={{ fontSize: 8, opacity: 0.5 }}>{chartExpanded ? '▼' : '▶'}</span>
            </div>
            {chartExpanded && (
              <ul className="sidebar-nav">
                {chartLinks.map(({ key, Icon, label }) => (
                  <li key={key}>
                    <NavLink to={`/chart/${selectedPatient.id}/${key}`} className={chartActive(`/${key}`)}>
                      <span className="sidebar-nav-icon"><Icon style={{ width: 16, height: 16 }} /></span>
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="sidebar-section">
          {sectionTitle('Clinical Tools', 'clinical', '#93c5fd', '#3b82f6')}
          {expanded.clinical && (
            <ul className="sidebar-nav">
              {canPrescribe && navItem('/prescribe',   CpuChipIcon,              'E-Prescribe')}
              {navItem('/treatment-plans',             ClipboardDocumentListIcon, 'Treatment Plans')}
              {navItem('/vitals-trending',             ChartBarIcon,             'Vitals Trending')}
              {navItem('/lab-tracking',                BeakerIcon,               'Lab Tracking')}
              {navItem('/order-sets',                  DocumentTextIcon,         'Order Sets')}
              {moreToggle('moreClinical')}
              {expanded.moreClinical && (
                <>
                  {navItem('/med-rec',           ArrowPathIcon,           'Med Reconciliation')}
                  {navItem('/referrals',         ArrowPathIcon,           'Referrals')}
                  {navItem('/prior-auth',        LockClosedIcon,          'Prior Auth')}
                  {navItem('/consents',          PencilSquareIcon,        'Consent Forms')}
                  {navItem('/patient-education', BookOpenIcon,            'Patient Education')}
                  {navItem('/secure-notes',      LockClosedIcon,          'Secure Notes')}
                  {navItem('/patient-recall',    PhoneIcon,               'Patient Recall')}
                  {navItem('/smart-phrases',     BoltIcon,                'Smart Phrases')}
                  {navItem('/group-telehealth',  UserGroupIcon,           'Group Telehealth')}
                  {navItem('/care-gaps',         FlagIcon,                'Care Gaps')}
                  {navItem('/clinical-outcomes', ArrowTrendingDownIcon,   'Clinical Outcomes')}
                  {aiPrefs.cdsAlerts   && navItem('/cds-alerts',     CpuChipIcon,    'CDS Alerts')}
                  {aiPrefs.aiTriage    && navItem('/ai-triage',      CpuChipIcon,    'AI Triage')}
                  {aiPrefs.ambientSoap && navItem('/ambient-scribe', MicrophoneIcon, 'Ambient Scribe')}
                  {navItem('/documents', FolderIcon,   'Documents')}
                  {navItem('/settings',  Cog6ToothIcon, 'Settings')}
                </>
              )}
            </ul>
          )}
        </div>

        <div className="sidebar-user">
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-details">
              <div className="sidebar-user-name">{currentUser?.firstName} {currentUser?.lastName}</div>
              <div className="sidebar-user-role">{roleLabel}</div>
            </div>
            <button
              onClick={async () => { const ok = await confirm({ title: 'Sign out?', message: 'Any unsaved changes will be lost.', confirmLabel: 'Sign out', cancelLabel: 'Stay', danger: true }); if (ok) logout(); }}
              className="sidebar-sign-out"
              title="Sign Out"
            >
              🚪 <span className="sidebar-sign-out-text">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
