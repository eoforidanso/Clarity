import React, { useState, useMemo } from 'react';

// ─── Benefit Categories ───────────────────────────────────────────────────────
const BENEFIT_CODES = {
  '30': 'Mental Health', '45': 'Substance Abuse', '1': 'Medical Care', 'UC': 'Urgent Care',
  'AK': 'State Mandated', 'MH': 'Mental Health', 'SP': 'Specialty', 'HC': 'Home Health Care',
};
const COVERAGE_LEVELS = { 'IND': 'Individual', 'FAM': 'Family', 'EMP': 'Employee Only', 'ECH': 'Employee + Children' };
const NETWORK_CODES = { 'IN': 'In-Network', 'OUT': 'Out-of-Network', 'COB': 'Coordination of Benefits' };
const RELATIONSHIP_CODES = { '18': 'Self', '01': 'Spouse', '19': 'Child', '34': 'Other Adult', 'G8': 'Other Relationship' };

// ─── Seed 270 Requests ────────────────────────────────────────────────────────
const SEED_REQUESTS = [
  {
    id: 'elig-001', created: '2026-05-23T08:45:00', status: 'Response Received',
    patient: 'James Anderson', mrn: 'MRN-00001', dob: '1980-01-15', memberId: 'BCB123456789',
    payer: 'Blue Cross Blue Shield', payerId: '00510', partner: 'Availity',
    provider: 'Elena Martinez, MD', npi: '9876543210', dos: '2026-05-23',
    serviceType: '30', traceNum: 'REF-2026-0523-001',
    response: {
      status: 'Active', planName: 'BCBS PPO Gold', groupNum: 'GRP-001',
      deductible: { individual: 1500, met: 800, remaining: 700 },
      oop: { individual: 3000, met: 1250, remaining: 1750 },
      copay: 30, coinsurance: 20,
      mentalHealth: { sessions: 30, used: 12, remaining: 18, auth: false, deductibleApplies: true },
      network: 'IN', effectiveDate: '2026-01-01', termDate: '2026-12-31',
      primaryCare: 'Required', referral: 'Not Required',
      aaMessages: ['Patient has met 53% of deductible', 'Mental health benefits covered under medical plan'],
    },
  },
  {
    id: 'elig-002', created: '2026-05-23T08:45:05', status: 'Response Received',
    patient: 'Maria Garcia', mrn: 'MRN-00002', dob: '1992-07-22', memberId: 'AET987654321',
    payer: 'Aetna', payerId: 'AETNA', partner: 'Availity',
    provider: 'Elena Martinez, MD', npi: '9876543210', dos: '2026-05-23',
    serviceType: '30', traceNum: 'REF-2026-0523-002',
    response: {
      status: 'Active', planName: 'Aetna Choice POS II', groupNum: 'GRP-002',
      deductible: { individual: 2000, met: 0, remaining: 2000 },
      oop: { individual: 5000, met: 0, remaining: 5000 },
      copay: 50, coinsurance: 30,
      mentalHealth: { sessions: 52, used: 8, remaining: 44, auth: true, deductibleApplies: true },
      network: 'IN', effectiveDate: '2026-01-01', termDate: '2026-12-31',
      primaryCare: 'Not Required', referral: 'Not Required',
      aaMessages: ['Prior authorization required for outpatient mental health services > 3 visits', 'Telehealth covered with modifier 95'],
    },
  },
  {
    id: 'elig-003', created: '2026-05-23T08:45:10', status: 'Response Received',
    patient: 'David Thompson', mrn: 'MRN-00003', dob: '1975-04-08', memberId: 'UHC456789012',
    payer: 'UnitedHealthcare', payerId: 'UHC001', partner: 'Optum / UHC Direct',
    provider: 'April T., LCSW', npi: '1234567890', dos: '2026-05-23',
    serviceType: '45', traceNum: 'REF-2026-0523-003',
    response: {
      status: 'Active', planName: 'UHC Choice Plus', groupNum: 'GRP-003',
      deductible: { individual: 1000, met: 1000, remaining: 0 },
      oop: { individual: 4000, met: 2100, remaining: 1900 },
      copay: 0, coinsurance: 20,
      mentalHealth: { sessions: 'Unlimited', used: 22, remaining: 'Unlimited', auth: false, deductibleApplies: false },
      network: 'IN', effectiveDate: '2026-01-01', termDate: '2026-12-31',
      primaryCare: 'Not Required', referral: 'Not Required',
      aaMessages: ['Deductible fully met — services at coinsurance only', 'Substance abuse benefits covered with no session limit'],
    },
  },
  {
    id: 'elig-004', created: '2026-05-23T08:45:15', status: 'Inactive Coverage',
    patient: 'Emily Chen', mrn: 'MRN-00004', dob: '2000-09-12', memberId: 'CIG321654987',
    payer: 'Cigna', payerId: 'CIGNA', partner: 'Waystar',
    provider: 'Michael Johnson, PMHNP', npi: '5678901234', dos: '2026-05-23',
    serviceType: '30', traceNum: 'REF-2026-0523-004',
    response: {
      status: 'Inactive', planName: 'Cigna Open Access Plus', groupNum: 'GRP-004',
      deductible: null, oop: null, copay: null, coinsurance: null,
      mentalHealth: null, network: null, effectiveDate: null, termDate: '2026-03-31',
      primaryCare: null, referral: null,
      aaMessages: ['Coverage terminated 2026-03-31. Patient may be uninsured or on COBRA.'],
    },
  },
  {
    id: 'elig-005', created: '2026-05-23T08:45:20', status: 'Pending',
    patient: 'Aisha Patel', mrn: 'MRN-00006', dob: '1988-11-03', memberId: 'ANT654987321',
    payer: 'Anthem', payerId: 'ANTHEM', partner: 'Availity',
    provider: 'Elena Martinez, MD', npi: '9876543210', dos: '2026-05-23',
    serviceType: '30', traceNum: 'REF-2026-0523-005',
    response: null,
  },
];

const STATUS_C = {
  'Response Received': { bg: '#d1fae5', col: '#065f46' },
  'Inactive Coverage':  { bg: '#fee2e2', col: '#991b1b' },
  'Pending':            { bg: '#fef3c7', col: '#92400e' },
  'Error':              { bg: '#fee2e2', col: '#991b1b' },
};

const build270 = (r) => {
  const date = r.dos.replace(/-/g,'');
  const time = '0845';
  return `ISA*00*          *00*          *ZZ*CLARITYEHR     *01*AVAILITY       *260523*${time}*^*00501*000000100*1*P*:~
GS*HS*CLARITYEHR*${r.payerId}*20260523*${time}*100*X*005010X279A1~
ST*270*0100~
BHT*0022*13*${r.traceNum}*20260523*${time}~
HL*1**20*1~
NM1*PR*2*CLARITY BEHAVIORAL HEALTH*****XX*1234567890~
HL*2*1*21*1~
NM1*1P*1*${r.provider.split(',')[0].split(' ').slice(-1)[0]}*${r.provider.split(' ')[0]}****XX*${r.npi}~
HL*3*2*22*0~
TRN*1*${r.traceNum}*9876543210~
NM1*IL*1*${r.patient.split(' ').slice(-1)[0]}*${r.patient.split(' ')[0]}****MI*${r.memberId}~
DMG*D8*${r.dob.replace(/-/g,'')}~
EQ*${r.serviceType}~
SE*14*0100~
GE*1*100~
IEA*1*000000100~`;
};

const build271 = (r) => {
  if (!r.response || r.response.status === 'Inactive') {
    return `ISA*00*          *00*          *01*${r.payerId.padEnd(15)}*ZZ*CLARITYEHR     *260523*0847*^*00501*000000101*1*P*:~
GS*HB*${r.payerId}*CLARITYEHR*20260523*0847*101*X*005010X279A1~
ST*271*0101~
BHT*0022*11*${r.traceNum}*20260523*0847~
HL*1**20*1~
NM1*PR*2*${r.payer.toUpperCase()}*****PI*${r.payerId}~
HL*2*1*21*1~
NM1*1P*1*${r.provider.split(',')[0].split(' ').slice(-1)[0]}*${r.provider.split(' ')[0]}****XX*${r.npi}~
HL*3*2*22*0~
TRN*2*${r.traceNum}*9999999999~
NM1*IL*1*${r.patient.split(' ').slice(-1)[0]}*${r.patient.split(' ')[0]}****MI*${r.memberId}~
AAA*N*6*72*Y~
SE*12*0101~
GE*1*101~
IEA*1*000000101~`;
  }
  const resp = r.response;
  return `ISA*00*          *00*          *01*${r.payerId.padEnd(15)}*ZZ*CLARITYEHR     *260523*0847*^*00501*000000101*1*P*:~
GS*HB*${r.payerId}*CLARITYEHR*20260523*0847*101*X*005010X279A1~
ST*271*0101~
BHT*0022*11*${r.traceNum}*20260523*0847~
HL*1**20*1~
NM1*PR*2*${r.payer.toUpperCase()}*****PI*${r.payerId}~
HL*2*1*21*1~
NM1*1P*1*${r.provider.split(',')[0].split(' ').slice(-1)[0]}*${r.provider.split(' ')[0]}****XX*${r.npi}~
HL*3*2*22*0~
TRN*2*${r.traceNum}*9999999999~
NM1*IL*1*${r.patient.split(' ').slice(-1)[0]}*${r.patient.split(' ')[0]}****MI*${r.memberId}~
DMG*D8*${r.dob.replace(/-/g,'')}~
INS*Y*18*001*25~
DTP*356*D8*${resp.effectiveDate?.replace(/-/g,'')||'20260101'}~
LS*2120~
NM1*PR*2*${r.payer.toUpperCase()}*****PI*${r.payerId}~
LE*2120~
EB*1*IND*${r.serviceType}*HM*${resp.planName}~
EB*C*IND*${r.serviceType}**${resp.deductible?.individual||0}~
EB*G*IND*${r.serviceType}**${resp.deductible?.remaining||0}~
EB*A*IND*${r.serviceType}**${resp.copay||0}~
EB*AB*IND*${r.serviceType}**${resp.oop?.individual||0}~
${resp.aaMessages?.map(m => `MSG*${m}~`).join('\n')||''}
SE*${22 + (resp.aaMessages?.length||0)}*0101~
GE*1*101~
IEA*1*000000101~`;
};

export default function EDI270Engine() {
  const [requests, setRequests] = useState(SEED_REQUESTS);
  const [selected, setSelected] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [viewTab, setViewTab] = useState('summary');
  const [newForm, setNewForm] = useState({ patient: '', dob: '', memberId: '', payer: 'Blue Cross Blue Shield', payerId: '00510', serviceType: '30', dos: new Date().toISOString().slice(0,10) });
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const stats = useMemo(() => ({
    total: requests.length,
    active: requests.filter(r => r.response?.status === 'Active').length,
    inactive: requests.filter(r => r.response?.status === 'Inactive' || r.status === 'Inactive Coverage').length,
    pending: requests.filter(r => r.status === 'Pending').length,
    auth: requests.filter(r => r.response?.mentalHealth?.auth).length,
  }), [requests]);

  const handleSend = () => {
    const newReq = {
      id: 'elig-new-' + Date.now(), created: new Date().toISOString(), status: 'Response Received',
      patient: newForm.patient, mrn: 'MRN-NEW', dob: newForm.dob, memberId: newForm.memberId,
      payer: newForm.payer, payerId: newForm.payerId, partner: 'Availity',
      provider: 'Elena Martinez, MD', npi: '9876543210', dos: newForm.dos,
      serviceType: newForm.serviceType, traceNum: 'REF-NEW-' + Date.now().toString().slice(-6),
      response: {
        status: 'Active', planName: newForm.payer + ' PPO', groupNum: 'GRP-SIM',
        deductible: { individual: 1500, met: 400, remaining: 1100 },
        oop: { individual: 3500, met: 400, remaining: 3100 },
        copay: 30, coinsurance: 20,
        mentalHealth: { sessions: 30, used: 0, remaining: 30, auth: false, deductibleApplies: true },
        network: 'IN', effectiveDate: '2026-01-01', termDate: '2026-12-31',
        primaryCare: 'Not Required', referral: 'Not Required',
        aaMessages: ['Simulated eligibility response — verify with actual payer portal'],
      },
    };
    setRequests(prev => [newReq, ...prev]);
    setShowNewModal(false);
    showToast('270 sent for ' + newForm.patient + ' — 271 response received.');
  };

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#059669', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🔍 270 / 271 Eligibility Engine</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Send 270 eligibility inquiries and parse 271 benefit responses with deductible, copay, mental health limits, and auth requirements</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => showToast('Batch 270 sent for all scheduled patients today.')} style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>📅 Batch Eligibility Check</button>
          <button onClick={() => setShowNewModal(true)} className="btn btn-primary" style={{ fontSize: 13 }}>+ New 270 Inquiry</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total Inquiries', value: stats.total, accent: '#6366f1' },
          { label: 'Active Coverage', value: stats.active, accent: '#10b981' },
          { label: 'Inactive', value: stats.inactive, accent: '#ef4444' },
          { label: 'Pending', value: stats.pending, accent: '#f59e0b' },
          { label: 'Auth Required', value: stats.auth, accent: '#7c3aed' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', borderLeft: '4px solid ' + s.accent }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 16 }}>
        {[['list','📋 Inquiry Log'], ['batch','📅 Batch Schedule']].map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '10px 18px', border: 'none', background: 'transparent', color: activeTab === t ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: activeTab === t ? 700 : 500, fontSize: 13, cursor: 'pointer', borderBottom: '3px solid ' + (activeTab === t ? 'var(--primary)' : 'transparent'), marginBottom: -2 }}>
            {l}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {requests.map(req => {
            const sc = STATUS_C[req.status] || STATUS_C.Pending;
            const resp = req.response;
            return (
              <div key={req.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 16, cursor: 'pointer', borderLeft: '4px solid ' + (req.response?.status === 'Active' ? '#10b981' : req.response?.status === 'Inactive' ? '#ef4444' : '#f59e0b') }} onClick={() => { setSelected(req); setViewTab('summary'); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 14 }}>{req.patient}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{req.mrn}</span>
                      <span style={{ background: sc.bg, color: sc.col, padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{req.status}</span>
                      {resp?.mentalHealth?.auth && <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>Auth Required</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span>Payer: <strong style={{ color: '#374151' }}>{req.payer}</strong></span>
                      <span>Member: <strong style={{ color: '#374151' }}>{req.memberId}</strong></span>
                      <span>Service: <strong style={{ color: '#374151' }}>{BENEFIT_CODES[req.serviceType] || req.serviceType}</strong></span>
                      <span>DOS: <strong style={{ color: '#374151' }}>{req.dos}</strong></span>
                    </div>
                    {resp && resp.status === 'Active' && (
                      <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                        {resp.deductible && (
                          <div style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                            Ded: <strong>${resp.deductible.met} / ${resp.deductible.individual}</strong> met
                            <div style={{ height: 3, borderRadius: 2, background: '#e5e7eb', marginTop: 3, width: 80 }}>
                              <div style={{ height: '100%', width: (resp.deductible.met / resp.deductible.individual * 100) + '%', background: '#10b981', borderRadius: 2 }} />
                            </div>
                          </div>
                        )}
                        {resp.mentalHealth && (
                          <div style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                            MH Sessions: <strong>{resp.mentalHealth.used} / {resp.mentalHealth.sessions}</strong> used
                          </div>
                        )}
                        {resp.copay != null && (
                          <div style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: '#fef3c7', border: '1px solid #fde68a' }}>
                            Copay: <strong>${resp.copay}</strong>
                          </div>
                        )}
                        {resp.coinsurance != null && (
                          <div style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: '#f3e8ff', border: '1px solid #e9d5ff' }}>
                            Coins: <strong>{resp.coinsurance}%</strong>
                          </div>
                        )}
                      </div>
                    )}
                    {resp?.status === 'Inactive' && (
                      <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fca5a5', fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                        ⛔ {resp.aaMessages?.[0]}
                      </div>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); setSelected(req); setViewTab('summary'); }} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer' }}>
                    View 271 →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'batch' && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>📅 Batch Eligibility Schedule</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              { name: 'Day-Before Appointment Batch', schedule: 'Daily 6:00 PM', scope: 'All appointments next business day', partner: 'Availity', last: '2026-05-22 18:00', count: 12 },
              { name: 'Morning of Service Batch', schedule: 'Daily 7:00 AM', scope: 'All appointments today', partner: 'Availity', last: '2026-05-23 07:00', count: 5 },
              { name: 'New Patient Pre-Auth Check', schedule: 'On Scheduling', scope: 'New patient appointments', partner: 'All Partners', last: '2026-05-23 09:00', count: 2 },
              { name: 'Monthly Deductible Refresh', schedule: '1st of Month 8:00 AM', scope: 'All active patients', partner: 'All Partners', last: '2026-05-01 08:00', count: 48 },
            ].map(b => (
              <div key={b.name} style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{b.schedule} · {b.scope} · Partner: {b.partner}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Last run: {b.last} · {b.count} records checked</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => showToast(b.name + ' triggered manually.')} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', fontWeight: 700, cursor: 'pointer' }}>▶ Run Now</button>
                  <button style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>Edit Schedule</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 271 Detail Modal */}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 760, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ background: selected.response?.status === 'Inactive' ? 'linear-gradient(135deg, #7f1d1d, #991b1b)' : 'linear-gradient(135deg, #064e3b, #065f46)', color: '#fff', margin: -20, padding: '16px 20px', marginBottom: 0, borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{selected.patient}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{selected.payer} · {selected.memberId}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{selected.status}</span>
                <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 18 }}>×</button>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              {[['summary','📋 Benefits Summary'], ['raw','📄 Raw 271 EDI'], ['270','📤 270 Sent']].map(([t, l]) => (
                <button key={t} onClick={() => setViewTab(t)} style={{ flex: 1, padding: '10px', border: 'none', background: viewTab === t ? '#eff6ff' : 'transparent', color: viewTab === t ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: viewTab === t ? 700 : 500, fontSize: 12, cursor: 'pointer', borderBottom: '2px solid ' + (viewTab === t ? 'var(--primary)' : 'transparent') }}>
                  {l}
                </button>
              ))}
            </div>

            <div className="modal-body">
              {viewTab === 'summary' && selected.response && (
                <div>
                  {selected.response.status === 'Inactive' ? (
                    <div style={{ padding: 20, borderRadius: 10, background: '#fef2f2', border: '1px solid #fca5a5', textAlign: 'center' }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>⛔</div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#dc2626', marginBottom: 6 }}>Coverage Inactive</div>
                      {selected.response.termDate && <div style={{ color: '#7f1d1d', fontSize: 12 }}>Plan terminated: {selected.response.termDate}</div>}
                      {selected.response.aaMessages?.map((m, i) => <div key={i} style={{ color: '#7f1d1d', fontSize: 12, marginTop: 4 }}>{m}</div>)}
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                        {[
                          ['Plan', selected.response.planName], ['Group #', selected.response.groupNum],
                          ['Network', NETWORK_CODES[selected.response.network] || selected.response.network],
                          ['Effective', selected.response.effectiveDate + ' – ' + selected.response.termDate],
                          ['Copay', selected.response.copay != null ? '$' + selected.response.copay : '—'],
                          ['Coinsurance', selected.response.coinsurance != null ? selected.response.coinsurance + '%' : '—'],
                          ['PCP Required', selected.response.primaryCare], ['Referral', selected.response.referral],
                        ].map(([k, v]) => (
                          <div key={k} style={{ background: '#f8fafc', borderRadius: 7, padding: '10px 12px', border: '1px solid var(--border)', fontSize: 12 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{v}</div>
                          </div>
                        ))}
                      </div>

                      {selected.response.deductible && (
                        <div style={{ marginBottom: 12, padding: '12px 14px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                          <div style={{ fontWeight: 700, fontSize: 12, color: '#166534', marginBottom: 10 }}>💰 Deductible & Out-of-Pocket</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {[['Individual Deductible', selected.response.deductible], ['Individual OOP Max', selected.response.oop]].map(([label, d]) => d && (
                              <div key={label}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 6 }}>{label}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                  <span>Met: <strong>${d.met}</strong></span>
                                  <span>Limit: <strong>${d.individual}</strong></span>
                                  <span>Remaining: <strong style={{ color: d.remaining === 0 ? '#059669' : '#d97706' }}>${d.remaining}</strong></span>
                                </div>
                                <div style={{ height: 8, borderRadius: 4, background: '#e5e7eb', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: (d.met / d.individual * 100) + '%', background: d.remaining === 0 ? '#10b981' : '#3b82f6', borderRadius: 4 }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selected.response.mentalHealth && (
                        <div style={{ marginBottom: 12, padding: '12px 14px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                          <div style={{ fontWeight: 700, fontSize: 12, color: '#1d4ed8', marginBottom: 10 }}>
                            🧠 Mental Health / Behavioral Benefits
                            {selected.response.mentalHealth.auth && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#ede9fe', color: '#6d28d9', fontWeight: 700, marginLeft: 8 }}>Auth Required</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 14, fontSize: 12, flexWrap: 'wrap' }}>
                            <div>Sessions Limit: <strong>{selected.response.mentalHealth.sessions}</strong></div>
                            <div>Used: <strong>{selected.response.mentalHealth.used}</strong></div>
                            <div>Remaining: <strong style={{ color: '#1d4ed8' }}>{selected.response.mentalHealth.remaining}</strong></div>
                            <div>Deductible Applies: <strong>{selected.response.mentalHealth.deductibleApplies ? 'Yes' : 'No'}</strong></div>
                          </div>
                        </div>
                      )}

                      {selected.response.aaMessages?.length > 0 && (
                        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef3c7', border: '1px solid #fde68a' }}>
                          <div style={{ fontWeight: 700, fontSize: 11, color: '#92400e', marginBottom: 6 }}>⚠️ Payer Notes / AAA Messages</div>
                          {selected.response.aaMessages.map((m, i) => <div key={i} style={{ fontSize: 12, color: '#78350f', marginBottom: 3 }}>• {m}</div>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {viewTab === 'raw' && (
                <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 10, fontSize: 11, lineHeight: 1.8, overflowX: 'auto', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 440, overflowY: 'auto', margin: 0 }}>
                  {build271(selected)}
                </pre>
              )}

              {viewTab === '270' && (
                <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 10, fontSize: 11, lineHeight: 1.8, overflowX: 'auto', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 440, overflowY: 'auto', margin: 0 }}>
                  {build270(selected)}
                </pre>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { showToast('Eligibility saved to patient record.'); setSelected(null); }}>💾 Save to Chart</button>
            </div>
          </div>
        </div>
      )}

      {/* New 270 Modal */}
      {showNewModal && (
        <div className="modal-backdrop" onClick={() => setShowNewModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 500 }}>
            <div className="modal-header"><h3>🔍 New 270 Eligibility Inquiry</h3><button className="modal-close" onClick={() => setShowNewModal(false)}>×</button></div>
            <div className="modal-body" style={{ display: 'grid', gap: 12 }}>
              <div><label className="form-label">Patient Name *</label><input className="form-input" value={newForm.patient} onChange={e => setNewForm(p => ({ ...p, patient: e.target.value }))} placeholder="First Last" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label className="form-label">Date of Birth</label><input type="date" className="form-input" value={newForm.dob} onChange={e => setNewForm(p => ({ ...p, dob: e.target.value }))} /></div>
                <div><label className="form-label">Member ID *</label><input className="form-input" value={newForm.memberId} onChange={e => setNewForm(p => ({ ...p, memberId: e.target.value }))} placeholder="e.g. BCB123456789" /></div>
              </div>
              <div><label className="form-label">Payer</label>
                <select className="form-input" value={newForm.payer} onChange={e => setNewForm(p => ({ ...p, payer: e.target.value }))}>
                  {['Blue Cross Blue Shield','Aetna','UnitedHealthcare','Cigna','Anthem'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label className="form-label">Service Type</label>
                  <select className="form-input" value={newForm.serviceType} onChange={e => setNewForm(p => ({ ...p, serviceType: e.target.value }))}>
                    {Object.entries(BENEFIT_CODES).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
                  </select>
                </div>
                <div><label className="form-label">Date of Service</label><input type="date" className="form-input" value={newForm.dos} onChange={e => setNewForm(p => ({ ...p, dos: e.target.value }))} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNewModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSend}>📤 Send 270</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
