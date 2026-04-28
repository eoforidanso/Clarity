import React, { useState, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

const MOCK_CARDS = [
  { id: 'ic1', patientName: 'Aniyah Brooks', patientId: 'P001', payer: 'Blue Cross Blue Shield', planType: 'PPO', memberId: 'BCB-8832741-01', groupNum: 'GRP-50421', frontImg: null, backImg: null, capturedBy: 'nurse.kelly', capturedAt: '2026-01-06T09:15:00', status: 'Verified', primary: true },
  { id: 'ic2', patientName: 'Aniyah Brooks', patientId: 'P001', payer: 'Aetna', planType: 'HMO', memberId: 'AET-55218903', groupNum: 'GRP-78402', frontImg: null, backImg: null, capturedBy: 'admin', capturedAt: '2026-01-04T14:22:00', status: 'Verified', primary: false },
  { id: 'ic3', patientName: 'Marcus Rivera', patientId: 'P002', payer: 'UnitedHealthcare', planType: 'EPO', memberId: 'UHC-3319274', groupNum: 'GRP-10085', frontImg: null, backImg: null, capturedBy: 'nurse.kelly', capturedAt: '2026-01-06T10:00:00', status: 'Pending Review', primary: true },
  { id: 'ic4', patientName: 'Sarah Chen', patientId: 'P003', payer: 'Cigna', planType: 'PPO', memberId: 'CIG-4278210', groupNum: 'GRP-22134', frontImg: null, backImg: null, capturedBy: 'admin', capturedAt: '2026-01-05T08:30:00', status: 'Expired', primary: true },
  { id: 'ic5', patientName: 'David Okafor', patientId: 'P004', payer: 'Medicare', planType: 'Original', memberId: '1EG4-TE5-MK72', groupNum: '—', frontImg: null, backImg: null, capturedBy: 'nurse.kelly', capturedAt: '2026-01-06T11:20:00', status: 'Verified', primary: true },
  { id: 'ic6', patientName: 'Emily Tran', patientId: 'P005', payer: 'Molina Healthcare', planType: 'Medicaid', memberId: 'MOL-99120487', groupNum: 'GRP-60013', frontImg: null, backImg: null, capturedBy: 'admin', capturedAt: '2026-01-03T13:40:00', status: 'Pending Review', primary: true },
];

const STATUS_STYLES = {
  'Verified': { bg: '#dcfce7', color: '#166534', icon: '✅' },
  'Pending Review': { bg: '#fef3c7', color: '#92400e', icon: '⏳' },
  'Expired': { bg: '#fee2e2', color: '#991b1b', icon: '🔴' },
  'Invalid': { bg: '#fecaca', color: '#b91c1c', icon: '❌' },
};

export default function InsuranceCardCapture() {
  const { currentUser } = useAuth();
  const [cards, setCards] = useState(MOCK_CARDS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showCapture, setShowCapture] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [captureStep, setCaptureStep] = useState(1); // 1=front, 2=back, 3=verify
  const [newCard, setNewCard] = useState({
    patientName: '', patientId: '', payer: '', planType: '', memberId: '', groupNum: '',
    copay: '', deductible: '', coinsurance: '', rxBin: '', rxPcn: '',
    frontImg: null, backImg: null,
  });
  const frontRef = useRef();
  const backRef = useRef();

  const filtered = useMemo(() => {
    let list = [...cards];
    if (filterStatus !== 'All') list = list.filter(c => c.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.patientName.toLowerCase().includes(q) || c.payer.toLowerCase().includes(q) || c.memberId.toLowerCase().includes(q));
    }
    return list;
  }, [cards, search, filterStatus]);

  const stats = useMemo(() => ({
    total: cards.length,
    verified: cards.filter(c => c.status === 'Verified').length,
    pending: cards.filter(c => c.status === 'Pending Review').length,
    expired: cards.filter(c => c.status === 'Expired').length,
  }), [cards]);

  const handleFileSelect = (side) => {
    // Simulate file selection
    const fakeName = `insurance_${side}_${Date.now()}.jpg`;
    setNewCard(prev => ({ ...prev, [`${side}Img`]: fakeName }));
  };

  const submitCapture = () => {
    const entry = {
      id: 'ic' + Date.now(),
      ...newCard,
      capturedBy: currentUser?.username || 'admin',
      capturedAt: new Date().toISOString(),
      status: 'Pending Review',
      primary: true,
    };
    setCards(prev => [entry, ...prev]);
    setShowCapture(false);
    setCaptureStep(1);
    setNewCard({ patientName: '', patientId: '', payer: '', planType: '', memberId: '', groupNum: '', copay: '', deductible: '', coinsurance: '', rxBin: '', rxPcn: '', frontImg: null, backImg: null });
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>🪪 Insurance Card Capture</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Scan and store patient insurance cards — front desk workflow</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCapture(true)}>📸 Capture Card</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '🪪', val: stats.total, label: 'Total Cards', bg: '#eff6ff' },
          { icon: '✅', val: stats.verified, label: 'Verified', bg: '#dcfce7' },
          { icon: '⏳', val: stats.pending, label: 'Pending Review', bg: '#fef3c7' },
          { icon: '🔴', val: stats.expired, label: 'Expired', bg: '#fee2e2' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{s.icon}</div>
            <div><div style={{ fontSize: 18, fontWeight: 800 }}>{s.val}</div><div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <input className="form-input" placeholder="Search patient, payer, or member ID..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
        <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 160, fontSize: 12 }}>
          <option value="All">All Statuses</option>
          {Object.keys(STATUS_STYLES).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Card Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340, 1fr))', gap: 14 }}>
        {filtered.map(c => {
          const st = STATUS_STYLES[c.status] || STATUS_STYLES['Pending Review'];
          return (
            <div key={c.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setSelectedCard(c)}>
              {/* Simulated Card Front */}
              <div style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', padding: '18px 20px', color: '#fff', position: 'relative' }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>{c.payer}</div>
                <div style={{ fontSize: 11, opacity: 0.9, marginBottom: 10 }}>{c.planType}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  <div><div style={{ fontSize: 8, opacity: 0.65, textTransform: 'uppercase', letterSpacing: 1 }}>Member ID</div><div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{c.memberId}</div></div>
                  <div><div style={{ fontSize: 8, opacity: 0.65, textTransform: 'uppercase', letterSpacing: 1 }}>Group</div><div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{c.groupNum}</div></div>
                </div>
                {c.primary && <span style={{ position: 'absolute', top: 8, right: 10, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700 }}>PRIMARY</span>}
              </div>
              {/* Info row */}
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{c.patientName}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Captured {new Date(c.capturedAt).toLocaleDateString()} by {c.capturedBy}</div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color }}>{st.icon} {c.status}</span>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🪪</div>
          <div style={{ fontWeight: 600 }}>No insurance cards found</div>
        </div>
      )}

      {/* Capture Modal */}
      {showCapture && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowCapture(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>📸 Capture Insurance Card</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Step {captureStep} of 3 — {captureStep === 1 ? 'Front Image' : captureStep === 2 ? 'Back Image' : 'Verify Details'}</div>
            </div>

            {/* Progress */}
            <div style={{ display: 'flex', gap: 4, padding: '14px 22px 0' }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: captureStep >= s ? 'var(--primary)' : '#e2e8f0' }} />
              ))}
            </div>

            <div style={{ padding: 22 }}>
              {captureStep === 1 && (
                <div>
                  <div style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: 30, textAlign: 'center', marginBottom: 14 }}>
                    {newCard.frontImg ? (
                      <div><div style={{ fontSize: 36, marginBottom: 6 }}>✅</div><div style={{ fontWeight: 700 }}>Front image captured</div><div style={{ fontSize: 11, color: '#64748b' }}>{newCard.frontImg}</div></div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 36, marginBottom: 6 }}>📷</div>
                        <div style={{ fontWeight: 700 }}>Scan front of insurance card</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Click below to select or capture image</div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleFileSelect('front')}>📁 Upload File</button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleFileSelect('front')}>📷 Camera</button>
                  </div>
                </div>
              )}

              {captureStep === 2 && (
                <div>
                  <div style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: 30, textAlign: 'center', marginBottom: 14 }}>
                    {newCard.backImg ? (
                      <div><div style={{ fontSize: 36, marginBottom: 6 }}>✅</div><div style={{ fontWeight: 700 }}>Back image captured</div><div style={{ fontSize: 11, color: '#64748b' }}>{newCard.backImg}</div></div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 36, marginBottom: 6 }}>🔄</div>
                        <div style={{ fontWeight: 700 }}>Scan back of insurance card</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Include claims address and Rx information</div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleFileSelect('back')}>📁 Upload File</button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleFileSelect('back')}>📷 Camera</button>
                  </div>
                </div>
              )}

              {captureStep === 3 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    ['Patient Name', 'patientName', '1fr'],
                    ['Patient ID', 'patientId', ''],
                    ['Payer', 'payer', ''],
                    ['Plan Type', 'planType', ''],
                    ['Member ID', 'memberId', ''],
                    ['Group Number', 'groupNum', ''],
                    ['Copay', 'copay', ''],
                    ['Deductible', 'deductible', ''],
                    ['Rx BIN', 'rxBin', ''],
                    ['Rx PCN', 'rxPcn', ''],
                  ].map(([label, key]) => (
                    <div key={key}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 4 }}>{label}</label>
                      <input className="form-input" value={newCard[key]} onChange={e => setNewCard(prev => ({ ...prev, [key]: e.target.value }))} style={{ fontSize: 12 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => { if (captureStep > 1) setCaptureStep(s => s - 1); else setShowCapture(false); }}>
                {captureStep === 1 ? 'Cancel' : '← Back'}
              </button>
              {captureStep < 3 ? (
                <button className="btn btn-primary" onClick={() => setCaptureStep(s => s + 1)}>Next →</button>
              ) : (
                <button className="btn btn-primary" onClick={submitCapture}>✅ Save Card</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedCard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedCard(null); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', padding: '18px 22px', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{selectedCard.payer}</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>{selectedCard.planType} — {selectedCard.primary ? 'Primary' : 'Secondary'}</div>
            </div>
            <div style={{ padding: 22 }}>
              {[
                ['Patient', selectedCard.patientName],
                ['Member ID', selectedCard.memberId],
                ['Group #', selectedCard.groupNum],
                ['Status', selectedCard.status],
                ['Captured By', selectedCard.capturedBy],
                ['Captured', new Date(selectedCard.capturedAt).toLocaleString()],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{l}</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => {
                  setCards(prev => prev.map(c => c.id === selectedCard.id ? { ...c, status: 'Verified' } : c));
                  setSelectedCard(null);
                }}>✅ Verify</button>
                <button className="btn btn-secondary" style={{ flex: 1, color: '#dc2626' }} onClick={() => {
                  setCards(prev => prev.map(c => c.id === selectedCard.id ? { ...c, status: 'Expired' } : c));
                  setSelectedCard(null);
                }}>🔴 Mark Expired</button>
              </div>
            </div>
            <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedCard(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
