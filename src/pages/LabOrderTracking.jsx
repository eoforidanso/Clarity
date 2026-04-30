import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

const URGENCY_STYLES = {
  Stat: { bg: '#fee2e2', color: '#991b1b', icon: '🔴' },
  Urgent: { bg: '#fef3c7', color: '#92400e', icon: '🟡' },
  Routine: { bg: '#eff6ff', color: '#1e40af', icon: '🔵' },
};

const STATUS_STYLES = {
  Ordered: { bg: '#e0e7ff', color: '#3730a3', icon: '📝' },
  Collected: { bg: '#fef3c7', color: '#92400e', icon: '🩸' },
  'In Process': { bg: '#dbeafe', color: '#1e40af', icon: '🔬' },
  Resulted: { bg: '#dcfce7', color: '#166534', icon: '✅' },
  Cancelled: { bg: '#f1f5f9', color: '#64748b', icon: '🚫' },
};

const MOCK_LAB_ORDERS = [
  { id: 'lo1', patient: 'Aniyah Brooks', patientId: 'P001', orderDate: '2026-01-06', test: 'Lithium Level', code: '80178', urgency: 'Routine', status: 'Resulted', provider: 'Dr. Christopher Adams', resultDate: '2026-01-06', resultValue: '0.8 mEq/L', refRange: '0.6–1.2 mEq/L', flag: 'Normal', lab: 'Quest Diagnostics' },
  { id: 'lo2', patient: 'Aniyah Brooks', patientId: 'P001', orderDate: '2026-01-06', test: 'TSH', code: '84443', urgency: 'Routine', status: 'Resulted', provider: 'Dr. Christopher Adams', resultDate: '2026-01-06', resultValue: '2.1 mIU/L', refRange: '0.4–4.0 mIU/L', flag: 'Normal', lab: 'Quest Diagnostics' },
  { id: 'lo3', patient: 'Marcus Rivera', patientId: 'P002', orderDate: '2026-01-06', test: 'CBC with Differential', code: '85025', urgency: 'Routine', status: 'In Process', provider: 'Dr. Christopher Adams', resultDate: null, resultValue: null, refRange: null, flag: null, lab: 'LabCorp' },
  { id: 'lo4', patient: 'Marcus Rivera', patientId: 'P002', orderDate: '2026-01-06', test: 'CMP-14', code: '80053', urgency: 'Routine', status: 'In Process', provider: 'Dr. Christopher Adams', resultDate: null, resultValue: null, refRange: null, flag: null, lab: 'LabCorp' },
  { id: 'lo5', patient: 'Sarah Chen', patientId: 'P003', orderDate: '2026-01-06', test: 'Urine Drug Screen', code: '80307', urgency: 'Stat', status: 'Collected', provider: 'Dr. Christopher Adams', resultDate: null, resultValue: null, refRange: null, flag: null, lab: 'In-House' },
  { id: 'lo6', patient: 'David Okafor', patientId: 'P004', orderDate: '2026-01-05', test: 'Valproic Acid Level', code: '80164', urgency: 'Urgent', status: 'Resulted', provider: 'Dr. Christopher Adams', resultDate: '2026-01-06', resultValue: '95 mcg/mL', refRange: '50–100 mcg/mL', flag: 'Normal', lab: 'Quest Diagnostics' },
  { id: 'lo7', patient: 'Emily Tran', patientId: 'P005', orderDate: '2026-01-06', test: 'Prolactin Level', code: '84146', urgency: 'Routine', status: 'Ordered', provider: 'Dr. Christopher Adams', resultDate: null, resultValue: null, refRange: null, flag: null, lab: 'Quest Diagnostics' },
  { id: 'lo8', patient: 'Emily Tran', patientId: 'P005', orderDate: '2026-01-06', test: 'Fasting Glucose', code: '82947', urgency: 'Routine', status: 'Ordered', provider: 'Dr. Christopher Adams', resultDate: null, resultValue: null, refRange: null, flag: null, lab: 'Quest Diagnostics' },
  { id: 'lo9', patient: 'Aniyah Brooks', patientId: 'P001', orderDate: '2026-01-05', test: 'Renal Panel', code: '80069', urgency: 'Routine', status: 'Resulted', provider: 'Dr. Christopher Adams', resultDate: '2026-01-05', resultValue: 'See full panel', refRange: '—', flag: 'Normal', lab: 'Quest Diagnostics' },
  { id: 'lo10', patient: 'David Okafor', patientId: 'P004', orderDate: '2026-01-04', test: 'Hepatic Function Panel', code: '80076', urgency: 'Routine', status: 'Resulted', provider: 'Dr. Christopher Adams', resultDate: '2026-01-05', resultValue: 'ALT 42 U/L', refRange: '7–56 U/L', flag: 'Normal', lab: 'LabCorp' },
  { id: 'lo11', patient: 'Sarah Chen', patientId: 'P003', orderDate: '2026-01-03', test: 'Clozapine Level', code: '80159', urgency: 'Urgent', status: 'Resulted', provider: 'Dr. Christopher Adams', resultDate: '2026-01-04', resultValue: '450 ng/mL', refRange: '350–600 ng/mL', flag: 'Normal', lab: 'Quest Diagnostics' },
  { id: 'lo12', patient: 'Marcus Rivera', patientId: 'P002', orderDate: '2026-01-06', test: 'HbA1c', code: '83036', urgency: 'Routine', status: 'Collected', provider: 'Dr. Christopher Adams', resultDate: null, resultValue: null, refRange: null, flag: null, lab: 'LabCorp' },
];

export default function LabOrderTracking() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState(MOCK_LAB_ORDERS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterUrgency, setFilterUrgency] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({ patient: '', test: '', urgency: 'Routine', lab: 'Quest Diagnostics' });

  const handlePrintList = (list) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const providerName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}${currentUser.credentials ? ', ' + currentUser.credentials : ''}` : 'Unknown';

    const rows = list.map(o => `
      <tr>
        <td>${o.patient}</td>
        <td><strong>${o.test}</strong></td>
        <td style="font-family:monospace;color:#1e40af">${o.code}</td>
        <td>${o.urgency}</td>
        <td>${o.status}</td>
        <td>${o.lab}</td>
        <td>${o.orderDate}</td>
        <td>${o.resultValue || '—'}</td>
        <td>${o.flag || '—'}</td>
      </tr>`).join('');

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Lab Orders — ${dateStr}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1d4ed8; padding-bottom: 10px; margin-bottom: 16px; }
  .title { font-size: 18px; font-weight: 800; color: #1d4ed8; }
  .meta { font-size: 11px; color: #374151; margin-top: 4px; line-height: 1.6; }
  .header-right { text-align: right; font-size: 11px; color: #374151; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #eff6ff; color: #1e3a8a; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; border: 1px solid #dbeafe; text-align: left; }
  td { padding: 7px 10px; border: 1px solid #e5e7eb; vertical-align: top; font-size: 11.5px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .footer { margin-top: 16px; font-size: 10px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 8px; }
  @media print { body { padding: 8px 14px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">🔬 Lab Order Tracking Report</div>
      <div class="meta">Clarity Behavioral Health · 200 N Michigan Ave, Suite 1400, Chicago, IL 60601</div>
      <div class="meta">Provider: <strong>${providerName}</strong> &nbsp;|&nbsp; Filters: Status = ${filterStatus}, Urgency = ${filterUrgency}${search ? `, Search = "${search}"` : ''}</div>
    </div>
    <div class="header-right">
      <div>Date: <strong>${dateStr}</strong></div>
      <div>Time: <strong>${timeStr}</strong></div>
      <div style="margin-top:6px;font-weight:800">${list.length} orders</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Patient</th><th>Test</th><th>CPT</th><th>Urgency</th><th>Status</th>
        <th>Lab</th><th>Ordered</th><th>Result</th><th>Flag</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Printed ${dateStr} at ${timeStr} · Clarity EHR · Confidential — For authorized use only</div>
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const filtered = useMemo(() => {
    let list = [...orders];
    if (filterStatus !== 'All') list = list.filter(o => o.status === filterStatus);
    if (filterUrgency !== 'All') list = list.filter(o => o.urgency === filterUrgency);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(o => o.patient.toLowerCase().includes(q) || o.test.toLowerCase().includes(q) || o.code.includes(q));
    }
    return list.sort((a, b) => {
      const urgOrder = { Stat: 0, Urgent: 1, Routine: 2 };
      const statOrder = { Ordered: 0, Collected: 1, 'In Process': 2, Resulted: 3, Cancelled: 4 };
      if (urgOrder[a.urgency] !== urgOrder[b.urgency]) return urgOrder[a.urgency] - urgOrder[b.urgency];
      return statOrder[a.status] - statOrder[b.status];
    });
  }, [orders, search, filterStatus, filterUrgency]);

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => ['Ordered', 'Collected', 'In Process'].includes(o.status)).length,
    resulted: orders.filter(o => o.status === 'Resulted').length,
    stat: orders.filter(o => o.urgency === 'Stat' && o.status !== 'Resulted').length,
    abnormal: orders.filter(o => o.flag && o.flag !== 'Normal').length,
  }), [orders]);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>🔬 Lab Order Tracking</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Cross-patient lab order dashboard — track orders from requisition to result</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => handlePrintList(filtered)}>🖨️ Print List</button>
          <button className="btn btn-primary" onClick={() => setShowNewOrder(true)}>➕ New Order</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '🧪', val: stats.total, label: 'Total Orders', bg: '#eff6ff' },
          { icon: '⏳', val: stats.pending, label: 'Pending', bg: '#fef3c7' },
          { icon: '✅', val: stats.resulted, label: 'Resulted', bg: '#dcfce7' },
          { icon: '🔴', val: stats.stat, label: 'Stat Pending', bg: '#fee2e2' },
          { icon: '⚠️', val: stats.abnormal, label: 'Abnormal', bg: '#fff7ed' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{s.icon}</div>
            <div><div style={{ fontSize: 18, fontWeight: 800 }}>{s.val}</div><div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <input className="form-input" placeholder="Search patient, test, or CPT code..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
        <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 140, fontSize: 12 }}>
          <option value="All">All Statuses</option>
          {Object.keys(STATUS_STYLES).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-input" value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)} style={{ width: 130, fontSize: 12 }}>
          <option value="All">All Urgency</option>
          {Object.keys(URGENCY_STYLES).map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {/* Pipeline View */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {['Ordered', 'Collected', 'In Process', 'Resulted'].map(status => {
          const st = STATUS_STYLES[status];
          const items = filtered.filter(o => o.status === status);
          return (
            <div key={status} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: st.bg, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: st.color }}>{st.icon} {status}</span>
                <span style={{ background: '#fff', padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 800 }}>{items.length}</span>
              </div>
              <div style={{ padding: 8, maxHeight: 200, overflowY: 'auto' }}>
                {items.map(o => {
                  const urg = URGENCY_STYLES[o.urgency];
                  return (
                    <div key={o.id} onClick={() => setSelectedOrder(o)}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #f1f5f9', marginBottom: 4, cursor: 'pointer', fontSize: 11 }}>
                      <div style={{ fontWeight: 700 }}>{o.test}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{o.patient}</div>
                      <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 8, fontWeight: 700, background: urg.bg, color: urg.color, display: 'inline-block', marginTop: 3 }}>{urg.icon} {o.urgency}</span>
                    </div>
                  );
                })}
                {items.length === 0 && <div style={{ textAlign: 'center', padding: 12, color: '#94a3b8', fontSize: 10 }}>No orders</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
              {['Patient', 'Test', 'CPT', 'Urgency', 'Status', 'Lab', 'Ordered', 'Result', ''].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const urg = URGENCY_STYLES[o.urgency];
              const st = STATUS_STYLES[o.status];
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setSelectedOrder(o)}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{o.patient}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{o.test}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700 }}>{o.code}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: urg.bg, color: urg.color }}>{urg.icon} {o.urgency}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color }}>{st.icon} {o.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 11 }}>{o.lab}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11 }}>{o.orderDate}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, fontWeight: o.resultValue ? 700 : 400, color: o.flag === 'Normal' ? '#059669' : o.flag ? '#dc2626' : '#94a3b8' }}>
                    {o.resultValue || '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button className="btn btn-sm btn-secondary">👁️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedOrder(null); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #1e40af, #6366f1)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>🔬 {selectedOrder.test}</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>CPT {selectedOrder.code} — {selectedOrder.patient}</div>
            </div>
            <div style={{ padding: 22 }}>
              {[
                ['Patient', selectedOrder.patient],
                ['Provider', selectedOrder.provider],
                ['Laboratory', selectedOrder.lab],
                ['Urgency', selectedOrder.urgency],
                ['Status', selectedOrder.status],
                ['Ordered', selectedOrder.orderDate],
                ['Result Date', selectedOrder.resultDate || '—'],
                ['Result', selectedOrder.resultValue || 'Pending'],
                ['Reference Range', selectedOrder.refRange || '—'],
                ['Flag', selectedOrder.flag || '—'],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{l}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: l === 'Flag' && v !== 'Normal' && v !== '—' ? '#dc2626' : 'inherit' }}>{v}</span>
                </div>
              ))}
              {selectedOrder.status !== 'Resulted' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                    setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: 'Resulted', resultDate: new Date().toISOString().split('T')[0], resultValue: 'WNL', flag: 'Normal' } : o));
                    setSelectedOrder(null);
                  }}>✅ Mark Resulted</button>
                  <button className="btn btn-secondary" style={{ flex: 1, color: '#dc2626' }} onClick={() => {
                    setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: 'Cancelled' } : o));
                    setSelectedOrder(null);
                  }}>🚫 Cancel Order</button>
                </div>
              )}
            </div>
            <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {showNewOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowNewOrder(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: '#fff', fontWeight: 800, fontSize: 15 }}>➕ New Lab Order</div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[['Patient Name', 'patient'], ['Test Name', 'test'], ['Lab', 'lab']].map(([label, key]) => (
                <div key={key}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>{label}</label>
                  <input className="form-input" value={newOrderForm[key]} onChange={e => setNewOrderForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Urgency</label>
                <select className="form-input" value={newOrderForm.urgency} onChange={e => setNewOrderForm(f => ({ ...f, urgency: e.target.value }))}>
                  {['Routine', 'Urgent', 'Stat'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowNewOrder(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { if (newOrderForm.patient && newOrderForm.test) { setOrders(prev => [{ id: `lo-${Date.now()}`, patient: newOrderForm.patient, patientId: 'P-new', orderDate: new Date().toISOString().slice(0,10), test: newOrderForm.test, code: '', urgency: newOrderForm.urgency, status: 'Ordered', provider: 'Dr. Christopher Adams', resultDate: null, resultValue: null, refRange: null, flag: null, lab: newOrderForm.lab }, ...prev]); setNewOrderForm({ patient: '', test: '', urgency: 'Routine', lab: 'Quest Diagnostics' }); setShowNewOrder(false); } }}>Place Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
