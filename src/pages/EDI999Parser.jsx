import React, { useState, useMemo, useEffect, useRef } from 'react';

// ─── 999 / 277CA Acknowledgment Data ─────────────────────────────────────────
const ACK_RECORDS = [
  {
    id: 'ack-001', type: '999', receivedAt: '2026-05-23T09:13:00', isaControlNum: '000000101',
    gsControlNum: '0001', stControlNum: '0001', refTxSet: '837P', sender: 'Availity', status: 'Accepted',
    ak1: 'HC', ak9: 'A', ak2Groups: [{ gsCtrl: '0001', ak3s: [], ak9: 'A' }],
    originalFile: 'CLM_20260523_001.edi', processingTime: 1.1,
  },
  {
    id: 'ack-002', type: '999', receivedAt: '2026-05-23T08:22:30', isaControlNum: '000000102',
    gsControlNum: '0002', stControlNum: '0002', refTxSet: '837P', sender: 'Change Healthcare', status: 'Rejected',
    ak1: 'HC', ak9: 'R', ak2Groups: [{
      gsCtrl: '0002', ak9: 'R',
      ak3s: [
        { ak301: 'NM1', ak302: '85', ak303: '6', ak4s: [{ ak401: '9', ak402: '3', ak403: '1', ak404: 'NPI is required for Billing Provider' }] },
        { ak301: 'CLM', ak302: '05', ak303: '5', ak4s: [{ ak401: '3', ak402: '1', ak403: '1', ak404: 'Invalid facility type code' }] },
      ],
    }],
    originalFile: 'CLM_20260523_002.edi', processingTime: 1.8,
  },
  {
    id: 'ack-003', type: '999', receivedAt: '2026-05-23T09:06:00', isaControlNum: '000000103',
    gsControlNum: '0003', stControlNum: '0003', refTxSet: '837P', sender: 'Availity TEST', status: 'Accepted',
    ak1: 'HC', ak9: 'A', ak2Groups: [{ gsCtrl: '0003', ak3s: [], ak9: 'A' }],
    originalFile: 'TEST_CLM_20260523.edi', processingTime: 0.9,
  },
  {
    id: 'ack-004', type: '277CA', receivedAt: '2026-05-23T07:32:00', isaControlNum: '000000104',
    gsControlNum: '0098', stControlNum: '0098', refTxSet: '837P', sender: 'Waystar', status: 'Accepted',
    ak1: 'HN', ak9: 'A', ak2Groups: [{ gsCtrl: '0098', ak3s: [], ak9: 'A' }],
    originalFile: 'CLM_20260522_003.edi', processingTime: 0.6,
    claimStatuses: [
      { claimId: 'CLM-2026-007', status: 'A1 — Claim received', payerId: 'CIGNA', actionDate: '2026-05-23' },
      { claimId: 'CLM-2026-008', status: 'A1 — Claim received', payerId: 'CIGNA', actionDate: '2026-05-23' },
    ],
  },
  {
    id: 'ack-005', type: '999', receivedAt: '2026-05-22T16:48:00', isaControlNum: '000000097',
    gsControlNum: '0097', stControlNum: '0097', refTxSet: '837P', sender: 'Availity', status: 'Accepted',
    ak1: 'HC', ak9: 'A', ak2Groups: [{ gsCtrl: '0097', ak3s: [], ak9: 'A' }],
    originalFile: 'CLM_20260522_003.edi', processingTime: 2.1,
  },
];

const ERR_DESC = {
  '1': 'Implementation Usage Note: value is coded but not found in the published code list',
  '2': 'Not Used: The segment/element is present, but not used',
  '3': 'Exclusion Condition: usage of the element violates a conditional rule',
  '5': 'Syntax Error: element not supported',
  '6': 'Missing Conditional: required element is absent when a conditional trigger element is present',
  '7': 'Too Many Repeats: element exceeds maximum repeat count',
  '8': 'Too Many Components: composite element has more components than expected',
  '9': 'Length Out of Bounds: element value is too long or too short',
};

const AK9_DESC = {
  'A': 'Accepted', 'R': 'Rejected', 'E': 'Accepted with Errors', 'P': 'Partially Accepted',
};

const fmtDt = (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

function AckBadge({ status }) {
  const c = status === 'Accepted' ? { bg: '#d1fae5', col: '#065f46' } : status === 'Rejected' ? { bg: '#fee2e2', col: '#991b1b' } : { bg: '#fef3c7', col: '#92400e' };
  return <span style={{ background: c.bg, color: c.col, padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{status}</span>;
}

function TypeBadge({ type }) {
  const c = type === '999' ? { bg: '#ede9fe', col: '#6d28d9' } : { bg: '#fce7f3', col: '#9d174d' };
  return <span style={{ background: c.bg, color: c.col, padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>{type}</span>;
}

export default function EDI999Parser() {
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toast, setToast] = useState(null);

  // ── Ingestion queue state ──────────────────────────────────
  const INGEST_STATES = ['Received', 'Parsing', 'Validating', 'Applying', 'Complete', 'Error'];
  const [ingestQueue, setIngestQueue] = useState([
    { id: 'qi-001', ackId: 'ack-001', file: 'CLM_20260523_001.999', type: '999', status: 'Complete', progress: 5, claimUpdates: ['CLM-2026-004 → Accepted (999 A)', 'CLM-2026-005 → Accepted (999 A)'], receivedAt: '2026-05-23T09:13:00', error: null },
    { id: 'qi-002', ackId: 'ack-002', file: 'CLM_20260523_002.999', type: '999', status: 'Error', progress: 3, claimUpdates: [], receivedAt: '2026-05-23T08:22:30', error: '2 AK4 errors prevent claim acceptance — fix NPI and facility code' },
    { id: 'qi-003', ackId: 'ack-003', file: 'TEST_CLM_20260523.999', type: '999', status: 'Pending', progress: 0, claimUpdates: [], receivedAt: '2026-05-23T09:06:00', error: null },
    { id: 'qi-004', ackId: 'ack-004', file: 'CLM_20260522_003.277ca', type: '277CA', status: 'Pending', progress: 0, claimUpdates: [], receivedAt: '2026-05-23T07:32:00', error: null },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const processQueue = () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    const pending = ingestQueue.filter(i => i.status === 'Pending');
    let delay = 0;
    pending.forEach((item) => {
      INGEST_STATES.forEach((state, si) => {
        delay += 400 + Math.random() * 200;
        const d = delay;
        setTimeout(() => {
          setIngestQueue(prev => prev.map(q => {
            if (q.id !== item.id) return q;
            if (si === INGEST_STATES.length - 1) {
              const updates = q.type === '277CA'
                ? ['CLM-2026-007 → A1 Received (277CA)', 'CLM-2026-008 → A1 Received (277CA)']
                : ['CLM-2026-006 → Accepted (999 A)'];
              return { ...q, status: 'Complete', progress: si, claimUpdates: updates };
            }
            return { ...q, status: state, progress: si };
          }));
        }, d);
      });
    });
    setTimeout(() => {
      processingRef.current = false;
      setIsProcessing(false);
      showToast('Batch ingestion complete. ' + pending.length + ' acknowledgment(s) processed.');
    }, delay + 200);
  };

  const stats = useMemo(() => ({
    total: ACK_RECORDS.length,
    accepted: ACK_RECORDS.filter(a => a.status === 'Accepted').length,
    rejected: ACK_RECORDS.filter(a => a.status === 'Rejected').length,
    t999: ACK_RECORDS.filter(a => a.type === '999').length,
    t277: ACK_RECORDS.filter(a => a.type === '277CA').length,
    errors: ACK_RECORDS.reduce((s, a) => s + a.ak2Groups.reduce((ss, g) => ss + g.ak3s.length, 0), 0),
  }), []);

  const filtered = ACK_RECORDS.filter(a => {
    if (typeFilter && a.type !== typeFilter) return false;
    if (statusFilter && a.status !== statusFilter) return false;
    return true;
  });

  // Build sample raw 999
  const buildRaw999 = (ack) => {
    if (ack.status === 'Accepted') {
      return `ISA*00*          *00*          *01*${ack.sender.toUpperCase().padEnd(15)}*ZZ*CLARITYEHR     *260523*0913*^*00501*${ack.isaControlNum}*1*P*:~
GS*FA*${ack.sender.toUpperCase()}*CLARITYEHR*20260523*0913*${ack.gsControlNum}*X*005010X231A1~
ST*999*0001*005010X231A1~
AK1*${ack.ak1}*${ack.gsControlNum}*005010X222A1~
AK9*A*1*1*1~
SE*4*0001~
GE*1*${ack.gsControlNum}~
IEA*1*${ack.isaControlNum}~`;
    }
    const ak3lines = ack.ak2Groups[0]?.ak3s?.map((ak3, i) =>
      [`AK3*${ak3.ak301}*${ak3.ak302}**${ak3.ak303}~`,
       ...ak3.ak4s.map(ak4 => `AK4*${ak4.ak401}*${ak4.ak402}*${ak4.ak403}*${ak4.ak404}~`)
      ].join('\n')
    ).join('\n') || '';
    return `ISA*00*          *00*          *01*${ack.sender.toUpperCase().padEnd(15)}*ZZ*CLARITYEHR     *260523*0822*^*00501*${ack.isaControlNum}*1*P*:~
GS*FA*${ack.sender.toUpperCase()}*CLARITYEHR*20260523*0822*${ack.gsControlNum}*X*005010X231A1~
ST*999*0001*005010X231A1~
AK1*${ack.ak1}*${ack.gsControlNum}*005010X222A1~
AK2*837*${ack.stControlNum}*005010X222A1~
${ak3lines}
AK5*R*${ack.ak2Groups[0]?.ak3s?.length || 0}~
AK9*R*1*1*0~
SE*${8 + (ack.ak2Groups[0]?.ak3s?.reduce((s,a3) => s + 1 + a3.ak4s.length, 0)||0)}*0001~
GE*1*${ack.gsControlNum}~
IEA*1*${ack.isaControlNum}~`;
  };

  const build277CA = (ack) => `ISA*00*          *00*          *01*${ack.sender.toUpperCase().padEnd(15)}*ZZ*CLARITYEHR     *260523*0732*^*00501*${ack.isaControlNum}*1*P*:~
GS*HN*${ack.sender.toUpperCase()}*CLARITYEHR*20260523*0732*${ack.gsControlNum}*X*005010X214~
ST*277*0001*005010X214~
BHT*0085*08*${ack.gsControlNum}*20260523*0732~
${(ack.claimStatuses||[]).map((cs,i) => `NM1*41*2*CLARITY BEHAVIORAL HEALTH*****46*1234567890~\nTRN*1*${cs.claimId}*9876543210~\nSTC*${cs.status}*${cs.actionDate.replace(/-/g,'')}~`).join('\n')}
SE*${10 + (ack.claimStatuses?.length||0)*3}*0001~
GE*1*${ack.gsControlNum}~
IEA*1*${ack.isaControlNum}~`;

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#059669', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>✅ 999 / 277CA Parser</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Parse and analyze inbound 999 Implementation Acknowledgments and 277CA Claim Acknowledgments with AK3/AK4 error detail</p>
        </div>
        <button onClick={() => showToast('Inbox refreshed — 0 new acknowledgments.')} style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>🔄 Refresh Inbox</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total Acks', value: stats.total, accent: '#6366f1' },
          { label: '999 Acks', value: stats.t999, accent: '#7c3aed' },
          { label: '277CA Acks', value: stats.t277, accent: '#db2777' },
          { label: 'Accepted', value: stats.accepted, accent: '#10b981' },
          { label: 'Rejected', value: stats.rejected, accent: '#ef4444' },
          { label: 'AK4 Errors', value: stats.errors, accent: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', borderLeft: '4px solid ' + s.accent }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 16 }}>
        {[['list','📬 Acknowledgment Inbox'], ['ingestion','⚙️ Auto-Ingestion'], ['segments','📖 Segment Reference']].map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '10px 18px', border: 'none', background: 'transparent', color: activeTab === t ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: activeTab === t ? 700 : 500, fontSize: 13, cursor: 'pointer', borderBottom: '3px solid ' + (activeTab === t ? 'var(--primary)' : 'transparent'), marginBottom: -2 }}>
            {l}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="form-input" style={{ width: 160, fontSize: 12 }}>
              <option value="">All Types</option>
              <option>999</option>
              <option>277CA</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-input" style={{ width: 160, fontSize: 12 }}>
              <option value="">All Statuses</option>
              <option>Accepted</option>
              <option>Rejected</option>
            </select>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {filtered.map(ack => (
              <div key={ack.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 16, cursor: 'pointer', borderLeft: '4px solid ' + (ack.status === 'Rejected' ? '#ef4444' : '#10b981') }} onClick={() => setSelected(ack)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <TypeBadge type={ack.type} />
                      <AckBadge status={ack.status} />
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>ISA {ack.isaControlNum}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{ack.sender}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span>Ref TX: <strong style={{ color: '#374151' }}>{ack.refTxSet}</strong></span>
                      <span>GS: <strong style={{ color: '#374151' }}>{ack.gsControlNum}</strong></span>
                      <span>Original File: <strong style={{ color: '#374151' }}>{ack.originalFile}</strong></span>
                      <span>AK9: <strong style={{ color: '#374151' }}>{ack.ak9} — {AK9_DESC[ack.ak9]}</strong></span>
                      <span>Processing: <strong style={{ color: '#374151' }}>{ack.processingTime}s</strong></span>
                    </div>
                    {ack.status === 'Rejected' && ack.ak2Groups[0]?.ak3s?.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {ack.ak2Groups[0].ak3s.map((ak3, i) => (
                          <div key={i} style={{ padding: '6px 10px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fca5a5', marginBottom: 4 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>
                              AK3: Segment <span style={{ fontFamily: 'monospace' }}>{ak3.ak301}*{ak3.ak302}</span> · Error {ak3.ak303}
                            </div>
                            {ak3.ak4s.map((ak4, j) => (
                              <div key={j} style={{ fontSize: 11, color: '#7f1d1d', marginTop: 2 }}>
                                └ AK4: Element {ak4.ak401} · Code {ak4.ak403} — {ak4.ak404}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    {ack.type === '277CA' && ack.claimStatuses && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {ack.claimStatuses.map(cs => (
                          <span key={cs.claimId} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, background: '#d1fae5', color: '#065f46', fontWeight: 600 }}>
                            {cs.claimId}: {cs.status}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDt(ack.receivedAt)}</span>
                    <button onClick={e => { e.stopPropagation(); setSelected(ack); }} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer' }}>View Raw EDI</button>
                    {ack.status === 'Rejected' && (
                      <button onClick={e => { e.stopPropagation(); showToast('Correction workflow started for ' + ack.originalFile); }} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Fix & Resend</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Auto-Ingestion Queue ── */}
      {activeTab === 'ingestion' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>⚙️ Auto-Ingestion Pipeline</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Received → Parsing → Validating → Applying → Complete</div>
            </div>
            <button onClick={processQueue} disabled={isProcessing || ingestQueue.every(i => i.status !== 'Pending')} className="btn btn-primary" style={{ fontSize: 13, opacity: (isProcessing || ingestQueue.every(i => i.status !== 'Pending')) ? 0.6 : 1 }}>
              {isProcessing ? '⟳ Processing…' : '▶ Process All Pending'}
            </button>
          </div>

          {/* Pipeline visualization */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 20px', background: '#f8fafc', borderRadius: 10, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
            {['Received', 'Parsing', 'Validating', 'Applying', 'Complete'].map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && <span style={{ color: '#9ca3af', fontSize: 14 }}>→</span>}
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: s === 'Complete' ? '#d1fae5' : s === 'Error' ? '#fee2e2' : '#eff6ff', color: s === 'Complete' ? '#065f46' : s === 'Error' ? '#991b1b' : '#1d4ed8' }}>{s}</span>
              </React.Fragment>
            ))}
            <span style={{ color: '#9ca3af', fontSize: 14 }}>→</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: '#fee2e2', color: '#991b1b' }}>Error</span>
          </div>

          {/* Queue items */}
          <div style={{ display: 'grid', gap: 10 }}>
            {ingestQueue.map(item => {
              const STATUS_COLOR = { 'Pending': '#6b7280', 'Received': '#3b82f6', 'Parsing': '#8b5cf6', 'Validating': '#f59e0b', 'Applying': '#0891b2', 'Complete': '#059669', 'Error': '#dc2626' };
              const col = STATUS_COLOR[item.status] || '#6b7280';
              const ack = ACK_RECORDS.find(a => a.id === item.ackId);
              return (
                <div key={item.id} style={{ background: '#fff', border: `1px solid ${item.status === 'Error' ? '#fca5a5' : item.status === 'Complete' ? '#86efac' : 'var(--border)'}`, borderRadius: 12, padding: 16, borderLeft: `4px solid ${col}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{item.file}</span>
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: item.type === '999' ? '#ede9fe' : '#fce7f3', color: item.type === '999' ? '#6d28d9' : '#9d174d', fontWeight: 700, fontFamily: 'monospace' }}>{item.type}</span>
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: col + '22', color: col, fontWeight: 700 }}>{item.status}</span>
                      </div>
                      {item.status !== 'Pending' && item.status !== 'Error' && (
                        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                          {['Received','Parsing','Validating','Applying','Complete'].map((s, si) => (
                            <div key={s} style={{ height: 6, flex: 1, borderRadius: 3, background: si <= item.progress ? col : '#e5e7eb', transition: 'background 0.3s' }} />
                          ))}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ISA# {ack?.isaControlNum} · {ack?.sender} · Received {fmtDt(item.receivedAt)}</div>
                      {item.error && <div style={{ marginTop: 6, fontSize: 11, color: '#dc2626', background: '#fff7f7', padding: '6px 10px', borderRadius: 6 }}>⚠️ {item.error}</div>}
                      {item.claimUpdates.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Claim Updates Applied</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {item.claimUpdates.map((u, i) => (
                              <span key={i} style={{ fontSize: 11, padding: '2px 9px', borderRadius: 5, background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', fontWeight: 600 }}>{u}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {item.status === 'Error' && <button onClick={() => { setIngestQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'Pending', progress: 0, error: null, claimUpdates: [] } : q)); showToast('Queued for re-processing.'); }} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 7, border: '1px solid #fca5a5', background: '#fff7f7', color: '#dc2626', fontWeight: 700, cursor: 'pointer' }}>🔄 Retry</button>}
                      {item.status === 'Pending' && <button onClick={() => { const item2 = item; setIngestQueue(prev => prev.map(q => q.id === item2.id ? { ...q, status: 'Received', progress: 0 } : q)); }} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 7, border: '1px solid #93c5fd', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer' }}>▶ Process</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Claim update summary */}
          {ingestQueue.some(i => i.claimUpdates.length > 0) && (
            <div style={{ background: '#fff', border: '1px solid #86efac', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10, color: '#166534' }}>📋 Claim Status Updates Applied</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {ingestQueue.filter(i => i.claimUpdates.length > 0).flatMap(i => i.claimUpdates.map((u, ci) => ({ key: i.id + '-' + ci, ackFile: i.file, update: u }))).map(entry => (
                  <div key={entry.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderRadius: 7, background: '#f0fdf4', border: '1px solid #d1fae5', fontSize: 12 }}>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span>
                    <span style={{ fontWeight: 600 }}>{entry.update}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>from {entry.ackFile}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'segments' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* AK Error Codes */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: 14 }}>AK3/AK4 Error Code Reference</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Error Code</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Description</th>
              </tr></thead>
              <tbody>
                {Object.entries(ERR_DESC).map(([code, desc], i) => (
                  <tr key={code} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontWeight: 800, color: '#dc2626', fontSize: 13 }}>{code}</td>
                    <td style={{ padding: '9px 14px', color: '#374151' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AK9 Code Reference */}
          <div>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: 14 }}>AK9 Functional Group Response</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Code</th>
                  <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Meaning</th>
                </tr></thead>
                <tbody>
                  {Object.entries(AK9_DESC).map(([code, desc], i) => (
                    <tr key={code} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontWeight: 800, color: '#7c3aed', fontSize: 13 }}>{code}</td>
                      <td style={{ padding: '9px 14px', fontWeight: 600, color: code === 'A' ? '#059669' : code === 'R' ? '#dc2626' : '#d97706' }}>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ background: '#0f172a', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>999 SEGMENT STRUCTURE</div>
              <pre style={{ margin: 0, color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace', lineHeight: 2 }}>
                {`ISA  — Interchange Control Header
GS   — Functional Group Header
ST*999 — Transaction Set Header
  AK1  — Functional Group Response
    AK2  — Transaction Set Response Header
      AK3  — Data Segment Note (error segment)
        AK4  — Data Element Note (error element)
      AK5  — Transaction Set Response Trailer
  AK9  — Functional Group Response Trailer
SE   — Transaction Set Trailer
GE   — Functional Group Trailer
IEA  — Interchange Control Trailer`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Raw EDI Modal */}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 780, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ background: '#0f172a', color: '#fff', margin: -20, padding: '16px 20px', marginBottom: 0, borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{selected.type} — ISA {selected.isaControlNum}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{selected.sender} · {fmtDt(selected.receivedAt)}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <AckBadge status={selected.status} />
                <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 18 }}>×</button>
              </div>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                Raw {selected.type} acknowledgment for <strong>{selected.originalFile}</strong>
              </div>
              <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 10, fontSize: 11, lineHeight: 1.8, overflowX: 'auto', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 440, overflowY: 'auto', margin: 0 }}>
                {selected.type === '277CA' ? build277CA(selected) : buildRaw999(selected)}
              </pre>
              {selected.status === 'Rejected' && (
                <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5' }}>
                  <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>⛔ Parsed Errors ({selected.ak2Groups[0]?.ak3s?.length || 0})</div>
                  {selected.ak2Groups[0]?.ak3s?.map((ak3, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#7f1d1d' }}>AK3: Segment {ak3.ak301}*{ak3.ak302} (Error {ak3.ak303} — {ERR_DESC[ak3.ak303] || 'Unknown'})</div>
                      {ak3.ak4s.map((ak4, j) => (
                        <div key={j} style={{ fontSize: 11, color: '#991b1b', marginTop: 3, marginLeft: 12 }}>
                          AK4: Element {ak4.ak401}, Position {ak4.ak402}, Error Code {ak4.ak403} — {ak4.ak404}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {selected.status === 'Rejected' && (
                <button className="btn btn-secondary" onClick={() => { showToast('Correction workflow started.'); setSelected(null); }}>Fix & Resend</button>
              )}
              <button className="btn btn-primary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
