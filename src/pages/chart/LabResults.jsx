import React, { useState, useRef } from 'react';
import { usePatient } from '../../contexts/PatientContext';
import { useAuth } from '../../contexts/AuthContext';

export default function LabResults({ patientId }) {
  const { labResults, addOrder } = usePatient();
  const { currentUser } = useAuth();
  const patientLabs = labResults[patientId] || [];
  const isTherapist = currentUser?.role === 'therapist';

  // ── New Lab Order state ──────────────────────────────────
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [orderForm, setOrderForm] = useState({
    testName: '', priority: 'Routine', diagnosis: '', notes: '', fasting: false,
  });
  const [orderSaved, setOrderSaved] = useState(false);

  const commonLabTests = [
    'CBC with Differential', 'CMP (Comprehensive Metabolic Panel)', 'BMP (Basic Metabolic Panel)',
    'Lipid Panel', 'TSH', 'Free T4', 'Lithium Level', 'Valproic Acid Level',
    'Carbamazepine Level', 'Lamotrigine Level', 'Clozapine Level', 'HbA1c',
    'Hepatic Function Panel', 'Renal Function Panel', 'Urinalysis',
    'Urine Drug Screen (UDS)', 'Vitamin D, 25-Hydroxy', 'Vitamin B12',
    'Folate Level', 'Prolactin', 'Cortisol (AM)', 'ACTH',
    'Iron Studies', 'Ferritin', 'Magnesium', 'Phosphorus',
  ];

  const submitLabOrder = () => {
    if (!orderForm.testName) return;
    addOrder(patientId, {
      type: 'Lab',
      description: orderForm.testName,
      priority: orderForm.priority,
      notes: `${orderForm.diagnosis ? 'Dx: ' + orderForm.diagnosis + '. ' : ''}${orderForm.fasting ? 'FASTING required. ' : ''}${orderForm.notes}`.trim(),
      status: 'Pending',
      orderedDate: new Date().toISOString().split('T')[0],
      orderedBy: `${currentUser.firstName} ${currentUser.lastName}`,
    });
    setOrderSaved(true);
    setTimeout(() => {
      setOrderSaved(false);
      setShowNewOrder(false);
      setOrderForm({ testName: '', priority: 'Routine', diagnosis: '', notes: '', fasting: false });
    }, 1500);
  };

  // ── Print handler ────────────────────────────────────────
  const printRef = useRef(null);
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
      <html><head><title>Lab Results — Patient ${patientId}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        h2 { font-size: 14px; margin: 16px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px; }
        th, td { padding: 6px 10px; border: 1px solid #ddd; text-align: left; }
        th { background: #f1f5f9; font-weight: 700; }
        .flag-H { color: #dc2626; font-weight: 700; }
        .flag-L { color: #d97706; font-weight: 700; }
        .flag-A { color: #dc2626; font-weight: 700; }
        .meta { color: #64748b; font-size: 11px; margin-bottom: 16px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>🔬 Lab Results Report</h1>
      <div class="meta">Printed: ${new Date().toLocaleString()} | Patient MRN: ${patientId}</div>
      ${patientLabs.map(lab => `
        <h2>Lab Panel — ${lab.resultDate} (${lab.status})</h2>
        <div class="meta">Ordered: ${lab.orderDate} by ${lab.orderedBy}</div>
        ${lab.tests.map(test => `
          <div><strong>${test.name}</strong></div>
          <table>
            <thead><tr><th>Component</th><th>Value</th><th>Unit</th><th>Reference Range</th><th>Flag</th></tr></thead>
            <tbody>${test.results.map(r => `
              <tr>
                <td>${r.component}</td>
                <td class="flag-${r.flag || ''}">${r.value}</td>
                <td>${r.unit}</td>
                <td>${r.range}</td>
                <td class="flag-${r.flag || ''}">${r.flag === 'H' ? '↑ High' : r.flag === 'L' ? '↓ Low' : r.flag === 'A' ? '⚠ Abnormal' : r.flag || '—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        `).join('')}
      `).join('<hr/>')}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <div>
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {!isTherapist && (
          <button
            className="btn btn-primary"
            onClick={() => setShowNewOrder(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            ➕ New Lab Order
          </button>
        )}
        <button
          className="btn btn-secondary"
          onClick={handlePrint}
          disabled={patientLabs.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: patientLabs.length === 0 ? 0.5 : 1 }}
        >
          🖨️ Print Results
        </button>
      </div>

      {/* New Lab Order Modal */}
      {showNewOrder && (
        <div className="card mb-4" style={{ border: '2px solid var(--primary)', animation: 'fadeInUp 0.2s ease' }}>
          <div className="card-header" style={{ background: 'var(--primary-light)' }}>
            <h2>➕ New Lab Order</h2>
            <button onClick={() => setShowNewOrder(false)} className="btn btn-secondary btn-sm">✕ Cancel</button>
          </div>
          <div className="card-body">
            {orderSaved ? (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--success)' }}>Lab Order Submitted!</div>
                <p className="text-muted" style={{ marginTop: 4 }}>The order has been sent to the lab.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Test selection */}
                <div>
                  <label className="form-label">Lab Test *</label>
                  <select
                    className="form-select"
                    value={orderForm.testName}
                    onChange={e => setOrderForm(f => ({ ...f, testName: e.target.value }))}
                  >
                    <option value="">— Select a lab test —</option>
                    {commonLabTests.map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="__custom">Other (type below)</option>
                  </select>
                  {orderForm.testName === '__custom' && (
                    <input
                      className="form-input mt-2"
                      placeholder="Enter custom lab test name..."
                      value={orderForm.customTest || ''}
                      onChange={e => setOrderForm(f => ({ ...f, customTest: e.target.value, testName: e.target.value || '__custom' }))}
                    />
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {/* Priority */}
                  <div>
                    <label className="form-label">Priority</label>
                    <select
                      className="form-select"
                      value={orderForm.priority}
                      onChange={e => setOrderForm(f => ({ ...f, priority: e.target.value }))}
                    >
                      <option value="Routine">Routine</option>
                      <option value="Urgent">Urgent</option>
                      <option value="STAT">STAT</option>
                    </select>
                  </div>
                  {/* Diagnosis */}
                  <div>
                    <label className="form-label">Diagnosis / ICD-10</label>
                    <input
                      className="form-input"
                      placeholder="e.g. F31.9, F32.1"
                      value={orderForm.diagnosis}
                      onChange={e => setOrderForm(f => ({ ...f, diagnosis: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Fasting */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={orderForm.fasting}
                    onChange={e => setOrderForm(f => ({ ...f, fasting: e.target.checked }))}
                  />
                  <strong>Fasting required</strong>
                  <span className="text-muted" style={{ fontSize: 11 }}>— Patient must fast 8-12 hours prior</span>
                </label>

                {/* Notes */}
                <div>
                  <label className="form-label">Additional Notes</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Special instructions, clinical context..."
                    value={orderForm.notes}
                    onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setShowNewOrder(false)}>Cancel</button>
                  <button
                    className="btn btn-primary"
                    onClick={submitLabOrder}
                    disabled={!orderForm.testName || orderForm.testName === '__custom'}
                  >
                    📤 Submit Lab Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Therapist read-only banner */}
      {isTherapist && (
        <div className="card mb-4" style={{ border: '1px solid #fde68a' }}>
          <div style={{ padding: '14px 20px', background: '#fffbeb', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>🔒</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#92400e', marginBottom: 3 }}>
                Lab Results — View Only
              </div>
              <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>
                Therapists can view lab results for clinical context but <strong>cannot order, modify, or cancel labs</strong>.
                Contact the prescribing provider via Staff Messaging to request new lab work.
              </div>
            </div>
          </div>
        </div>
      )}
      {patientLabs.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="icon">🔬</div>
              <h3>No Lab Results</h3>
              <p>No laboratory results on file for this patient</p>
              {!isTherapist && (
                <button className="btn btn-primary mt-4" onClick={() => setShowNewOrder(true)}>
                  ➕ Order New Lab
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div ref={printRef}>
        {patientLabs.map((lab) => (
          <div key={lab.id} className="card mb-4">
            <div className="card-header">
              <h2>🔬 Lab Results — {lab.resultDate}</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`badge ${lab.status === 'Final' ? 'badge-success' : 'badge-warning'}`}>{lab.status}</span>
                <span className="text-sm text-muted">Ordered: {lab.orderDate} by {lab.orderedBy}</span>
              </div>
            </div>
            <div className="card-body no-pad">
              {lab.tests.map((test, ti) => (
                <div key={ti}>
                  <div style={{ padding: '10px 14px', background: 'var(--bg)', fontWeight: 600, fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                    {test.name}
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Component</th><th>Value</th><th>Unit</th><th>Reference Range</th><th>Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {test.results.map((r, ri) => (
                        <tr key={ri}>
                          <td className="font-medium">{r.component}</td>
                          <td className={`font-bold ${r.flag === 'H' ? 'text-danger' : r.flag === 'L' ? 'text-warning' : r.flag === 'A' ? 'text-danger' : ''}`}>
                            {r.value}
                          </td>
                          <td className="text-muted">{r.unit}</td>
                          <td className="text-sm">{r.range}</td>
                          <td>
                            {r.flag && (
                              <span className={`badge ${r.flag === 'H' ? 'badge-danger' : r.flag === 'L' ? 'badge-warning' : r.flag === 'A' ? 'badge-danger' : 'badge-gray'}`}>
                                {r.flag === 'H' ? '↑ High' : r.flag === 'L' ? '↓ Low' : r.flag === 'A' ? '⚠ Abnormal' : r.flag}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
}
