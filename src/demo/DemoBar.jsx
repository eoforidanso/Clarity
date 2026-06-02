import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from './DemoContext';
import { useTour, TOUR_STEPS } from './DemoGuidedTourProvider';
import { demoRateLimit } from './demoRateLimit';

export default function DemoBar() {
  const { isDemo, exitDemo } = useDemo();
  const { active: tourActive, stepIdx: tourStep, goTo: goToStep,
          minimized: tourMinimized, setMinimized: setTourMinimized,
          startTour } = useTour();
  const navigate = useNavigate();
  const [sessionStats, setSessionStats] = useState(null);

  // Refresh session stats every 30s
  useEffect(() => {
    if (!isDemo) return;
    const update = () => setSessionStats(demoRateLimit.getSummary());
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [isDemo]);

  if (!isDemo) return null;

  const currentStep = TOUR_STEPS[tourStep];
  const progress = ((tourStep) / (TOUR_STEPS.length - 1)) * 100;

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
            <button key={s.id} onClick={() => goToStep(i)}
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
        {currentStep && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentStep.title} — {currentStep.body.slice(0, 55)}…
          </span>
        )}

        {/* Session stats */}
        {sessionStats && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>
            <span title="Session duration">⏱ {sessionStats.duration}</span>
            <span title="Pages visited">📄 {sessionStats.pagesVisited}p</span>
            {sessionStats.blockedCount > 0 && (
              <span title={`${sessionStats.blockedCount} restricted attempts`} style={{ color: '#f87171' }}>
                🔒 {sessionStats.blockedCount}
              </span>
            )}
          </div>
        )}

        <div style={{ marginLeft: sessionStats ? 8 : 'auto', display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => setTourMinimized(m => !m)}
            style={{ padding: '3px 10px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
            {tourMinimized ? '▶ Tour' : '▾ Tour'}
          </button>
          <button onClick={exitDemo}
            style={{ padding: '3px 10px', borderRadius: 5, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.12)', color: '#fca5a5', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
            ✕ Exit Demo
          </button>
        </div>
      </div>

      <style>{`
        @keyframes demo-pulse { 0%,100% { box-shadow: 0 0 0 2px rgba(34,197,94,0.3); } 50% { box-shadow: 0 0 0 4px rgba(34,197,94,0.5); } }
      `}</style>
    </>
  );
}
