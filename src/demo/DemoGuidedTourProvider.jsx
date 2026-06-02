/**
 * Clarity EHR — DemoGuidedTourProvider
 *
 * Usage:
 *   <DemoGuidedTourProvider>
 *     <App />
 *   </DemoGuidedTourProvider>
 *
 *   const { isActive, currentStep, start, stop, next, prev, isNavLocked } = useGuidedTour();
 *   const { safeNavigate } = useGuidedTour();
 *   <DemoLink to="/patients">Patients</DemoLink>
 */

import React, {
  createContext, useContext, useState,
  useCallback, useEffect, useRef,
} from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDemo } from './DemoContext';

// ── Tour steps — each has a forcedRoute the user is locked to ─────────────────
export const TOUR_STEPS = [
  {
    id: 'welcome',
    forcedRoute: '/dashboard',
    title: '👋 Welcome to Clarity EHR',
    body: 'A guided demo of a real outpatient behavioral health practice. Every patient, appointment, and claim is realistic sample data.',
    position: 'center',
  },
  {
    id: 'dashboard',
    forcedRoute: '/dashboard',
    title: '📊 Command Center',
    body: 'Your day at a glance — next patient, next telehealth, unread messages, and critical alerts. Clinicians start every morning in control.',
    position: 'bottom-right',
  },
  {
    id: 'schedule',
    forcedRoute: '/schedule',
    title: '📅 Timeline Schedule',
    body: 'Appointments as a vertical timeline, not a flat list. Each card shows status, patient avatar, and one primary action — Check In, Open Chart, or Join Session.',
    position: 'bottom-right',
  },
  {
    id: 'inbox',
    forcedRoute: '/inbox',
    title: '📬 Prioritized Inbox',
    body: 'Messages grouped by urgency — System Alerts, Pharmacy, Patient Messages. Approve a refill or resolve eligibility without opening the message.',
    position: 'bottom-right',
  },
  {
    id: 'chart',
    forcedRoute: '/chart/demo-p2/summary',
    title: '🗂️ Patient Chart',
    body: 'Every clinical detail in one place — problems, medications, labs, vitals, encounter notes. Built for behavioral health.',
    position: 'bottom-right',
  },
  {
    id: 'billing',
    forcedRoute: '/billing',
    title: '💳 Billing & RCM',
    body: '81.2% collection rate. 23 days in AR. Claims flow automatically from encounter to ERA posting — no separate billing system needed.',
    position: 'bottom-right',
  },
  {
    id: 'done',
    forcedRoute: null,
    title: '🎉 That\'s Clarity EHR',
    body: 'Purpose-built for outpatient behavioral health. HIPAA · EPCS · 42 CFR Part 2 · ONC certified. Schedule a walkthrough with your own data.',
    position: 'center',
    isFinal: true,
  },
];

// ── Context ───────────────────────────────────────────────────────────────────
const TourContext = createContext(null);

/** Primary hook — clean public API */
export function useGuidedTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useGuidedTour must be used inside DemoGuidedTourProvider');
  return ctx;
}

/** Alias for backward compatibility */
export const useTour = useGuidedTour;

// ── Provider ──────────────────────────────────────────────────────────────────
export default function DemoGuidedTourProvider({ children }) {
  const { isDemo } = useDemo();
  const [isActive, setIsActive]   = useState(false);
  const [stepIdx, setStepIdx]     = useState(0);
  const [minimized, setMinimized] = useState(false);
  const navigateRef               = useRef(null);
  const setNavigate = useCallback((fn) => { navigateRef.current = fn; }, []);

  const currentStep = TOUR_STEPS[stepIdx] ?? TOUR_STEPS[0];
  const isNavLocked = isActive;

  // ── Actions ─────────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    setStepIdx(0);
    setIsActive(true);
    setMinimized(false);
    const first = TOUR_STEPS[0];
    if (first.forcedRoute) setTimeout(() => navigateRef.current?.(first.forcedRoute), 100);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
    setStepIdx(0);
  }, []);

  const goTo = useCallback((idx) => {
    const step = TOUR_STEPS[idx];
    if (!step) return;
    setStepIdx(idx);
    if (step.forcedRoute) navigateRef.current?.(step.forcedRoute);
  }, []);

  const next = useCallback(() => {
    const nextIdx = stepIdx + 1;
    if (nextIdx >= TOUR_STEPS.length) { stop(); return; }
    goTo(nextIdx);
  }, [stepIdx, goTo, stop]);

  const prev = useCallback(() => {
    if (stepIdx > 0) goTo(stepIdx - 1);
  }, [stepIdx, goTo]);

  // ── safeNavigate — respects nav lock ────────────────────────────────────────
  const safeNavigate = useCallback((path) => {
    if (isNavLocked) return;
    navigateRef.current?.(path);
  }, [isNavLocked]);

  // ── Force route when step changes ───────────────────────────────────────────
  // (handles cases where user somehow ends up on wrong page)
  const locationRef = useRef(null);
  useEffect(() => {
    if (!isActive || !currentStep?.forcedRoute) return;
    if (locationRef.current && locationRef.current !== currentStep.forcedRoute) {
      navigateRef.current?.(currentStep.forcedRoute);
    }
  }, [isActive, currentStep]);

  // ── Keyboard lock ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const handler = (e) => {
      if (e.key === 'Escape') return; // allow escape
      const target = e.target;
      // Allow keypresses inside tour card
      if (target?.closest?.('.demo-tour-card, [data-demo-allowed]')) return;
      if (['Enter', ' ', 'Tab'].includes(e.key)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [isActive]);

  // ── Stop tour when demo mode exits ──────────────────────────────────────────
  // (auto-start removed — tour is started explicitly via start() in LoginPage)
  useEffect(() => {
    if (!isDemo && isActive) stop();
  }, [isDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    isActive,
    currentStep,
    start,
    stop,
    next,
    prev,
    goTo,
    safeNavigate,
    isNavLocked,
    minimized,
    setMinimized,
    stepIdx,
    totalSteps: TOUR_STEPS.length,
    progress: Math.round((stepIdx / (TOUR_STEPS.length - 1)) * 100),
    setNavigate,
  };

  return (
    <TourContext.Provider value={value}>
      <RouterAware setNavigate={setNavigate} locationRef={locationRef} />
      {children}
      {isActive && <TourBanner />}
      {isActive && <TourOverlay />}
    </TourContext.Provider>
  );
}

// ── RouterAware ───────────────────────────────────────────────────────────────
function RouterAware({ setNavigate, locationRef }) {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => { setNavigate(navigate); }, [navigate, setNavigate]);
  useEffect(() => { locationRef.current = location.pathname; }, [location.pathname]);
  return null;
}

// ── Tour Banner ───────────────────────────────────────────────────────────────
function TourBanner() {
  const { currentStep, stepIdx, totalSteps, stop } = useGuidedTour();
  return (
    <div
      className="demo-bar"
      style={{
        position: 'fixed', top: 36, left: 0, right: 0, zIndex: 8999,
        background: 'linear-gradient(90deg, rgba(99,102,241,0.12), rgba(8,145,178,0.10))',
        borderBottom: '1px solid rgba(99,102,241,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '5px 16px', gap: 10,
        backdropFilter: 'blur(4px)',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 0 2px rgba(99,102,241,0.3)', flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: '0.3px' }}>
        Guided Tour Active
      </span>
      <span style={{ fontSize: 10, color: '#94a3b8' }}>·</span>
      <span style={{ fontSize: 11, color: '#94a3b8' }}>
        Step {stepIdx + 1} of {totalSteps} — <strong style={{ color: '#475569' }}>{currentStep?.title?.replace(/^[^ ]+ /, '')}</strong>
      </span>
      <span style={{ fontSize: 10, color: '#94a3b8' }}>·</span>
      <span style={{ fontSize: 11, color: '#94a3b8' }}>Navigation locked</span>
    </div>
  );
}

// ── Tour Overlay ──────────────────────────────────────────────────────────────
function TourOverlay() {
  const { currentStep, stepIdx, totalSteps, progress, minimized,
          setMinimized, next, prev, stop } = useGuidedTour();

  if (minimized) {
    return (
      <button
        data-demo-allowed
        className="demo-tour-card"
        onClick={() => setMinimized(false)}
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9001,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 16px', borderRadius: 24,
          background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
          color: '#fff', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(15,23,42,0.35)',
          fontSize: 12, fontWeight: 700,
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 2px rgba(34,197,94,0.3)' }} />
        Tour — Step {stepIdx + 1}/{totalSteps}
      </button>
    );
  }

  return (
    <div
      className="demo-tour-card"
      data-demo-allowed
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9001,
        width: 340, background: '#fff', borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(99,102,241,0.12)',
        border: '1px solid #e2e8f0', overflow: 'hidden',
        animation: 'tour-card-in 0.22s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      {/* Progress */}
      <div style={{ height: 3, background: '#f1f5f9' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#6366f1,#0891b2)', borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>

      {/* Header */}
      <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>{currentStep.title}</div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => setMinimized(true)}
            style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>—</button>
          <button onClick={stop}
            style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '10px 16px 0', fontSize: 13, color: '#475569', lineHeight: 1.65 }}>{currentStep.body}</div>

      {/* Final CTA */}
      {currentStep.isFinal && (
        <div style={{ margin: '12px 16px 0', padding: '11px 13px', background: 'linear-gradient(135deg,#f0f9ff,#f5f3ff)', borderRadius: 10, border: '1px solid #e0e7ff' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#3730a3', marginBottom: 3 }}>Ready to get started?</div>
          <div style={{ fontSize: 11, color: '#6366f1', lineHeight: 1.5 }}>Schedule a personalized walkthrough with your own practice data.</div>
        </div>
      )}

      {/* Step dots */}
      <div style={{ padding: '12px 16px 0', display: 'flex', gap: 4, alignItems: 'center' }}>
        {TOUR_STEPS.map((_, i) => (
          <div key={i} style={{ width: i === stepIdx ? 16 : 6, height: 6, borderRadius: 3, background: i === stepIdx ? '#6366f1' : i < stepIdx ? '#22c55e' : '#e2e8f0', transition: 'all 0.2s' }} />
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{stepIdx + 1} / {totalSteps}</span>
      </div>

      {/* Actions */}
      <div style={{ padding: '10px 16px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
        {stepIdx > 0 && !currentStep.isFinal && (
          <button onClick={prev} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>← Back</button>
        )}
        <button onClick={next} style={{ flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none', background: currentStep.isFinal ? 'linear-gradient(135deg,#6366f1,#0891b2)' : '#0f172a', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(15,23,42,0.18)' }}>
          {currentStep.isFinal ? '🚀 Get Clarity for my practice' : 'Next →'}
        </button>
        {!currentStep.isFinal && (
          <button onClick={stop} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'transparent', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}>Skip</button>
        )}
      </div>

      <style>{`
        @keyframes tour-card-in { from{opacity:0;transform:translateY(12px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>
    </div>
  );
}

// ── DemoLink — nav-lock-aware Link component ──────────────────────────────────
export function DemoLink({ to, children, className, style }) {
  const { isNavLocked } = useGuidedTour();
  if (isNavLocked) {
    return (
      <span
        className={`demo-disabled ${className || ''}`}
        style={{ opacity: 0.45, cursor: 'default', pointerEvents: 'none', ...style }}
      >
        {children}
      </span>
    );
  }
  return <Link to={to} className={className} style={style}>{children}</Link>;
}
