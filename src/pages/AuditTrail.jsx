import React, { useState, useMemo, useEffect, useCallback } from 'react';
import DemoGuard from '../demo/DemoGuard';
import { useAuth } from '../contexts/AuthContext';
import { checkAdminAccess } from '../utils/accessControl';

const API = import.meta.env.VITE_API_URL || '/api';

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


function AuditTrail_Inner() {
  const { currentUser } = useAuth();
  const { canAccess, isGlobal, isLocal, facilityId } = checkAdminAccess(currentUser);

  // ⭐ Only admins can access audit logs
  if (!canAccess) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ marginBottom: 8 }}>Access Restricted</h2>
        <p>Audit Trail is only available to Administrators.</p>
      </div>
    );
  }

  const [filter, setFilter]       = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [search, setSearch]       = useState('');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 200 });
      if (dateFrom) params.set('startDate', dateFrom);
      if (dateTo)   params.set('endDate', dateTo);
      const res = await fetch(`${API}/audit-log?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        // Normalise API response to match local shape
        const normalised = data.map(r => ({
          id:        r.id,
          type:      (r.action || '').toLowerCase().replace(/_/g, '_'),
          user:      r.actorName || r.actor_name || r.userId || '—',
          userId:    r.actorId  || r.actor_id,
          detail:    r.details  ? (typeof r.details === 'string' ? r.details : JSON.stringify(r.details)) : (r.action || ''),
          patient:   r.targetType === 'patient' ? r.targetId : '',
          ip:        r.ipAddress || r.ip || '',
          timestamp: r.createdAt || r.created_at,
        }));
        setActivities(normalised);
      }
    } catch { /* offline */ }
    setLoading(false);
    setLastRefresh(new Date());
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = () => load();

  const exportCSV = () => {
    const cols = ['timestamp', 'user', 'type', 'detail', 'patient', 'ip'];
    const header = ['Timestamp', 'User', 'Action Type', 'Detail', 'Patient', 'IP Address'];
    const rows = filtered.map(a =>
      cols.map(c => `"${(a[c] || '').toString().replace(/"/g, '""')}"`)
           .join(',')
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href  = url;
    link.download = `clarity-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    return activities.filter(a => {
      if (filter !== 'all' && a.type !== filter) return false;
      if (userFilter !== 'all' && a.userId !== userFilter) return false;

      // ⭐ Local admins can only see their facility's audit logs
      // For now, we filter based on userId's facility association
      // In production, activities would have facility_id field
      if (isLocal && facilityId) {
        // Mock data check - in real app, would check a.facility_id
        // For demo purposes, local admins see their own users' activities
        const allowedUsers = ['u1', 'u4']; // Example facility users
        if (!allowedUsers.includes(a.userId)) return false;
      }

      if (search) {
        const q = search.toLowerCase();
        return a.detail.toLowerCase().includes(q) || a.user.toLowerCase().includes(q) || (a.patient || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [filter, userFilter, search, isLocal, facilityId]);

  const typeCounts = useMemo(() => {
    const counts = {};
    activities.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12 }} />
          <button className="btn btn-secondary btn-sm" onClick={exportCSV} disabled={filtered.length === 0}>
            📤 Export CSV {filtered.length > 0 && `(${filtered.length})`}
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleRefresh} disabled={loading}>
            {loading ? '⏳ Loading…' : lastRefresh ? '🔄 Refresh' : '🔄 Load Live'}
          </button>
          {lastRefresh && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Updated {lastRefresh.toLocaleTimeString()}</span>}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        <div className="stat-card row blue fade-in"><div className="stat-icon blue">📜</div><div className="stat-info"><h3>{activities.length}</h3><p>Total Events</p></div></div>
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

export default function AuditTrail(props) {
  return <DemoGuard reason="admin"><AuditTrail_Inner {...props} /></DemoGuard>;
}
