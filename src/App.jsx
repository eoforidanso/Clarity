import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DemoProvider, useDemo, DemoRouteGuard } from './demo/DemoContext';
import DemoBar from './demo/DemoBar';
import DemoGuidedTourProvider, { useGuidedTour } from './demo/DemoGuidedTourProvider';
import { PatientProvider } from './contexts/PatientContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { TrainingProvider } from './contexts/TrainingContext';
import { SiteProvider } from './contexts/SiteContext';
import { TelehealthProvider } from './contexts/TelehealthContext';
import ErrorBoundary from './components/ErrorBoundary';
import RequirePatient from './components/RequirePatient';
import { applyTheme } from './pages/Settings';

// Eagerly loaded — always needed at startup
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import PatientPortalLogin from './pages/PatientPortalLogin';
import PatientPortal from './pages/PatientPortal';
import Settings from './pages/Settings';
import AdminRoute from './components/AdminRoute';

// Lazy-loaded routes — split into separate chunks
const FinancialPresentation = lazy(() => import('./components/FinancialPresentation'));
const PresentationPrint = lazy(() => import('./components/PresentationPrint'));
const Schedule = lazy(() => import('./pages/Schedule'));
const PatientSearch = lazy(() => import('./pages/PatientSearch'));
const PatientRegistration = lazy(() => import('./pages/PatientRegistration'));
const RefillQueue = lazy(() => import('./pages/RefillQueue'));
const ChartPage = lazy(() => import('./pages/ChartPage'));
const EPrescribe = lazy(() => import('./pages/EPrescribe'));
const Telehealth = lazy(() => import('./pages/Telehealth'));
const Inbox = lazy(() => import('./pages/Inbox'));
const SmartPhrases = lazy(() => import('./pages/SmartPhrases'));
const BTGAuditLog = lazy(() => import('./pages/BTGAuditLog'));
const HealthAdminToolkit = lazy(() => import('./pages/HealthAdminToolkit'));
const GoToSession = lazy(() => import('./pages/GoToSession'));
const PatientChat = lazy(() => import('./pages/PatientChat'));
const Analytics = lazy(() => import('./pages/Analytics'));
const CareGaps = lazy(() => import('./pages/CareGaps'));
const StaffMessaging = lazy(() => import('./pages/StaffMessaging'));
const BillingDashboard = lazy(() => import('./pages/BillingDashboard'));
const ClaimsManagement = lazy(() => import('./pages/ClaimsManagement'));
const DenialManagement = lazy(() => import('./pages/DenialManagement'));
const PayerProfiles = lazy(() => import('./pages/PayerProfiles'));
const RemittancePosting = lazy(() => import('./pages/RemittancePosting'));
const ScrubberRulesEngine = lazy(() => import('./pages/ScrubberRulesEngine'));
const ERAPosting = lazy(() => import('./pages/ERAPosting'));
const ContractVarianceReport = lazy(() => import('./pages/ContractVarianceReport'));
const EDITransportLayer = lazy(() => import('./pages/EDITransportLayer'));
const EDIRoutingEngine = lazy(() => import('./pages/EDIRoutingEngine'));
const EDI837Generator = lazy(() => import('./pages/EDI837Generator'));
const EDI999Parser = lazy(() => import('./pages/EDI999Parser'));
const EDI270Engine = lazy(() => import('./pages/EDI270Engine'));
const EDI835Listener = lazy(() => import('./pages/EDI835Listener'));
const EDIMonitoring = lazy(() => import('./pages/EDIMonitoring'));
const ClinicalOutcomes = lazy(() => import('./pages/ClinicalOutcomes'));
const RolePermissions = lazy(() => import('./pages/RolePermissions'));
const TelehealthBilling = lazy(() => import('./pages/TelehealthBilling'));
const PatientPortalBilling = lazy(() => import('./pages/PatientPortalBilling'));
const QualityMeasures = lazy(() => import('./pages/QualityMeasures'));
const DocumentManagement = lazy(() => import('./pages/DocumentManagement'));
const AuditTrail = lazy(() => import('./pages/AuditTrail'));
const SecurityConsole = lazy(() => import('./pages/SecurityConsole'));
const ReferralManagement = lazy(() => import('./pages/ReferralManagement'));
const PriorAuthTracking = lazy(() => import('./pages/PriorAuthTracking'));
const TreatmentPlans = lazy(() => import('./pages/TreatmentPlans'));
const GoalsObjectives = lazy(() => import('./pages/GoalsObjectives'));
const IntakeForms = lazy(() => import('./pages/IntakeForms'));
const SuperbillCapture = lazy(() => import('./pages/SuperbillCapture'));
const EFaxCenter = lazy(() => import('./pages/EFaxCenter'));
const ProviderPerformance = lazy(() => import('./pages/ProviderPerformance'));
const PatientWaitlist = lazy(() => import('./pages/PatientWaitlist'));
const EligibilityVerification = lazy(() => import('./pages/EligibilityVerification'));
const PatientStatements = lazy(() => import('./pages/PatientStatements'));
const BatchClaimSubmission = lazy(() => import('./pages/BatchClaimSubmission'));
const TaskManagement = lazy(() => import('./pages/TaskManagement'));
const MedicationReconciliation = lazy(() => import('./pages/MedicationReconciliation'));
const PatientRecall = lazy(() => import('./pages/PatientRecall'));
const ClinicalDecisionSupport = lazy(() => import('./pages/ClinicalDecisionSupport'));
const ReportBuilder = lazy(() => import('./pages/ReportBuilder'));
const ConsentManagement = lazy(() => import('./pages/ConsentManagement'));
const PatientEducation = lazy(() => import('./pages/PatientEducation'));
const SecureNotes = lazy(() => import('./pages/SecureNotes'));
const InsuranceCardCapture = lazy(() => import('./pages/InsuranceCardCapture'));
const FeeScheduleManager = lazy(() => import('./pages/FeeScheduleManager'));
const SchedulingTemplates = lazy(() => import('./pages/SchedulingTemplates'));
const LabOrderTracking = lazy(() => import('./pages/LabOrderTracking'));
const VitalsTrending = lazy(() => import('./pages/VitalsTrending'));
const NetworkIntegrations = lazy(() => import('./pages/NetworkIntegrations'));
const AITriageChat = lazy(() => import('./pages/AITriageChat'));
const PatientCheckIn = lazy(() => import('./pages/PatientCheckIn'));
const PatientCostEstimator = lazy(() => import('./pages/PatientCostEstimator'));
const AppMarketplace = lazy(() => import('./pages/AppMarketplace'));
const APIDocumentation = lazy(() => import('./pages/APIDocumentation'));
const EDIApiPortal = lazy(() => import('./pages/EDIApiPortal'));
const OrderSetTemplates = lazy(() => import('./pages/OrderSetTemplates'));
const AmbientScribe = lazy(() => import('./pages/AmbientScribe'));
const PopulationHealth = lazy(() => import('./pages/PopulationHealth'));
const AppointmentReminders = lazy(() => import('./pages/AppointmentReminders'));
const ChargePosting = lazy(() => import('./pages/ChargePosting'));
const ImmunizationRegistry = lazy(() => import('./pages/ImmunizationRegistry'));
const MultiLocationManagement = lazy(() => import('./pages/MultiLocationManagement'));
const GroupTelehealth = lazy(() => import('./pages/GroupTelehealth'));
const OperationalSignals = lazy(() => import('./pages/OperationalSignals'));
const PracticeMarketing = lazy(() => import('./pages/PracticeMarketing'));
const CareEverywhere = lazy(() => import('./pages/CareEverywhere'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const ProviderManagement = lazy(() => import('./pages/ProviderManagement'));
const SetupWizard = lazy(() => import('./pages/SetupWizard'));
import NotFoundPage from './pages/NotFoundPage';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ToastContainer from './components/ToastContainer';
import NotificationPanel from './components/NotificationPanel';
import CommandPalette from './components/CommandPalette';
import SessionTimeout from './components/SessionTimeout';
import OnboardingTour from './components/OnboardingTour';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import AIClinicalAssistant from './components/AIClinicalAssistant';
import VoiceAssistant from './components/VoiceAssistant';
import ForcePasswordChange from './components/ForcePasswordChange';
import RoleAwareLayout from './components/RoleAwareLayout';

function ProtectedLayout() {
  const { isAuthenticated, sessionChecking, currentUser } = useAuth();
  const { isDemo } = useDemo();
  const { isActive: isTourActive } = useGuidedTour();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Wait for background session probe before deciding whether to redirect.
  // Shows a slim progress bar — never a full-screen overlay.
  if (sessionChecking) {
    return (
      <div role="status" aria-label="Checking session" aria-live="polite">
        <div className="route-loading-bar" aria-hidden="true" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (currentUser?.mustChangePassword) return <ForcePasswordChange />;

  return (
    <SiteProvider>
    <TelehealthProvider>
    <PatientProvider demoMode={currentUser?.isDemo}>
      <NotificationProvider>
        <div className="app-layout">
          {/* Skip to content (accessibility) */}
          <a href="#main-content" className="skip-to-main">Skip to main content</a>
          {/* Mobile sidebar overlay */}
          <div className={`sidebar-overlay ${mobileMenuOpen ? 'visible' : ''}`} onClick={() => setMobileMenuOpen(false)} />
          <div className={mobileMenuOpen ? 'mobile-open' : ''}>
            <Sidebar />
          </div>
          <div className="main-area">
            <Header />
            <DemoRouteGuard />
            <main id="main-content" className="main-content" role="main">
              <ErrorBoundary>
              <Suspense fallback={
                <div role="status" aria-label="Loading page" aria-live="polite">
                  <div className="route-loading-bar" aria-hidden="true" />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '55vh', flexDirection: 'column', gap: 14 }}>
                    <div className="app-loading-spinner" aria-hidden="true" style={{ width: 32, height: 32 }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>Loading…</span>
                  </div>
                </div>
              }>
                <Outlet />
              </Suspense>
              </ErrorBoundary>
            </main>
          </div>
          {/* Mobile hamburger button */}
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(v => !v)} aria-label="Toggle menu">
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
        <ToastContainer />
        {/* Suppress all overlays during guided demo tour */}
        {!isTourActive && <NotificationPanel />}
        {!isTourActive && <CommandPalette />}
        {!isTourActive && <SessionTimeout />}
        {!isTourActive && <OnboardingTour />}
        {!isTourActive && <KeyboardShortcuts />}
        {!isTourActive && <AIClinicalAssistant />}
        {!isTourActive && <VoiceAssistant />}
      </NotificationProvider>
    </PatientProvider>
    </TelehealthProvider>
    </SiteProvider>
  );
}

function LoginRoute() {
  const { isAuthenticated, sessionChecking, currentUser } = useAuth();
  const navigate = useNavigate();
  const [welcomeBack, setWelcomeBack] = React.useState(false);

  // When a valid session is found, flash a welcome-back screen (Epic/athena pattern)
  // before navigating — confirms the session to the user.
  React.useEffect(() => {
    if (!sessionChecking && isAuthenticated) {
      setWelcomeBack(true);
      const dest = currentUser?.role === 'patient' ? '/patient-portal' : '/dashboard';
      const t = setTimeout(() => navigate(dest, { replace: true }), 1100);
      return () => clearTimeout(t);
    }
  }, [sessionChecking, isAuthenticated, currentUser, navigate]);

  if (welcomeBack) {
    const firstName = currentUser?.name?.split(' ')[0] || currentUser?.firstName || '';
    return (
      <div className="login-page" role="status" aria-live="polite" aria-label="Session found, redirecting">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
        <div className="welcome-back-screen">
          <div className="welcome-back-icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="welcome-back-name">Welcome back{firstName ? `, ${firstName}` : ''}</div>
          <div className="welcome-back-sub">Signing you in…</div>
        </div>
      </div>
    );
  }

  if (sessionChecking || !isAuthenticated) return <LoginPage />;
  return null; // effect above handles the redirect
}

function PatientPortalLoginRoute() {
  const { isAuthenticated, sessionChecking, currentUser } = useAuth();
  if (sessionChecking || !isAuthenticated) return <PatientPortalLogin />;
  if (currentUser?.role === 'patient') return <Navigate to="/patient-portal" replace />;
  return <Navigate to="/dashboard" replace />;
}

const PORTAL_API = import.meta.env.VITE_API_URL || '/api';

function PatientPortalRoute() {
  const [status, setStatus] = React.useState('checking'); // 'checking' | 'ok' | 'unauth'

  React.useEffect(() => {
    fetch(`${PORTAL_API}/patient-portal/me`, { credentials: 'include' })
      .then(r => r.ok ? setStatus('ok') : setStatus('unauth'))
      .catch(() => setStatus('unauth'));
  }, []);

  if (status === 'checking') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="route-loading-bar" />
      </div>
    );
  }
  if (status === 'unauth') return <PatientPortalLogin />;
  return (
    <PatientProvider>
      <PatientPortal />
    </PatientProvider>
  );
}

export default function App() {
  // Restore persisted theme on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('clarity_theme'));
      if (stored?.id) applyTheme(stored.id);
    } catch { /* use defaults */ }
  }, []);

  return (
    <BrowserRouter>
      <DemoProvider>
      <DemoGuidedTourProvider>
      <TrainingProvider>
      <AuthProvider>
        <Routes>
          <Route path="/presentation" element={<FinancialPresentation />} />
          <Route path="/presentation-print" element={<PresentationPrint />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/patient-portal-login" element={<PatientPortalLoginRoute />} />
          <Route path="/patient-portal" element={<PatientPortalRoute />} />

          <Route element={<RoleAwareLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/patients" element={<PatientSearch />} />
            <Route path="/patient-registration" element={<PatientRegistration />} />
            <Route path="/refill-queue" element={<RefillQueue />} />
            <Route path="/chart/:patientId/:tab" element={<ChartPage />} />
            <Route path="/chart/:patientId" element={<Navigate to="summary" replace />} />
            <Route path="/prescribe" element={<RequirePatient><EPrescribe /></RequirePatient>} />
            <Route path="/telehealth" element={<Telehealth />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/smart-phrases" element={<SmartPhrases />} />
            <Route path="/btg-audit" element={<BTGAuditLog />} />
            <Route path="/admin-toolkit" element={<HealthAdminToolkit />} />
            <Route path="/patient-chat" element={<PatientChat />} />
            <Route path="/session/:aptId" element={<GoToSession />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/care-gaps" element={<CareGaps />} />
            <Route path="/staff-messaging" element={<StaffMessaging />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/billing-dashboard" element={<BillingDashboard />} />
            <Route path="/claims-management" element={<ClaimsManagement />} />
            <Route path="/denial-management" element={<DenialManagement />} />
            <Route path="/telehealth-billing" element={<TelehealthBilling />} />
            <Route path="/patient-portal-billing" element={<PatientPortalBilling />} />
            <Route path="/billing" element={<BillingDashboard />} />
            <Route path="/billing/claims" element={<ClaimsManagement />} />
            <Route path="/payer-profiles" element={<PayerProfiles />} />
            <Route path="/remittance-posting" element={<RemittancePosting />} />
            <Route path="/scrubber-rules" element={<ScrubberRulesEngine />} />
            <Route path="/era-posting" element={<ERAPosting />} />
            <Route path="/contract-variance" element={<ContractVarianceReport />} />
            <Route path="/edi-transport" element={<EDITransportLayer />} />
            <Route path="/edi-routing" element={<EDIRoutingEngine />} />
            <Route path="/edi-837" element={<EDI837Generator />} />
            <Route path="/edi-999" element={<EDI999Parser />} />
            <Route path="/edi-270" element={<EDI270Engine />} />
            <Route path="/edi-835" element={<EDI835Listener />} />
            <Route path="/edi-monitoring" element={<EDIMonitoring />} />
            <Route path="/clinical-outcomes" element={<ClinicalOutcomes />} />
            <Route path="/role-permissions" element={<RolePermissions />} />
            <Route path="/quality-measures" element={<QualityMeasures />} />
            <Route path="/documents" element={<DocumentManagement />} />
            <Route path="/audit-trail" element={<AuditTrail />} />
            <Route path="/security-console" element={<SecurityConsole />} />
            <Route path="/referrals" element={<ReferralManagement />} />
            <Route path="/prior-auth" element={<PriorAuthTracking />} />
            <Route path="/treatment-plans" element={<TreatmentPlans />} />
            <Route path="/goals" element={<GoalsObjectives />} />
            <Route path="/intake-forms" element={<IntakeForms />} />
            <Route path="/superbills" element={<SuperbillCapture />} />
            <Route path="/efax" element={<EFaxCenter />} />
            <Route path="/provider-performance" element={<ProviderPerformance />} />
            <Route path="/waitlist" element={<PatientWaitlist />} />
            <Route path="/eligibility" element={<EligibilityVerification />} />
            <Route path="/patient-statements" element={<PatientStatements />} />
            <Route path="/batch-claims" element={<BatchClaimSubmission />} />
            <Route path="/tasks" element={<TaskManagement />} />
            <Route path="/med-rec" element={<MedicationReconciliation />} />
            <Route path="/patient-recall" element={<PatientRecall />} />
            <Route path="/cds-alerts" element={<ClinicalDecisionSupport />} />
            <Route path="/report-builder" element={<ReportBuilder />} />
            <Route path="/consents" element={<ConsentManagement />} />
            <Route path="/patient-education" element={<PatientEducation />} />
            <Route path="/secure-notes" element={<SecureNotes />} />
            <Route path="/insurance-cards" element={<InsuranceCardCapture />} />
            <Route path="/fee-schedules" element={<FeeScheduleManager />} />
            <Route path="/scheduling-templates" element={<SchedulingTemplates />} />
            <Route path="/lab-tracking" element={<LabOrderTracking />} />
            <Route path="/vitals-trending" element={<VitalsTrending />} />
            <Route path="/network-integrations" element={<NetworkIntegrations />} />
            <Route path="/ai-triage" element={<AITriageChat />} />
            <Route path="/patient-checkin" element={<PatientCheckIn />} />
            <Route path="/cost-estimator" element={<PatientCostEstimator />} />
            <Route path="/marketplace" element={<AppMarketplace />} />
            <Route path="/api-docs" element={<APIDocumentation />} />
            <Route path="/edi-api" element={<EDIApiPortal />} />
            <Route path="/order-sets" element={<OrderSetTemplates />} />
            <Route path="/ambient-scribe" element={<AmbientScribe />} />
            <Route path="/population-health" element={<PopulationHealth />} />
            <Route path="/appointment-reminders" element={<AppointmentReminders />} />
            <Route path="/charge-posting" element={<ChargePosting />} />
            <Route path="/immunization-registry" element={<ImmunizationRegistry />} />
            <Route path="/multi-location" element={<AdminRoute><MultiLocationManagement /></AdminRoute>} />
            <Route path="/group-telehealth" element={<GroupTelehealth />} />
            <Route path="/operational-signals" element={<OperationalSignals />} />
            <Route path="/practice-marketing" element={<PracticeMarketing />} />
            <Route path="/care-everywhere" element={<CareEverywhere />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/provider-management" element={<ProviderManagement />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route path="/setup" element={<SetupWizard />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
      </TrainingProvider>
      <DemoBar />
      </DemoGuidedTourProvider>
      </DemoProvider>
    </BrowserRouter>
  );
}
