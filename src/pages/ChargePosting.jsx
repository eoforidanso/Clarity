import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/* ─── Charge Posting & ERA Auto-Posting (athenaOne RCM Gap) ───────────────── */

const PENDING_CHARGES = [
  { id: 'c1', patient: 'James Anderson', dos: '2026-04-15', cpt: '99214', desc: 'Office Visit — Established, Moderate', dx: ['F33.1'], units: 1, fee: 185.00, provider: 'Dr. Chris L.', status: 'Ready', modifier: '' },
  { id: 'c2', patient: 'James Anderson', dos: '2026-04-15', cpt: '90833', desc: 'Psychotherapy Add-on, 30 min', dx: ['F33.1'], units: 1, fee: 95.00, provider: 'Dr. Chris L.', status: 'Ready', modifier: '' },
  { id: 'c3', patient: 'Maria Garcia', dos: '2026-04-15', cpt: '99213', desc: 'Office Visit — Established, Low', dx: ['F41.1'], units: 1, fee: 130.00, provider: 'Dr. Chris L.', status: 'Ready', modifier: '95' },
  { id: 'c4', patient: 'David Thompson', dos: '2026-04-14', cpt: '90837', desc: 'Psychotherapy, 60 min', dx: ['F43.10'], units: 1, fee: 180.00, provider: 'April Thompson', status: 'Needs Review', modifier: '' },
  { id: 'c5', patient: 'Emily Chen', dos: '2026-04-14', cpt: '99215', desc: 'Office Visit — Established, High', dx: ['F31.31', 'F41.1'], units: 1, fee: 245.00, provider: 'Dr. Chris L.', status: 'Ready', modifier: '' },
  { id: 'c6', patient: 'Emily Chen', dos: '2026-04-14', cpt: '90836', desc: 'Psychotherapy Add-on, 45 min', dx: ['F31.31'], units: 1, fee: 130.00, provider: 'Dr. Chris L.', status: 'Ready', modifier: '' },
  { id: 'c7', patient: 'Robert Wilson', dos: '2026-04-12', cpt: '99214', desc: 'Office Visit — Established, Moderate', dx: ['F90.2'], units: 1, fee: 185.00, provider: 'Dr. Chris L.', status: 'Posted', modifier: '' },
  { id: 'c8', patient: 'Aisha Patel', dos: '2026-04-11', cpt: '90791', desc: 'Psychiatric Diagnostic Evaluation', dx: ['F32.1', 'F41.1'], units: 1, fee: 295.00, provider: 'Dr. Chris L.', status: 'Posted', modifier: '' },
];

const ERA_PAYMENTS = [
  { id: 'era1', payer: 'Blue Cross Blue Shield', checkNo: 'EFT-89234', date: '2026-04-14', amount: 1245.00, claims: 8, autoPosted: 6, needsReview: 2, status: 'Partially Posted' },
  { id: 'era2', payer: 'Aetna', checkNo: 'EFT-44521', date: '2026-04-13', amount: 890.50, claims: 5, autoPosted: 5, needsReview: 0, status: 'Fully Posted' },
  { id: 'era3', payer: 'United Healthcare', checkNo: 'EFT-77812', date: '2026-04-12', amount: 2180.00, claims: 12, autoPosted: 10, needsReview: 2, status: 'Partially Posted' },
  { id: 'era4', payer: 'Medicare', checkNo: 'EFT-33109', date: '2026-04-10', amount: 1560.75, claims: 9, autoPosted: 9, needsReview: 0, status: 'Fully Posted' },
  { id: 'era5', payer: 'Cigna', checkNo: 'EFT-56782', date: '2026-04-09', amount: 670.00, claims: 4, autoPosted: 3, needsReview: 1, status: 'Partially Posted' },
];

const RULES_ENGINE = [
  { rule: 'Modifier validation', desc: 'Auto-append modifier 95 for telehealth visits', active: true, triggered: 34 },
  { rule: 'Duplicate charge detection', desc: 'Flag same CPT + DOS + patient within 24 hours', active: true, triggered: 3 },
  { rule: 'Missing diagnosis check', desc: 'Block posting if no ICD-10 code assigned', active: true, triggered: 7 },
  { rule: 'Add-on code validation', desc: 'Ensure add-on codes (90833, 90836) have base E/M code', active: true, triggered: 12 },
  { rule: 'NPI mismatch detection', desc: 'Flag if rendering provider NPI doesn\'t match credentialed payer NPI', active: true, triggered: 2 },
  { rule: 'Timely filing alert', desc: 'Warn if charge older than 90 days (timely filing risk)', active: true, triggered: 1 },
  { rule: 'Place of service validation', desc: 'Auto-set POS 02 for telehealth, POS 11 for office', active: true, triggered: 45 },
  { rule: 'Authorization check', desc: 'Verify prior auth on file before posting', active: false, triggered: 0 },
];

export default function ChargePosting() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('charges');
  const [charges, setCharges] = useState(PENDING_CHARGES);
  const [selectedCharges, setSelectedCharges] = useState(new Set());
  const [postingComplete, setPostingComplete] = useState(false);

  const isFrontDesk = currentUser?.role === 'front_desk';
  const isPrescriber = currentUser?.role === 'prescriber';

  const toggleCharge = (id) => {
    setSelectedCharges(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllReady = () => {
    const ready = charges.filter(c => c.status === 'Ready').map(c => c.id);
    setSelectedCharges(new Set(ready));
  };

  const postCharges = () => {
    setCharges(prev => prev.map(c => selectedCharges.has(c.id) ? { ...c, status: 'Posted' } : c));
    setPostingComplete(true);
    setTimeout(() => { setPostingComplete(false); setSelectedCharges(new Set()); }, 3000);
  };

  const readyCharges = charges.filter(c => c.status === 'Ready');
  const postedCharges = charges.filter(c => c.status === 'Posted');
  const needsReview = charges.filter(c => c.status === 'Needs Review');
  const totalReady = readyCharges.reduce((s, c) => s + c.fee, 0);

  const card = {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  };

  const tabs = [
    { key: 'charges', icon: '💲', label: 'Charge Entry' },
    { key: 'era', icon: '📥', label: 'ERA/EOB Auto-Post' },
    { key: 'rules', icon: '⚙️', label: 'Rules Engine' },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            💰 Charge Posting & ERA Auto-Post
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Post encounter charges, auto-process ERA/EOB payments, and manage claim scrubbing rules
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Ready to Post', value: readyCharges.length, icon: '📋', color: '#4f46e5' },
          { label: 'Needs Review', value: needsReview.length, icon: '⚠️', color: '#f59e0b' },
          { label: 'Posted Today', value: postedCharges.length, icon: '✅', color: '#16a34a' },
          { label: 'Ready Amount', value: `$${totalReady.toFixed(2)}`, icon: '💲', color: '#0891b2' },
          { label: 'ERA Pending Review', value: ERA_PAYMENTS.reduce((s, e) => s + e.needsReview, 0), icon: '📥', color: '#dc2626' },
        ].map(s => (
          <div key={s.label} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: 16 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: `${s.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              padding: '10px 20px', borderRadius: '10px 10px 0 0', border: 'none',
              background: activeTab === t.key ? '#fff' : 'transparent',
              color: activeTab === t.key ? '#4f46e5' : '#64748b',
              fontWeight: activeTab === t.key ? 800 : 600, fontSize: 13, cursor: 'pointer',
              borderBottom: activeTab === t.key ? '2px solid #4f46e5' : '2px solid transparent',
              marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ════ Charge Entry ════ */}
      {activeTab === 'charges' && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: 0 }}>📋 Pending Charges</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={selectAllReady}
                style={{ padding: '8px 14px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                Select All Ready
              </button>
              <button onClick={postCharges} disabled={selectedCharges.size === 0}
                style={{
                  padding: '8px 18px', borderRadius: 8,
                  background: selectedCharges.size > 0 ? 'linear-gradient(135deg,#16a34a,#15803d)' : '#cbd5e1',
                  color: '#fff', border: 'none', fontWeight: 700, fontSize: 12,
                  cursor: selectedCharges.size > 0 ? 'pointer' : 'not-allowed',
                }}>
                {postingComplete ? '✅ Posted!' : `📤 Post ${selectedCharges.size} Charges`}
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ width: 30, padding: '8px 6px' }}></th>
                  {['Patient', 'DOS', 'CPT', 'Description', 'Dx', 'Mod', 'Fee', 'Provider', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 700, color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {charges.map(c => (
                  <tr key={c.id} style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: selectedCharges.has(c.id) ? '#f0f9ff' : c.status === 'Posted' ? '#f0fdf4' : c.status === 'Needs Review' ? '#fffbeb' : 'transparent',
                  }}>
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                      {c.status !== 'Posted' && (
                        <input type="checkbox" checked={selectedCharges.has(c.id)}
                          onChange={() => toggleCharge(c.id)} style={{ accentColor: '#4f46e5' }} />
                      )}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1e293b' }}>{c.patient}</td>
                    <td style={{ padding: '8px 10px', color: '#475569' }}>{c.dos}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ fontWeight: 800, color: '#4f46e5' }}>{c.cpt}</span>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#475569', maxWidth: 200 }}>{c.desc}</td>
                    <td style={{ padding: '8px 10px' }}>
                      {c.dx.map(d => (
                        <span key={d} style={{ padding: '1px 6px', borderRadius: 4, background: '#f1f5f9', color: '#475569', fontSize: 10, fontWeight: 600, marginRight: 4 }}>{d}</span>
                      ))}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#475569' }}>{c.modifier || '—'}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1e293b' }}>${c.fee.toFixed(2)}</td>
                    <td style={{ padding: '8px 10px', fontSize: 11, color: '#64748b' }}>{c.provider}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                        background: c.status === 'Ready' ? '#eff6ff' : c.status === 'Posted' ? '#f0fdf4' : '#fffbeb',
                        color: c.status === 'Ready' ? '#4f46e5' : c.status === 'Posted' ? '#16a34a' : '#d97706',
                      }}>{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════ ERA / EOB Auto-Post ════ */}
      {activeTab === 'era' && (
        <div>
          <div style={{ ...card, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>📥 Electronic Remittance Advices (ERA/835)</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    {['Payer', 'Check / EFT #', 'Date', 'Amount', 'Claims', 'Auto-Posted', 'Needs Review', 'Status'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ERA_PAYMENTS.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e293b' }}>{e.payer}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#475569' }}>{e.checkNo}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{e.date}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: '#16a34a' }}>${e.amount.toFixed(2)}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{e.claims}</td>
                      <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 700 }}>{e.autoPosted}</td>
                      <td style={{ padding: '10px 12px', color: e.needsReview > 0 ? '#d97706' : '#16a34a', fontWeight: 700 }}>{e.needsReview}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: e.status === 'Fully Posted' ? '#f0fdf4' : '#fffbeb',
                          color: e.status === 'Fully Posted' ? '#16a34a' : '#d97706',
                        }}>{e.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={card}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 12px' }}>📊 Auto-Posting Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {[
                { label: 'Total ERA Amount', value: `$${ERA_PAYMENTS.reduce((s, e) => s + e.amount, 0).toFixed(2)}`, color: '#16a34a' },
                { label: 'Total Claims', value: ERA_PAYMENTS.reduce((s, e) => s + e.claims, 0), color: '#4f46e5' },
                { label: 'Auto-Posted', value: ERA_PAYMENTS.reduce((s, e) => s + e.autoPosted, 0), color: '#0891b2' },
                { label: 'Auto-Post Rate', value: `${Math.round((ERA_PAYMENTS.reduce((s, e) => s + e.autoPosted, 0) / ERA_PAYMENTS.reduce((s, e) => s + e.claims, 0)) * 100)}%`, color: '#7c3aed' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: 16, background: '#f7f9fc', borderRadius: 10 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════ Rules Engine ════ */}
      {activeTab === 'rules' && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: 0 }}>⚙️ Claim Scrubbing Rules Engine</h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>Automated rules that validate charges before submission</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RULES_ENGINE.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px',
                background: '#fafbfc', borderRadius: 10, border: `1px solid ${r.active ? '#e2e8f0' : '#fecaca'}`,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{r.rule}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{r.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Triggered</div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#4f46e5' }}>{r.triggered}×</div>
                  </div>
                  <div style={{
                    padding: '3px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: r.active ? '#f0fdf4' : '#fef2f2',
                    color: r.active ? '#16a34a' : '#dc2626',
                  }}>{r.active ? 'Active' : 'Inactive'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
