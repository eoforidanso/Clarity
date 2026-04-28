import React, { useState, useEffect } from 'react';

export default function SplashScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const steps = [
      { delay: 100, val: 15 },
      { delay: 300, val: 35 },
      { delay: 500, val: 55 },
      { delay: 700, val: 75 },
      { delay: 900, val: 90 },
      { delay: 1100, val: 100 },
    ];
    const timers = steps.map(s => setTimeout(() => setProgress(s.val), s.delay));
    const fadeTimer = setTimeout(() => setVisible(false), 1400);
    const doneTimer = setTimeout(() => onComplete?.(), 1700);
    return () => { timers.forEach(clearTimeout); clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onComplete]);

  return (
    <div className={`splash-screen ${!visible ? 'splash-exit' : ''}`}>
      <div className="splash-content">
        <div className="splash-logo-ring">
          <div className="splash-logo">🧠</div>
        </div>
        <h1 className="splash-title">Clarity</h1>
        <p className="splash-subtitle">Behavioral Health EHR</p>
        <div className="splash-progress-track">
          <div className="splash-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="splash-status">
          {progress < 30 && 'Initializing...'}
          {progress >= 30 && progress < 60 && 'Loading clinical modules...'}
          {progress >= 60 && progress < 90 && 'Preparing workspace...'}
          {progress >= 90 && '✓ Ready'}
        </div>
        <div className="splash-certs">
          {['HIPAA', 'ONC Certified', 'FHIR R4', 'EPCS'].map(c => (
            <span key={c} className="splash-cert-badge">{c}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
