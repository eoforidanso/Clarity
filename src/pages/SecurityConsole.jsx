import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { checkSystemAdminAccess } from '../utils/accessControl';

const API = import.meta.env?.VITE_API_URL || '/api';

const RULE_META = {
  R01_IP_SCANNING:      { icon: '🔍', label: 'IP Scanning',         color: '#f97316' },
  R02_BULK_ACCESS:      { icon: '📂', label: 'Bulk Patient Access',  color: '#f97316' },
  R03_BRUTE_FORCE:      { icon: '💥', label: 'Brute Force',          color: '#dc2626' },
  R04_REPEATED_TARGET:  { icon: '🎯', label: 'Repeated Targeting',   color: '#f97316' },
  R05_OFF_HOURS:        { icon: '🌙', label: 'Off-Hours Access',      color: '#f59e0b' },
  R06_REAUTH_HAMMER:    { icon: '🔐', label: 'Reauth Hammering',      color: '#f97316' },
  R07_PRIVILEGE_PROBE:  { icon: '⛔', label: 'Privilege Probe',       color: '#f97316' },
  R08_SESSION_REUSE:    { icon: '🌐', label: 'Multi-IP Session',      color: '#f59e0b' },
  R09_NEW_DEVICE:       { icon: '📱', label: 'New Device Login',       color: '#f59e0b' },
  R10_GEO_ANOMALY:      { icon: '🌍', label: 'Geographic Anomaly',     color: '#f97316' },
  R11_SUSPICIOUS_LOGIN: { icon: '🚨', label: 'High-Risk Login (R11)',   color: '#dc2626' },
};
const SEV_COLOR = { CRITICAL: '#dc2626', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#3b82f6' };
const SEV_BG    = { CRITICAL: '#fef2f2', HIGH: '#fff7ed',  MEDIUM: '#fffbeb', LOW: '#eff6ff' };

// ── Severity config ───────────────────────────────────────────────────────────
const SEVERITY = {
  IDOR_BLOCKED:              { level: 'HIGH',     color: '#f97316', bg: '#fff7ed', icon: '🚫' },
  IDOR_BLOCKED_USER:         { level: 'HIGH',     color: '#f97316', bg: '#fff7ed', icon: '🚫' },
  REAUTH_FAILED:             { level: 'HIGH',     color: '#f97316', bg: '#fff7ed', icon: '🔐' },
  REAUTH_SUCCESS:            { level: 'INFO',     color: '#0891b2', bg: '#f0f9ff', icon: '🔓' },
  LOGIN_FAILED:              { level: 'MEDIUM',   color: '#f59e0b', bg: '#fffbeb', icon: '⚠️' },
  LOGIN_SUCCESS:             { level: 'INFO',     color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
  JWT_TAMPER_ATTEMPT:        { level: 'CRITICAL', color: '#dc2626', bg: '#fef2f2', icon: '🚨' },
  PRIVILEGE_ESCALATION:      { level: 'CRITICAL', color: '#dc2626', bg: '#fef2f2', icon: '🚨' },
  USER_DELETED:              { level: 'CRITICAL', color: '#dc2626', bg: '#fef2f2', icon: '🗑️' },
  LOCATION_DELETED:          { level: 'HIGH',     color: '#f97316', bg: '#fff7ed', icon: '🗑️' },
  BTG_UNAUTHORIZED:          { level: 'CRITICAL', color: '#dc2626', bg: '#fef2f2', icon: '🔒' },
  ROLE_CHANGE_BLOCKED:       { level: 'HIGH',     color: '#f97316', bg: '#fff7ed', icon: '⛔' },
  AUDIT_LOG_TAMPER_ATTEMPT:  { level: 'CRITICAL', color: '#dc2626', bg: '#fef2f2', icon: '💀' },
};

const fmtTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
};

const timeSince = (iso) => {
  if (!iso) return '';
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60)   return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs/60)}m ago`;
  if (secs < 86400)return `${Math.floor(secs/3600)}h ago`;
  return `${Math.floor(secs/86400)}d ago`;
};

// ── Main component ────────────────────────────────────────────────────────────
export default function SecurityConsole() {
  const { currentUser } = useAuth();
  const isSystemAdmin = checkSystemAdminAccess(currentUser);

  // ⭐ Only system admins can access Security Console
  if (!isSystemAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ marginBottom: 8 }}>Access Restricted</h2>
        <p>Security Console is only available to System Administrators.</p>
      </div>
    );
  }

  const [events,    setEvents]    = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [sessions,  setSessions]  = useState([]);
  const [devices,   setDevices]   = useState([]); // flat list across all users
  const [allUsers,  setAllUsers]  = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [filter,    setFilter]    = useState('ALL');
  const [activeTab, setActiveTab] = useState('users');
  const [loading,   setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [deviceAction, setDeviceAction] = useState(null); // { id, action } for optimistic UI

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [evRes, sumRes, anomRes, sessRes, usersRes] = await Promise.all([
        fetch(`${API}/security/events?limit=200`,  { credentials: 'include' }),
        fetch(`${API}/security/summary`,            { credentials: 'include' }),
        fetch(`${API}/security/anomalies?limit=50`, { credentials: 'include' }),
        fetch(`${API}/security/sessions`,           { credentials: 'include' }),
        fetch(`${API}/users`,                       { credentials: 'include' }),
      ]);
      if (evRes.ok)    setEvents(await evRes.json());
      if (sumRes.ok)   setSummary(await sumRes.json());
      if (anomRes.ok)  setAnomalies(await anomRes.json());
      if (usersRes.ok) setAllUsers(await usersRes.json());
      if (sessRes.ok) {
        const sess = await sessRes.json();
        setSessions(sess);
        // Load devices for each unique user in sessions
        const userIds = [...new Set(sess.map(s => s.userId).filter(Boolean))];
        const deviceResults = await Promise.all(
          userIds.map(uid =>
            fetch(`${API}/security/devices/${uid}`, { credentials: 'include' })
              .then(r => r.ok ? r.json() : [])
              .then(devs => devs.map(d => ({ ...d, userId: uid, userName: sess.find(s => s.userId === uid)?.name || uid })))
          )
        );
        setDevices(deviceResults.flat());
      }
      setLastRefresh(new Date());
    } catch { /* offline */ }
    setLoading(false);
  }, []);

  const resolveAnomaly = async (id) => {
    await fetch(`${API}/security/anomalies/${id}/resolve`, { method: 'PATCH', credentials: 'include' });
    setAnomalies(a => a.filter(x => x.id !== id));
  };

  const revokeSession = async (id) => {
    await fetch(`${API}/security/sessions/${id}`, { method: 'DELETE', credentials: 'include' });
    setSessions(s => s.filter(x => x.id !== id));
  };

  const revokeAllSessions = async () => {
    if (!window.confirm('Revoke ALL active sessions? Everyone will be logged out immediately.')) return;
    await fetch(`${API}/security/sessions`, { method: 'DELETE', credentials: 'include' });
    setSessions([]);
  };

  const deviceTrustAction = async (deviceId, action) => {
    // action: 'revoke' | 'trust' | 'flag'
    setDeviceAction({ id: deviceId, action });
    try {
      const res = await fetch(`${API}/security/devices/${deviceId}/${action}`, {
        method: 'POST', credentials: 'include',
      });
      if (res.ok) {
        const trustMap = { revoke: 'revoked', trust: 'trusted', flag: 'suspicious' };
        setDevices(ds => ds.map(d => d.id === deviceId ? { ...d, trust_state: trustMap[action] } : d));
        if (action === 'revoke') {
          // Also remove sessions tied to this device
          setSessions(s => s.filter(sess => sess.deviceId !== deviceId));
        }
      }
    } finally {
      setDeviceAction(null);
    }
  };

  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);

  if (currentUser?.role !== 'admin') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Admin access required</div>
        </div>
      </div>
    );
  }

  const filtered = filter === 'ALL' ? events : events.filter(e => e.action === filter);
  const criticalCount   = events.filter(e => SEVERITY[e.action]?.level === 'CRITICAL').length;
  const highCount       = events.filter(e => SEVERITY[e.action]?.level === 'HIGH').length;
  const openAnomalies   = anomalies.filter(a => a.status === 'open').length;
  const critAnomalies   = anomalies.filter(a => a.severity === 'CRITICAL').length;

  return (
    <div className="fade-in" style={{ padding: '0 0 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            🛡️ Security Console
            {criticalCount > 0 && (
              <span style={{ fontSize: 12, fontWeight: 800, padding: '2px 9px', borderRadius: 20, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                {criticalCount} critical
              </span>
            )}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Live audit of security events · refreshes every 30s
            {lastRefresh && <span style={{ marginLeft: 8, opacity: 0.6 }}>· {timeSince(lastRefresh.toISOString())}</span>}
          </p>
        </div>
        <button onClick={load} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-white)', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--text-secondary)' }}>
          ↻ Refresh
        </button>
      </div>

      {/* KPI strip */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'IDOR Blocked', value: summary.summary.IDOR_BLOCKED?.last24h || 0,    color: '#f97316', bg: '#fff7ed', icon: '🚫' },
            { label: 'Login Failed', value: summary.summary.LOGIN_FAILED?.last24h || 0,    color: '#f59e0b', bg: '#fffbeb', icon: '⚠️' },
            { label: 'Reauth Failed',value: summary.summary.REAUTH_FAILED?.last24h || 0,   color: '#f97316', bg: '#fff7ed', icon: '🔐' },
            { label: 'Critical',     value: criticalCount,  color: '#dc2626', bg: '#fef2f2', icon: '🚨' },
            { label: 'Anomalies',    value: openAnomalies,  color: openAnomalies > 0 ? '#7c3aed' : '#64748b', bg: openAnomalies > 0 ? '#f5f3ff' : '#f8fafc', icon: '🧠' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: s.color, marginTop: 3, opacity: 0.8 }}>{s.label} · 24h</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#f8fafc', borderRadius: 10, padding: 4, border: '1px solid var(--border)', width: 'fit-content' }}>
        {[
          { key: 'users',     label: 'All Users',        count: allUsers.length },
          { key: 'events',    label: 'Security Events',  count: events.length },
          { key: 'timeline',  label: 'Timeline',         count: events.length },
          { key: 'anomalies', label: 'Anomalies',        count: openAnomalies,   alert: critAnomalies > 0 },
          { key: 'sessions',  label: 'Active Sessions',  count: sessions.length, alert: sessions.some(s => s.isElevated) },
          { key: 'devices',   label: 'Devices',          count: devices.length,  alert: devices.some(d => d.trust_state === 'suspicious' || d.trust_state === 'new') },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '6px 16px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            border: 'none', transition: 'all 0.15s',
            background: activeTab === t.key ? '#fff' : 'transparent',
            color: activeTab === t.key ? '#0f172a' : '#64748b',
            boxShadow: activeTab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {t.label}
            {t.count > 0 && (
              <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 10, background: t.alert ? '#fef2f2' : '#f1f5f9', color: t.alert ? '#dc2626' : '#64748b' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Two-column layout — users/timeline tabs go full width */}
      <div style={{ display: 'grid', gridTemplateColumns: (activeTab === 'users' || activeTab === 'timeline') ? '1fr' : '1fr 300px', gap: 20, alignItems: 'start' }}>

        {/* ── Users panel ─────────────────────────────────────────────── */}
        {activeTab === 'users' && (() => {
          const ROLE_COLORS = {
            admin: '#7c3aed', prescriber: '#0891b2', nurse: '#16a34a',
            therapist: '#ea580c', front_desk: '#d97706', biller: '#6366f1',
          };
          const ROLE_LABELS = {
            admin: 'Admin', prescriber: 'Prescriber', nurse: 'Nurse',
            therapist: 'Therapist', front_desk: 'Front Desk', biller: 'Biller',
          };

          // Index sessions by userId for O(1) lookup
          const sessionByUserId = sessions.reduce((acc, s) => {
            if (s.userId) acc[s.userId] = s;
            return acc;
          }, {});

          // Count login failures per user name (from security events)
          const failuresByName = events.reduce((acc, ev) => {
            if (ev.action === 'LOGIN_FAILED' && ev.actorName) {
              acc[ev.actorName] = (acc[ev.actorName] || 0) + 1;
            }
            return acc;
          }, {});

          // Most recent successful session per userId (lastSeenAt)
          const lastSeenByUserId = sessions.reduce((acc, s) => {
            if (s.userId && s.lastSeenAt) {
              if (!acc[s.userId] || s.lastSeenAt > acc[s.userId]) acc[s.userId] = s.lastSeenAt;
            }
            return acc;
          }, {});

          const q = userSearch.toLowerCase();
          const filteredUsers = allUsers.filter(u => {
            if (!q) return true;
            return [u.firstName, u.lastName, u.username, u.email, u.role]
              .filter(Boolean).some(v => v.toLowerCase().includes(q));
          });

          const onlineCount = allUsers.filter(u => sessionByUserId[u.id]).length;
          const neverLoggedIn = allUsers.filter(u => !sessionByUserId[u.id] && !lastSeenByUserId[u.id]).length;

          return (
            <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', gridColumn: '1 / -1' }}>
              {/* Header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', flex: 1 }}>
                  👥 All Users — Login Activity
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {allUsers.length} users · {onlineCount} online now · {neverLoggedIn} never logged in
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9ca3af', pointerEvents: 'none' }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search users…"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    style={{ padding: '6px 10px 6px 28px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, outline: 'none', width: 200 }}
                  />
                </div>
              </div>

              {/* Stats strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 0, borderBottom: '1px solid var(--border)' }}>
                {[
                  { label: 'Total Users',    val: allUsers.length,  color: '#6366f1', bg: '#eef2ff' },
                  { label: 'Online Now',     val: onlineCount,       color: '#16a34a', bg: '#f0fdf4' },
                  { label: 'Never Logged In',val: neverLoggedIn,     color: '#f59e0b', bg: '#fffbeb' },
                  { label: 'Login Failures', val: events.filter(e => e.action === 'LOGIN_FAILED').length, color: '#f97316', bg: '#fff7ed' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '10px 16px', background: s.bg, borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
                      <div style={{ fontSize: 10, color: s.color, fontWeight: 600, marginTop: 2, opacity: 0.8 }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* User table */}
              {filteredUsers.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  {allUsers.length === 0 ? (
                    <>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>No user data</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>Unable to load users from the server</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>No users match "{userSearch}"</div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1fr 1fr 120px', padding: '7px 16px', background: '#f8fafc', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <span>User</span>
                    <span>Role</span>
                    <span>Last Login</span>
                    <span>Status</span>
                    <span>Login Failures</span>
                    <span style={{ textAlign: 'right' }}>Actions</span>
                  </div>

                  <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                    {filteredUsers.map((u, i) => {
                      const roleColor = ROLE_COLORS[u.role] || '#6366f1';
                      const initials  = `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase() || '?';
                      const hue       = initials.charCodeAt(0) * 7 % 360;
                      const session   = sessionByUserId[u.id];
                      const isOnline  = !!session;
                      const lastSeen  = lastSeenByUserId[u.id] || session?.lastSeenAt || u.lastLoginAt || null;
                      const fullName  = `${u.firstName || ''} ${u.lastName || ''}`.trim();
                      const failures  = failuresByName[fullName] || failuresByName[u.username] || 0;
                      const isLocked  = u.isLocked || u.locked || false;

                      return (
                        <div key={u.id} style={{
                          display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1fr 1fr 120px',
                          padding: '11px 16px', alignItems: 'center',
                          borderBottom: i < filteredUsers.length - 1 ? '1px solid var(--border-light)' : 'none',
                          background: isLocked ? '#fff8f8' : isOnline ? '#f0fdf4' : 'transparent',
                          transition: 'background 0.1s',
                        }}>
                          {/* User */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#fff', background: `hsl(${hue},55%,42%)`, position: 'relative' }}>
                              {initials}
                              {/* Online dot */}
                              <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: isOnline ? '#22c55e' : '#d1d5db', border: '2px solid #fff' }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {fullName || u.username}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                @{u.username}{u.email ? ` · ${u.email}` : ''}
                              </div>
                            </div>
                          </div>

                          {/* Role */}
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: roleColor + '18', color: roleColor }}>
                              {ROLE_LABELS[u.role] || u.role}
                            </span>
                          </div>

                          {/* Last login */}
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {isOnline
                              ? <span style={{ color: '#16a34a', fontWeight: 700 }}>🟢 Online now</span>
                              : lastSeen
                                ? <span title={new Date(lastSeen).toLocaleString()}>{timeSince(lastSeen)}</span>
                                : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Never logged in</span>
                            }
                            {isOnline && session?.ip && (
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 1 }}>{session.ip}</div>
                            )}
                          </div>

                          {/* Status */}
                          <div>
                            {isLocked
                              ? <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#fef2f2', color: '#dc2626' }}>🔒 Locked</span>
                              : isOnline
                                ? <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#f0fdf4', color: '#16a34a' }}>Active</span>
                                : <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: '#f8fafc', color: '#64748b' }}>Inactive</span>
                            }
                            {session?.isElevated && (
                              <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#fef3c7', color: '#b45309' }}>⚡ Elevated</span>
                            )}
                          </div>

                          {/* Login failures */}
                          <div>
                            {failures > 0
                              ? <span style={{ fontSize: 12, fontWeight: 700, color: failures >= 3 ? '#dc2626' : '#f59e0b' }}>
                                  {failures >= 3 ? '⚠️ ' : ''}{failures} failure{failures !== 1 ? 's' : ''}
                                </span>
                              : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                            }
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            {isOnline && session && (
                              <button
                                onClick={() => revokeSession(session.id)}
                                title="Revoke session"
                                style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* Anomalies feed */}
        {activeTab === 'anomalies' && (
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                🧠 Detected Anomalies
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>Rules run every 5 min · {openAnomalies} open</span>
              </div>
            </div>
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {anomalies.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>No anomalies detected</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>8 rules checking every 5 minutes</div>
                </div>
              ) : anomalies.map((a, i) => {
                const meta = RULE_META[a.ruleId] || { icon: '⚠️', label: a.ruleId, color: '#64748b' };
                const sc = SEV_COLOR[a.severity] || '#64748b';
                const sb = SEV_BG[a.severity]    || '#f8fafc';
                return (
                  <div key={a.id} style={{
                    padding: '14px 16px', borderBottom: i < anomalies.length - 1 ? '1px solid var(--border-light)' : 'none',
                    background: sb,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: sc + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{meta.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: sc }}>{a.title}</span>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: sc + '18', color: sc }}>{a.severity}</span>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>{timeSince(a.detectedAt)}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>{a.description}</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          {a.ip && <span style={{ fontSize: 10, fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, color: '#475569' }}>{a.ip}</span>}
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.eventCount} events · {a.windowMin}m window</span>
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>{a.ruleId}</span>
                          <button onClick={() => resolveAnomaly(a.id)} style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}>
                            ✓ Resolve
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sessions panel */}
        {activeTab === 'sessions' && (
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>
                🔐 Active Sessions
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>{sessions.length} online</span>
              </div>
              <button onClick={revokeAllSessions} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                ⛔ Revoke All
              </button>
            </div>
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {sessions.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No active sessions</div>
              ) : sessions.map((s, i) => {
                const ua = s.userAgent || '';
                const browser = ua.includes('Chrome') ? '🌐 Chrome' : ua.includes('Firefox') ? '🦊 Firefox' : ua.includes('Safari') ? '🧭 Safari' : '💻 Browser';
                const os = ua.includes('Mac') ? 'macOS' : ua.includes('Windows') ? 'Windows' : ua.includes('iPhone') ? 'iPhone' : ua.includes('Android') ? 'Android' : 'Unknown';
                return (
                  <div key={s.id} style={{
                    padding: '12px 16px',
                    borderBottom: i < sessions.length - 1 ? '1px solid var(--border-light)' : 'none',
                    background: s.isElevated ? '#fffbeb' : s.isCurrent ? '#f0f9ff' : 'transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      {/* Avatar */}
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, #6366f1, #0891b2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                        {(s.name || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</span>
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#f1f5f9', color: '#475569', fontWeight: 700 }}>{s.role}</span>
                          {s.isCurrent && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: '#dbeafe', color: '#1d4ed8', fontWeight: 800 }}>YOU</span>}
                          {s.isElevated && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: '#fef3c7', color: '#b45309', fontWeight: 800 }}>⚡ ELEVATED</span>}
                          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>{timeSince(s.lastSeenAt)}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'monospace' }}>{s.ip || 'no IP'}</span>
                          <span>{s.devicePlatform || `${browser} · ${os}`}</span>
                          {s.city && s.country && <span>🌍 {s.city}, {s.country}</span>}
                          {(!s.city) && s.locationName && <span>📍 {s.locationName}</span>}
                          {s.isTrustedDevice && <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Trusted</span>}
                        </div>
                        {s.isElevated && s.elevatedExpiresAt && (
                          <div style={{ fontSize: 10, color: '#b45309', marginTop: 3 }}>
                            ⚡ Elevated until {new Date(s.elevatedExpiresAt).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                      {!s.isCurrent && (
                        <button onClick={() => revokeSession(s.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#ef4444', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Devices panel */}
        {activeTab === 'devices' && (() => {
          const TRUST_META = {
            trusted:    { label: 'Trusted',    color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
            new:        { label: 'New',         color: '#f59e0b', bg: '#fffbeb', icon: '🆕' },
            suspicious: { label: 'Suspicious',  color: '#dc2626', bg: '#fef2f2', icon: '⚠️' },
            revoked:    { label: 'Revoked',     color: '#94a3b8', bg: '#f8fafc', icon: '🚫' },
          };
          // Group by userName
          const grouped = devices.reduce((acc, d) => {
            const key = d.userName || d.userId;
            if (!acc[key]) acc[key] = [];
            acc[key].push(d);
            return acc;
          }, {});

          return (
            <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>
                  💻 Known Devices
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {devices.length} devices · {devices.filter(d => d.trust_state === 'new').length} new · {devices.filter(d => d.trust_state === 'suspicious').length} suspicious
                  </span>
                </div>
                <button onClick={load} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', color: '#475569', fontSize: 11, cursor: 'pointer' }}>
                  ↻ Refresh
                </button>
              </div>

              {devices.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💻</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>No devices recorded yet</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Devices are tracked on each login</div>
                </div>
              ) : (
                <div style={{ maxHeight: 560, overflowY: 'auto' }}>
                  {Object.entries(grouped).map(([userName, userDevices]) => (
                    <div key={userName}>
                      {/* User header */}
                      <div style={{ padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800 }}>
                          {userName[0].toUpperCase()}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>{userName}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{userDevices.length} device{userDevices.length !== 1 ? 's' : ''}</span>
                      </div>

                      {/* Devices for this user */}
                      {userDevices.map((d, i) => {
                        const trust = TRUST_META[d.trust_state] || TRUST_META.new;
                        const isActing = deviceAction?.id === d.id;
                        const platformIcon = d.platform?.includes('iPhone') || d.platform?.includes('Android') ? '📱' :
                                             d.platform?.includes('Windows') ? '🖥️' : '💻';
                        return (
                          <div key={d.id} style={{
                            padding: '11px 16px 11px 48px',
                            borderBottom: i < userDevices.length - 1 ? '1px solid var(--border-light)' : 'none',
                            background: d.trust_state === 'suspicious' ? '#fff8f8' : d.trust_state === 'new' ? '#fffdf0' : 'transparent',
                            display: 'flex', alignItems: 'center', gap: 10,
                          }}>
                            <div style={{ fontSize: 18, flexShrink: 0 }}>{platformIcon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {d.browser || '?'} · {d.platform || 'Unknown'}
                                </span>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: trust.bg, color: trust.color, border: `1px solid ${trust.color}30` }}>
                                  {trust.icon} {trust.label}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {d.ip && <span style={{ fontFamily: 'monospace' }}>{d.ip}</span>}
                                {d.country && <span>🌍 {d.country}</span>}
                                {d.first_seen && <span>First: {timeSince(d.first_seen)}</span>}
                                {d.last_seen  && <span>Last: {timeSince(d.last_seen)}</span>}
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                              {d.trust_state !== 'trusted' && d.trust_state !== 'revoked' && (
                                <button
                                  onClick={() => deviceTrustAction(d.id, 'trust')}
                                  disabled={isActing}
                                  style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                                >
                                  {isActing && deviceAction.action === 'trust' ? '…' : 'Trust'}
                                </button>
                              )}
                              {d.trust_state !== 'suspicious' && d.trust_state !== 'revoked' && (
                                <button
                                  onClick={() => deviceTrustAction(d.id, 'flag')}
                                  disabled={isActing}
                                  style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid #fde68a', background: '#fffbeb', color: '#d97706', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                                >
                                  {isActing && deviceAction.action === 'flag' ? '…' : 'Flag'}
                                </button>
                              )}
                              {d.trust_state !== 'revoked' && (
                                <button
                                  onClick={() => { if (window.confirm(`Revoke this device? All sessions from ${d.browser} · ${d.platform} will be terminated.`)) deviceTrustAction(d.id, 'revoke'); }}
                                  disabled={isActing}
                                  style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                                >
                                  {isActing && deviceAction.action === 'revoke' ? '…' : 'Revoke'}
                                </button>
                              )}
                              {d.trust_state === 'revoked' && (
                                <span style={{ fontSize: 10, color: '#94a3b8', padding: '3px 9px' }}>Revoked</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Timeline view ───────────────────────────────────────────── */}
        {activeTab === 'timeline' && (() => {
          const todayStart     = new Date(); todayStart.setHours(0,0,0,0);
          const yesterdayStart = new Date(todayStart.getTime() - 86400000);

          const dayLabel = (iso) => {
            const d  = new Date(iso);
            const ds = new Date(d); ds.setHours(0,0,0,0);
            const dateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
            if (ds.getTime() === todayStart.getTime())     return `Today · ${dateStr}`;
            if (ds.getTime() === yesterdayStart.getTime()) return `Yesterday · ${dateStr}`;
            return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
          };

          // Group events by calendar day (newest-first order preserved)
          const groups = [];
          const seen   = {};
          for (const ev of events) {
            const label = dayLabel(ev.createdAt);
            if (!seen[label]) { seen[label] = true; groups.push({ label, events: [] }); }
            groups[groups.findIndex(g => g.label === label)].events.push(ev);
          }

          const SEV_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };

          return (
            <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', gridColumn: '1 / -1' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                  📅 Security Event Timeline
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {events.length} events · newest first
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['CRITICAL','#dc2626'],['HIGH','#f97316'],['MEDIUM','#f59e0b'],['INFO','#64748b']].map(([lvl, col]) => (
                    <span key={lvl} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: col + '15', color: col, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: col, display: 'inline-block' }} />
                      {lvl}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ maxHeight: 640, overflowY: 'auto', padding: '20px 24px 28px' }}>
                {events.length === 0 ? (
                  <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>No security events yet</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Events appear here as they are detected</div>
                  </div>
                ) : groups.map((group, gi) => (
                  <div key={group.label} style={{ marginBottom: 32 }}>
                    {/* Day divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                      <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', whiteSpace: 'nowrap', letterSpacing: '0.3px' }}>
                        {group.label}
                      </span>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>{group.events.length} event{group.events.length !== 1 ? 's' : ''}</span>
                      <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                    </div>

                    {/* Events on a timeline rail */}
                    <div style={{ position: 'relative', paddingLeft: 36 }}>
                      {/* Vertical rail */}
                      <div style={{ position: 'absolute', left: 12, top: 8, bottom: 8, width: 2, background: 'linear-gradient(to bottom, #e2e8f0, #f1f5f9)', borderRadius: 2 }} />

                      {group.events.map((ev, ei) => {
                        const sev  = SEVERITY[ev.action] || { level: 'INFO', color: '#64748b', bg: '#f8fafc', icon: '•' };
                        const time = new Date(ev.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
                        return (
                          <div key={ev.id} style={{ display: 'flex', gap: 14, marginBottom: ei < group.events.length - 1 ? 10 : 0, position: 'relative' }}>
                            {/* Dot on rail */}
                            <div style={{
                              position: 'absolute', left: -28, top: 10,
                              width: 14, height: 14, borderRadius: '50%',
                              background: sev.color, border: '2px solid white',
                              boxShadow: `0 0 0 2px ${sev.color}35`,
                              flexShrink: 0, zIndex: 1,
                            }} />

                            {/* Timestamp */}
                            <div style={{ width: 80, flexShrink: 0, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', paddingTop: 9, lineHeight: 1.3, textAlign: 'right' }}>
                              {time}
                            </div>

                            {/* Event card */}
                            <div style={{
                              flex: 1, background: sev.bg, border: `1px solid ${sev.color}25`,
                              borderRadius: 8, padding: '8px 12px',
                              borderLeft: `3px solid ${sev.color}`,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                                <span style={{ fontSize: 13 }}>{sev.icon}</span>
                                <span style={{ fontSize: 12, fontWeight: 800, color: sev.color }}>
                                  {ev.action.replace(/_/g, ' ')}
                                </span>
                                <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: sev.color + '15', color: sev.color, border: `1px solid ${sev.color}30` }}>
                                  {sev.level}
                                </span>
                                <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>{timeSince(ev.createdAt)}</span>
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                <span style={{ fontWeight: 600 }}>{ev.actorName || ev.actorId || 'System'}</span>
                                {ev.targetType && <span style={{ opacity: 0.65 }}> → {ev.targetType}{ev.targetId ? ` ${ev.targetId.slice(0,8)}` : ''}</span>}
                                {ev.ip && <span style={{ marginLeft: 8, fontFamily: 'monospace', fontSize: 10, opacity: 0.6 }}>{ev.ip}</span>}
                              </div>
                              {ev.details?.path && (
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'monospace', opacity: 0.7 }}>{ev.details.path}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Events feed */}
        {activeTab === 'events' && <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Filter bar */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['ALL', 'IDOR_BLOCKED', 'REAUTH_FAILED', 'LOGIN_FAILED', 'USER_DELETED', 'JWT_TAMPER_ATTEMPT'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                border: filter === f ? 'none' : '1px solid var(--border)',
                background: filter === f ? (SEVERITY[f]?.color || '#0f172a') : 'var(--bg-white)',
                color: filter === f ? '#fff' : 'var(--text-secondary)',
              }}>
                {f === 'ALL' ? 'All Events' : f.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Event list */}
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {loading && events.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>No {filter !== 'ALL' ? filter.replace(/_/g,' ') : 'security'} events</div>
              </div>
            ) : filtered.map((ev, i) => {
              const sev = SEVERITY[ev.action] || { level: 'INFO', color: '#64748b', bg: '#f8fafc', icon: '•' };
              return (
                <div key={ev.id} style={{
                  display: 'flex', gap: 12, padding: '12px 16px',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)',
                }}>
                  {/* Severity dot */}
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: sev.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                    {sev.icon}
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: sev.color }}>{ev.action.replace(/_/g, ' ')}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: sev.bg, color: sev.color, border: `1px solid ${sev.color}30` }}>{sev.level}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeSince(ev.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600 }}>{ev.actorName || ev.actorId}</span>
                      {ev.targetId && <span style={{ opacity: 0.6 }}> → {ev.targetType} {ev.targetId.slice(0, 8)}</span>}
                      {ev.ip && <span style={{ marginLeft: 8, fontFamily: 'monospace', fontSize: 11, opacity: 0.6 }}>{ev.ip}</span>}
                    </div>
                    {ev.details?.path && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'monospace' }}>{ev.details.path}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>}

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Top IPs */}
          {summary?.topIps?.length > 0 && (
            <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: 13, color: 'var(--text-primary)' }}>
                🌐 Top IPs (24h)
              </div>
              {summary.topIps.map((ip, i) => (
                <div key={i} style={{ padding: '8px 16px', borderBottom: i < summary.topIps.length - 1 ? '1px solid var(--border-light)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{ip.ip}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 10, background: ip.cnt >= 5 ? '#fef2f2' : '#fff7ed', color: ip.cnt >= 5 ? '#dc2626' : '#f97316' }}>{ip.cnt}</span>
                </div>
              ))}
            </div>
          )}

          {/* Alert thresholds */}
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: 13 }}>
              🔔 Alert Thresholds
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'IDOR Blocked', threshold: '≥ 3 / 15 min', level: 'MEDIUM', color: '#f59e0b' },
                { label: 'IDOR Blocked', threshold: '≥ 10 / 15 min', level: 'HIGH',   color: '#f97316' },
                { label: 'Login Failed', threshold: '≥ 5 / 15 min',  level: 'HIGH',   color: '#f97316' },
                { label: 'Reauth Failed',threshold: '≥ 3 / 15 min',  level: 'HIGH',   color: '#f97316' },
                { label: 'JWT Tamper',   threshold: 'any',            level: 'CRITICAL',color: '#dc2626' },
                { label: 'User Deleted', threshold: 'any',            level: 'CRITICAL',color: '#dc2626' },
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 11, color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: 700 }}>{t.label}</span> {t.threshold}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 3, background: t.color + '18', color: t.color }}>{t.level}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Incident playbook */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', fontWeight: 800, fontSize: 13, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
              📋 Incident Playbook
            </div>
            <div style={{ padding: '14px 16px' }}>
              {[
                { step: '1', title: 'Rotate JWT secret', cmd: 'bash rotate-jwt-secret.sh', color: '#f87171' },
                { step: '2', title: 'Revoke all sessions', cmd: "UPDATE sessions SET is_active=0", color: '#fb923c' },
                { step: '3', title: 'Pull audit logs', cmd: "bash incident-response.sh breach", color: '#fbbf24' },
                { step: '4', title: 'Block attacker IPs', cmd: 'Cloudflare → Security → WAF', color: '#34d399' },
                { step: '5', title: 'Notify (HIPAA)', cmd: '60 days · patients + HHS', color: '#60a5fa' },
              ].map(s => (
                <div key={s.step} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: s.color, color: '#000', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.step}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{s.title}</span>
                  </div>
                  <div style={{ marginLeft: 26, fontFamily: 'monospace', fontSize: 10, color: '#94a3b8', background: '#1e293b', padding: '3px 8px', borderRadius: 4 }}>
                    {s.cmd}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
