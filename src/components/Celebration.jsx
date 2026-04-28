import React, { useEffect, useState, useCallback } from 'react';

const CONFETTI_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

function createParticle() {
  return {
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    rotation: Math.random() * 360,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 6 + Math.random() * 6,
    speedX: (Math.random() - 0.5) * 3,
    speedY: 2 + Math.random() * 3,
    spinSpeed: (Math.random() - 0.5) * 10,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  };
}

// Hook for triggering celebrations
export function useCelebration() {
  const [celebrating, setCelebrating] = useState(false);
  const [message, setMessage] = useState('');

  const celebrate = useCallback((msg = '🎉 Great job!') => {
    setMessage(msg);
    setCelebrating(true);
    setTimeout(() => setCelebrating(false), 3000);
  }, []);

  return { celebrating, message, celebrate };
}

export default function Celebration({ show, message = '🎉 Great job!' }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!show) { setParticles([]); return; }
    const burst = Array.from({ length: 30 }, createParticle);
    setParticles(burst);

    const interval = setInterval(() => {
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.speedX * 0.3,
            y: p.y + p.speedY * 0.5,
            rotation: p.rotation + p.spinSpeed,
          }))
          .filter(p => p.y < 120)
      );
    }, 30);

    const cleanup = setTimeout(() => { clearInterval(interval); setParticles([]); }, 3000);
    return () => { clearInterval(interval); clearTimeout(cleanup); };
  }, [show]);

  if (!show && particles.length === 0) return null;

  return (
    <div className="celebration-overlay" aria-hidden="true">
      {particles.map((p, i) => (
        <div
          key={i}
          className="confetti-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.shape === 'rect' ? p.size : p.size * 0.8,
            height: p.shape === 'rect' ? p.size * 0.5 : p.size * 0.8,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            background: p.color,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
      {show && (
        <div className="celebration-message">
          {message}
        </div>
      )}
    </div>
  );
}
