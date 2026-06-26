import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../contexts/PatientContext';

/**
 * Clinical-action guard: no patient = no access.
 * Mirrors Epic/Athena/Cerner — all clinical workflows require an explicitly
 * selected patient. Renders a premium blocking panel when patient is absent.
 */
export default function RequirePatient({ children, message }) {
  const { selectedPatient } = usePatient();
  const navigate = useNavigate();

  if (!selectedPatient) {
    return <NoPatientSelected message={message} onSearch={() => navigate('/patients')} />;
  }

  return children;
}

function NoPatientSelected({ message, onSearch }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      padding: '40px 24px',
    }}>
      <div style={{
        maxWidth: 420,
        width: '100%',
        background: 'var(--bg-white, #fff)',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: '44px 40px 40px',
        textAlign: 'center',
        boxShadow: '0 4px 32px rgba(0,0,0,0.06)',
      }}>
        {/* Lock icon */}
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '2px solid #bfdbfe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 32,
        }}>
          🔒
        </div>

        <div style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: '#3b82f6',
          marginBottom: 10,
        }}>
          Patient Required
        </div>

        <h2 style={{
          fontSize: 20,
          fontWeight: 800,
          color: '#0f172a',
          margin: '0 0 12px',
          lineHeight: 1.3,
        }}>
          Select a patient to continue
        </h2>

        <p style={{
          fontSize: 13.5,
          color: '#64748b',
          lineHeight: 1.65,
          margin: '0 0 28px',
        }}>
          {message || 'All clinical actions — orders, prescriptions, labs, vitals, and encounters — must be tied to an active patient record.'}
        </p>

        {/* Divider with rule badges */}
        <div style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: 28,
        }}>
          {['Orders', 'E-Prescribe', 'Labs', 'Vitals', 'Encounters'].map(label => (
            <span key={label} style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#475569',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: 20,
              padding: '3px 10px',
            }}>
              {label}
            </span>
          ))}
        </div>

        <button
          onClick={onSearch}
          style={{
            width: '100%',
            padding: '12px 24px',
            background: '#1d4ed8',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.2px',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1e40af'}
          onMouseLeave={e => e.currentTarget.style.background = '#1d4ed8'}
        >
          Open Patient Search
        </button>

        <p style={{
          fontSize: 11.5,
          color: '#94a3b8',
          marginTop: 14,
          marginBottom: 0,
        }}>
          Search by name, MRN, or date of birth
        </p>
      </div>
    </div>
  );
}
