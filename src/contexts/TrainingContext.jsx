import React, { createContext, useContext, useState, useCallback } from 'react';

const TRAINING_KEY = 'clarity_training_mode';

const TrainingContext = createContext(null);

export function TrainingProvider({ children }) {
  const [isTraining, setIsTraining] = useState(() => {
    try { return localStorage.getItem(TRAINING_KEY) === 'true'; } catch { return false; }
  });

  const enableTraining = useCallback(() => {
    localStorage.setItem(TRAINING_KEY, 'true');
    setIsTraining(true);
  }, []);

  const disableTraining = useCallback(() => {
    localStorage.removeItem(TRAINING_KEY);
    setIsTraining(false);
  }, []);

  const resetTrainingData = useCallback(() => {
    // Clear all app-specific localStorage keys while preserving auth & theme
    const preserve = ['ehr_token', 'clarity_theme', 'clarity_nav_prefs', 'clarity_ai_features', TRAINING_KEY];
    Object.keys(localStorage).forEach((key) => {
      if (!preserve.includes(key)) localStorage.removeItem(key);
    });
    // Trigger a soft page reload to re-initialise all context state
    window.location.reload();
  }, []);

  return (
    <TrainingContext.Provider value={{ isTraining, enableTraining, disableTraining, resetTrainingData }}>
      {children}
    </TrainingContext.Provider>
  );
}

export function useTraining() {
  const ctx = useContext(TrainingContext);
  if (!ctx) throw new Error('useTraining must be used inside TrainingProvider');
  return ctx;
}
