import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/* ─── Multi-Location Management (athenaOne Gap) ──────────────────────────── */

const LOCATIONS = [
  {
    id: 'loc1', name: 'Clarity — Main Office', address: '200 N Michigan Ave, Suite 1500, Chicago, IL 60601',
    phone: '(312) 555-0199', fax: '(312) 555-0200', type: 'Primary', status: 'Active',
    hours: 'Mon–Fri 8:00 AM – 6:00 PM', providers: 3, rooms: 8,
    npi: '1234567890', taxId: '12-3456789', placeOfService: '11 — Office',
    todayAppts: 19, capacity: 24, telehealth: true,
  },
  {
    id: 'loc2', name: 'Clarity — West Loop', address: '311 W Randolph St, Suite 800, Chicago, IL 60606',
    phone: '(312) 555-0210', fax: '(312) 555-0211', type: 'Satellite', status: 'Active',
    hours: 'Mon, Wed, Fri 9:00 AM – 5:00 PM', providers: 2, rooms: 5,
    npi: '1234567891', taxId: '12-3456789', placeOfService: '11 — Office',
    todayAppts: 8, capacity: 15, telehealth: true,
  },
  {
    id: 'loc3', name: 'Clarity — Evanston', address: '1603 Orrington Ave, Suite 300, Evanston, IL 60201',
    phone: '(847) 555-0130', fax: '(847) 555-0131', type: 'Satellite', status: 'Active',
    hours: 'Tue, Thu 9:00 AM – 5:00 PM', providers: 1, rooms: 3,
    npi: '1234567892', taxId: '12-3456790', placeOfService: '11 — Office',
    todayAppts: 5, capacity: 10, telehealth: true,
  },
  {
    id: 'loc4', name: 'Clarity — Telehealth Only', address: 'Virtual — No Physical Location',
    phone: '(312) 555-0250', fax: '—', type: 'Virtual', status: 'Active',
    hours: 'Mon–Sat 7:00 AM – 9:00 PM', providers: 4, rooms: 0,
    npi: '—', taxId: '12-3456789', placeOfService: '02 — Telehealth',
    todayAppts: 12, capacity: 40, telehealth: true,
  },
];

const PROVIDER_ASSIGNMENTS = [
  { provider: 'Dr. Chris L., MD PhD', role: 'Psychiatrist', locations: ['Main Office', 'West Loop', 'Telehealth'], primaryLoc: 'Main Office' },
  { provider: 'Joseph, PMHNP-BC', role: 'Nurse Practitioner', locations: ['Main Office', 'Evanston', 'Telehealth'], primaryLoc: 'Main Office' },
  { provider: 'April Thompson, LCSW', role: 'Therapist', locations: ['Main Office', 'West Loop', 'Telehealth'], primaryLoc: 'West Loop' },
  { provider: 'Dr. Irina S., MD', role: 'Psychiatrist', locations: ['Evanston', 'Telehealth'], primaryLoc: 'Evanston' },
];

export default function MultiLocationManagement() {
  const { currentUser } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeTab, setActiveTab] = useState('locations');

  const card = {
    background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
    padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  };

  const totalAppts = LOCATIONS.reduce((s, l) => s + l.todayAppts, 0);
  const totalCapacity = LOCATIONS.reduce((s, l) => s + l.capacity, 0);
  const activeLocations = LOCATIONS.filter(l => l.status === 'Active').length;

  const tabs = [
    { key: 'locations', icon: '📍', label: 'Locations' },
    { key: 'providers', icon: '👩‍⚕️', label: 'Provider Assignments' },
    { key: 'settings', icon: '⚙️', label: 'Configuration' },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            🏢 Multi-Location Management
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Manage clinic locations, provider assignments, and cross-location scheduling
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Active Locations', value: activeLocations, icon: '📍', color: '#4f46e5' },
          { label: 'Today\'s Appointments', value: totalAppts, icon: '📅', color: '#0891b2' },
          { label: 'Total Capacity', value: totalCapacity, icon: '📊', color: '#16a34a' },
          { label: 'Utilization', value: `${Math.round((totalAppts / totalCapacity) * 100)}%`, icon: '📈', color: '#d97706' },
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

      {activeTab === 'locations' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedLocation ? '380px 1fr' : 'repeat(2, 1fr)', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {LOCATIONS.map(loc => (
              <div key={loc.id} onClick={() => setSelectedLocation(selectedLocation?.id === loc.id ? null : loc)}
                style={{
                  ...card, cursor: 'pointer',
                  borderColor: selectedLocation?.id === loc.id ? '#4f46e5' : '#e2e8f0',
                  borderWidth: selectedLocation?.id === loc.id ? 2 : 1,
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {loc.type === 'Virtual' ? '🌐' : '🏥'} {loc.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{loc.address}</div>
                  </div>
                  <span style={{
                    padding: '2px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                    background: loc.type === 'Primary' ? '#eff6ff' : loc.type === 'Virtual' ? '#f5f3ff' : '#f0fdf4',
                    color: loc.type === 'Primary' ? '#4f46e5' : loc.type === 'Virtual' ? '#7c3aed' : '#16a34a',
                  }}>{loc.type}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#64748b' }}>
                  <span>📅 {loc.todayAppts}/{loc.capacity} today</span>
                  <span>👩‍⚕️ {loc.providers} providers</span>
                  <span>🚪 {loc.rooms} rooms</span>
                </div>
                {/* Utilization bar */}
                <div style={{ marginTop: 8, height: 5, background: '#f1f5f9', borderRadius: 3 }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${Math.min((loc.todayAppts / loc.capacity) * 100, 100)}%`,
                    background: (loc.todayAppts / loc.capacity) > 0.85 ? '#ef4444' : (loc.todayAppts / loc.capacity) > 0.6 ? '#f59e0b' : '#22c55e',
                  }} />
                </div>
              </div>
            ))}
          </div>

          {selectedLocation && (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>{selectedLocation.name}</h2>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{selectedLocation.address}</div>
                </div>
                <button onClick={() => setSelectedLocation(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Phone', value: selectedLocation.phone },
                  { label: 'Fax', value: selectedLocation.fax },
                  { label: 'Hours', value: selectedLocation.hours },
                  { label: 'Place of Service', value: selectedLocation.placeOfService },
                  { label: 'NPI', value: selectedLocation.npi },
                  { label: 'Tax ID', value: selectedLocation.taxId },
                  { label: 'Rooms', value: selectedLocation.rooms },
                  { label: 'Telehealth', value: selectedLocation.telehealth ? 'Enabled' : 'Disabled' },
                ].map(d => (
                  <div key={d.label} style={{ padding: '8px 12px', background: '#f7f9fc', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{d.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>{d.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ padding: 14, background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#4f46e5', marginBottom: 4 }}>
                  📊 Today's Utilization: {selectedLocation.todayAppts}/{selectedLocation.capacity} ({Math.round((selectedLocation.todayAppts / selectedLocation.capacity) * 100)}%)
                </div>
                <div style={{ height: 8, background: '#dbeafe', borderRadius: 4, marginTop: 8 }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    width: `${(selectedLocation.todayAppts / selectedLocation.capacity) * 100}%`,
                    background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                  }} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'providers' && (
        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>👩‍⚕️ Provider Location Assignments</h3>
          {PROVIDER_ASSIGNMENTS.map(p => (
            <div key={p.provider} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👩‍⚕️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{p.provider}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{p.role} · Primary: {p.primaryLoc}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {p.locations.map(l => (
                  <span key={l} style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: l === p.primaryLoc ? '#eff6ff' : '#f1f5f9',
                    color: l === p.primaryLoc ? '#4f46e5' : '#475569',
                    border: l === p.primaryLoc ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  }}>📍 {l}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={card}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>⚙️ Cross-Location Settings</h3>
            {[
              { label: 'Cross-location scheduling', desc: 'Allow patients to be scheduled at any location', enabled: true },
              { label: 'Shared patient records', desc: 'Access patient charts from any location', enabled: true },
              { label: 'Unified inbox', desc: 'Single clinical inbox across all locations', enabled: true },
              { label: 'Location-based fee schedules', desc: 'Different fee schedules per location', enabled: false },
              { label: 'Auto POS assignment', desc: 'Automatically set Place of Service based on visit location', enabled: true },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{s.desc}</div>
                </div>
                <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: s.enabled ? '#f0fdf4' : '#f1f5f9', color: s.enabled ? '#16a34a' : '#94a3b8' }}>
                  {s.enabled ? 'On' : 'Off'}
                </span>
              </div>
            ))}
          </div>
          <div style={card}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>🏥 Location Types</h3>
            {[
              { type: 'Primary', desc: 'Main clinic location — default for new patients and billing', icon: '🏥', count: 1 },
              { type: 'Satellite', desc: 'Branch offices with regular operating hours', icon: '🏢', count: 2 },
              { type: 'Virtual', desc: 'Telehealth-only — no physical address needed', icon: '🌐', count: 1 },
            ].map(t => (
              <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 24 }}>{t.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{t.type}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{t.desc}</div>
                </div>
                <span style={{ fontWeight: 800, fontSize: 14, color: '#4f46e5' }}>{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
