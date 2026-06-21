import React, { useState, useMemo, useEffect } from 'react';
import { users as usersApi } from '../services/api';

const TIME_RANGES = ['Last 7 Days', 'Last 30 Days', 'Last Quarter', 'YTD', 'Last Year'];

function emptyMetrics() {
  return {
    patientsTotal: 0, newPatients: 0, discharges: 0,
    appointmentsScheduled: 0, appointmentsCompleted: 0, noShows: 0, cancelledByPatient: 0, cancelledByProvider: 0,
    avgEncounterTime: 0, chargesCaptured: 0, collectionsReceived: 0,
    claimsSubmitted: 0, claimsDenied: 0, denialRate: 0,
    phq9Avg: 0, phq9ImprovedPct: 0, gad7Avg: 0, gad7ImprovedPct: 0,
    prescriptionsWritten: 0, priorAuthsSubmitted: 0, priorAuthApproved: 0,
    avgDocumentationLag: 0, notesCompletedSameDay: 0,
    satisfaction: 0, nps: 0,
  };
}

function userToProvider(u) {
  return {
    id: u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.name || u.id,
    role: u.role || '',
    specialty: u.specialty || u.credentials || '',
    avatar: '👤',
    metrics: emptyMetrics(),
    trend: [],
  };
}

const StatCard = ({ icon, value, label, bg, change }) => (
  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
    <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
    <div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</div>
      {change && <div style={{ fontSize: 10, color: change > 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{change > 0 ? '▲' : '▼'} {Math.abs(change)}%</div>}
    </div>
  </div>
);

const MiniBar = ({ data, max, color }) => (
  <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 32 }}>
    {data.map((v, i) => (
      <div key={i} style={{ width: 10, height: `${(v / (max || 1)) * 100}%`, minHeight: 2, borderRadius: 2, background: i === data.length - 1 ? color : `${color}60` }} />
    ))}
  </div>
);

export default function ProviderPerformance() {
  const [timeRange, setTimeRange] = useState('Last 30 Days');
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [view, setView] = useState('overview');

  useEffect(() => {
    usersApi.list().then(data => {
      if (Array.isArray(data)) {
        const providerRoles = ['prescriber', 'psychiatrist', 'therapist', 'nurse_practitioner', 'provider'];
        const list = data
          .filter(u => providerRoles.includes((u.role || '').toLowerCase()))
          .map(userToProvider);
        setProviders(list);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedProvider && providers.length > 0) setSelectedProvider(providers[0]);
  }, [providers]);

  const totals = useMemo(() => ({
    patients:        providers.reduce((s, p) => s + p.metrics.patientsTotal, 0),
    appointments:    providers.reduce((s, p) => s + p.metrics.appointmentsCompleted, 0),
    charges:         providers.reduce((s, p) => s + p.metrics.chargesCaptured, 0),
    collections:     providers.reduce((s, p) => s + p.metrics.collectionsReceived, 0),
    noShows:         providers.reduce((s, p) => s + p.metrics.noShows, 0),
    avgSatisfaction: providers.length > 0
      ? (providers.reduce((s, p) => s + p.metrics.satisfaction, 0) / providers.length).toFixed(1)
      : '—',
  }), [providers]);

  if (!selectedProvider) return (
    <div className="fade-in" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
      Loading providers…
    </div>
  );

  const m = selectedProvider.metrics;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>📊 Provider Performance</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Track productivity, outcomes, billing, and quality metrics per provider</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="form-input" value={timeRange} onChange={e => setTimeRange(e.target.value)} style={{ width: 140, fontSize: 12 }}>
            {TIME_RANGES.map(t => <option key={t}>{t}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => { const blob = new Blob(['Provider Performance Report\n\nExported: ' + new Date().toLocaleDateString()], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'provider_performance_report.txt'; a.click(); URL.revokeObjectURL(url); }}>📥 Export</button>
        </div>
      </div>

      {/* Org-wide stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard icon="👥" value={totals.patients} label="Total Patients" bg="#eff6ff" />
        <StatCard icon="📅" value={totals.appointments} label="Completed Appts" bg="#dcfce7" change={8.2} />
        <StatCard icon="💰" value={`$${(totals.charges / 1000).toFixed(1)}K`} label="Charges Captured" bg="#fef3c7" change={5.4} />
        <StatCard icon="💵" value={`$${(totals.collections / 1000).toFixed(1)}K`} label="Collections" bg="#d1fae5" change={3.1} />
        <StatCard icon="🚫" value={totals.noShows} label="No-Shows" bg="#fee2e2" change={-12} />
        <StatCard icon="⭐" value={totals.avgSatisfaction} label="Avg Satisfaction" bg="#faf5ff" />
      </div>

      {/* Provider selector + detail */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>Providers</div>
          {providers.map(p => (
            <div key={p.id} onClick={() => setSelectedProvider(p)}
              style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedProvider.id === p.id ? 'var(--primary-light)' : 'transparent', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.15s' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff' }}>{p.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.role}</div>
              </div>
              <MiniBar data={p.trend} max={Math.max(...p.trend)} color="#3b82f6" />
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff' }}>{selectedProvider.avatar}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{selectedProvider.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selectedProvider.specialty} · {selectedProvider.role}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['overview', 'clinical', 'billing', 'quality'].map(v => (
                <button key={v} onClick={() => setView(v)}
                  style={{ padding: '5px 12px', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: view === v ? 'var(--primary)' : 'transparent', color: view === v ? '#fff' : 'var(--text-secondary)' }}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: 20 }}>
            {view === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>{m.appointmentsCompleted}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Completed Visits</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>of {m.appointmentsScheduled} scheduled</div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#16a34a' }}>{m.patientsTotal}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Active Patients</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>+{m.newPatients} new, -{m.discharges} discharged</div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>{m.avgEncounterTime}m</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Avg Encounter</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>per visit duration</div>
                </div>
                <div style={{ background: '#fee2e2', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626' }}>{m.noShows}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#991b1b' }}>No-Shows</div>
                  <div style={{ fontSize: 10, color: '#b91c1c' }}>{((m.noShows / m.appointmentsScheduled) * 100).toFixed(1)}% rate</div>
                </div>
                <div style={{ background: '#dcfce7', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#166534' }}>⭐ {m.satisfaction}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#166534' }}>Patient Satisfaction</div>
                  <div style={{ fontSize: 10, color: '#15803d' }}>NPS: {m.nps}</div>
                </div>
                <div style={{ background: '#fef3c7', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#92400e' }}>{m.notesCompletedSameDay}%</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#92400e' }}>Same-Day Notes</div>
                  <div style={{ fontSize: 10, color: '#a16207' }}>avg lag: {m.avgDocumentationLag}d</div>
                </div>
              </div>
            )}

            {view === 'clinical' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>📈 Outcome Measures</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>PHQ-9 Average</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#3b82f6' }}>{m.phq9Avg}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>PHQ-9 Improved</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#16a34a' }}>{m.phq9ImprovedPct}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>GAD-7 Average</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#3b82f6' }}>{m.gad7Avg}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>GAD-7 Improved</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#16a34a' }}>{m.gad7ImprovedPct}%</span>
                  </div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>💊 Prescribing</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Prescriptions Written</span>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>{m.prescriptionsWritten}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Prior Auths Submitted</span>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>{m.priorAuthsSubmitted}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Prior Auths Approved</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#16a34a' }}>{m.priorAuthApproved}</span>
                  </div>
                </div>
              </div>
            )}

            {view === 'billing' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#3b82f6' }}>${m.chargesCaptured.toLocaleString()}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 4 }}>Charges Captured</div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a' }}>${m.collectionsReceived.toLocaleString()}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 4 }}>Collections</div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>{((m.collectionsReceived / m.chargesCaptured) * 100).toFixed(1)}%</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 4 }}>Collection Rate</div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{m.claimsSubmitted}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 4 }}>Claims Submitted</div>
                </div>
                <div style={{ background: '#fee2e2', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626' }}>{m.claimsDenied}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#991b1b', marginTop: 4 }}>Claims Denied</div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626' }}>{m.denialRate}%</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 4 }}>Denial Rate</div>
                </div>
              </div>
            )}

            {view === 'quality' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>🏆 Quality Scorecard</div>
                  {[
                    { label: 'Appointment Completion Rate', val: ((m.appointmentsCompleted / m.appointmentsScheduled) * 100).toFixed(1) + '%', target: '95%', met: (m.appointmentsCompleted / m.appointmentsScheduled) >= 0.95 },
                    { label: 'No-Show Rate', val: ((m.noShows / m.appointmentsScheduled) * 100).toFixed(1) + '%', target: '< 5%', met: (m.noShows / m.appointmentsScheduled) < 0.05 },
                    { label: 'Same-Day Documentation', val: m.notesCompletedSameDay + '%', target: '80%', met: m.notesCompletedSameDay >= 80 },
                    { label: 'Patient Satisfaction', val: m.satisfaction + '/5.0', target: '≥ 4.5', met: m.satisfaction >= 4.5 },
                    { label: 'Denial Rate', val: m.denialRate + '%', target: '< 8%', met: m.denialRate < 8 },
                    { label: 'PHQ-9 Improvement Rate', val: m.phq9ImprovedPct + '%', target: '60%', met: m.phq9ImprovedPct >= 60 },
                  ].map(q => (
                    <div key={q.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{q.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Target: {q.target}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, marginRight: 10 }}>{q.val}</div>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: q.met ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                        {q.met ? '✅' : '⚠️'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
