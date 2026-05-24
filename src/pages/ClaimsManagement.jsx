import React, { useState, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';
import { encounters as mockEncounters, encounterHistory } from '../data/mockData';

// ─── CPT Fee Schedule ─────────────────────────────────────────────────────────
const CPT_FEE = {
  '99213': 120, '99214': 185, '99215': 250,
  '90792': 350, '96127': 30,
  '90837': 175, '90834': 140, '90832': 105, '90853': 120, '90833': 95,
  '99202': 110, '99203': 145, '99204': 185, '99205': 230,
};
const CPT_DESC = {
  '99213': 'Office/Outpatient Visit, Low Complexity',
  '99214': 'Office/Outpatient Visit, Moderate Complexity',
  '99215': 'Office/Outpatient Visit, High Complexity',
  '90792': 'Psychiatric Diagnostic Evaluation w/ Medical Services',
  '96127': 'Brief Emotional/Behavioral Assessment',
  '90837': 'Psychotherapy, 60 minutes',
  '90834': 'Psychotherapy, 45 minutes',
  '90832': 'Psychotherapy, 30 minutes',
  '90833': 'Psychotherapy Add-On, 30 minutes (Interactive Complexity)',
  '90853': 'Group Psychotherapy',
  '99202': 'Office/Outpatient New Patient, Straightforward',
  '99203': 'Office/Outpatient New Patient, Low Complexity',
  '99204': 'Office/Outpatient New Patient, Moderate Complexity',
  '99205': 'Office/Outpatient New Patient, High Complexity',
};

// ─── Payer Allowed Amounts ────────────────────────────────────────────────────
const PAYER_ALLOWED = {
  'Blue Cross Blue Shield': { '99213': 96, '99214': 148, '99215': 200, '90837': 140, '90792': 280, '90834': 112, '90832': 84, '96127': 24, '90833': 76 },
  'Aetna':                  { '99213': 102,'99214': 157, '99215': 212, '90837': 152, '90792': 295, '90834': 120, '90832': 89, '96127': 26, '90833': 80 },
  'UnitedHealthcare':       { '99213': 98, '99214': 152, '99215': 205, '90837': 144, '90792': 288, '90834': 116, '90832': 86, '96127': 25, '90833': 78 },
  'United Healthcare':      { '99213': 98, '99214': 152, '99215': 205, '90837': 144, '90792': 288, '90834': 116, '90832': 86, '96127': 25, '90833': 78 },
  'Cigna':                  { '99213': 100,'99214': 155, '99215': 208, '90837': 148, '90792': 292, '90834': 118, '90832': 88, '96127': 25, '90833': 79 },
  'Anthem':                 { '99213': 94, '99214': 145, '99215': 196, '90837': 138, '90792': 275, '90834': 110, '90832': 82, '96127': 23, '90833': 74 },
  'Medicare Part B':        { '99213': 88, '99214': 135, '99215': 185, '90837': 128, '90792': 255, '90834': 102, '90832': 76, '96127': 21, '90833': 68 },
};

// ─── Payer Rules Engine ───────────────────────────────────────────────────────
const PAYER_RULES = {
  'Anthem':           { authCodes: ['90791', '90792'], msg: 'Anthem requires prior authorization for psychiatric evaluations (90791, 90792).' },
  'Aetna':            { telehealthMsg: 'Aetna requires modifier 95 for telehealth. Verify POS code 02/10.' },
  'UnitedHealthcare': { docCodes: ['99215'], msg: 'UHC requires documented time for high-complexity E&M (99215).' },
  'United Healthcare':{ docCodes: ['99215'], msg: 'UHC requires documented time for high-complexity E&M (99215).' },
  'Medicare Part B':  { npiMsg: 'Medicare: confirm rendering provider NPI and POS code on all claims.' },
  'Blue Cross Blue Shield': { modMsg: 'BCBS requires modifier 25 on E&M when psychotherapy add-on (90833) is also billed.' },
};

// ─── Payer Logo Colors ────────────────────────────────────────────────────────
const PAYER_LOGO = {
  'Blue Cross Blue Shield': { bg: '#1e40af', initials: 'BC' },
  'Aetna':                  { bg: '#c2410c', initials: 'AE' },
  'UnitedHealthcare':       { bg: '#15803d', initials: 'UH' },
  'United Healthcare':      { bg: '#15803d', initials: 'UH' },
  'Cigna':                  { bg: '#0e7490', initials: 'CI' },
  'Anthem':                 { bg: '#6d28d9', initials: 'AN' },
  'Medicare Part B':        { bg: '#b91c1c', initials: 'MC' },
};

// ─── Scrubber ─────────────────────────────────────────────────────────────────
function runScrubber(cptCodes, icdCodes, payer) {
  const warnings = [];
  const isEM  = (c) => ['99213','99214','99215','99202','99203','99204','99205'].includes(c);
  const isPsy = (c) => ['90837','90834','90832','90853'].includes(c);
  const hasEM  = cptCodes.some(isEM);
  const hasPsy = cptCodes.some(isPsy);
  if (hasEM && hasPsy)
    warnings.push({ level: 'error', msg: 'Modifier 25 required: E&M billed same-day as psychotherapy' });
  if (cptCodes.includes('90791') && payer === 'Anthem')
    warnings.push({ level: 'error', msg: 'Anthem prior auth required for 90791' });
  if (!icdCodes || icdCodes.length === 0)
    warnings.push({ level: 'error', msg: 'No ICD-10 diagnosis code — required for submission' });
  if (cptCodes.includes('99215') && (!icdCodes || icdCodes.length < 2))
    warnings.push({ level: 'warning', msg: 'High complexity E&M (99215) — ensure multiple supporting diagnoses documented' });
  if (payer === 'Medicare Part B')
    warnings.push({ level: 'info', msg: 'Medicare: verify rendering provider NPI and Place of Service code' });
  return warnings;
}

// ─── Expected Reimbursement ───────────────────────────────────────────────────
function calcExpected(cptCodes, payer) {
  const rates = PAYER_ALLOWED[payer] || {};
  return cptCodes.reduce((s, c) => s + (rates[c] || (CPT_FEE[c] || 0) * 0.78), 0);
}

// ─── Claim Age ────────────────────────────────────────────────────────────────
function claimAge(generated_date) {
  if (!generated_date) return null;
  return Math.ceil((new Date('2026-05-23') - new Date(generated_date + 'T12:00:00')) / 86400000);
}

// ─── Timeline Builder ─────────────────────────────────────────────────────────
function buildTimeline(claim) {
  const evts = [];
  if (claim.generated_date) evts.push({ event: 'Created', date: claim.generated_date, note: 'Claim auto-generated from encounter', icon: '📋', color: '#6b7280' });
  if (claim.generated_date) evts.push({ event: 'Scrubbed', date: claim.generated_date, note: (claim.scrubber_warnings && claim.scrubber_warnings.length) ? 'Scrubber: ' + claim.scrubber_warnings.length + ' warning(s)' : 'Scrubber: Clean — 0 warnings', icon: '🔍', color: '#0ea5e9' });
  if (claim.submitted_date) evts.push({ event: 'Submitted', date: claim.submitted_date, note: (claim.submission_method || 'EDI') + ' 837P transmitted to ' + claim.insurance_name, icon: '📤', color: '#3b82f6' });
  if (claim.submitted_date && claim.status !== 'Denied') evts.push({ event: 'Acknowledged', date: claim.submitted_date, note: 'Payer 999 acceptance received', icon: '✅', color: '#10b981' });
  if (claim.status === 'Denied') evts.push({ event: 'Denied', date: claim.submitted_date || claim.generated_date, note: claim.denial_reason || 'Denied — see denial reason', icon: '⛔', color: '#ef4444' });
  if (claim.paid_date) evts.push({ event: 'ERA Posted', date: claim.paid_date, note: 'ERA auto-posted: $' + claim.insurance_payment + ' ins + $' + claim.patient_payment + ' patient', icon: '💰', color: '#059669' });
  return evts;
}

// ─── Appeal Generation ────────────────────────────────────────────────────────
const DENIAL_TYPES = {
  prior_auth:        { label: 'Prior Authorization Required', icon: '🔑', color: '#7c3aed' },
  medical_necessity: { label: 'Medical Necessity',            icon: '🏥', color: '#dc2626' },
  timely_filing:     { label: 'Timely Filing',                icon: '⏰', color: '#d97706' },
  coding_error:      { label: 'Coding / Billing Error',       icon: '📝', color: '#1d4ed8' },
  duplicate:         { label: 'Duplicate Claim',              icon: '📋', color: '#374151' },
  not_covered:       { label: 'Not a Covered Benefit',        icon: '🚫', color: '#6b7280' },
  other:             { label: 'Other / General Denial',       icon: '❓', color: '#6b7280' },
};

function detectDenialType(reason) {
  if (!reason) return 'other';
  const r = reason.toLowerCase();
  if (/prior auth|authorization|pre-auth|pa required/.test(r)) return 'prior_auth';
  if (/medical necessity|not medically|experimental|investigational/.test(r)) return 'medical_necessity';
  if (/timely filing|filing limit|late submission|deadline/.test(r)) return 'timely_filing';
  if (/coding|modifier|bundl|unbundl|edit|ncd|lcd|procedure code/.test(r)) return 'coding_error';
  if (/duplicate/.test(r)) return 'duplicate';
  if (/not covered|excluded|benefit|limitation/.test(r)) return 'not_covered';
  return 'other';
}

const PAYER_APPEAL_INFO = {
  'Blue Cross Blue Shield': { address: 'Blue Cross Blue Shield\nAppeals Department\nP.O. Box 660044\nDallas, TX 75266-0044', fax: '(800) 227-2927', deadline: '180 days from denial date', portal: 'availity.com' },
  'Aetna':                  { address: 'Aetna Appeals\nP.O. Box 981107\nEl Paso, TX 79998-1107', fax: '(859) 455-8650', deadline: '180 days from denial date', portal: 'aetna.com/providernews' },
  'UnitedHealthcare':       { address: 'UnitedHealthcare Appeals\nP.O. Box 30432\nSalt Lake City, UT 84130', fax: '(801) 994-1082', deadline: '180 days from denial date', portal: 'unitedhealthcareonline.com' },
  'United Healthcare':      { address: 'UnitedHealthcare Appeals\nP.O. Box 30432\nSalt Lake City, UT 84130', fax: '(801) 994-1082', deadline: '180 days from denial date', portal: 'unitedhealthcareonline.com' },
  'Cigna':                  { address: 'Cigna Healthcare Appeals\nP.O. Box 188004\nChattanooga, TN 37422', fax: '(888) 769-3615', deadline: '180 days from denial date', portal: 'cigna.com/providers' },
  'Anthem':                 { address: 'Anthem Blue Cross Appeals\nP.O. Box 60007\nLos Angeles, CA 90060-0007', fax: '(877) 543-7499', deadline: '180 days from denial date', portal: 'anthem.com/provider' },
  'Medicare Part B':        { address: 'Medicare Redetermination\nC2C Innovative Solutions\nP.O. Box 10490\nSt. Petersburg, FL 33733', fax: '(727) 623-8980', deadline: '120 days from denial (Redetermination)', portal: 'cms.gov/Medicare/Appeals' },
};

const APPEAL_BODY_TEMPLATES = {
  prior_auth: (claim) =>
`REASON FOR APPEAL: Prior Authorization Dispute

The services rendered on ${fmtDate(claim.service_date)} were medically necessary and clinically appropriate for the patient's documented diagnosis of ${(claim.icd_codes || []).join(', ')} — ${claim.diagnosis || 'see attached clinical notes'}. The treating provider, ${claim.provider_first_name} ${claim.provider_last_name}, determined that this level of care was immediately necessary to prevent deterioration of the patient's condition.

In urgent clinical situations, providers are not always able to obtain prior authorization before rendering care. We respectfully request that ${claim.insurance_name} apply its retroactive authorization policy and reprocess this claim.

SERVICES APPEALED:
${(claim.cpt_codes || []).map(c => `  • CPT ${c.code} — ${CPT_DESC[c.code] || c.description} ($${c.charge.toFixed(2)})`).join('\n')}

SUPPORTING DOCUMENTATION ENCLOSED:
  • Signed progress note / clinical documentation from date of service
  • Medical necessity documentation supporting ${(claim.icd_codes || []).join(', ')}
  • Treating provider attestation`,

  medical_necessity: (claim) =>
`REASON FOR APPEAL: Medical Necessity

The services billed under CPT ${(claim.cpt_codes || []).map(c => c.code).join(', ')} were medically necessary and clinically indicated for this patient, who carries a documented diagnosis of ${(claim.icd_codes || []).join(', ')} — ${claim.diagnosis || ''}. The treating provider exercised professional clinical judgment in determining that these services were required to effectively manage the patient's condition and prevent clinical deterioration.

Evidence-based clinical guidelines, including those from the American Psychiatric Association (APA) and SAMHSA, support the level of care provided. We respectfully request that ${claim.insurance_name} conduct a clinical review of the attached documentation prior to upholding this denial.

SERVICES APPEALED:
${(claim.cpt_codes || []).map(c => `  • CPT ${c.code} — ${CPT_DESC[c.code] || c.description} ($${c.charge.toFixed(2)})`).join('\n')}

SUPPORTING DOCUMENTATION ENCLOSED:
  • Provider clinical notes from ${fmtDate(claim.service_date)}
  • Diagnostic documentation (${(claim.icd_codes || []).join(', ')})
  • Applicable clinical practice guidelines and peer-reviewed references`,

  timely_filing: (claim) =>
`REASON FOR APPEAL: Timely Filing

We respectfully dispute this denial and submit documentation demonstrating that the claim was filed within the contractually required timeframe.

SUBMISSION TIMELINE:
  • Date of Service:   ${fmtDate(claim.service_date)}
  • Claim Generated:   ${fmtDate(claim.generated_date)}
  • Claim Submitted:   ${fmtDate(claim.submitted_date)}
  • Payer Control #:   ${claim.payer_control_number || 'See clearinghouse receipt'}

We request that ${claim.insurance_name} review the attached proof of timely submission and reprocess this claim accordingly.

SERVICES APPEALED:
${(claim.cpt_codes || []).map(c => `  • CPT ${c.code} — ${CPT_DESC[c.code] || c.description} ($${c.charge.toFixed(2)})`).join('\n')}

SUPPORTING DOCUMENTATION ENCLOSED:
  • Electronic submission confirmation / 277CA acceptance report
  • Clearinghouse transmission receipt with timestamp
  • Proof of original submission date`,

  coding_error: (claim) =>
`REASON FOR APPEAL: Coding / Billing Dispute

We believe this claim was incorrectly denied. The services rendered were accurately coded in compliance with current CPT and ICD-10 guidelines.

CODING JUSTIFICATION:
${(claim.cpt_codes || []).map(c => `  • CPT ${c.code}: ${CPT_DESC[c.code] || c.description}\n    — Appropriately reflects the documented service complexity and clinical work performed`).join('\n')}
${(claim.icd_codes || []).map(icd => `  • ICD-10 ${icd}: Principal diagnosis supporting medical necessity of reported procedure codes`).join('\n')}

We respectfully request reprocessing of claim ${claim.claim_number} with the original codes as submitted.

SUPPORTING DOCUMENTATION ENCLOSED:
  • Complete clinical documentation supporting all reported CPT codes
  • AMA CPT coding guidelines for reported procedures
  • Provider attestation of service complexity`,

  duplicate: (claim) =>
`REASON FOR APPEAL: Duplicate Claim Dispute

We are writing to confirm that claim ${claim.claim_number} is NOT a duplicate. The services rendered on ${fmtDate(claim.service_date)} represent a unique, distinct clinical encounter and were not previously submitted or paid under any other claim number.

We request that ${claim.insurance_name} conduct a thorough review of your claims history to confirm that no prior payment was issued for the identical services on this date of service.

SUPPORTING DOCUMENTATION ENCLOSED:
  • Original claim documentation with date of service confirmation
  • Clinical notes confirming unique encounter on ${fmtDate(claim.service_date)}
  • Proof no prior payment was received for these services`,

  not_covered: (claim) =>
`REASON FOR APPEAL: Coverage / Benefit Dispute

We believe the services provided are a covered benefit under this member's plan and respectfully request a full clinical reconsideration.

The services billed (CPT ${(claim.cpt_codes || []).map(c => c.code).join(', ')}) are evidence-based, standard-of-care treatments for ${claim.diagnosis || (claim.icd_codes || []).join(', ')} and are recognized by leading psychiatric and behavioral health organizations.

We also note that under the Mental Health Parity and Addiction Equity Act (MHPAEA), insurers are required to cover mental/behavioral health services at parity with medical/surgical benefits. If this denial was made on parity-related grounds, we request a formal parity analysis.

SUPPORTING DOCUMENTATION ENCLOSED:
  • Summary of Benefits confirming mental health coverage
  • MHPAEA parity documentation (if applicable)
  • Peer-reviewed clinical treatment guidelines`,

  other: (claim) =>
`REASON FOR APPEAL: General Denial Dispute

We respectfully disagree with the denial decision for the following services and request a thorough, independent clinical review:

SERVICES APPEALED:
${(claim.cpt_codes || []).map(c => `  • CPT ${c.code} — ${CPT_DESC[c.code] || c.description} ($${c.charge.toFixed(2)})`).join('\n')}
DIAGNOSES: ${(claim.icd_codes || []).join(', ')} — ${claim.diagnosis || ''}

We believe this claim meets all requirements for reimbursement and request that ${claim.insurance_name} reopen and reprocess it in accordance with our provider agreement.

SUPPORTING DOCUMENTATION ENCLOSED:
  • Complete clinical documentation from ${fmtDate(claim.service_date)}
  • Provider notes supporting all reported services`,
};

function generateAppealLetter(claim, denialType, appealLevel, additionalNotes) {
  const payerInfo = PAYER_APPEAL_INFO[claim.insurance_name] || { address: `${claim.insurance_name}\nAppeals Department`, fax: 'See payer website', deadline: '180 days from denial date', portal: 'See payer website' };
  const today = new Date('2026-05-23').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const refNum = 'APL-' + Date.now().toString().slice(-8);
  const bodyFn = APPEAL_BODY_TEMPLATES[denialType] || APPEAL_BODY_TEMPLATES.other;
  const body = bodyFn(claim);
  return `${today}
Appeal Reference: ${refNum}

TO:
${payerInfo.address}
Fax: ${payerInfo.fax}

FROM:
Clarity EHR — Outpatient Behavioral Health
Billing Department
Tel: (555) 400-7748  |  Fax: (555) 400-7749

────────────────────────────────────────────────────────
RE: ${appealLevel.toUpperCase()} APPEAL
────────────────────────────────────────────────────────
Claim Number:    ${claim.claim_number}
Patient:         ${claim.first_name} ${claim.last_name}
Member ID:       ${claim.member_id}
Date of Service: ${fmtDate(claim.service_date)}
Payer Control #: ${claim.payer_control_number || 'N/A'}
Total Billed:    $${(claim.total_charges || 0).toFixed(2)}
Denial Reason:   ${claim.denial_reason || 'See Explanation of Benefits'}
────────────────────────────────────────────────────────

Dear ${claim.insurance_name} Appeals Department,

We are writing to formally appeal the denial of the above-referenced claim. We respectfully request that your appeals department conduct a thorough review of the clinical and administrative documentation submitted herewith.

${body}
${additionalNotes ? `\nADDITIONAL PROVIDER NOTES:\n${additionalNotes}\n` : ''}
We respectfully request a written response within 30 days of receipt. If additional information is required, please contact our billing department at (555) 400-7748 or fax (555) 400-7749.

Sincerely,

Clarity EHR Billing Department
On behalf of ${claim.provider_first_name} ${claim.provider_last_name}
Date Submitted: ${today}

────────────────────────────────────────────────────────
APPEAL DEADLINE: ${payerInfo.deadline}
Submit via: ${payerInfo.portal} or mail/fax to address above
────────────────────────────────────────────────────────`;
}

// ─── Appeal Modal ─────────────────────────────────────────────────────────────
function AppealModal({ claim, onClose, onSubmit }) {
  const detectedType = detectDenialType(claim.denial_reason);
  const [denialType, setDenialType] = useState(detectedType);
  const [appealLevel, setAppealLevel] = useState('Level 1');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [letterText, setLetterText] = useState('');
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const typeInfo = DENIAL_TYPES[denialType] || DENIAL_TYPES.other;
  const payerInfo = PAYER_APPEAL_INFO[claim.insurance_name] || {};

  const handleGenerate = () => {
    setLetterText(generateAppealLetter(claim, denialType, appealLevel, additionalNotes));
    setStep(2);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(letterText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200); }).catch(() => {});
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Appeal Letter — ${claim.claim_number}</title><style>body{font-family:monospace;font-size:12px;margin:40px;white-space:pre-wrap;line-height:1.6}</style></head><body>${letterText.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</body></html>`);
    win.document.close();
    win.print();
  };

  const handleSubmit = () => {
    setSubmitting(true);
    const refNum = 'APL-' + Date.now().toString().slice(-8);
    setTimeout(() => {
      onSubmit(claim.id, {
        appeal_level: appealLevel,
        appeal_type: denialType,
        appeal_date: '2026-05-23',
        appeal_ref: refNum,
        appeal_letter: letterText,
      });
      setSubmitting(false);
    }, 600);
  };

  const CHECKLIST = {
    prior_auth:        ['Signed progress note', 'Medical necessity letter', 'Diagnosis documentation', 'Clinical assessment'],
    medical_necessity: ['Provider clinical notes', 'Diagnostic documentation', 'Clinical practice guidelines', 'Provider attestation'],
    timely_filing:     ['277CA acceptance report', 'Clearinghouse receipt', 'Original submission timestamp'],
    coding_error:      ['Clinical documentation', 'AMA CPT references', 'Provider attestation'],
    duplicate:         ['Original claim documentation', 'Unique encounter evidence'],
    not_covered:       ['Summary of Benefits', 'MHPAEA parity documentation', 'Clinical guidelines'],
    other:             ['Complete clinical documentation', 'Provider notes', 'Any relevant records'],
  };
  const docs = CHECKLIST[denialType] || CHECKLIST.other;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 740, maxHeight: '94vh', overflowY: 'auto', padding: 0 }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #4c1d95, #6d28d9)', padding: '16px 20px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>✍️ Auto Appeal Generation</div>
            <div style={{ fontSize: 12, color: '#c4b5fd', marginTop: 3 }}>{claim.claim_number} · {claim.first_name} {claim.last_name} · {claim.insurance_name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 6, width: 28, height: 28, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Step tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
          {[['1', '⚙️ Configure'], ['2', '📄 Letter Preview']].map(([s, label]) => (
            <button key={s} onClick={() => s === '1' ? setStep(1) : (letterText && setStep(2))}
              style={{ flex: 1, padding: '10px 8px', border: 'none', background: step === parseInt(s) ? '#fff' : 'transparent', color: step === parseInt(s) ? '#6d28d9' : '#6b7280', fontWeight: step === parseInt(s) ? 700 : 500, fontSize: 12, cursor: 'pointer', borderBottom: `2px solid ${step === parseInt(s) ? '#6d28d9' : 'transparent'}`, marginBottom: -2, opacity: s === '2' && !letterText ? 0.4 : 1 }}>
              Step {s}: {label}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px 24px' }}>
          {step === 1 && (
            <div>
              {/* Denial Info */}
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: 14, marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#991b1b', marginBottom: 6 }}>⛔ Denial Information</div>
                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}><strong>Reason:</strong> {claim.denial_reason || 'Not specified'}</div>
                <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}><strong>Payer:</strong> {claim.insurance_name}</div>
                {payerInfo.deadline && <div style={{ fontSize: 11, color: '#7f1d1d', marginTop: 6, background: '#fff', borderRadius: 6, padding: '4px 8px', display: 'inline-block', border: '1px solid #fca5a5' }}>⏰ Deadline: {payerInfo.deadline}</div>}
              </div>

              {/* Appeal Classification */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Appeal Type (Auto-Detected)</label>
                  <select value={denialType} onChange={e => setDenialType(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: `2px solid ${typeInfo.color}`, borderRadius: 8, fontSize: 12, fontWeight: 600, color: typeInfo.color, background: '#fafafa', cursor: 'pointer' }}>
                    {Object.entries(DENIAL_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>Auto-detected from denial reason — adjust if needed</div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Appeal Level</label>
                  <select value={appealLevel} onChange={e => setAppealLevel(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, color: '#374151', background: '#fafafa', cursor: 'pointer' }}>
                    <option>Level 1</option>
                    <option>Level 2</option>
                    <option>External Review</option>
                    <option>Expedited Appeal</option>
                  </select>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>Most denials start at Level 1</div>
                </div>
              </div>

              {/* Supporting Docs Checklist */}
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 14, marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#166534', marginBottom: 8 }}>📎 Recommended Supporting Documents</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {docs.map((doc, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#15803d' }}>
                      <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span> {doc}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payer Appeal Address */}
              {payerInfo.address && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 14, marginBottom: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: '#1d4ed8', marginBottom: 6 }}>📮 Payer Appeal Contact</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Mail To</div>
                      <div style={{ fontSize: 11, color: '#1e3a8a', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{payerInfo.address}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Fax</div>
                      <div style={{ fontSize: 12, color: '#1e3a8a', fontWeight: 600 }}>{payerInfo.fax}</div>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginTop: 8, marginBottom: 2 }}>Online Portal</div>
                      <div style={{ fontSize: 11, color: '#3b82f6' }}>{payerInfo.portal}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Additional Provider Notes <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional — added to letter)</span></label>
                <textarea value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)}
                  placeholder="Add specific clinical context, supporting references, or special circumstances..."
                  style={{ width: '100%', height: 80, padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button className="btn btn-secondary" onClick={onClose} style={{ fontSize: 13 }}>Cancel</button>
                <button onClick={handleGenerate} style={{ padding: '9px 20px', background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  ✨ Generate Appeal Letter →
                </button>
              </div>
            </div>
          )}

          {step === 2 && letterText && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1f2937' }}>Appeal Letter — Ready to Submit</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Review and edit the letter below, then submit or export</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setStep(1)} style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: 600, color: '#374151' }}>← Edit Setup</button>
                  <button onClick={handleCopy} style={{ padding: '6px 12px', background: copied ? '#f0fdf4' : '#f3f4f6', border: `1px solid ${copied ? '#86efac' : '#d1d5db'}`, borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: 600, color: copied ? '#15803d' : '#374151' }}>
                    {copied ? '✓ Copied!' : '📋 Copy'}
                  </button>
                  <button onClick={handlePrint} style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: 600, color: '#374151' }}>🖨️ Print</button>
                </div>
              </div>

              <textarea value={letterText} onChange={e => setLetterText(e.target.value)}
                style={{ width: '100%', height: 420, padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.6, resize: 'vertical', background: '#fafafa', boxSizing: 'border-box' }} />

              <div style={{ marginTop: 16, padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 11, color: '#92400e' }}>
                <strong>⚠️ Before Submitting:</strong> Ensure all supporting documents are gathered (see checklist on Step 1). Attach clinical notes, authorization documents, and any payer-specific forms required by {claim.insurance_name}.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <div style={{ fontSize: 11, color: '#6b7280' }}>
                  Appeal type: <strong style={{ color: typeInfo.color }}>{typeInfo.icon} {typeInfo.label}</strong> · Level: <strong>{appealLevel}</strong>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary" onClick={onClose} style={{ fontSize: 13 }}>Cancel</button>
                  <button onClick={handleSubmit} disabled={submitting}
                    style={{ padding: '9px 22px', background: submitting ? '#7c3aed99' : 'linear-gradient(135deg, #4c1d95, #6d28d9)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                    {submitting ? '⏳ Submitting...' : '📤 Submit Appeal'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Seed Claims ──────────────────────────────────────────────────────────────
const SEED_CLAIMS = [
  {
    id: 'clm-001', claim_number: 'CLM-2026-001', encounterId: 'enc-hist-1',
    patientId: 'p1', first_name: 'James', last_name: 'Anderson', mrn: 'MRN-00001',
    service_date: '2026-03-12', provider_first_name: 'Elena', provider_last_name: 'Martinez, MD, PhD',
    cpt_codes: [{ code: '99214', description: CPT_DESC['99214'], charge: 185 }],
    icd_codes: ['F33.1'], diagnosis: 'Major depressive disorder, recurrent, moderate',
    insurance_name: 'Blue Cross Blue Shield', member_id: 'BCB123456789',
    total_charges: 185, insurance_payment: 140, patient_payment: 30, balance: 15,
    status: 'Paid', generated_date: '2026-03-13', submitted_date: '2026-03-14', paid_date: '2026-03-28',
    submission_method: 'EDI', payer_control_number: 'BCB-20260314-00441', follow_up_needed: false,
    era_posted: true, scrubber_warnings: [], expected_reimbursement: 170,
  },
  {
    id: 'clm-002', claim_number: 'CLM-2026-002', encounterId: 'enc-hist-2',
    patientId: 'p1', first_name: 'James', last_name: 'Anderson', mrn: 'MRN-00001',
    service_date: '2026-02-14', provider_first_name: 'Elena', provider_last_name: 'Martinez, MD, PhD',
    cpt_codes: [{ code: '99214', description: CPT_DESC['99214'], charge: 185 }],
    icd_codes: ['F33.1'], diagnosis: 'Major depressive disorder, recurrent, moderate',
    insurance_name: 'Blue Cross Blue Shield', member_id: 'BCB123456789',
    total_charges: 185, insurance_payment: 140, patient_payment: 30, balance: 15,
    status: 'Paid', generated_date: '2026-02-15', submitted_date: '2026-02-16', paid_date: '2026-02-28',
    submission_method: 'EDI', payer_control_number: 'BCB-20260216-00398', follow_up_needed: false,
    era_posted: true, scrubber_warnings: [], expected_reimbursement: 170,
  },
  {
    id: 'clm-003', claim_number: 'CLM-2026-003', encounterId: 'enc-hist-3',
    patientId: 'p2', first_name: 'Maria', last_name: 'Garcia', mrn: 'MRN-00002',
    service_date: '2026-03-25', provider_first_name: 'Elena', provider_last_name: 'Martinez, MD, PhD',
    cpt_codes: [{ code: '99215', description: CPT_DESC['99215'], charge: 250 }],
    icd_codes: ['F43.10'], diagnosis: 'Post-traumatic stress disorder',
    insurance_name: 'Aetna', member_id: 'AET987654321',
    total_charges: 250, insurance_payment: 210, patient_payment: 25, balance: 15,
    status: 'Paid', generated_date: '2026-03-26', submitted_date: '2026-03-27', paid_date: '2026-04-10',
    submission_method: 'Portal', payer_control_number: 'AET-20260327-00512', follow_up_needed: false,
    era_posted: true, scrubber_warnings: [], expected_reimbursement: 212,
  },
  {
    id: 'clm-004', claim_number: 'CLM-2026-004', encounterId: 'enc-hist-4',
    patientId: 'p4', first_name: 'Emily', last_name: 'Chen', mrn: 'MRN-00004',
    service_date: '2026-03-15', provider_first_name: 'Michael', provider_last_name: 'Johnson, PMHNP-BC',
    cpt_codes: [{ code: '99214', description: CPT_DESC['99214'], charge: 185 }],
    icd_codes: ['F90.0'], diagnosis: 'ADHD, predominantly inattentive type',
    insurance_name: 'Cigna', member_id: 'CIG321654987',
    total_charges: 185, insurance_payment: 155, patient_payment: 20, balance: 10,
    status: 'Processed', generated_date: '2026-03-16', submitted_date: '2026-03-17',
    submission_method: 'EDI', payer_control_number: 'CIG-20260317-00289', follow_up_needed: true,
    era_posted: false, scrubber_warnings: [], expected_reimbursement: 155,
    follow_up_note: 'Claim 69 days old — no ERA received. Contact Cigna Provider Relations.',
  },
  {
    id: 'clm-005', claim_number: 'CLM-2026-005', encounterId: 'enc-hist-5',
    patientId: 'p6', first_name: 'Aisha', last_name: 'Patel', mrn: 'MRN-00006',
    service_date: '2026-03-20', provider_first_name: 'Elena', provider_last_name: 'Martinez, MD, PhD',
    cpt_codes: [{ code: '99214', description: CPT_DESC['99214'], charge: 185 }],
    icd_codes: ['F31.32'], diagnosis: 'Bipolar disorder, current episode depressed, moderate',
    insurance_name: 'Anthem', member_id: 'ANT654987321',
    total_charges: 185, insurance_payment: 0, patient_payment: 0, balance: 185,
    status: 'Denied', generated_date: '2026-03-21', submitted_date: '2026-03-22',
    submission_method: 'EDI', payer_control_number: '', follow_up_needed: true,
    era_posted: false, scrubber_warnings: [{ level: 'error', msg: 'Anthem prior auth required for 90791' }],
    expected_reimbursement: 145,
    denial_reason: 'Prior authorization required. Submit PA request to Anthem before resubmission.',
  },
  {
    id: 'clm-006', claim_number: 'CLM-2025-006', encounterId: 'enc-p1-0',
    patientId: 'p1', first_name: 'James', last_name: 'Anderson', mrn: 'MRN-00001',
    service_date: '2025-11-03', provider_first_name: 'Dr. Chris', provider_last_name: 'L., MD, PhD',
    cpt_codes: [
      { code: '90792', description: CPT_DESC['90792'], charge: 350 },
      { code: '96127', description: CPT_DESC['96127'], charge: 30 },
    ],
    icd_codes: ['F33.1', 'F41.1'], diagnosis: 'MDD initial evaluation + Generalized Anxiety Disorder',
    insurance_name: 'Blue Cross Blue Shield', member_id: 'BCB123456789',
    total_charges: 380, insurance_payment: 320, patient_payment: 30, balance: 30,
    status: 'Submitted', generated_date: '2025-11-04', submitted_date: '2025-11-05',
    submission_method: 'EDI', payer_control_number: 'BCB-20251105-00117', follow_up_needed: true,
    era_posted: false, scrubber_warnings: [],
    expected_reimbursement: 304,
    follow_up_note: 'Submitted 200 days ago — verify with BCBS portal. Possible lost claim.',
  },
  {
    id: 'clm-007', claim_number: 'CLM-2026-007', encounterId: 'enc-therapy-p3-1',
    patientId: 'p3', first_name: 'David', last_name: 'Thompson', mrn: 'MRN-00003',
    service_date: '2026-04-01', provider_first_name: 'April', provider_last_name: 'T., LCSW',
    cpt_codes: [{ code: '90837', description: CPT_DESC['90837'], charge: 175 }],
    icd_codes: ['F11.20'], diagnosis: 'Opioid use disorder, uncomplicated',
    insurance_name: 'UnitedHealthcare', member_id: 'UHC456789012',
    total_charges: 175, insurance_payment: 0, patient_payment: 0, balance: 175,
    status: 'Generated', generated_date: '2026-04-02',
    submission_method: 'EDI', payer_control_number: '', follow_up_needed: false,
    era_posted: false, scrubber_warnings: [], expected_reimbursement: 144,
  },
  {
    id: 'clm-008', claim_number: 'CLM-2026-008', encounterId: 'enc-therapy-p2-1',
    patientId: 'p2', first_name: 'Maria', last_name: 'Garcia', mrn: 'MRN-00002',
    service_date: '2026-04-09', provider_first_name: 'April', provider_last_name: 'T., LCSW',
    cpt_codes: [{ code: '90837', description: CPT_DESC['90837'], charge: 175 }],
    icd_codes: ['F43.10'], diagnosis: 'Post-traumatic stress disorder',
    insurance_name: 'Aetna', member_id: 'AET987654321',
    total_charges: 175, insurance_payment: 0, patient_payment: 0, balance: 175,
    status: 'Generated', generated_date: '2026-04-10',
    submission_method: 'Portal', payer_control_number: '', follow_up_needed: false,
    era_posted: false, scrubber_warnings: [], expected_reimbursement: 152,
  },
];

// ─── Eligibility Alert Seeds ─────────────────────────────────────────────────
const ELIGIBILITY_ALERTS = [
  { id: 'ea-1', patientId: 'p3', patient: 'David Thompson', mrn: 'MRN-00003', payer: 'UnitedHealthcare', severity: 'error', msg: 'Prior authorization required for 90837 (individual therapy, 60 min). Submit PA before claim submission.', action: 'Request PA' },
  { id: 'ea-2', patientId: 'p4', patient: 'Emily Chen', mrn: 'MRN-00004', payer: 'Cigna', severity: 'warning', msg: 'Deductible not fully met — $450.00 remaining. Patient out-of-pocket may exceed estimate.', action: 'Update Estimate' },
  { id: 'ea-3', patientId: 'p6', patient: 'Aisha Patel', mrn: 'MRN-00006', payer: 'Anthem', severity: 'error', msg: 'Coverage inactive as of 2026-04-01. Verify current coverage before resubmitting denied claim.', action: 'Verify Coverage' },
  { id: 'ea-4', patientId: 'p2', patient: 'Maria Garcia', mrn: 'MRN-00002', payer: 'Aetna', severity: 'info', msg: 'Telehealth modifier 95 may be required. Confirm place of service (02 or 10) on upcoming claims.', action: 'Review Modifier' },
];

// ─── Payer-Specific Eligibility Rules ────────────────────────────────────────
const PAYER_ELIGIBILITY_RULES = {
  'Blue Cross Blue Shield': {
    deductible: { individual: 1500, family: 3000, met: 1200 },
    oop: { individual: 5000, family: 10000 },
    authRequired: ['90792', '90791'],
    timelyFiling: 365,
    copay: { primary: 25, specialist: 50 },
    coinsurance: 20,
    network: 'PPO — in-network required for full benefit',
    notes: 'Behavioral health benefits managed by BCBS Behavioral. Modifier 25 required when E&M + psychotherapy same day.',
  },
  'Aetna': {
    deductible: { individual: 2000, family: 4000, met: 2000 },
    oop: { individual: 6000, family: 12000 },
    authRequired: ['90792', '90791', '90853'],
    timelyFiling: 180,
    copay: { primary: 30, specialist: 60 },
    coinsurance: 20,
    network: 'HMO/PPO — check enrollment tier',
    notes: 'Telehealth: modifier 95 + POS 02 or 10. Aetna requires group therapy auth for 90853.',
  },
  'UnitedHealthcare': {
    deductible: { individual: 1750, family: 3500, met: 800 },
    oop: { individual: 5500, family: 11000 },
    authRequired: ['90792', '90791', '99215'],
    timelyFiling: 90,
    copay: { primary: 20, specialist: 40 },
    coinsurance: 20,
    network: 'Optum managed — credentialing via Optum provider portal',
    notes: 'UHC has 90-day timely filing. 99215 requires time-based documentation. Check Optum Behavioral Health auth portal.',
  },
  'Cigna': {
    deductible: { individual: 1200, family: 2400, met: 750 },
    oop: { individual: 4500, family: 9000 },
    authRequired: ['90792', '90791'],
    timelyFiling: 180,
    copay: { primary: 25, specialist: 45 },
    coinsurance: 15,
    network: 'Evernorth — verify in-network status annually',
    notes: 'Cigna behavioral health managed by Evernorth. Annual re-auth required for ongoing therapy.',
  },
  'Anthem': {
    deductible: { individual: 2500, family: 5000, met: 0 },
    oop: { individual: 7000, family: 14000 },
    authRequired: ['90792', '90791', '90837', '90834'],
    timelyFiling: 365,
    copay: { primary: 30, specialist: 55 },
    coinsurance: 20,
    network: 'Blue Cross/Blue Shield Association — verify local plan',
    notes: 'Anthem requires PA for all psychotherapy CPTs. Coverage inactive alert on file for Aisha Patel.',
  },
  'Medicare Part B': {
    deductible: { individual: 240, family: 240, met: 240 },
    oop: { individual: null, family: null },
    authRequired: [],
    timelyFiling: 365,
    copay: { primary: 0, specialist: 0 },
    coinsurance: 20,
    network: 'Medicare-approved providers only — NPI required',
    notes: '80/20 coinsurance applies. Crossover to Medicaid if applicable. MIPS reporting may be required.',
  },
};

// ─── Denial Risk Prediction ───────────────────────────────────────────────────
function calcDenialRisk(claim) {
  let score = 0;
  const factors = [];
  if (claim.scrubber_warnings && claim.scrubber_warnings.some(w => w.level === 'error')) {
    score += 35; factors.push('Scrubber errors present');
  }
  if (!claim.member_id) { score += 20; factors.push('Missing member ID'); }
  const payerElig = PAYER_ELIGIBILITY_RULES[claim.insurance_name];
  if (payerElig) {
    const cptCodes = claim.cpt_codes.map(c => c.code);
    const authNeeded = cptCodes.some(c => payerElig.authRequired.includes(c));
    if (authNeeded && claim.status === 'Generated') { score += 25; factors.push('Payer PA required — not yet obtained'); }
    const age = claimAge(claim.generated_date);
    if (age !== null && age > payerElig.timelyFiling * 0.8) { score += 20; factors.push('Approaching timely filing limit (' + payerElig.timelyFiling + 'd)'); }
  }
  if (!claim.icd_codes || claim.icd_codes.length === 0) { score += 15; factors.push('No diagnosis code'); }
  if (claim.status === 'Denied') { score = 100; factors.push('Already denied'); }
  score = Math.min(score, 100);
  const level = score >= 60 ? 'high' : score >= 25 ? 'medium' : 'low';
  return { score, level, factors };
}

// ─── Biller Roster & Assignments ─────────────────────────────────────────────
const BILLERS = ['Elena M.', 'April T.', 'Marcus R.', 'Diane K.', 'Unassigned'];
const CLAIM_ASSIGNMENTS = {
  'clm-001': 'Elena M.', 'clm-002': 'Elena M.', 'clm-003': 'Elena M.',
  'clm-004': 'Diane K.', 'clm-005': 'Elena M.', 'clm-006': 'Marcus R.',
  'clm-007': 'April T.', 'clm-008': 'April T.',
};

// ─── SLA Task Seeds ───────────────────────────────────────────────────────────
const SEED_TASKS = [
  { id: 'task-001', claimId: 'clm-005', type: 'Appeal',    due: '2026-05-25', assignee: 'Elena M.',  note: 'Submit appeal to Anthem with updated auth documentation.', priority: 'high' },
  { id: 'task-002', claimId: 'clm-006', type: 'Follow Up', due: '2026-05-24', assignee: 'Marcus R.', note: '200+ day claim — call BCBS provider line for status update.', priority: 'high' },
  { id: 'task-003', claimId: 'clm-007', type: 'Verify PA', due: '2026-05-28', assignee: 'April T.',  note: 'Obtain UHC prior auth for 90837 before submission.', priority: 'medium' },
  { id: 'task-004', claimId: 'clm-004', type: 'Follow Up', due: '2026-05-26', assignee: 'Diane K.',  note: 'Cigna ERA not received — 69 days submitted. Initiate trace.', priority: 'medium' },
  { id: 'task-005', claimId: 'clm-008', type: 'Submit',    due: '2026-05-30', assignee: 'April T.',  note: 'Ready for portal submission once modifier 95 confirmed.', priority: 'low' },
];

// ─── Priority Score (Risk × Aging × Amount) ───────────────────────────────────
function calcPriorityScore(claim) {
  const { score: riskScore } = calcDenialRisk(claim);
  const age     = claimAge(claim.generated_date) || 0;
  const balance = claim.balance || 0;
  const riskPts   = riskScore * 5;                           // 0–500
  const agePts    = Math.min(age * 2, 200);                  // 0–200
  const amtPts    = Math.min(Math.round(balance / 2), 200);  // 0–200 (caps at $400)
  const statusPts = claim.status === 'Denied' ? 100 : (claim.status === 'Generated' && age > 3) ? 80 : claim.follow_up_needed ? 70 : 0;
  return Math.round(riskPts + agePts + amtPts + statusPts);
}

// ─── Get Billable Encounters ──────────────────────────────────────────────────
function getBillableEncounters(patientId, billedEncounterIds) {
  const results = [];
  const histList = encounterHistory[patientId] || [];
  histList.forEach(enc => {
    if (billedEncounterIds.has(enc.id)) return;
    if (!enc.cptCode) return;
    results.push({ id: enc.id, date: enc.date, label: enc.date + ' — ' + enc.visitType + ' (' + (enc.reason || '').slice(0, 40) + ')', providerName: (enc.provider || '') + (enc.credentials ? ', ' + enc.credentials : ''), cptCodes: [enc.cptCode], icdCode: enc.icdCode || '', diagnosis: enc.icdCode ? enc.icdCode.split(' - ').slice(1).join(' - ') : '' });
  });
  const detailedList = mockEncounters[patientId] || [];
  detailedList.forEach(enc => {
    if (billedEncounterIds.has(enc.id)) return;
    if (enc.status !== 'Completed') return;
    if (!enc.cptCodes || enc.cptCodes.length === 0) return;
    results.push({ id: enc.id, date: enc.date, label: enc.date + ' — ' + enc.type, providerName: enc.providerName || '', cptCodes: enc.cptCodes, icdCode: '', diagnosis: '' });
  });
  return results;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt$ = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const STATUS_STYLE = {
  Generated: { bg: '#f3f4f6', color: '#374151', border: '#d1d5db', rowBg: '#fffbeb' },
  Submitted: { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd', rowBg: '#fff' },
  Processed: { bg: '#fef3c7', color: '#92400e', border: '#fde68a', rowBg: '#fff' },
  Paid:      { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7', rowBg: '#fff' },
  Denied:    { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', rowBg: '#fff7f7' },
  Appealed:  { bg: '#ede9fe', color: '#5b21b6', border: '#c4b5fd', rowBg: '#fff' },
  Voided:    { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db', rowBg: '#f9fafa' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Generated;
  return <span style={{ background: s.bg, color: s.color, border: '1px solid ' + s.border, padding: '3px 9px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{status}</span>;
}

function PayerLogo({ payer }) {
  const l = PAYER_LOGO[payer] || { bg: '#6b7280', initials: payer ? payer.slice(0, 2).toUpperCase() : '?' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 22, height: 22, borderRadius: 4, background: l.bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, flexShrink: 0 }}>{l.initials}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{payer}</span>
    </div>
  );
}

function ScrubberBadge({ warnings }) {
  if (!warnings || warnings.length === 0) return null;
  const hasError = warnings.some(w => w.level === 'error');
  return (
    <span title={warnings.map(w => w.msg).join(' | ')}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: hasError ? '#fee2e2' : '#fef3c7', color: hasError ? '#991b1b' : '#92400e', cursor: 'help', marginLeft: 4 }}>
      {hasError ? '⚠️' : '💡'} {warnings.length}
    </span>
  );
}

// ─── Superbill Completeness Score ────────────────────────────────────────────
function calcSuperbillScore(claim) {
  let score = 0;
  const checks = [];
  const hasCPT = claim.cpt_codes && claim.cpt_codes.length > 0 && claim.cpt_codes.every(c => c.charge > 0);
  checks.push({ label: 'CPT with charges', pass: hasCPT }); if (hasCPT) score += 20;
  const hasICD = claim.icd_codes && claim.icd_codes.length > 0;
  checks.push({ label: 'ICD-10 diagnosis', pass: hasICD }); if (hasICD) score += 20;
  const hasMember = !!(claim.member_id);
  checks.push({ label: 'Member ID', pass: hasMember }); if (hasMember) score += 15;
  const hasProvider = !!(claim.provider_first_name && claim.provider_last_name);
  checks.push({ label: 'Rendering provider', pass: hasProvider }); if (hasProvider) score += 15;
  const noErrors = !claim.scrubber_warnings || !claim.scrubber_warnings.some(w => w.level === 'error');
  checks.push({ label: 'No scrubber errors', pass: noErrors }); if (noErrors) score += 20;
  const hasMethod = !!(claim.submission_method);
  checks.push({ label: 'Submission method', pass: hasMethod }); if (hasMethod) score += 10;
  return { score, checks };
}

function SuperbillScore({ claim }) {
  const { score, checks } = calcSuperbillScore(claim);
  const color = score >= 90 ? '#059669' : score >= 70 ? '#d97706' : '#dc2626';
  const bg = score >= 90 ? '#d1fae5' : score >= 70 ? '#fef3c7' : '#fee2e2';
  const tip = 'Superbill: ' + score + '/100\n' + checks.map(c => (c.pass ? '✓' : '✗') + ' ' + c.label).join('\n');
  return (
    <span title={tip} style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: bg, color, cursor: 'help', border: '1px solid ' + color + '40', whiteSpace: 'nowrap' }}>
      {score}%
    </span>
  );
}

// ─── Eligibility Alerts Panel ─────────────────────────────────────────────────
function EligibilityAlerts({ alerts, onDismiss, showToast }) {
  if (!alerts || alerts.length === 0) return null;
  const SEV = {
    error:   { bg: '#fef2f2', col: '#dc2626', border: '#fca5a5', dot: '#ef4444' },
    warning: { bg: '#fff7ed', col: '#c2410c', border: '#fed7aa', dot: '#f59e0b' },
    info:    { bg: '#eff6ff', col: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' },
  };
  const criticalCount = alerts.filter(a => a.severity === 'error').length;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
          ⚡ Real-Time Eligibility Alerts
          {criticalCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#fee2e2', color: '#991b1b' }}>{criticalCount} critical</span>}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last verified: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.map((a, i) => {
          const c = SEV[a.severity] || SEV.info;
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, background: c.bg, border: '1px solid ' + c.border }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: c.col }}>{a.patient}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{a.mrn}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>{a.payer}</span>
                </div>
                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.4 }}>{a.msg}</div>
              </div>
              <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'flex-start' }}>
                <button onClick={() => showToast(a.action + ' initiated for ' + a.patient + '.')} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 5, border: '1px solid ' + c.border, background: '#fff', color: c.col, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{a.action}</button>
                <button onClick={() => onDismiss(i)} style={{ fontSize: 12, padding: '2px 7px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1.5 }}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Patient Balance Summary ──────────────────────────────────────────────────
function PatientBalanceSummary({ balances, onClose }) {
  const total = balances.reduce((s, p) => s + p.balance, 0);
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 14 }}>👤 Patient Balance Summary</span>
          <span style={{ fontSize: 12, color: '#166534', marginLeft: 10 }}>Total outstanding: <strong>{fmt$(total)}</strong></span>
        </div>
        <button onClick={onClose} style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>×</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
              {['Patient', 'MRN', 'Claims', 'Denied', 'Ins. Paid', 'Pt. Paid', 'Balance', 'Actions'].map(h => (
                <th key={h} style={{ padding: '9px 14px', textAlign: ['Ins. Paid','Pt. Paid','Balance'].includes(h) ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {balances.map((p, i) => (
              <tr key={p.mrn} style={{ borderBottom: '1px solid var(--border)', background: p.balance > 100 ? '#fff7f7' : i % 2 ? '#fafafa' : '#fff' }}>
                <td style={{ padding: '10px 14px', fontWeight: 700 }}>{p.name}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{p.mrn}</td>
                <td style={{ padding: '10px 14px' }}>{p.claims}</td>
                <td style={{ padding: '10px 14px', color: p.denied > 0 ? '#dc2626' : 'var(--text-muted)', fontWeight: p.denied > 0 ? 700 : 400 }}>{p.denied || '—'}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>{fmt$(p.insPayment)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#7c3aed', fontWeight: 600 }}>{fmt$(p.patPayment)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: p.balance > 0 ? '#dc2626' : '#059669' }}>{fmt$(p.balance)}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {p.balance > 0 && <button style={{ fontSize: 10, padding: '3px 9px', borderRadius: 5, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>💳 Stmt</button>}
                    {p.denied > 0 && <button style={{ fontSize: 10, padding: '3px 9px', borderRadius: 5, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>✍️ Appeal</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Quick Actions Bar ────────────────────────────────────────────────────────
function QuickActionBar({ readyCount, onSubmitAll, onCheckEligibility, onScrubAll, onExport, onBatchStatements }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', borderRadius: 12, padding: '11px 16px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginRight: 6, whiteSpace: 'nowrap' }}>⚡ Biller Quick Actions</span>
      <button onClick={onSubmitAll} disabled={readyCount === 0}
        style={{ fontSize: 11, padding: '6px 13px', borderRadius: 7, border: 'none', background: readyCount > 0 ? '#059669' : '#475569', color: '#fff', fontWeight: 700, cursor: readyCount > 0 ? 'pointer' : 'default', opacity: readyCount > 0 ? 1 : 0.55, whiteSpace: 'nowrap' }}>
        📤 Submit All Ready ({readyCount})
      </button>
      <button onClick={onCheckEligibility} style={{ fontSize: 11, padding: '6px 13px', borderRadius: 7, border: '1px solid #475569', background: 'transparent', color: '#e2e8f0', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>⚡ Batch Eligibility Check</button>
      <button onClick={onScrubAll} style={{ fontSize: 11, padding: '6px 13px', borderRadius: 7, border: '1px solid #475569', background: 'transparent', color: '#e2e8f0', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>🔍 Run Batch Scrubber</button>
      <button onClick={onExport} style={{ fontSize: 11, padding: '6px 13px', borderRadius: 7, border: '1px solid #475569', background: 'transparent', color: '#e2e8f0', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>📊 Export Worklist</button>
      <button onClick={onBatchStatements} style={{ fontSize: 11, padding: '6px 13px', borderRadius: 7, border: '1px solid #7c3aed', background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>📄 Batch Statements</button>
      <span style={{ marginLeft: 'auto', fontSize: 10, color: '#64748b', whiteSpace: 'nowrap' }}>Clarity RCM · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
    </div>
  );
}

// ─── Denial Risk Badge ────────────────────────────────────────────────────────
function DenialRiskBadge({ claim }) {
  const { score, level, factors } = calcDenialRisk(claim);
  const styles = {
    high:   { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', label: 'HIGH' },
    medium: { bg: '#fef3c7', color: '#92400e', border: '#fde68a', label: 'MED' },
    low:    { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7', label: 'LOW' },
  };
  const s = styles[level];
  const tip = 'Denial Risk: ' + score + '/100\n' + (factors.length ? factors.map(f => '• ' + f).join('\n') : '✓ Low risk');
  return (
    <span title={tip} style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: s.bg, color: s.color, border: '1px solid ' + s.border, cursor: 'help', whiteSpace: 'nowrap' }}>
      {s.label} {score}
    </span>
  );
}

// ─── Payer Eligibility Panel ──────────────────────────────────────────────────
function PayerEligibilityPanel({ onClose }) {
  const [selected, setSelected] = useState(Object.keys(PAYER_ELIGIBILITY_RULES)[0]);
  const rule = PAYER_ELIGIBILITY_RULES[selected];
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>🏥 Payer-Specific Eligibility Rules</span>
        <button onClick={onClose} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: '#93c5fd', lineHeight: 1, padding: 0 }}>×</button>
      </div>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {Object.keys(PAYER_ELIGIBILITY_RULES).map(p => (
          <button key={p} onClick={() => setSelected(p)}
            style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: '1px solid ' + (selected === p ? '#1d4ed8' : 'var(--border)'), background: selected === p ? '#eff6ff' : '#fff', color: selected === p ? '#1d4ed8' : 'var(--text-secondary)', fontWeight: selected === p ? 700 : 500, cursor: 'pointer' }}>
            {p}
          </button>
        ))}
      </div>
      {rule && (
        <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Deductible &amp; Cost Share</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Individual Deductible</span><span style={{ fontWeight: 700 }}>{fmt$(rule.deductible.individual)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Met YTD</span><span style={{ fontWeight: 700, color: '#059669' }}>{fmt$(rule.deductible.met)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Remaining</span><span style={{ fontWeight: 700, color: '#dc2626' }}>{fmt$(Math.max(0, rule.deductible.individual - rule.deductible.met))}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span style={{ color: 'var(--text-secondary)' }}>Copay (PCP / Spec)</span><span style={{ fontWeight: 700 }}>{fmt$(rule.copay.primary)} / {fmt$(rule.copay.specialist)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Coinsurance</span><span style={{ fontWeight: 700 }}>{rule.coinsurance}%</span></div>
            </div>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Prior Auth &amp; Filing</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Timely Filing Limit</span><span style={{ fontWeight: 700 }}>{rule.timelyFiling} days</span></div>
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Auth Required CPTs</div>
                {rule.authRequired.length === 0
                  ? <span style={{ fontSize: 11, color: '#059669' }}>✓ No prior auth required</span>
                  : rule.authRequired.map(c => (
                    <span key={c} style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', marginRight: 4, display: 'inline-block', marginBottom: 4 }}>{c}</span>
                  ))}
              </div>
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1', background: '#eff6ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', marginBottom: 4 }}>Network &amp; Notes</div>
            <div style={{ fontSize: 12, color: '#1e3a8a', marginBottom: 4 }}><strong>Network:</strong> {rule.network}</div>
            <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{rule.notes}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AR Aging Report ──────────────────────────────────────────────────────────
function ARAgingReport({ claims, onClose }) {
  const aging = useMemo(() => {
    const map = {};
    claims.forEach(c => {
      if (!c.balance || c.balance <= 0) return;
      const age = claimAge(c.generated_date) || 0;
      if (!map[c.patientId]) map[c.patientId] = { name: c.first_name + ' ' + c.last_name, mrn: c.mrn, b0_30: 0, b31_60: 0, b61_90: 0, b90plus: 0, total: 0 };
      const p = map[c.patientId];
      if (age <= 30) p.b0_30 += c.balance;
      else if (age <= 60) p.b31_60 += c.balance;
      else if (age <= 90) p.b61_90 += c.balance;
      else p.b90plus += c.balance;
      p.total += c.balance;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [claims]);
  const totals = aging.reduce((acc, p) => ({ b0_30: acc.b0_30 + p.b0_30, b31_60: acc.b31_60 + p.b31_60, b61_90: acc.b61_90 + p.b61_90, b90plus: acc.b90plus + p.b90plus, total: acc.total + p.total }), { b0_30: 0, b31_60: 0, b61_90: 0, b90plus: 0, total: 0 });
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>📊 AR Aging Report</span>
          <span style={{ fontSize: 12, color: '#c4b5fd', marginLeft: 10 }}>Outstanding: {fmt$(totals.total)}</span>
        </div>
        <button onClick={onClose} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: '#c4b5fd', lineHeight: 1, padding: 0 }}>×</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid var(--border)' }}>
        {[
          { label: '0–30 days', val: totals.b0_30, color: '#059669', bg: '#f0fdf4' },
          { label: '31–60 days', val: totals.b31_60, color: '#d97706', bg: '#fffbeb' },
          { label: '61–90 days', val: totals.b61_90, color: '#ea580c', bg: '#fff7ed' },
          { label: '90+ days', val: totals.b90plus, color: '#dc2626', bg: '#fef2f2' },
        ].map((b, i) => (
          <div key={b.label} style={{ padding: '12px 16px', background: b.bg, borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: b.color, textTransform: 'uppercase', marginBottom: 3 }}>{b.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: b.color }}>{fmt$(b.val)}</div>
          </div>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
              {['Patient', 'MRN', '0–30d', '31–60d', '61–90d', '90+d', 'Total', 'Actions'].map(h => (
                <th key={h} style={{ padding: '9px 14px', textAlign: ['0–30d','31–60d','61–90d','90+d','Total'].includes(h) ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {aging.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No outstanding balances</td></tr>
            ) : aging.map((p, i) => (
              <tr key={p.mrn} style={{ borderBottom: '1px solid var(--border)', background: p.b90plus > 0 ? '#fff7f7' : i % 2 ? '#fafafa' : '#fff' }}>
                <td style={{ padding: '10px 14px', fontWeight: 700 }}>{p.name}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{p.mrn}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#059669', fontWeight: p.b0_30 > 0 ? 600 : 400 }}>{p.b0_30 > 0 ? fmt$(p.b0_30) : '—'}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#d97706', fontWeight: p.b31_60 > 0 ? 600 : 400 }}>{p.b31_60 > 0 ? fmt$(p.b31_60) : '—'}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#ea580c', fontWeight: p.b61_90 > 0 ? 700 : 400 }}>{p.b61_90 > 0 ? fmt$(p.b61_90) : '—'}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#dc2626', fontWeight: p.b90plus > 0 ? 800 : 400 }}>{p.b90plus > 0 ? fmt$(p.b90plus) : '—'}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#374151' }}>{fmt$(p.total)}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button style={{ fontSize: 10, padding: '3px 9px', borderRadius: 5, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>📄 Stmt</button>
                    {p.b90plus > 0 && <button style={{ fontSize: 10, padding: '3px 9px', borderRadius: 5, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>⚠️ Collections</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Batch Statement Modal ────────────────────────────────────────────────────
function BatchStatementModal({ balances, onClose, showToast }) {
  const withBalance = balances.filter(p => p.balance > 0);
  const [selected, setSelected] = useState(withBalance.map((_, i) => i));
  const totalSelected = selected.reduce((s, i) => s + (withBalance[i] ? withBalance[i].balance : 0), 0);
  const handleGenerate = () => { showToast(selected.length + ' patient statement(s) generated and queued for delivery.'); onClose(); };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 560 }}>
        <div className="modal-header">
          <h3>📄 Batch Statement Generation</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#1e3a8a' }}>
            <strong>ℹ️ </strong>{withBalance.length} patient(s) with outstanding balances. Statements will be sent via patient preferred contact method.
          </div>
          <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Select Patients</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setSelected(withBalance.map((_, i) => i))} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer' }}>All</button>
              <button onClick={() => setSelected([])} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer' }}>None</button>
            </div>
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {withBalance.length === 0
              ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No outstanding balances.</div>
              : withBalance.map((p, i) => (
              <div key={p.mrn} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: i < withBalance.length - 1 ? '1px solid var(--border)' : 'none', background: selected.includes(i) ? '#f0f9ff' : '#fff' }}>
                <input type="checkbox" checked={selected.includes(i)} onChange={e => setSelected(prev => e.target.checked ? [...prev, i] : prev.filter(x => x !== i))} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.mrn}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#dc2626' }}>{fmt$(p.balance)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.claims} claim(s)</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, color: '#374151' }}>
            <strong>{selected.length}</strong> patient(s) · <strong style={{ color: '#dc2626' }}>{fmt$(totalSelected)}</strong> total
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={selected.length === 0}>📄 Generate {selected.length} Statement(s)</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Biller Productivity Metrics ──────────────────────────────────────────────
function BillerMetrics({ claims, onClose }) {
  const paidClaims = claims.filter(c => c.status === 'Paid');
  const deniedClaims = claims.filter(c => c.status === 'Denied');
  const submittedClaims = claims.filter(c => ['Submitted','Processed','Paid','Denied','Appealed'].includes(c.status));
  const firstPassRate = submittedClaims.length > 0 ? Math.round(((submittedClaims.length - deniedClaims.length) / submittedClaims.length) * 100) : 0;
  const denialRate = submittedClaims.length > 0 ? Math.round((deniedClaims.length / submittedClaims.length) * 100) : 0;
  const totalBilled = claims.reduce((s, c) => s + (c.total_charges || 0), 0);
  const totalCollected = claims.reduce((s, c) => s + (c.insurance_payment || 0) + (c.patient_payment || 0), 0);
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;
  const recentClaims = claims.filter(c => { const age = claimAge(c.generated_date); return age !== null && age <= 7; });
  const avgDaysToSubmit = (() => {
    const sub = claims.filter(c => c.generated_date && c.submitted_date);
    if (!sub.length) return 0;
    const total = sub.reduce((s, c) => { const g = new Date(c.generated_date + 'T12:00:00'); const d = new Date(c.submitted_date + 'T12:00:00'); return s + Math.max(0, Math.ceil((d - g) / 86400000)); }, 0);
    return Math.round(total / sub.length);
  })();
  const billerBreakdown = [
    { name: 'Elena Martinez, MD', submitted: 4, paid: 3, denied: 0, revenue: paidClaims.filter(c => c.provider_last_name === 'Martinez').reduce((s, c) => s + (c.insurance_payment || 0), 0) || 610 },
    { name: 'April T., LCSW', submitted: 2, paid: 0, denied: 0, revenue: 0 },
    { name: 'Michael Johnson, PMHNP', submitted: 1, paid: 0, denied: 0, revenue: 0 },
    { name: 'Dr. Chris L., MD', submitted: 1, paid: 0, denied: 0, revenue: 0 },
  ];
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>📈 Biller Productivity Metrics</span>
        <button onClick={onClose} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', lineHeight: 1, padding: 0 }}>×</button>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'First-Pass Rate', value: firstPassRate + '%', color: firstPassRate >= 90 ? '#059669' : firstPassRate >= 75 ? '#d97706' : '#dc2626', icon: '✅' },
            { label: 'Denial Rate', value: denialRate + '%', color: denialRate <= 5 ? '#059669' : denialRate <= 15 ? '#d97706' : '#dc2626', icon: '⛔' },
            { label: 'Collection Rate', value: collectionRate + '%', color: collectionRate >= 85 ? '#059669' : collectionRate >= 70 ? '#d97706' : '#dc2626', icon: '💰' },
            { label: 'Avg Days to Submit', value: avgDaysToSubmit + 'd', color: avgDaysToSubmit <= 2 ? '#059669' : avgDaysToSubmit <= 5 ? '#d97706' : '#dc2626', icon: '⏱️' },
            { label: 'New This Week', value: recentClaims.length, color: '#1d4ed8', icon: '📋' },
            { label: 'Total Collected', value: fmt$(totalCollected), color: '#059669', icon: '📊' },
          ].map(m => (
            <div key={m.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)', borderLeft: '4px solid ' + m.color }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{m.icon} {m.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#374151' }}>Provider Breakdown</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                {['Provider', 'Submitted', 'Paid', 'Denied', 'Revenue'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Revenue' ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {billerBreakdown.map((b, i) => (
                <tr key={b.name} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '9px 12px', fontWeight: 600 }}>{b.name}</td>
                  <td style={{ padding: '9px 12px' }}>{b.submitted}</td>
                  <td style={{ padding: '9px 12px', color: '#059669', fontWeight: 600 }}>{b.paid}</td>
                  <td style={{ padding: '9px 12px', color: b.denied > 0 ? '#dc2626' : 'var(--text-muted)', fontWeight: b.denied > 0 ? 700 : 400 }}>{b.denied || '—'}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: b.revenue > 0 ? '#059669' : 'var(--text-muted)' }}>{b.revenue > 0 ? fmt$(b.revenue) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────
function PriorityBadge({ score, rank }) {
  const level = score >= 700 ? 'urgent' : score >= 400 ? 'high' : score >= 200 ? 'medium' : 'low';
  const ST = {
    urgent: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
    high:   { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    medium: { bg: '#fefce8', color: '#854d0e', border: '#fde68a' },
    low:    { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  };
  const s = ST[level];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      {rank != null && <span style={{ fontSize: 8, fontWeight: 800, color: 'var(--text-muted)' }}>#{rank}</span>}
      <span title={'Priority: ' + score} style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: s.bg, color: s.color, border: '1px solid ' + s.border, cursor: 'help', whiteSpace: 'nowrap' }}>{score}</span>
    </div>
  );
}

// ─── Fix Risk Actions ─────────────────────────────────────────────────────────
function FixRiskActions({ claim, setClaims, showToast }) {
  const { factors, level } = calcDenialRisk(claim);
  if (level === 'low' || ['Paid', 'Voided', 'Appealed'].includes(claim.status)) return null;
  const fixes = [];
  if (factors.includes('No diagnosis code'))
    fixes.push({ label: 'Add ICD', icon: '🩺', action: () => { setClaims(p => p.map(c => c.id === claim.id ? { ...c, icd_codes: ['F33.1'], diagnosis: 'Major depressive disorder' } : c)); showToast('ICD-10 F33.1 added to ' + claim.claim_number); } });
  if (factors.some(f => f.includes('PA required')))
    fixes.push({ label: 'Request PA', icon: '📋', action: () => showToast('PA request initiated for ' + claim.claim_number, 'info') });
  if (factors.includes('Missing member ID'))
    fixes.push({ label: 'Add ID', icon: '🪪', action: () => showToast('Member ID lookup started for ' + claim.claim_number, 'info') });
  if (factors.includes('Scrubber errors present'))
    fixes.push({ label: 'Review', icon: '🔧', action: () => showToast('Open claim to resolve scrubber errors on ' + claim.claim_number, 'warning') });
  if (fixes.length === 0) return null;
  return fixes.slice(0, 2).map((fix, i) => (
    <button key={i} onClick={fix.action} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, border: '1px solid #fde68a', background: '#fefce8', color: '#92400e', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {fix.icon} {fix.label}
    </button>
  ));
}

// ─── Denial Pattern Insights ──────────────────────────────────────────────────
function DenialPatternPanel({ claims, onClose }) {
  const patterns = useMemo(() => {
    const map = {};
    const submitted = claims.filter(c => ['Submitted','Processed','Paid','Denied','Appealed'].includes(c.status));
    submitted.forEach(c => {
      if (!map[c.insurance_name]) map[c.insurance_name] = { total: 0, denied: 0, amount: 0, reasons: {} };
      const p = map[c.insurance_name];
      p.total++;
      if (c.status === 'Denied') {
        p.denied++;
        p.amount += c.balance || 0;
        const r = (c.denial_reason || 'Unspecified').slice(0, 60);
        p.reasons[r] = (p.reasons[r] || 0) + 1;
      }
    });
    return Object.entries(map).map(([payer, d]) => ({
      payer, total: d.total, denied: d.denied,
      rate: d.total > 0 ? Math.round((d.denied / d.total) * 100) : 0,
      amount: d.amount,
      topReason: Object.entries(d.reasons).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
    })).sort((a, b) => b.rate - a.rate);
  }, [claims]);
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #dc2626, #991b1b)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>🎯 Denial Pattern Insights</span>
          <span style={{ fontSize: 12, color: '#fca5a5', marginLeft: 10 }}>By payer · claim history</span>
        </div>
        <button onClick={onClose} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', lineHeight: 1, padding: 0 }}>×</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#fef2f2', borderBottom: '2px solid #fca5a5' }}>
              {['Payer', 'Submitted', 'Denied', 'Denial Rate', 'Amt at Risk', 'Top Denial Reason'].map(h => (
                <th key={h} style={{ padding: '9px 14px', textAlign: h === 'Amt at Risk' ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {patterns.length === 0
              ? <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No submitted claims to analyze</td></tr>
              : patterns.map((p, i) => (
              <tr key={p.payer} style={{ borderBottom: '1px solid var(--border)', background: p.rate > 25 ? '#fff7f7' : i % 2 ? '#fafafa' : '#fff' }}>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 4, background: (PAYER_LOGO[p.payer] || {}).bg || '#6b7280', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, flexShrink: 0 }}>{(PAYER_LOGO[p.payer] || {}).initials || p.payer.slice(0, 2).toUpperCase()}</span>
                    <span style={{ fontWeight: 700 }}>{p.payer}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 14px' }}>{p.total}</td>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: p.denied > 0 ? '#dc2626' : 'var(--text-muted)' }}>{p.denied || '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 60, height: 6, borderRadius: 3, background: '#fee2e2', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: p.rate + '%', background: p.rate > 25 ? '#dc2626' : p.rate > 10 ? '#f59e0b' : '#10b981', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontWeight: 700, color: p.rate > 25 ? '#dc2626' : p.rate > 10 ? '#d97706' : '#059669' }}>{p.rate}%</span>
                  </div>
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: p.amount > 0 ? '#dc2626' : 'var(--text-muted)' }}>{p.amount > 0 ? fmt$(p.amount) : '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 11, color: '#374151', maxWidth: 240 }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.topReason}>{p.topReason}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '10px 14px', background: '#fef2f2', borderTop: '1px solid #fca5a5' }}>
        <div style={{ fontSize: 11, color: '#7f1d1d' }}>💡 <strong>Insight:</strong> Anthem PA requirements account for the highest denial rate. Ensure prior auth is obtained before submitting psychotherapy CPTs (90837, 90791, 90792).</div>
      </div>
    </div>
  );
}

// ─── SLA Task Panel ───────────────────────────────────────────────────────────
function SLATaskPanel({ tasks, claims, onClose, showToast, onTaskDone }) {
  const TODAY = '2026-05-23';
  const enriched = useMemo(() => tasks.map(t => {
    const claim = claims.find(c => c.id === t.claimId);
    const daysUntil = Math.ceil((new Date(t.due + 'T12:00:00') - new Date(TODAY + 'T12:00:00')) / 86400000);
    const slaStatus = daysUntil < 0 ? 'overdue' : daysUntil <= 2 ? 'due-soon' : 'on-track';
    return { ...t, claim, daysUntil, slaStatus };
  }).sort((a, b) => a.daysUntil - b.daysUntil), [tasks, claims]);
  const overdue  = enriched.filter(t => t.slaStatus === 'overdue').length;
  const dueSoon  = enriched.filter(t => t.slaStatus === 'due-soon').length;
  const SLA_ST = {
    overdue:    { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5', label: 'OVERDUE',  dot: '🔴' },
    'due-soon': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', label: 'DUE SOON', dot: '🟡' },
    'on-track': { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', label: 'ON TRACK', dot: '🟢' },
  };
  const TASK_COL = { Appeal: '#7c3aed', 'Follow Up': '#d97706', 'Verify PA': '#dc2626', Submit: '#1d4ed8', Resubmit: '#059669' };
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #0f172a, #1e3a8a)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>📋 SLA Task Queue</span>
          {overdue > 0 && <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: '#dc2626', color: '#fff' }}>{overdue} OVERDUE</span>}
          {dueSoon > 0 && <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: '#f59e0b', color: '#fff' }}>{dueSoon} DUE SOON</span>}
        </div>
        <button onClick={onClose} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', lineHeight: 1, padding: 0 }}>×</button>
      </div>
      {enriched.length === 0
        ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>🎉 All tasks complete!</div>
        : enriched.map((t, i) => {
          const ss = SLA_ST[t.slaStatus];
          const tc = TASK_COL[t.type] || '#6b7280';
          return (
            <div key={t.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: t.slaStatus === 'overdue' ? '#fff8f8' : i % 2 ? '#fafafa' : '#fff', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, background: tc + '22', color: tc, border: '1px solid ' + tc + '44', whiteSpace: 'nowrap' }}>{t.type}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: ss.bg, color: ss.color, border: '1px solid ' + ss.border, whiteSpace: 'nowrap' }}>{ss.dot} {ss.label}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
                  {t.claim && <span style={{ fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>{t.claim.claim_number}</span>}
                  {t.claim && <span style={{ fontSize: 11, color: '#374151' }}>{t.claim.first_name} {t.claim.last_name}</span>}
                  {t.claim && <span style={{ fontSize: 10, color: 'var(--text-secondary)', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>{t.claim.insurance_name}</span>}
                </div>
                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.4 }}>{t.note}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11 }}>
                  <span style={{ color: ss.color, fontWeight: 600 }}>Due {fmtDate(t.due)} ({t.daysUntil >= 0 ? '+' + t.daysUntil : t.daysUntil}d)</span>
                  <span style={{ color: '#64748b' }}>👤 {t.assignee}</span>
                </div>
              </div>
              <button onClick={() => { onTaskDone(t.id); showToast(t.type + ' task marked done for ' + (t.claim?.claim_number || '')); }}
                style={{ flexShrink: 0, fontSize: 10, padding: '5px 12px', borderRadius: 5, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                ✓ Done
              </button>
            </div>
          );
        })}
    </div>
  );
}

// ─── CPT Tooltip ─────────────────────────────────────────────────────────────
function CptCell({ cptCodes }) {
  const [tip, setTip] = useState(null);
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {cptCodes.slice(0, 3).map((c, i) => (
          <span key={i}
            onMouseEnter={() => setTip(c.code)}
            onMouseLeave={() => setTip(null)}
            style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', cursor: 'help', userSelect: 'none' }}>
            {c.code}
          </span>
        ))}
        {cptCodes.length > 3 && <span style={{ fontSize: 11, color: '#6b7280' }}>+{cptCodes.length - 3}</span>}
      </div>
      {tip && (
          <div style={{ position: 'absolute', bottom: '120%', left: 0, zIndex: 100, background: '#1e293b', color: '#fff', padding: '6px 10px', borderRadius: 7, fontSize: 11, whiteSpace: 'normal', boxShadow: '0 4px 12px rgba(0,0,0,0.25)', pointerEvents: 'none', maxWidth: 280, lineHeight: 1.4 }}>
          <strong>{tip}</strong> — {CPT_DESC[tip] || 'Procedure code'}
        </div>
      )}
    </div>
  );
}

// ─── Claim Timeline Tab ───────────────────────────────────────────────────────
function ClaimTimeline({ claim }) {
  const events = buildTimeline(claim);
  return (
    <div style={{ paddingTop: 8 }}>
      {events.map((evt, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, position: 'relative' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f8fafc', border: '2px solid ' + evt.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
              {evt.icon}
            </div>
            {i < events.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 20, background: '#e2e8f0', marginTop: 4 }} />}
          </div>
          <div style={{ paddingTop: 4 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: evt.color }}>{evt.event}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{fmtDate(evt.date)}</div>
            <div style={{ fontSize: 12, color: '#374151', marginTop: 3, lineHeight: 1.4 }}>{evt.note}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Enhanced Claim Detail Modal ──────────────────────────────────────────────
function ClaimDetailModal({ claim, onClose, onMarkPaid, onAppeal }) {
  const [tab, setTab] = useState('summary');
  if (!claim) return null;
  const totalPaid = (claim.insurance_payment || 0) + (claim.patient_payment || 0);
  const payerRule = PAYER_RULES[claim.insurance_name];
  const warnings = claim.scrubber_warnings || [];
  const expectedTotal = claim.expected_reimbursement || calcExpected(claim.cpt_codes.map(c => c.code), claim.insurance_name);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 700, maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'linear-gradient(135deg, #1e40af, #1d4ed8)', color: '#fff', margin: -20, padding: 20, marginBottom: 0, borderRadius: '12px 12px 0 0' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{claim.claim_number}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{claim.first_name} {claim.last_name} · {fmtDate(claim.service_date)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <StatusBadge status={claim.status} />
            <button className="modal-close" onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 6, width: 28, height: 28, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {[['summary','📋 Summary'], ['timeline','🕐 Timeline'], ['scrubber','🔍 Scrubber']].map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '10px 6px', border: 'none', background: tab === t ? '#eff6ff' : 'transparent', color: tab === t ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: tab === t ? 700 : 500, fontSize: 12, cursor: 'pointer', borderBottom: '2px solid ' + (tab === t ? 'var(--primary)' : 'transparent') }}>
              {l}
            </button>
          ))}
        </div>

        <div className="modal-body">

          {tab === 'summary' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                {[
                  ['Patient', claim.first_name + ' ' + claim.last_name + ' (' + claim.mrn + ')'],
                  ['Payer', claim.insurance_name],
                  ['Member ID', claim.member_id],
                  ['Payer Control #', claim.payer_control_number || '—'],
                  ['Provider', claim.provider_first_name + ' ' + claim.provider_last_name],
                  ['Submission Method', claim.submission_method || '—'],
                  ['Generated', fmtDate(claim.generated_date)],
                  ['Submitted', fmtDate(claim.submitted_date)],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: '#f8fafc', borderRadius: 7, padding: '10px 12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{v}</div>
                  </div>
                ))}
              </div>

              {payerRule && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 11, marginBottom: 3 }}>🏥 Payer Rule</div>
                  <div style={{ fontSize: 12, color: '#1e3a8a' }}>{payerRule.authMsg || payerRule.telehealthMsg || payerRule.docMsg || payerRule.npiMsg || payerRule.modMsg}</div>
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Procedure Codes</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>CPT</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Description</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>Charge</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>Expected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claim.cpt_codes.map((c, i) => {
                      const rates = PAYER_ALLOWED[claim.insurance_name] || {};
                      const exp = rates[c.code] || c.charge * 0.78;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: 'monospace' }}>{c.code}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>{c.description || CPT_DESC[c.code]}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{fmt$(c.charge)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>{fmt$(exp)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '12px 14px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: 6 }}>Financial Summary</div>
                  {[['Total Charges', fmt$(claim.total_charges), '#1e293b'], ['Ins. Payment', fmt$(claim.insurance_payment), '#059669'], ['Patient Pay', fmt$(claim.patient_payment), '#059669'], ['Balance', fmt$(claim.balance), claim.balance > 0 ? '#dc2626' : '#059669']].map(([l, v, c]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #dcfce7', fontSize: 12 }}>
                      <span style={{ color: '#166534' }}>{l}</span>
                      <span style={{ fontWeight: 700, color: c }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#eff6ff', borderRadius: 8, padding: '12px 14px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', marginBottom: 6 }}>AI Reimbursement Prediction</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#1d4ed8', marginBottom: 2 }}>{fmt$(expectedTotal)}</div>
                  <div style={{ fontSize: 11, color: '#1e3a8a' }}>Expected from {claim.insurance_name}</div>
                  <div style={{ fontSize: 10, color: '#60a5fa', marginTop: 4 }}>Based on {claim.insurance_name} fee schedule</div>
                  {claim.era_posted && <div style={{ fontSize: 10, color: '#059669', fontWeight: 700, marginTop: 6 }}>✅ ERA auto-posted</div>}
                </div>
              </div>

              {claim.denial_reason && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 4, fontSize: 12 }}>⛔ Denial Reason</div>
                  <div style={{ fontSize: 13, color: '#7f1d1d' }}>{claim.denial_reason}</div>
                </div>
              )}
              {claim.follow_up_needed && claim.follow_up_note && (
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: '#c2410c', marginBottom: 4, fontSize: 12 }}>🔔 Follow-Up Required</div>
                  <div style={{ fontSize: 13, color: '#9a3412' }}>{claim.follow_up_note}</div>
                </div>
              )}
            </div>
          )}

          {tab === 'timeline' && <ClaimTimeline claim={claim} />}

          {tab === 'scrubber' && (
            <div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🔍 Claim Scrubber Results</div>
                {warnings.length === 0 ? (
                  <div style={{ padding: 14, borderRadius: 9, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontWeight: 700, color: '#166534' }}>✅ Clean — No scrubber warnings</div>
                    <div style={{ fontSize: 12, color: '#4ade80', marginTop: 4 }}>All CPT/ICD combinations validated successfully.</div>
                  </div>
                ) : (
                  warnings.map((w, i) => (
                    <div key={i} style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 8, background: w.level === 'error' ? '#fef2f2' : w.level === 'warning' ? '#fef3c7' : '#eff6ff', border: '1px solid ' + (w.level === 'error' ? '#fca5a5' : w.level === 'warning' ? '#fde68a' : '#bfdbfe') }}>
                      <div style={{ fontWeight: 700, color: w.level === 'error' ? '#dc2626' : w.level === 'warning' ? '#d97706' : '#1d4ed8', fontSize: 12, marginBottom: 2 }}>
                        {w.level === 'error' ? '⛔' : w.level === 'warning' ? '⚠️' : 'ℹ️'} {w.level.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 12, color: '#374151' }}>{w.msg}</div>
                    </div>
                  ))
                )}
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🤖 AI Coding Validation</div>
                <div style={{ padding: '12px 14px', borderRadius: 8, background: 'linear-gradient(135deg, #eff6ff, #f0f9ff)', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 12, marginBottom: 6 }}>Procedure Analysis</div>
                  {claim.cpt_codes.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 12 }}>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', background: '#dbeafe', color: '#1d4ed8', padding: '2px 6px', borderRadius: 4 }}>{c.code}</span>
                      <span style={{ color: '#374151' }}>{CPT_DESC[c.code] || c.description}</span>
                      <span style={{ color: '#059669', fontWeight: 600, marginLeft: 'auto', fontSize: 11 }}>✓ Valid</span>
                    </div>
                  ))}
                  {claim.icd_codes && claim.icd_codes.map((icd, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 12 }}>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4 }}>{icd}</span>
                      <span style={{ color: '#374151' }}>ICD-10 Diagnosis</span>
                      <span style={{ color: '#059669', fontWeight: 600, marginLeft: 'auto', fontSize: 11 }}>✓ Valid</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {claim.status === 'Denied' && (
            <button className="btn btn-secondary" onClick={() => onAppeal && onAppeal(claim)} style={{ fontSize: 13, background: 'linear-gradient(135deg, #4c1d95, #6d28d9)', color: '#fff', border: 'none' }}>✍️ Appeal Claim</button>
          )}
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Generate Claim Modal ─────────────────────────────────────────────────────
function GenerateClaimModal({ onClose, onGenerate, patients, billedEncounterIds }) {
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedEncounterId, setSelectedEncounterId] = useState('');

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || null;
  const billableEncounters = useMemo(() =>
    selectedPatientId ? getBillableEncounters(selectedPatientId, billedEncounterIds) : [],
    [selectedPatientId, billedEncounterIds]
  );
  const selectedEncounter = billableEncounters.find(e => e.id === selectedEncounterId) || null;

  const aiValidation = useMemo(() => {
    if (!selectedEncounter || !selectedPatient) return null;
    const payer = (selectedPatient.insurance && selectedPatient.insurance.primary && selectedPatient.insurance.primary.name) || '';
    const warnings = runScrubber(selectedEncounter.cptCodes, selectedEncounter.icdCode ? [selectedEncounter.icdCode] : [], payer);
    const expected = calcExpected(selectedEncounter.cptCodes, payer);
    const payerRule = PAYER_RULES[payer];
    return { warnings, expected, payerRule, payer };
  }, [selectedEncounter, selectedPatient]);

  const handleGenerate = () => {
    if (!selectedPatient || !selectedEncounter) return;
    onGenerate(selectedEncounter, selectedPatient);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 640 }}>
        <div className="modal-header">
          <h3>📋 Generate New Claim</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label className="form-label">Patient *</label>
            <select value={selectedPatientId} onChange={e => { setSelectedPatientId(e.target.value); setSelectedEncounterId(''); }} className="form-input">
              <option value="">Select a patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.mrn})</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Billable Encounter *</label>
            <select value={selectedEncounterId} onChange={e => setSelectedEncounterId(e.target.value)} className="form-input" disabled={!selectedPatientId}>
              <option value="">{!selectedPatientId ? 'Select patient first' : billableEncounters.length === 0 ? 'No unbilled encounters found' : 'Select an encounter...'}</option>
              {billableEncounters.map(enc => <option key={enc.id} value={enc.id}>{enc.label}</option>)}
            </select>
          </div>

          {aiValidation && selectedEncounter && selectedPatient && (
            <div>
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 14px', marginBottom: 10, fontSize: 13 }}>
                <div style={{ fontWeight: 700, color: '#166534', marginBottom: 8 }}>📋 Claim Preview</div>
                <div style={{ display: 'grid', gap: 4 }}>
                  <div><span style={{ color: '#166534' }}>Patient: </span>{selectedPatient.firstName} {selectedPatient.lastName}</div>
                  <div><span style={{ color: '#166534' }}>Payer: </span>{aiValidation.payer || 'Unknown'}</div>
                  <div><span style={{ color: '#166534' }}>CPT Codes: </span><strong>{selectedEncounter.cptCodes.join(', ')}</strong></div>
                  <div><span style={{ color: '#166534' }}>Billed: </span><strong>{fmt$(selectedEncounter.cptCodes.reduce((s, c) => s + (CPT_FEE[c] || 0), 0))}</strong></div>
                  <div><span style={{ color: '#166534' }}>AI Expected Reimbursement: </span><strong style={{ color: '#1d4ed8' }}>{fmt$(aiValidation.expected)}</strong></div>
                </div>
              </div>

              {aiValidation.payerRule && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: 10, fontSize: 12 }}>
                  <strong style={{ color: '#1d4ed8' }}>🏥 Payer Rule: </strong>
                  <span style={{ color: '#1e3a8a' }}>{aiValidation.payerRule.authMsg || aiValidation.payerRule.telehealthMsg || aiValidation.payerRule.docMsg || aiValidation.payerRule.npiMsg || aiValidation.payerRule.modMsg}</span>
                </div>
              )}

              {aiValidation.warnings.length > 0 && (
                <div style={{ padding: '10px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>⚠️ Scrubber Warnings ({aiValidation.warnings.length})</div>
                  {aiValidation.warnings.map((w, i) => (
                    <div key={i} style={{ color: '#7f1d1d', marginBottom: 3 }}>• {w.msg}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={!selectedPatientId || !selectedEncounterId}>
            Generate Claim
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ClaimsManagement() {
  const { currentUser } = useAuth();
  const { patients } = usePatient();

  const [claims, setClaims] = useState(() => SEED_CLAIMS.map(c => ({ ...c, assigned_to: CLAIM_ASSIGNMENTS[c.id] || 'Unassigned' })));
  const [selectedClaims, setSelectedClaims] = useState([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [viewClaim, setViewClaim] = useState(null);
  const [appealClaim, setAppealClaim] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [showERA, setShowERA] = useState(false);
  const [showPatientBalance, setShowPatientBalance] = useState(false);
  const [eligAlerts, setEligAlerts] = useState(ELIGIBILITY_ALERTS);
  const [filters, setFilters] = useState({ patientId: '', status: '', dateFrom: '', dateTo: '' });
  const [showARaging, setShowARaging] = useState(false);
  const [showBillerMetrics, setShowBillerMetrics] = useState(false);
  const [showStatements, setShowStatements] = useState(false);
  const [showPayerElig, setShowPayerElig] = useState(false);
  const [sortBy, setSortBy] = useState('default');
  const [tasks, setTasks] = useState(SEED_TASKS);
  const [showDenialPatterns, setShowDenialPatterns] = useState(false);
  const [showSLATasks, setShowSLATasks] = useState(false);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const handleAppealSubmit = (claimId, appealData) => {
    setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: 'Appealed', ...appealData } : c));
    setAppealClaim(null);
    setViewClaim(null);
    showToast(`Appeal submitted — Ref: ${appealData.appeal_ref}`, 'success');
  };

  const billedEncounterIds = useMemo(() => new Set(claims.map(c => c.encounterId).filter(Boolean)), [claims]);

  const stats = useMemo(() => ({
    total: claims.length,
    generated: claims.filter(c => c.status === 'Generated').length,
    submitted: claims.filter(c => c.status === 'Submitted').length,
    paid: claims.filter(c => c.status === 'Paid').length,
    denied: claims.filter(c => c.status === 'Denied').length,
    followUp: claims.filter(c => c.follow_up_needed).length,
    totalCharges: claims.reduce((s, c) => s + c.total_charges, 0),
    totalPaid: claims.reduce((s, c) => s + (c.insurance_payment || 0) + (c.patient_payment || 0), 0),
    totalBalance: claims.reduce((s, c) => s + (c.balance || 0), 0),
  }), [claims]);

  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      if (filters.patientId && c.patientId !== filters.patientId) return false;
      if (filters.status && c.status !== filters.status) return false;
      if (filters.dateFrom && c.service_date < filters.dateFrom) return false;
      if (filters.dateTo && c.service_date > filters.dateTo) return false;
      if (search) {
        const q = search.toLowerCase();
        const cptMatch = c.cpt_codes.some(code => code.code.toLowerCase().includes(q));
        const icdMatch = (c.icd_codes || []).some(icd => icd.toLowerCase().includes(q));
        const denialMatch = (c.denial_reason || '').toLowerCase().includes(q);
        if (!c.claim_number.toLowerCase().includes(q) &&
            !(c.first_name + ' ' + c.last_name).toLowerCase().includes(q) &&
            !(c.insurance_name || '').toLowerCase().includes(q) &&
            !cptMatch && !icdMatch && !denialMatch) return false;
      }
      return true;
    });
  }, [claims, filters, search]);

  const eligibleForSubmission = filteredClaims.filter(c => c.status === 'Generated');
  const hasActiveFilters = search || Object.values(filters).some(v => v !== '');
  const eraPostedClaims = claims.filter(c => c.era_posted);

  const patientBalances = useMemo(() => {
    const map = {};
    claims.forEach(c => {
      if (!map[c.patientId]) map[c.patientId] = { name: c.first_name + ' ' + c.last_name, mrn: c.mrn, billed: 0, insPayment: 0, patPayment: 0, balance: 0, claims: 0, denied: 0 };
      const p = map[c.patientId];
      p.billed += c.total_charges || 0;
      p.insPayment += c.insurance_payment || 0;
      p.patPayment += c.patient_payment || 0;
      p.balance += c.balance || 0;
      p.claims++;
      if (c.status === 'Denied') p.denied++;
    });
    return Object.values(map).sort((a, b) => b.balance - a.balance);
  }, [claims]);

  const sortedFilteredClaims = useMemo(() => {
    if (sortBy !== 'priority') return filteredClaims;
    return [...filteredClaims].sort((a, b) => calcPriorityScore(b) - calcPriorityScore(a));
  }, [filteredClaims, sortBy]);

  const handleTaskDone = (taskId) => setTasks(prev => prev.filter(t => t.id !== taskId));

  const handleSelectClaim = (id, checked) => setSelectedClaims(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  const handleSelectAll = (checked) => setSelectedClaims(checked ? eligibleForSubmission.map(c => c.id) : []);

  const handleSubmit = () => {
    const today = '2026-05-23';
    setClaims(prev => prev.map(c => selectedClaims.includes(c.id) ? { ...c, status: 'Submitted', submitted_date: today, submission_method: 'EDI', payer_control_number: '' } : c));
    showToast(selectedClaims.length + ' claim(s) submitted via EDI successfully.');
    setSelectedClaims([]);
  };

  const handleRebill = () => {
    setClaims(prev => prev.map(c => selectedClaims.includes(c.id) ? { ...c, status: 'Generated', submitted_date: null, payer_control_number: '' } : c));
    showToast(selectedClaims.length + ' claim(s) reset for rebilling.');
    setSelectedClaims([]);
  };

  const handleVoid = () => {
    if (!window.confirm('Void ' + selectedClaims.length + ' claim(s)? This cannot be undone.')) return;
    setClaims(prev => prev.map(c => selectedClaims.includes(c.id) ? { ...c, status: 'Voided', balance: 0 } : c));
    showToast(selectedClaims.length + ' claim(s) voided.', 'info');
    setSelectedClaims([]);
  };

  const handleGenerate = (encounter, patient) => {
    const claimNum = 'CLM-' + new Date().getFullYear() + '-' + String(claims.length + 1).padStart(3, '0');
    const cptList = encounter.cptCodes || [];
    const totalCharges = cptList.reduce((s, code) => s + (CPT_FEE[code] || 0), 0);
    const payer = (patient.insurance && patient.insurance.primary && patient.insurance.primary.name) || '';
    const scrubberWarnings = runScrubber(cptList, encounter.icdCode ? [encounter.icdCode] : [], payer);
    const expectedReim = calcExpected(cptList, payer);
    const newClaim = {
      id: 'clm-gen-' + Date.now(), claim_number: claimNum, encounterId: encounter.id,
      patientId: patient.id, first_name: patient.firstName, last_name: patient.lastName, mrn: patient.mrn,
      service_date: encounter.date,
      provider_first_name: encounter.providerName.split(' ')[0],
      provider_last_name: encounter.providerName.split(' ').slice(1).join(' '),
      cpt_codes: cptList.map(code => ({ code, description: CPT_DESC[code] || code, charge: CPT_FEE[code] || 0 })),
      icd_codes: encounter.icdCode ? [encounter.icdCode.split(' - ')[0]] : [],
      diagnosis: encounter.diagnosis || '',
      insurance_name: payer, member_id: (patient.insurance && patient.insurance.primary && patient.insurance.primary.memberId) || '',
      total_charges: totalCharges, insurance_payment: 0, patient_payment: 0, balance: totalCharges,
      status: 'Generated', generated_date: '2026-05-23',
      submission_method: 'EDI', payer_control_number: '', follow_up_needed: false,
      era_posted: false, scrubber_warnings: scrubberWarnings, expected_reimbursement: expectedReim,
    };
    setClaims(prev => [newClaim, ...prev]);
    setShowGenerateModal(false);
    if (scrubberWarnings.some(w => w.level === 'error')) {
      showToast('Claim generated with ' + scrubberWarnings.filter(w => w.level === 'error').length + ' scrubber error(s) — review before submitting.', 'warning');
    } else {
      showToast('Claim ' + claimNum + ' generated. Expected reimbursement: ' + fmt$(expectedReim));
    }
  };

  return (
    <div className="claims-management fade-in" style={{ paddingBottom: 40 }}>

      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'warning' ? '#d97706' : toast.type === 'info' ? '#0284c7' : '#059669', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', maxWidth: 420 }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>📋 Claims Management</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Generate, scrub, submit, and track insurance claims with payer-specific rules</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setShowERA(v => !v)} style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: showERA ? '#f0fdf4' : '#fff', color: showERA ? '#059669' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer' }}>
            💡 ERA Activity ({eraPostedClaims.length})
          </button>
          <button onClick={() => setShowPatientBalance(v => !v)} style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: showPatientBalance ? '#eff6ff' : '#fff', color: showPatientBalance ? '#1d4ed8' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer' }}>
            👤 Patient Balances
          </button>
          {eligAlerts.length > 0 && (
            <button onClick={() => document.getElementById('elig-alerts-panel')?.scrollIntoView({ behavior: 'smooth' })} style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontWeight: 700, cursor: 'pointer' }}>
              ⚡ {eligAlerts.filter(a => a.severity === 'error').length} Eligibility Alerts
            </button>
          )}
          <button onClick={() => setShowARaging(v => !v)} style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: showARaging ? '#faf5ff' : '#fff', color: showARaging ? '#7c3aed' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer' }}>
            📊 AR Aging
          </button>
          <button onClick={() => setShowBillerMetrics(v => !v)} style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: showBillerMetrics ? '#f0fdf4' : '#fff', color: showBillerMetrics ? '#059669' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer' }}>
            📈 Biller Metrics
          </button>
          <button onClick={() => setShowPayerElig(v => !v)} style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: showPayerElig ? '#eff6ff' : '#fff', color: showPayerElig ? '#1d4ed8' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer' }}>
            🏥 Payer Rules
          </button>
          <button onClick={() => setShowDenialPatterns(v => !v)} style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: showDenialPatterns ? '#fef2f2' : '#fff', color: showDenialPatterns ? '#dc2626' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer' }}>
            🎯 Denial Patterns
          </button>
          <button onClick={() => setShowSLATasks(v => !v)} style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: tasks.length > 0 && tasks.some(t => { const d = Math.ceil((new Date(t.due + 'T12:00:00') - new Date('2026-05-23T12:00:00')) / 86400000); return d <= 2; }) ? '1px solid #fca5a5' : '1px solid var(--border)', background: showSLATasks ? '#f0f9ff' : '#fff', color: showSLATasks ? '#0369a1' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer' }}>
            📋 Tasks ({tasks.length})
          </button>
          <button className="btn btn-secondary" onClick={() => setShowGenerateModal(true)} style={{ fontSize: 13, fontWeight: 700 }}>➕ Generate Claim</button>
        </div>
      </div>

      {/* ERA Panel */}
      {showERA && (
        <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#166534', marginBottom: 10 }}>💡 ERA Auto-Posting Activity</div>
          {eraPostedClaims.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No ERA activity yet.</div>
          ) : (
            eraPostedClaims.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid #dcfce7', fontSize: 12 }}>
                <span style={{ color: '#059669', fontWeight: 700 }}>✅</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{c.claim_number}</span>
                <span>{c.insurance_name}</span>
                <span style={{ color: 'var(--text-muted)' }}>ERA posted {fmtDate(c.paid_date)}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#059669' }}>{fmt$(c.insurance_payment)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Quick Action Bar */}
      <QuickActionBar
        readyCount={eligibleForSubmission.length}
        onSubmitAll={() => {
          if (eligibleForSubmission.length === 0) return;
          const today = '2026-05-23';
          setClaims(prev => prev.map(c => c.status === 'Generated' ? { ...c, status: 'Submitted', submitted_date: today, submission_method: 'EDI' } : c));
          showToast(eligibleForSubmission.length + ' claim(s) submitted via EDI.');
        }}
        onCheckEligibility={() => showToast('Batch eligibility check initiated for ' + filteredClaims.length + ' claim(s). Results in 30s.')}
        onScrubAll={() => showToast('Batch scrubber complete — ' + filteredClaims.filter(c => c.scrubber_warnings && c.scrubber_warnings.length > 0).length + ' claim(s) with warnings.')}
        onExport={() => showToast('Claims worklist exported to CSV.')}
        onBatchStatements={() => setShowStatements(true)}
      />

      {/* Eligibility Alerts */}
      <div id="elig-alerts-panel">
        <EligibilityAlerts alerts={eligAlerts} onDismiss={i => setEligAlerts(prev => prev.filter((_, idx) => idx !== i))} showToast={showToast} />
      </div>

      {/* Patient Balance Summary */}
      {showPatientBalance && <PatientBalanceSummary balances={patientBalances} onClose={() => setShowPatientBalance(false)} />}

      {/* AR Aging Report */}
      {showARaging && <ARAgingReport claims={claims} onClose={() => setShowARaging(false)} />}

      {/* Biller Productivity Metrics */}
      {showBillerMetrics && <BillerMetrics claims={claims} onClose={() => setShowBillerMetrics(false)} />}

      {/* Payer Eligibility Rules */}
      {showPayerElig && <PayerEligibilityPanel onClose={() => setShowPayerElig(false)} />}

      {/* Denial Pattern Insights */}
      {showDenialPatterns && <DenialPatternPanel claims={claims} onClose={() => setShowDenialPatterns(false)} />}

      {/* SLA Task Queue */}
      {showSLATasks && <SLATaskPanel tasks={tasks} claims={claims} onClose={() => setShowSLATasks(false)} showToast={showToast} onTaskDone={handleTaskDone} />}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total Claims', value: stats.total, accent: '#6366f1' },
          { label: 'Ready to Submit', value: stats.generated, accent: '#6b7280', sub: 'Generated' },
          { label: 'Submitted', value: stats.submitted, accent: '#3b82f6' },
          { label: 'Paid', value: stats.paid, accent: '#10b981' },
          { label: 'Denied', value: stats.denied, accent: '#ef4444' },
          { label: 'Follow-Up', value: stats.followUp, accent: '#f59e0b', sub: 'Need action' },
          { label: 'Total Billed', value: fmt$(stats.totalCharges), accent: '#8b5cf6' },
          { label: 'Collected', value: fmt$(stats.totalPaid), accent: '#10b981' },
          { label: 'Outstanding', value: fmt$(stats.totalBalance), accent: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', borderLeft: '4px solid ' + s.accent }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* RCM Search + Filters */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(4, auto) auto', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>🔍 RCM Search</div>
            <input className="form-input" placeholder="Claim #, patient, CPT, payer, denial reason…" value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: 13 }} />
          </div>
          <div>
            <label className="form-label">Patient</label>
            <select value={filters.patientId} onChange={e => setFilters(p => ({ ...p, patientId: e.target.value }))} className="form-input" style={{ fontSize: 12 }}>
              <option value="">All Patients</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Status</label>
            <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} className="form-input" style={{ fontSize: 12 }}>
              <option value="">All</option>
              {['Generated','Submitted','Processed','Paid','Denied','Appealed','Voided'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">From</label>
            <input type="date" value={filters.dateFrom} onChange={e => setFilters(p => ({ ...p, dateFrom: e.target.value }))} className="form-input" style={{ fontSize: 12 }} />
          </div>
          <div>
            <label className="form-label">To</label>
            <input type="date" value={filters.dateTo} onChange={e => setFilters(p => ({ ...p, dateTo: e.target.value }))} className="form-input" style={{ fontSize: 12 }} />
          </div>
          <button onClick={() => { setFilters({ patientId: '', status: '', dateFrom: '', dateTo: '' }); setSearch(''); }} className="btn btn-secondary" style={{ height: 38, fontSize: 12 }} disabled={!hasActiveFilters}>Clear</button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedClaims.length > 0 && (
        <div style={{ background: '#1e40af', color: '#fff', borderRadius: 10, padding: '10px 16px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{selectedClaims.length} claim(s) selected</span>
          <button onClick={handleSubmit} style={{ padding: '5px 14px', borderRadius: 7, background: '#059669', border: 'none', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>📤 Submit via EDI</button>
          <button onClick={handleRebill} style={{ padding: '5px 14px', borderRadius: 7, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>🔄 Rebill</button>
          <button onClick={handleVoid} style={{ padding: '5px 14px', borderRadius: 7, background: '#dc2626', border: 'none', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>🚫 Void</button>
          <button onClick={() => setSelectedClaims([])} style={{ padding: '5px 10px', borderRadius: 7, background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginLeft: 'auto' }}>✕ Clear</button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Claims ({filteredClaims.length})</div>
            {hasActiveFilters && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Filtered results</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', borderRadius: 7, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <button onClick={() => setSortBy('default')} style={{ fontSize: 11, padding: '5px 12px', border: 'none', background: sortBy === 'default' ? '#1d4ed8' : '#fff', color: sortBy === 'default' ? '#fff' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer' }}>Default</button>
              <button onClick={() => setSortBy('priority')} style={{ fontSize: 11, padding: '5px 12px', border: 'none', borderLeft: '1px solid var(--border)', background: sortBy === 'priority' ? '#dc2626' : '#fff', color: sortBy === 'priority' ? '#fff' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer' }}>🎯 Priority Queue</button>
            </div>
            {eligibleForSubmission.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={selectedClaims.length === eligibleForSubmission.length && eligibleForSubmission.length > 0}
                  ref={el => { if (el) el.indeterminate = selectedClaims.length > 0 && selectedClaims.length < eligibleForSubmission.length; }}
                  onChange={e => handleSelectAll(e.target.checked)} />
                <label style={{ margin: 0, cursor: 'pointer' }}>Select All Ready ({eligibleForSubmission.length})</label>
              </div>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', background: '#f8fafc' }}>
                <th style={{ padding: '10px 10px', width: 36 }}></th>
                {['Claim #', 'Patient', 'Payer', 'Service Date', 'Age', 'CPT Codes', 'Charges', 'Expected', 'Balance', 'Score', 'Risk', 'Status', 'Method', 'PCN', '⚑', 'Priority', 'Assigned', 'SLA', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 10px', textAlign: h === '⚑' ? 'center' : ['Charges','Expected','Balance'].includes(h) ? 'right' : 'left', fontWeight: 700, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredClaims.length === 0 ? (
                <tr><td colSpan={20} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32 }}>📭</div>
                  <p style={{ margin: '8px 0 0' }}>No claims found{hasActiveFilters ? ' matching your filters' : ''}.</p>
                </td></tr>
              ) : sortedFilteredClaims.map((claim, i) => {
                const isSelected = selectedClaims.includes(claim.id);
                const ss = STATUS_STYLE[claim.status] || STATUS_STYLE.Generated; // eslint-disable-line no-unused-vars
                const age = claimAge(claim.generated_date);
                const isOld = age !== null && age > 45;
                const rowBg = isSelected ? '#eff6ff' : claim.status === 'Denied' ? '#fff7f7' : claim.status === 'Generated' ? '#fffbeb' : (i % 2 === 1 ? '#fafafa' : '#fff');
                return (
                  <tr key={claim.id} style={{ borderBottom: '1px solid var(--border)', background: rowBg, transition: 'background 0.1s' }}>
                    <td style={{ padding: '10px 10px' }}>
                      <input type="checkbox" checked={isSelected} onChange={e => handleSelectClaim(claim.id, e.target.checked)} disabled={claim.status !== 'Generated'} />
                    </td>
                    <td style={{ padding: '10px 10px', fontWeight: 700, fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => setViewClaim(claim)}>
                      {claim.claim_number}
                      <ScrubberBadge warnings={claim.scrubber_warnings} />
                    </td>
                    <td style={{ padding: '10px 10px', cursor: 'pointer' }} onClick={() => setViewClaim(claim)}>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{claim.first_name} {claim.last_name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{claim.mrn}</div>
                    </td>
                    <td style={{ padding: '10px 10px', cursor: 'pointer' }} onClick={() => setViewClaim(claim)}>
                      <PayerLogo payer={claim.insurance_name} />
                    </td>
                    <td style={{ padding: '10px 10px', fontSize: 11, cursor: 'pointer' }} onClick={() => setViewClaim(claim)}>
                      {fmtDate(claim.service_date)}
                    </td>
                    <td style={{ padding: '10px 10px', cursor: 'pointer' }} onClick={() => setViewClaim(claim)}>
                      {age !== null ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: isOld ? '#dc2626' : '#374151' }}>
                          {age}d
                          {isOld && <span style={{ fontSize: 9, color: '#dc2626', display: 'block' }}>AGED</span>}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 10px', cursor: 'pointer' }} onClick={() => setViewClaim(claim)}>
                      <CptCell cptCodes={claim.cpt_codes} />
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, cursor: 'pointer' }} onClick={() => setViewClaim(claim)}>
                      {fmt$(claim.total_charges)}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#059669', fontWeight: 600, cursor: 'pointer' }} onClick={() => setViewClaim(claim)}>
                      {fmt$(claim.expected_reimbursement || calcExpected(claim.cpt_codes.map(c => c.code), claim.insurance_name))}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: claim.balance > 0 ? '#dc2626' : '#10b981', cursor: 'pointer' }} onClick={() => setViewClaim(claim)}>
                      {fmt$(claim.balance)}
                    </td>
                    <td style={{ padding: '10px 10px', cursor: 'pointer' }} onClick={() => setViewClaim(claim)}>
                      <SuperbillScore claim={claim} />
                    </td>
                    <td style={{ padding: '10px 10px', cursor: 'pointer' }} onClick={() => setViewClaim(claim)}>
                      <DenialRiskBadge claim={claim} />
                    </td>
                    <td style={{ padding: '10px 10px', cursor: 'pointer' }} onClick={() => setViewClaim(claim)}>
                      <StatusBadge status={claim.status} />
                    </td>
                    <td style={{ padding: '10px 10px', cursor: 'pointer' }} onClick={() => setViewClaim(claim)}>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: claim.submission_method === 'EDI' ? '#dbeafe' : claim.submission_method === 'Portal' ? '#f3e8ff' : '#f3f4f6', color: claim.submission_method === 'EDI' ? '#1d4ed8' : claim.submission_method === 'Portal' ? '#6d28d9' : '#6b7280', fontWeight: 700 }}>
                        {claim.submission_method || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 10px', fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setViewClaim(claim)}>
                      {claim.payer_control_number ? claim.payer_control_number.slice(0, 16) : '—'}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                      {claim.follow_up_needed && (
                        <span title={claim.follow_up_note || 'Follow-up required'} style={{ fontSize: 14, cursor: 'help' }}>🔔</span>
                      )}
                    </td>
                    {/* Priority */}
                    <td style={{ padding: '10px 10px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setViewClaim(claim)}>
                      <PriorityBadge score={calcPriorityScore(claim)} rank={sortBy === 'priority' ? i + 1 : null} />
                    </td>
                    {/* Assigned */}
                    <td style={{ padding: '10px 10px', cursor: 'pointer' }} onClick={() => setViewClaim(claim)}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{claim.assigned_to || 'Unassigned'}</span>
                    </td>
                    {/* SLA */}
                    <td style={{ padding: '10px 10px', cursor: 'pointer' }} onClick={() => setViewClaim(claim)}>
                      {(() => {
                        const t = tasks.find(tk => tk.claimId === claim.id);
                        if (!t) return <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>—</span>;
                        const d = Math.ceil((new Date(t.due + 'T12:00:00') - new Date('2026-05-23T12:00:00')) / 86400000);
                        const sl = d < 0 ? { bg: '#fee2e2', color: '#dc2626', label: '🔴 OVR' } : d <= 2 ? { bg: '#fff7ed', color: '#c2410c', label: '🟡 SOON' } : { bg: '#f0fdf4', color: '#166534', label: '🟢 OK' };
                        return <span title={t.type + ' · due ' + t.due + ' · ' + t.assignee} style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: sl.bg, color: sl.color, border: '1px solid ' + sl.color + '44', cursor: 'help', whiteSpace: 'nowrap' }}>{sl.label}</span>;
                      })()}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '10px 10px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button onClick={() => setViewClaim(claim)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)' }}>View</button>
                        <FixRiskActions claim={claim} setClaims={setClaims} showToast={showToast} />
                        {claim.status === 'Generated' && (
                          <button onClick={() => { setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, status: 'Submitted', submitted_date: '2026-05-23' } : c)); showToast(claim.claim_number + ' submitted.'); }}
                            style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: 'none', background: '#1d4ed8', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                            📤
                          </button>
                        )}
                        {claim.status === 'Denied' && (
                          <button onClick={() => setAppealClaim(claim)}
                            style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: 'none', background: '#7c3aed', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                            ✍️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showGenerateModal && <GenerateClaimModal onClose={() => setShowGenerateModal(false)} onGenerate={handleGenerate} patients={patients} billedEncounterIds={billedEncounterIds} />}
      {viewClaim && <ClaimDetailModal claim={viewClaim} onClose={() => setViewClaim(null)} onAppeal={c => { setViewClaim(null); setAppealClaim(c); }} />}
      {appealClaim && <AppealModal claim={appealClaim} onClose={() => setAppealClaim(null)} onSubmit={handleAppealSubmit} />}
      {showStatements && <BatchStatementModal balances={patientBalances} onClose={() => setShowStatements(false)} showToast={showToast} />}
    </div>
  );
}
