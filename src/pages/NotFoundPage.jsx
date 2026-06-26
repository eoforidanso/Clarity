import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', textAlign: 'center', padding: 40,
    }}>
      <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.3 }}>404</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Page not found</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 28, maxWidth: 360 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </button>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    </div>
  );
}
