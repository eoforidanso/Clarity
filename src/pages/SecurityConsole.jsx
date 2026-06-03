import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

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
  const [events,    setEvents]    = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [filter,    setFilter]    = useState('ALL');
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'anomalies'
  const [loading,   setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [evRes, sumRes, anomRes] = await Promise.all([
        fetch(`${API}/security/events?limit=100`, { credentials: 'include' }),
        fetch(`${API}/security/summary`,           { credentials: 'include' }),
        fetch(`${API}/security/anomalies?limit=50`,{ credentials: 'include' }),
      ]);
      if (evRes.ok)   setEvents(await evRes.json());
      if (sumRes.ok)  setSummary(await sumRes.json());
      if (anomRes.ok) setAnomalies(await anomRes.json());
      setLastRefresh(new Date());
    } catch { /* offline */ }
    setLoading(false);
  }, []);

  const resolveAnomaly = async (id) => {
    await fetch(`${API}/security/anomalies/${id}/resolve`, { method: 'PATCH', credentials: 'include' });
    setAnomalies(a => a.filter(x => x.id !== id));
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
          { key: 'events',    label: 'Security Events', count: events.length },
          { key: 'anomalies', label: 'Anomalies',        count: openAnomalies, alert: critAnomalies > 0 },
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

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

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
