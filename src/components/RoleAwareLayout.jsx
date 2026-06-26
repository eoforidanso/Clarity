import React, { Suspense } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../demo/DemoContext';
import { useGuidedTour } from '../demo/DemoGuidedTourProvider';
import { PatientProvider } from '../contexts/PatientContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { SiteProvider } from '../contexts/SiteContext';
import { TelehealthProvider } from '../contexts/TelehealthContext';
import ErrorBoundary from './ErrorBoundary';
import Header from './Header';
import ToastContainer from './ToastContainer';
import { ConfirmProvider } from '../contexts/ConfirmContext';
import { SkeletonDashboard } from './Skeleton';
import NotificationPanel from './NotificationPanel';
import CommandPalette from './CommandPalette';
import SessionTimeout from './SessionTimeout';
import OnboardingTour from './OnboardingTour';
import KeyboardShortcuts from './KeyboardShortcuts';
import AIClinicalAssistant from './AIClinicalAssistant';
import VoiceAssistant from './VoiceAssistant';
import ForcePasswordChange from './ForcePasswordChange';
import { DemoRouteGuard } from '../demo/DemoContext';
import ClinicalShell from './ClinicalShell';
import NonClinicalShell from './NonClinicalShell';
import TherapistShell from './TherapistShell';
import Sidebar from './Sidebar';

const CLINICAL_ROLES = ['prescriber', 'nurse'];
const NON_CLINICAL_ROLES = ['admin', 'front_desk', 'biller'];

function pickSidebar(role) {
  if (role === 'therapist') return <TherapistShell />;
  if (CLINICAL_ROLES.includes(role)) return <ClinicalShell />;
  if (NON_CLINICAL_ROLES.includes(role)) return <NonClinicalShell />;
  return <Sidebar />;
}

export default function RoleAwareLayout() {
  const { isAuthenticated, sessionChecking, currentUser } = useAuth();
  const { isActive: isTourActive } = useGuidedTour();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (sessionChecking) {
    return (
      <div role="status" aria-label="Checking session" aria-live="polite">
        <div className="route-loading-bar" aria-hidden="true" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (currentUser?.mustChangePassword) return <ForcePasswordChange />;

  const sidebar = pickSidebar(currentUser?.role);

  return (
    <SiteProvider>
    <TelehealthProvider>
    <PatientProvider demoMode={currentUser?.isDemo}>
      <NotificationProvider>
      <ConfirmProvider>
        <div className="app-layout">
          <a href="#main-content" className="skip-to-main">Skip to main content</a>
          <div className={`sidebar-overlay ${mobileMenuOpen ? 'visible' : ''}`} onClick={() => setMobileMenuOpen(false)} />
          <div className={mobileMenuOpen ? 'mobile-open' : ''}>
            {sidebar}
          </div>
          <div className="main-area">
            <Header />
            <DemoRouteGuard />
            <main id="main-content" className="main-content" role="main">
              <ErrorBoundary>
                <Suspense fallback={
                  <div role="status" aria-label="Loading page" aria-live="polite" style={{ padding: '0 0' }}>
                    <div className="route-loading-bar" aria-hidden="true" />
                    <SkeletonDashboard />
                  </div>
                }>
                  <Outlet />
                </Suspense>
              </ErrorBoundary>
            </main>
          </div>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(v => !v)} aria-label="Toggle menu">
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
        <ToastContainer />
        {!isTourActive && <NotificationPanel />}
        {!isTourActive && <CommandPalette />}
        {!isTourActive && <SessionTimeout />}
        {!isTourActive && <OnboardingTour />}
        {!isTourActive && <KeyboardShortcuts />}
        {!isTourActive && <AIClinicalAssistant />}
        {!isTourActive && <VoiceAssistant />}
      </ConfirmProvider>
      </NotificationProvider>
    </PatientProvider>
    </TelehealthProvider>
    </SiteProvider>
  );
}
