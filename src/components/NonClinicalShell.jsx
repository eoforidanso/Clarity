import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';
import { useDemo } from '../demo/DemoContext';
import { useGuidedTour } from '../demo/DemoGuidedTourProvider';
import { useConfirm } from '../contexts/ConfirmContext';
import {
  Squares2X2Icon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  WrenchScrewdriverIcon,
  UsersIcon,
  UserGroupIcon,
  BuildingOffice2Icon,
  LinkIcon,
  MegaphoneIcon,
  BoltIcon,
  DocumentMagnifyingGlassIcon,
  ShieldCheckIcon,
  EyeIcon,
  FolderIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  IdentificationIcon,
  PrinterIcon,
  CheckBadgeIcon,
  ShoppingCartIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  KeyIcon,
  CurrencyDollarIcon,
  ReceiptPercentIcon,
  ExclamationTriangleIcon,
  DocumentCheckIcon,
  ArchiveBoxIcon,
  CreditCardIcon,
  ArrowPathIcon,
  BuildingLibraryIcon,
  CalculatorIcon,
  MagnifyingGlassCircleIcon,
  ChartBarSquareIcon,
  ComputerDesktopIcon,
  ReceiptRefundIcon,
  ChartBarIcon,
  TrophyIcon,
  GlobeAltIcon,
  FlagIcon,
  SignalIcon,
  ArrowsRightLeftIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

export default function NonClinicalShell() {
  const { currentUser, logout } = useAuth();
  const { isDemo } = useDemo();
  const { isNavLocked } = useGuidedTour();
  const confirm = useConfirm();
  const { appointments } = usePatient();
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('nonclinical_shell_expanded');
      const parsed = saved ? JSON.parse(saved) : {};
      return {
        navigation:    parsed.navigation    ?? true,
        admin:         parsed.admin         ?? false,
        moreAdmin:     parsed.moreAdmin     ?? false,
        billing:       parsed.billing       ?? false,
        reports:       parsed.reports       ?? false,
        clearinghouse: parsed.clearinghouse ?? false,
      };
    } catch {
      return { navigation: true, admin: false, moreAdmin: false, billing: false, reports: false, clearinghouse: false };
    }
  });

  useEffect(() => {
    try { localStorage.setItem('nonclinical_shell_expanded', JSON.stringify(expanded)); } catch {}
  }, [expanded]);

  const toggleSection = key => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const todayApptCount = appointments.filter(
    a => (currentUser?.role === 'front_desk' || currentUser?.role === 'admin') && a.status !== 'Completed'
  ).length;

  const isBiller    = currentUser?.role === 'biller';
  const isAdmin     = currentUser?.role === 'admin';
  const isFrontDesk = currentUser?.role === 'front_desk';

  const initials = currentUser
    ? `${currentUser.firstName?.[0] || ''}${currentUser.lastName?.[0] || ''}`
    : '';

  const roleLabel = {
    admin:      'System Administrator',
    front_desk: 'Front Desk Staff',
    biller:     'Billing Specialist',
  }[currentUser?.role] || 'Staff';

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
        {expanded[key] ? '▴ Less' : '▾ More'}
      </button>
    </li>
  );

  return (
    <aside className="sidebar" role="navigation" aria-label="Operations navigation">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-inner">
            <div className="logo-mark">🧠</div>
            <div className="logo-text">
              <h1>Clarity</h1>
              <span style={{ color: '#c4b5fd', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Operations</span>
            </div>
          </div>
        </div>
      </div>

      <div className="sidebar-content">
        <div className="sidebar-section">
          {sectionTitle('Navigation', 'navigation')}
          {expanded.navigation && (
            <ul className="sidebar-nav">
              {navItem('/dashboard',                Squares2X2Icon,         'Dashboard')}
              {!isBiller && navItem('/schedule',    CalendarDaysIcon,       'Schedule', todayApptCount)}
              {navItem('/patients',                 MagnifyingGlassIcon,    'Patient Search')}
              {!isBiller && navItem('/patient-registration',  ClipboardDocumentListIcon, 'Patient Registration')}
              {!isBiller && navItem('/patient-checkin',       CheckCircleIcon,           'Patient Check-In')}
              {!isBiller && navItem('/waitlist',              ClockIcon,                 'Waitlist')}
              {!isBiller && navItem('/appointment-reminders', BellIcon,                  'Appt Reminders')}
              {navItem('/staff-messaging',          ChatBubbleLeftRightIcon, 'Staff Messaging')}
            </ul>
          )}
        </div>

        {(isAdmin || isFrontDesk) && (
          <div className="sidebar-section">
            {sectionTitle('Administration', 'admin', '#6ee7b7', '#10b981')}
            {expanded.admin && (
              <ul className="sidebar-nav">
                {isAdmin && navItem('/admin-toolkit',       WrenchScrewdriverIcon,  'Admin Toolkit')}
                {isAdmin && navItem('/user-management',     UsersIcon,              'User Management')}
                {isAdmin && navItem('/provider-management', UserGroupIcon,          'Providers')}
                {isAdmin && navItem('/multi-location',      BuildingOffice2Icon,    'Multi-Location')}
                {navItem('/settings',                       Cog6ToothIcon,          'Settings')}
                {moreToggle('moreAdmin')}
                {expanded.moreAdmin && (
                  <>
                    {isAdmin && navItem('/role-permissions',     KeyIcon,                  'Role Permissions')}
                    {isAdmin && navItem('/network-integrations', LinkIcon,                 'Integrations')}
                    {isAdmin && navItem('/practice-marketing',   MegaphoneIcon,            'Practice Marketing')}
                    {isAdmin && navItem('/operational-signals',  BoltIcon,                 'Operational Signals')}
                    {isAdmin && navItem('/audit-trail',          DocumentMagnifyingGlassIcon, 'Audit Trail')}
                    {isAdmin && navItem('/security-console',     ShieldCheckIcon,          'Security Console')}
                    {isAdmin && navItem('/btg-audit',            EyeIcon,                  'BTG Audit Log')}
                    {navItem('/documents',                       FolderIcon,               'Documents')}
                    {navItem('/consents',                        PencilSquareIcon,         'Consent Forms')}
                    {navItem('/intake-forms',                    DocumentTextIcon,         'Intake Forms')}
                    {navItem('/insurance-cards',                 IdentificationIcon,       'Insurance Cards')}
                    {navItem('/efax',                            PrinterIcon,              'eFax Center')}
                    {navItem('/tasks',                           CheckBadgeIcon,           'Task Management')}
                    {isAdmin && navItem('/marketplace',          ShoppingCartIcon,         'App Marketplace')}
                    {isAdmin && navItem('/api-docs',             BookOpenIcon,             'API Documentation')}
                  </>
                )}
              </ul>
            )}
          </div>
        )}

        <div className="sidebar-section">
          {sectionTitle('Billing & RCM', 'billing', '#c4b5fd', '#8b5cf6')}
          {expanded.billing && (
            <ul className="sidebar-nav">
              {navItem('/billing-dashboard',      CurrencyDollarIcon,      'Billing Dashboard')}
              {navItem('/claims-management',      DocumentCheckIcon,       'Claims')}
              {navItem('/denial-management',      ExclamationTriangleIcon, 'Denials & Appeals')}
              {navItem('/eligibility',            CheckCircleIcon,         'Eligibility Check')}
              {navItem('/prior-auth',             ShieldCheckIcon,         'Prior Auth')}
              {navItem('/superbills',             ReceiptPercentIcon,      'Superbills')}
              {navItem('/patient-statements',     DocumentTextIcon,        'Patient Statements')}
              {navItem('/batch-claims',           ArchiveBoxIcon,          'Batch Claims')}
              {navItem('/charge-posting',         CreditCardIcon,          'Charge Posting')}
              {navItem('/remittance-posting',     CreditCardIcon,          'Remittance Posting')}
              {navItem('/era-posting',            ArrowPathIcon,           'ERA Auto-Posting')}
              {navItem('/payer-profiles',         BuildingLibraryIcon,     'Payer Profiles')}
              {navItem('/fee-schedules',          CalculatorIcon,          'Fee Schedules')}
              {navItem('/scrubber-rules',         MagnifyingGlassCircleIcon, 'Scrubber Rules')}
              {navItem('/contract-variance',      ChartBarSquareIcon,      'Contract Variance')}
              {navItem('/cost-estimator',         CalculatorIcon,          'Cost Estimator')}
              {navItem('/telehealth-billing',     ComputerDesktopIcon,     'Telehealth Billing')}
              {navItem('/patient-portal-billing', ReceiptRefundIcon,       'Patient Billing Portal')}
              {isBiller && navItem('/settings',   Cog6ToothIcon,           'Settings')}
            </ul>
          )}
        </div>

        <div className="sidebar-section">
          {sectionTitle('Reports & Analytics', 'reports', '#fcd34d', '#f59e0b')}
          {expanded.reports && (
            <ul className="sidebar-nav">
              {navItem('/analytics',            ChartBarIcon,     'Analytics')}
              {navItem('/report-builder',       DocumentTextIcon, 'Report Builder')}
              {navItem('/quality-measures',     ChartBarSquareIcon, 'Quality Measures')}
              {navItem('/clinical-outcomes',    ChartBarIcon,     'Clinical Outcomes')}
              {navItem('/provider-performance', TrophyIcon,       'Provider Performance')}
              {navItem('/population-health',    GlobeAltIcon,     'Population Health')}
              {navItem('/care-gaps',            FlagIcon,         'Care Gaps')}
            </ul>
          )}
        </div>

        <div className="sidebar-section">
          {sectionTitle('Clearinghouse / EDI', 'clearinghouse', '#fca5a5', '#ef4444')}
          {expanded.clearinghouse && (
            <ul className="sidebar-nav">
              {navItem('/edi-transport',  SignalIcon,          'EDI Transport')}
              {navItem('/edi-routing',    ArrowsRightLeftIcon, 'EDI Routing')}
              {navItem('/edi-837',        ArrowUpTrayIcon,     'EDI 837 Generator')}
              {navItem('/edi-999',        ArrowDownTrayIcon,   'EDI 999 Parser')}
              {navItem('/edi-270',        MagnifyingGlassIcon, 'EDI 270 Eligibility')}
              {navItem('/edi-835',        CreditCardIcon,      'EDI 835 Remittance')}
              {navItem('/edi-monitoring', SignalIcon,          'EDI Monitoring')}
              {isAdmin && navItem('/edi-api', LinkIcon,        'EDI API Portal')}
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
