import React, { useState, useMemo, useEffect, useRef } from 'react';

// ─── AS2 Partner Configurations ──────────────────────────────────────────────
const AS2_PARTNERS = [
  {
    id: 'as2-001', name: 'Availity', as2From: 'CLARITYEHR_001', as2To: 'AVAILITY_EDI',
    url: 'https://edi.availity.com/as2/receive', algorithm: 'SHA-256', encryption: 'AES-256-CBC',
    signing: 'RSA-SHA256', mdnMode: 'Synchronous', mdnDeliveryUrl: '',
    certSubject: 'CN=Clarity EHR, O=Clarity Health, C=US', certExpiry: '2027-03-15',
    certThumbprint: 'A1:B2:C3:D4:E5:F6:78:90:AB:CD:EF:12:34:56:78:90',
    partnerCertExpiry: '2027-06-01', partnerThumbprint: 'F1:E2:D3:C4:B5:A6:97:88:79:6A',
    msgCount: 142, lastMdnAt: '2026-05-23T09:12:45', mdnStatus: 'Received', active: true,
  },
  {
    id: 'as2-002', name: 'Change Healthcare', as2From: 'CLARITYEHR_001', as2To: 'CHANGEHC_AS2',
    url: 'https://as2.changehealthcare.com/receive', algorithm: 'SHA-256', encryption: 'AES-128-CBC',
    signing: 'RSA-SHA256', mdnMode: 'Asynchronous', mdnDeliveryUrl: 'https://clarity-ehr.com/as2/mdn',
    certSubject: 'CN=Clarity EHR, O=Clarity Health, C=US', certExpiry: '2027-03-15',
    certThumbprint: 'A1:B2:C3:D4:E5:F6:78:90:AB:CD:EF:12:34:56:78:90',
    partnerCertExpiry: '2026-11-30', partnerThumbprint: '22:33:44:55:66:77:88:99',
    msgCount: 88, lastMdnAt: '2026-05-23T08:20:05', mdnStatus: 'Received', active: true,
  },
  {
    id: 'as2-003', name: 'Optum / UHC Direct', as2From: 'CLARITYEHR_001', as2To: 'OPTUM_AS2_001',
    url: 'https://edi.optum.com/as2', algorithm: 'SHA-256', encryption: 'AES-256-CBC',
    signing: 'RSA-SHA512', mdnMode: 'Synchronous', mdnDeliveryUrl: '',
    certSubject: 'CN=Clarity EHR, O=Clarity Health, C=US', certExpiry: '2027-03-15',
    certThumbprint: 'A1:B2:C3:D4:E5:F6:78:90:AB:CD:EF:12:34:56:78:90',
    partnerCertExpiry: '2027-09-14', partnerThumbprint: '99:88:77:66:55:44:33:22',
    msgCount: 56, lastMdnAt: '2026-05-23T07:50:10', mdnStatus: 'Received', active: true,
  },
];

// MDN log per AS2 partner
const AS2_MDN_LOG = [
  { id: 'mdn-001', as2From: 'AVAILITY_EDI', msgId: '<CLARITYEHR.20260523.091234@as2>', file: 'CLM_20260523_001.edi', status: 'processed', micAlg: 'sha256', mic: 'abc123def456==', receivedAt: '2026-05-23T09:12:45', disposition: 'automatic-action/MDN-sent-automatically; processed' },
  { id: 'mdn-002', as2From: 'CHANGEHC_AS2', msgId: '<CLARITYEHR.20260523.082002@as2>', file: 'CLM_20260523_002.edi', status: 'failed', micAlg: 'sha256', mic: null, receivedAt: '2026-05-23T08:20:05', disposition: 'automatic-action/MDN-sent-automatically; processed/Error' },
  { id: 'mdn-003', as2From: 'AVAILITY_EDI', msgId: '<CLARITYEHR.20260523.084501@as2>', file: 'ELIG_20260523_001.edi', status: 'processed', micAlg: 'sha256', mic: 'xyz789uvw012==', receivedAt: '2026-05-23T08:45:09', disposition: 'automatic-action/MDN-sent-automatically; processed' },
  { id: 'mdn-004', as2From: 'OPTUM_AS2_001', msgId: '<CLARITYEHR.20260523.075001@as2>', file: 'ELIG_20260523_001.edi', status: 'processed', micAlg: 'sha256', mic: 'qrs456tuv789==', receivedAt: '2026-05-23T07:50:10', disposition: 'automatic-action/MDN-sent-automatically; processed' },
];

// ─── Connection Test Modal ────────────────────────────────────────────────────
function ConnectionTestModal({ partner, onClose }) {
  const STEPS = [
    { key: 'tcp',    label: 'TCP Connect',         detail: `Connecting to ${partner.host}:${partner.port}…` },
    { key: 'tls',    label: 'TLS Handshake',        detail: 'Negotiating TLS 1.3, verifying server certificate…' },
    { key: 'auth',   label: 'Authenticate',         detail: `Authenticating via ${partner.protocol}…` },
    { key: 'ping',   label: 'Send Test Envelope',   detail: 'Transmitting 0-byte ping payload with ISA header…' },
    { key: 'ack',    label: 'Receive Acknowledgment', detail: `Waiting for ${partner.protocol === 'SFTP' ? 'SFTP ACK' : '999 / MDN response'}…` },
  ];
  const [step, setStep] = useState(-1);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef();

  useEffect(() => {
    const advance = (i) => {
      if (i >= STEPS.length) { setDone(true); return; }
      setStep(i);
      timerRef.current = setTimeout(() => advance(i + 1), 700 + Math.random() * 500);
    };
    timerRef.current = setTimeout(() => advance(0), 300);
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 500 }}>
        <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a8a)', color: '#fff', margin: -20, padding: '16px 20px', marginBottom: 0, borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>📡 Connection Test — {partner.name}</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{partner.host}:{partner.port} · {partner.protocol}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gap: 10 }}>
            {STEPS.map((s, i) => {
              const isActive = step === i && !done;
              const isPassed = done ? true : step > i;
              const isPending = step < i;
              return (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 9, background: isPassed ? '#f0fdf4' : isActive ? '#eff6ff' : '#f8fafc', border: `1px solid ${isPassed ? '#86efac' : isActive ? '#93c5fd' : '#e5e7eb'}`, transition: 'all 0.3s' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: isPassed ? '#10b981' : isActive ? '#3b82f6' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, transition: 'all 0.3s' }}>
                    {isPassed ? '✓' : isActive ? '⟳' : '○'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: isPassed ? '#166534' : isActive ? '#1d4ed8' : '#9ca3af' }}>{s.label}</div>
                    {(isPassed || isActive) && <div style={{ fontSize: 11, color: isPassed ? '#22c55e' : '#60a5fa', marginTop: 1 }}>{isPassed ? (i === STEPS.length - 1 ? `✅ Acknowledged in ${(0.1 + Math.random() * 0.2).toFixed(2)}s` : '✅ OK') : s.detail}</div>}
                  </div>
                  {isActive && <div style={{ marginLeft: 'auto', width: 16, height: 16, borderRadius: '50%', border: '2px solid #93c5fd', borderTopColor: '#1d4ed8', animation: 'spin 0.8s linear infinite' }} />}
                </div>
              );
            })}
          </div>
          {done && (
            <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: '#f0fdf4', border: '2px solid #86efac', textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>✅</div>
              <div style={{ fontWeight: 800, color: '#166534', fontSize: 14 }}>All tests passed — {partner.name} is healthy</div>
              <div style={{ fontSize: 11, color: '#4ade80', marginTop: 4 }}>Uptime: {partner.uptime}% · Last connected: {new Date(partner.lastConnected).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Trading Partners ─────────────────────────────────────────────────────────
const TRADING_PARTNERS = [
  {
    host: 'sftp.availity.com', port: 22, protocol: 'SFTP', testMode: false,
    supportedTx: ['837P', '837I', '270', '271', '276', '277', '835', '999'],
    lastConnected: '2026-05-23T09:14:00', uptime: 99.8,
  },
  {
    id: 'tp-002', name: 'Change Healthcare', type: 'Clearinghouse', isaId: '01 CHANGEHC', status: 'Active',
    host: 'api.changehealthcare.com', port: 443, protocol: 'HTTPS/API', testMode: false,
    supportedTx: ['837P', '270', '271', '835', '999', '277CA'],
    lastConnected: '2026-05-23T08:55:00', uptime: 99.5,
  },
  {
    id: 'tp-003', name: 'Waystar', type: 'Clearinghouse', isaId: '01 WAYSTAR', status: 'Active',
    host: 'edi.waystar.com', port: 22, protocol: 'SFTP', testMode: false,
    supportedTx: ['837P', '835', '276', '277', '999'],
    lastConnected: '2026-05-23T07:30:00', uptime: 98.9,
  },
  {
    id: 'tp-004', name: 'Optum / UHC Direct', type: 'Payer Direct', isaId: '01 OPTUM', status: 'Active',
    host: 'edi.optum.com', port: 443, protocol: 'HTTPS/API', testMode: false,
    supportedTx: ['837P', '270', '271', '835'],
    lastConnected: '2026-05-23T06:00:00', uptime: 97.2,
  },
  {
    id: 'tp-005', name: 'Availity TEST', type: 'Clearinghouse', isaId: '01 AVAILTEST', status: 'Test',
    host: 'sftp-test.availity.com', port: 22, protocol: 'SFTP', testMode: true,
    supportedTx: ['837P', '270', '271', '835', '999'],
    lastConnected: '2026-05-22T15:00:00', uptime: 95.0,
  },
];

// ─── Transmission Log ─────────────────────────────────────────────────────────
const SEED_TRANSMISSIONS = [
  {
    id: 'tx-001', timestamp: '2026-05-23T09:12:34', direction: 'Outbound', txType: '837P',
    partner: 'Availity', fileName: 'CLM_20260523_001.edi', fileSize: '24.3 KB',
    recordCount: 8, status: 'Accepted', ackStatus: '999 Accepted', isaControlNum: '000000101',
    gsControlNum: '0001', stControlNum: '0001', duration: 1.2, payer: 'Blue Cross Blue Shield',
    errors: [],
  },
  {
    id: 'tx-002', timestamp: '2026-05-23T09:10:11', direction: 'Inbound', txType: '835',
    partner: 'Availity', fileName: 'ERA_BCBS_20260523.edi', fileSize: '18.7 KB',
    recordCount: 3, status: 'Posted', ackStatus: 'Auto-Posted', isaControlNum: '000000099',
    gsControlNum: '0099', stControlNum: '0099', duration: 0.8, payer: 'Blue Cross Blue Shield',
    errors: [],
  },
  {
    id: 'tx-003', timestamp: '2026-05-23T08:45:00', direction: 'Outbound', txType: '270',
    partner: 'Availity', fileName: 'ELIG_20260523_001.edi', fileSize: '3.1 KB',
    recordCount: 5, status: 'Accepted', ackStatus: '271 Received', isaControlNum: '000000100',
    gsControlNum: '0100', stControlNum: '0100', duration: 0.4, payer: 'Multiple',
    errors: [],
  },
  {
    id: 'tx-004', timestamp: '2026-05-23T08:20:00', direction: 'Outbound', txType: '837P',
    partner: 'Change Healthcare', fileName: 'CLM_20260523_002.edi', fileSize: '9.5 KB',
    recordCount: 2, status: 'Rejected', ackStatus: '999 Rejected', isaControlNum: '000000102',
    gsControlNum: '0002', stControlNum: '0002', duration: 1.8, payer: 'Aetna',
    errors: [
      { code: 'AK304', segment: 'NM1*85', message: 'Required element missing: Billing Provider NPI' },
      { code: 'AK304', segment: 'CLM*05', message: 'Invalid facility type code' },
    ],
  },
  {
    id: 'tx-005', timestamp: '2026-05-23T07:30:00', direction: 'Inbound', txType: '277CA',
    partner: 'Waystar', fileName: 'ACK_20260523_001.edi', fileSize: '5.2 KB',
    recordCount: 6, status: 'Processed', ackStatus: 'Applied', isaControlNum: '000000098',
    gsControlNum: '0098', stControlNum: '0098', duration: 0.6, payer: 'Cigna',
    errors: [],
  },
  {
    id: 'tx-006', timestamp: '2026-05-22T16:45:00', direction: 'Outbound', txType: '837P',
    partner: 'Availity', fileName: 'CLM_20260522_003.edi', fileSize: '31.0 KB',
    recordCount: 12, status: 'Accepted', ackStatus: '999 Accepted', isaControlNum: '000000097',
    gsControlNum: '0097', stControlNum: '0097', duration: 2.1, payer: 'Multiple',
    errors: [],
  },
  {
    id: 'tx-007', timestamp: '2026-05-22T14:00:00', direction: 'Outbound', txType: '276',
    partner: 'Availity', fileName: 'STAT_20260522_001.edi', fileSize: '2.0 KB',
    recordCount: 3, status: 'Accepted', ackStatus: '277 Received', isaControlNum: '000000096',
    gsControlNum: '0096', stControlNum: '0096', duration: 0.3, payer: 'UnitedHealthcare',
    errors: [],
  },
  {
    id: 'tx-008', timestamp: '2026-05-23T09:05:00', direction: 'Outbound', txType: '837P',
    partner: 'Availity TEST', fileName: 'TEST_CLM_20260523.edi', fileSize: '6.2 KB',
    recordCount: 2, status: 'Accepted', ackStatus: '999 Accepted (Test)', isaControlNum: '000000103',
    gsControlNum: '0003', stControlNum: '0003', duration: 0.9, payer: 'TEST',
    errors: [],
  },
];

// ─── ISA Envelope Preview ─────────────────────────────────────────────────────
const ISA_CONFIG = {
  isaAuthInfoQual: '00', isaAuthInfo: '          ',
  isaSecInfoQual: '00', isaSecInfo: '          ',
  isaInterchangeSenderIdQual: 'ZZ', isaInterchangeSenderId: 'CLARITYEHR     ',
  isaInterchangeReceiverIdQual: '01', isaInterchangeReceiverId: 'AVAILITY       ',
  isaInterchangeDate: '260523', isaInterchangeTime: '0912',
  isaRepetitionSeparator: '^', isaInterchangeVersionNum: '00501',
  isaInterchangeControlNum: '000000104', isaAcknowledgmentRequested: '1',
  isaUsageIndicator: 'P',
};

// ─── TX Type Colors ───────────────────────────────────────────────────────────
const TX_COLORS = {
  '837P': { bg: '#dbeafe', color: '#1d4ed8' },
  '837I': { bg: '#ede9fe', color: '#6d28d9' },
  '835':  { bg: '#d1fae5', color: '#065f46' },
  '270':  { bg: '#fef3c7', color: '#92400e' },
  '271':  { bg: '#fef3c7', color: '#78350f' },
  '276':  { bg: '#fce7f3', color: '#9d174d' },
  '277':  { bg: '#fce7f3', color: '#831843' },
  '277CA':{ bg: '#fee2e2', color: '#991b1b' },
  '999':  { bg: '#f3f4f6', color: '#374151' },
};

const STATUS_COLORS = {
  Accepted:  { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  Posted:    { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  Processed: { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
  Rejected:  { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  Pending:   { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  Test:      { bg: '#f3e8ff', color: '#6d28d9', border: '#c4b5fd' },
};

const TX_DESCRIPTIONS = {
  '837P': 'Professional Claim', '837I': 'Institutional Claim',
  '835': 'Electronic Remittance Advice', '270': 'Eligibility Inquiry',
  '271': 'Eligibility Response', '276': 'Claim Status Request',
  '277': 'Claim Status Response', '277CA': 'Claim Acknowledgment',
  '999': 'Implementation Acknowledgment',
};

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
    dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

function TxBadge({ type }) {
  const c = TX_COLORS[type] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{ background: c.bg, color: c.color, padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 800, fontFamily: 'monospace' }}>{type}</span>
  );
}

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.Pending;
  return (
    <span style={{ background: c.bg, color: c.color, border: '1px solid ' + c.border, padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{status}</span>
  );
}

// ─── Transmission Detail Modal ────────────────────────────────────────────────
function TxDetailModal({ tx, onClose }) {
  const [tab, setTab] = useState('details');
  if (!tx) return null;

  const sampleEdi = tx.txType === '837P'
    ? `ISA*00*          *00*          *ZZ*CLARITYEHR     *01*AVAILITY       *260523*0912*^*00501*000000101*1*P*:~
GS*HC*CLARITYEHR*AVAILITY*20260523*0912*1*X*005010X222A1~
ST*837*0001*005010X222A1~
BPR*22*185.00*C*ACH*CTX*01*123456789*DA*123456789*1234567890~
NM1*41*2*CLARITY BEHAVIORAL HEALTH*****46*1234567890~
PER*IC*BILLING DEPT*TE*5551234567~
NM1*40*2*BLUE CROSS BLUE SHIELD*****46*00510~
HL*1**20*1~
NM1*85*2*CLARITY BEHAVIORAL HEALTH*****XX*1234567890~
N3*123 MAIN ST~
N4*ANYTOWN*CA*90210~
REF*EI*123456789~
HL*2*1*22*0~
SBR*P*18*BCB123456789**CH****MC~
NM1*IL*1*ANDERSON*JAMES****MI*BCB123456789~
N3*456 OAK AVE~
N4*CITYNAME*CA*90211~
DMG*D8*19800115*M~
NM1*PR*2*BLUE CROSS BLUE SHIELD*****PI*00510~
CLM*CLM-2026-001*185***11:B:1*Y*A*Y*I~
DTP*472*D8*20260312~
REF*D9*CLM-2026-001~
HI*ABK:F33.1~
NM1*82*1*MARTINEZ*ELENA****XX*9876543210~
SV1*HC:99214*185*UN*1***1~
DTP*472*D8*20260312~
SE*25*0001~
GE*1*1~
IEA*1*000000101~`
    : tx.txType === '835'
    ? `ISA*00*          *00*          *01*AVAILITY       *ZZ*CLARITYEHR     *260523*0910*^*00501*000000099*1*P*:~
GS*HP*AVAILITY*CLARITYEHR*20260523*0910*99*X*005010X221A1~
ST*835*0099~
BPR*I*170.00*C*ACH*CCP*01*123456789*DA*987654321*20260523~
TRN*1*BCB-ERA-20260523*1234567890~
DTM*405*20260523~
N1*PR*BLUE CROSS BLUE SHIELD~
N1*PE*CLARITY BEHAVIORAL HEALTH*XX*1234567890~
LX*1~
CLP*CLM-2026-001*1*185.00*148.00*0*MC~
CAS*CO*45*37.00~
NM1*QC*1*ANDERSON*JAMES~
NM1*74*1*ANDERSON*JAMES~
DTM*232*20260312~
DTM*233*20260328~
SVC*HC:99214*185.00*148.00~
DTM*472*20260312~
CAS*CO*45*37.00~
SE*17*0099~
GE*1*99~
IEA*1*000000099~`
    : `ISA*00*          *00*          *ZZ*CLARITYEHR     *01*AVAILITY       *260523*0845*^*00501*000000100*1*P*:~
GS*HS*CLARITYEHR*AVAILITY*20260523*0845*100*X*005010X279A1~
ST*270*0100~
BHT*0022*13*ELIG20260523*20260523*0845~
HL*1**20*1~
NM1*PR*2*CLARITY BEHAVIORAL HEALTH*****XX*1234567890~
HL*2*1*21*1~
NM1*1P*1*MARTINEZ*ELENA****XX*9876543210~
HL*3*2*22*0~
TRN*1*REF-0001*9876543210~
NM1*IL*1*ANDERSON*JAMES****MI*BCB123456789~
DMG*D8*19800115*M~
EQ*30~
SE*12*0100~
GE*1*100~
IEA*1*000000100~`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 780, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', margin: -20, padding: 20, marginBottom: 0, borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <TxBadge type={tx.txType} />
              <span style={{ fontWeight: 800, fontSize: 15 }}>{tx.fileName}</span>
              <span style={{ fontSize: 11, opacity: 0.7, background: tx.direction === 'Outbound' ? '#1d4ed8' : '#059669', padding: '2px 8px', borderRadius: 12 }}>{tx.direction}</span>
            </div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>{tx.partner} · {fmtDate(tx.timestamp)} · ISA {tx.isaControlNum}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 6, width: 28, height: 28, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {[['details','📋 Details'], ['edi','🗂 EDI Envelope'], ['errors','⚠️ Errors (' + tx.errors.length + ')']].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '10px 6px', border: 'none', background: tab === t ? '#eff6ff' : 'transparent', color: tab === t ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: tab === t ? 700 : 500, fontSize: 12, cursor: 'pointer', borderBottom: '2px solid ' + (tab === t ? 'var(--primary)' : 'transparent') }}>
              {l}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {tab === 'details' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                {[
                  ['Transaction Type', tx.txType + ' — ' + (TX_DESCRIPTIONS[tx.txType] || '')],
                  ['Direction', tx.direction],
                  ['Trading Partner', tx.partner],
                  ['Payer', tx.payer],
                  ['File Name', tx.fileName],
                  ['File Size', tx.fileSize],
                  ['Record Count', tx.recordCount + ' transactions'],
                  ['Duration', tx.duration + 's'],
                  ['ISA Control #', tx.isaControlNum],
                  ['GS Control #', tx.gsControlNum],
                  ['ST Control #', tx.stControlNum],
                  ['Acknowledgment', tx.ackStatus],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: '#f8fafc', borderRadius: 7, padding: '10px 12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', wordBreak: 'break-all' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, padding: '12px 14px', borderRadius: 8, background: tx.status === 'Rejected' ? '#fef2f2' : '#f0fdf4', border: '1px solid ' + (tx.status === 'Rejected' ? '#fca5a5' : '#bbf7d0') }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: tx.status === 'Rejected' ? '#dc2626' : '#166534', textTransform: 'uppercase', marginBottom: 4 }}>Transmission Status</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: tx.status === 'Rejected' ? '#dc2626' : '#059669' }}>{tx.status}</div>
                </div>
                <div style={{ flex: 1, padding: '12px 14px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', marginBottom: 4 }}>999 Ack Status</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8' }}>{tx.ackStatus}</div>
                </div>
              </div>
            </div>
          )}

          {tab === 'edi' && (
            <div>
              <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                Raw EDI envelope for <strong>{tx.fileName}</strong> — {TX_DESCRIPTIONS[tx.txType]}
              </div>
              <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 10, fontSize: 11, lineHeight: 1.6, overflowX: 'auto', fontFamily: '"Courier New", monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 420, overflowY: 'auto' }}>
                {sampleEdi}
              </pre>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>📋 Copy EDI</button>
                <button style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>⬇️ Download .edi</button>
              </div>
            </div>
          )}

          {tab === 'errors' && (
            <div>
              {tx.errors.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
                  <div style={{ fontWeight: 700, color: '#166534' }}>No errors — transmission accepted cleanly</div>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: 10, padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5' }}>
                    <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>⛔ {tx.errors.length} Error(s) Found</div>
                    <div style={{ fontSize: 12, color: '#7f1d1d' }}>This transmission was rejected by the clearinghouse. Correct the errors below and retransmit.</div>
                  </div>
                  {tx.errors.map((e, i) => (
                    <div key={i} style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid #fca5a5', marginBottom: 8, background: '#fff' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, padding: '2px 7px', borderRadius: 4, background: '#fee2e2', color: '#dc2626' }}>{e.code}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 12, color: '#374151', marginBottom: 2 }}>Segment: <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 3 }}>{e.segment}</code></div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{e.message}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button style={{ marginTop: 4, padding: '8px 16px', borderRadius: 8, background: '#1d4ed8', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>🔄 Retransmit (Fixed)</button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {tx.direction === 'Outbound' && tx.status !== 'Rejected' && (
            <button className="btn btn-secondary" style={{ fontSize: 12 }}>🔄 Retransmit</button>
          )}
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── New Transmission Modal ───────────────────────────────────────────────────
function NewTxModal({ onClose, onSend }) {
  const [form, setForm] = useState({ txType: '837P', partner: 'Availity', mode: 'Production' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 500 }}>
        <div className="modal-header"><h3>📤 New Transmission</h3><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body" style={{ display: 'grid', gap: 14 }}>
          <div>
            <label className="form-label">Transaction Set *</label>
            <select value={form.txType} onChange={e => set('txType', e.target.value)} className="form-input">
              {['837P', '837I', '270', '276'].map(t => <option key={t} value={t}>{t} — {TX_DESCRIPTIONS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Trading Partner *</label>
            <select value={form.partner} onChange={e => set('partner', e.target.value)} className="form-input">
              {TRADING_PARTNERS.map(tp => <option key={tp.id} value={tp.name}>{tp.name} ({tp.protocol})</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Mode</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Production', 'Test'].map(m => (
                <button key={m} onClick={() => set('mode', m)}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: '2px solid ' + (form.mode === m ? (m === 'Production' ? '#1d4ed8' : '#d97706') : '#e5e7eb'), background: form.mode === m ? (m === 'Production' ? '#eff6ff' : '#fef3c7') : '#fff', color: form.mode === m ? (m === 'Production' ? '#1d4ed8' : '#92400e') : '#6b7280', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  {m === 'Production' ? '🟢' : '🧪'} {m}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#f8fafc', border: '1px solid var(--border)', fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: '#374151' }}>ISA Envelope Preview</div>
            <pre style={{ margin: 0, fontSize: 10, color: '#64748b', fontFamily: 'monospace', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {`ISA*00*          *00*          *ZZ*CLARITYEHR     *01*${(TRADING_PARTNERS.find(t => t.name === form.partner)?.isaId?.split(' ')[1] || 'PARTNER').padEnd(15)}*260523*0912*^*00501*000000104*1*${form.mode === 'Production' ? 'P' : 'T'}*:~`}
            </pre>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onSend(form); onClose(); }}>📤 Transmit Now</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EDITransportLayer() {
  const [transmissions, setTransmissions] = useState(SEED_TRANSMISSIONS);
  const [viewTx, setViewTx] = useState(null);
  const [showNewTx, setShowNewTx] = useState(false);
  const [activeTab, setActiveTab] = useState('log');
  const [filters, setFilters] = useState({ direction: '', txType: '', partner: '', status: '' });
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [connTestPartner, setConnTestPartner] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const stats = useMemo(() => ({
    total: transmissions.length,
    outbound: transmissions.filter(t => t.direction === 'Outbound').length,
    inbound: transmissions.filter(t => t.direction === 'Inbound').length,
    accepted: transmissions.filter(t => t.status === 'Accepted' || t.status === 'Posted' || t.status === 'Processed').length,
    rejected: transmissions.filter(t => t.status === 'Rejected').length,
    errors: transmissions.reduce((s, t) => s + t.errors.length, 0),
    acceptRate: transmissions.length ? Math.round((transmissions.filter(t => t.status !== 'Rejected').length / transmissions.length) * 100) : 0,
  }), [transmissions]);

  const filtered = useMemo(() => transmissions.filter(t => {
    if (filters.direction && t.direction !== filters.direction) return false;
    if (filters.txType && t.txType !== filters.txType) return false;
    if (filters.partner && t.partner !== filters.partner) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.fileName.toLowerCase().includes(q) && !t.partner.toLowerCase().includes(q) && !t.txType.toLowerCase().includes(q) && !t.isaControlNum.includes(q) && !t.payer.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [transmissions, filters, search]);

  const handleSend = (form) => {
    const now = new Date().toISOString();
    const newTx = {
      id: 'tx-' + Date.now(), timestamp: now, direction: 'Outbound', txType: form.txType,
      partner: form.partner, fileName: form.txType + '_' + now.slice(0, 10).replace(/-/g, '') + '_SIM.edi',
      fileSize: '4.2 KB', recordCount: 1, status: form.mode === 'Test' ? 'Accepted' : 'Pending',
      ackStatus: form.mode === 'Test' ? '999 Accepted (Test)' : 'Awaiting 999',
      isaControlNum: String(Date.now()).slice(-9), gsControlNum: '0104', stControlNum: '0104',
      duration: 1.1, payer: form.mode === 'Test' ? 'TEST' : 'Multiple', errors: [],
    };
    setTransmissions(prev => [newTx, ...prev]);
    showToast(form.txType + ' transmitted via ' + form.partner + (form.mode === 'Test' ? ' [TEST MODE]' : '') + '.');
  };

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'error' ? '#dc2626' : '#059669', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', maxWidth: 420 }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🔌 EDI Transport Layer</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Manage clearinghouse connections, transmit 837/270/276 files, and monitor acknowledgments</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setConnTestPartner(TRADING_PARTNERS[0])} style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            📡 Test Connections
          </button>
          <button onClick={() => setShowNewTx(true)} className="btn btn-primary" style={{ fontSize: 13, fontWeight: 700 }}>
            📤 New Transmission
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total TX', value: stats.total, accent: '#6366f1' },
          { label: 'Outbound', value: stats.outbound, accent: '#3b82f6' },
          { label: 'Inbound', value: stats.inbound, accent: '#0ea5e9' },
          { label: 'Accepted', value: stats.accepted, accent: '#10b981' },
          { label: 'Rejected', value: stats.rejected, accent: '#ef4444' },
          { label: 'EDI Errors', value: stats.errors, accent: '#f59e0b' },
          { label: 'Accept Rate', value: stats.acceptRate + '%', accent: stats.acceptRate >= 95 ? '#10b981' : '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', borderLeft: '4px solid ' + s.accent }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 16 }}>
        {[['log', '📋 Transmission Log'], ['partners', '🤝 Trading Partners'], ['as2', '🔐 AS2 / Security'], ['envelope', '📦 ISA Configuration'], ['matrix', '📊 TX Type Matrix']].map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ padding: '10px 18px', border: 'none', background: 'transparent', color: activeTab === t ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: activeTab === t ? 700 : 500, fontSize: 13, cursor: 'pointer', borderBottom: '3px solid ' + (activeTab === t ? 'var(--primary)' : 'transparent'), marginBottom: -2 }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Transmission Log ── */}
      {activeTab === 'log' && (
        <div>
          {/* Rejection alert */}
          {stats.rejected > 0 && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fca5a5', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 18 }}>⛔</span>
              <div>
                <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 13 }}>{stats.rejected} Rejected Transmission(s)</div>
                <div style={{ fontSize: 12, color: '#7f1d1d' }}>Review errors and retransmit corrected files.</div>
              </div>
              <button onClick={() => setFilters(p => ({ ...p, status: 'Rejected' }))} style={{ marginLeft: 'auto', fontSize: 11, padding: '4px 12px', borderRadius: 6, background: '#dc2626', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>View Rejections</button>
            </div>
          )}

          {/* Filters */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border)', padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(4, auto) auto', gap: 10, alignItems: 'end' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>🔍 Search</div>
                <input className="form-input" placeholder="File, ISA #, partner, payer…" value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: 13 }} />
              </div>
              {[
                ['direction', 'Direction', ['', 'Outbound', 'Inbound']],
                ['txType', 'TX Type', ['', '837P', '837I', '835', '270', '271', '276', '277', '277CA', '999']],
                ['partner', 'Partner', ['', ...TRADING_PARTNERS.map(t => t.name)]],
                ['status', 'Status', ['', 'Accepted', 'Posted', 'Processed', 'Rejected', 'Pending']],
              ].map(([key, label, opts]) => (
                <div key={key}>
                  <label className="form-label">{label}</label>
                  <select value={filters[key]} onChange={e => setFilters(p => ({ ...p, [key]: e.target.value }))} className="form-input" style={{ fontSize: 12 }}>
                    {opts.map(o => <option key={o} value={o}>{o || 'All'}</option>)}
                  </select>
                </div>
              ))}
              <button onClick={() => { setFilters({ direction: '', txType: '', partner: '', status: '' }); setSearch(''); }} className="btn btn-secondary" style={{ height: 38, fontSize: 12 }}>Clear</button>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>
              Transmissions ({filtered.length})
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                    {['Timestamp', 'Dir', 'TX Type', 'File', 'Partner', 'Payer', 'Records', 'Size', 'Duration', 'Status', '999 Ack', 'ISA #', 'Errors', ''].map(h => (
                      <th key={h} style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 700, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={14} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No transmissions found.</td></tr>
                  ) : filtered.map((tx, i) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)', background: tx.status === 'Rejected' ? '#fff7f7' : i % 2 === 1 ? '#fafafa' : '#fff', cursor: 'pointer' }} onClick={() => setViewTx(tx)}>
                      <td style={{ padding: '9px 10px', fontSize: 11, whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600 }}>{new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{fmtTime(tx.timestamp)}</div>
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: tx.direction === 'Outbound' ? '#dbeafe' : '#dcfce7', color: tx.direction === 'Outbound' ? '#1d4ed8' : '#166534' }}>
                          {tx.direction === 'Outbound' ? '↑ OUT' : '↓ IN'}
                        </span>
                      </td>
                      <td style={{ padding: '9px 10px' }}><TxBadge type={tx.txType} /></td>
                      <td style={{ padding: '9px 10px', fontFamily: 'monospace', fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.fileName}</td>
                      <td style={{ padding: '9px 10px', fontSize: 11, fontWeight: 600 }}>{tx.partner}</td>
                      <td style={{ padding: '9px 10px', fontSize: 11, color: 'var(--text-secondary)' }}>{tx.payer}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700 }}>{tx.recordCount}</td>
                      <td style={{ padding: '9px 10px', color: 'var(--text-muted)', fontSize: 11 }}>{tx.fileSize}</td>
                      <td style={{ padding: '9px 10px', color: 'var(--text-muted)', fontSize: 11 }}>{tx.duration}s</td>
                      <td style={{ padding: '9px 10px' }}><StatusBadge status={tx.status} /></td>
                      <td style={{ padding: '9px 10px', fontSize: 11, color: tx.ackStatus.includes('Rejected') ? '#dc2626' : '#059669', fontWeight: 600 }}>{tx.ackStatus}</td>
                      <td style={{ padding: '9px 10px', fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)' }}>{tx.isaControlNum}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        {tx.errors.length > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 10, background: '#fee2e2', color: '#dc2626' }}>{tx.errors.length}</span>
                        )}
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        <button onClick={e => { e.stopPropagation(); setViewTx(tx); }} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Trading Partners ── */}
      {activeTab === 'partners' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {TRADING_PARTNERS.map(tp => (
            <div key={tp.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 18, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{tp.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{tp.type} · {tp.protocol}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {tp.testMode && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>TEST</span>}
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: tp.status === 'Active' ? '#d1fae5' : '#fef3c7', color: tp.status === 'Active' ? '#065f46' : '#92400e', fontWeight: 700 }}>
                    {tp.status === 'Active' ? '● Active' : '○ Test'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[['Host', tp.host], ['Port', tp.port], ['ISA ID', tp.isaId], ['Last Connected', tp.lastConnected ? new Date(tp.lastConnected).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' today' : '—']].map(([k, v]) => (
                  <div key={k} style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', wordBreak: 'break-all' }}>{String(v)}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Supported Transactions</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {tp.supportedTx.map(t => <TxBadge key={t} type={t} />)}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Uptime: </span>
                  <span style={{ fontWeight: 700, color: tp.uptime >= 99 ? '#059669' : tp.uptime >= 97 ? '#d97706' : '#dc2626' }}>{tp.uptime}%</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setConnTestPartner(tp)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', fontWeight: 600, cursor: 'pointer' }}>📡 Ping</button>
                  <button style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>⚙️ Config</button>
                </div>
              </div>

              {/* Uptime bar */}
              <div style={{ marginTop: 10, height: 4, borderRadius: 4, background: '#e5e7eb', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: tp.uptime + '%', background: tp.uptime >= 99 ? '#10b981' : tp.uptime >= 97 ? '#f59e0b' : '#ef4444', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── AS2 / Security ── */}
      {activeTab === 'as2' && (
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Certificate status */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🏅 AS2 Certificate Status</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Our certificate (CN=Clarity EHR) · Expires 2027-03-15</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Partner', 'AS2 From ID', 'AS2 To ID', 'Our Cert Expiry', 'Partner Cert Expiry', 'Thumbprint (SHA-1)', 'MDN Mode', 'Status'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AS2_PARTNERS.map((p, i) => {
                  const partnerDays = Math.floor((new Date(p.partnerCertExpiry) - new Date()) / 86400000);
                  const certColor = partnerDays < 30 ? '#dc2626' : partnerDays < 90 ? '#d97706' : '#059669';
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 700, fontSize: 13 }}>{p.name}</td>
                      <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 11, color: '#7c3aed' }}>{p.as2From}</td>
                      <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 11, color: '#1d4ed8' }}>{p.as2To}</td>
                      <td style={{ padding: '9px 12px', fontSize: 11, color: '#059669', fontWeight: 600 }}>{p.certExpiry}</td>
                      <td style={{ padding: '9px 12px', fontSize: 11, color: certColor, fontWeight: 700 }}>{p.partnerCertExpiry} <span style={{ fontSize: 10 }}>({partnerDays}d)</span></td>
                      <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 10, color: '#6b7280', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.partnerThumbprint}</td>
                      <td style={{ padding: '9px 12px', fontSize: 11 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 8, background: p.mdnMode === 'Synchronous' ? '#eff6ff' : '#fef3c7', color: p.mdnMode === 'Synchronous' ? '#1d4ed8' : '#d97706', fontWeight: 700, fontSize: 10 }}>{p.mdnMode}</span>
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 8, background: '#d1fae5', color: '#065f46', fontWeight: 700, fontSize: 10 }}>Active</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* AS2 per-partner config */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>⚙️ AS2 Encryption &amp; Signing Algorithms</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, padding: 16 }}>
              {AS2_PARTNERS.map(p => (
                <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: '#f8fafc' }}>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>{p.name}</div>
                  {[
                    ['Endpoint URL', p.url],
                    ['Signing Algorithm', p.signing],
                    ['Encryption Algorithm', p.encryption],
                    ['MIC Algorithm', p.algorithm],
                    ['MDN Delivery', p.mdnMode === 'Asynchronous' ? p.mdnDeliveryUrl || 'Configured' : 'Inline (synchronous)'],
                    ['Messages Sent', p.msgCount.toString()],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #e5e7eb', fontSize: 11 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                      <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 10, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
                    </div>
                  ))}
                  <button onClick={() => setConnTestPartner(TRADING_PARTNERS.find(tp => tp.name === p.name) || TRADING_PARTNERS[0])} style={{ marginTop: 10, width: '100%', padding: '6px', borderRadius: 7, border: '1px solid #93c5fd', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                    📡 Test AS2 Connection
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* MDN Log */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>📨 MDN (Message Disposition Notification) Log</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Message ID', 'AS2 From', 'File', 'MIC Algorithm', 'MIC Value', 'Status', 'Disposition', 'Timestamp'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AS2_MDN_LOG.map((m, i) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border)', background: m.status === 'failed' ? '#fff7f7' : i % 2 === 1 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10, color: '#7c3aed', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.msgId}</td>
                    <td style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600 }}>{m.as2From}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{m.file}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{m.micAlg}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10, color: m.mic ? '#374151' : '#dc2626' }}>{m.mic || '(none — error)'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 8, background: m.status === 'processed' ? '#d1fae5' : '#fee2e2', color: m.status === 'processed' ? '#065f46' : '#991b1b', fontWeight: 700, fontSize: 10 }}>{m.status}</span>
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 10, color: 'var(--text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.disposition}</td>
                    <td style={{ padding: '8px 12px', fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(m.receivedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ISA Configuration ── */}
      {activeTab === 'envelope' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>📦 ISA Interchange Envelope</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                ['ISA01 – Auth Info Qualifier', ISA_CONFIG.isaAuthInfoQual],
                ['ISA02 – Authorization Info', ISA_CONFIG.isaAuthInfo],
                ['ISA03 – Security Info Qualifier', ISA_CONFIG.isaSecInfoQual],
                ['ISA05 – Sender ID Qualifier', ISA_CONFIG.isaInterchangeSenderIdQual],
                ['ISA06 – Interchange Sender ID', ISA_CONFIG.isaInterchangeSenderId],
                ['ISA07 – Receiver ID Qualifier', ISA_CONFIG.isaInterchangeReceiverIdQual],
                ['ISA08 – Interchange Receiver ID', ISA_CONFIG.isaInterchangeReceiverId],
                ['ISA11 – Repetition Separator', ISA_CONFIG.isaRepetitionSeparator],
                ['ISA12 – Interchange Version', ISA_CONFIG.isaInterchangeVersionNum],
                ['ISA14 – Ack Requested', ISA_CONFIG.isaAcknowledgmentRequested + ' (Yes)'],
                ['ISA15 – Usage Indicator', ISA_CONFIG.isaUsageIndicator + ' (Production)'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 7, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#1e293b' }}>{v.trim()}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ background: '#0f172a', borderRadius: 12, padding: 18, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>LIVE ISA SEGMENT PREVIEW</div>
              <pre style={{ margin: 0, color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {`ISA*${ISA_CONFIG.isaAuthInfoQual}*${ISA_CONFIG.isaAuthInfo}*${ISA_CONFIG.isaSecInfoQual}*${ISA_CONFIG.isaSecInfo}*${ISA_CONFIG.isaInterchangeSenderIdQual}*${ISA_CONFIG.isaInterchangeSenderId}*${ISA_CONFIG.isaInterchangeReceiverIdQual}*${ISA_CONFIG.isaInterchangeReceiverId}*${ISA_CONFIG.isaInterchangeDate}*${ISA_CONFIG.isaInterchangeTime}*${ISA_CONFIG.isaRepetitionSeparator}*${ISA_CONFIG.isaInterchangeVersionNum}*${ISA_CONFIG.isaInterchangeControlNum}*${ISA_CONFIG.isaAcknowledgmentRequested}*${ISA_CONFIG.isaUsageIndicator}*:~`}
              </pre>
            </div>

            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>🏷 GS Functional Group Header</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  ['GS01 – Functional ID', 'HC (Health Care Claim)'],
                  ['GS02 – Application Sender', 'CLARITYEHR'],
                  ['GS03 – Application Receiver', 'AVAILITY'],
                  ['GS07 – Responsible Agency', 'X (Accredited Standards Committee X12)'],
                  ['GS08 – Version / Release', '005010X222A1 (837P)'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 11, color: '#1e293b' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TX Type Matrix ── */}
      {activeTab === 'matrix' && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: 14 }}>
            Transaction Set Capability Matrix
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)' }}>Transaction Set</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)' }}>Description</th>
                  {TRADING_PARTNERS.map(tp => (
                    <th key={tp.id} style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', minWidth: 110 }}>{tp.name}</th>
                  ))}
                  <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)' }}>Volume (7d)</th>
                </tr>
              </thead>
              <tbody>
                {['837P', '837I', '835', '270', '271', '276', '277', '277CA', '999'].map((type, i) => {
                  const count = SEED_TRANSMISSIONS.filter(t => t.txType === type).length;
                  return (
                    <tr key={type} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '10px 14px' }}><TxBadge type={type} /></td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>{TX_DESCRIPTIONS[type]}</td>
                      {TRADING_PARTNERS.map(tp => (
                        <td key={tp.id} style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {tp.supportedTx.includes(type)
                            ? <span style={{ color: '#059669', fontSize: 16 }}>✓</span>
                            : <span style={{ color: '#d1d5db', fontSize: 16 }}>—</span>}
                        </td>
                      ))}
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: count > 0 ? '#1d4ed8' : 'var(--text-muted)' }}>{count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewTx && <TxDetailModal tx={viewTx} onClose={() => setViewTx(null)} />}
      {showNewTx && <NewTxModal onClose={() => setShowNewTx(false)} onSend={handleSend} />}
      {connTestPartner && <ConnectionTestModal partner={connTestPartner} onClose={() => setConnTestPartner(null)} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
