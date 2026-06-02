import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo, TOUR_STEPS } from './DemoContext';

export default function DemoBar() {
  const { isDemo, exitDemo, tourActive, setTourActive, tourStep, goToStep,
          tourMinimized, setTourMinimized, currentTourStop, nextStep, prevStep } = useDemo();
  const navigate = useNavigate();

  if (!isDemo) return null;

  const step = currentTourStop;
  const isLast = step?.isFinal;
  const progress = ((tourStep) / (TOUR_STEPS.length - 1)) * 100;

  const goToStepNav = (idx) => {
    goToStep(idx);
    const s = TOUR_STEPS[idx];
    if (s?.path) navigate(s.path);
  };

  const handleNext = () => {
    if (isLast) { exitDemo(); return; }
    const nextIdx = tourStep + 1;
    const next = TOUR_STEPS[nextIdx];
    if (next?.path) navigate(next.path);
    nextStep();
  };

  const handlePrev = () => {
    const prevIdx = tourStep - 1;
    const prev = TOUR_STEPS[prevIdx];
    if (prev?.path) navigate(prev.path);
    prevStep();
  };

  return (
    <>
      {/* ── Persistent top banner ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9000,
        background: 'linear-gradient(90deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
        borderBottom: '1px solid rgba(99,102,241,0.4)',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 16px', height: 36,
      }}>
        {/* Demo badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 2px rgba(34,197,94,0.3)', animation: 'demo-pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.8px', textTransform: 'uppercase' }}>Demo Mode</span>
        </div>

        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)' }} />

        {/* Tour step dots */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {TOUR_STEPS.filter(s => !s.isFinal).map((s, i) => (
            <button key={s.id} onClick={() => goToStepNav(i)}
              title={s.title.replace(/^[^ ]+ /, '')}
              style={{
                width: i === tourStep ? 16 : 6, height: 6, borderRadius: 3,
                background: i === tourStep ? '#6366f1' : i < tourStep ? '#22c55e' : 'rgba(255,255,255,0.25)',
                border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.2s',
                flexShrink: 0,
              }} />
          ))}
        </div>

        {/* Current step label */}
        {!tourMinimized && step && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {step.title} — {step.body.slice(0, 60)}…
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {/* Tour toggle */}
          <button onClick={() => setTourMinimized(m => !m)}
            style={{ padding: '3px 10px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
            {tourMinimized ? '▶ Show Tour' : '▾ Tour'}
          </button>
          {/* Exit */}
          <button onClick={exitDemo}
            style={{ padding: '3px 10px', borderRadius: 5, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.12)', color: '#fca5a5', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
            ✕ Exit Demo
          </button>
        </div>
      </div>

      {/* ── Tour Card ── */}
      {!tourMinimized && step && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9001,
          width: 340, background: '#fff', borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(99,102,241,0.12)',
          border: '1px solid #e2e8f0', overflow: 'hidden',
          animation: 'tour-card-in 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          {/* Progress bar */}
          <div style={{ height: 3, background: '#f1f5f9' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #0891b2)', borderRadius: 2, transition: 'width 0.4s ease' }} />
          </div>

          {/* Header */}
          <div style={{ padding: '16px 18px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>{step.title}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', flexShrink: 0, paddingTop: 2 }}>
              {tourStep + 1} / {TOUR_STEPS.length}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '10px 18px 0', fontSize: 13, color: '#475569', lineHeight: 1.65 }}>
            {step.body}
          </div>

          {/* Final CTA */}
          {isLast && (
            <div style={{ margin: '14px 18px 0', padding: '12px 14px', background: 'linear-gradient(135deg, #f0f9ff, #f5f3ff)', borderRadius: 10, border: '1px solid #e0e7ff' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#3730a3', marginBottom: 4 }}>Ready to get started?</div>
              <div style={{ fontSize: 11, color: '#6366f1' }}>Schedule a personalized walkthrough with your own patient data.</div>
            </div>
          )}

          {/* Actions */}
          <div style={{ padding: '14px 18px', display: 'flex', gap: 8, alignItems: 'center' }}>
            {tourStep > 0 && !isLast && (
              <button onClick={handlePrev}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                ← Back
              </button>
            )}
            <button onClick={handleNext}
              style={{
                flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none',
                background: isLast ? 'linear-gradient(135deg, #6366f1, #0891b2)' : '#0f172a',
                color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(15,23,42,0.2)',
              }}>
              {isLast ? '🚀 Get Clarity for my practice' : 'Next →'}
            </button>
            {!isLast && (
              <button onClick={exitDemo}
                style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'transparent', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}>
                Skip
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes demo-pulse { 0%,100% { box-shadow: 0 0 0 2px rgba(34,197,94,0.3); } 50% { box-shadow: 0 0 0 4px rgba(34,197,94,0.5); } }
        @keyframes tour-card-in { from { opacity:0; transform:translateY(12px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
      `}</style>
    </>
  );
}
