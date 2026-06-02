/**
 * Clarity EHR — DemoGuidedTourProvider
 *
 * Standalone guided tour provider, separate from demo restrictions.
 * Wraps <App /> and injects the tour overlay only when enabled={true}.
 *
 * Usage:
 *   <DemoGuidedTourProvider enabled={isDemo}>
 *     <App />
 *   </DemoGuidedTourProvider>
 *
 * Exposes useTour() hook for any component to:
 *   - Read current step
 *   - Navigate next / prev / goTo
 *   - Start / stop the tour
 *   - Check if tour is active
 */

import React, {
  createContext, useContext, useState,
  useCallback, useEffect, useRef,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDemo } from './DemoContext';

// ── Tour stops ────────────────────────────────────────────────────────────────
export const TOUR_STEPS = [
  {
    id: 'welcome',
    path: '/dashboard',
    title: '👋 Welcome to Clarity EHR',
    body: 'This is a guided demo of a real outpatient behavioral health practice. Every patient, appointment, and claim you see is realistic sample data.',
    position: 'center',
  },
  {
    id: 'dashboard',
    path: '/dashboard',
    title: '📊 Command Center',
    body: 'Your day at a glance — next patient, next telehealth session, unread messages, and critical alerts. Built so clinicians start every morning in control.',
    position: 'bottom-right',
  },
  {
    id: 'schedule',
    path: '/schedule',
    title: '📅 Timeline Schedule',
    body: 'Appointments laid out as a vertical timeline — not a flat list. Each card shows status, patient avatar, and a single primary action: Check In, Open Chart, or Join Session.',
    position: 'bottom-right',
  },
  {
    id: 'inbox',
    path: '/inbox',
    title: '📬 Prioritized Inbox',
    body: 'Messages grouped by urgency — System Alerts, Pharmacy, Patient Messages. Approve a refill, view a chart, or resolve an eligibility issue without opening the message.',
    position: 'bottom-right',
  },
  {
    id: 'chart',
    path: '/chart/demo-p2/summary',
    title: '🗂️ Patient Chart',
    body: 'Every clinical detail in one place — problems, medications, labs, vitals, and encounter notes. Built for behavioral health, not repurposed from a general EHR.',
    position: 'bottom-right',
  },
  {
    id: 'billing',
    path: '/billing',
    title: '💳 Billing & RCM',
    body: '81.2% collection rate. 23 days in AR. Claims flow automatically from encounter to clearinghouse to ERA posting — without a separate billing system.',
    position: 'bottom-right',
  },
  {
    id: 'done',
    path: null,
    title: '🎉 That\'s Clarity EHR',
    body: 'Purpose-built for outpatient behavioral health. HIPAA · EPCS · 42 CFR Part 2 · ONC certified. Schedule a walkthrough with your own data.',
    position: 'center',
    isFinal: true,
  },
];

// ── Context ───────────────────────────────────────────────────────────────────
const TourContext = createContext(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used inside DemoGuidedTourProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────
export default function DemoGuidedTourProvider({ children }) {
  const { isDemo } = useDemo();
  const [active, setActive]       = useState(false);
  const [stepIdx, setStepIdx]     = useState(0);
  const [minimized, setMinimized] = useState(false);
  const navigateRef               = useRef(null);
  const setNavigate = useCallback((fn) => { navigateRef.current = fn; }, []);

  const currentStep = TOUR_STEPS[stepIdx] ?? TOUR_STEPS[0];

  const startTour = useCallback(() => {
    setStepIdx(0);
    setActive(true);
    setMinimized(false);
    const first = TOUR_STEPS[0];
    if (first.path) setTimeout(() => navigateRef.current?.(first.path), 100);
  }, []);

  const stopTour = useCallback(() => {
    setActive(false);
    setStepIdx(0);
  }, []);

  const goTo = useCallback((idx) => {
    const step = TOUR_STEPS[idx];
    if (!step) return;
    setStepIdx(idx);
    if (step.path) navigateRef.current?.(step.path);
  }, []);

  const next = useCallback(() => {
    const nextIdx = stepIdx + 1;
    if (nextIdx >= TOUR_STEPS.length) { stopTour(); return; }
    goTo(nextIdx);
  }, [stepIdx, goTo, stopTour]);

  const prev = useCallback(() => {
    const prevIdx = stepIdx - 1;
    if (prevIdx < 0) return;
    goTo(prevIdx);
  }, [stepIdx, goTo]);

  // Auto-start when isDemo becomes true; stop when it becomes false
  useEffect(() => {
    if (isDemo && !active) {
      const t = setTimeout(startTour, 400);
      return () => clearTimeout(t);
    }
    if (!isDemo && active) stopTour();
  }, [isDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    active, stepIdx, currentStep, minimized,
    setMinimized, startTour, stopTour, next, prev, goTo,
    totalSteps: TOUR_STEPS.length,
    progress: Math.round((stepIdx / (TOUR_STEPS.length - 1)) * 100),
    setNavigate,
  };

  return (
    <TourContext.Provider value={value}>
      {/* Wire up navigate once inside Router */}
      <RouterAware setNavigate={setNavigate} />
      {children}
      {/* Tour overlay — only renders when active */}
      {active && <TourOverlay />}
    </TourContext.Provider>
  );
}

// ── RouterAware — captures navigate inside Router context ─────────────────────
function RouterAware({ setNavigate }) {
  const navigate = useNavigate();
  useEffect(() => { setNavigate(navigate); }, [navigate, setNavigate]);
  return null;
}

// ── Tour Overlay ──────────────────────────────────────────────────────────────
function TourOverlay() {
  const { currentStep, stepIdx, totalSteps, progress, minimized,
          setMinimized, next, prev, stopTour } = useTour();

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9001,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 16px', borderRadius: 24,
          background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
          color: '#fff', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(15,23,42,0.35)',
          fontSize: 12, fontWeight: 700,
          animation: 'tour-card-in 0.2s ease',
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 2px rgba(34,197,94,0.3)' }} />
        Tour — Step {stepIdx + 1}/{totalSteps}
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9001,
        width: 340, background: '#fff', borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(99,102,241,0.12)',
        border: '1px solid #e2e8f0', overflow: 'hidden',
        animation: 'tour-card-in 0.22s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      {/* Progress bar */}
      <div style={{ height: 3, background: '#f1f5f9' }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: 'linear-gradient(90deg, #6366f1, #0891b2)',
          borderRadius: 2, transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Header */}
      <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
          {currentStep.title}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => setMinimized(true)}
            style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Minimize tour"
          >—</button>
          <button
            onClick={stopTour}
            style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Exit tour"
          >✕</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '10px 16px 0', fontSize: 13, color: '#475569', lineHeight: 1.65 }}>
        {currentStep.body}
      </div>

      {/* Final CTA */}
      {currentStep.isFinal && (
        <div style={{ margin: '12px 16px 0', padding: '11px 13px', background: 'linear-gradient(135deg, #f0f9ff, #f5f3ff)', borderRadius: 10, border: '1px solid #e0e7ff' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#3730a3', marginBottom: 3 }}>Ready to get started?</div>
          <div style={{ fontSize: 11, color: '#6366f1', lineHeight: 1.5 }}>Schedule a personalized walkthrough with your own practice data.</div>
        </div>
      )}

      {/* Step dots */}
      <div style={{ padding: '12px 16px 0', display: 'flex', gap: 4, alignItems: 'center' }}>
        {TOUR_STEPS.map((_, i) => (
          <div key={i} style={{
            width: i === stepIdx ? 16 : 6, height: 6, borderRadius: 3,
            background: i === stepIdx ? '#6366f1' : i < stepIdx ? '#22c55e' : '#e2e8f0',
            transition: 'all 0.2s', cursor: 'default',
          }} />
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
          {stepIdx + 1} / {totalSteps}
        </span>
      </div>

      {/* Actions */}
      <div style={{ padding: '10px 16px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
        {stepIdx > 0 && !currentStep.isFinal && (
          <button
            onClick={prev}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >← Back</button>
        )}
        <button
          onClick={next}
          style={{
            flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none',
            background: currentStep.isFinal
              ? 'linear-gradient(135deg, #6366f1, #0891b2)'
              : '#0f172a',
            color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(15,23,42,0.18)',
          }}
        >
          {currentStep.isFinal ? '🚀 Get Clarity for my practice' : 'Next →'}
        </button>
        {!currentStep.isFinal && (
          <button
            onClick={stopTour}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'transparent', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}
          >Skip</button>
        )}
      </div>

      <style>{`
        @keyframes tour-card-in {
          from { opacity:0; transform:translateY(12px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
