/**
 * PatientHoverCard — Athena-style tooltip on patient name hover
 * Shows: photo, name, DOB/age, phone, email, last appt, next appt
 *
 * Usage:
 *   <PatientHoverCard patient={patientObj} appointments={appointments}>
 *     <span>{patient.firstName} {patient.lastName}</span>
 *   </PatientHoverCard>
 */
import React, { useState, useRef } from 'react';

function calcAge(dob) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PatientHoverCard({ patient, appointments = [], children }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);
  const timer = useRef(null);

  if (!patient) return <>{children}</>;

  const age = calcAge(patient.dob);

  // Find last + next appointments for this patient
  const patAppts = appointments
    .filter(a => a.patientId === patient.id)
    .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  const now = new Date();
  const past = patAppts.filter(a => new Date(`${a.date}T${a.time}`) < now && a.status !== 'Cancelled');
  const future = patAppts.filter(a => new Date(`${a.date}T${a.time}`) >= now && a.status !== 'Cancelled');
  const lastAppt = past[past.length - 1];
  const nextAppt = future[0];

  const handleMouseEnter = (e) => {
    clearTimeout(timer.current);
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      setPos({
        top: rect.bottom + window.scrollY + 6,
        left: Math.min(rect.left + window.scrollX, window.innerWidth - 280),
      });
    }
    timer.current = setTimeout(() => setShow(true), 300);
  };

  const handleMouseLeave = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 150);
  };

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'default' }}
      >
        {children}
      </span>

      {show && (
        <div
          onMouseEnter={() => clearTimeout(timer.current)}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            width: 270,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(15,23,42,0.16), 0 2px 8px rgba(15,23,42,0.08)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            animation: 'fadeInUp 0.12s ease both',
          }}
        >
          {/* Header */}
          <div style={{ padding: '12px 14px', background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)' }}>
              {patient.photo
                ? <img src={patient.photo} alt={patient.firstName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#60a5fa,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#fff' }}>
                    {patient.firstName?.[0]}{patient.lastName?.[0]}
                  </div>
              }
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#fff' }}>{patient.firstName} {patient.lastName}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                {patient.mrn} {age ? `· ${age} yrs` : ''} {patient.gender ? `· ${patient.gender}` : ''}
              </div>
            </div>
          </div>

          {/* Details */}
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              ['📅', 'DOB', patient.dob ? fmtDate(patient.dob) : null],
              ['📞', 'Phone', patient.phone || patient.cellPhone],
              ['✉️', 'Email', patient.email],
              ['🏥', 'Insurance', patient.insurance?.primary?.name],
            ].filter(([,, v]) => v).map(([icon, label, value]) => (
              <div key={label} style={{ display: 'flex', gap: 6, fontSize: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                <span style={{ color: '#6b7280', flexShrink: 0, minWidth: 50 }}>{label}</span>
                <span style={{ color: '#0f172a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
              </div>
            ))}

            {/* Appointments */}
            {(lastAppt || nextAppt) && (
              <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 2, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {lastAppt && (
                  <div style={{ display: 'flex', gap: 6, fontSize: 12 }}>
                    <span style={{ fontSize: 11 }}>⬅️</span>
                    <span style={{ color: '#6b7280', flexShrink: 0, minWidth: 50 }}>Last</span>
                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{fmtDate(lastAppt.date)} · {lastAppt.type}</span>
                  </div>
                )}
                {nextAppt && (
                  <div style={{ display: 'flex', gap: 6, fontSize: 12 }}>
                    <span style={{ fontSize: 11 }}>➡️</span>
                    <span style={{ color: '#6b7280', flexShrink: 0, minWidth: 50 }}>Next</span>
                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{fmtDate(nextAppt.date)} · {nextAppt.type}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
