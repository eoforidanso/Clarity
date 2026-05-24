import React, { useState, useMemo, useEffect, useRef } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const TX_TYPES = ['837P', '835', '270/271', '999/277CA', '276/277', '820'];
const PARTNERS = ['Availity', 'Change Healthcare', 'Waystar', 'Optum / UHC Direct'];
const SEVERITIES = ['Critical', 'Warning', 'Info'];
const CHANNELS = ['in-app', 'email', 'webhook', 'pagerduty'];

// ─── Seed Pipeline Health ─────────────────────────────────────────────────────
const SEED_PIPELINE = [
  { tx: '837P',      partner: 'Availity',               sent: 142, acked: 139, rejected: 3,  pending: 0, failRate: 2.1, avgTurnaround: '1.2h', sla: '4h',  slaBreaches: 0, uptime: 99.4 },
  { tx: '835',       partner: 'Availity',               recv: 88,  posted: 85, exceptions: 3, pending: 1, failRate: 3.4, avgTurnaround: '6.1h', sla: '12h', slaBreaches: 0, uptime: 99.1 },
  { tx: '270/271',   partner: 'Change Healthcare',      sent: 210, responded: 205, failed: 5, pending: 0, failRate: 2.4, avgTurnaround: '4.2s', sla: '10s', slaBreaches: 2, uptime: 98.8 },
  { tx: '999/277CA', partner: 'Waystar',                sent: 38,  accepted: 34, rejected: 4, pending: 0, failRate: 10.5, avgTurnaround: '45m', sla: '2h',  slaBreaches: 1, uptime: 97.2 },
  { tx: '276/277',   partner: 'Optum / UHC Direct',    sent: 62,  responded: 62, failed: 0, pending: 0, failRate: 0,   avgTurnaround: '2.1h', sla: '6h',  slaBreaches: 0, uptime: 99.9 },
  { tx: '820',       partner: 'Change Healthcare',      sent: 12,  acked: 12,  rejected: 0, pending: 0, failRate: 0,   avgTurnaround: '30m',  sla: '2h',  slaBreaches: 0, uptime: 100  },
];

// ─── Seed Alerts ──────────────────────────────────────────────────────────────
const SEED_ALERTS = [
  { id: 'ALT-001', severity: 'Critical', type: '999 Rejection Spike', msg: '999/277CA rejection rate hit 10.5% (threshold: 5%) on Waystar', partner: 'Waystar', tx: '999/277CA', ts: '2026-05-23T07:42:00', status: 'Active', acked: false, rule: 'RULE-003' },
  { id: 'ALT-002', severity: 'Warning',  type: 'SLA Near Breach',      msg: '270/271 response on Change Healthcare: 2 transactions approaching 10s SLA', partner: 'Change Healthcare', tx: '270/271', ts: '2026-05-23T07:55:00', status: 'Active', acked: false, rule: 'RULE-007' },
  { id: 'ALT-003', severity: 'Warning',  type: 'High Exception Rate',  msg: '835 auto-post exceptions at 3.4% — 3 manual reviews required', partner: 'Availity', tx: '835', ts: '2026-05-23T08:10:00', status: 'Active', acked: false, rule: 'RULE-005' },
  { id: 'ALT-004', severity: 'Info',     type: 'Listener Poll',        msg: '835 listener completed scheduled poll — no new ERAs received', partner: 'Availity', tx: '835', ts: '2026-05-23T08:00:00', status: 'Resolved', acked: true, rule: 'SYSTEM' },
  { id: 'ALT-005', severity: 'Info',     type: 'Partner Reconnected',  msg: 'Optum / UHC Direct connectivity restored after brief interruption', partner: 'Optum / UHC Direct', tx: '276/277', ts: '2026-05-22T23:14:00', status: 'Resolved', acked: true, rule: 'SYSTEM' },
  { id: 'ALT-006', severity: 'Critical', type: 'No 835 in 24h',        msg: 'No 835 ERA received from Change Healthcare in the past 24 hours', partner: 'Change Healthcare', tx: '835', ts: '2026-05-22T22:00:00', status: 'Resolved', acked: true, rule: 'RULE-006' },
];

// ─── Seed Alert Rules ─────────────────────────────────────────────────────────
const SEED_RULES = [
  { id: 'RULE-001', name: '837 Rejection Rate > 5%', metric: 'failRate', operator: '>', threshold: 5, tx: '837P', partner: 'All', severity: 'Critical', enabled: true, channels: ['in-app', 'email'] },
  { id: 'RULE-002', name: '835 Not Received in 24h', metric: 'gapHours', operator: '>', threshold: 24, tx: '835', partner: 'All', severity: 'Critical', enabled: true, channels: ['in-app', 'email', 'pagerduty'] },
  { id: 'RULE-003', name: '999 Rejection Spike > 5%', metric: 'failRate', operator: '>', threshold: 5, tx: '999/277CA', partner: 'All', severity: 'Critical', enabled: true, channels: ['in-app', 'email'] },
  { id: 'RULE-004', name: 'Partner Uptime < 98%', metric: 'uptime', operator: '<', threshold: 98, tx: 'All', partner: 'All', severity: 'Warning', enabled: true, channels: ['in-app'] },
  { id: 'RULE-005', name: '835 Exception Rate > 3%', metric: 'failRate', operator: '>', threshold: 3, tx: '835', partner: 'All', severity: 'Warning', enabled: true, channels: ['in-app', 'email'] },
  { id: 'RULE-006', name: 'No 835 in 24h (Change HC)', metric: 'gapHours', operator: '>', threshold: 24, tx: '835', partner: 'Change Healthcare', severity: 'Critical', enabled: true, channels: ['in-app', 'email', 'pagerduty'] },
  { id: 'RULE-007', name: '270 SLA Breach Risk', metric: 'avgTurnaround', operator: '>', threshold: 8, tx: '270/271', partner: 'All', severity: 'Warning', enabled: true, channels: ['in-app'] },
  { id: 'RULE-008', name: 'Daily EDI Summary (Info)', metric: 'schedule', operator: '=', threshold: 24, tx: 'All', partner: 'All', severity: 'Info', enabled: true, channels: ['in-app', 'email'] },
];

// ─── Partner Uptime ───────────────────────────────────────────────────────────
const SEED_UPTIME = [
  { partner: 'Availity',             uptime7d: 99.4, uptime30d: 99.6, lastDown: '2026-05-19 03:12', lastDownDur: '22 min', status: 'Operational' },
  { partner: 'Change Healthcare',    uptime7d: 98.8, uptime30d: 99.1, lastDown: '2026-05-22 22:00', lastDownDur: '14 min', status: 'Operational' },
  { partner: 'Waystar',              uptime7d: 97.2, uptime30d: 98.5, lastDown: '2026-05-21 10:45', lastDownDur: '1h 12 min', status: 'Degraded' },
  { partner: 'Optum / UHC Direct',   uptime7d: 99.9, uptime30d: 99.9, lastDown: '2026-05-22 23:08', lastDownDur: '6 min', status: 'Operational' },
];

const SEV_C = { Critical: { bg: '#fee2e2', col: '#991b1b', dot: '#ef4444' }, Warning: { bg: '#fef3c7', col: '#92400e', dot: '#f59e0b' }, Info: { bg: '#dbeafe', col: '#1e40af', dot: '#3b82f6' } };
const UPT_C = { Operational: { bg: '#d1fae5', col: '#065f46' }, Degraded: { bg: '#fef3c7', col: '#92400e' }, Down: { bg: '#fee2e2', col: '#991b1b' } };

function SevBadge({ s }) {
  const c = SEV_C[s] || SEV_C.Info;
  return <span style={{ background: c.bg, color: c.col, padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, display: 'inline-block' }} />{s}</span>;
}

function UptimeBar({ pct }) {
  const c = pct >= 99 ? '#10b981' : pct >= 97 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 7, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: c, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: c, minWidth: 42 }}>{pct}%</span>
    </div>
  );
}

const fmtDt = (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function EDIMonitoring() {
  const [alerts, setAlerts] = useState(SEED_ALERTS);
  const [rules, setRules] = useState(SEED_RULES);
  const [pipeline] = useState(SEED_PIPELINE);
  const [uptime] = useState(SEED_UPTIME);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filterSev, setFilterSev] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showAddRule, setShowAddRule] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [toast, setToast] = useState(null);
  const [newRule, setNewRule] = useState({ name: '', metric: 'failRate', operator: '>', threshold: 5, tx: 'All', partner: 'All', severity: 'Warning', channels: ['in-app'] });
  const [tick, setTick] = useState(0);
  const timerRef = useRef(null);

  const showToast = (msg, color = '#059669') => { setToast({ msg, color }); setTimeout(() => setToast(null), 4000); };

  useEffect(() => {
    timerRef.current = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(timerRef.current);
  }, []);

  const ackAlert = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acked: true, status: 'Acknowledged' } : a));
    showToast('Alert acknowledged.');
  };

  const resolveAlert = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'Resolved', acked: true } : a));
    showToast('Alert marked resolved.');
  };

  const toggleRule = (id) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const addRule = () => {
    const id = 'RULE-' + String(rules.length + 1).padStart(3, '0');
    setRules(prev => [...prev, { ...newRule, id, enabled: true }]);
    setShowAddRule(false);
    setNewRule({ name: '', metric: 'failRate', operator: '>', threshold: 5, tx: 'All', partner: 'All', severity: 'Warning', channels: ['in-app'] });
    showToast('Alert rule added.');
  };

  const activeAlerts = useMemo(() => alerts.filter(a => a.status === 'Active'), [alerts]);
  const filteredAlerts = useMemo(() => {
    let list = alerts;
    if (filterSev !== 'All') list = list.filter(a => a.severity === filterSev);
    if (filterStatus !== 'All') list = list.filter(a => a.status === filterStatus);
    return list.sort((a, b) => new Date(b.ts) - new Date(a.ts));
  }, [alerts, filterSev, filterStatus]);

  const stats = useMemo(() => ({
    criticals: alerts.filter(a => a.severity === 'Critical' && a.status === 'Active').length,
    warnings:  alerts.filter(a => a.severity === 'Warning'  && a.status === 'Active').length,
    totalActive: activeAlerts.length,
    rulesEnabled: rules.filter(r => r.enabled).length,
    avgUptime: (uptime.reduce((s, p) => s + p.uptime7d, 0) / uptime.length).toFixed(1),
  }), [alerts, activeAlerts, rules, uptime]);

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.color, color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>{toast.msg}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>📡 EDI Monitoring &amp; Alerting</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Real-time EDI pipeline health, partner connectivity, SLA tracking, and threshold-based alert engine</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {stats.criticals > 0 && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              {stats.criticals} Critical Active
            </div>
          )}
          <div style={{ padding: '8px 14px', borderRadius: 8, background: '#d1fae5', border: '1px solid #6ee7b7', fontSize: 12, fontWeight: 700, color: '#065f46', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            Monitor Running · {fmtDt(new Date().toISOString())}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Critical Alerts', value: stats.criticals, accent: '#dc2626' },
          { label: 'Warnings', value: stats.warnings, accent: '#f59e0b' },
          { label: 'Active Rules', value: stats.rulesEnabled, accent: '#6366f1' },
          { label: 'Avg Partner Uptime', value: stats.avgUptime + '%', accent: '#10b981' },
          { label: 'TX Types Monitored', value: TX_TYPES.length, accent: '#3b82f6' },
          { label: 'Partners Online', value: uptime.filter(p => p.status === 'Operational').length + '/' + uptime.length, accent: '#7c3aed' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', borderLeft: '4px solid ' + s.accent }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 16 }}>
        {[['dashboard','🖥 Dashboard'], ['alerts','🔔 Alert Queue'], ['rules','⚙️ Alert Rules'], ['partners','🏢 Partner Status'], ['sla','📏 SLA Tracker']].map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '10px 18px', border: 'none', background: 'transparent', color: activeTab === t ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: activeTab === t ? 700 : 500, fontSize: 13, cursor: 'pointer', borderBottom: '3px solid ' + (activeTab === t ? 'var(--primary)' : 'transparent'), marginBottom: -2, position: 'relative' }}>
            {l}
            {t === 'alerts' && activeAlerts.length > 0 && (
              <span style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeAlerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Active alerts banner */}
          {activeAlerts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeAlerts.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: SEV_C[a.severity].bg, border: '1px solid ' + SEV_C[a.severity].dot, cursor: 'pointer' }} onClick={() => { setSelectedAlert(a); }}>
                  <SevBadge s={a.severity} />
                  <div style={{ flex: 1, fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: SEV_C[a.severity].col }}>{a.type}</span>
                    <span style={{ color: '#374151', marginLeft: 8 }}>{a.msg}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDt(a.ts)}</span>
                  <button onClick={e => { e.stopPropagation(); ackAlert(a.id); }} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>Ack</button>
                </div>
              ))}
            </div>
          )}

          {/* Pipeline grid */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: 14 }}>📊 Pipeline Overview (Last 24 Hours)</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                {['TX Type', 'Partner', 'Volume', 'Success', 'Failed', 'Fail Rate', 'Avg Turnaround', 'SLA', 'Breaches'].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pipeline.map((row, i) => {
                  const vol = row.sent || row.recv || 0;
                  const ok = row.acked || row.posted || row.responded || row.accepted || 0;
                  const fail = row.rejected || row.exceptions || row.failed || 0;
                  const isBad = row.failRate >= 5;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: isBad ? '#fff7ed' : i % 2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}><span style={{ fontFamily: 'monospace', fontSize: 12, background: '#dbeafe', color: '#1d4ed8', padding: '2px 7px', borderRadius: 5 }}>{row.tx}</span></td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: '#374151' }}>{row.partner}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{vol}</td>
                      <td style={{ padding: '10px 12px', color: '#059669', fontWeight: 700 }}>{ok}</td>
                      <td style={{ padding: '10px 12px', color: fail > 0 ? '#dc2626' : 'var(--text-muted)', fontWeight: fail > 0 ? 700 : 400 }}>{fail}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontWeight: 700, color: isBad ? '#dc2626' : '#374151' }}>{row.failRate}%</span>
                        {isBad && <span style={{ marginLeft: 4, fontSize: 10 }}>⚠️</span>}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11 }}>{row.avgTurnaround}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11, color: '#7c3aed' }}>{row.sla}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontWeight: 700, color: row.slaBreaches > 0 ? '#dc2626' : '#059669' }}>{row.slaBreaches}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Partner uptime mini view */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {uptime.map(p => {
              const uc = UPT_C[p.status];
              return (
                <div key={p.partner} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 12 }}>{p.partner}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: uc.bg, color: uc.col }}>{p.status}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>7-Day Uptime</div>
                  <UptimeBar pct={p.uptime7d} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ALERT QUEUE ── */}
      {activeTab === 'alerts' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['All', ...SEVERITIES].map(s => (
                <button key={s} onClick={() => setFilterSev(s)} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, border: '1px solid ' + (filterSev === s ? 'var(--primary)' : 'var(--border)'), background: filterSev === s ? 'var(--primary)' : '#fff', color: filterSev === s ? '#fff' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['All', 'Active', 'Acknowledged', 'Resolved'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, border: '1px solid ' + (filterStatus === s ? '#7c3aed' : 'var(--border)'), background: filterStatus === s ? '#7c3aed' : '#fff', color: filterStatus === s ? '#fff' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{filteredAlerts.length} alert(s)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredAlerts.map(a => {
              const sc = SEV_C[a.severity];
              const resolved = a.status === 'Resolved';
              return (
                <div key={a.id} style={{ background: '#fff', border: '1px solid var(--border)', borderLeft: '4px solid ' + (resolved ? '#94a3b8' : sc.dot), borderRadius: 10, padding: 14, opacity: resolved ? 0.75 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <SevBadge s={a.severity} />
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{a.type}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)' }}>{a.id}</span>
                        {a.status !== 'Active' && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#f1f5f9', color: '#64748b', fontWeight: 700 }}>{a.status}</span>}
                      </div>
                      <p style={{ margin: '0 0 6px', fontSize: 12, color: '#374151' }}>{a.msg}</p>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span>Partner: <strong style={{ color: '#374151' }}>{a.partner}</strong></span>
                        <span>TX: <span style={{ fontFamily: 'monospace', background: '#dbeafe', color: '#1d4ed8', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>{a.tx}</span></span>
                        <span>Rule: <span style={{ fontFamily: 'monospace', color: '#7c3aed' }}>{a.rule}</span></span>
                        <span>Time: {fmtDt(a.ts)}</span>
                      </div>
                    </div>
                    {!resolved && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {!a.acked && <button onClick={() => ackAlert(a.id)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid #fbbf24', background: '#fffbeb', color: '#92400e', fontWeight: 700, cursor: 'pointer' }}>Acknowledge</button>}
                        <button onClick={() => resolveAlert(a.id)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Resolve</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredAlerts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                ✅ No alerts matching current filters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ALERT RULES ── */}
      {activeTab === 'rules' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button onClick={() => setShowAddRule(true)} className="btn btn-primary">+ Add Alert Rule</button>
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                {['Rule', 'Trigger', 'TX', 'Partner', 'Severity', 'Channels', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rules.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? '#fafafa' : '#fff', opacity: r.enabled ? 1 : 0.5 }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>{r.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.id}</div>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11 }}><span style={{ color: '#7c3aed' }}>{r.metric}</span> {r.operator} <span style={{ fontWeight: 800, color: '#dc2626' }}>{r.threshold}{r.metric === 'failRate' ? '%' : r.metric === 'uptime' ? '%' : r.metric === 'gapHours' ? 'h' : ''}</span></td>
                    <td style={{ padding: '10px 14px' }}><span style={{ fontFamily: 'monospace', fontSize: 11, background: '#dbeafe', color: '#1d4ed8', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>{r.tx}</span></td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: '#374151' }}>{r.partner}</td>
                    <td style={{ padding: '10px 14px' }}><SevBadge s={r.severity} /></td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {r.channels.map(ch => (
                          <span key={ch} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>{ch}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: r.enabled ? '#059669' : '#94a3b8' }}>{r.enabled ? 'Enabled' : 'Disabled'}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => toggleRule(r.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', fontWeight: 700, cursor: 'pointer', color: r.enabled ? '#dc2626' : '#059669' }}>
                        {r.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PARTNER STATUS ── */}
      {activeTab === 'partners' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {uptime.map(p => {
            const uc = UPT_C[p.status];
            const pTx = pipeline.filter(r => r.partner === p.partner);
            return (
              <div key={p.partner} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 16, borderLeft: '4px solid ' + (p.status === 'Operational' ? '#10b981' : '#f59e0b') }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 800, fontSize: 14 }}>{p.partner}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 10, background: uc.bg, color: uc.col }}>{p.status}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Last downtime: {p.lastDown} ({p.lastDownDur})</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>7-DAY</div>
                      <UptimeBar pct={p.uptime7d} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>30-DAY</div>
                      <UptimeBar pct={p.uptime30d} />
                    </div>
                  </div>
                </div>
                {pTx.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {pTx.map((t, idx) => {
                      const isBad = t.failRate >= 5;
                      return (
                        <div key={idx} style={{ padding: '8px 12px', background: isBad ? '#fff7ed' : '#f8fafc', borderRadius: 8, border: '1px solid ' + (isBad ? '#fdba74' : 'var(--border)'), fontSize: 11 }}>
                          <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8', marginBottom: 2 }}>{t.tx}</div>
                          <div style={{ color: isBad ? '#dc2626' : '#059669', fontWeight: 700 }}>{t.failRate}% fail · {t.avgTurnaround}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── SLA TRACKER ── */}
      {activeTab === 'sla' && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>📏 SLA Performance (Last 24 Hours)</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pipeline.filter(r => r.slaBreaches > 0).length} breach(es) detected</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
              {['TX Type', 'Partner', 'SLA Target', 'Avg Turnaround', 'Compliance', 'Breaches', 'Assessment'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {pipeline.map((row, i) => {
                const breached = row.slaBreaches > 0;
                const vol = row.sent || row.recv || 0;
                const fail = row.slaBreaches;
                const comp = vol > 0 ? (((vol - fail) / vol) * 100).toFixed(1) : '100.0';
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: breached ? '#fff7ed' : i % 2 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '10px 14px' }}><span style={{ fontFamily: 'monospace', fontSize: 12, background: '#dbeafe', color: '#1d4ed8', padding: '2px 7px', borderRadius: 5, fontWeight: 700 }}>{row.tx}</span></td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>{row.partner}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#7c3aed', fontWeight: 700 }}>{row.sla}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#374151' }}>{row.avgTurnaround}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 80, height: 8, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: comp + '%', background: Number(comp) >= 99 ? '#10b981' : Number(comp) >= 95 ? '#f59e0b' : '#ef4444', borderRadius: 4 }} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 11, color: Number(comp) >= 99 ? '#059669' : Number(comp) >= 95 ? '#d97706' : '#dc2626' }}>{comp}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: breached ? '#dc2626' : '#059669' }}>{row.slaBreaches}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: !breached ? '#d1fae5' : '#fef3c7', color: !breached ? '#065f46' : '#92400e' }}>
                        {!breached ? '✅ Compliant' : '⚠️ Review'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add Rule Modal ── */}
      {showAddRule && (
        <div className="modal-backdrop" onClick={() => setShowAddRule(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 520 }}>
            <div className="modal-header"><h3>⚙️ Add Alert Rule</h3></div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="form-label">Rule Name</label>
                <input className="form-input" value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))} placeholder="e.g. 837 Rejection Rate > 10%" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">Metric</label>
                  <select className="form-input" value={newRule.metric} onChange={e => setNewRule(p => ({ ...p, metric: e.target.value }))}>
                    {['failRate', 'uptime', 'gapHours', 'avgTurnaround', 'schedule'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Operator</label>
                  <select className="form-input" value={newRule.operator} onChange={e => setNewRule(p => ({ ...p, operator: e.target.value }))}>
                    {['>', '<', '=', '>=', '<='].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">Threshold</label>
                  <input type="number" className="form-input" value={newRule.threshold} onChange={e => setNewRule(p => ({ ...p, threshold: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="form-label">Severity</label>
                  <select className="form-input" value={newRule.severity} onChange={e => setNewRule(p => ({ ...p, severity: e.target.value }))}>
                    {SEVERITIES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">TX Type</label>
                  <select className="form-input" value={newRule.tx} onChange={e => setNewRule(p => ({ ...p, tx: e.target.value }))}>
                    {['All', ...TX_TYPES].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Partner</label>
                  <select className="form-input" value={newRule.partner} onChange={e => setNewRule(p => ({ ...p, partner: e.target.value }))}>
                    {['All', ...PARTNERS].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Notification Channels</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CHANNELS.map(ch => (
                    <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <input type="checkbox" checked={newRule.channels.includes(ch)} onChange={e => {
                        setNewRule(p => ({
                          ...p,
                          channels: e.target.checked ? [...p.channels, ch] : p.channels.filter(c => c !== ch)
                        }));
                      }} />
                      {ch}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddRule(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!newRule.name.trim()} onClick={addRule}>Add Rule</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Alert Detail Modal ── */}
      {selectedAlert && (
        <div className="modal-backdrop" onClick={() => setSelectedAlert(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 500 }}>
            <div style={{ background: SEV_C[selectedAlert.severity].bg, borderBottom: '1px solid ' + SEV_C[selectedAlert.severity].dot, padding: '14px 20px', margin: '-20px -20px 0', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <SevBadge s={selectedAlert.severity} />
                <span style={{ fontWeight: 800, fontSize: 14, color: SEV_C[selectedAlert.severity].col }}>{selectedAlert.type}</span>
              </div>
              <button onClick={() => setSelectedAlert(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{selectedAlert.msg}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                {[['Alert ID', selectedAlert.id], ['Status', selectedAlert.status], ['TX Type', selectedAlert.tx], ['Partner', selectedAlert.partner], ['Rule', selectedAlert.rule], ['Triggered', fmtDt(selectedAlert.ts)]].map(([l, v]) => (
                  <div key={l} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{l}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedAlert(null)}>Close</button>
              {selectedAlert.status === 'Active' && !selectedAlert.acked && (
                <button className="btn" style={{ background: '#fbbf24', color: '#1a1a1a', fontWeight: 700 }} onClick={() => { ackAlert(selectedAlert.id); setSelectedAlert(null); }}>Acknowledge</button>
              )}
              {selectedAlert.status !== 'Resolved' && (
                <button className="btn btn-primary" onClick={() => { resolveAlert(selectedAlert.id); setSelectedAlert(null); }}>Mark Resolved</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
