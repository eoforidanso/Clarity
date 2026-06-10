/**
 * RxReadinessScore.jsx
 * ─────────────────────────────────────────────────────────────────
 * Displays provider's prescribing readiness status with a checklist.
 *
 * Checks:
 *   ✓ Signature on file (required for all Rx)
 *   ✓ DEA number (required for controlled substances)
 *   ✓ NPI (required for all Rx)
 *
 * Shows visual score bar + warnings for missing items.
 *
 * Props
 * ─────
 *   provider         {object}    currentUser from useAuth()
 *   onFixSignature   {function}  optional — called when user clicks signature fix
 */

import React from 'react';

export default function RxReadinessScore({ provider, onFixSignature }) {
  if (!provider) return null;

  const checks = [
    { label: 'Signature on file', passed: !!provider.signature, blocker: 'all' },
    { label: 'NPI number', passed: !!provider.npi, blocker: 'all' },
    { label: 'DEA number', passed: !!provider.deaNumber, blocker: 'controlled' },
  ];

  const totalPassed = checks.filter(c => c.passed).length;
  const totalChecks = checks.length;
  const percentage = Math.round((totalPassed / totalChecks) * 100);

  // Determine color based on readiness
  const getColor = () => {
    if (percentage === 100) return '#16a34a'; // green
    if (percentage >= 66) return '#eab308';   // yellow
    return '#dc2626';                          // red
  };

  const color = getColor();

  return (
    <div style={{
      border: `1.5px solid ${color}`,
      borderRadius: 10,
      background: color === '#16a34a' ? '#f0fdf4' : color === '#eab308' ? '#fefce8' : '#fff8f8',
      padding: '12px 14px',
      marginBottom: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color }}>
          📋 Rx Readiness Score
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 6,
        borderRadius: 3,
        background: '#e5e7eb',
        overflow: 'hidden',
        marginBottom: 10,
      }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          background: color,
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {checks.map((check, i) => {
          const iconColor = check.passed ? '#16a34a' : '#dc2626';
          const textColor = check.passed ? '#166534' : '#991b1b';
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: textColor }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: iconColor }}>
                {check.passed ? '✓' : '✕'}
              </span>
              <span style={{ flex: 1 }}>
                {check.label}
                {check.blocker === 'controlled' && (
                  <span style={{ fontSize: 10.5, color: '#9a3412', marginLeft: 4 }}>
                    (for controlled substances)
                  </span>
                )}
              </span>
              {!check.passed && check.label === 'Signature on file' && onFixSignature && (
                <button
                  type="button"
                  onClick={onFixSignature}
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: '1px solid #dc2626',
                    background: 'transparent',
                    color: '#dc2626',
                    cursor: 'pointer',
                  }}>
                  Set Up →
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {percentage < 100 && (
        <div style={{
          marginTop: 10,
          padding: '8px 10px',
          borderTop: `1px solid ${color}`,
          fontSize: 11,
          color: textColor = percentage === 100 ? '#166534' : percentage >= 66 ? '#854d0e' : '#991b1b',
        }}>
          {percentage === 0 && '⚠ Complete all items before prescribing.'}
          {percentage > 0 && percentage < 100 && '⚠ Some prescribing features are unavailable.'}
          {percentage === 100 && '✓ Ready to prescribe all medication types.'}
        </div>
      )}
    </div>
  );
}
