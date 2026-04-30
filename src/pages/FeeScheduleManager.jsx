import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIES = [
  { id: 'office_visit', label: 'Office Visit', icon: '🏢' },
  { id: 'telehealth', label: 'Telehealth', icon: '📹' },
  { id: 'therapy', label: 'Therapy', icon: '🧠' },
  { id: 'testing', label: 'Psych Testing', icon: '📋' },
  { id: 'procedure', label: 'Procedures', icon: '⚕️' },
  { id: 'injection', label: 'Injections', icon: '💉' },
  { id: 'lab', label: 'Lab', icon: '🔬' },
  { id: 'ect', label: 'ECT/TMS', icon: '⚡' },
];

const MOCK_FEE_SCHEDULE = [
  { id: 'f1', cpt: '99213', description: 'Office Visit — Established, Level 3 (25 min)', category: 'office_visit', fee: 150.00, medicare: 109.18, medicaid: 87.34, commercial: 150.00, selfPay: 125.00, rvu: 1.30, effectiveDate: '2026-01-01', status: 'Active' },
  { id: 'f2', cpt: '99214', description: 'Office Visit — Established, Level 4 (40 min)', category: 'office_visit', fee: 210.00, medicare: 161.58, medicaid: 129.26, commercial: 210.00, selfPay: 175.00, rvu: 1.92, effectiveDate: '2026-01-01', status: 'Active' },
  { id: 'f3', cpt: '99215', description: 'Office Visit — Established, Level 5 (55 min)', category: 'office_visit', fee: 285.00, medicare: 224.56, medicaid: 179.65, commercial: 285.00, selfPay: 240.00, rvu: 2.80, effectiveDate: '2026-01-01', status: 'Active' },
  { id: 'f4', cpt: '99205', description: 'Office Visit — New Patient, Level 5 (60 min)', category: 'office_visit', fee: 350.00, medicare: 279.76, medicaid: 223.81, commercial: 350.00, selfPay: 300.00, rvu: 3.50, effectiveDate: '2026-01-01', status: 'Active' },
  { id: 'f5', cpt: '90834', description: 'Psychotherapy — 45 min', category: 'therapy', fee: 140.00, medicare: 102.34, medicaid: 81.87, commercial: 140.00, selfPay: 120.00, rvu: 1.23, effectiveDate: '2026-01-01', status: 'Active' },
  { id: 'f6', cpt: '90837', description: 'Psychotherapy — 60 min', category: 'therapy', fee: 185.00, medicare: 136.12, medicaid: 108.90, commercial: 185.00, selfPay: 155.00, rvu: 1.65, effectiveDate: '2026-01-01', status: 'Active' },
  { id: 'f7', cpt: '90833', description: 'Psychotherapy Add-On — 30 min (with E/M)', category: 'therapy', fee: 75.00, medicare: 53.97, medicaid: 43.18, commercial: 75.00, selfPay: 65.00, rvu: 0.64, effectiveDate: '2026-01-01', status: 'Active' },
  { id: 'f8', cpt: '90792', description: 'Psychiatric Diagnostic Evaluation with Medical Services', category: 'office_visit', fee: 300.00, medicare: 233.60, medicaid: 186.88, commercial: 300.00, selfPay: 250.00, rvu: 2.90, effectiveDate: '2026-01-01', status: 'Active' },
  { id: 'f9', cpt: '90791', description: 'Psychiatric Diagnostic Evaluation (no medical)', category: 'therapy', fee: 250.00, medicare: 190.06, medicaid: 152.05, commercial: 250.00, selfPay: 210.00, rvu: 2.40, effectiveDate: '2026-01-01', status: 'Active' },
  { id: 'f10', cpt: '99232', description: 'Subsequent Hospital Care — Level 2', category: 'office_visit', fee: 135.00, medicare: 105.22, medicaid: 84.18, commercial: 135.00, selfPay: 115.00, rvu: 1.39, effectiveDate: '2026-01-01', status: 'Active' },
  { id: 'f11', cpt: '96130', description: 'Psych Testing Evaluation — First Hour', category: 'testing', fee: 220.00, medicare: 157.32, medicaid: 125.86, commercial: 220.00, selfPay: 185.00, rvu: 2.00, effectiveDate: '2026-01-01', status: 'Active' },
  { id: 'f12', cpt: '96131', description: 'Psych Testing Evaluation — Each Additional Hour', category: 'testing', fee: 180.00, medicare: 134.40, medicaid: 107.52, commercial: 180.00, selfPay: 150.00, rvu: 1.70, effectiveDate: '2026-01-01', status: 'Active' },
  { id: 'f13', cpt: '99441', description: 'Telephone E/M — 5-10 min', category: 'telehealth', fee: 55.00, medicare: 41.52, medicaid: 33.22, commercial: 55.00, selfPay: 45.00, rvu: 0.50, effectiveDate: '2026-01-01', status: 'Active' },
  { id: 'f14', cpt: '99442', description: 'Telephone E/M — 11-20 min', category: 'telehealth', fee: 100.00, medicare: 76.80, medicaid: 61.44, commercial: 100.00, selfPay: 85.00, rvu: 0.97, effectiveDate: '2026-01-01', status: 'Active' },
  { id: 'f15', cpt: '90868', description: 'TMS — Subsequent Delivery', category: 'ect', fee: 200.00, medicare: 148.00, medicaid: 118.40, commercial: 200.00, selfPay: 175.00, rvu: 1.75, effectiveDate: '2026-01-01', status: 'Active' },
  { id: 'f16', cpt: 'J2794', description: 'Risperidone LAI (Risperdal Consta) — per 0.5 mg', category: 'injection', fee: 45.00, medicare: 38.50, medicaid: 30.80, commercial: 45.00, selfPay: 40.00, rvu: 0, effectiveDate: '2026-01-01', status: 'Active' },
];

export default function FeeScheduleManager() {
  const { currentUser } = useAuth();
  const [fees, setFees] = useState(MOCK_FEE_SCHEDULE);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [selectedFee, setSelectedFee] = useState(null);
  const [editFee, setEditFee] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [showAddCode, setShowAddCode] = useState(false);
  const [newFee, setNewFee] = useState({ cpt: '', description: '', category: 'office_visit', fee: 0, medicare: 0, medicaid: 0, commercial: 0, selfPay: 0, rvu: 0 });

  const filtered = useMemo(() => {
    let list = [...fees];
    if (filterCat !== 'All') list = list.filter(f => f.category === filterCat);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f => f.cpt.includes(q) || f.description.toLowerCase().includes(q));
    }
    return list;
  }, [fees, search, filterCat]);

  const stats = useMemo(() => ({
    total: fees.length,
    avgFee: (fees.reduce((s, f) => s + f.fee, 0) / fees.length).toFixed(0),
    totalRVU: fees.reduce((s, f) => s + f.rvu, 0).toFixed(1),
    categories: [...new Set(fees.map(f => f.category))].length,
  }), [fees]);

  const openEdit = (fee) => {
    setEditFee({ ...fee });
    setShowEdit(true);
  };

  const saveFee = () => {
    if (!editFee) return;
    setFees(prev => prev.map(f => f.id === editFee.id ? editFee : f));
    setShowEdit(false);
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>💲 Fee Schedule Manager</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Manage CPT codes, fee amounts by payer type, and RVU values</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" disabled={importing || imported} onClick={() => { setImporting(true); setTimeout(() => { setImporting(false); setImported(true); setTimeout(() => setImported(false), 3000); }, 1500); }}>
            {importing ? '⏳ Importing…' : imported ? '✅ Imported 2026 CMS Rates' : '📥 Import CMS'}
          </button>
          <button className="btn btn-primary" onClick={() => { setNewFee({ cpt: '', description: '', category: 'office_visit', fee: 0, medicare: 0, medicaid: 0, commercial: 0, selfPay: 0, rvu: 0 }); setShowAddCode(true); }}>➕ Add Code</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '📋', val: stats.total, label: 'CPT Codes', bg: '#eff6ff' },
          { icon: '💰', val: `$${stats.avgFee}`, label: 'Avg Fee', bg: '#dcfce7' },
          { icon: '📊', val: stats.totalRVU, label: 'Total RVUs', bg: '#fef3c7' },
          { icon: '📁', val: stats.categories, label: 'Categories', bg: '#f3e8ff' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{s.icon}</div>
            <div><div style={{ fontSize: 18, fontWeight: 800 }}>{s.val}</div><div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <input className="form-input" placeholder="Search CPT code or description..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
        <select className="form-input" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width: 160, fontSize: 12 }}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
              {['CPT', 'Description', 'Standard Fee', 'Medicare', 'Medicaid', 'Commercial', 'Self-Pay', 'RVU', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 14px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--primary)' }}>{f.cpt}</td>
                <td style={{ padding: '12px 14px', maxWidth: 260 }}>
                  <div style={{ fontWeight: 600 }}>{f.description}</div>
                </td>
                <td style={{ padding: '12px 14px', fontWeight: 700, color: '#059669' }}>${f.fee.toFixed(2)}</td>
                <td style={{ padding: '12px 14px' }}>${f.medicare.toFixed(2)}</td>
                <td style={{ padding: '12px 14px' }}>${f.medicaid.toFixed(2)}</td>
                <td style={{ padding: '12px 14px' }}>${f.commercial.toFixed(2)}</td>
                <td style={{ padding: '12px 14px' }}>${f.selfPay.toFixed(2)}</td>
                <td style={{ padding: '12px 14px', fontWeight: 700 }}>{f.rvu.toFixed(2)}</td>
                <td style={{ padding: '12px 14px' }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => openEdit(f)}>✏️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Fee Modal */}
      {showEdit && editFee && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowEdit(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>✏️ Edit Fee — {editFee.cpt}</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>{editFee.description}</div>
            </div>
            <div style={{ padding: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                ['Standard Fee', 'fee'],
                ['Medicare', 'medicare'],
                ['Medicaid', 'medicaid'],
                ['Commercial', 'commercial'],
                ['Self-Pay', 'selfPay'],
                ['RVU', 'rvu'],
              ].map(([label, key]) => (
                <div key={key}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>{label}</label>
                  <input className="form-input" type="number" step="0.01" value={editFee[key]} onChange={e => setEditFee(f => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))} />
                </div>
              ))}
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveFee}>💾 Save Changes</button>
            </div>
          </div>
        </div>
      )}
      {/* Add Code Modal */}
      {showAddCode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddCode(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>➕ Add New CPT Code</div>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>CPT Code *</label>
                  <input className="form-input" placeholder="e.g. 99213" value={newFee.cpt} onChange={e => setNewFee(f => ({ ...f, cpt: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Category</label>
                  <select className="form-input" value={newFee.category} onChange={e => setNewFee(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Description *</label>
                <input className="form-input" placeholder="e.g. Office Visit — Established, Level 3" value={newFee.description} onChange={e => setNewFee(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[['Standard Fee', 'fee'], ['Medicare', 'medicare'], ['Medicaid', 'medicaid'], ['Commercial', 'commercial'], ['Self-Pay', 'selfPay'], ['RVU', 'rvu']].map(([label, key]) => (
                  <div key={key}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>{label}</label>
                    <input className="form-input" type="number" step="0.01" value={newFee[key]} onChange={e => setNewFee(f => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowAddCode(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!newFee.cpt || !newFee.description} onClick={() => { setFees(prev => [...prev, { ...newFee, id: `f${Date.now()}`, effectiveDate: new Date().toISOString().slice(0,10), status: 'Active' }]); setShowAddCode(false); }}>➕ Add CPT Code</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
