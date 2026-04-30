import React, { useState, useMemo } from 'react';

const STATEMENT_STATUS = ['Draft', 'Sent', 'Viewed', 'Paid', 'Partial', 'Overdue', 'Collections'];
const STATUS_COLORS = {
  Draft:       { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
  Sent:        { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
  Viewed:      { bg: '#e0e7ff', color: '#3730a3', dot: '#6366f1' },
  Paid:        { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  Partial:     { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  Overdue:     { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  Collections: { bg: '#fecaca', color: '#7f1d1d', dot: '#b91c1c' },
};

const MOCK_STATEMENTS = [
  { id: 'st-1', patientName: 'James Anderson', mrn: 'MRN-001', email: 'james.a@email.com', status: 'Sent', generatedDate: '2026-04-01', dueDate: '2026-04-30', statementPeriod: 'Mar 2026', totalCharges: 480.00, insurancePaid: 384.00, adjustments: 24.00, patientResponsibility: 72.00, amountPaid: 0, balance: 72.00, lineItems: [{ date: '2026-03-10', desc: '99214 — Office Visit (Moderate)', charge: 240.00, insPaid: 192.00, adj: 12.00, ptResp: 36.00 }, { date: '2026-03-24', desc: '90834 — Psychotherapy 38-52 min', charge: 240.00, insPaid: 192.00, adj: 12.00, ptResp: 36.00 }], paymentPlan: null },
  { id: 'st-2', patientName: 'Maria Garcia', mrn: 'MRN-002', email: 'maria.g@email.com', status: 'Partial', generatedDate: '2026-03-15', dueDate: '2026-04-15', statementPeriod: 'Feb 2026', totalCharges: 680.00, insurancePaid: 510.00, adjustments: 34.00, patientResponsibility: 136.00, amountPaid: 50.00, balance: 86.00, lineItems: [{ date: '2026-02-05', desc: '90792 — Psychiatric Eval w/ Medical', charge: 440.00, insPaid: 330.00, adj: 22.00, ptResp: 88.00 }, { date: '2026-02-19', desc: '99213 — Office Visit (Low)', charge: 240.00, insPaid: 180.00, adj: 12.00, ptResp: 48.00 }], paymentPlan: { monthlyAmount: 43.00, totalRemaining: 86.00, nextPayment: '2026-05-01', payments: 2 } },
  { id: 'st-3', patientName: 'Robert Chen', mrn: 'MRN-003', email: 'robert.c@email.com', status: 'Overdue', generatedDate: '2026-02-28', dueDate: '2026-03-28', statementPeriod: 'Jan-Feb 2026', totalCharges: 920.00, insurancePaid: 680.00, adjustments: 46.00, patientResponsibility: 194.00, amountPaid: 0, balance: 194.00, lineItems: [{ date: '2026-01-15', desc: '90791 — Psychiatric Diagnostic Eval', charge: 480.00, insPaid: 360.00, adj: 24.00, ptResp: 96.00 }, { date: '2026-02-05', desc: '99214 — Office Visit (Moderate)', charge: 240.00, insPaid: 180.00, adj: 12.00, ptResp: 48.00 }, { date: '2026-02-19', desc: '90832 — Psychotherapy 16-37 min', charge: 200.00, insPaid: 140.00, adj: 10.00, ptResp: 50.00 }], paymentPlan: null },
  { id: 'st-4', patientName: 'Ashley Kim', mrn: 'MRN-004', email: 'ashley.k@email.com', status: 'Paid', generatedDate: '2026-03-01', dueDate: '2026-03-30', statementPeriod: 'Feb 2026', totalCharges: 240.00, insurancePaid: 192.00, adjustments: 12.00, patientResponsibility: 36.00, amountPaid: 36.00, balance: 0, lineItems: [{ date: '2026-02-12', desc: '99213 — Office Visit (Low)', charge: 240.00, insPaid: 192.00, adj: 12.00, ptResp: 36.00 }], paymentPlan: null },
  { id: 'st-5', patientName: 'Dorothy Wilson', mrn: 'MRN-005', email: 'dorothy.w@email.com', status: 'Viewed', generatedDate: '2026-04-10', dueDate: '2026-05-10', statementPeriod: 'Mar 2026', totalCharges: 280.00, insurancePaid: 224.00, adjustments: 0, patientResponsibility: 56.00, amountPaid: 0, balance: 56.00, lineItems: [{ date: '2026-03-18', desc: '99214 — Office Visit (Moderate)', charge: 280.00, insPaid: 224.00, adj: 0, ptResp: 56.00 }], paymentPlan: null },
];

export default function PatientStatements() {
  const [statements, setStatements] = useState(MOCK_STATEMENTS);
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedStmt, setSelectedStmt] = useState(null);
  const [showPaymentPlan, setShowPaymentPlan] = useState(false);
  const [planForm, setPlanForm] = useState({ months: 3 });
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchDone, setBatchDone] = useState(false);
  const [emailedIds, setEmailedIds] = useState(new Set());

  const filtered = useMemo(() => {
    let list = [...statements];
    if (filterStatus !== 'All') list = list.filter(s => s.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.patientName.toLowerCase().includes(q) || s.mrn.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.generatedDate) - new Date(a.generatedDate));
  }, [statements, filterStatus, search]);

  const stats = useMemo(() => ({
    totalOutstanding: statements.reduce((s, st) => s + st.balance, 0),
    totalCollected: statements.reduce((s, st) => s + st.amountPaid, 0),
    overdue: statements.filter(s => s.status === 'Overdue' || s.status === 'Collections').length,
    onPaymentPlan: statements.filter(s => s.paymentPlan).length,
    paidInFull: statements.filter(s => s.status === 'Paid').length,
  }), [statements]);

  const setupPaymentPlan = () => {
    if (!selectedStmt) return;
    const monthlyAmount = planForm.months > 0 ? Math.ceil(selectedStmt.balance / planForm.months) : 0;
    setStatements(prev => prev.map(s => s.id === selectedStmt.id ? {
      ...s, status: 'Partial', paymentPlan: {
        monthlyAmount, totalRemaining: s.balance,
        nextPayment: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        payments: planForm.months,
      }
    } : s));
    setShowPaymentPlan(false);
  };

  const recordPayment = (id, amount) => {
    setStatements(prev => prev.map(s => {
      if (s.id !== id) return s;
      const newPaid = s.amountPaid + amount;
      const newBalance = Math.max(0, s.patientResponsibility - newPaid);
      return { ...s, amountPaid: newPaid, balance: newBalance, status: newBalance <= 0 ? 'Paid' : 'Partial' };
    }));
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>💳 Patient Statements & Payment Plans</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Generate statements, track balances, and manage patient payment plans</p>
        </div>
        <button className="btn btn-primary" disabled={batchGenerating || batchDone} onClick={() => { setBatchGenerating(true); setTimeout(() => { setBatchGenerating(false); setBatchDone(true); setTimeout(() => setBatchDone(false), 3000); }, 1800); }}>
          {batchGenerating ? '⏳ Generating…' : batchDone ? '✅ Statements Generated' : '📄 Generate Batch Statements'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '💰', val: `$${stats.totalOutstanding.toLocaleString()}`, label: 'Outstanding', bg: '#fee2e2' },
          { icon: '✅', val: `$${stats.totalCollected.toLocaleString()}`, label: 'Collected', bg: '#dcfce7' },
          { icon: '⚠️', val: stats.overdue, label: 'Overdue', bg: '#fef3c7' },
          { icon: '📅', val: stats.onPaymentPlan, label: 'Payment Plans', bg: '#dbeafe' },
          { icon: '🎉', val: stats.paidInFull, label: 'Paid in Full', bg: '#f0fdf4' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <input className="form-input" placeholder="Search statements..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
        <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 150, fontSize: 12 }}>
          <option value="All">All Statuses</option>
          {STATEMENT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* List + Detail */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedStmt ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>{filtered.length} Statement{filtered.length !== 1 ? 's' : ''}</div>
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {filtered.map(stmt => {
              const sc = STATUS_COLORS[stmt.status] || STATUS_COLORS.Draft;
              return (
                <div key={stmt.id} onClick={() => setSelectedStmt(stmt)}
                  style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedStmt?.id === stmt.id ? 'var(--primary-light)' : 'transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{stmt.patientName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Period: {stmt.statementPeriod}</div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: sc.bg, color: sc.color }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />{stmt.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>💰 Balance: <strong style={{ color: stmt.balance > 0 ? '#dc2626' : '#16a34a' }}>${stmt.balance.toFixed(2)}</strong></span>
                    <span>📅 Due: {stmt.dueDate}</span>
                    {stmt.paymentPlan && <span>📅 Plan: ${stmt.paymentPlan.monthlyAmount}/mo</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedStmt && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>💳 {selectedStmt.patientName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Statement: {selectedStmt.statementPeriod} · MRN {selectedStmt.mrn}</div>
                </div>
                <button onClick={() => setSelectedStmt(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>
            </div>
            <div style={{ padding: 20, overflowY: 'auto', maxHeight: 460 }}>
              {/* Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Total Charges', val: `$${selectedStmt.totalCharges.toFixed(2)}`, color: '#1e40af' },
                  { label: 'Insurance Paid', val: `$${selectedStmt.insurancePaid.toFixed(2)}`, color: '#059669' },
                  { label: 'Patient Owes', val: `$${selectedStmt.balance.toFixed(2)}`, color: selectedStmt.balance > 0 ? '#dc2626' : '#16a34a' },
                ].map(b => (
                  <div key={b.label} style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: b.color }}>{b.val}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>{b.label}</div>
                  </div>
                ))}
              </div>

              {/* Line items */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Line Items</div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, fontSize: 10 }}>Date</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, fontSize: 10 }}>Service</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, fontSize: 10 }}>Charge</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, fontSize: 10 }}>Ins Paid</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, fontSize: 10 }}>You Owe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStmt.lineItems.map((li, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 12px' }}>{li.date}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{li.desc}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>${li.charge.toFixed(2)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#059669' }}>${li.insPaid.toFixed(2)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>${li.ptResp.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment plan info */}
              {selectedStmt.paymentPlan && (
                <div style={{ padding: 14, background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#1e40af', marginBottom: 6 }}>📅 Active Payment Plan</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, fontSize: 12 }}>
                    <div><span style={{ color: '#64748b' }}>Monthly:</span> <strong>${selectedStmt.paymentPlan.monthlyAmount}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Remaining:</span> <strong>${selectedStmt.paymentPlan.totalRemaining}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Next:</span> <strong>{selectedStmt.paymentPlan.nextPayment}</strong></div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selectedStmt.balance > 0 && <button className="btn btn-primary btn-sm" onClick={() => recordPayment(selectedStmt.id, selectedStmt.balance)}>💳 Record Full Payment</button>}
                {selectedStmt.balance > 0 && !selectedStmt.paymentPlan && <button className="btn btn-secondary btn-sm" onClick={() => setShowPaymentPlan(true)}>📅 Setup Payment Plan</button>}
                <button className="btn btn-secondary btn-sm" style={emailedIds.has(selectedStmt.id) ? { background: '#dcfce7', color: '#166534', borderColor: '#86efac' } : {}} onClick={() => { setEmailedIds(prev => new Set([...prev, selectedStmt.id])); }}>
                  {emailedIds.has(selectedStmt.id) ? '✅ Emailed' : '📧 Email Statement'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>🖨️ Print</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Plan Modal */}
      {showPaymentPlan && selectedStmt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowPaymentPlan(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>📅 Setup Payment Plan</div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Balance: ${selectedStmt.balance.toFixed(2)} — {selectedStmt.patientName}</div>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Number of Monthly Payments</label>
                <select className="form-input" value={planForm.months} onChange={e => setPlanForm({ months: parseInt(e.target.value, 10) })}>
                  {[2, 3, 4, 6, 9, 12].map(m => <option key={m} value={m}>{m} months — ${Math.ceil(selectedStmt.balance / m)}/mo</option>)}
                </select>
              </div>
              <div style={{ padding: 14, background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac', fontSize: 13 }}>
                <strong>Monthly Payment:</strong> ${planForm.months > 0 ? Math.ceil(selectedStmt.balance / planForm.months) : 0}<br />
                <strong>First Payment:</strong> {new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)}
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowPaymentPlan(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={setupPaymentPlan}>✅ Create Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
