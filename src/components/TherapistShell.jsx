import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';
import { useDemo } from '../demo/DemoContext';
import { useGuidedTour } from '../demo/DemoGuidedTourProvider';
import { useConfirm } from '../contexts/ConfirmContext';
import {
  Squares2X2Icon,
  UsersIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  FlagIcon,
  DocumentTextIcon,
  ClockIcon,
  PencilSquareIcon,
  FolderIcon,
  VideoCameraIcon,
  UserGroupIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

export default function TherapistShell() {
  const { currentUser, logout } = useAuth();
  const { isNavLocked } = useGuidedTour();
  const confirm = useConfirm();
  const { selectedPatient, openCharts, appointments } = usePatient();
  const location = useLocation();
  const navigate = useNavigate();

  const [clientChartExpanded, setClientChartExpanded] = useState(true);
  const [expanded, setExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('therapist_shell_expanded');
      const parsed = saved ? JSON.parse(saved) : {};
      return {
        navigation: parsed.navigation ?? true,
        chart:      parsed.chart      ?? true,
        tools:      parsed.tools      ?? false,
        moreTools:  parsed.moreTools  ?? false,
      };
    } catch {
      return { navigation: true, chart: true, tools: false, moreTools: false };
    }
  });

  useEffect(() => {
    try { localStorage.setItem('therapist_shell_expanded', JSON.stringify(expanded)); } catch {}
  }, [expanded]);

  const toggleSection = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const todaySessionCount = appointments.filter(
    a => a.provider === currentUser?.id && a.status !== 'Completed'
  ).length;

  const initials = currentUser
    ? `${currentUser.firstName?.[0] || ''}${currentUser.lastName?.[0] || ''}`
    : '';

  const roleLabel = currentUser?.credentials || 'Therapist';

  const navItem = (to, Icon, label, badge) => (
    <li key={`${to}-${label}`}>
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

  const clientChartLinks = [
    { key: 'summary',      Icon: ClipboardDocumentCheckIcon, label: 'Chart Summary' },
    { key: 'encounters',   Icon: DocumentTextIcon,           label: 'Encounters' },
    { key: 'demographics', Icon: UserCircleIcon,             label: 'Demographics' },
    { key: 'assessments',  Icon: ChartBarIcon,               label: 'Assessments' },
  ];

  const chartActive = seg => location.pathname.includes(`/${seg}`) ? 'active' : '';

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
    <aside className="sidebar" role="navigation" aria-label="Therapist navigation">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-inner">
            <div className="logo-mark">🧠</div>
            <div className="logo-text">
              <h1>Clarity</h1>
              <span style={{ color: '#a78bfa', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Therapy</span>
            </div>
          </div>
        </div>

        {openCharts.length > 0 && (
          <div className="sidebar-patient-ctx" style={{ cursor: 'default', padding: '8px 14px' }}>
            <div className="sidebar-patient-ctx-label">📌 Open Clients ({openCharts.length}/4)</div>
            {openCharts.map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/chart/${p.id}/summary`)}
                title={`Go to ${p.firstName} ${p.lastName}`}
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
              {navItem('/patients',        UsersIcon,               'Clients')}
              {navItem('/schedule',        CalendarDaysIcon,        'Sessions', todaySessionCount)}
              {navItem('/staff-messaging', ChatBubbleLeftRightIcon, 'Messaging')}
            </ul>
          )}
        </div>

        {selectedPatient && (
          <div className="sidebar-section">
            <div
              className="sidebar-section-title"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
              onClick={() => setClientChartExpanded(v => !v)}
            >
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                Client Chart
              </span>
              <span style={{ fontSize: 8, opacity: 0.5 }}>{clientChartExpanded ? '▼' : '▶'}</span>
            </div>
            {clientChartExpanded && (
              <ul className="sidebar-nav">
                {clientChartLinks.map(({ key, Icon, label }) => (
                  <li key={key}>
                    <NavLink to={`/chart/${selectedPatient.id}/${key}`} className={chartActive(key)}>
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
          {sectionTitle('Therapy Tools', 'tools', '#a78bfa', '#7c3aed')}
          {expanded.tools && (
            <ul className="sidebar-nav">
              {navItem('/treatment-plans', ClipboardDocumentListIcon, 'Treatment Plans')}
              {navItem('/goals',           FlagIcon,                  'Goals & Objectives')}
              {navItem('/secure-notes',    DocumentTextIcon,          'Progress Notes')}
              {navItem('/schedule',        ClockIcon,                 'Session History')}
              {moreToggle('moreTools')}
              {expanded.moreTools && (
                <>
                  {navItem('/consents',          PencilSquareIcon,        'Consent Forms')}
                  {navItem('/documents',         FolderIcon,              'Documents')}
                  {navItem('/telehealth',        VideoCameraIcon,         'Telehealth')}
                  {navItem('/group-telehealth',  UserGroupIcon,           'Group Sessions')}
                  {navItem('/billing-dashboard', CreditCardIcon,          'Billing')}
                  {navItem('/settings',          Cog6ToothIcon,           'Settings')}
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
              onClick={async () => {
                const ok = await confirm({ title: 'Sign out?', message: 'Any unsaved changes will be lost.', confirmLabel: 'Sign out', cancelLabel: 'Stay', danger: true });
                if (ok) logout();
              }}
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
