import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePatient } from '../contexts/PatientContext';

export default function GoToSession() {
  const { aptId } = useParams();
  const { appointments, patients, selectPatient } = usePatient();
  const navigate = useNavigate();
  const [apt, setApt] = useState(null);
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    const found = appointments.find((a) => a.id === aptId);
    if (!found) { navigate('/schedule', { replace: true }); return; }
    setApt(found);
    const p = patients.find(p => p.id === found.patientId);
    setPatient(p || null);
    selectPatient(found.patientId);
  }, [aptId, appointments, patients, selectPatient, navigate]);

  if (!apt) {
    return (
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading session…</p>
      </div>
    );
  }

  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : apt.patientId;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - var(--header-height) - 60px)' }}>
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.12)', width: '100%', maxWidth: 520, overflow: 'hidden' }}>
        {/* Header bar */}
        <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', padding: '22px 28px', color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.8, marginBottom: 4 }}>Session Ready</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>{patientName}</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{dateStr} · {timeStr}</div>
        </div>

        {/* Appointment info */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
            {[
              { label: 'Visit Type', value: apt.type || apt.visitType || 'Appointment' },
              { label: 'Duration', value: apt.duration ? `${apt.duration} min` : '50 min' },
              { label: 'Provider', value: apt.provider || apt.providerName || 'Provider' },
              { label: 'Location', value: apt.location || 'Office' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => navigate(`/chart/${apt.patientId}/encounters`)}
            style={{ width: '100%', padding: '13px 0', borderRadius: 10, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            📝 Open Encounter &amp; Start Note
          </button>
          <button
            onClick={() => navigate(`/telehealth/${apt.patientId}`)}
            style={{ width: '100%', padding: '13px 0', borderRadius: 10, background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #bbf7d0', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            📹 Start Telehealth Session
          </button>
          <button
            onClick={() => navigate(`/chart/${apt.patientId}/summary`)}
            style={{ width: '100%', padding: '12px 0', borderRadius: 10, background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            View Chart Summary
          </button>
          <button
            onClick={() => navigate('/schedule')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer', padding: '4px 0' }}>
            ← Back to Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
