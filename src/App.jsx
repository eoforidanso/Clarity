import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PatientProvider } from './contexts/PatientContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { applyTheme } from './pages/Settings';

import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import PatientSearch from './pages/PatientSearch';
import ChartPage from './pages/ChartPage';
import EPrescribe from './pages/EPrescribe';
import Telehealth from './pages/Telehealth';
import Inbox from './pages/Inbox';
import SmartPhrases from './pages/SmartPhrases';
import BTGAuditLog from './pages/BTGAuditLog';
import HealthAdminToolkit from './pages/HealthAdminToolkit';
import GoToSession from './pages/GoToSession';
import PatientChat from './pages/PatientChat';
import Analytics from './pages/Analytics';
import CareGaps from './pages/CareGaps';
import StaffMessaging from './pages/StaffMessaging';
import PatientPortalLogin from './pages/PatientPortalLogin';
import PatientPortal from './pages/PatientPortal';
import Settings from './pages/Settings';
import BillingDashboard from './pages/BillingDashboard';
import ClaimsManagement from './pages/ClaimsManagement';
import DenialManagement from './pages/DenialManagement';
import TelehealthBilling from './pages/TelehealthBilling';
import PatientPortalBilling from './pages/PatientPortalBilling';
import QualityMeasures from './pages/QualityMeasures';
import DocumentManagement from './pages/DocumentManagement';
import AuditTrail from './pages/AuditTrail';
import ReferralManagement from './pages/ReferralManagement';
import PriorAuthTracking from './pages/PriorAuthTracking';
import TreatmentPlans from './pages/TreatmentPlans';
import IntakeForms from './pages/IntakeForms';
import SuperbillCapture from './pages/SuperbillCapture';
import EFaxCenter from './pages/EFaxCenter';
import ProviderPerformance from './pages/ProviderPerformance';
import PatientWaitlist from './pages/PatientWaitlist';
import EligibilityVerification from './pages/EligibilityVerification';
import PatientStatements from './pages/PatientStatements';
import BatchClaimSubmission from './pages/BatchClaimSubmission';
import TaskManagement from './pages/TaskManagement';
import MedicationReconciliation from './pages/MedicationReconciliation';
import PatientRecall from './pages/PatientRecall';
import ClinicalDecisionSupport from './pages/ClinicalDecisionSupport';
import ReportBuilder from './pages/ReportBuilder';
import ConsentManagement from './pages/ConsentManagement';
import PatientEducation from './pages/PatientEducation';
import SecureNotes from './pages/SecureNotes';
import InsuranceCardCapture from './pages/InsuranceCardCapture';
import FeeScheduleManager from './pages/FeeScheduleManager';
import SchedulingTemplates from './pages/SchedulingTemplates';
import LabOrderTracking from './pages/LabOrderTracking';
import VitalsTrending from './pages/VitalsTrending';
import NetworkIntegrations from './pages/NetworkIntegrations';
import AITriageChat from './pages/AITriageChat';
import PatientCheckIn from './pages/PatientCheckIn';
import PatientCostEstimator from './pages/PatientCostEstimator';
import AppMarketplace from './pages/AppMarketplace';
import APIDocumentation from './pages/APIDocumentation';
import OrderSetTemplates from './pages/OrderSetTemplates';
import AmbientScribe from './pages/AmbientScribe';
import PopulationHealth from './pages/PopulationHealth';
import AppointmentReminders from './pages/AppointmentReminders';
import ChargePosting from './pages/ChargePosting';
import ImmunizationRegistry from './pages/ImmunizationRegistry';
import MultiLocationManagement from './pages/MultiLocationManagement';
import GroupTelehealth from './pages/GroupTelehealth';
import OperationalSignals from './pages/OperationalSignals';
import PracticeMarketing from './pages/PracticeMarketing';
import CareEverywhere from './pages/CareEverywhere';

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

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <PatientProvider>
      <NotificationProvider>
        <div className="app-layout">
          {/* Mobile sidebar overlay */}
          <div className={`sidebar-overlay ${mobileMenuOpen ? 'visible' : ''}`} onClick={() => setMobileMenuOpen(false)} />
          <div className={mobileMenuOpen ? 'mobile-open' : ''}>
            <Sidebar />
          </div>
          <div className="main-area">
            <Header />
            <main className="main-content">
              <Outlet />
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
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
