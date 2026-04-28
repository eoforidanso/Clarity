import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';

const MOCK_SUPERBILLS = [
  { id: 'sb-1', patientId: 'p1', patientName: 'James Anderson', mrn: 'MRN-001', dos: '2026-04-14', provider: 'Dr. Chris L.', providerNPI: '1234567890', facility: 'Clarity — Main Office', visitType: 'Follow-Up', cptCodes: [{ code: '99214', desc: 'Office Visit — Moderate', units: 1, fee: 175.00 }, { code: '90833', desc: 'Psychotherapy Add-On 16-37 min', units: 1, fee: 85.00 }], icdCodes: ['F31.81', 'F90.0'], modifiers: ['25'], totalCharge: 260.00, status: 'Ready to Submit', insurance: 'Blue Cross Blue Shield', copay: 30, paid: 0, balance: 260.00, renderingTime: '30 min', notes: '' },
  { id: 'sb-2', patientId: 'p2', patientName: 'Maria Garcia', mrn: 'MRN-002', dos: '2026-04-14', provider: 'April Torres, LCSW', providerNPI: '5566778899', facility: 'Clarity — Main Office', visitType: 'Telehealth', cptCodes: [{ code: '90837', desc: 'Psychotherapy 53+ min', units: 1, fee: 195.00 }, { code: '96127', desc: 'Brief Behavioral Assessment', units: 1, fee: 12.00 }], icdCodes: ['F41.1', 'F43.10'], modifiers: ['95', 'GT'], totalCharge: 207.00, status: 'Submitted', insurance: 'Aetna', copay: 25, paid: 25, balance: 182.00, renderingTime: '55 min', notes: 'Telehealth modifier applied' },
  { id: 'sb-3', patientId: 'p3', patientName: 'Robert Chen', mrn: 'MRN-003', dos: '2026-04-13', provider: 'Dr. Chris L.', providerNPI: '1234567890', facility: 'Clarity — Main Office', visitType: 'New Patient', cptCodes: [{ code: '90792', desc: 'Psychiatric Diagnostic Eval w/ Medical', units: 1, fee: 325.00 }], icdCodes: ['F33.2', 'F10.20'], modifiers: [], totalCharge: 325.00, status: 'Paid', insurance: 'Cigna', copay: 40, paid: 325.00, balance: 0, renderingTime: '60 min', notes: 'New patient evaluation' },
  { id: 'sb-4', patientId: 'p4', patientName: 'Ashley Kim', mrn: 'MRN-004', dos: '2026-04-12', provider: 'Dr. Chris L.', providerNPI: '1234567890', facility: 'Clarity — Main Office', visitType: 'Follow-Up', cptCodes: [{ code: '99215', desc: 'Office Visit — High Complexity', units: 1, fee: 225.00 }, { code: '90836', desc: 'Psychotherapy Add-On 38-52 min', units: 1, fee: 115.00 }, { code: '96127', desc: 'Brief Behavioral Assessment', units: 2, fee: 24.00 }], icdCodes: ['F33.1', 'F90.0', 'F41.1'], modifiers: ['25'], totalCharge: 364.00, status: 'Denied', insurance: 'UnitedHealthcare', copay: 35, paid: 0, balance: 364.00, renderingTime: '50 min', notes: 'Denied: modifier 25 documentation insufficient' },
  { id: 'sb-5', patientId: 'p6', patientName: 'Marcus Brown', mrn: 'MRN-006', dos: '2026-04-11', provider: 'Dr. Chris L.', providerNPI: '1234567890', facility: 'Clarity — Main Office', visitType: 'Follow-Up', cptCodes: [{ code: '99213', desc: 'Office Visit — Low Complexity', units: 1, fee: 130.00 }], icdCodes: ['F33.0'], modifiers: [], totalCharge: 130.00, status: 'Ready to Submit', insurance: 'Medicaid', copay: 0, paid: 0, balance: 130.00, renderingTime: '20 min', notes: '' },
];

const STATUS_COLORS = {
  'Draft':            { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
  'Ready to Submit':  { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  'Submitted':        { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
  'Paid':             { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  'Partial':          { bg: '#ccfbf1', color: '#0f766e', dot: '#14b8a6' },
  'Denied':           { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
};

export default function SuperbillCapture() {
  const { currentUser } = useAuth();
  const [bills, setBills] = useState(MOCK_SUPERBILLS);
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedBill, setSelectedBill] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = [...bills];
    if (filterStatus !== 'All') list = list.filter(b => b.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(b => b.patientName.toLowerCase().includes(q) || b.mrn.toLowerCase().includes(q) || b.cptCodes.some(c => c.code.includes(q)));
    }
    return list.sort((a, b) => new Date(b.dos) - new Date(a.dos));
  }, [bills, filterStatus, search]);

  const stats = useMemo(() => {
    const totalCharges = bills.reduce((s, b) => s + b.totalCharge, 0);
    const totalPaid = bills.reduce((s, b) => s + b.paid, 0);
    const totalBalance = bills.reduce((s, b) => s + b.balance, 0);
    return {
      count: bills.length,
      totalCharges: totalCharges.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
      totalPaid: totalPaid.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
      totalBalance: totalBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
      readyToSubmit: bills.filter(b => b.status === 'Ready to Submit').length,
      denied: bills.filter(b => b.status === 'Denied').length,
    };
  }, [bills]);

  const updateStatus = (id, status) => {
    setBills(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    if (selectedBill?.id === id) setSelectedBill(prev => ({ ...prev, status }));
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>🧾 Superbill & Charge Capture</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Auto-generated superbills from encounters, charge review, and claim submission</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '🧾', value: stats.count, label: 'Superbills' },
          { icon: '💰', value: stats.totalCharges, label: 'Total Charges' },
          { icon: '✅', value: stats.totalPaid, label: 'Collected' },
          { icon: '📊', value: stats.totalBalance, label: 'Outstanding' },
          { icon: '📤', value: stats.readyToSubmit, label: 'Ready to Submit' },
          { icon: '❌', value: stats.denied, label: 'Denied' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px' }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <input className="form-input" placeholder="Search patient, MRN, CPT..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {['All', 'Ready to Submit', 'Submitted', 'Paid', 'Denied'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{ padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, border: filterStatus === s ? '2px solid var(--primary)' : '1px solid var(--border)', background: filterStatus === s ? 'var(--primary-light)' : STATUS_COLORS[s]?.bg || '#fff', color: filterStatus === s ? 'var(--primary)' : STATUS_COLORS[s]?.color || 'var(--text-primary)', cursor: 'pointer' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Patient</th>
              <th>Provider</th>
              <th>CPT Codes</th>
              <th>ICD-10</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(bill => {
              const sc = STATUS_COLORS[bill.status] || STATUS_COLORS.Draft;
              return (
                <tr key={bill.id} onClick={() => setSelectedBill(bill)} style={{ cursor: 'pointer', background: selectedBill?.id === bill.id ? 'var(--primary-light)' : undefined }}>
                  <td style={{ fontSize: 12, fontWeight: 600 }}>{bill.dos}</td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{bill.patientName}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{bill.mrn}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>{bill.provider}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {bill.cptCodes.map(c => (
                        <span key={c.code} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#eff6ff', color: '#1e40af', fontWeight: 700 }}>{c.code}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {bill.icdCodes.map(c => (
                        <span key={c} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>{c}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, fontSize: 13 }}>${bill.totalCharge.toFixed(2)}</td>
                  <td style={{ fontSize: 12, color: bill.paid >= bill.totalCharge ? '#059669' : 'var(--text-secondary)' }}>${bill.paid.toFixed(2)}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: sc.bg, color: sc.color }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />{bill.status}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    {bill.status === 'Ready to Submit' && <button className="btn btn-primary btn-sm" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => updateStatus(bill.id, 'Submitted')}>Submit</button>}
                    {bill.status === 'Denied' && <button className="btn btn-warning btn-sm" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => alert('Opening denial details...')}>Appeal</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedBill && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedBill(null); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '85vh', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #059669, #065f46)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>🧾 Superbill Details</div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{selectedBill.patientName} · {selectedBill.dos}</div>
              </div>
              <button onClick={() => setSelectedBill(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 800, fontSize: 20, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {/* Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
                {[
                  ['Patient', selectedBill.patientName], ['MRN', selectedBill.mrn], ['Date of Service', selectedBill.dos],
                  ['Provider', selectedBill.provider], ['NPI', selectedBill.providerNPI], ['Facility', selectedBill.facility],
                  ['Visit Type', selectedBill.visitType], ['Duration', selectedBill.renderingTime], ['Insurance', selectedBill.insurance],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* CPT line items */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Procedure Codes</div>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, fontSize: 10 }}>CPT</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, fontSize: 10 }}>Description</th>
                      <th style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 700, fontSize: 10 }}>Units</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, fontSize: 10 }}>Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBill.cptCodes.map(c => (
                      <tr key={c.code} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px', fontWeight: 700, color: 'var(--primary)' }}>{c.code}</td>
                        <td style={{ padding: '8px' }}>{c.desc}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>{c.units}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>${c.fee.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 800 }}>
                      <td colSpan={3} style={{ padding: '10px 8px', textAlign: 'right' }}>Total Charge:</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 14, color: 'var(--primary)' }}>${selectedBill.totalCharge.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ICD & Modifiers */}
              <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Diagnosis Codes</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {selectedBill.icdCodes.map(c => (
                      <span key={c} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>{c}</span>
                    ))}
                  </div>
                </div>
                {selectedBill.modifiers.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Modifiers</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {selectedBill.modifiers.map(m => (
                        <span key={m} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: '#e0e7ff', color: '#3730a3', fontWeight: 700 }}>{m}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Payment summary */}
              <div style={{ padding: 14, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Payment Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, fontSize: 13 }}>
                  <div><span style={{ color: 'var(--text-muted)', fontSize: 10 }}>Copay</span><br /><strong>${selectedBill.copay}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)', fontSize: 10 }}>Paid</span><br /><strong style={{ color: '#059669' }}>${selectedBill.paid.toFixed(2)}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)', fontSize: 10 }}>Balance</span><br /><strong style={{ color: selectedBill.balance > 0 ? '#dc2626' : '#059669' }}>${selectedBill.balance.toFixed(2)}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)', fontSize: 10 }}>Insurance</span><br /><strong>{selectedBill.insurance}</strong></div>
                </div>
              </div>

              {selectedBill.notes && (
                <div style={{ padding: 12, background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a', fontSize: 12, color: '#92400e', marginBottom: 16 }}>
                  📝 {selectedBill.notes}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => alert('🖨️ Printing superbill for ' + selectedBill.patientName)}>🖨️ Print Superbill</button>
                {selectedBill.status === 'Ready to Submit' && <button className="btn btn-success btn-sm" onClick={() => { updateStatus(selectedBill.id, 'Submitted'); setSelectedBill(null); }}>📤 Submit Claim</button>}
                <button className="btn btn-secondary btn-sm" onClick={() => alert('📤 Exported as CMS-1500')}>📄 CMS-1500</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
