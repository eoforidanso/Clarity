import React, { useState, useMemo } from 'react';

// ─── Routing Rules ────────────────────────────────────────────────────────────
const ROUTING_RULES = [
  {
    id: 'rr-001', name: 'BCBS 837P → Availity Primary', priority: 1, status: 'Active',
    conditions: [{ field: 'TX Type', op: 'equals', value: '837P' }, { field: 'Payer ID', op: 'equals', value: '00510' }],
    action: 'Route to Availity', target: 'Availity', protocol: 'SFTP', fallback: 'Change Healthcare',
    lastTriggered: '2026-05-23T09:12:34', triggerCount: 142, successRate: 99.3,
    schedule: 'Immediate', retryPolicy: '3x / 5 min',
  },
  {
    id: 'rr-002', name: 'Aetna 837P → Change Healthcare', priority: 2, status: 'Active',
    conditions: [{ field: 'TX Type', op: 'equals', value: '837P' }, { field: 'Payer ID', op: 'equals', value: 'AETNA' }],
    action: 'Route to Change Healthcare', target: 'Change Healthcare', protocol: 'HTTPS/API', fallback: 'Availity',
    lastTriggered: '2026-05-23T08:20:00', triggerCount: 88, successRate: 98.9,
    schedule: 'Immediate', retryPolicy: '3x / 5 min',
  },
  {
    id: 'rr-003', name: 'UHC Direct 270 → Optum API', priority: 3, status: 'Active',
    conditions: [{ field: 'TX Type', op: 'equals', value: '270' }, { field: 'Payer ID', op: 'starts_with', value: 'UHC' }],
    action: 'Route to Optum API', target: 'Optum / UHC Direct', protocol: 'HTTPS/API', fallback: 'Availity',
    lastTriggered: '2026-05-23T07:50:00', triggerCount: 56, successRate: 97.4,
    schedule: 'Immediate', retryPolicy: '2x / 3 min',
  },
  {
    id: 'rr-004', name: 'All Inbound 835 → ERA Service', priority: 4, status: 'Active',
    conditions: [{ field: 'TX Type', op: 'equals', value: '835' }, { field: 'Direction', op: 'equals', value: 'Inbound' }],
    action: 'Queue to ERA Listener', target: 'ERA Listener Service', protocol: 'Internal Queue', fallback: '—',
    lastTriggered: '2026-05-23T09:10:11', triggerCount: 204, successRate: 100,
    schedule: 'On Receipt', retryPolicy: 'N/A',
  },
  {
    id: 'rr-005', name: 'Test Mode → Availity TEST', priority: 5, status: 'Active',
    conditions: [{ field: 'ISA15', op: 'equals', value: 'T' }, { field: 'TX Type', op: 'any', value: '' }],
    action: 'Route to TEST environment', target: 'Availity TEST', protocol: 'SFTP', fallback: 'None',
    lastTriggered: '2026-05-23T09:05:00', triggerCount: 18, successRate: 100,
    schedule: 'Immediate', retryPolicy: 'None',
  },
  {
    id: 'rr-006', name: 'Cigna 276 → Waystar', priority: 6, status: 'Active',
    conditions: [{ field: 'TX Type', op: 'in', value: '276, 277' }, { field: 'Payer ID', op: 'starts_with', value: 'CIG' }],
    action: 'Route to Waystar', target: 'Waystar', protocol: 'SFTP', fallback: 'Availity',
    lastTriggered: '2026-05-22T14:00:00', triggerCount: 29, successRate: 96.5,
    schedule: 'Batch 15 min', retryPolicy: '3x / 10 min',
  },
  {
    id: 'rr-007', name: 'Unmatched → Dead Letter Queue', priority: 99, status: 'Active',
    conditions: [{ field: 'Match', op: 'equals', value: 'None' }],
    action: 'Hold in Dead Letter Queue', target: 'Dead Letter Queue', protocol: 'Internal', fallback: 'Alert',
    lastTriggered: '2026-05-21T11:00:00', triggerCount: 3, successRate: 100,
    schedule: 'Immediate', retryPolicy: 'Manual Review',
  },
];

// ─── Routing Log ──────────────────────────────────────────────────────────────
const ROUTING_LOG = [
  { id: 'rl-001', ts: '2026-05-23T09:12:34', file: 'CLM_20260523_001.edi', txType: '837P', payer: 'BCBS', ruleId: 'rr-001', target: 'Availity', status: 'Delivered', duration: 1.2, hops: 1 },
  { id: 'rl-002', ts: '2026-05-23T09:10:11', file: 'ERA_BCBS_20260523.edi', txType: '835', payer: 'BCBS', ruleId: 'rr-004', target: 'ERA Listener Service', status: 'Queued', duration: 0.1, hops: 1 },
  { id: 'rl-003', ts: '2026-05-23T08:45:00', file: 'ELIG_20260523_001.edi', txType: '270', payer: 'UHC', ruleId: 'rr-003', target: 'Optum / UHC Direct', status: 'Delivered', duration: 0.4, hops: 1 },
  { id: 'rl-004', ts: '2026-05-23T08:20:00', file: 'CLM_20260523_002.edi', txType: '837P', payer: 'Aetna', ruleId: 'rr-002', target: 'Change Healthcare', status: 'Failed', duration: 1.8, hops: 2, error: 'Connection timeout — retried to Availity (fallback)' },
  { id: 'rl-005', ts: '2026-05-23T09:05:00', file: 'TEST_CLM_20260523.edi', txType: '837P', payer: 'TEST', ruleId: 'rr-005', target: 'Availity TEST', status: 'Delivered', duration: 0.9, hops: 1 },
  { id: 'rl-006', ts: '2026-05-22T14:00:00', file: 'STAT_20260522_001.edi', txType: '276', payer: 'Cigna', ruleId: 'rr-006', target: 'Waystar', status: 'Delivered', duration: 0.3, hops: 1 },
];

const OP_LABELS = { equals: '=', starts_with: 'starts with', in: 'in', any: 'any' };
const STATUS_C = { Delivered: '#059669', Failed: '#dc2626', Queued: '#d97706', Retried: '#7c3aed' };

const fmtDate = (d) => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

export default function EDIRoutingEngine() {
  const [activeTab, setActiveTab] = useState('rules');
  const [selectedRule, setSelectedRule] = useState(null);
  const [showAddRule, setShowAddRule] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [toast, setToast] = useState(null);
  const [rules, setRules] = useState(ROUTING_RULES);
  const [testInput, setTestInput] = useState({ txType: '837P', payerId: '00510', isa15: 'P', direction: 'Outbound' });
  const [testResult, setTestResult] = useState(null);
  const [evalTrace, setEvalTrace] = useState([]);
  const [newRule, setNewRule] = useState({ name: '', txType: 'Any', payerId: '', isa15: 'Any', target: 'Availity', protocol: 'SFTP', schedule: 'Immediate', retryPolicy: '3x / 5 min', fallback: 'Dead Letter Queue' });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const stats = useMemo(() => ({
    active: rules.filter(r => r.status === 'Active').length,
    totalTriggered: rules.reduce((s, r) => s + r.triggerCount, 0),
    avgSuccess: (rules.reduce((s, r) => s + r.successRate, 0) / rules.length).toFixed(1),
    delivered: ROUTING_LOG.filter(l => l.status === 'Delivered').length,
    failed: ROUTING_LOG.filter(l => l.status === 'Failed').length,
  }), [rules]);

  const runTest = () => {
    const trace = [];
    let matchedRule = null;
    for (const r of rules) {
      let matches = false;
      if (r.id === 'rr-001') matches = testInput.txType === '837P' && testInput.payerId === '00510';
      else if (r.id === 'rr-002') matches = testInput.txType === '837P' && testInput.payerId.toUpperCase().includes('AETNA');
      else if (r.id === 'rr-003') matches = testInput.txType === '270' && testInput.payerId.toUpperCase().startsWith('UHC');
      else if (r.id === 'rr-004') matches = testInput.txType === '835' && testInput.direction === 'Inbound';
      else if (r.id === 'rr-005') matches = testInput.isa15 === 'T';
      else if (r.id === 'rr-006') matches = ['276','277'].includes(testInput.txType) && testInput.payerId.toUpperCase().startsWith('CIG');
      else matches = true; // dead letter
      const condResults = r.conditions.map(c => {
        let pass = false;
        if (c.op === 'any') pass = true;
        else if (c.field === 'TxType') pass = c.op === 'equals' ? testInput.txType === c.value : c.op === 'in' ? c.value.split(',').map(v=>v.trim()).includes(testInput.txType) : false;
        else if (c.field === 'PayerID') pass = c.op === 'equals' ? testInput.payerId === c.value : c.op === 'starts_with' ? testInput.payerId.toUpperCase().startsWith(c.value.toUpperCase()) : c.op === 'in' ? c.value.split(',').map(v=>v.trim()).some(v => testInput.payerId.toUpperCase().includes(v.toUpperCase())) : false;
        else if (c.field === 'ISA15') pass = testInput.isa15 === c.value;
        else if (c.field === 'Direction') pass = testInput.direction === c.value;
        return { ...c, pass };
      });
      trace.push({ rule: r, condResults, matched: matches });
      if (matches) { matchedRule = r; break; }
    }
    setEvalTrace(trace);
    setTestResult(matchedRule);
  };

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#059669', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>{toast}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🔀 EDI Routing Engine</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Priority-based routing rules for EDI transaction dispatch across clearinghouses and payer direct connections</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => showToast('All routing rules reloaded from configuration.')} style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>🔄 Reload Config</button>
          <button onClick={() => setShowAddRule(true)} className="btn btn-primary" style={{ fontSize: 13 }}>+ Add Rule</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Active Rules', value: stats.active, accent: '#6366f1' },
          { label: 'Total Routed', value: stats.totalTriggered, accent: '#3b82f6' },
          { label: 'Avg Success', value: stats.avgSuccess + '%', accent: '#10b981' },
          { label: 'Delivered (24h)', value: stats.delivered, accent: '#059669' },
          { label: 'Failed (24h)', value: stats.failed, accent: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', borderLeft: '4px solid ' + s.accent }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 16 }}>
        {[['rules','📋 Routing Rules'], ['log','📜 Routing Log'], ['test','🧪 Rule Tester']].map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '10px 18px', border: 'none', background: 'transparent', color: activeTab === t ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: activeTab === t ? 700 : 500, fontSize: 13, cursor: 'pointer', borderBottom: '3px solid ' + (activeTab === t ? 'var(--primary)' : 'transparent'), marginBottom: -2 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {rules.map((rule, idx) => (
            <div key={rule.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 16, borderLeft: '4px solid ' + (rule.priority === 99 ? '#6b7280' : '#6366f1') }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: '#eff6ff', color: '#1d4ed8', fontFamily: 'monospace' }}>P{rule.priority}</span>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{rule.name}</span>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#d1fae5', color: '#065f46', fontWeight: 700 }}>{rule.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    {rule.conditions.map((c, i) => (
                      <span key={i} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, background: '#f8fafc', border: '1px solid var(--border)', fontFamily: 'monospace' }}>
                        <span style={{ color: '#7c3aed', fontWeight: 700 }}>{c.field}</span>
                        {' '}<span style={{ color: '#d97706' }}>{OP_LABELS[c.op]}</span>
                        {' '}<span style={{ color: '#1d4ed8', fontWeight: 700 }}>"{c.value || '*'}"</span>
                      </span>
                    ))}
                    <span style={{ fontSize: 11, color: '#6b7280' }}>→</span>
                    <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, background: '#d1fae5', border: '1px solid #a7f3d0', fontWeight: 700, color: '#065f46' }}>{rule.action}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>Protocol: <strong style={{ color: '#374151' }}>{rule.protocol}</strong></span>
                    <span>Fallback: <strong style={{ color: '#374151' }}>{rule.fallback}</strong></span>
                    <span>Schedule: <strong style={{ color: '#374151' }}>{rule.schedule}</strong></span>
                    <span>Retry: <strong style={{ color: '#374151' }}>{rule.retryPolicy}</strong></span>
                    <span>Triggered: <strong style={{ color: '#374151' }}>{rule.triggerCount}x</strong></span>
                    <span>Success: <strong style={{ color: rule.successRate >= 99 ? '#059669' : rule.successRate >= 97 ? '#d97706' : '#dc2626' }}>{rule.successRate}%</strong></span>
                    <span>Last: <strong style={{ color: '#374151' }}>{new Date(rule.lastTriggered).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} today</strong></span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => { setRules(prev => prev.map(r => r.id === rule.id ? { ...r, priority: Math.max(1, r.priority - 1) } : r)); }} disabled={idx === 0} style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', fontSize: 13, cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.4 : 1 }}>↑</button>
                  <button onClick={() => { setRules(prev => prev.map(r => r.id === rule.id ? { ...r, priority: r.priority + 1 } : r)); }} disabled={idx === rules.length - 1} style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', fontSize: 13, cursor: idx === rules.length - 1 ? 'default' : 'pointer', opacity: idx === rules.length - 1 ? 0.4 : 1 }}>↓</button>
                  <button onClick={() => { setRules(prev => prev.map(r => r.id === rule.id ? { ...r, status: r.status === 'Active' ? 'Disabled' : 'Active' } : r)); }} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', fontWeight: 700, cursor: 'pointer', color: rule.status === 'Active' ? '#dc2626' : '#059669' }}>
                    {rule.status === 'Active' ? 'Disable' : 'Enable'}
                  </button>
                  <button style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={() => setEditRule({ ...rule })}>Edit</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log Tab */}
      {activeTab === 'log' && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>Routing Log — Last 24h</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                {['Timestamp', 'File', 'TX Type', 'Payer', 'Matched Rule', 'Target', 'Hops', 'Duration', 'Status', 'Error'].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROUTING_LOG.map((l, i) => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--border)', background: l.status === 'Failed' ? '#fff7f7' : i % 2 === 1 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '9px 12px', fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDate(l.ts)}</td>
                  <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.file}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: '#dbeafe', color: '#1d4ed8', fontFamily: 'monospace' }}>{l.txType}</span>
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{l.payer}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, fontFamily: 'monospace', color: '#7c3aed' }}>{l.ruleId}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, fontWeight: 600 }}>{l.target}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700 }}>{l.hops}</td>
                  <td style={{ padding: '9px 12px', color: 'var(--text-muted)', fontSize: 11 }}>{l.duration}s</td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: (STATUS_C[l.status] || '#6b7280') + '22', color: STATUS_C[l.status] || '#6b7280' }}>{l.status}</span>
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: 11, color: '#dc2626', maxWidth: 200 }}>{l.error || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'test' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>🧪 Rule Tester</div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label className="form-label">TX Type</label>
                <select value={testInput.txType} onChange={e => setTestInput(p => ({ ...p, txType: e.target.value }))} className="form-input">
                  {['837P', '837I', '835', '270', '271', '276', '277', '999'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Payer ID</label>
                <input className="form-input" value={testInput.payerId} onChange={e => setTestInput(p => ({ ...p, payerId: e.target.value }))} placeholder="e.g. 00510, AETNA, UHC001" />
              </div>
              <div>
                <label className="form-label">ISA15 (P=Production / T=Test)</label>
                <select value={testInput.isa15} onChange={e => setTestInput(p => ({ ...p, isa15: e.target.value }))} className="form-input">
                  <option value="P">P — Production</option>
                  <option value="T">T — Test</option>
                </select>
              </div>
              <div>
                <label className="form-label">Direction</label>
                <select value={testInput.direction} onChange={e => setTestInput(p => ({ ...p, direction: e.target.value }))} className="form-input">
                  <option>Outbound</option>
                  <option>Inbound</option>
                </select>
              </div>
              <button onClick={runTest} className="btn btn-primary">▶ Run Test</button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {testResult && (
              <div style={{ background: '#fff', border: '2px solid ' + (testResult.id === 'rr-007' ? '#f59e0b' : '#10b981'), borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10, color: testResult.id === 'rr-007' ? '#d97706' : '#059669' }}>
                  {testResult.id === 'rr-007' ? '⚠️ Unmatched — Dead Letter Queue' : '✅ Matched Rule: ' + testResult.name}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[['Target', testResult.target], ['Protocol', testResult.protocol], ['Schedule', testResult.schedule], ['Fallback', testResult.fallback]].map(([k,v]) => (
                    <div key={k} style={{ padding: '6px 10px', borderRadius: 7, background: '#f8fafc', border: '1px solid var(--border)', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 10 }}>{k}</span>
                      <span style={{ fontWeight: 700 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {evalTrace.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 12, color: 'var(--text-muted)' }}>📋 Evaluation Trace — {evalTrace.length} rules checked</div>
                <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                  {evalTrace.map((entry, i) => (
                    <div key={entry.rule.id} style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6', background: entry.matched ? '#f0fdf4' : '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: entry.matched ? '#10b981' : '#e5e7eb', color: entry.matched ? '#fff' : '#9ca3af', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{entry.matched ? '✓' : i + 1 < evalTrace.length ? '✗' : '→'}</span>
                        <span style={{ fontWeight: 700, fontSize: 12, color: entry.matched ? '#166534' : '#374151' }}>P{entry.rule.priority} {entry.rule.name}</span>
                        {entry.matched && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 8, background: '#d1fae5', color: '#065f46', fontWeight: 700 }}>MATCHED</span>}
                        {!entry.matched && i + 1 === evalTrace.length && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 8, background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>FALLBACK</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 30 }}>
                        {entry.condResults.map((c, ci) => (
                          <span key={ci} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, border: '1px solid ' + (c.pass ? '#86efac' : '#fca5a5'), background: c.pass ? '#f0fdf4' : '#fff7f7', fontFamily: 'monospace', color: c.pass ? '#166534' : '#991b1b' }}>
                            {c.pass ? '✓' : '✗'} {c.field} {c.op === 'any' ? '(any)' : `= "${c.value}"`}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!testResult && evalTrace.length === 0 && (
              <div style={{ background: '#f8fafc', border: '2px dashed var(--border)', borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔀</div>
                <div style={{ fontWeight: 600 }}>Enter test parameters and click Run Test to see step-by-step routing evaluation</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Rule Modal */}
      {showAddRule && (
        <div className="modal-backdrop" onClick={() => setShowAddRule(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 540 }}>
            <div className="modal-header"><h3>+ Add Routing Rule</h3><button className="modal-close" onClick={() => setShowAddRule(false)}>×</button></div>
            <div className="modal-body" style={{ display: 'grid', gap: 12 }}>
              <div><label className="form-label">Rule Name *</label><input className="form-input" value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Cigna 837P → Waystar" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label className="form-label">TX Type Condition</label>
                  <select className="form-input" value={newRule.txType} onChange={e => setNewRule(p => ({ ...p, txType: e.target.value }))}>
                    {['Any', '837P', '837I', '835', '270', '271', '276', '277'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="form-label">Payer ID (contains)</label><input className="form-input" value={newRule.payerId} onChange={e => setNewRule(p => ({ ...p, payerId: e.target.value }))} placeholder="e.g. CIGNA, 00510" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label className="form-label">ISA15</label>
                  <select className="form-input" value={newRule.isa15} onChange={e => setNewRule(p => ({ ...p, isa15: e.target.value }))}>
                    <option value="Any">Any</option><option value="P">P — Production</option><option value="T">T — Test</option>
                  </select>
                </div>
                <div><label className="form-label">Target Partner</label>
                  <select className="form-input" value={newRule.target} onChange={e => setNewRule(p => ({ ...p, target: e.target.value }))}>
                    {['Availity', 'Change Healthcare', 'Waystar', 'Optum / UHC Direct', 'Availity TEST', 'Dead Letter Queue'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div><label className="form-label">Protocol</label>
                  <select className="form-input" value={newRule.protocol} onChange={e => setNewRule(p => ({ ...p, protocol: e.target.value }))}>
                    {['SFTP', 'HTTPS/API', 'AS2'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="form-label">Schedule</label>
                  <select className="form-input" value={newRule.schedule} onChange={e => setNewRule(p => ({ ...p, schedule: e.target.value }))}>
                    {['Immediate', 'Batch 15 min', 'Batch Hourly', 'On Receipt'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="form-label">Retry Policy</label>
                  <select className="form-input" value={newRule.retryPolicy} onChange={e => setNewRule(p => ({ ...p, retryPolicy: e.target.value }))}>
                    {['3x / 5 min', '2x / 3 min', 'None', 'Manual Review'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddRule(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                if (!newRule.name.trim()) { showToast('Rule name is required.'); return; }
                const conditions = [];
                if (newRule.txType !== 'Any') conditions.push({ field: 'TxType', op: 'equals', value: newRule.txType });
                if (newRule.payerId.trim()) conditions.push({ field: 'PayerID', op: 'starts_with', value: newRule.payerId.trim() });
                if (newRule.isa15 !== 'Any') conditions.push({ field: 'ISA15', op: 'equals', value: newRule.isa15 });
                if (conditions.length === 0) conditions.push({ field: '*', op: 'any', value: '' });
                const maxPriority = Math.max(...rules.filter(r => r.id !== 'rr-007').map(r => r.priority), 0);
                const added = {
                  id: 'rr-' + Date.now(), priority: maxPriority + 1, name: newRule.name,
                  status: 'Active', conditions, action: `Route to ${newRule.target}`,
                  target: newRule.target, protocol: newRule.protocol, fallback: newRule.fallback,
                  schedule: newRule.schedule, retryPolicy: newRule.retryPolicy,
                  triggerCount: 0, successRate: 100, lastTriggered: new Date().toISOString(),
                };
                setRules(prev => [...prev.filter(r => r.id !== 'rr-007'), added, ...prev.filter(r => r.id === 'rr-007')]);
                setNewRule({ name: '', txType: 'Any', payerId: '', isa15: 'Any', target: 'Availity', protocol: 'SFTP', schedule: 'Immediate', retryPolicy: '3x / 5 min', fallback: 'Dead Letter Queue' });
                showToast('Routing rule "' + newRule.name + '" added.');
                setShowAddRule(false);
              }}>Save Rule</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {editRule && (
        <div className="modal-backdrop" onClick={() => setEditRule(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 480 }}>
            <div className="modal-header"><h3>Edit Rule — {editRule.name}</h3><button className="modal-close" onClick={() => setEditRule(null)}>×</button></div>
            <div className="modal-body" style={{ display: 'grid', gap: 12 }}>
              <div><label className="form-label">Rule Name</label><input className="form-input" value={editRule.name} onChange={e => setEditRule(p => ({ ...p, name: e.target.value }))} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label className="form-label">Target Partner</label>
                  <select className="form-input" value={editRule.target} onChange={e => setEditRule(p => ({ ...p, target: e.target.value }))}>
                    {['Availity', 'Change Healthcare', 'Waystar', 'Optum / UHC Direct', 'Availity TEST', 'Dead Letter Queue'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="form-label">Status</label>
                  <select className="form-input" value={editRule.status} onChange={e => setEditRule(p => ({ ...p, status: e.target.value }))}>
                    <option>Active</option><option>Disabled</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label className="form-label">Schedule</label>
                  <select className="form-input" value={editRule.schedule} onChange={e => setEditRule(p => ({ ...p, schedule: e.target.value }))}>
                    {['Immediate', 'Batch 15 min', 'Batch Hourly', 'On Receipt'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="form-label">Retry Policy</label>
                  <select className="form-input" value={editRule.retryPolicy} onChange={e => setEditRule(p => ({ ...p, retryPolicy: e.target.value }))}>
                    {['3x / 5 min', '2x / 3 min', 'None', 'Manual Review'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditRule(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                setRules(prev => prev.map(r => r.id === editRule.id ? { ...editRule } : r));
                showToast('Rule "' + editRule.name + '" updated.');
                setEditRule(null);
              }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
