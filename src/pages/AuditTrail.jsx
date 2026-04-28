import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ACTIVITY_TYPES = {
  chart_open: { icon: '📂', label: 'Chart Opened', color: 'var(--info)', bg: 'var(--info-light)' },
  chart_edit: { icon: '✏️', label: 'Chart Edited', color: 'var(--primary)', bg: 'var(--primary-light)' },
  note_signed: { icon: '✍️', label: 'Note Signed', color: 'var(--success)', bg: 'var(--success-light)' },
  order_placed: { icon: '📋', label: 'Order Placed', color: 'var(--purple)', bg: 'var(--purple-light)' },
  rx_sent: { icon: '💊', label: 'Rx Sent', color: 'var(--teal)', bg: 'var(--teal-light)' },
  login: { icon: '🔐', label: 'Login', color: 'var(--success)', bg: 'var(--success-light)' },
  logout: { icon: '🚪', label: 'Logout', color: 'var(--text-muted)', bg: 'var(--bg)' },
  export: { icon: '📤', label: 'Data Export', color: 'var(--warning)', bg: 'var(--warning-light)' },
  message_sent: { icon: '💬', label: 'Message Sent', color: 'var(--info)', bg: 'var(--info-light)' },
  btg_access: { icon: '🔓', label: 'BTG Access', color: 'var(--danger)', bg: 'var(--danger-light)' },
  doc_upload: { icon: '📎', label: 'Document Upload', color: 'var(--orange)', bg: 'var(--orange-light)' },
  appt_change: { icon: '📅', label: 'Appointment Change', color: 'var(--teal)', bg: 'var(--teal-light)' },
  setting_change: { icon: '⚙️', label: 'Setting Changed', color: 'var(--text-secondary)', bg: 'var(--bg-hover)' },
};

const MOCK_ACTIVITIES = [
  { id: 'a1', type: 'login', user: 'Dr. Chris L.', userId: 'u1', detail: 'Logged in from 192.168.1.42', timestamp: '2026-04-15T08:02:00', ip: '192.168.1.42' },
  { id: 'a2', type: 'chart_open', user: 'Dr. Chris L.', userId: 'u1', detail: 'Opened chart: James Anderson (MRN-00001)', patient: 'James Anderson', timestamp: '2026-04-15T08:05:00' },
  { id: 'a3', type: 'chart_edit', user: 'Dr. Chris L.', userId: 'u1', detail: 'Updated problem list for James Anderson', patient: 'James Anderson', timestamp: '2026-04-15T08:12:00' },
  { id: 'a4', type: 'rx_sent', user: 'Dr. Chris L.', userId: 'u1', detail: 'Prescribed Sertraline 100mg → CVS Pharmacy', patient: 'James Anderson', timestamp: '2026-04-15T08:15:00' },
  { id: 'a5', type: 'note_signed', user: 'Dr. Chris L.', userId: 'u1', detail: 'Signed progress note for encounter #E-1234', patient: 'James Anderson', timestamp: '2026-04-15T08:22:00' },
  { id: 'a6', type: 'chart_open', user: 'Kelly Chen', userId: 'u4', detail: 'Opened chart: Maria Garcia (MRN-00002)', patient: 'Maria Garcia', timestamp: '2026-04-15T08:30:00' },
  { id: 'a7', type: 'appt_change', user: 'Kelly Chen', userId: 'u4', detail: 'Checked in Maria Garcia for 9:00 AM appointment', patient: 'Maria Garcia', timestamp: '2026-04-15T08:32:00' },
  { id: 'a8', type: 'message_sent', user: 'Kelly Chen', userId: 'u4', detail: 'Sent message to Dr. Chris L. re: lab results', timestamp: '2026-04-15T08:35:00' },
  { id: 'a9', type: 'order_placed', user: 'Dr. Chris L.', userId: 'u1', detail: 'Ordered CBC, CMP for David Thompson', patient: 'David Thompson', timestamp: '2026-04-15T09:00:00' },
  { id: 'a10', type: 'btg_access', user: 'Dr. Chris L.', userId: 'u1', detail: 'BTG access to Dorothy Wilson - Reason: Emergency psychiatric evaluation', patient: 'Dorothy Wilson', timestamp: '2026-04-15T09:15:00' },
  { id: 'a11', type: 'doc_upload', user: 'Kelly Chen', userId: 'u4', detail: 'Uploaded insurance card for Ashley Kim', patient: 'Ashley Kim', timestamp: '2026-04-15T09:20:00' },
  { id: 'a12', type: 'export', user: 'Front Desk Staff', userId: 'u5', detail: 'Exported analytics report: March 2026 Summary', timestamp: '2026-04-15T09:30:00' },
  { id: 'a13', type: 'setting_change', user: 'Front Desk Staff', userId: 'u5', detail: 'Changed system theme to Teal Calm', timestamp: '2026-04-15T09:32:00' },
  { id: 'a14', type: 'chart_open', user: 'April T.', userId: 'u8', detail: 'Opened chart: Marcus Brown (MRN-00006)', patient: 'Marcus Brown', timestamp: '2026-04-15T09:45:00' },
  { id: 'a15', type: 'note_signed', user: 'April T.', userId: 'u8', detail: 'Signed therapy note for Marcus Brown', patient: 'Marcus Brown', timestamp: '2026-04-15T10:30:00' },
  { id: 'a16', type: 'login', user: 'Nurse Kelly', userId: 'u4', detail: 'Logged in from 192.168.1.55', ip: '192.168.1.55', timestamp: '2026-04-15T07:55:00' },
].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

export default function AuditTrail() {
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return MOCK_ACTIVITIES.filter(a => {
      if (filter !== 'all' && a.type !== filter) return false;
      if (userFilter !== 'all' && a.userId !== userFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return a.detail.toLowerCase().includes(q) || a.user.toLowerCase().includes(q) || (a.patient || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [filter, userFilter, search]);

  const typeCounts = useMemo(() => {
    const counts = {};
    MOCK_ACTIVITIES.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
    return counts;
  }, []);

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1>📜 Audit Trail & Activity Log</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Complete record of all user actions for HIPAA compliance and security monitoring.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => alert('Exported audit log as CSV')}>📤 Export CSV</button>
          <button className="btn btn-primary btn-sm">🔄 Refresh</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        <div className="stat-card row blue fade-in"><div className="stat-icon blue">📜</div><div className="stat-info"><h3>{MOCK_ACTIVITIES.length}</h3><p>Total Events</p></div></div>
        <div className="stat-card row green fade-in"><div className="stat-icon green">🔐</div><div className="stat-info"><h3>{typeCounts.login || 0}</h3><p>Logins</p></div></div>
        <div className="stat-card row teal fade-in"><div className="stat-icon teal">📂</div><div className="stat-info"><h3>{typeCounts.chart_open || 0}</h3><p>Charts Opened</p></div></div>
        <div className="stat-card row yellow fade-in"><div className="stat-icon yellow">✏️</div><div className="stat-info"><h3>{typeCounts.chart_edit || 0}</h3><p>Chart Edits</p></div></div>
        <div className="stat-card row red fade-in"><div className="stat-icon red">🔓</div><div className="stat-info"><h3>{typeCounts.btg_access || 0}</h3><p>BTG Access</p></div></div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Search activity..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, width: 240 }} />
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
          <option value="all">All Types</option>
          {Object.entries(ACTIVITY_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.label} ({typeCounts[k] || 0})</option>
          ))}
        </select>
        <select value={userFilter} onChange={e => setUserFilter(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
          <option value="all">All Users</option>
          <option value="u1">Dr. Chris L.</option>
          <option value="u4">Kelly Chen</option>
          <option value="u5">Front Desk Staff</option>
          <option value="u8">April T.</option>
        </select>
      </div>

      {/* Activity Timeline */}
      <div className="card">
        <div className="card-body no-pad">
          {filtered.map((a, i) => {
            const at = ACTIVITY_TYPES[a.type] || ACTIVITY_TYPES.chart_open;
            const time = new Date(a.timestamp);
            return (
              <div key={a.id} className="audit-activity-row" style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 20px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, background: at.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0,
                }}>{at.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{a.detail}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span>👤 {a.user}</span>
                    {a.patient && <span>🏥 {a.patient}</span>}
                    {a.ip && <span>🌐 {a.ip}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <span className={`badge ${a.type === 'btg_access' ? 'badge-danger' : a.type === 'export' ? 'badge-warning' : 'badge-gray'}`} style={{ fontSize: 9, marginTop: 4 }}>
                    {at.label}
                  </span>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📜</div>
              <p>No activity matching filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
