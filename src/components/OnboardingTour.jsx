import React, { useState, useEffect, useCallback } from 'react';

const TOUR_STEPS = [
  {
    target: '.sidebar-logo',
    title: 'Welcome to Clarity EHR! 🧠',
    content: 'A comprehensive outpatient behavioral health electronic health records system. Let\'s take a quick tour!',
    position: 'right',
  },
  {
    target: '.header-search',
    title: 'Global Patient Search 🔍',
    content: 'Search for any patient by name or MRN. Use Ctrl+K to open the command palette for even faster navigation.',
    position: 'bottom',
  },
  {
    target: '.sidebar-nav',
    title: 'Navigation Sidebar 📋',
    content: 'Access all modules: Dashboard, Schedule, Inbox, Patient Charts, Telehealth, E-Prescribe, and more.',
    position: 'right',
  },
  {
    target: '.notif-bell-btn',
    title: 'Real-Time Notifications 🔔',
    content: 'Get instant alerts for new lab results, messages, appointment changes, and order updates.',
    position: 'bottom',
  },
  {
    target: '.header-actions',
    title: 'Quick Actions ⚡',
    content: 'Access settings, messaging, and your profile. The clock shows the current time for clinical documentation.',
    position: 'bottom',
  },
  {
    target: null,
    title: 'You\'re All Set! 🎉',
    content: 'Explore the dashboard to see your schedule, inbox, and patient information. Use keyboard shortcuts for faster workflow: Alt+N (new note), Alt+P (find patient), Alt+S (schedule).',
    position: 'center',
  },
];

const STORAGE_KEY = 'clarity_tour_completed';

export default function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      setTimeout(() => setIsVisible(true), 1500);
    }
  }, []);

  const positionTooltip = useCallback(() => {
    const step = TOUR_STEPS[currentStep];
    if (!step?.target || step.position === 'center') {
      setTooltipPos({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      return;
    }
    const el = document.querySelector(step.target);
    if (!el) {
      setTooltipPos({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      return;
    }
    const rect = el.getBoundingClientRect();
    let top, left;
    switch (step.position) {
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + 16;
        break;
      case 'bottom':
        top = rect.bottom + 16;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - 16;
        break;
      default:
        top = rect.bottom + 16;
        left = rect.left + rect.width / 2;
    }
    setTooltipPos({ top, left });
  }, [currentStep]);

  useEffect(() => {
    if (isVisible) positionTooltip();
  }, [isVisible, currentStep, positionTooltip]);

  useEffect(() => {
    if (isVisible) {
      window.addEventListener('resize', positionTooltip);
      return () => window.removeEventListener('resize', positionTooltip);
    }
  }, [isVisible, positionTooltip]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  const step = TOUR_STEPS[currentStep];
  const isCenter = step.position === 'center' || !step.target;

  return (
    <div className="tour-overlay">
      {/* Highlight target element */}
      {step.target && document.querySelector(step.target) && (
        <div className="tour-spotlight" style={{
          ...(() => {
            const el = document.querySelector(step.target);
            if (!el) return {};
            const rect = el.getBoundingClientRect();
            return { top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 };
          })(),
        }} />
      )}

      {/* Tooltip */}
      <div
        className={`tour-tooltip ${isCenter ? 'tour-center' : ''}`}
        style={typeof tooltipPos.top === 'string' ? {
          position: 'fixed', top: tooltipPos.top, left: tooltipPos.left,
          transform: tooltipPos.transform || 'none',
        } : {
          position: 'fixed', top: tooltipPos.top, left: tooltipPos.left,
        }}
      >
        <div className="tour-step-indicator">
          {TOUR_STEPS.map((_, i) => (
            <div key={i} className={`tour-dot ${i === currentStep ? 'active' : i < currentStep ? 'done' : ''}`} />
          ))}
        </div>
        <h4 className="tour-title">{step.title}</h4>
        <p className="tour-content">{step.content}</p>
        <div className="tour-actions">
          <button className="btn btn-ghost btn-sm" onClick={handleSkip}>Skip Tour</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {currentStep > 0 && <button className="btn btn-secondary btn-sm" onClick={handlePrev}>← Back</button>}
            <button className="btn btn-primary btn-sm" onClick={handleNext}>
              {currentStep === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export a way to restart the tour
export function resetTour() {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}
