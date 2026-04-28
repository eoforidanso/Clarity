import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/* ─── Immunization Registry Reporting (athenaOne Gap) ─────────────────────── */

const REGISTRY_SUBMISSIONS = [
  { id: 1, patient: 'James Anderson', vaccine: 'Influenza (Quadrivalent)', lot: 'FLU-2026-A', date: '2026-03-15', registry: 'IL I-CARE', status: 'Accepted', submittedAt: '2026-03-15 14:20' },
  { id: 2, patient: 'Maria Garcia', vaccine: 'COVID-19 Bivalent Booster', lot: 'MOD-2026-B1', date: '2026-02-28', registry: 'IL I-CARE', status: 'Accepted', submittedAt: '2026-02-28 16:45' },
  { id: 3, patient: 'Emily Chen', vaccine: 'Tdap (Boostrix)', lot: 'TDAP-25-C', date: '2026-04-01', registry: 'IL I-CARE', status: 'Pending', submittedAt: '2026-04-01 11:30' },
  { id: 4, patient: 'Robert Wilson', vaccine: 'Hepatitis B (3rd dose)', lot: 'HBV-25-D', date: '2026-01-20', registry: 'IL I-CARE', status: 'Accepted', submittedAt: '2026-01-20 10:15' },
  { id: 5, patient: 'David Thompson', vaccine: 'Influenza (Quadrivalent)', lot: 'FLU-2026-A', date: '2026-03-22', registry: 'IL I-CARE', status: 'Rejected', submittedAt: '2026-03-22 09:50', error: 'Patient DOB mismatch with registry record' },
  { id: 6, patient: 'Aisha Patel', vaccine: 'HPV (Gardasil 9)', lot: 'HPV-26-E', date: '2026-04-10', registry: 'IL I-CARE', status: 'Accepted', submittedAt: '2026-04-10 15:10' },
];

const PENDING_SUBMISSIONS = [
  { patient: 'James Anderson', vaccine: 'Influenza (Quadrivalent)', date: '2026-04-15', lot: 'FLU-2026-B' },
  { patient: 'Maria Garcia', vaccine: 'Tdap (Boostrix)', date: '2026-04-14', lot: 'TDAP-25-D' },
];

export default function ImmunizationRegistry() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('submissions');
  const [submissions, setSubmissions] = useState(REGISTRY_SUBMISSIONS);
  const [pendingQueue, setPendingQueue] = useState(PENDING_SUBMISSIONS);
  const [submitting, setSubmitting] = useState(false);

  const accepted = submissions.filter(s => s.status === 'Accepted').length;
  const pending = submissions.filter(s => s.status === 'Pending').length + pendingQueue.length;
  const rejected = submissions.filter(s => s.status === 'Rejected').length;

  const submitAll = () => {
    setSubmitting(true);
    setTimeout(() => {
      const newSubs = pendingQueue.map((p, i) => ({
        id: Date.now() + i,
        ...p,
        registry: 'IL I-CARE',
        status: 'Pending',
        submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      }));
      setSubmissions(prev => [...newSubs, ...prev]);
      setPendingQueue([]);
      setSubmitting(false);
    }, 2000);
  };

  const card = {
    background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
    padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  };

  const tabs = [
    { key: 'submissions', icon: '📤', label: 'Submissions' },
    { key: 'pending', icon: '⏳', label: `Pending (${pendingQueue.length})` },
    { key: 'settings', icon: '⚙️', label: 'Registry Settings' },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            💉 Immunization Registry Reporting
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Submit immunization records to state registries (IIS) — automated HL7 reporting
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Submissions', value: submissions.length, icon: '📤', color: '#4f46e5' },
          { label: 'Accepted', value: accepted, icon: '✅', color: '#16a34a' },
          { label: 'Pending', value: pending, icon: '⏳', color: '#f59e0b' },
          { label: 'Rejected', value: rejected, icon: '❌', color: '#dc2626' },
        ].map(s => (
          <div key={s.label} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: 16 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: `${s.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              padding: '10px 20px', borderRadius: '10px 10px 0 0', border: 'none',
              background: activeTab === t.key ? '#fff' : 'transparent',
              color: activeTab === t.key ? '#4f46e5' : '#64748b',
              fontWeight: activeTab === t.key ? 800 : 600, fontSize: 13, cursor: 'pointer',
              borderBottom: activeTab === t.key ? '2px solid #4f46e5' : '2px solid transparent',
              marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'submissions' && (
        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>📤 Registry Submission History</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                {['Patient', 'Vaccine', 'Lot #', 'Date Given', 'Registry', 'Submitted', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e293b' }}>{s.patient}</td>
                  <td style={{ padding: '10px 12px', color: '#475569' }}>{s.vaccine}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#475569', fontSize: 11 }}>{s.lot}</td>
                  <td style={{ padding: '10px 12px', color: '#475569' }}>{s.date}</td>
                  <td style={{ padding: '10px 12px', color: '#475569' }}>{s.registry}</td>
                  <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 11 }}>{s.submittedAt}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: s.status === 'Accepted' ? '#f0fdf4' : s.status === 'Pending' ? '#fffbeb' : '#fef2f2',
                      color: s.status === 'Accepted' ? '#16a34a' : s.status === 'Pending' ? '#d97706' : '#dc2626',
                    }}>{s.status}</span>
                    {s.error && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 2 }}>⚠️ {s.error}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'pending' && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: 0 }}>⏳ Pending Submissions Queue</h3>
            {pendingQueue.length > 0 && (
              <button onClick={submitAll} disabled={submitting}
                style={{ padding: '10px 20px', borderRadius: 8, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                {submitting ? '⏳ Submitting...' : `📤 Submit All (${pendingQueue.length})`}
              </button>
            )}
          </div>
          {pendingQueue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>All immunizations submitted</div>
            </div>
          ) : (
            pendingQueue.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a', marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>💉</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{p.patient}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{p.vaccine} · Lot: {p.lot} · Date: {p.date}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>Awaiting Submission</span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={card}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>🏛️ Connected Registries</h3>
            {[
              { name: 'Illinois I-CARE (IIS)', status: 'Connected', lastSync: '2026-04-15 06:00', icon: '🟢' },
              { name: 'CDC IZ Gateway', status: 'Connected', lastSync: '2026-04-14 23:00', icon: '🟢' },
            ].map(r => (
              <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 20 }}>{r.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Last sync: {r.lastSync}</div>
                </div>
                <span style={{ padding: '2px 10px', borderRadius: 6, background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 700 }}>{r.status}</span>
              </div>
            ))}
          </div>
          <div style={card}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>⚙️ Submission Settings</h3>
            {[
              { label: 'Auto-submit on administration', desc: 'Automatically submit when immunization is recorded', enabled: true },
              { label: 'HL7 2.5.1 format', desc: 'Use HL7 v2.5.1 messaging standard for registry communication', enabled: true },
              { label: 'Batch submission mode', desc: 'Queue immunizations and submit in daily batches', enabled: false },
              { label: 'Error auto-retry', desc: 'Automatically retry rejected submissions after correction', enabled: true },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{s.desc}</div>
                </div>
                <div style={{ padding: '2px 10px', borderRadius: 6, background: s.enabled ? '#f0fdf4' : '#f1f5f9', color: s.enabled ? '#16a34a' : '#94a3b8', fontSize: 11, fontWeight: 700 }}>
                  {s.enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
