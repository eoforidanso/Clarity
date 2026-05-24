import React, { useState, useMemo } from 'react';

// ─── CPT / Fee Data ───────────────────────────────────────────────────────────
const CPT_FEE = { '99213': 120, '99214': 185, '99215': 250, '90792': 350, '90837': 175, '90834': 140, '90832': 105, '90833': 95, '90853': 120, '96127': 30 };
const CPT_DESC = { '99213': 'Office Visit, Low', '99214': 'Office Visit, Moderate', '99215': 'Office Visit, High', '90792': 'Psychiatric Eval', '90837': 'Psychotherapy 60 min', '90834': 'Psychotherapy 45 min', '90832': 'Psychotherapy 30 min', '90833': 'Psychotherapy Add-On 30 min', '90853': 'Group Psychotherapy', '96127': 'Behavioral Assessment' };
const ICD10 = ['F33.1 — MDD, Recurrent, Moderate', 'F43.10 — PTSD', 'F31.32 — Bipolar, Depressed', 'F41.1 — Generalized Anxiety', 'F90.0 — ADHD, Inattentive', 'F11.20 — Opioid Use Disorder', 'F20.9 — Schizophrenia', 'F60.3 — Borderline Personality'];
const POS_CODES = ['11 — Office', '02 — Telehealth (Other)', '10 — Telehealth (Home)', '22 — Outpatient Hospital', '23 — Emergency Room'];
const PAYERS = [
  { name: 'Blue Cross Blue Shield', id: '00510', receiverId: 'AVAILITY       ', qualId: '01' },
  { name: 'Aetna', id: 'AETNA', receiverId: 'CHANGEHC       ', qualId: '01' },
  { name: 'UnitedHealthcare', id: 'UHC001', receiverId: 'OPTUM          ', qualId: '01' },
  { name: 'Cigna', id: 'CIGNA', receiverId: 'WAYSTAR        ', qualId: '01' },
];
const VALIDATION_RULES = [
  { id: 'v-001', field: 'Billing Provider NPI', segment: 'NM1*85', required: true },
  { id: 'v-002', field: 'Rendering Provider NPI', segment: 'NM1*82', required: true },
  { id: 'v-003', field: 'Patient Member ID', segment: 'NM1*IL', required: true },
  { id: 'v-004', field: 'ICD-10 Diagnosis Code', segment: 'HI*ABK', required: true },
  { id: 'v-005', field: 'CPT Procedure Code', segment: 'SV1*HC', required: true },
  { id: 'v-006', field: 'Claim Frequency (CLM05-3)', segment: 'CLM*05', required: true },
  { id: 'v-007', field: 'Modifier 25 (same-day E&M+therapy)', segment: 'SV1*25', required: false, conditional: true },
  { id: 'v-008', field: 'Place of Service Code', segment: 'CLM*05-1', required: true },
  { id: 'v-009', field: 'Service Date (DTP*472)', segment: 'DTP*472', required: true },
  { id: 'v-010', field: 'Claim Charge Amount', segment: 'CLM*02', required: true },
];

// ─── Seed Claims Queue ────────────────────────────────────────────────────────
const SEED_QUEUE = [
  { id: 'q-001', claimNum: 'CLM-2026-009', patient: 'James Anderson', mrn: 'MRN-00001', payer: 'Blue Cross Blue Shield', payerId: '00510', cpts: ['99214'], icds: ['F33.1'], pos: '11', charge: 185, dos: '2026-05-20', provider: 'Elena Martinez, MD', npi: '9876543210', status: 'Ready', errors: [] },
  { id: 'q-002', claimNum: 'CLM-2026-010', patient: 'Maria Garcia', mrn: 'MRN-00002', payer: 'Aetna', payerId: 'AETNA', cpts: ['90837', '99214'], icds: ['F43.10'], pos: '11', charge: 360, dos: '2026-05-21', provider: 'April T., LCSW', npi: '1234567890', status: 'Error', errors: ['Modifier 25 required: E&M billed same-day as psychotherapy', 'Aetna: verify modifier 95 for telehealth'] },
  { id: 'q-003', claimNum: 'CLM-2026-011', patient: 'David Thompson', mrn: 'MRN-00003', payer: 'UnitedHealthcare', payerId: 'UHC001', cpts: ['90837'], icds: ['F11.20'], pos: '11', charge: 175, dos: '2026-05-22', provider: 'April T., LCSW', npi: '1234567890', status: 'Generated', errors: [] },
  { id: 'q-004', claimNum: 'CLM-2026-012', patient: 'Emily Chen', mrn: 'MRN-00004', payer: 'Cigna', payerId: 'CIGNA', cpts: ['99215'], icds: ['F90.0', 'F41.1'], pos: '11', charge: 250, dos: '2026-05-22', provider: 'Michael Johnson, PMHNP', npi: '5678901234', status: 'Validated', errors: [] },
];

const STATUS_C = { Ready: '#d1fae5,#065f46', Error: '#fee2e2,#991b1b', Generated: '#fef3c7,#92400e', Validated: '#dbeafe,#1d4ed8', Submitted: '#d1fae5,#059669' };
function StatusBadge({ s }) { const [bg, c] = (STATUS_C[s] || '#f3f4f6,#374151').split(','); return <span style={{ background: bg, color: c, padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{s}</span>; }

const buildEdi = (claim, form) => {
  const payer = PAYERS.find(p => p.id === claim.payerId) || PAYERS[0];
  const today = '260523'; const time = '0912';
  const ctrl = '000000' + Math.floor(Math.random() * 999).toString().padStart(3,'0');
  const totalCharge = claim.cpts.reduce((s, c) => s + (CPT_FEE[c] || 0), 0).toFixed(2);
  const lines = [
    `ISA*00*          *00*          *ZZ*CLARITYEHR     *${payer.qualId}*${payer.receiverId}*${today}*${time}*^*00501*${ctrl}*1*P*:~`,
    `GS*HC*CLARITYEHR*${payer.id}*20260523*${time}*1*X*005010X222A1~`,
    `ST*837*0001*005010X222A1~`,
    `BHT*0019*00*${claim.claimNum}*20260523*${time}*CH~`,
    `NM1*41*2*CLARITY BEHAVIORAL HEALTH*****46*1234567890~`,
    `PER*IC*BILLING*TE*5551234567~`,
    `NM1*40*2*${claim.payer.toUpperCase()}*****46*${claim.payerId}~`,
    `HL*1**20*1~`,
    `NM1*85*2*CLARITY BEHAVIORAL HEALTH*****XX*1234567890~`,
    `N3*123 MAIN ST~`,
    `N4*ANYTOWN*CA*90210~`,
    `REF*EI*123456789~`,
    `HL*2*1*22*0~`,
    `SBR*P*18*${claim.mrn}**CH****MC~`,
    `NM1*IL*1*${claim.patient.split(' ').reverse()[0]}*${claim.patient.split(' ')[0]}****MI*MEM${claim.mrn.replace('MRN-','').padStart(9,'0')}~`,
    `N3*456 OAK AVE~`,
    `N4*CITYNAME*CA*90211~`,
    `DMG*D8*19800115*M~`,
    `NM1*PR*2*${claim.payer.toUpperCase()}*****PI*${claim.payerId}~`,
    `CLM*${claim.claimNum}*${totalCharge}***${claim.pos}:B:1*Y*A*Y*I~`,
    `DTP*472*D8*${claim.dos.replace(/-/g,'')}~`,
    `REF*D9*${claim.claimNum}~`,
    ...claim.icds.map((icd, i) => `HI*${i===0?'ABK':'ABF'}:${icd.split(' ')[0]}~`),
    `NM1*82*1*${claim.provider.split(',')[0].split(' ').slice(-1)[0]}*${claim.provider.split(' ')[0]}****XX*${claim.npi}~`,
    ...claim.cpts.map(cpt => [`SV1*HC:${cpt}*${(CPT_FEE[cpt]||0).toFixed(2)}*UN*1***1~`, `DTP*472*D8*${claim.dos.replace(/-/g,'')}~`]).flat(),
    `SE*${24 + claim.cpts.length * 2}*0001~`,
    `GE*1*1~`,
    `IEA*1*${ctrl}~`,
  ];
  return lines.join('\n');
};

export default function EDI837Generator() {
  const [queue, setQueue] = useState(SEED_QUEUE);
  const [viewEdi, setViewEdi] = useState(null);
  const [activeTab, setActiveTab] = useState('queue');
  const [form, setForm] = useState({ patient: '', payer: PAYERS[0].name, cpts: ['99214'], icds: [ICD10[0]], pos: '11 — Office', dos: new Date().toISOString().slice(0,10), provider: 'Elena Martinez, MD', npi: '9876543210', memberid: '' });
  const [generatedEdi, setGeneratedEdi] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const stats = useMemo(() => ({
    ready: queue.filter(q => q.status === 'Ready' || q.status === 'Validated').length,
    errors: queue.filter(q => q.status === 'Error').length,
    total: queue.length,
  }), [queue]);

  const handleGenerate = () => {
    if (!form.patient || !form.npi || !form.memberid) { showToast('Fill in patient name, NPI, and member ID.'); return; }
    const payer = PAYERS.find(p => p.name === form.payer) || PAYERS[0];
    const mock = { claimNum: 'CLM-NEW-' + Date.now().toString().slice(-4), patient: form.patient, mrn: 'MRN-NEW', payer: form.payer, payerId: payer.id, cpts: form.cpts, icds: form.icds.map(i => i.split(' ')[0]), pos: form.pos.split(' ')[0], dos: form.dos, provider: form.provider, npi: form.npi };
    setGeneratedEdi(buildEdi(mock, form));
    setValidationResult(null);
    showToast('837P generated successfully.');
  };

  const handleValidate = (claim) => {
    const errors = [];
    if (!claim.npi) errors.push({ seg: 'NM1*82', msg: 'Rendering provider NPI missing' });
    if (!claim.icds || claim.icds.length === 0) errors.push({ seg: 'HI*ABK', msg: 'No ICD-10 diagnosis code' });
    const hasEM = claim.cpts.some(c => ['99213','99214','99215'].includes(c));
    const hasPsy = claim.cpts.some(c => ['90837','90834','90832'].includes(c));
    if (hasEM && hasPsy) errors.push({ seg: 'SV1', msg: 'Modifier 25 required: E&M + psychotherapy same day' });
    setQueue(prev => prev.map(q => q.id === claim.id ? { ...q, status: errors.length === 0 ? 'Validated' : 'Error', errors: errors.map(e => e.msg) } : q));
    showToast(errors.length === 0 ? claim.claimNum + ' validated — clean.' : claim.claimNum + ': ' + errors.length + ' validation error(s) found.');
  };

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#059669', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>⚙️ 837 Generator & Validator</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Build, validate, and preview ANSI X12 837P professional claim transactions with live segment rendering</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'In Queue', value: stats.total, accent: '#6366f1' },
          { label: 'Ready / Validated', value: stats.ready, accent: '#10b981' },
          { label: 'Errors', value: stats.errors, accent: '#ef4444' },
          { label: 'Validation Rules', value: VALIDATION_RULES.length, accent: '#3b82f6' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', borderLeft: '4px solid ' + s.accent }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 16 }}>
        {[['queue','📋 Claim Queue'], ['builder','🔨 837 Builder'], ['rules','✅ Validation Rules']].map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '10px 18px', border: 'none', background: 'transparent', color: activeTab === t ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: activeTab === t ? 700 : 500, fontSize: 13, cursor: 'pointer', borderBottom: '3px solid ' + (activeTab === t ? 'var(--primary)' : 'transparent'), marginBottom: -2 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Claim Queue */}
      {activeTab === 'queue' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {queue.map(claim => (
            <div key={claim.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 16, borderLeft: '4px solid ' + (claim.status === 'Error' ? '#ef4444' : claim.status === 'Validated' ? '#3b82f6' : '#10b981') }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12 }}>{claim.claimNum}</span>
                    <StatusBadge s={claim.status} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{claim.patient} · {claim.mrn}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>Payer: <strong style={{ color: '#374151' }}>{claim.payer}</strong></span>
                    <span>CPT: {claim.cpts.map(c => <span key={c} style={{ background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: 4, fontWeight: 700, fontFamily: 'monospace', marginLeft: 3 }}>{c}</span>)}</span>
                    <span>ICD: {claim.icds.join(', ')}</span>
                    <span>DOS: <strong style={{ color: '#374151' }}>{claim.dos}</strong></span>
                    <span>Charge: <strong style={{ color: '#374151' }}>${claim.charge.toFixed(2)}</strong></span>
                  </div>
                  {claim.errors.length > 0 && (
                    <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 7, background: '#fef2f2', border: '1px solid #fca5a5' }}>
                      {claim.errors.map((e, i) => <div key={i} style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>⛔ {e}</div>)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => handleValidate(claim)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', fontWeight: 700, cursor: 'pointer' }}>🔍 Validate</button>
                  <button onClick={() => { setViewEdi({ claim, edi: buildEdi(claim, {}) }); }} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer' }}>👁 Preview EDI</button>
                  {(claim.status === 'Validated' || claim.status === 'Ready') && (
                    <button onClick={() => { setQueue(prev => prev.map(q => q.id === claim.id ? { ...q, status: 'Submitted' } : q)); showToast(claim.claimNum + ' submitted via EDI.'); }} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>📤 Submit</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 837 Builder */}
      {activeTab === 'builder' && (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>🔨 Build 837P Claim</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div><label className="form-label">Patient Name *</label><input className="form-input" value={form.patient} onChange={e => setForm(p => ({ ...p, patient: e.target.value }))} placeholder="First Last" /></div>
              <div><label className="form-label">Payer *</label>
                <select className="form-input" value={form.payer} onChange={e => setForm(p => ({ ...p, payer: e.target.value }))}>
                  {PAYERS.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div><label className="form-label">Member ID *</label><input className="form-input" value={form.memberid} onChange={e => setForm(p => ({ ...p, memberid: e.target.value }))} placeholder="e.g. BCB123456789" /></div>
              <div><label className="form-label">Date of Service</label><input type="date" className="form-input" value={form.dos} onChange={e => setForm(p => ({ ...p, dos: e.target.value }))} /></div>
              <div><label className="form-label">CPT Code(s)</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                  {form.cpts.map(c => (
                    <span key={c} style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 8px', borderRadius: 5, fontSize: 12, fontWeight: 700, cursor: 'pointer' }} onClick={() => setForm(p => ({ ...p, cpts: p.cpts.filter(x => x !== c) }))}>
                      {c} ×
                    </span>
                  ))}
                </div>
                <select className="form-input" onChange={e => { if (e.target.value && !form.cpts.includes(e.target.value)) setForm(p => ({ ...p, cpts: [...p.cpts, e.target.value] })); e.target.value = ''; }}>
                  <option value="">+ Add CPT...</option>
                  {Object.keys(CPT_FEE).map(c => <option key={c} value={c}>{c} — {CPT_DESC[c]}</option>)}
                </select>
              </div>
              <div><label className="form-label">ICD-10 Code(s)</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                  {form.icds.map(c => (
                    <span key={c} style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: 'pointer' }} onClick={() => setForm(p => ({ ...p, icds: p.icds.filter(x => x !== c) }))}>
                      {c.split(' ')[0]} ×
                    </span>
                  ))}
                </div>
                <select className="form-input" onChange={e => { if (e.target.value && !form.icds.includes(e.target.value)) setForm(p => ({ ...p, icds: [...p.icds, e.target.value] })); e.target.value = ''; }}>
                  <option value="">+ Add ICD-10...</option>
                  {ICD10.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="form-label">Place of Service</label>
                <select className="form-input" value={form.pos} onChange={e => setForm(p => ({ ...p, pos: e.target.value }))}>
                  {POS_CODES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="form-label">Rendering Provider / NPI</label>
                <input className="form-input" value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} placeholder="Name, Credentials" style={{ marginBottom: 6 }} />
                <input className="form-input" value={form.npi} onChange={e => setForm(p => ({ ...p, npi: e.target.value }))} placeholder="10-digit NPI" />
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Total Charge: ${form.cpts.reduce((s,c) => s + (CPT_FEE[c]||0), 0).toFixed(2)}</span>
                <button onClick={handleGenerate} className="btn btn-primary">Generate 837P →</button>
              </div>
            </div>
          </div>

          <div>
            {generatedEdi ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>📄 Generated 837P — Live Preview</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => navigator.clipboard?.writeText(generatedEdi).then(() => showToast('Copied!'))} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>📋 Copy</button>
                    <button onClick={() => showToast('Claim added to submission queue.')} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>📤 Submit</button>
                  </div>
                </div>
                <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 12, fontSize: 10.5, lineHeight: 1.8, overflowX: 'auto', overflowY: 'auto', maxHeight: 600, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {generatedEdi.split('\n').map((line, i) => {
                    const seg = line.split('*')[0].replace('~','');
                    const colors = { ISA: '#93c5fd', GS: '#86efac', ST: '#fde68a', NM1: '#f9a8d4', CLM: '#c4b5fd', SV1: '#6ee7b7', HI: '#fcd34d', DTP: '#a5f3fc', BHT: '#fda4af', HL: '#d9f99d', SBR: '#e9d5ff', REF: '#bfdbfe', SE: '#fde68a', GE: '#86efac', IEA: '#93c5fd' };
                    const col = colors[seg] || '#e2e8f0';
                    return <span key={i} style={{ color: col }}>{line}{'\n'}</span>;
                  })}
                </pre>
              </div>
            ) : (
              <div style={{ background: '#f8fafc', border: '2px dashed var(--border)', borderRadius: 12, padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>⚙️</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>837P EDI will appear here</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Fill in the form on the left and click Generate 837P</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation Rules */}
      {activeTab === 'rules' && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: 14 }}>837P Validation Rule Set — ANSI X12 005010X222A1</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                {['Rule', 'Field', 'EDI Segment', 'Required', 'Conditional', 'Status'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VALIDATION_RULES.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 11, color: '#7c3aed' }}>{r.id}</td>
                  <td style={{ padding: '9px 14px', fontWeight: 600 }}>{r.field}</td>
                  <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 11, background: '#f1f5f9', color: '#1d4ed8', fontWeight: 700 }}>{r.segment}</td>
                  <td style={{ padding: '9px 14px' }}>{r.required ? <span style={{ color: '#dc2626', fontWeight: 700 }}>Required</span> : <span style={{ color: '#6b7280' }}>Optional</span>}</td>
                  <td style={{ padding: '9px 14px' }}>{r.conditional ? <span style={{ color: '#d97706', fontWeight: 700 }}>Conditional</span> : '—'}</td>
                  <td style={{ padding: '9px 14px' }}><span style={{ color: '#059669', fontWeight: 700 }}>✓ Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* EDI Preview Modal */}
      {viewEdi && (
        <div className="modal-backdrop" onClick={() => setViewEdi(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 780, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ background: '#0f172a', color: '#fff', margin: -20, padding: '16px 20px', marginBottom: 0, borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800 }}>837P — {viewEdi.claim.claimNum}</div>
              <button onClick={() => setViewEdi(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div className="modal-body">
              <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 8, fontSize: 11, lineHeight: 1.8, overflowX: 'auto', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 480, overflowY: 'auto', margin: 0 }}>
                {viewEdi.edi}
              </pre>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewEdi(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { showToast(viewEdi.claim.claimNum + ' submitted.'); setViewEdi(null); }}>📤 Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
