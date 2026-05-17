import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PatientProvider } from './contexts/PatientContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { TrainingProvider } from './contexts/TrainingContext';
import { SiteProvider } from './contexts/SiteContext';
import { TelehealthProvider } from './contexts/TelehealthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { applyTheme } from './pages/Settings';

// Eagerly loaded — always needed at startup
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import PatientPortalLogin from './pages/PatientPortalLogin';
import PatientPortal from './pages/PatientPortal';
import Settings from './pages/Settings';

// Lazy-loaded routes — split into separate chunks
const Schedule = lazy(() => import('./pages/Schedule'));
const PatientSearch = lazy(() => import('./pages/PatientSearch'));
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
const TelehealthBilling = lazy(() => import('./pages/TelehealthBilling'));
const PatientPortalBilling = lazy(() => import('./pages/PatientPortalBilling'));
const QualityMeasures = lazy(() => import('./pages/QualityMeasures'));
const DocumentManagement = lazy(() => import('./pages/DocumentManagement'));
const AuditTrail = lazy(() => import('./pages/AuditTrail'));
const ReferralManagement = lazy(() => import('./pages/ReferralManagement'));
const PriorAuthTracking = lazy(() => import('./pages/PriorAuthTracking'));
const TreatmentPlans = lazy(() => import('./pages/TreatmentPlans'));
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

function ProtectedLayout() {
  const { isAuthenticated, currentUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (currentUser?.mustChangePassword) return <ForcePasswordChange />;

  return (
    <SiteProvider>
    <TelehealthProvider>
    <PatientProvider>
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
            <main id="main-content" className="main-content" role="main">
              <ErrorBoundary>
              <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>}>
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
        <NotificationPanel />
        <CommandPalette />
        <SessionTimeout />
        <OnboardingTour />
        <KeyboardShortcuts />
        <AIClinicalAssistant />
        <VoiceAssistant />
      </NotificationProvider>
    </PatientProvider>
    </TelehealthProvider>
    </SiteProvider>
  );
}

function LoginRoute() {
  const { isAuthenticated, currentUser } = useAuth();
  if (isAuthenticated && currentUser?.role === 'patient') return <Navigate to="/patient-portal" replace />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <LoginPage />;
}

function PatientPortalLoginRoute() {
  const { isAuthenticated, currentUser } = useAuth();
  if (isAuthenticated && currentUser?.role === 'patient') return <Navigate to="/patient-portal" replace />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <PatientPortalLogin />;
}

function PatientPortalRoute() {
  const { isAuthenticated, currentUser } = useAuth();
  if (!isAuthenticated) return <Navigate to="/patient-portal-login" replace />;
  if (currentUser?.role !== 'patient') return <Navigate to="/dashboard" replace />;
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
      <TrainingProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/patient-portal-login" element={<PatientPortalLoginRoute />} />
          <Route path="/patient-portal" element={<PatientPortalRoute />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/patients" element={<PatientSearch />} />
            <Route path="/chart/:patientId/:tab" element={<ChartPage />} />
            <Route path="/chart/:patientId" element={<Navigate to="summary" replace />} />
            <Route path="/prescribe" element={<EPrescribe />} />
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
            <Route path="/quality-measures" element={<QualityMeasures />} />
            <Route path="/documents" element={<DocumentManagement />} />
            <Route path="/audit-trail" element={<AuditTrail />} />
            <Route path="/referrals" element={<ReferralManagement />} />
            <Route path="/prior-auth" element={<PriorAuthTracking />} />
            <Route path="/treatment-plans" element={<TreatmentPlans />} />
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
            <Route path="/order-sets" element={<OrderSetTemplates />} />
            <Route path="/ambient-scribe" element={<AmbientScribe />} />
            <Route path="/population-health" element={<PopulationHealth />} />
            <Route path="/appointment-reminders" element={<AppointmentReminders />} />
            <Route path="/charge-posting" element={<ChargePosting />} />
            <Route path="/immunization-registry" element={<ImmunizationRegistry />} />
            <Route path="/multi-location" element={<MultiLocationManagement />} />
            <Route path="/group-telehealth" element={<GroupTelehealth />} />
            <Route path="/operational-signals" element={<OperationalSignals />} />
            <Route path="/practice-marketing" element={<PracticeMarketing />} />
            <Route path="/care-everywhere" element={<CareEverywhere />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/provider-management" element={<ProviderManagement />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
      </TrainingProvider>
    </BrowserRouter>
  );
}
