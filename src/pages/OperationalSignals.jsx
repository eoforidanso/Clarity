import React, { useState, useEffect, useRef } from 'react';

/* ─── Real-Time Operational Signals Dashboard ─────────────── */
const SIGNAL_CATEGORIES = ['All', 'Revenue', 'Scheduling', 'Clinical', 'Compliance', 'Staff'];

const generateSignals = () => [
  { id: 's1', severity: 'critical', category: 'Revenue', title: 'Revenue leakage detected — 12 unbilled encounters', description: 'Encounters from April 8-12 have not been submitted for billing. Estimated lost revenue: $3,840. Action needed within 48 hours to meet timely filing deadline.', metric: '$3,840', metricLabel: 'At Risk', timestamp: '2026-04-15 08:12 AM', source: 'Billing Engine', actionable: true, action: 'Review & Submit Claims', assignee: 'Admin User' },
  { id: 's2', severity: 'warning', category: 'Scheduling', title: 'No-show rate spiking — 23% this week (target: <15%)', description: 'Tuesday and Thursday afternoon slots show 40%+ no-show rates. Top affected providers: Dr. Chris L. (4 no-shows), April Torres (3 no-shows). Consider overbooking or waitlist backfill.', metric: '23%', metricLabel: 'No-Show Rate', timestamp: '2026-04-15 07:45 AM', source: 'Scheduling AI', actionable: true, action: 'Enable Overbooking', assignee: null },
  { id: 's3', severity: 'critical', category: 'Clinical', title: '3 patients overdue for PHQ-9 screening (>30 days)', description: 'James Anderson (42 days), Maria Garcia (36 days), Robert Chen (31 days) — PHQ-9 assessments required per MBC protocol. Affects CMS-159 quality measure compliance.', metric: '3', metricLabel: 'Overdue', timestamp: '2026-04-15 06:00 AM', source: 'MBC Engine', actionable: true, action: 'Send Patient Reminders', assignee: 'Nurse Kelly' },
  { id: 's4', severity: 'info', category: 'Revenue', title: 'Collection rate improved — 94.2% (↑2.1% vs last month)', description: 'Patient payment collection is trending upward. AutoPay enrollment increased from 18% to 27% of active patients. Average days in A/R decreased from 32 to 28.', metric: '94.2%', metricLabel: 'Collection Rate', timestamp: '2026-04-15 06:00 AM', source: 'RCM Analytics', actionable: false },
  { id: 's5', severity: 'warning', category: 'Compliance', title: 'Prior authorization expiring — 5 patients within 7 days', description: 'Ashley Kim (expires 4/18), Dorothy Wilson (4/19), Marcus Brown (4/20), Sarah Johnson (4/21), Kevin Lee (4/22). Renewals must be submitted to avoid treatment gaps.', metric: '5', metricLabel: 'Expiring Soon', timestamp: '2026-04-15 07:00 AM', source: 'Auth Tracker', actionable: true, action: 'Renew Authorizations', assignee: 'Admin User' },
  { id: 's6', severity: 'info', category: 'Scheduling', title: 'Provider utilization optimal — Dr. Chris at 87%', description: 'All three providers are within target utilization range (80-90%). Dr. Chris: 87%, Joseph NP: 82%, April Torres: 91% (slightly above target — monitor for burnout).', metric: '87%', metricLabel: 'Utilization', timestamp: '2026-04-15 08:00 AM', source: 'Capacity Planner', actionable: false },
  { id: 's7', severity: 'critical', category: 'Clinical', title: 'Lithium level due — Robert Chen (last drawn 3/01)', description: 'Patient on Lithium 600mg BID. Lab levels must be drawn every 3 months per protocol. 45 days since last draw. Risk of toxicity if not monitored.', metric: '45d', metricLabel: 'Overdue', timestamp: '2026-04-15 06:30 AM', source: 'Med Safety', actionable: true, action: 'Order Lab', assignee: 'Dr. Chris L.' },
  { id: 's8', severity: 'warning', category: 'Staff', title: 'April Torres approaching overtime — 38/40 hrs', description: 'Current week hours: 38. Two more scheduled sessions today (2.5 hrs). Will exceed 40-hour threshold. Consider reassigning evening group to available provider.', metric: '38h', metricLabel: 'Hours This Week', timestamp: '2026-04-15 09:00 AM', source: 'HR Monitor', actionable: true, action: 'Reassign Sessions', assignee: null },
  { id: 's9', severity: 'info', category: 'Revenue', title: 'Denial rate at historic low — 3.8% (target: <5%)', description: 'Clean claims rate of 96.2% driven by improved coding accuracy and automated eligibility verification. Top denial reason remaining: incorrect modifier usage (1.2%).', metric: '3.8%', metricLabel: 'Denial Rate', timestamp: '2026-04-15 06:00 AM', source: 'Claims Engine', actionable: false },
  { id: 's10', severity: 'warning', category: 'Clinical', title: 'GAD-7 trending up for 4 patients — intervention review recommended', description: 'Ashley Kim (14→18), Marcus Brown (10→15), Dorothy Wilson (8→14), Lisa Park (12→17). Scores increased ≥4 points over last 2 assessments. Treatment plan adjustment may be needed.', metric: '4', metricLabel: 'Patients', timestamp: '2026-04-15 07:30 AM', source: 'MBC Engine', actionable: true, action: 'Review Treatment Plans', assignee: 'Dr. Chris L.' },
  { id: 's11', severity: 'info', category: 'Scheduling', title: 'Waitlist conversion — 8 patients scheduled from waitlist this week', description: 'Automated waitlist backfill successfully converted 8 of 12 waitlisted patients into cancelled slots. Average wait-to-appointment time: 2.3 days.', metric: '8', metricLabel: 'Converted', timestamp: '2026-04-15 08:30 AM', source: 'Waitlist Engine', actionable: false },
  { id: 's12', severity: 'critical', category: 'Compliance', title: 'HIPAA training overdue — 2 staff members', description: 'Baz (front desk) and Amena (front desk) have not completed annual HIPAA refresher training. Due date was April 1, 2026. Must complete within 30 days to maintain compliance.', metric: '2', metricLabel: 'Overdue', timestamp: '2026-04-15 06:00 AM', source: 'Compliance Tracker', actionable: true, action: 'Send Training Reminder', assignee: 'Admin User' },
];

export default function OperationalSignals() {
  const [signals] = useState(generateSignals);
  const [filter, setFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [dismissed, setDismissed] = useState(new Set());
  const [expandedSignal, setExpandedSignal] = useState(null);
  const [refreshTime, setRefreshTime] = useState(new Date());
  const refreshRef = useRef(null);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    refreshRef.current = setInterval(() => setRefreshTime(new Date()), 30000);
    return () => clearInterval(refreshRef.current);
  }, []);

  const filtered = signals.filter(s => {
    if (dismissed.has(s.id)) return false;
    if (filter !== 'All' && s.category !== filter) return false;
    if (severityFilter !== 'all' && s.severity !== severityFilter) return false;
    return true;
  });

  const criticalCount = signals.filter(s => s.severity === 'critical' && !dismissed.has(s.id)).length;
  const warningCount = signals.filter(s => s.severity === 'warning' && !dismissed.has(s.id)).length;
  const actionableCount = signals.filter(s => s.actionable && !dismissed.has(s.id)).length;

  const severityConfig = {
    critical: { bg: '#fef2f2', border: '#fca5a5', color: '#dc2626', icon: '🔴', label: 'CRITICAL' },
    warning: { bg: '#fffbeb', border: '#fcd34d', color: '#d97706', icon: '🟡', label: 'WARNING' },
    info: { bg: '#eff6ff', border: '#93c5fd', color: '#2563eb', icon: '🔵', label: 'INFO' },
  };

  return (
    <div className="page-padding">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>⚡ Real-Time Operational Signals</h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
            AI-powered alerts for revenue, scheduling, clinical care, and compliance · Last refreshed: {refreshTime.toLocaleTimeString()}
          </p>
        </div>
        <button onClick={() => setRefreshTime(new Date())} className="btn btn-secondary">🔄 Refresh</button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="card" style={{ padding: 14, textAlign: 'center', borderLeft: '4px solid #dc2626' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#dc2626' }}>{criticalCount}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>🔴 Critical</div>
        </div>
        <div className="card" style={{ padding: 14, textAlign: 'center', borderLeft: '4px solid #d97706' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#d97706' }}>{warningCount}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>🟡 Warnings</div>
        </div>
        <div className="card" style={{ padding: 14, textAlign: 'center', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#2563eb' }}>{signals.filter(s => s.severity === 'info' && !dismissed.has(s.id)).length}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>🔵 Info</div>
        </div>
        <div className="card" style={{ padding: 14, textAlign: 'center', borderLeft: '4px solid #7c3aed' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#7c3aed' }}>{actionableCount}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>⚡ Actionable</div>
        </div>
        <div className="card" style={{ padding: 14, textAlign: 'center', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#10b981' }}>{dismissed.size}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>✅ Resolved</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Category:</span>
        {SIGNAL_CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilter(c)} className={`btn btn-sm ${filter === c ? 'btn-primary' : 'btn-secondary'}`}>{c}</button>
        ))}
        <span style={{ marginLeft: 16, fontSize: 12, fontWeight: 700, color: '#475569' }}>Severity:</span>
        {['all', 'critical', 'warning', 'info'].map(s => (
          <button key={s} onClick={() => setSeverityFilter(s)} className={`btn btn-sm ${severityFilter === s ? 'btn-primary' : 'btn-secondary'}`} style={{ textTransform: 'capitalize' }}>
            {s === 'all' ? 'All' : `${severityConfig[s]?.icon || ''} ${s}`}
          </button>
        ))}
      </div>

      {/* Signal Cards */}
      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.sort((a, b) => { const order = { critical: 0, warning: 1, info: 2 }; return order[a.severity] - order[b.severity]; }).map(signal => {
          const cfg = severityConfig[signal.severity];
          const isExpanded = expandedSignal === signal.id;
          return (
            <div key={signal.id} className="card" style={{ padding: 0, border: `1px solid ${cfg.border}`, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: cfg.bg, cursor: 'pointer' }} onClick={() => setExpandedSignal(isExpanded ? null : signal.id)}>
                <span style={{ fontSize: 18, marginRight: 12 }}>{cfg.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{signal.title}</span>
                    <span style={{ background: `${cfg.color}18`, color: cfg.color, padding: '1px 8px', borderRadius: 99, fontSize: 9, fontWeight: 800 }}>{cfg.label}</span>
                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 8px', borderRadius: 99, fontSize: 9, fontWeight: 600 }}>{signal.category}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {signal.source} · {signal.timestamp}
                    {signal.assignee && <> · Assigned: <strong>{signal.assignee}</strong></>}
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginLeft: 16, minWidth: 70 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: cfg.color }}>{signal.metric}</div>
                  <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>{signal.metricLabel}</div>
                </div>
                <span style={{ marginLeft: 12, fontSize: 12, color: '#94a3b8', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : '' }}>▼</span>
              </div>

              {isExpanded && (
                <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${cfg.border}`, background: '#fff' }}>
                  <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, margin: '0 0 12px' }}>{signal.description}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {signal.actionable && (
                      <button onClick={(e) => { e.stopPropagation(); setDismissed(p => new Set([...p, signal.id])); }} className="btn btn-sm btn-primary">
                        ⚡ {signal.action}
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setDismissed(p => new Set([...p, signal.id])); }} className="btn btn-sm btn-secondary">
                      ✅ Dismiss
                    </button>
                    <button className="btn btn-sm btn-secondary">📋 Assign</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="card" style={{ padding: 50, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>All clear!</div>
            <div style={{ fontSize: 13 }}>No active signals match your filters.</div>
          </div>
        )}
      </div>

      {/* Real-Time Metrics Strip */}
      <div style={{ marginTop: 24, padding: 16, background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', borderRadius: 12, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        {[
          { label: 'Revenue Today', value: '$4,280', trend: '↑ 12%', color: '#10b981' },
          { label: 'Encounters Today', value: '19', trend: '↑ 3', color: '#3b82f6' },
          { label: 'Avg Wait Time', value: '4.2 min', trend: '↓ 1.1', color: '#10b981' },
          { label: 'Open Tasks', value: '7', trend: '↓ 2', color: '#f59e0b' },
          { label: 'Pt Satisfaction', value: '4.8/5', trend: '↑ 0.1', color: '#8b5cf6' },
          { label: 'Slot Fill Rate', value: '92%', trend: '↑ 4%', color: '#10b981' },
        ].map((m, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{m.value}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{m.label}</div>
            <div style={{ fontSize: 10, color: m.color, fontWeight: 700, marginTop: 2 }}>{m.trend}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
