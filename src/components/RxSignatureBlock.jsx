/**
 * RxSignatureBlock.jsx
 * ─────────────────────────────────────────────────────────────────
 * Inline prescriber signature preview rendered inside every
 * prescription form (EPrescribe, Orders → Prescription type).
 *
 * Shows exactly what will appear on the printed/PDF Rx:
 *   • Signature image  (or blank line if none set)
 *   • Provider name + credentials
 *   • NPI / DEA
 *   • Timestamp (live — shown as "will be signed at time of submission")
 *   • Warning badge + Settings link when no signature is on file
 *
 * Props
 * ─────
 *   provider         {object}    currentUser from useAuth()
 *   onGoToSettings   {function}  optional — navigate to Settings signature section
 */

import React from 'react';

export default function RxSignatureBlock({ provider, onGoToSettings }) {
  if (!provider) return null;

  const sig      = provider.signature || null;
  const name     = `${provider.firstName || ''} ${provider.lastName || ''}`.trim();
  const fullName = `${name}${provider.credentials ? ', ' + provider.credentials : ''}`;
  const now      = new Date();
  const dateStr  = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr  = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      border: `1.5px solid ${sig ? '#c7d2fe' : '#fca5a5'}`,
      borderRadius: 10,
      marginBottom: 12,
      overflow: 'hidden',
      background: sig ? '#f8f9ff' : '#fff8f8',
    }}>
      {/* Header */}
      <div style={{
        padding: '7px 14px',
        borderBottom: `1px solid ${sig ? '#e0e7ff' : '#fee2e2'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: sig ? '#eef2ff' : '#fef2f2',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: sig ? '#4338ca' : '#dc2626' }}>
          {sig ? '✍️ Prescriber Signature' : '⚠ No Signature on File'}
        </span>
        {onGoToSettings && (
          <button
            type="button"
            onClick={onGoToSettings}
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              padding: '2px 9px',
              borderRadius: 5,
              border: `1px solid ${sig ? '#a5b4fc' : '#fca5a5'}`,
              background: 'transparent',
              color: sig ? '#4338ca' : '#dc2626',
              cursor: 'pointer',
            }}
          >
            {sig ? 'Update →' : 'Set Up Now →'}
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        {/* Left: image or blank line + provider info */}
        <div>
          {sig ? (
            <img
              src={sig}
              alt="Provider signature"
              style={{
                maxHeight: 52,
                maxWidth: 190,
                display: 'block',
                marginBottom: 6,
                borderBottom: '1px solid #374151',
                paddingBottom: 4,
              }}
            />
          ) : (
            <div style={{
              width: 190,
              height: 44,
              borderBottom: '1.5px solid #9ca3af',
              marginBottom: 6,
              display: 'flex',
              alignItems: 'flex-end',
              paddingBottom: 2,
            }}>
              <span style={{ fontSize: 10.5, color: '#9ca3af', fontStyle: 'italic' }}>
                signature will appear here
              </span>
            </div>
          )}
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111' }}>{fullName}</div>
          {provider.npi       && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>NPI: {provider.npi}</div>}
          {provider.deaNumber && <div style={{ fontSize: 11, color: '#6b7280' }}>DEA: {provider.deaNumber}</div>}
        </div>

        {/* Right: timestamp */}
        <div style={{ textAlign: 'right', fontSize: 10.5, color: '#9ca3af', lineHeight: 1.6, flexShrink: 0 }}>
          <div>Electronically signed</div>
          <div style={{ fontWeight: 600, color: '#6b7280' }}>{dateStr}</div>
          <div>{timeStr}</div>
        </div>
      </div>

      {/* No-signature warning banner */}
      {!sig && (
        <div style={{
          padding: '7px 14px',
          borderTop: '1px solid #fee2e2',
          background: '#fff1f1',
          fontSize: 11.5,
          color: '#b91c1c',
          lineHeight: 1.5,
        }}>
          Prescriptions will print with a blank signature line.{' '}
          {onGoToSettings
            ? <><button type="button" onClick={onGoToSettings} style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit', padding: 0 }}>Go to Settings → Electronic Signature</button> to add one.</>
            : 'Go to Settings → Electronic Signature to add one.'
          }
        </div>
      )}
    </div>
  );
}
