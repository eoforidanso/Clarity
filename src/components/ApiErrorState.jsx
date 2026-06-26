import React from 'react';

export default function ApiErrorState({ message = 'Something went wrong.', onRetry, style = {} }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', ...style,
    }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>⚠️</div>
      <p style={{ fontSize: 14, marginBottom: onRetry ? 16 : 0, maxWidth: 320 }}>{message}</p>
      {onRetry && (
        <button className="btn btn-sm btn-ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
