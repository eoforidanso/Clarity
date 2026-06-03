import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setDemoFlag, clearDemoFlag } from './demoFeatureFlag';
import { installDemoInterceptor, uninstallDemoInterceptor } from './demoApiInterceptor';
import { installExportGuard } from './demoExportGuard';
import { installClickGuard, uninstallClickGuard } from './demoClickGuard';
import { demoRateLimit } from './demoRateLimit';

// ── Routes blocked in demo mode ───────────────────────────────────────────────
export const DEMO_BLOCKED_ROUTES = [
  // ── Clearinghouse — ALL blocked ─────────────────────────────────────────────
  '/edi-transport',          // EDI Transport Layer
  '/edi-routing',            // EDI Routing Engine
  '/edi-837',                // 837P Generator
  '/edi-999',                // 999 / 277CA Parser
  '/edi-270',                // 270 / 271 Engine
  '/edi-835',                // 835 ERA Listener
  '/edi-monitoring',         // EDI Monitoring
  '/edi-api',                // EDI API Portal
  '/batch-claim-submission', // Batch claim submission
  '/scrubber-rules',         // Scrubber rules engine

  // ── Developer / API — ALL blocked ───────────────────────────────────────────
  '/api-docs',               // API Documentation
  '/network-integrations',   // Network Integrations
  '/care-everywhere',        // Care Everywhere (HIE)
  '/marketplace',            // App Marketplace

  // ── Admin & system controls ─────────────────────────────────────────────────
  '/user-management', '/role-permissions', '/audit-trail', '/btg-audit-log',
  '/admin-toolkit', '/multi-location-management', '/security-console',

  // ── AI / RCM intelligence ────────────────────────────────────────────────────
  '/clinical-decision-support', '/population-health', '/care-gaps',

  // ── Billing internals ────────────────────────────────────────────────────────
  '/contract-variance', '/fee-schedule', '/payer-profiles',
];

export const DEMO_BLOCKED_PREFIX = ['/admin', '/developer', '/edi', '/api'];

const DemoContext = createContext(null);

export const TOUR_STEPS = [
  {
    id: 'dashboard',
    path: '/dashboard',
    title: '📊 Your Command Center',
    body: 'See today\'s schedule, unread messages, and critical alerts at a glance. The dashboard surfaces what matters most — so you start every day in control.',
    highlight: '.dashboard-greeting, .dashboard-stats-grid',
    position: 'bottom',
  },
  {
    id: 'schedule',
    path: '/schedule',
    title: '📅 Timeline Schedule',
    body: 'Appointments organized as a vertical timeline — not a flat list. Each card shows status, patient avatar, and a primary action: Check In, Open Chart, or Join Session.',
    highlight: null,
    position: 'right',
  },
  {
    id: 'inbox',
    path: '/inbox',
    title: '📬 Prioritized Inbox',
    body: 'Messages grouped by category — System Alerts, Pharmacy, Patient Messages. Approve a refill, view a chart, or resolve eligibility without even opening the message.',
    highlight: null,
    position: 'right',
  },
  {
    id: 'chart',
    path: '/chart/demo-p2/summary',
    title: '🗂️ Patient Chart',
    body: 'Every clinical detail in one place — problems, medications, labs, vitals, encounters, and notes. Click the avatar to upload a photo, just like Epic.',
    highlight: null,
    position: 'right',
  },
  {
    id: 'clearinghouse',
    path: '/edi-monitoring',
    title: '⚡ Live Clearinghouse',
    body: 'Claims transmit automatically via 837P/I, get acknowledged via 999, and payments post via 835 ERA — all without leaving Clarity. Watch the pipeline in real time.',
    highlight: null,
    position: 'bottom',
  },
  {
    id: 'analytics',
    path: '/analytics',
    title: '📈 RCM Analytics',
    body: '81.2% collection rate. 23 days in AR. Clean claim rate of 94.8%. Know your numbers before month-end — not after. Drill into payer performance, procedure trends, and aging.',
    highlight: null,
    position: 'bottom',
  },
  {
    id: 'done',
    path: null,
    title: '🎉 That\'s Clarity EHR',
    body: 'Purpose-built for outpatient behavioral health. HIPAA · EPCS · 42 CFR Part 2 · ONC certified. Ready to see it with your own data?',
    highlight: null,
    position: 'center',
    isFinal: true,
  },
];

export function DemoProvider({ children }) {
  const [isDemo, setIsDemo] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourActive, setTourActive] = useState(false);
  const [tourMinimized, setTourMinimized] = useState(false);

  const startDemo = useCallback(() => {
    setIsDemo(true);
    setTourStep(0);
    setTourActive(true);
    setTourMinimized(false);
    // Activate global feature flag
    setDemoFlag(true);
    // Install API interceptor (blocks writes, sanitizes responses)
    installDemoInterceptor();
    // Install export guard (blocks all downloads/print)
    installExportGuard();
    // Install click guard (blocks all buttons except tour + nav)
    installClickGuard();
    console.info('[Demo] Demo mode activated — restrictions enabled');
  }, []);

  const exitDemo = useCallback(() => {
    setIsDemo(false);
    setTourActive(false);
    setTourStep(0);
    // Clear flag and uninstall interceptor
    clearDemoFlag();
    uninstallDemoInterceptor();
    uninstallClickGuard();
    // Send session analytics and clear
    demoRateLimit.clearSession();
    console.info('[Demo] Demo mode deactivated — redirecting to login');
    // Redirect to login and reload to clear all state
    window.location.href = '/login';
  }, []);

  const nextStep = useCallback(() => {
    setTourStep(s => Math.min(s + 1, TOUR_STEPS.length - 1));
  }, []);

  const prevStep = useCallback(() => {
    setTourStep(s => Math.max(s - 1, 0));
  }, []);

  const goToStep = useCallback((idx) => setTourStep(idx), []);

  return (
    <DemoContext.Provider value={{
      isDemo, startDemo, exitDemo,
      tourStep, tourActive, setTourActive,
      tourMinimized, setTourMinimized,
      nextStep, prevStep, goToStep,
      currentTourStop: TOUR_STEPS[tourStep],
    }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be inside DemoProvider');
  return ctx;
}

/**
 * DemoRouteGuard — place inside Router context.
 * Redirects blocked routes to /dashboard when demo is active.
 */
export function DemoRouteGuard() {
  const { isDemo } = useDemo();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isDemo) return;

    const path = location.pathname;

    // Log navigation for session analytics
    demoRateLimit.logNavigation(path);

    // Block restricted routes
    const blocked =
      DEMO_BLOCKED_ROUTES.some(r => path === r || path.startsWith(r + '/')) ||
      DEMO_BLOCKED_PREFIX.some(p => path.startsWith(p));

    if (blocked) {
      demoRateLimit.logBlocked(path, 'NAVIGATE');
      navigate('/dashboard', { replace: true, state: { demoBlocked: true } });
    }
  }, [isDemo, location.pathname, navigate]);

  return null;
}
