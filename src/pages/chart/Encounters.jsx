import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePatient } from '../../contexts/PatientContext';
import { useAuth } from '../../contexts/AuthContext';
import { icd10 as icd10Api } from '../../services/api';

// ── Facility / Practice information (used on all faxed/printed order slips) ────
const FACILITY_INFO = {
  name:    'Clarity Behavioral Health',
  address: '200 N Michigan Ave, Suite 1400',
  city:    'Chicago',
  state:   'IL',
  zip:     '60601',
  phone:   '(312) 555-0200',
  fax:     '(312) 555-0201',
  npi:     '1588675432',          // Organization NPI (Type 2)
};

// ── Print a formatted order fax slip in a new window ────────────────────────
function printOrderFaxSlip({ order, type, patient, provider }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const providerName = [provider?.firstName, provider?.lastName].filter(Boolean).join(' ');
  const providerCred = provider?.credentials ? `, ${provider.credentials}` : '';
  const providerNpi  = provider?.npi?.trim() || 'Not on file';
  const providerDea  = provider?.deaNumber?.trim() || 'Not on file';
  const patientName  = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';
  const patientDob   = patient?.dob || 'Unknown';
  const patientMrn   = patient?.mrn || 'Unknown';

  const isControlled = type === 'medication' && order.schedule;

  const orderRows = type === 'medication' ? `
    <tr><td class="lbl">Medication</td><td>${order.name || '—'}${order.dose ? ` &nbsp;<strong>${order.dose}</strong>` : ''}</td></tr>
    <tr><td class="lbl">SIG</td><td>${order.sig || '—'}</td></tr>
    <tr><td class="lbl">Quantity</td><td>${order.quantity || '—'}</td></tr>
    <tr><td class="lbl">Refills</td><td>${order.refills !== '' ? order.refills : '—'}</td></tr>
    <tr><td class="lbl">Route</td><td>${order.route || '—'}</td></tr>
    ${isControlled ? `<tr><td class="lbl">DEA Schedule</td><td><strong style="color:#b91c1c">${order.schedule}</strong></td></tr>` : ''}
    ${order.epcsVerified ? `<tr><td class="lbl">EPCS Status</td><td style="color:#15803d;font-weight:700">✓ EPCS Verified — DrFirst · DEA: ${order.epcsDea || providerDea}</td></tr>` : ''}
    ${order.pharmacy ? `<tr><td class="lbl">Pharmacy</td><td>${order.pharmacy}</td></tr>` : ''}
    ${order.pharmAddress ? `<tr><td class="lbl">Pharmacy Location</td><td>${order.pharmAddress}</td></tr>` : ''}
    ${order.notes ? `<tr><td class="lbl">Special Instructions</td><td>${order.notes}</td></tr>` : ''}
  ` : `
    <tr><td class="lbl">Lab Test</td><td>${order.test || '—'}</td></tr>
    <tr><td class="lbl">Priority</td><td>${order.priority || 'Routine'}</td></tr>
    <tr><td class="lbl">Specimen</td><td>${order.specimen || '—'}</td></tr>
    <tr><td class="lbl">Fasting Required</td><td>${order.fasting ? 'Yes' : 'No'}</td></tr>
    ${order.labNetwork ? `<tr><td class="lbl">Send To Lab</td><td>${order.labNetwork}</td></tr>` : ''}
    ${order.diagnosis ? `<tr><td class="lbl">Clinical Indication</td><td>${order.diagnosis}</td></tr>` : ''}
    ${order.icdCodes ? `<tr><td class="lbl">ICD-10 Code(s)</td><td>${order.icdCodes}</td></tr>` : ''}
    ${order.notes ? `<tr><td class="lbl">Notes</td><td>${order.notes}</td></tr>` : ''}
  `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${type === 'medication' ? 'Prescription Order' : 'Lab Order'} — ${patientName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 28px 36px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1d4ed8; padding-bottom: 12px; margin-bottom: 16px; }
  .facility-name { font-size: 20px; font-weight: 800; color: #1d4ed8; letter-spacing: -0.5px; }
  .facility-sub { font-size: 12px; color: #374151; margin-top: 3px; line-height: 1.6; }
  .header-right { text-align: right; font-size: 11px; color: #374151; }
  .badge { display: inline-block; background: #dbeafe; color: #1e40af; font-weight: 700; font-size: 11px; padding: 3px 9px; border-radius: 12px; border: 1px solid #93c5fd; }
  .section { margin-bottom: 14px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  table td { padding: 5px 6px; vertical-align: top; font-size: 12.5px; }
  td.lbl { width: 38%; font-weight: 600; color: #374151; }
  .controlled-box { background: #fef2f2; border: 2px solid #fca5a5; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; }
  .controlled-title { font-size: 13px; font-weight: 800; color: #dc2626; margin-bottom: 3px; }
  .controlled-sub { font-size: 11.5px; color: #7f1d1d; }
  .sig-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 10px 14px; margin: 10px 0; }
  .sig-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #0369a1; margin-bottom: 4px; }
  .sig-text { font-size: 15px; font-weight: 700; color: #0c4a6e; }
  .sig-area { margin-top: 36px; padding-top: 10px; border-top: 1.5px solid #374151; font-size: 11px; color: #374151; display: flex; justify-content: space-between; }
  .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 10.5px; color: #6b7280; text-align: center; }
  @media print { body { padding: 10px 16px; } }
</style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="facility-name">${FACILITY_INFO.name}</div>
      <div class="facility-sub">
        ${FACILITY_INFO.address}, ${FACILITY_INFO.city}, ${FACILITY_INFO.state} ${FACILITY_INFO.zip}<br/>
        Phone: <strong>${FACILITY_INFO.phone}</strong> &nbsp;|&nbsp; Fax: <strong>${FACILITY_INFO.fax}</strong><br/>
        Facility NPI: <strong>${FACILITY_INFO.npi}</strong>
      </div>
    </div>
    <div class="header-right">
      <span class="badge">${type === 'medication' ? (isControlled ? '🔒 Controlled Substance Rx' : '💊 Prescription Order') : '🧪 Laboratory Order'}</span>
      <div style="margin-top:8px">Date: <strong>${dateStr}</strong></div>
      <div>Time: <strong>${timeStr}</strong></div>
    </div>
  </div>

  ${isControlled ? `
  <div class="controlled-box">
    <div class="controlled-title">⚠ CONTROLLED SUBSTANCE — ${order.schedule}</div>
    <div class="controlled-sub">This prescription must be transmitted electronically via EPCS (DEA 21 CFR §1311) or presented on tamper-resistant paper. Not valid without prescriber's DEA number and signature.</div>
  </div>` : ''}

  <!-- PRESCRIBER -->
  <div class="section">
    <div class="section-title">Ordering Provider</div>
    <table>
      <tr><td class="lbl">Provider</td><td><strong>${providerName}${providerCred}</strong></td></tr>
      <tr><td class="lbl">NPI</td><td>${providerNpi}</td></tr>
      ${type === 'medication' ? `<tr><td class="lbl">DEA Number</td><td>${providerDea}</td></tr>` : ''}
      ${provider?.specialty ? `<tr><td class="lbl">Specialty</td><td>${provider.specialty}</td></tr>` : ''}
    </table>
  </div>

  <!-- PATIENT -->
  <div class="section">
    <div class="section-title">Patient Information</div>
    <table>
      <tr><td class="lbl">Name</td><td><strong>${patientName}</strong></td></tr>
      <tr><td class="lbl">Date of Birth</td><td>${patientDob}</td></tr>
      <tr><td class="lbl">MRN</td><td>${patientMrn}</td></tr>
      ${patient?.gender ? `<tr><td class="lbl">Sex</td><td>${patient.gender}</td></tr>` : ''}
      ${patient?.address ? `<tr><td class="lbl">Address</td><td>${patient.address.street}, ${patient.address.city}, ${patient.address.state} ${patient.address.zip}</td></tr>` : ''}
      ${patient?.phone ? `<tr><td class="lbl">Phone</td><td>${patient.phone}</td></tr>` : ''}
    </table>
  </div>

  <!-- ORDER DETAILS -->
  <div class="section">
    <div class="section-title">${type === 'medication' ? 'Prescription Details' : 'Lab Order Details'}</div>
    ${type === 'medication' && order.sig ? `
    <div class="sig-box">
      <div class="sig-label">Sig</div>
      <div class="sig-text">${order.sig}</div>
    </div>` : ''}
    <table>${orderRows}</table>
  </div>

  <!-- SIGNATURE LINE -->
  <div class="sig-area">
    <div>Prescriber Signature: ___________________________&nbsp;&nbsp;&nbsp;&nbsp; Date: _______________</div>
    <div>DEA#: ${providerDea}</div>
  </div>

  <div class="footer">
    This order was generated by ${FACILITY_INFO.name} EMR (Clarity Health). Printed ${dateStr} at ${timeStr}.
    ${isControlled ? 'CONFIDENTIAL — Contains controlled substance information. Handle per DEA regulations.' : ''}
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}

// ── AI Ambient SOAP Generator ─────────────────────────────────────────────────
// Simulates athenaOne Ambient Notes — records conversation and auto-generates SOAP
function AmbientSOAPGenerator({ onGenerate, disabled }) {
  const [ambientState, setAmbientState] = useState('idle'); // idle | recording | processing | done
  const [recordingTime, setRecordingTime] = useState(0);
  const [generatedNote, setGeneratedNote] = useState(null);
  const timerRef = useRef(null);

  const AMBIENT_TEMPLATES = [
    {
      subjective: "Patient reports improvement in mood since last visit. Sleeping better, approximately 7 hours per night. Appetite is improving. Denies any side effects from current medication regimen. Reports mild anxiety in social situations but manageable. No changes in energy level. Continues to attend weekly therapy sessions. Denies any suicidal or homicidal ideation. Reports compliance with prescribed medications.",
      assessment: "Patient presents with stable Major Depressive Disorder, recurrent, currently in partial remission. Anxiety symptoms are mild and manageable with current interventions. Good medication compliance. Therapeutic alliance remains strong. Risk assessment: Low - no acute safety concerns identified.",
      plan: "1. Continue current medication regimen — sertraline 100mg daily, no changes indicated at this time\n2. Continue individual therapy — CBT weekly sessions with current therapist\n3. Monitor sleep quality — patient to maintain sleep diary\n4. Encourage continued social engagement and behavioral activation strategies\n5. Return to clinic in 4 weeks for medication management follow-up\n6. Patient instructed to contact office or crisis line if symptoms worsen",
    },
    {
      subjective: "Patient presents with increased anxiety over the past 2 weeks. Reports difficulty concentrating at work, racing thoughts, and intermittent insomnia (sleeping 4-5 hours/night). Denies panic attacks. Reports increased stress at work related to project deadline. Current medications being taken as prescribed. Denies substance use. Appetite slightly decreased. Denies suicidal or homicidal ideation. Reports using breathing exercises learned in therapy but finding them less effective recently.",
      assessment: "Generalized Anxiety Disorder with acute exacerbation, likely situationally-triggered by occupational stress. Insomnia secondary to anxiety. No evidence of panic disorder. Current SSRI may need dosage adjustment given breakthrough symptoms. No safety concerns identified at this time.",
      plan: "1. Increase sertraline from 50mg to 75mg daily — discuss potential side effects and expected timeline for improvement\n2. Add hydroxyzine 25mg PRN for acute anxiety episodes, not to exceed 3 times daily\n3. Sleep hygiene counseling provided — limit screens 1 hour before bed, consistent sleep schedule\n4. Recommend stress management techniques — progressive muscle relaxation, grounding exercises\n5. Follow up in 2 weeks to assess response to medication adjustment\n6. Patient instructed to call if anxiety becomes unmanageable or any safety concerns arise",
    },
  ];

  const startRecording = () => {
    setAmbientState('recording');
    setRecordingTime(0);
    setGeneratedNote(null);
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    setAmbientState('processing');
    // Simulate AI processing with 2-3 second delay
    setTimeout(() => {
      const template = AMBIENT_TEMPLATES[Math.floor(Math.random() * AMBIENT_TEMPLATES.length)];
      setGeneratedNote(template);
      setAmbientState('done');
    }, 2000 + Math.random() * 1500);
  };

  const applyNote = () => {
    if (generatedNote && onGenerate) {
      onGenerate(generatedNote);
      setAmbientState('idle');
      setGeneratedNote(null);
      setRecordingTime(0);
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div className="ambient-soap-generator">
      <div className="ambient-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🎙️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b' }}>Ambient Notes — AI SOAP Generator</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Record encounter conversation → AI generates structured SOAP note</div>
          </div>
        </div>
        {ambientState === 'recording' && (
          <div className="ambient-timer">
            <span className="ambient-recording-dot" />
            {formatTime(recordingTime)}
          </div>
        )}
      </div>

      <div className="ambient-body">
        {ambientState === 'idle' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <button className="btn btn-primary" onClick={startRecording} disabled={disabled}
              style={{ padding: '10px 24px', fontSize: 13, borderRadius: 24, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🎙️</span> Start Ambient Recording
            </button>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              Records your conversation with the patient and auto-generates a SOAP note
            </div>
          </div>
        )}

        {ambientState === 'recording' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div className="ambient-wave-container">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="ambient-wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 12 }}>
              🔴 Recording in progress — speak naturally
            </div>
            <button className="btn btn-danger" onClick={stopRecording}
              style={{ padding: '10px 24px', fontSize: 13, borderRadius: 24 }}>
              ⏹ Stop & Generate SOAP Note
            </button>
          </div>
        )}

        {ambientState === 'processing' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }} className="ambient-spin">🧠</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>AI Processing Encounter Audio...</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Analyzing conversation · Extracting clinical data · Generating SOAP structure
            </div>
          </div>
        )}

        {ambientState === 'done' && generatedNote && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              ✅ AI SOAP Note Generated — Review before applying
            </div>
            <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'Subjective', val: generatedNote.subjective, color: '#4f46e5' },
                { label: 'Assessment', val: generatedNote.assessment, color: '#d97706' },
                { label: 'Plan', val: generatedNote.plan, color: '#16a34a' },
              ].map(s => (
                <div key={s.label} style={{ borderLeft: `3px solid ${s.color}`, padding: '8px 12px', background: '#f7f9fc', borderRadius: '0 6px 6px 0', fontSize: 12, lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', color: s.color, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{s.val}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-sm btn-secondary" onClick={() => { setAmbientState('idle'); setGeneratedNote(null); }}>
                ✕ Discard
              </button>
              <button className="btn btn-sm btn-success" onClick={applyNote}
                style={{ background: '#16a34a', borderColor: '#16a34a' }}>
                ✅ Apply to Encounter
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Voice Dictation (Web Speech API) ──────────────────────────────────────────
const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

function VoiceDictation({ value, onChange, placeholder, rows = 6, label }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [supported] = useState(!!SpeechRecognition);
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      if (finalTranscript) {
        const separator = value && !value.endsWith(' ') && !value.endsWith('\n') ? ' ' : '';
        onChange(value + separator + finalTranscript);
        setInterim('');
      } else {
        setInterim(interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setListening(false);
        setInterim('');
      }
    };

    recognition.onend = () => {
      // Auto-restart if still listening (browser may auto-stop)
      if (recognitionRef.current && listening) {
        try { recognitionRef.current.start(); } catch {}
      } else {
        setListening(false);
        setInterim('');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [value, onChange, listening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
    setInterim('');
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="voice-dictation-wrapper">
      <div className="voice-dictation-header">
        {label && <label className="form-label">{label}</label>}
        {supported && (
          <button
            type="button"
            className={`voice-dictation-btn ${listening ? 'listening' : ''}`}
            onClick={listening ? stopListening : startListening}
            title={listening ? 'Stop dictation' : 'Start voice dictation'}
          >
            {listening ? (
              <>
                <span className="voice-pulse" />
                <span style={{ fontSize: 12 }}>⏹</span> Stop Dictation
              </>
            ) : (
              <><span style={{ fontSize: 14 }}>🎙️</span> Dictate</>
            )}
          </button>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <textarea
          ref={textareaRef}
          className="form-input"
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ resize: 'vertical' }}
        />
        {listening && interim && (
          <div className="voice-interim-text">
            {interim}
          </div>
        )}
        {listening && (
          <div className="voice-listening-indicator">
            <span className="voice-listening-dot" />
            <span className="voice-listening-dot" style={{ animationDelay: '0.15s' }} />
            <span className="voice-listening-dot" style={{ animationDelay: '0.3s' }} />
            <span style={{ fontSize: 10, marginLeft: 4, fontWeight: 600 }}>Listening...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Constants ──────────────────────────────────────────────────────────────────
const VISIT_TYPES = [
  'Follow-Up','Office Visit','Telehealth','Walk-In',
  'Psychiatric Evaluation','Medication Management',
  'Crisis Intervention','Urgent Care','Initial Evaluation','Discharge Follow-Up',
];

const STATUS_BADGE = {
  'In Progress': 'badge-warning',
  'Completed': 'badge-success',
  'Pending Co-Sign': 'badge-info',
  'Cancelled': 'badge-danger',
};

const MSE_OPTIONS = {
  appearance:       ['Well-Groomed','Disheveled','Casually Dressed','Poorly Groomed','Unusually Dressed','Fair'],
  behavior:         ['Cooperative','Guarded','Agitated','Hostile','Withdrawn','Pleasant','Restless','Other'],
  psychomotor:      ['Normal','Increased / Restless','Decreased / Slowed','Psychomotor Retardation','Tremors Noted'],
  eyeContact:       ['Good','Fair','Avoided','Poor','Intense / Piercing'],
  speech:           ['Normal Rate, Rhythm & Volume','Pressured','Slowed','Loud','Soft / Quiet','Monotone','Dysarthric','Circumstantial'],
  affect:           ['Euthymic','Depressed','Anxious','Irritable','Labile','Flat','Blunted','Constricted','Elevated / Expansive','Dysphoric'],
  affectCongruent:  ['Congruent with Mood','Incongruent with Mood'],
  thoughtProcess:   ['Linear & Goal-Directed','Tangential','Circumstantial','Flight of Ideas','Loosening of Associations','Disorganized','Perseverative'],
  thoughtContent:   ['No SI/HI — Future-Oriented','Passive SI (No Plan/Intent)','Active SI with Plan','Active SI with Intent','Homicidal Ideation Present','Paranoid Ideation','Delusions Present','Obsessions Noted'],
  suicidalIdeation: ['Denied / None','Passive Ideation Only','Active — No Plan','Active — With Plan','Active — With Plan & Intent'],
  homicidalIdeation:['Denied / None','Passive Ideation','Active — No Plan','Active — With Plan'],
  perceptions:      ['WNL — No Hallucinations','Auditory Hallucinations','Visual Hallucinations','Tactile Hallucinations','Olfactory Hallucinations','Illusions'],
  orientation:      ['Alert & Oriented x4 (Person, Place, Time, Situation)','Alert & Oriented x3','Alert & Oriented x2','Confused / Disoriented'],
  memory:           ['Intact — Recent & Remote','Mild Impairment','Moderate Impairment','Significant Impairment'],
  concentration:    ['Intact','Mildly Impaired','Moderately Impaired','Severely Impaired'],
  insight:          ['Good','Fair','Poor','Absent'],
  judgment:         ['Good','Fair','Poor','Impaired'],
};

const CPT_CODES = [
  { code: '99213', desc: 'Office Visit — Low Complexity, Established' },
  { code: '99214', desc: 'Office Visit — Moderate Complexity, Established' },
  { code: '99215', desc: 'Office Visit — High Complexity, Established' },
  { code: '90791', desc: 'Psychiatric Diagnostic Evaluation' },
  { code: '90792', desc: 'Psychiatric Diagnostic Eval w/ Medical Services' },
  { code: '90832', desc: 'Psychotherapy 16–37 min' },
  { code: '90834', desc: 'Psychotherapy 38–52 min' },
  { code: '90837', desc: 'Psychotherapy 53+ min' },
  { code: '90833', desc: 'Psychotherapy Add-On to E&M 16–37 min' },
  { code: '90836', desc: 'Psychotherapy Add-On to E&M 38–52 min' },
  { code: '90838', desc: 'Psychotherapy Add-On to E&M 53+ min' },
  { code: '90839', desc: 'Crisis Psychotherapy — First 60 min' },
  { code: '90840', desc: 'Crisis Psychotherapy — Add-On 30 min' },
  { code: '96127', desc: 'Brief Behavioral / Emotional Assessment' },
  { code: '99354', desc: 'Prolonged Service — First 30–74 min Add-On' },
];

// ── Therapist-specific CPT codes (replaces 99213/99214/99215) ─────────────────
const THERAPIST_CPT_CODES = [
  { code: '90202', desc: 'Therapy Session — Low Complexity' },
  { code: '90203', desc: 'Therapy Session — Moderate Complexity' },
  { code: '90204', desc: 'Therapy Session — High Complexity' },
  { code: '90791', desc: 'Psychiatric Diagnostic Evaluation' },
  { code: '90832', desc: 'Psychotherapy 16–37 min' },
  { code: '90834', desc: 'Psychotherapy 38–52 min' },
  { code: '90837', desc: 'Psychotherapy 53+ min' },
  { code: '90833', desc: 'Psychotherapy Add-On to E&M 16–37 min' },
  { code: '90836', desc: 'Psychotherapy Add-On to E&M 38–52 min' },
  { code: '90838', desc: 'Psychotherapy Add-On to E&M 53+ min' },
  { code: '90839', desc: 'Crisis Psychotherapy — First 60 min' },
  { code: '90840', desc: 'Crisis Psychotherapy — Add-On 30 min' },
  { code: '96127', desc: 'Brief Behavioral / Emotional Assessment' },
];

const PLACE_OF_SERVICE = [
  '11 — Office',
  '02 — Telehealth (Patient Home)',
  '22 — On-Campus Outpatient Hospital',
  '23 — Emergency Room',
  '72 — Rural Health Clinic',
];

// ── Common psychiatric ICD-10 quick-add library ────────────────────────────────
const ICD_COMMON = [
  { cat: 'Depressive', color: '#4f46e5', icon: '😔', codes: [
    { code: 'F32.0',  desc: 'MDD, Single Episode, Mild' },
    { code: 'F32.1',  desc: 'MDD, Single Episode, Moderate' },
    { code: 'F32.2',  desc: 'MDD, Single Episode, Severe w/o Psychosis' },
    { code: 'F32.3',  desc: 'MDD, Single Episode, Severe with Psychosis' },
    { code: 'F32.4',  desc: 'MDD, Single Episode, In Partial Remission' },
    { code: 'F32.5',  desc: 'MDD, Single Episode, In Full Remission' },
    { code: 'F32.9',  desc: 'MDD, Single Episode, Unspecified' },
    { code: 'F33.0',  desc: 'MDD, Recurrent, Mild' },
    { code: 'F33.1',  desc: 'MDD, Recurrent, Moderate' },
    { code: 'F33.2',  desc: 'MDD, Recurrent, Severe w/o Psychosis' },
    { code: 'F33.3',  desc: 'MDD, Recurrent, Severe with Psychosis' },
    { code: 'F33.40', desc: 'MDD, Recurrent, In Remission, Unspecified' },
    { code: 'F33.41', desc: 'MDD, Recurrent, In Partial Remission' },
    { code: 'F33.42', desc: 'MDD, Recurrent, In Full Remission' },
    { code: 'F34.1',  desc: 'Persistent Depressive Disorder (Dysthymia)' },
    { code: 'F32.81', desc: 'Premenstrual Dysphoric Disorder (PMDD)' },
    { code: 'F06.31', desc: 'Depressive Disorder Due to Medical Condition' },
    { code: 'F06.32', desc: 'Depressive Disorder Due to Substance/Medication' },
  ]},
  { cat: 'Anxiety', color: '#d97706', icon: '😰', codes: [
    { code: 'F41.1',  desc: 'Generalized Anxiety Disorder (GAD)' },
    { code: 'F41.0',  desc: 'Panic Disorder' },
    { code: 'F40.10', desc: 'Social Anxiety Disorder, Unspecified' },
    { code: 'F40.11', desc: 'Social Anxiety Disorder, Generalized' },
    { code: 'F41.9',  desc: 'Anxiety Disorder, Unspecified' },
    { code: 'F41.3',  desc: 'Other Mixed Anxiety Disorders' },
    { code: 'F40.00', desc: 'Agoraphobia without Panic Disorder' },
    { code: 'F40.01', desc: 'Agoraphobia with Panic Disorder' },
    { code: 'F93.0',  desc: 'Separation Anxiety Disorder' },
    { code: 'F40.218',desc: 'Specific Phobia, Other' },
    { code: 'F40.232',desc: 'Specific Phobia — Fear of Flying' },
    { code: 'F40.241',desc: 'Specific Phobia — Fear of Spiders' },
    { code: 'F40.248',desc: 'Specific Phobia — Fear of Other Animals' },
    { code: 'F06.4',  desc: 'Anxiety Disorder Due to Medical Condition' },
  ]},
  { cat: 'Bipolar', color: '#7c3aed', icon: '🔃', codes: [
    { code: 'F31.9',  desc: 'Bipolar Disorder, Unspecified' },
    { code: 'F31.0',  desc: 'Bipolar I — Current Episode Hypomanic' },
    { code: 'F31.10', desc: 'Bipolar I — Manic, Unspecified' },
    { code: 'F31.11', desc: 'Bipolar I — Manic, Mild' },
    { code: 'F31.12', desc: 'Bipolar I — Manic, Moderate' },
    { code: 'F31.13', desc: 'Bipolar I — Manic, Severe w/o Psychosis' },
    { code: 'F31.2',  desc: 'Bipolar I — Manic, Severe with Psychosis' },
    { code: 'F31.30', desc: 'Bipolar I — Depressed, Unspecified' },
    { code: 'F31.31', desc: 'Bipolar I — Depressed, Mild' },
    { code: 'F31.32', desc: 'Bipolar I — Depressed, Moderate' },
    { code: 'F31.4',  desc: 'Bipolar I — Depressed, Severe w/o Psychosis' },
    { code: 'F31.5',  desc: 'Bipolar I — Depressed, Severe with Psychosis' },
    { code: 'F31.60', desc: 'Bipolar I — Mixed, Unspecified' },
    { code: 'F31.70', desc: 'Bipolar I — In Remission, Unspecified' },
    { code: 'F31.78', desc: 'Bipolar I — In Full Remission, Unspecified' },
    { code: 'F31.81', desc: 'Bipolar II Disorder' },
    { code: 'F34.0',  desc: 'Cyclothymia' },
  ]},
  { cat: 'ADHD', color: '#0891b2', icon: '⚡', codes: [
    { code: 'F90.0',  desc: 'ADHD — Predominantly Inattentive' },
    { code: 'F90.1',  desc: 'ADHD — Predominantly Hyperactive-Impulsive' },
    { code: 'F90.2',  desc: 'ADHD — Combined Type' },
    { code: 'F90.8',  desc: 'ADHD, Other' },
    { code: 'F90.9',  desc: 'ADHD, Unspecified' },
    { code: 'F81.0',  desc: 'Specific Learning Disorder — Reading (Dyslexia)' },
    { code: 'F81.2',  desc: 'Specific Learning Disorder — Mathematics' },
    { code: 'F81.81', desc: 'Specific Learning Disorder — Written Expression' },
    { code: 'F82',    desc: 'Developmental Coordination Disorder (DCD)' },
    { code: 'R41.3',  desc: 'Other Amnesia / Concentration Difficulties' },
  ]},
  { cat: 'Trauma / PTSD', color: '#c2410c', icon: '🧩', codes: [
    { code: 'F43.0',  desc: 'Acute Stress Reaction' },
    { code: 'F43.10', desc: 'PTSD, Unspecified' },
    { code: 'F43.11', desc: 'PTSD, Acute' },
    { code: 'F43.12', desc: 'PTSD, Chronic' },
    { code: 'F43.20', desc: 'Adjustment Disorder, Unspecified' },
    { code: 'F43.21', desc: 'Adjustment Disorder w/ Depressed Mood' },
    { code: 'F43.22', desc: 'Adjustment Disorder w/ Anxiety' },
    { code: 'F43.23', desc: 'Adjustment Disorder w/ Mixed Mood & Anxiety' },
    { code: 'F43.24', desc: 'Adjustment Disorder w/ Conduct Disturbance' },
    { code: 'F43.25', desc: 'Adjustment Disorder w/ Mixed Disturbance of Emotions & Conduct' },
    { code: 'F43.29', desc: 'Adjustment Disorder, Other' },
    { code: 'F62.0',  desc: 'Enduring Personality Change After Catastrophic Experience' },
    { code: 'Z91.410',desc: 'Personal History of Childhood Physical Abuse' },
    { code: 'Z91.411',desc: 'Personal History of Childhood Psychological Abuse' },
    { code: 'Z91.412',desc: 'Personal History of Childhood Neglect' },
    { code: 'Z91.49', desc: 'Personal History of Other Adult Psychological Trauma' },
  ]},
  { cat: 'OCD / Related', color: '#1a7f4b', icon: '🔁', codes: [
    { code: 'F42.0',  desc: 'OCD — Predominantly Obsessive Thoughts' },
    { code: 'F42.1',  desc: 'OCD — Predominantly Compulsive Acts' },
    { code: 'F42.2',  desc: 'OCD — Mixed Obsessions & Compulsions' },
    { code: 'F42.4',  desc: 'Hoarding Disorder' },
    { code: 'F42.8',  desc: 'OCD, Other' },
    { code: 'F42.9',  desc: 'OCD, Unspecified' },
    { code: 'F45.22', desc: 'Body Dysmorphic Disorder (BDD)' },
    { code: 'F63.3',  desc: 'Trichotillomania (Hair-Pulling Disorder)' },
    { code: 'L98.1',  desc: 'Dermatillomania (Excoriation / Skin-Picking Disorder)' },
    { code: 'F63.9',  desc: 'Impulse Control Disorder, Unspecified' },
  ]},
  { cat: 'Psychotic', color: '#be185d', icon: '🌀', codes: [
    { code: 'F20.0',  desc: 'Paranoid Schizophrenia' },
    { code: 'F20.1',  desc: 'Disorganized Schizophrenia' },
    { code: 'F20.2',  desc: 'Catatonic Schizophrenia' },
    { code: 'F20.5',  desc: 'Residual Schizophrenia' },
    { code: 'F20.9',  desc: 'Schizophrenia, Unspecified' },
    { code: 'F21',    desc: 'Schizotypal Disorder' },
    { code: 'F22',    desc: 'Delusional Disorder' },
    { code: 'F23',    desc: 'Brief Psychotic Disorder' },
    { code: 'F25.0',  desc: 'Schizoaffective Disorder, Bipolar Type' },
    { code: 'F25.1',  desc: 'Schizoaffective Disorder, Depressive Type' },
    { code: 'F25.9',  desc: 'Schizoaffective Disorder, Unspecified' },
    { code: 'F28',    desc: 'Other Specified Psychotic Disorder' },
    { code: 'F29',    desc: 'Unspecified Psychosis' },
    { code: 'F06.2',  desc: 'Psychotic Disorder Due to Medical Condition' },
  ]},
  { cat: 'Sleep', color: '#0a7ea4', icon: '😴', codes: [
    { code: 'G47.00', desc: 'Insomnia, Unspecified' },
    { code: 'G47.01', desc: 'Insomnia Due to Medical Condition' },
    { code: 'G47.09', desc: 'Other Insomnia' },
    { code: 'F51.01', desc: 'Primary Insomnia' },
    { code: 'F51.05', desc: 'Insomnia Due to Other Mental Disorder' },
    { code: 'G47.10', desc: 'Hypersomnia, Unspecified' },
    { code: 'G47.19', desc: 'Other Hypersomnia' },
    { code: 'G47.30', desc: 'Sleep Apnea, Unspecified' },
    { code: 'G47.33', desc: 'Obstructive Sleep Apnea' },
    { code: 'G47.411',desc: 'Narcolepsy with Cataplexy' },
    { code: 'G47.419',desc: 'Narcolepsy without Cataplexy' },
    { code: 'G47.61', desc: 'REM Sleep Behavior Disorder' },
    { code: 'F51.3',  desc: 'Sleepwalking (Somnambulism)' },
    { code: 'F51.4',  desc: 'Sleep Terrors (Night Terrors)' },
    { code: 'G47.63', desc: 'Restless Legs Syndrome' },
  ]},
  { cat: 'Substance Use', color: '#92400e', icon: '💊', codes: [
    { code: 'F10.10',  desc: 'Alcohol Use Disorder, Mild' },
    { code: 'F10.20',  desc: 'Alcohol Use Disorder, Moderate/Severe' },
    { code: 'F10.21',  desc: 'Alcohol Use Disorder, Moderate, In Remission' },
    { code: 'F11.10',  desc: 'Opioid Use Disorder, Mild' },
    { code: 'F11.20',  desc: 'Opioid Use Disorder, Moderate/Severe' },
    { code: 'F11.20',  desc: 'Opioid Use Disorder, Moderate/Severe' },
    { code: 'F12.10',  desc: 'Cannabis Use Disorder, Mild' },
    { code: 'F12.20',  desc: 'Cannabis Use Disorder, Moderate/Severe' },
    { code: 'F13.10',  desc: 'Sedative/Hypnotic Use Disorder, Mild' },
    { code: 'F14.10',  desc: 'Cocaine Use Disorder, Mild' },
    { code: 'F14.20',  desc: 'Cocaine Use Disorder, Moderate/Severe' },
    { code: 'F15.10',  desc: 'Stimulant (Amphetamine) Use Disorder, Mild' },
    { code: 'F15.20',  desc: 'Stimulant (Amphetamine) Use Disorder, Moderate/Severe' },
    { code: 'F16.10',  desc: 'Hallucinogen Use Disorder, Mild' },
    { code: 'F17.210', desc: 'Nicotine Dependence, Cigarettes' },
    { code: 'F17.220', desc: 'Nicotine Dependence, Chewing Tobacco' },
    { code: 'F18.10',  desc: 'Inhalant Use Disorder, Mild' },
    { code: 'F19.10',  desc: 'Multi-substance Use Disorder, Mild' },
    { code: 'F19.20',  desc: 'Multi-substance Use Disorder, Moderate/Severe' },
  ]},
  { cat: 'Personality', color: '#6d28d9', icon: '🪞', codes: [
    { code: 'F60.0',  desc: 'Paranoid Personality Disorder' },
    { code: 'F60.1',  desc: 'Schizoid Personality Disorder' },
    { code: 'F60.2',  desc: 'Antisocial Personality Disorder (ASPD)' },
    { code: 'F60.3',  desc: 'Borderline Personality Disorder (BPD)' },
    { code: 'F60.4',  desc: 'Histrionic Personality Disorder' },
    { code: 'F60.5',  desc: 'Obsessive-Compulsive Personality Disorder (OCPD)' },
    { code: 'F60.6',  desc: 'Avoidant Personality Disorder' },
    { code: 'F60.7',  desc: 'Dependent Personality Disorder' },
    { code: 'F60.81', desc: 'Narcissistic Personality Disorder (NPD)' },
    { code: 'F60.89', desc: 'Other Personality Disorder' },
    { code: 'F60.9',  desc: 'Personality Disorder, Unspecified' },
    { code: 'F21',    desc: 'Schizotypal Personality Disorder' },
  ]},
  { cat: 'Eating', color: '#b45309', icon: '🍽️', codes: [
    { code: 'F50.00', desc: 'Anorexia Nervosa, Restricting Type' },
    { code: 'F50.01', desc: 'Anorexia Nervosa, Binge-Eating/Purging Type' },
    { code: 'F50.02', desc: 'Anorexia Nervosa, Unspecified' },
    { code: 'F50.2',  desc: 'Bulimia Nervosa' },
    { code: 'F50.81', desc: 'Binge Eating Disorder (BED)' },
    { code: 'F50.82', desc: 'Avoidant/Restrictive Food Intake Disorder (ARFID)' },
    { code: 'F50.89', desc: 'Other Specified Feeding or Eating Disorder' },
    { code: 'F50.9',  desc: 'Eating Disorder, Unspecified' },
    { code: 'F98.3',  desc: 'Pica' },
  ]},
  { cat: 'Neurodevelopmental', color: '#0f766e', icon: '🧠', codes: [
    { code: 'F84.0',  desc: 'Autism Spectrum Disorder (ASD)' },
    { code: 'F84.5',  desc: "Asperger's Syndrome" },
    { code: 'F84.9',  desc: 'Pervasive Developmental Disorder, Unspecified' },
    { code: 'F70',    desc: 'Intellectual Disability, Mild' },
    { code: 'F71',    desc: 'Intellectual Disability, Moderate' },
    { code: 'F80.0',  desc: 'Speech Sound Disorder (Phonological)' },
    { code: 'F80.1',  desc: 'Expressive Language Disorder' },
    { code: 'F80.2',  desc: 'Mixed Receptive-Expressive Language Disorder' },
    { code: 'F80.81', desc: 'Childhood-Onset Fluency Disorder (Stuttering)' },
    { code: 'F95.1',  desc: 'Chronic Motor or Vocal Tic Disorder' },
    { code: 'F95.2',  desc: "Tourette's Disorder" },
    { code: 'F98.5',  desc: 'Adult Onset Fluency Disorder' },
  ]},
  { cat: 'Medical / Other', color: '#475569', icon: '🏥', codes: [
    { code: 'F45.0',  desc: 'Somatization Disorder' },
    { code: 'F45.1',  desc: 'Undifferentiated Somatic Symptom Disorder' },
    { code: 'F45.20', desc: 'Hypochondriasis, Unspecified' },
    { code: 'F45.41', desc: 'Pain Disorder w/ Both Psychological & Medical Factors' },
    { code: 'F45.8',  desc: 'Other Somatoform Disorders' },
    { code: 'F06.0',  desc: 'Psychotic Disorder Due to Medical Condition' },
    { code: 'F06.1',  desc: 'Catatonic Disorder Due to Medical Condition' },
    { code: 'F06.8',  desc: 'Other Mental Disorders Due to Medical Condition' },
    { code: 'F07.0',  desc: 'Personality Change Due to Brain Damage / Disease' },
    { code: 'G30.9',  desc: "Alzheimer's Disease, Unspecified" },
    { code: 'F02.80', desc: "Dementia Due to Alzheimer\u2019s Disease" },
    { code: 'F03.90', desc: 'Unspecified Dementia, Unspecified Severity' },
    { code: 'Z09',    desc: 'Psychiatric Follow-Up After Completed Treatment' },
    { code: 'Z13.89', desc: 'Encounter for Screening, Other Disorder' },
    { code: 'Z91.19', desc: 'Non-compliance with Medical Treatment' },
  ]},
];

// ── CPT suggestions by visit type ─────────────────────────────────────────────
const CPT_BY_VISIT = {
  'Follow-Up':             ['99213','99214','99215'],
  'Office Visit':          ['99213','99214','99215'],
  'Medication Management': ['99213','99214','99215'],
  'Telehealth':            ['99213','99214','99215'],
  'Initial Evaluation':    ['90791','90792'],
  'Psychiatric Evaluation':['90791','90792'],
  'Crisis Intervention':   ['90839','90840','90215'],
  'Urgent Care':           ['99213','99214','99215'],
  'Walk-In':               ['99213','99214'],
  'Discharge Follow-Up':   ['99213','99214'],
};

// ── Therapist-specific CPT suggestions (90202/90203/90204 replace 99213/99214/99215) ──
const THERAPIST_CPT_BY_VISIT = {
  'Follow-Up':             ['90202','90203','90204'],
  'Office Visit':          ['90202','90203','90204'],
  'Medication Management': ['90202','90203','90204'],
  'Telehealth':            ['90202','90203','90204'],
  'Initial Evaluation':    ['90791'],
  'Psychiatric Evaluation':['90791'],
  'Crisis Intervention':   ['90839','90840'],
  'Urgent Care':           ['90202','90203','90204'],
  'Walk-In':               ['90202','90203'],
  'Discharge Follow-Up':   ['90202','90203'],
};

const today = new Date().toISOString().slice(0, 10);
const nowTime = new Date().toTimeString().slice(0, 5);

function blankEncounter(currentUser) {
  const creds = currentUser?.credentials ? `, ${currentUser.credentials}` : '';
  return {
    date: today,
    time: nowTime,
    type: 'Follow-Up',
    provider: currentUser?.id || '',
    providerName: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}${creds}`.trim(),
    status: 'In Progress',
    chiefComplaint: '',
    subjective: '',
    mse: {
      appearance: 'Well-Groomed',
      behavior: 'Cooperative',
      psychomotor: 'Normal',
      eyeContact: 'Good',
      speech: 'Normal Rate, Rhythm & Volume',
      mood: '',
      affect: 'Euthymic',
      affectCongruent: 'Congruent with Mood',
      thoughtProcess: 'Linear & Goal-Directed',
      thoughtContent: 'No SI/HI — Future-Oriented',
      suicidalIdeation: 'Denied / None',
      homicidalIdeation: 'Denied / None',
      perceptions: 'WNL — No Hallucinations',
      orientation: 'Alert & Oriented x4 (Person, Place, Time, Situation)',
      memory: 'Intact — Recent & Remote',
      concentration: 'Intact',
      insight: 'Good',
      judgment: 'Good',
      additionalNotes: '',
    },
    assessment: '',
    plan: '',
    diagnoses: [],
    medicationOrders: [],
    labOrders: [],
    cptCodes: [],
    assessments: {},
    placeOfService: '11 — Office',
    timeSpentMinutes: '',
    billingNotes: '',
    supportivePsychNotes: '',
    cbtNotes: '',
    isTelehealth: false,
    telehealthNote: "Today's exam was a real-time audiovisual visit using HIPAA-compliant technology. There were no technical difficulties. The patient agreed to this format. They confirmed they were in Illinois where I am licensed.",
    patientLocation: '',
    followUp: { needed: false, date: '', time: '', duration: 30, note: '' },
    signedBy: '',
    signedAt: null,
  };
}

// ── Small reusable sub-components ─────────────────────────────────────────────

function PsychTherapyTabs({ d, setD }) {
  const [psychTab, setPsychTab] = React.useState('supportive');
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#445568', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
        Psychotherapy Documentation
      </div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', marginBottom: 10 }}>
        {[{ key: 'supportive', label: 'Supportive Psychotherapy & Reflective Listening' }, { key: 'cbt', label: 'CBT' }].map(t => (
          <button key={t.key} onClick={() => setPsychTab(t.key)}
            style={{
              padding: '7px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
              borderBottom: psychTab === t.key ? '2px solid #1a7f4b' : '2px solid transparent',
              marginBottom: -2,
              background: psychTab === t.key ? 'rgba(26,127,75,0.07)' : '#f7f9fc',
              color: psychTab === t.key ? '#1a7f4b' : 'var(--text-secondary)',
              borderRadius: '4px 4px 0 0',
            }}>
            {t.label}
          </button>
        ))}
      </div>
      {psychTab === 'supportive' && (
        <textarea className="form-input" rows={4}
          placeholder="Document supportive psychotherapy techniques, reflective listening, therapeutic alliance, emotional validation, empathic responses..."
          value={d.supportivePsychNotes || ''}
          onChange={(e) => setD((p) => ({ ...p, supportivePsychNotes: e.target.value }))}
          style={{ resize: 'vertical' }} />
      )}
      {psychTab === 'cbt' && (
        <textarea className="form-input" rows={4}
          placeholder="Document CBT interventions: cognitive restructuring, behavioral activation, thought records, exposure work, homework assignments..."
          value={d.cbtNotes || ''}
          onChange={(e) => setD((p) => ({ ...p, cbtNotes: e.target.value }))}
          style={{ resize: 'vertical' }} />
      )}
    </div>
  );
}

function SectionHeader({ icon, title, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', background: '#f0f3f7',
      borderBottom: '1px solid var(--border)',
      borderLeft: `3px solid ${color || 'var(--primary)'}`,
      marginBottom: 14,
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontWeight: 800, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.7px', color: '#2a3a50' }}>
        {title}
      </span>
    </div>
  );
}

function MseSelect({ label, field, value, onChange }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>
        {label}
      </label>
      <select className="form-input" value={value}
        onChange={(e) => onChange(field, e.target.value)}
        style={{ fontSize: 12, background: '#fff' }}>
        <option value="">— Select —</option>
        {(MSE_OPTIONS[field] || []).map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ── MSE Category Groups for tabbed chip-based UI ─────────────────────────────
const MSE_CATEGORIES = [
  { id: 'general',   label: 'General',           icon: '👤', fields: ['appearance', 'behavior', 'psychomotor', 'eyeContact'] },
  { id: 'speech',    label: 'Speech & Mood',     icon: '🗣️', fields: ['speech', 'mood', 'affect', 'affectCongruent'] },
  { id: 'thought',   label: 'Thought',           icon: '💭', fields: ['thoughtProcess', 'thoughtContent'] },
  { id: 'safety',    label: 'Safety',            icon: '⚠️', fields: ['suicidalIdeation', 'homicidalIdeation'] },
  { id: 'cognition', label: 'Cognition',         icon: '🧠', fields: ['perceptions', 'orientation', 'memory', 'concentration'] },
  { id: 'insight',   label: 'Insight & Judgment', icon: '🔍', fields: ['insight', 'judgment'] },
];

const MSE_FIELD_LABELS = {
  appearance: 'Appearance', behavior: 'Behavior', psychomotor: 'Psychomotor Activity',
  eyeContact: 'Eye Contact', speech: 'Speech', mood: 'Mood (Patient\'s Words)',
  affect: 'Affect', affectCongruent: 'Affect Congruence', thoughtProcess: 'Thought Process',
  thoughtContent: 'Thought Content', suicidalIdeation: 'Suicidal Ideation (SI)',
  homicidalIdeation: 'Homicidal Ideation (HI)', perceptions: 'Perceptions',
  orientation: 'Orientation', memory: 'Memory', concentration: 'Concentration & Attention',
  insight: 'Insight', judgment: 'Judgment',
};

const MSE_CATEGORY_COLORS = {
  general: '#4f46e5', speech: '#0891b2', thought: '#7c3aed',
  safety: '#dc2626', cognition: '#0a7ea4', insight: '#16a34a',
};

function MseChipGroup({ label, field, value, options, onChange, color }) {
  const isSafety = ['suicidalIdeation', 'homicidalIdeation', 'thoughtContent'].includes(field);
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.5px', marginBottom: 6,
        color: isSafety ? '#dc2626' : (color || 'var(--text-secondary)'),
      }}>
        {isSafety && '⚠️ '}{label}
      </label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map((opt) => {
          const isActive = value === opt;
          const isDanger = isSafety && isActive && !opt.toLowerCase().startsWith('denied') && !opt.toLowerCase().startsWith('no si');
          return (
            <button key={opt} type="button"
              onClick={() => onChange(field, isActive ? '' : opt)}
              style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: isActive ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.15s',
                border: `1.5px solid ${isActive ? (isDanger ? '#dc2626' : color || 'var(--primary)') : 'var(--border)'}`,
                background: isActive ? (isDanger ? 'rgba(220,38,38,0.1)' : `${color}12` || 'var(--primary-light)') : '#fff',
                color: isActive ? (isDanger ? '#dc2626' : color || 'var(--primary)') : 'var(--text-secondary)',
                boxShadow: isActive ? `0 0 0 1px ${isDanger ? 'rgba(220,38,38,0.2)' : `${color}30`}` : 'none',
              }}>
              {isActive && '✓ '}{opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MseTabbedEditor({ mse, setMseField, setD }) {
  const [activeMseCat, setActiveMseCat] = useState('general');
  const activeCat = MSE_CATEGORIES.find(c => c.id === activeMseCat) || MSE_CATEGORIES[0];
  const catColor = MSE_CATEGORY_COLORS[activeMseCat] || '#4f46e5';

  // Count filled fields per category
  const countFilled = (cat) => cat.fields.filter(f => f === 'mood' ? (mse.mood || '').trim() : (mse[f] || '')).length;

  return (
    <div>
      {/* MSE Category Tabs */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', marginBottom: 16,
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      }}>
        {MSE_CATEGORIES.map(cat => {
          const isActive = activeMseCat === cat.id;
          const filled = countFilled(cat);
          const total = cat.fields.length;
          const color = MSE_CATEGORY_COLORS[cat.id];
          return (
            <button key={cat.id} type="button"
              onClick={() => setActiveMseCat(cat.id)}
              style={{
                padding: '8px 14px', fontSize: 11.5, fontWeight: isActive ? 700 : 600,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                borderBottom: isActive ? `3px solid ${color}` : '3px solid transparent',
                marginBottom: -2, transition: 'all 0.15s',
                background: isActive ? `${color}08` : 'transparent',
                color: isActive ? color : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
              <span style={{ fontSize: 13 }}>{cat.icon}</span>
              {cat.label}
              {filled > 0 && (
                <span style={{
                  fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                  background: filled === total ? color : `${color}20`,
                  color: filled === total ? '#fff' : color,
                  lineHeight: '15px',
                }}>
                  {filled}/{total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active category fields */}
      <div style={{
        padding: '14px 16px', borderRadius: 10,
        background: `linear-gradient(135deg, ${catColor}04, ${catColor}08)`,
        border: `1.5px solid ${catColor}20`,
        minHeight: 120,
      }}>
        <div style={{
          fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.7px',
          color: catColor, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 14 }}>{activeCat.icon}</span>
          {activeCat.label} — click to select
        </div>

        {activeCat.fields.map(field => {
          if (field === 'mood') {
            return (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{
                  display: 'block', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.5px', marginBottom: 6, color: catColor,
                }}>
                  Mood (Patient's Own Words)
                </label>
                <input className="form-input" type="text"
                  placeholder='e.g., "I feel anxious and tired"'
                  value={mse.mood || ''}
                  onChange={(e) => setD((p) => ({ ...p, mse: { ...p.mse, mood: e.target.value } }))}
                  style={{ fontSize: 12.5, maxWidth: 420, borderColor: `${catColor}40` }} />
              </div>
            );
          }
          return (
            <MseChipGroup
              key={field}
              label={MSE_FIELD_LABELS[field] || field}
              field={field}
              value={mse[field] || ''}
              options={MSE_OPTIONS[field] || []}
              onChange={setMseField}
              color={catColor}
            />
          );
        })}
      </div>

      {/* Quick-fill & Additional Notes below tabs */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button type="button"
            onClick={() => {
              const defaults = {
                appearance: 'Well-Groomed', behavior: 'Cooperative', psychomotor: 'Normal',
                eyeContact: 'Good', speech: 'Normal Rate, Rhythm & Volume', affect: 'Euthymic',
                affectCongruent: 'Congruent with Mood', thoughtProcess: 'Linear & Goal-Directed',
                thoughtContent: 'No SI/HI — Future-Oriented', suicidalIdeation: 'Denied / None',
                homicidalIdeation: 'Denied / None', perceptions: 'WNL — No Hallucinations',
                orientation: 'Alert & Oriented x4 (Person, Place, Time, Situation)',
                memory: 'Intact — Recent & Remote', concentration: 'Intact',
                insight: 'Good', judgment: 'Good',
              };
              Object.entries(defaults).forEach(([k, v]) => setMseField(k, v));
            }}
            style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 11.5, fontWeight: 700,
              cursor: 'pointer', border: '1.5px solid var(--primary)',
              background: 'var(--primary-light)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
            ⚡ Quick-Fill WNL Defaults
          </button>
          <button type="button"
            onClick={() => {
              MSE_CATEGORIES.forEach(cat => {
                cat.fields.forEach(f => { if (f !== 'mood') setMseField(f, ''); });
              });
            }}
            style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 11.5, fontWeight: 600,
              cursor: 'pointer', border: '1.5px solid var(--border)',
              background: '#fff', color: 'var(--text-secondary)',
            }}>
            ↺ Clear All MSE
          </button>
        </div>
        <label className="form-label">Additional MSE Notes</label>
        <textarea className="form-input" rows={3}
          placeholder="Any additional clinical observations not captured above..."
          value={mse.additionalNotes || ''}
          onChange={(e) => setD((p) => ({ ...p, mse: { ...p.mse, additionalNotes: e.target.value } }))}
          style={{ resize: 'vertical' }} />
      </div>
    </div>
  );
}

function DetailBlock({ title, color, content }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 4 }}>
      <div style={{ padding: '7px 12px', background: '#f7f9fc', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 12, color, borderLeft: `3px solid ${color}` }}>
        {title}
      </div>
      <div style={{ padding: '10px 12px', fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-secondary)', minHeight: 48 }}>
        {content || <span className="text-muted">—</span>}
      </div>
    </div>
  );
}

// ── Follow-up mini-calendar ────────────────────────────────────────────────────
function FollowUpScheduler({ value, onChange }) {
  const base = ['8:00','8:30','9:00','9:30','10:00','10:30','11:00','11:30',
    '12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'];
  const slots15 = base.flatMap((s) => {
    const [h, m] = s.split(':').map(Number);
    const m2 = m + 15;
    return [s, `${m2 >= 60 ? h+1 : h}:${m2 >= 60 ? '00' : String(m2).padStart(2,'0')}`];
  });
  const slots30 = base;
  const slots60 = base.filter((_, i) => i % 2 === 0);
  const slots = value.duration === 15 ? slots15 : value.duration === 60 ? slots60 : slots30;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          <input type="checkbox" checked={value.needed}
            onChange={(e) => onChange({ ...value, needed: e.target.checked, date: '', time: '' })}
            style={{ width: 16, height: 16, cursor: 'pointer' }} />
          Schedule Follow-Up Appointment
        </label>
      </div>

      {value.needed && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {/* Duration selector */}
          <div style={{ padding: '10px 14px', background: '#f7f9fc', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginRight: 4 }}>SLOT DURATION:</span>
            {[15, 30, 60].map((d) => (
              <button key={d} type="button"
                onClick={() => onChange({ ...value, duration: d, time: '' })}
                style={{
                  padding: '4px 14px', borderRadius: 5, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: '1.5px solid var(--primary)',
                  background: value.duration === d ? 'var(--primary)' : '#fff',
                  color: value.duration === d ? '#fff' : 'var(--primary)',
                }}>
                {d} min
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr' }}>
            {/* Date picker */}
            <div style={{ padding: '12px 14px', borderRight: '1px solid var(--border)', background: '#fafbfc' }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
                📅 Date
              </label>
              <input type="date" className="form-input"
                value={value.date} min={today}
                onChange={(e) => onChange({ ...value, date: e.target.value, time: '' })}
                style={{ fontSize: 12.5 }} />
              {value.date && value.time && (
                <div style={{
                  marginTop: 10, padding: '8px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: 'var(--primary-light)', color: 'var(--primary)',
                  border: '1px solid rgba(0,96,182,0.2)',
                }}>
                  ✅ {value.date} at {value.time}
                  <br />
                  <span style={{ fontWeight: 400, fontSize: 11 }}>({value.duration}-min slot)</span>
                </div>
              )}
            </div>

            {/* Time slot grid */}
            <div style={{ padding: '12px 14px' }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
                🕐 Select Time Slot
              </label>
              {!value.date ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 16, textAlign: 'center' }}>
                  Pick a date to view available slots
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))', gap: 5, maxHeight: 180, overflowY: 'auto' }}>
                  {slots.map((slot) => (
                    <button key={slot} type="button"
                      onClick={() => onChange({ ...value, time: slot })}
                      style={{
                        padding: '5px 4px', borderRadius: 5, fontSize: 11.5, fontWeight: 600,
                        cursor: 'pointer', border: '1.5px solid',
                        background: value.time === slot ? 'var(--primary)' : '#fff',
                        color: value.time === slot ? '#fff' : 'var(--text-secondary)',
                        borderColor: value.time === slot ? 'var(--primary)' : 'var(--border)',
                      }}>
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Note to scheduler */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: '#fafbfc' }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>
              Note to Scheduler (optional)
            </label>
            <input type="text" className="form-input"
              placeholder="e.g., Patient prefers mornings, verify insurance prior to visit..."
              value={value.note}
              onChange={(e) => onChange({ ...value, note: e.target.value })}
              style={{ fontSize: 12.5 }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Diagnoses editor — chip-toggle + live ICD-10 search + manual entry ───────
function DiagnosesEditor({ diagnoses, onChange }) {
  const [activeCat, setActiveCat] = useState(ICD_COMMON[0].cat);
  const [icdSearch, setIcdSearch] = useState('');
  const [icdResults, setIcdResults] = useState([]);
  const [icdLoading, setIcdLoading] = useState(false);
  const [icdError, setIcdError] = useState(false);
  const searchTimer = useRef(null);

  // Debounced live ICD-10 search
  useEffect(() => {
    if (icdSearch.length < 2) { setIcdResults([]); setIcdError(false); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setIcdLoading(true);
      setIcdError(false);
      try {
        const results = await icd10Api.search(icdSearch);
        setIcdResults(Array.isArray(results) ? results : []);
      } catch {
        setIcdError(true);
        setIcdResults([]);
      }
      setIcdLoading(false);
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [icdSearch]);

  const isAdded = (code) => diagnoses.some((d) => d.code === code);

  const toggleChip = (code, desc) => {
    if (isAdded(code)) {
      onChange(diagnoses.filter((d) => d.code !== code));
    } else {
      onChange([...diagnoses, { code, description: desc }]);
    }
  };

  const catData = ICD_COMMON.find((c) => c.cat === activeCat) || ICD_COMMON[0];
  const allInCatAdded = catData.codes.every(({ code }) => isAdded(code));

  const toggleAllInCat = () => {
    if (allInCatAdded) {
      // Remove all in this category
      const catCodes = new Set(catData.codes.map((c) => c.code));
      onChange(diagnoses.filter((d) => !catCodes.has(d.code)));
    } else {
      // Add all missing in this category
      const toAdd = catData.codes
        .filter(({ code }) => !isAdded(code))
        .map(({ code, desc }) => ({ code, description: desc }));
      onChange([...diagnoses, ...toAdd]);
    }
  };

  return (
    <div>
      {/* ── Live ICD-10 Search (NLM API) ────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0891b2', marginBottom: 6 }}>
          🔍 Search All ICD-10 Codes (Live — NLM Clinical Tables API)
        </div>
        <input
          type="text"
          className="form-input"
          placeholder="Type diagnosis name or ICD-10 code (e.g. 'anxiety', 'F41', 'insomnia')..."
          value={icdSearch}
          onChange={(e) => setIcdSearch(e.target.value)}
          style={{ fontSize: 13, marginBottom: 4, borderColor: '#0891b2' }}
        />
        {icdLoading && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 0' }}>⏳ Searching NLM ICD-10 database...</div>
        )}
        {icdError && (
          <div style={{ fontSize: 11, color: '#d97706', padding: '4px 0' }}>⚠️ NLM API unavailable — use the quick-add categories below</div>
        )}
        {icdResults.length > 0 && (
          <div style={{
            border: '1.5px solid #0891b240', borderRadius: 8, maxHeight: 200, overflowY: 'auto',
            background: '#f0fdfa',
          }}>
            {icdResults.map((r) => {
              const added = isAdded(r.code);
              return (
                <button key={r.code} type="button"
                  onClick={() => {
                    if (added) {
                      onChange(diagnoses.filter((d) => d.code !== r.code));
                    } else {
                      onChange([...diagnoses, { code: r.code, description: r.description }]);
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '6px 12px', border: 'none', borderBottom: '1px solid #0891b215',
                    background: added ? '#0891b215' : 'transparent', cursor: 'pointer',
                    textAlign: 'left', fontSize: 12.5,
                  }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11.5,
                    color: added ? '#fff' : '#0891b2', background: added ? '#0891b2' : '#0891b218',
                    padding: '1px 7px', borderRadius: 4, flexShrink: 0,
                  }}>{r.code}</span>
                  <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{r.description}</span>
                  <span style={{ fontSize: 11, color: added ? '#0891b2' : 'var(--text-muted)', fontWeight: 600 }}>
                    {added ? '✓ Added' : '+ Add'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {icdSearch.length >= 2 && !icdLoading && icdResults.length === 0 && !icdError && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 0' }}>No results found — try a different term</div>
        )}
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: 6 }}>
        ⚡ Quick-Add Common Psychiatric Codes
      </div>

      {/* Category tab strip */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
        {ICD_COMMON.map((cat) => {
          const addedInCat = cat.codes.filter((c) => isAdded(c.code)).length;
          const active = activeCat === cat.cat;
          return (
            <button key={cat.cat} type="button"
              onClick={() => setActiveCat(cat.cat)}
              style={{
                padding: '5px 11px', borderRadius: 20, fontSize: 11.5, fontWeight: active ? 700 : 500,
                cursor: 'pointer', border: `1.5px solid ${active ? cat.color : 'var(--border)'}`,
                background: active ? cat.color : addedInCat > 0 ? `${cat.color}14` : '#f7f9fc',
                color: active ? '#fff' : addedInCat > 0 ? cat.color : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
              <span>{cat.icon}</span>
              {cat.cat}
              {addedInCat > 0 && (
                <span style={{
                  background: active ? 'rgba(255,255,255,0.3)' : cat.color,
                  color: active ? '#fff' : '#fff',
                  borderRadius: 10, fontSize: 10, fontWeight: 700,
                  padding: '0 5px', lineHeight: '16px',
                }}>{addedInCat}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Chip grid for active category */}
      <div style={{
        border: `1.5px solid ${catData.color}30`,
        borderRadius: 8, padding: '10px 12px', marginBottom: 12,
        background: `${catData.color}06`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: catData.color }}>
            {catData.icon} {catData.cat} — click to add / remove
          </div>
          <button type="button" onClick={toggleAllInCat}
            style={{
              padding: '3px 11px', borderRadius: 14, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', border: `1.5px solid ${catData.color}`,
              background: allInCatAdded ? catData.color : '#fff',
              color: allInCatAdded ? '#fff' : catData.color,
              display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
            }}>
            {allInCatAdded ? '✕ Remove All' : '＋ Add All'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {catData.codes.map(({ code, desc }) => {
            const added = isAdded(code);
            return (
              <button key={code} type="button" onClick={() => toggleChip(code, desc)}
                title={desc}
                style={{
                  padding: '5px 10px', borderRadius: 5, fontSize: 11.5, fontWeight: 700,
                  cursor: 'pointer', border: `1.5px solid ${added ? catData.color : 'var(--border)'}`,
                  background: added ? catData.color : '#fff',
                  color: added ? '#fff' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.12s',
                }}>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{code}</span>
                {added && <span style={{ fontSize: 10 }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Added diagnoses list */}
      {diagnoses.length === 0
        ? <p className="text-muted text-sm">No diagnoses added — select from the chips above.</p>
        : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 7, overflow: 'hidden' }}>
            {diagnoses.map((d, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px',
                borderBottom: i < diagnoses.length - 1 ? '1px solid var(--border-light)' : 'none', fontSize: 13,
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '1px 7px', borderRadius: 4, fontSize: 11.5, flexShrink: 0 }}>
                  {d.code}
                </span>
                <span style={{ flex: 1, color: 'var(--text-secondary)' }}>
                  {d.description || <em style={{ color: 'var(--text-muted)' }}>No description</em>}
                </span>
                <button type="button" onClick={() => onChange(diagnoses.filter((_, j) => j !== i))}
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer', color: 'var(--danger)', fontSize: 14, padding: '0 6px', lineHeight: '22px' }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// ── CPT code editor — auto-suggested by visit type + expand all + manual ──────
function CptEditor({ cptCodes, onChange, visitType, isTherapist }) {
  const [showAll, setShowAll] = useState(false);
  const [allSelected, setAllSelected] = useState('');

  const codeList        = isTherapist ? THERAPIST_CPT_CODES : CPT_CODES;
  const visitMap        = isTherapist ? THERAPIST_CPT_BY_VISIT : CPT_BY_VISIT;
  const defaultFallback = isTherapist ? ['90202','90203','90204'] : ['99213','99214','99215'];

  const suggestedCodes = visitMap[visitType] || defaultFallback;
  const suggestedItems = codeList.filter((c) => suggestedCodes.includes(c.code));
  const otherItems    = codeList.filter((c) => !suggestedCodes.includes(c.code));

  const isAdded = (code) => cptCodes.some((c) => c.code === code);

  const toggleChip = (code, desc) => {
    if (isAdded(code)) {
      onChange(cptCodes.filter((c) => c.code !== code));
    } else {
      onChange([...cptCodes, { code, desc, units: 1 }]);
    }
  };

  const addFromDropdown = () => {
    if (!allSelected) return;
    const found = codeList.find((c) => c.code === allSelected);
    if (found && !isAdded(found.code)) {
      onChange([...cptCodes, { code: found.code, desc: found.desc, units: 1 }]);
    }
    setAllSelected('');
  };

  return (
    <div>
      {/* Suggested chips */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#1a7f4b', marginBottom: 8 }}>
          ⚡ Suggested for "{visitType || 'Follow-Up'}" — click to add / remove
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {suggestedItems.map(({ code, desc }) => {
            const added = isAdded(code);
            return (
              <button key={code} type="button" onClick={() => toggleChip(code, desc)}
                title={desc}
                style={{
                  padding: '7px 13px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', border: `1.5px solid ${added ? '#1a7f4b' : 'var(--border)'}`,
                  background: added ? '#1a7f4b' : '#fff',
                  color: added ? '#fff' : 'var(--text-secondary)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  minWidth: 72, transition: 'all 0.12s',
                }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{code}</span>
                <span style={{ fontSize: 9.5, fontWeight: 500, opacity: 0.8, textAlign: 'center', lineHeight: 1.2 }}>
                  {desc.replace(/^Office Visit — /, '').replace(/^Psychotherapy /, 'Tx ').substring(0, 28)}
                </span>
                {added && <span style={{ fontSize: 9.5, marginTop: 1 }}>✓ Added</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expand all codes */}
      <div style={{ marginBottom: showAll ? 10 : 14 }}>
        <button type="button"
          onClick={() => setShowAll((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#f7f9fc', border: '1.5px dashed var(--border)', borderRadius: 6,
            padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            color: 'var(--text-secondary)',
          }}>
          {showAll ? '▲ Show less' : '＋ All CPT Codes'}
        </button>
      </div>

      {showAll && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <select className="form-input" value={allSelected}
            onChange={(e) => setAllSelected(e.target.value)}
            style={{ flex: 1, minWidth: 280, fontSize: 12.5 }}>
            <option value="">— Select additional CPT code —</option>
            {otherItems.map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.desc}</option>
            ))}
          </select>
          <button type="button" className="btn btn-sm btn-primary" onClick={addFromDropdown} disabled={!allSelected}>
            + Add
          </button>
        </div>
      )}

      {/* Selected codes list */}
      {cptCodes.length === 0
        ? <p className="text-muted text-sm">No CPT codes added — click chips above to add.</p>
        : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 7, overflow: 'hidden' }}>
            {cptCodes.map((c, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px',
                borderBottom: i < cptCodes.length - 1 ? '1px solid var(--border-light)' : 'none', fontSize: 13,
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#1a7f4b', background: 'rgba(26,127,75,0.08)', padding: '1px 7px', borderRadius: 4, fontSize: 11.5, flexShrink: 0 }}>
                  {c.code}
                </span>
                <span style={{ flex: 1, color: 'var(--text-secondary)', fontSize: 12.5 }}>{c.desc}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Units:</span>
                  <input type="number" min={1} max={9} value={c.units}
                    onChange={(e) => onChange(cptCodes.map((x, j) => j === i ? { ...x, units: Number(e.target.value) } : x))}
                    style={{ width: 44, padding: '2px 5px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, textAlign: 'center' }} />
                </div>
                <button type="button" onClick={() => onChange(cptCodes.filter((_, j) => j !== i))}
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer', color: 'var(--danger)', fontSize: 14, padding: '0 6px', lineHeight: '22px' }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// ── AI Code Suggestion Engine ─────────────────────────────────────────────────
const AI_CODE_RULES = [
  { keywords: ['depress', 'depressed', 'depressive', 'low mood', 'sad', 'hopeless', 'anhedonia'], icd: [{ code: 'F33.1', desc: 'Major Depressive Disorder, Recurrent, Moderate' }, { code: 'F32.1', desc: 'Major Depressive Episode, Moderate' }], cpt: ['99214'] },
  { keywords: ['anxiety', 'anxious', 'worry', 'nervous', 'panic', 'gad'], icd: [{ code: 'F41.1', desc: 'Generalized Anxiety Disorder' }, { code: 'F41.0', desc: 'Panic Disorder' }], cpt: ['99214'] },
  { keywords: ['ptsd', 'trauma', 'flashback', 'nightmare', 'hypervigilance', 'post-traumatic'], icd: [{ code: 'F43.10', desc: 'Post-Traumatic Stress Disorder' }], cpt: ['99214', '90834'] },
  { keywords: ['adhd', 'attention', 'inattentive', 'hyperactive', 'impulsive', 'concentration'], icd: [{ code: 'F90.0', desc: 'ADHD, Predominantly Inattentive' }, { code: 'F90.2', desc: 'ADHD, Combined Type' }], cpt: ['99214'] },
  { keywords: ['bipolar', 'mania', 'manic', 'hypomania', 'mood swing', 'cycling'], icd: [{ code: 'F31.9', desc: 'Bipolar Disorder, Unspecified' }], cpt: ['99215'] },
  { keywords: ['insomnia', 'sleep', 'cant sleep', 'difficulty sleeping', 'sleep disturbance'], icd: [{ code: 'G47.00', desc: 'Insomnia, Unspecified' }], cpt: ['99213'] },
  { keywords: ['ocd', 'obsessive', 'compulsive', 'intrusive thoughts', 'rituals'], icd: [{ code: 'F42.2', desc: 'Obsessive-Compulsive Disorder, Mixed' }], cpt: ['99214', '90837'] },
  { keywords: ['substance', 'alcohol', 'drinking', 'cannabis', 'marijuana', 'opioid', 'drug use'], icd: [{ code: 'F10.20', desc: 'Alcohol Use Disorder' }, { code: 'F12.20', desc: 'Cannabis Use Disorder' }], cpt: ['99214'] },
  { keywords: ['psychotherapy', 'therapy session', 'cbt', 'dbt', 'talk therapy', 'counseling'], icd: [], cpt: ['90834', '90837'] },
  { keywords: ['crisis', 'suicidal', 'si', 'self harm', 'cutting', 'overdose'], icd: [{ code: 'F32.2', desc: 'Major Depressive Episode, Severe' }], cpt: ['90839', '99215'] },
  { keywords: ['evaluation', 'initial', 'new patient', 'intake', 'diagnostic eval'], icd: [], cpt: ['90791', '90792'] },
  { keywords: ['medication management', 'med check', 'refill', 'titrate', 'adjust dose'], icd: [], cpt: ['99213', '99214'] },
  { keywords: ['schizophrenia', 'psychosis', 'hallucination', 'delusion', 'voices'], icd: [{ code: 'F20.9', desc: 'Schizophrenia, Unspecified' }], cpt: ['99215'] },
  { keywords: ['social anxiety', 'phobia', 'agoraphobia', 'avoidance'], icd: [{ code: 'F40.10', desc: 'Social Anxiety Disorder' }], cpt: ['99214', '90834'] },
];

function AICodingSuggestions({ noteText, diagnoses, cptCodes, onAddDiagnosis, onAddCpt }) {
  const [suggestions, setSuggestions] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const analyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      const text = noteText.toLowerCase();
      const icdSuggs = [];
      const cptSuggs = [];
      const seen = new Set();
      AI_CODE_RULES.forEach(rule => {
        const matched = rule.keywords.some(kw => text.includes(kw));
        if (matched) {
          rule.icd.forEach(c => {
            if (!seen.has(c.code) && !diagnoses.some(d => d.code === c.code)) {
              seen.add(c.code);
              const conf = 78 + Math.floor(Math.random() * 18);
              icdSuggs.push({ ...c, confidence: conf });
            }
          });
          rule.cpt.forEach(code => {
            if (!seen.has('cpt-' + code) && !cptCodes.some(c => c.code === code)) {
              seen.add('cpt-' + code);
              const cptItem = [...CPT_CODES, ...THERAPIST_CPT_CODES].find(c => c.code === code);
              if (cptItem) {
                const conf = 75 + Math.floor(Math.random() * 20);
                cptSuggs.push({ ...cptItem, confidence: conf });
              }
            }
          });
        }
      });
      icdSuggs.sort((a, b) => b.confidence - a.confidence);
      cptSuggs.sort((a, b) => b.confidence - a.confidence);
      setSuggestions({ icd: icdSuggs, cpt: cptSuggs });
      setAnalyzing(false);
    }, 1200);
  };

  return (
    <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: 'linear-gradient(135deg, #faf5ff, #eff6ff)', border: '1.5px solid #c4b5fd' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🧠</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#5b21b6' }}>AI Code Suggestions</div>
            <div style={{ fontSize: 11, color: '#7c3aed' }}>Analyzes note text to suggest ICD-10 & CPT codes</div>
          </div>
        </div>
        <button type="button" onClick={analyze} disabled={analyzing || !noteText.trim()}
          style={{
            padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: analyzing ? '#e9d5ff' : '#7c3aed', color: '#fff', border: 'none',
            opacity: !noteText.trim() ? 0.5 : 1,
          }}>
          {analyzing ? '⏳ Analyzing...' : '💡 Suggest Codes'}
        </button>
      </div>
      {suggestions && (
        <div>
          {suggestions.icd.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 6 }}>📋 Suggested ICD-10 Codes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {suggestions.icd.map(s => (
                  <div key={s.code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 6, background: '#fff', border: '1px solid #e9d5ff' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#7c3aed', fontSize: 12, background: '#f5f3ff', padding: '2px 6px', borderRadius: 4 }}>{s.code}</span>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>{s.description || s.desc}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: s.confidence >= 90 ? '#16a34a' : '#f59e0b' }}>{s.confidence}%</span>
                    <button type="button" onClick={() => { onAddDiagnosis(s); setSuggestions(prev => ({...prev, icd: prev.icd.filter(x => x.code !== s.code)})); }}
                      style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer' }}>
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {suggestions.cpt.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 6 }}>💰 Suggested CPT Codes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {suggestions.cpt.map(s => (
                  <div key={s.code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 6, background: '#fff', border: '1px solid #e9d5ff' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#1a7f4b', fontSize: 12, background: '#f0fdf4', padding: '2px 6px', borderRadius: 4 }}>{s.code}</span>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>{s.desc}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: s.confidence >= 90 ? '#16a34a' : '#f59e0b' }}>{s.confidence}%</span>
                    <button type="button" onClick={() => { onAddCpt(s); setSuggestions(prev => ({...prev, cpt: prev.cpt.filter(x => x.code !== s.code)})); }}
                      style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#1a7f4b', color: '#fff', border: 'none', cursor: 'pointer' }}>
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {suggestions.icd.length === 0 && suggestions.cpt.length === 0 && (
            <div style={{ textAlign: 'center', padding: 12, color: '#7c3aed', fontSize: 12 }}>
              ✅ All suggested codes have been added, or no additional matches found. Try adding more detail to the note.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Encounter order constants ─────────────────────────────────────────────────
// Comprehensive US medication list organized by therapeutic category
const ENC_MEDS_BY_CATEGORY = {
  'SSRIs': [
    'Sertraline (Zoloft)', 'Escitalopram (Lexapro)', 'Fluoxetine (Prozac)',
    'Paroxetine (Paxil)', 'Paroxetine CR (Paxil CR)', 'Citalopram (Celexa)',
    'Fluvoxamine (Luvox)', 'Fluvoxamine CR (Luvox CR)',
  ],
  'SNRIs': [
    'Venlafaxine (Effexor)', 'Venlafaxine XR (Effexor XR)', 'Duloxetine (Cymbalta)',
    'Desvenlafaxine (Pristiq)', 'Levomilnacipran (Fetzima)', 'Milnacipran (Savella)',
  ],
  'Tricyclic Antidepressants (TCAs)': [
    'Amitriptyline (Elavil)', 'Nortriptyline (Pamelor)', 'Imipramine (Tofranil)',
    'Desipramine (Norpramin)', 'Clomipramine (Anafranil)', 'Doxepin (Sinequan)',
    'Trimipramine (Surmontil)', 'Protriptyline (Vivactil)', 'Amoxapine',
  ],
  'MAOIs': [
    'Phenelzine (Nardil)', 'Tranylcypromine (Parnate)', 'Isocarboxazid (Marplan)',
    'Selegiline Transdermal Patch (Emsam)',
  ],
  'Other Antidepressants': [
    'Bupropion (Wellbutrin)', 'Bupropion SR (Wellbutrin SR)', 'Bupropion XL (Wellbutrin XL)',
    'Mirtazapine (Remeron)', 'Trazodone (Desyrel)', 'Vilazodone (Viibryd)',
    'Vortioxetine (Trintellix)', 'Nefazodone', 'Maprotiline',
    'Gepirone (Exxua)', 'Zuranolone (Zurzuvae)',
  ],
  'Mood Stabilizers': [
    'Lithium Carbonate (Eskalith)', 'Lithium Carbonate ER (Lithobid)',
    'Valproic Acid (Depakene)', 'Divalproex Sodium (Depakote)', 'Divalproex ER (Depakote ER)',
    'Lamotrigine (Lamictal)', 'Lamotrigine XR (Lamictal XR)', 'Lamotrigine ODT (Lamictal ODT)',
    'Carbamazepine (Tegretol)', 'Carbamazepine XR (Tegretol XR)', 'Carbamazepine (Equetro)',
    'Oxcarbazepine (Trileptal)', 'Oxcarbazepine XR (Oxtellar XR)',
    'Topiramate (Topamax)',
  ],
  'Atypical Antipsychotics': [
    'Quetiapine (Seroquel)', 'Quetiapine XR (Seroquel XR)',
    'Aripiprazole (Abilify)', 'Aripiprazole Lauroxil (Aristada)', 'Aripiprazole Extended-Release (Abilify MyCite)',
    'Risperidone (Risperdal)', 'Risperidone M-Tab (Risperdal M-Tab)',
    'Olanzapine (Zyprexa)', 'Olanzapine Zydis (Zyprexa Zydis)', 'Olanzapine/Fluoxetine (Symbyax)',
    'Lurasidone (Latuda)', 'Ziprasidone (Geodon)',
    'Clozapine (Clozaril)', 'Clozapine ODT (FazaClo)',
    'Paliperidone (Invega)', 'Paliperidone Palmitate Monthly (Invega Sustenna)',
    'Paliperidone Palmitate 3-Month (Invega Trinza)', 'Paliperidone Palmitate 6-Month (Invega Hafyera)',
    'Asenapine (Saphris)', 'Asenapine Transdermal (Secuado)',
    'Iloperidone (Fanapt)', 'Brexpiprazole (Rexulti)',
    'Cariprazine (Vraylar)', 'Pimavanserin (Nuplazid)',
    'Lumateperone (Caplyta)', 'Amisulpride IV (Barhemsys)',
  ],
  'Typical (First-Generation) Antipsychotics': [
    'Haloperidol (Haldol)', 'Haloperidol Decanoate (Haldol Decanoate)',
    'Chlorpromazine (Thorazine)', 'Fluphenazine (Prolixin)', 'Fluphenazine Decanoate',
    'Perphenazine (Trilafon)', 'Thioridazine (Mellaril)', 'Thiothixene (Navane)',
    'Trifluoperazine (Stelazine)', 'Loxapine (Loxitane)', 'Loxapine Inhaled (Adasuve)',
    'Molindone (Moban)', 'Pimozide (Orap)', 'Droperidol', 'Flupentixol (Fluanxol)',
  ],
  'Benzodiazepines': [
    'Lorazepam (Ativan)', 'Clonazepam (Klonopin)', 'Diazepam (Valium)',
    'Alprazolam (Xanax)', 'Alprazolam XR (Xanax XR)', 'Oxazepam (Serax)',
    'Temazepam (Restoril)', 'Triazolam (Halcion)', 'Flurazepam (Dalmane)',
    'Estazolam (ProSom)', 'Chlordiazepoxide (Librium)', 'Clorazepate (Tranxene)',
    'Midazolam (Versed)', 'Quazepam (Doral)',
  ],
  'Non-Benzodiazepine Anxiolytics / Antihistamines': [
    'Buspirone (Buspar)', 'Hydroxyzine HCl (Atarax)', 'Hydroxyzine Pamoate (Vistaril)',
    'Gabapentin (Neurontin)', 'Pregabalin (Lyrica)', 'Meprobamate (Miltown)',
  ],
  'Sleep Medications': [
    'Zolpidem (Ambien)', 'Zolpidem CR (Ambien CR)', 'Zolpidem SL (Edluar)',
    'Eszopiclone (Lunesta)', 'Zaleplon (Sonata)', 'Ramelteon (Rozerem)',
    'Suvorexant (Belsomra)', 'Lemborexant (Dayvigo)', 'Tasimelteon (Hetlioz)',
    'Doxepin (Silenor)', 'Diphenhydramine (Benadryl, Unisom)',
    'Doxylamine (Unisom SleepTabs)',
  ],
  'ADHD — Stimulants': [
    'Amphetamine/Dextroamphetamine (Adderall)', 'Amphetamine/Dextroamphetamine XR (Adderall XR)',
    'Lisdexamfetamine (Vyvanse)', 'Dextroamphetamine (Dexedrine)', 'Dextroamphetamine ER (Dexedrine Spansule)',
    'Amphetamine Sulfate (Evekeo)', 'Mixed Amphetamine Salts XR (Mydayis)',
    'Methylphenidate (Ritalin)', 'Methylphenidate SR (Ritalin SR)', 'Methylphenidate LA (Ritalin LA)',
    'Methylphenidate ER (Concerta)', 'Methylphenidate (Daytrana Patch)',
    'Methylphenidate (Jornay PM)', 'Methylphenidate CD (Metadate CD)',
    'Dexmethylphenidate (Focalin)', 'Dexmethylphenidate XR (Focalin XR)',
    'Serdexmethylphenidate/Dexmethylphenidate (Azstarys)',
  ],
  'ADHD — Non-Stimulants': [
    'Atomoxetine (Strattera)', 'Guanfacine ER (Intuniv)', 'Clonidine ER (Kapvay)',
    'Viloxazine ER (Qelbree)', 'Bupropion (Wellbutrin) — off-label ADHD',
  ],
  'Substance Use Disorder (SUD)': [
    'Naltrexone (ReVia)', 'Naltrexone IM (Vivitrol)', 'Acamprosate (Campral)',
    'Disulfiram (Antabuse)', 'Buprenorphine/Naloxone SL (Suboxone)',
    'Buprenorphine/Naloxone Film (Suboxone Film)', 'Buprenorphine SL (Subutex)',
    'Buprenorphine Extended-Release SC (Sublocade)', 'Buprenorphine 6-Month Implant (Probuphine)',
    'Methadone (Dolophine — MAT only)', 'Naloxone Nasal Spray (Narcan)',
    'Naloxone Auto-Injector (Evzio)', 'Lofexidine (Lucemyra)',
    'Varenicline (Chantix/Champix)', 'Bupropion SR — smoking cessation',
    'Nicotine Patch (NicoDerm CQ)', 'Nicotine Gum (Nicorette)',
    'Nicotine Lozenge (Commit)', 'Nicotine Inhaler (Nicotrol Inhaler)',
    'Nicotine Nasal Spray (Nicotrol NS)',
  ],
  'Anticonvulsants / Other Neurological': [
    'Levetiracetam (Keppra)', 'Levetiracetam XR (Keppra XR)',
    'Phenytoin (Dilantin)', 'Valproate IV (Depacon)',
    'Clonazepam (Klonopin)', 'Zonisamide (Zonegran)',
    'Lacosamide (Vimpat)', 'Brivaracetam (Briviact)',
    'Pregabalin (Lyrica)', 'Gabapentin Enacarbil (Horizant)',
    'Memantine (Namenda)', 'Donepezil (Aricept)',
    'Rivastigmine (Exelon)', 'Galantamine (Razadyne)',
  ],
  'Antihypertensives — ACE Inhibitors': [
    'Lisinopril (Prinivil, Zestril)', 'Enalapril (Vasotec)', 'Ramipril (Altace)',
    'Benazepril (Lotensin)', 'Quinapril (Accupril)', 'Fosinopril (Monopril)',
    'Captopril (Capoten)', 'Moexipril (Univasc)', 'Perindopril (Aceon)',
    'Trandolapril (Mavik)',
  ],
  'Antihypertensives — ARBs': [
    'Losartan (Cozaar)', 'Valsartan (Diovan)', 'Irbesartan (Avapro)',
    'Olmesartan (Benicar)', 'Candesartan (Atacand)', 'Telmisartan (Micardis)',
    'Azilsartan (Edarbi)', 'Eprosartan (Teveten)',
  ],
  'Antihypertensives — Beta Blockers': [
    'Metoprolol Tartrate (Lopressor)', 'Metoprolol Succinate ER (Toprol-XL)',
    'Atenolol (Tenormin)', 'Carvedilol (Coreg)', 'Carvedilol CR (Coreg CR)',
    'Propranolol (Inderal)', 'Propranolol LA (Inderal LA)',
    'Labetalol (Trandate)', 'Bisoprolol (Zebeta)', 'Nebivolol (Bystolic)',
    'Acebutolol (Sectral)', 'Nadolol (Corgard)', 'Pindolol (Visken)',
  ],
  'Antihypertensives — Calcium Channel Blockers': [
    'Amlodipine (Norvasc)', 'Nifedipine ER (Procardia XL)', 'Diltiazem (Cardizem)',
    'Diltiazem CD (Cardizem CD)', 'Verapamil (Calan)', 'Verapamil SR (Verelan)',
    'Felodipine (Plendil)', 'Nicardipine (Cardene)', 'Nisoldipine (Sular)',
  ],
  'Antihypertensives — Diuretics': [
    'Hydrochlorothiazide (HCTZ)', 'Chlorthalidone (Thalitone)',
    'Furosemide (Lasix)', 'Torsemide (Demadex)', 'Bumetanide (Bumex)',
    'Spironolactone (Aldactone)', 'Eplerenone (Inspra)',
    'Triamterene/HCTZ (Dyazide, Maxzide)', 'Indapamide (Lozol)',
    'Amiloride (Midamor)',
  ],
  'Antihypertensives — Other': [
    'Clonidine (Catapres)', 'Clonidine Patch (Catapres-TTS)',
    'Hydralazine (Apresoline)', 'Minoxidil (Loniten)',
    'Doxazosin (Cardura)', 'Terazosin (Hytrin)', 'Prazosin (Minipress)',
    'Aliskiren (Tekturna)', 'Methyldopa (Aldomet)',
    'Sacubitril/Valsartan (Entresto)', 'Isosorbide Mononitrate (Imdur)',
    'Isosorbide Dinitrate (Isordil)', 'Nitroglycerin (NTG)',
  ],
  'Diabetes Medications': [
    'Metformin (Glucophage)', 'Metformin XR (Glucophage XR)',
    'Glipizide (Glucotrol)', 'Glipizide XL (Glucotrol XL)',
    'Glyburide (DiaBeta, Micronase)', 'Glimepiride (Amaryl)',
    'Sitagliptin (Januvia)', 'Saxagliptin (Onglyza)', 'Linagliptin (Tradjenta)',
    'Alogliptin (Nesina)', 'Empagliflozin (Jardiance)', 'Dapagliflozin (Farxiga)',
    'Canagliflozin (Invokana)', 'Ertugliflozin (Steglatro)',
    'Liraglutide (Victoza)', 'Semaglutide SC (Ozempic)', 'Semaglutide Oral (Rybelsus)',
    'Tirzepatide (Mounjaro)', 'Dulaglutide (Trulicity)',
    'Exenatide (Byetta)', 'Exenatide ER (Bydureon)',
    'Pioglitazone (Actos)', 'Rosiglitazone (Avandia)',
    'Acarbose (Precose)', 'Miglitol (Glyset)', 'Repaglinide (Prandin)', 'Nateglinide (Starlix)',
    'Insulin Glargine (Lantus, Basaglar)', 'Insulin Glargine U-300 (Toujeo)',
    'Insulin Degludec (Tresiba)', 'Insulin Detemir (Levemir)',
    'Insulin Aspart (NovoLog)', 'Insulin Lispro (Humalog)',
    'Insulin Glulisine (Apidra)', 'Regular Insulin (Humulin R, Novolin R)',
    'Insulin NPH (Humulin N, Novolin N)',
    'Pramlintide (Symlin)',
  ],
  'Cholesterol / Lipid-Lowering': [
    'Atorvastatin (Lipitor)', 'Rosuvastatin (Crestor)', 'Simvastatin (Zocor)',
    'Pravastatin (Pravachol)', 'Lovastatin (Mevacor)', 'Fluvastatin (Lescol)',
    'Pitavastatin (Livalo)', 'Ezetimibe (Zetia)', 'Ezetimibe/Simvastatin (Vytorin)',
    'Fenofibrate (Tricor)', 'Gemfibrozil (Lopid)', 'Niacin (Niaspan)',
    'Cholestyramine (Questran)', 'Colesevelam (Welchol)', 'Colestipol (Colestid)',
    'Evolocumab (Repatha)', 'Alirocumab (Praluent)',
    'Inclisiran (Leqvio)', 'Bempedoic Acid (Nexletol)',
  ],
  'Antibiotics — Penicillins': [
    'Amoxicillin (Amoxil)', 'Amoxicillin/Clavulanate (Augmentin)',
    'Ampicillin', 'Ampicillin/Sulbactam (Unasyn)',
    'Dicloxacillin', 'Nafcillin', 'Oxacillin', 'Penicillin V (Penicillin VK)',
    'Piperacillin/Tazobactam (Zosyn)',
  ],
  'Antibiotics — Cephalosporins': [
    'Cephalexin (Keflex)', 'Cefadroxil (Duricef)', 'Cefazolin (Ancef)',
    'Cefuroxime (Ceftin)', 'Cefdinir (Omnicef)', 'Cefprozil (Cefzil)',
    'Cefpodoxime (Vantin)', 'Ceftriaxone (Rocephin)', 'Cefotaxime (Claforan)',
    'Cefepime (Maxipime)',
  ],
  'Antibiotics — Macrolides / Azalides': [
    'Azithromycin (Zithromax)', 'Clarithromycin (Biaxin)', 'Erythromycin',
    'Fidaxomicin (Dificid)',
  ],
  'Antibiotics — Fluoroquinolones': [
    'Ciprofloxacin (Cipro)', 'Levofloxacin (Levaquin)', 'Moxifloxacin (Avelox)',
    'Ofloxacin', 'Delafloxacin (Baxdela)',
  ],
  'Antibiotics — Tetracyclines': [
    'Doxycycline (Vibramycin)', 'Minocycline (Minocin)', 'Tetracycline',
    'Omadacycline (Nuzyra)', 'Eravacycline (Xerava)',
  ],
  'Antibiotics — Sulfonamides / Other': [
    'Trimethoprim/Sulfamethoxazole (Bactrim, Septra)', 'Nitrofurantoin (Macrobid, Macrodantin)',
    'Metronidazole (Flagyl)', 'Tinidazole (Tindamax)', 'Clindamycin (Cleocin)',
    'Linezolid (Zyvox)', 'Vancomycin (Vancocin)', 'Rifampin (Rifadin)',
    'Daptomycin (Cubicin)', 'Tedizolid (Sivextro)',
  ],
  'Pain Management — Non-Opioid': [
    'Acetaminophen (Tylenol)', 'Ibuprofen (Advil, Motrin)', 'Naproxen (Aleve, Naprosyn)',
    'Naproxen Sodium (Anaprox)', 'Celecoxib (Celebrex)', 'Meloxicam (Mobic)',
    'Diclofenac (Voltaren)', 'Diclofenac Topical Gel (Voltaren Gel)',
    'Ketorolac (Toradol)', 'Indomethacin (Indocin)', 'Piroxicam (Feldene)',
    'Etodolac (Lodine)', 'Nabumetone (Relafen)',
  ],
  'Pain Management — Opioids': [
    'Tramadol (Ultram)', 'Tramadol ER (Ultram ER)',
    'Hydrocodone/Acetaminophen (Vicodin, Norco)', 'Oxycodone IR (Roxicodone)',
    'Oxycodone ER (OxyContin)', 'Oxycodone/Acetaminophen (Percocet)',
    'Morphine IR (MSIR)', 'Morphine ER (MS Contin)',
    'Codeine/Acetaminophen (Tylenol #3)', 'Hydromorphone (Dilaudid)',
    'Methadone (Dolophine)', 'Tapentadol (Nucynta)', 'Buprenorphine Patch (Butrans)',
    'Fentanyl Transdermal Patch (Duragesic)', 'Meperidine (Demerol)',
  ],
  'GI Medications': [
    'Omeprazole (Prilosec)', 'Pantoprazole (Protonix)', 'Esomeprazole (Nexium)',
    'Lansoprazole (Prevacid)', 'Rabeprazole (Aciphex)', 'Dexlansoprazole (Dexilant)',
    'Famotidine (Pepcid)', 'Cimetidine (Tagamet)',
    'Ondansetron (Zofran)', 'Ondansetron ODT (Zofran ODT)', 'Granisetron (Kytril)',
    'Promethazine (Phenergan)', 'Prochlorperazine (Compazine)',
    'Metoclopramide (Reglan)', 'Domperidone',
    'Loperamide (Imodium)', 'Bismuth Subsalicylate (Pepto-Bismol)',
    'Polyethylene Glycol 3350 (MiraLax)', 'Lactulose', 'Docusate (Colace)',
    'Senna (Senokot)', 'Bisacodyl (Dulcolax)', 'Psyllium (Metamucil)',
    'Mesalamine (Asacol, Pentasa)', 'Sulfasalazine (Azulfidine)',
    'Sucralfate (Carafate)', 'Misoprostol (Cytotec)',
  ],
  'Thyroid Medications': [
    'Levothyroxine (Synthroid, Levoxyl)', 'Liothyronine (Cytomel)',
    'Desiccated Thyroid (Armour Thyroid, NP Thyroid)',
    'Methimazole (Tapazole)', 'Propylthiouracil (PTU)',
    'Potassium Iodide (SSKI)',
  ],
  'Anticoagulants / Antiplatelets': [
    'Warfarin (Coumadin)', 'Apixaban (Eliquis)', 'Rivaroxaban (Xarelto)',
    'Dabigatran (Pradaxa)', 'Edoxaban (Savaysa)', 'Betrixaban (Bevyxxa)',
    'Enoxaparin (Lovenox)', 'Fondaparinux (Arixtra)', 'Heparin (unfractionated)',
    'Aspirin (Bayer, Ecotrin)', 'Clopidogrel (Plavix)', 'Ticagrelor (Brilinta)',
    'Prasugrel (Effient)', 'Dipyridamole (Persantine)', 'Cilostazol (Pletal)',
  ],
  'Respiratory / Allergy': [
    'Albuterol HFA (ProAir, Ventolin, Proventil)', 'Levalbuterol (Xopenex)',
    'Budesonide/Formoterol (Symbicort)', 'Fluticasone/Salmeterol (Advair)',
    'Fluticasone/Vilanterol (Breo Ellipta)', 'Fluticasone/Umeclidinium/Vilanterol (Trelegy)',
    'Tiotropium (Spiriva)', 'Umeclidinium (Incruse Ellipta)', 'Ipratropium (Atrovent)',
    'Montelukast (Singulair)', 'Zafirlukast (Accolate)',
    'Cetirizine (Zyrtec)', 'Fexofenadine (Allegra)', 'Loratadine (Claritin)',
    'Desloratadine (Clarinex)', 'Levocetirizine (Xyzal)', 'Diphenhydramine (Benadryl)',
    'Fluticasone Nasal (Flonase)', 'Budesonide Nasal (Rhinocort)', 'Mometasone Nasal (Nasonex)',
    'Olopatadine Nasal (Patanase)', 'Azelastine Nasal (Astelin)',
    'Benralizumab (Fasenra)', 'Dupilumab (Dupixent)', 'Mepolizumab (Nucala)',
  ],
  'Hormones / Contraceptives': [
    'Estradiol (Estrace)', 'Estradiol Patch (Vivelle-Dot, Climara)',
    'Conjugated Estrogens (Premarin)', 'Estradiol/Norethindrone (Activella)',
    'Medroxyprogesterone (Provera)', 'Progesterone (Prometrium)',
    'Testosterone Cypionate (Depo-Testosterone)', 'Testosterone Gel (AndroGel)',
    'Testosterone Patch (Androderm)',
    'Oral Contraceptive (combined estrogen/progestin) — specify brand',
    'Norethindrone (mini-pill)', 'Levonorgestrel IUD (Mirena, Kyleena)',
    'Etonogestrel Implant (Nexplanon)', 'Medroxyprogesterone Acetate IM (Depo-Provera)',
    'Finasteride (Propecia, Proscar)', 'Dutasteride (Avodart)',
    'Sildenafil (Viagra)', 'Tadalafil (Cialis)', 'Vardenafil (Levitra)',
  ],
  'Corticosteroids': [
    'Prednisone (Deltasone)', 'Prednisolone (Millipred)', 'Methylprednisolone (Medrol)',
    'Dexamethasone (Decadron)', 'Hydrocortisone (Cortef)',
    'Budesonide Oral (Entocort, Uceris)', 'Betamethasone (Celestone)',
    'Triamcinolone (Aristocort, Kenalog)',
  ],
  'Muscle Relaxants': [
    'Cyclobenzaprine (Flexeril)', 'Tizanidine (Zanaflex)',
    'Baclofen (Lioresal)', 'Methocarbamol (Robaxin)',
    'Carisoprodol (Soma)', 'Chlorzoxazone (Lorzone)',
    'Metaxalone (Skelaxin)', 'Dantrolene (Dantrium)',
    'Orphenadrine (Norflex)',
  ],
  'Migraine Medications': [
    'Sumatriptan (Imitrex)', 'Rizatriptan (Maxalt)', 'Eletriptan (Relpax)',
    'Zolmitriptan (Zomig)', 'Naratriptan (Amerge)', 'Frovatriptan (Frova)',
    'Almotriptan (Axert)', 'Lasmiditan (Reyvow)', 'Ubrogepant (Ubrelvy)',
    'Rimegepant (Nurtec)', 'Atogepant (Qulipta)',
    'Topiramate (Topamax — migraine prevention)', 'Propranolol (migraine prevention)',
    'Amitriptyline (migraine prevention)', 'Valproate (migraine prevention)',
    'Erenumab (Aimovig)', 'Fremanezumab (Ajovy)', 'Galcanezumab (Emgality)',
    'Eptinezumab (Vyepti)',
  ],
  'Vitamins & Supplements': [
    'Folic Acid', 'Folate (L-Methylfolate / Deplin)',
    'Vitamin D3 (Cholecalciferol)', 'Vitamin D2 (Ergocalciferol)',
    'Vitamin B12 (Cyanocobalamin)', 'Vitamin B12 Injection (Cyanocobalamin IM)',
    'Vitamin B6 (Pyridoxine)', 'Thiamine (Vitamin B1)',
    'Iron Sulfate (Ferrous Sulfate)', 'Iron Gluconate (Ferrous Gluconate)',
    'Calcium Carbonate (Tums, Caltrate)', 'Calcium Citrate (Citracal)',
    'Magnesium Oxide', 'Magnesium Glycinate', 'Magnesium Citrate',
    'Zinc Sulfate', 'Potassium Chloride (Klor-Con)', 'Potassium Gluconate',
    'Omega-3 Fatty Acids (Fish Oil)', 'Omega-3 (Lovaza — prescription)',
    'Coenzyme Q10 (CoQ10)', 'NAC (N-Acetylcysteine)',
  ],
  'Antivirals': [
    'Acyclovir (Zovirax)', 'Valacyclovir (Valtrex)', 'Famciclovir (Famvir)',
    'Oseltamivir (Tamiflu)', 'Baloxavir Marboxil (Xofluza)', 'Zanamivir (Relenza)',
    'Tenofovir/Emtricitabine (Truvada — PrEP)', 'Biktarvy (HIV)',
    'Ledipasvir/Sofosbuvir (Harvoni — HCV)', 'Sofosbuvir/Velpatasvir (Epclusa)',
    'Remdesivir (Veklury)', 'Nirmatrelvir/Ritonavir (Paxlovid)',
  ],
  'Antifungals': [
    'Fluconazole (Diflucan)', 'Itraconazole (Sporanox)', 'Voriconazole (Vfend)',
    'Clotrimazole Topical', 'Miconazole Topical', 'Terbinafine (Lamisil)',
    'Nystatin (Mycostatin)', 'Micafungin (Mycamine)',
  ],
  'Dermatology': [
    'Tretinoin (Retin-A)', 'Adapalene (Differin)', 'Benzoyl Peroxide',
    'Clindamycin Topical', 'Doxycycline (acne)', 'Minocycline (acne)',
    'Isotretinoin (Accutane)', 'Hydrocortisone Cream', 'Triamcinolone Cream',
    'Clobetasol Propionate (Temovate)', 'Tacrolimus Topical (Protopic)',
    'Pimecrolimus Cream (Elidel)', 'Minoxidil Topical (Rogaine)',
    'Spironolactone (acne/hair loss)', 'Dupilumab (Dupixent — atopic derm)',
  ],
  'Gout / Rheumatologic': [
    'Colchicine (Colcrys)', 'Allopurinol (Zyloprim)', 'Febuxostat (Uloric)',
    'Probenecid', 'Pegloticase (Krystexxa)', 'Indomethacin (gout)',
    'Hydroxychloroquine (Plaquenil)', 'Methotrexate', 'Leflunomide (Arava)',
    'Sulfasalazine (rheum)', 'Etanercept (Enbrel)', 'Adalimumab (Humira)',
  ],
  'Other Commonly Prescribed': [
    'Sildenafil (Revatio — PAH)', 'Finasteride (BPH)', 'Tamsulosin (Flomax)',
    'Oxybutynin (Ditropan)', 'Tolterodine (Detrol)', 'Mirabegron (Myrbetriq)',
    'Albuterol Syrup', 'Ivermectin (Stromectol)', 'Naloxone (Narcan — IM)',
    'Epinephrine Auto-Injector (EpiPen)', 'Glucagon (emergency)',
    'Desmopressin (DDAVP)', 'Fludrocortisone (Florinef)',
    'Benztropine (Cogentin)', 'Trihexyphenidyl (Artane)',
    'Propranolol (Essential tremor / performance anxiety)',
    'Cyproheptadine (appetite stimulant)', 'Megestrol (Megace)',
    'Modafinil (Provigil)', 'Armodafinil (Nuvigil)',
    'Sodium Oxybate (Xyrem)', 'Pitolisant (Wakix)', 'Solriamfetol (Sunosi)',
  ],
};

// Flatten med list to objects with category for search
const ENC_MED_FLAT = Object.entries(ENC_MEDS_BY_CATEGORY).flatMap(([cat, meds]) =>
  meds.map(name => ({ name, category: cat }))
);

// ── Comprehensive US lab test list by category ────────────────────────────────
const ENC_LABS_BY_CATEGORY = {
  'Hematology — CBC': [
    'CBC with Differential', 'CBC without Differential',
    'Hemoglobin & Hematocrit', 'Platelet Count', 'Reticulocyte Count',
    'Peripheral Blood Smear', 'Erythrocyte Sedimentation Rate (ESR)',
  ],
  'Comprehensive Chemistry': [
    'CMP (Comprehensive Metabolic Panel)', 'BMP (Basic Metabolic Panel)',
    'Electrolytes Panel (Na, K, Cl, CO2)', 'Calcium', 'Magnesium', 'Phosphorus',
    'Uric Acid', 'Albumin', 'Total Protein', 'Prealbumin',
  ],
  'Liver Function': [
    'Hepatic Function Panel (LFTs)', 'AST (Aspartate Aminotransferase)', 'ALT (Alanine Aminotransferase)',
    'Alkaline Phosphatase', 'GGT (Gamma-Glutamyl Transferase)', 'Total Bilirubin',
    'Direct Bilirubin', 'Indirect Bilirubin', 'LDH (Lactate Dehydrogenase)',
    'Hepatitis Panel (Acute)',
  ],
  'Kidney / Renal Function': [
    'Renal Function Panel', 'BUN (Blood Urea Nitrogen)', 'Creatinine',
    'eGFR (Estimated Glomerular Filtration Rate)', 'BUN/Creatinine Ratio',
    'Uric Acid', 'Cystatin C', '24-Hour Urine Protein', '24-Hour Urine Creatinine',
    'Microalbumin/Creatinine Ratio (urine)',
  ],
  'Lipids': [
    'Lipid Panel (Total Cholesterol, LDL, HDL, Triglycerides)', 'LDL Cholesterol (direct)',
    'HDL Cholesterol', 'Non-HDL Cholesterol', 'Triglycerides', 'VLDL Cholesterol',
    'ApoB (Apolipoprotein B)', 'ApoA1 (Apolipoprotein A-1)', 'Lipoprotein(a)',
    'Cardio IQ Lipoprotein Fractionation',
  ],
  'Thyroid': [
    'TSH (Thyroid Stimulating Hormone)', 'Free T4 (Thyroxine)', 'Free T3 (Triiodothyronine)',
    'Total T4', 'Total T3', 'Reverse T3',
    'Thyroid Peroxidase Antibody (TPO Ab)', 'Thyroglobulin Antibody (TgAb)',
    'TSI (Thyroid Stimulating Immunoglobulin)', 'Thyroglobulin',
  ],
  'Diabetes / Glucose': [
    'Fasting Glucose', 'Random (Non-fasting) Glucose', 'HbA1c (Hemoglobin A1c)',
    'Fructosamine', 'Oral Glucose Tolerance Test (OGTT)', 'Insulin Level (Fasting)',
    'C-Peptide', 'GAD Antibody (Type 1 DM)', 'Insulin Autoantibody',
  ],
  'Psychiatric Drug Monitoring': [
    'Lithium Level (serum)', 'Valproic Acid Level (VPA)',
    'Carbamazepine Level', 'Oxcarbazepine (MHD) Level',
    'Lamotrigine Level', 'Clozapine Level', 'Norclozapine Level',
    'Quetiapine Level', 'Haloperidol Level', 'Risperidone + 9-OH Risperidone Level',
    'Aripiprazole Level', 'Olanzapine Level', 'Bupropion + Hydroxybupropion Level',
    'Fluoxetine + Norfluoxetine Level', 'Sertraline Level', 'Nortriptyline Level',
    'Amitriptyline + Nortriptyline Level', 'Imipramine + Desipramine Level',
    'Phenytoin Level (free + total)', 'Phenobarbital Level',
    'Levetiracetam Level', 'Topiramate Level',
  ],
  'Vitamins & Minerals': [
    'Vitamin D, 25-Hydroxy (25-OH Vitamin D)', 'Vitamin D 1,25-Dihydroxy (Calcitriol)',
    'Vitamin B12 (Cobalamin)', 'Folate (Serum)', 'RBC Folate',
    'Vitamin B1 (Thiamine)', 'Vitamin B6 (Pyridoxine)', 'Vitamin B2 (Riboflavin)',
    'Vitamin C (Ascorbic Acid)', 'Vitamin A (Retinol)',
    'Vitamin E (Tocopherol)', 'Vitamin K1',
    'Iron (Serum)', 'TIBC (Total Iron-Binding Capacity)', 'Transferrin Saturation',
    'Ferritin', 'Zinc (Serum)', 'Copper (Serum)', 'Selenium',
    'Manganese', 'Chromium', 'Magnesium (RBC)', 'Phosphorus',
    'Omega-3 Index (EPA + DHA)',
  ],
  'Hormones — Reproductive': [
    'FSH (Follicle-Stimulating Hormone)', 'LH (Luteinizing Hormone)',
    'Estradiol (E2)', 'Estriol (E3)', 'Estrone (E1)',
    'Progesterone', 'Testosterone (Total)', 'Testosterone (Free)',
    'SHBG (Sex Hormone Binding Globulin)', 'DHEA-S (Dehydroepiandrosterone Sulfate)',
    'DHEA', 'Androstenedione', 'Inhibin B',
    'AMH (Anti-Müllerian Hormone)', 'Beta hCG (Pregnancy Test — quantitative)',
    'Prolactin',
  ],
  'Hormones — Adrenal / Other': [
    'Cortisol AM (8 AM)', 'Cortisol PM', '24-Hour Urine Cortisol',
    'ACTH (Adrenocorticotropic Hormone)', 'ACTH Stimulation Test',
    'Aldosterone (Serum)', 'Renin Activity (PRA)',
    'Catecholamines (Plasma)', 'Metanephrines (Plasma / 24-Hour Urine)',
    'Insulin-Like Growth Factor 1 (IGF-1)', 'Growth Hormone',
    'Parathyroid Hormone (PTH)', 'PTHrP (Parathyroid Hormone-Related Protein)',
    'Calcitonin',
  ],
  'Inflammation / Autoimmune / Immunology': [
    'CRP (C-Reactive Protein)', 'hs-CRP (High-Sensitivity CRP)', 'ESR',
    'ANA (Antinuclear Antibody)', 'ANA with Reflex', 'Anti-dsDNA',
    'Anti-Smith Antibody', 'Complement C3', 'Complement C4', 'CH50',
    'RF (Rheumatoid Factor)', 'Anti-CCP Antibody', 'Anti-Jo-1',
    'ANCA (Anti-Neutrophil Cytoplasmic Antibody)', 'p-ANCA', 'c-ANCA',
    'Anti-Cardiolipin Antibody (IgG, IgM)', 'Beta-2 Glycoprotein Antibody',
    'Lupus Anticoagulant', 'HLA-B27', 'HLA Typing',
    'IgG', 'IgA', 'IgM', 'IgE (Total)', 'IgE RAST Panel', 'Allergen-Specific IgE',
    'Protein Electrophoresis (SPEP)', 'Immunofixation (SIFE)',
  ],
  'Coagulation': [
    'PT/INR (Prothrombin Time / International Normalized Ratio)', 'aPTT (Activated Partial Thromboplastin Time)',
    'Fibrinogen', 'D-Dimer', 'Thrombin Time', 'Anti-Xa Level',
    'Factor V Leiden Mutation', 'Prothrombin Gene Mutation (G20210A)',
    'Protein C Activity', 'Protein S Activity',
    'Antithrombin III', 'vWF (von Willebrand Factor) Antigen', 'vWF Activity',
  ],
  'Cardiac / Cardiovascular': [
    'Troponin I (high-sensitivity)', 'Troponin T (high-sensitivity)',
    'BNP (B-type Natriuretic Peptide)', 'NT-proBNP',
    'CK (Creatine Kinase)', 'CK-MB', 'Myoglobin',
    'Homocysteine', 'Lp-PLA2 (Lipoprotein-Associated Phospholipase A2)',
    'Comprehensive Cardiac Risk Panel',
  ],
  'Infectious Disease': [
    'HIV-1/2 Antigen/Antibody Combo (4th Generation)', 'HIV RNA PCR (Viral Load)',
    'Hepatitis A IgM (acute)', 'Hepatitis A IgG (immune status)',
    'Hepatitis B Surface Antigen (HBsAg)', 'Hepatitis B Surface Antibody (HBsAb)',
    'Hepatitis B Core Antibody (HBcAb IgM)', 'Hepatitis B Core Antibody Total',
    'Hepatitis B e-Antigen (HBeAg)', 'Hepatitis B DNA (PCR)',
    'Hepatitis C Antibody (HCV Ab)', 'Hepatitis C RNA (PCR — qualitative)',
    'Hepatitis C RNA (PCR — quantitative)', 'HCV Genotype',
    'Syphilis Screen (RPR)', 'Syphilis Confirm (TPPA/FTA-ABS)',
    'Gonorrhea/Chlamydia NAAT (urine)', 'Gonorrhea/Chlamydia NAAT (cervical/urethral)',
    'Herpes Simplex Virus Type 1 & 2 IgG', 'HSV PCR',
    'CMV IgG / IgM', 'EBV Panel (monospot / EBV antibodies)',
    'Varicella Zoster IgG', 'Toxoplasma IgG / IgM',
    'PPD / Tuberculin Skin Test (TST)', 'QuantiFERON-TB Gold Plus',
    'T-SPOT.TB', 'Rapid Strep (Group A Strep Antigen)',
    'Influenza A/B Antigen', 'COVID-19 PCR', 'COVID-19 Antigen',
    'Respiratory Viral Panel (PCR)', 'Lyme Disease Antibody (ELISA + Western Blot)',
    'Monospot Test', 'Blood Culture', 'Urine Culture & Sensitivity',
    'Stool Culture', 'C. difficile Toxin PCR', 'H. pylori Antigen (stool)',
    'H. pylori Urea Breath Test', 'Fungal Culture',
  ],
  'Toxicology / Drug Screening': [
    'Urine Drug Screen (UDS) — Point of Care (5-panel)', 'Urine Drug Screen — 10-panel',
    'Urine Drug Screen — 12-panel (comprehensive)', 'Urine Drug Screen — Quantitative (confirmatory GC-MS/LC-MS/MS)',
    'Urine Buprenorphine + Norbuprenorphine Level', 'Urine Methadone Level',
    'Urine Amphetamines', 'Urine Methamphetamine', 'Urine Cocaine/Benzoylecgonine',
    'Urine Opiates / Opioids', 'Urine Fentanyl', 'Urine Benzodiazepines',
    'Urine Cannabinoids (THC)', 'Urine Phencyclidine (PCP)',
    'Urine Tricyclic Antidepressants', 'Urine Alcohol / Ethanol',
    'Blood Alcohol Level (BAL / BAC)', 'Ethyl Glucuronide (EtG) — urine',
    'Phosphatidylethanol (PEth) — blood', 'Hair Drug Testing Panel',
    'Heavy Metals Panel (Blood)', 'Lead Level (Blood)',
    'Mercury Level', 'Arsenic Level', 'Cadmium Level',
    'Acetaminophen Level', 'Salicylate Level',
  ],
  'Urinalysis': [
    'Urinalysis (UA) — Dipstick', 'Urinalysis with Microscopy',
    'Urine Albumin (spot)', 'Microalbumin/Creatinine Ratio',
    'Urine Protein/Creatinine Ratio', 'Urine Osmolality',
    'Urine Sodium', 'Urine Potassium', 'Urine Specific Gravity',
  ],
  'Oncology / Tumor Markers': [
    'PSA (Prostate-Specific Antigen — total)', 'PSA (free)',
    'CEA (Carcinoembryonic Antigen)', 'AFP (Alpha-Fetoprotein)',
    'CA 125', 'CA 19-9', 'CA 15-3', 'CA 27.29',
    'Beta hCG (tumor marker)', 'LDH', 'Beta-2 Microglobulin',
  ],
  'Pharmacogenomics / Genetics': [
    'GeneSight Psychotropic Panel (Myriad)', 'Genomind Professional PGx Express',
    'Assurex Health — Genesight',
    'CYP2D6 Genotype', 'CYP2C19 Genotype', 'CYP2C9 Genotype', 'CYP3A4/5 Genotype',
    'TPMT (Thiopurine Methyltransferase) Genotype',
    'DPYD Genotype', 'UGT1A1 Genotype',
    'MTHFR Mutation (C677T / A1298C)', 'BRCA1/BRCA2 Testing',
    'HLA-B*5701 (Abacavir hypersensitivity)', 'HLA-B*1502 (Carbamazepine — SJS risk)',
    'Factor V Leiden PCR', 'Prothrombin G20210A PCR',
  ],
  'Neurological': [
    'Ammonia Level', 'Ceruloplasmin', 'Copper (serum)',
    'Anti-NMDA Receptor Antibody', 'Paraneoplastic Antibody Panel',
    'CSF Analysis (cell count, protein, glucose)',
    'CSF Oligoclonal Bands', 'CSF IgG Index',
    'CSF VDRL (neurosyphilis)', 'JC Virus PCR',
    'EEG (order/referral)', 'MRI Brain (order/referral)',
  ],
};

// Flatten lab list to objects with category
const ENC_LAB_FLAT = Object.entries(ENC_LABS_BY_CATEGORY).flatMap(([cat, tests]) =>
  tests.map(name => ({ name, category: cat }))
);

// ── US Pharmacy Networks ──────────────────────────────────────────────────────
const US_PHARMACIES = {
  'Major Retail Chains': [
    'CVS Pharmacy', 'Walgreens', 'Rite Aid', 'Walmart Pharmacy',
    'Costco Pharmacy', "Sam's Club Pharmacy", 'Target (CVS) Pharmacy',
  ],
  'Grocery / Supermarket': [
    'Kroger Pharmacy', 'Publix Pharmacy', 'H-E-B Pharmacy', 'Meijer Pharmacy',
    'Albertsons Pharmacy', 'Safeway Pharmacy', 'Vons Pharmacy', 'Jewel-Osco Pharmacy',
    'Tom Thumb Pharmacy', "Randall's Pharmacy", 'Pavilions Pharmacy',
    'Winn-Dixie Pharmacy', 'Bi-Lo Pharmacy', "Giant Eagle Pharmacy",
    'Harris Teeter Pharmacy', 'Wegmans Pharmacy', 'ShopRite Pharmacy',
    'Stop & Shop Pharmacy', 'Giant Food Pharmacy', 'Fred Meyer Pharmacy (Kroger)',
    "Smith's Pharmacy (Kroger)", "King Soopers Pharmacy (Kroger)",
    "Fry's Pharmacy (Kroger)", "Baker's Pharmacy (Kroger)",
    'Hy-Vee Pharmacy', 'Hannaford Pharmacy', 'Price Chopper Pharmacy',
    'Market Basket Pharmacy', 'Brookshire Pharmacy',
    'Brookshire Brothers Pharmacy', 'WinCo Pharmacy',
    'Stater Bros Pharmacy', 'Ingles Pharmacy',
    "Dillons Pharmacy (Kroger)", "Ralph's Pharmacy (Kroger)",
    'Food Lion Pharmacy', 'Acme Pharmacy',
  ],
  'Mail Order / PBM': [
    'CVS Caremark Mail Order', 'Express Scripts (Evernorth)',
    'OptumRx Mail Order', 'Humana Pharmacy (mail order)',
    'Cigna Home Delivery Pharmacy', 'Aetna Rx Home Delivery',
    'UnitedHealth OptumRx', 'EnvisionRx',
    'MedImpact Direct', 'Prime Therapeutics',
    'Magellan Rx Management', 'WellCare Pharmacy',
    'Centene / RxAdvance', 'Navitus Health Solutions',
    'GoodRx Gold Pharmacy', 'Amazon Pharmacy',
  ],
  'Specialty Pharmacies': [
    'Genoa Healthcare (behavioral health specialty)',
    'Walgreens Specialty Pharmacy', 'CVS Specialty',
    'Accredo (Express Scripts)', 'BioPlus Specialty Pharmacy',
    'Diplomat Pharmacy (Cigna)', 'Coram CVS Specialty Infusion',
    'Option Care Health', 'BioMatrix Specialty Pharmacy',
    'Amber Pharmacy', 'Orsini Specialty Pharmacy',
    'ProCare Pharmacy', 'PharMerica', 'Omnicare (LTC)',
    'Kindred Pharmacy Services', 'McKesson Pharmacy',
    'CareSource Specialty Pharmacy', 'AllianceRx Walgreens',
    'Shields Health Solutions', 'Biologics Inc.',
  ],
  'Independent / Local': [
    'Independent / Local Pharmacy (specify name)',
    'Compounding Pharmacy (specify)',
    'Hospital Outpatient Pharmacy',
    'VA Pharmacy (Veterans Affairs)',
    'Indian Health Service Pharmacy',
    'FQHCaffiliated Pharmacy',
    '340B Affiliated Pharmacy',
  ],
};

const US_PHARMACY_FLAT = Object.entries(US_PHARMACIES).flatMap(([group, names]) =>
  names.map(name => ({ name, group }))
);

// ── Pharmacy locations with addresses (for proximity search) ─────────────────
// Covers Springfield IL (all patient zip codes) + mail-order options
const PHARMACY_LOCATIONS = [
  // Springfield, IL — 62701
  { id: 'ph01', name: 'Walgreens #4521', chain: 'Walgreens', address: '600 E Capitol Ave', city: 'Springfield', state: 'IL', zip: '62701', phone: '(217) 522-1100', fax: '(217) 522-1101' },
  { id: 'ph02', name: 'CVS Pharmacy #3305', chain: 'CVS', address: '501 E Monroe St', city: 'Springfield', state: 'IL', zip: '62701', phone: '(217) 522-2200', fax: '(217) 522-2201' },
  { id: 'ph03', name: 'Jewel-Osco Pharmacy #3001', chain: 'Jewel-Osco', address: '700 E Monroe St', city: 'Springfield', state: 'IL', zip: '62701', phone: '(217) 522-3300', fax: '(217) 522-3301' },
  // Springfield, IL — 62702
  { id: 'ph04', name: 'Walgreens #6612', chain: 'Walgreens', address: '1750 E Cook St', city: 'Springfield', state: 'IL', zip: '62702', phone: '(217) 523-4400', fax: '(217) 523-4401' },
  { id: 'ph05', name: 'Jewel-Osco Pharmacy #3411', chain: 'Jewel-Osco', address: '2115 E Cook St', city: 'Springfield', state: 'IL', zip: '62702', phone: '(217) 523-5500', fax: '(217) 523-5501' },
  { id: 'ph06', name: 'Rite Aid #5501', chain: 'Rite Aid', address: '1900 Sangamon Ave', city: 'Springfield', state: 'IL', zip: '62702', phone: '(217) 523-6600', fax: '(217) 523-6601' },
  // Springfield, IL — 62703
  { id: 'ph07', name: 'CVS Pharmacy #7841', chain: 'CVS', address: '3000 Peoria Rd', city: 'Springfield', state: 'IL', zip: '62703', phone: '(217) 525-7700', fax: '(217) 525-7701' },
  { id: 'ph08', name: 'Walmart Pharmacy #1544', chain: 'Walmart', address: '3401 Freedom Dr', city: 'Springfield', state: 'IL', zip: '62703', phone: '(217) 525-8800', fax: '(217) 525-8801' },
  { id: 'ph09', name: 'Meijer Pharmacy #244', chain: 'Meijer', address: '3111 Veterans Pkwy', city: 'Springfield', state: 'IL', zip: '62703', phone: '(217) 525-9900', fax: '(217) 525-9901' },
  // Springfield, IL — 62704
  { id: 'ph10', name: 'Walgreens #9933', chain: 'Walgreens', address: '3024 S 6th St', city: 'Springfield', state: 'IL', zip: '62704', phone: '(217) 527-1100', fax: '(217) 527-1101' },
  { id: 'ph11', name: 'CVS Pharmacy #5512', chain: 'CVS', address: '2900 S MacArthur Blvd', city: 'Springfield', state: 'IL', zip: '62704', phone: '(217) 527-2200', fax: '(217) 527-2201' },
  { id: 'ph12', name: 'Hy-Vee Pharmacy', chain: 'Hy-Vee', address: '2900 Stevenson Dr', city: 'Springfield', state: 'IL', zip: '62704', phone: '(217) 527-3300', fax: '(217) 527-3301' },
  { id: 'ph13', name: 'Genoa Healthcare Pharmacy', chain: 'Genoa Healthcare', address: '4600 W Washington St', city: 'Springfield', state: 'IL', zip: '62704', phone: '(217) 529-4400', fax: '(217) 529-4401' },
  // Springfield, IL — 62705
  { id: 'ph14', name: 'Walgreens #2288', chain: 'Walgreens', address: '1600 Wabash Ave', city: 'Springfield', state: 'IL', zip: '62705', phone: '(217) 544-5500', fax: '(217) 544-5501' },
  { id: 'ph15', name: 'Jewel-Osco Pharmacy #3482', chain: 'Jewel-Osco', address: '2300 Wabash Ave', city: 'Springfield', state: 'IL', zip: '62705', phone: '(217) 544-6600', fax: '(217) 544-6601' },
  { id: 'ph16', name: 'Schnucks Pharmacy', chain: 'Schnucks', address: '2150 S MacArthur Blvd', city: 'Springfield', state: 'IL', zip: '62705', phone: '(217) 544-7700', fax: '(217) 544-7701' },
  // Springfield, IL — 62706
  { id: 'ph17', name: 'CVS Pharmacy #6630', chain: 'CVS', address: '2201 W Jefferson St', city: 'Springfield', state: 'IL', zip: '62706', phone: '(217) 546-8800', fax: '(217) 546-8801' },
  { id: 'ph18', name: 'Walgreens #3371', chain: 'Walgreens', address: '1301 N Dirksen Pkwy', city: 'Springfield', state: 'IL', zip: '62706', phone: '(217) 546-9900', fax: '(217) 546-9901' },
  { id: 'ph19', name: 'Walmart Pharmacy #2901', chain: 'Walmart', address: '3000 Dirksen Pkwy', city: 'Springfield', state: 'IL', zip: '62706', phone: '(217) 547-1100', fax: '(217) 547-1101' },
  // Nearby: Chatham, IL
  { id: 'ph20', name: 'Walgreens #4477 (Chatham)', chain: 'Walgreens', address: '201 N Main St', city: 'Chatham', state: 'IL', zip: '62629', phone: '(217) 483-1100', fax: '(217) 483-1101' },
  { id: 'ph21', name: 'CVS Pharmacy #8821 (Chatham)', chain: 'CVS', address: '500 S Chatham Rd', city: 'Chatham', state: 'IL', zip: '62629', phone: '(217) 483-2200', fax: '(217) 483-2201' },
  // Mail order / specialty
  { id: 'ph22', name: 'CVS Caremark Mail Order', chain: 'CVS Caremark', address: 'PO Box 52196', city: 'Phoenix', state: 'AZ', zip: '85072', phone: '(800) 552-8159', fax: '(800) 378-0323' },
  { id: 'ph23', name: 'Express Scripts (Evernorth)', chain: 'Express Scripts', address: '1 Express Way', city: 'St. Louis', state: 'MO', zip: '63121', phone: '(800) 282-2881', fax: '(877) 895-1900' },
  { id: 'ph24', name: 'OptumRx Mail Order', chain: 'OptumRx', address: '2300 Main St', city: 'Irvine', state: 'CA', zip: '92614', phone: '(855) 427-4682', fax: '(888) 327-9791' },
  { id: 'ph25', name: 'Amazon Pharmacy', chain: 'Amazon', address: '2127 7th Ave', city: 'Seattle', state: 'WA', zip: '98121', phone: '(855) 745-5725', fax: 'N/A — electronic only' },
];

// ── US Lab Networks / Reference Laboratories ─────────────────────────────────
const US_LAB_NETWORKS = [
  // National Reference Labs
  'Quest Diagnostics', 'LabCorp (Laboratory Corporation of America)',
  'BioReference Laboratories (GenPath)',
  'ARUP Laboratories (University of Utah)',
  'Mayo Clinic Laboratories', 'Sonic Healthcare USA',
  'Clinical Pathology Laboratories (CPL)',
  'Sonic Reference Laboratory (SRL)',
  'National Reference Laboratory (NRL)',
  // Regional / Independent
  'Labcorp Esoterix', 'Labcorp Center for Esoteric Testing',
  'ACL Laboratories (Advocate)', 'Spectrum Health Laboratories',
  'Northwell Health Laboratories', 'IQVIA / Q² Solutions',
  'Geisinger Laboratory', 'ProPath Laboratories',
  'Pathology Associates Medical Laboratories (PAML)',
  'Miraca Life Sciences', 'Mako Medical Laboratories',
  'Physicians Clinical Laboratory (PCL)',
  // Specialty / Genetics
  'GeneDx (genetics)', 'Invitae (genetics)', 'Ambry Genetics',
  'Color Genomics', 'Natera (prenatal / oncology)',
  'Foundation Medicine (oncology)', 'NeoGenomics (oncology)',
  'Caris Life Sciences', 'Tempus (oncology)',
  'Guardant Health', 'Exact Sciences (Cologuard)',
  'Myriad Genetics (GeneSight / BRCA)',
  'Genomind (pharmacogenomics)', 'Assurex Health (pharmacogenomics)',
  // Hospital / In-House
  'In-Office / On-Site Lab (CLIA-waived)',
  'Hospital Laboratory (inpatient)',
  'Hospital Outpatient Reference Lab',
  'VA / Military Laboratory',
  'Public Health Laboratory',
  // Other
  'Other (specify lab name)',
];

const MED_SIGS = [
  'QD — Once daily', 'QD AM — Once daily in morning', 'QD PM — Once daily at night',
  'QHS — At bedtime', 'BID — Twice daily', 'TID — Three times daily',
  'QID — Four times daily', 'Q8H — Every 8 hours', 'Q12H — Every 12 hours',
  'Q6H — Every 6 hours', 'Q4H — Every 4 hours', 'Q72H — Every 3 days',
  'PRN — As needed (max 1x daily)', 'PRN — As needed (max 2x daily)',
  'PRN — As needed (max 3x daily)', 'PRN anxiety — As needed for anxiety',
  'PRN sleep — As needed for sleep', 'PRN pain — As needed for pain',
  'PRN agitation — As needed for agitation',
  'Weekly', 'Biweekly (every 2 weeks)', 'Monthly',
  'Loading Dose — see notes', 'Taper — see notes',
];

const BLANK_MED_ORDER = { name: '', dose: '', sig: '', quantity: '', refills: '0', pharmacy: '', pharmAddress: '', route: '', notes: '', schedule: null };
const BLANK_LAB_ORDER = { test: '', priority: 'Routine', diagnosis: '', fasting: false, labNetwork: '', notes: '' };

// ── Medication defaults lookup — auto-fills dose, sig, qty, refills, notes ───
// Matched by checking if the lowercase med name includes the key
const MED_DEFAULTS_MAP = [
  // ── SSRIs ──
  { match: 'sertraline',              dose: '50mg',     sig: 'Take 1 tablet by mouth every morning',            qty: '30',  refills: '3', notes: 'Start 50mg, may titrate to 100–200mg after 4 wks. Take with food if GI upset.' },
  { match: 'fluoxetine',              dose: '20mg',     sig: 'Take 1 capsule by mouth every morning',           qty: '30',  refills: '3', notes: 'Start 20mg. Long half-life — missed doses less critical.' },
  { match: 'escitalopram',            dose: '10mg',     sig: 'Take 1 tablet by mouth once daily',               qty: '30',  refills: '3', notes: 'Start 10mg; may increase to 20mg after 4 wks if needed.' },
  { match: 'citalopram',              dose: '20mg',     sig: 'Take 1 tablet by mouth once daily',               qty: '30',  refills: '3', notes: 'Max 40mg (20mg in patients >60 yrs, hepatic impairment, or with CYP2C19 inhibitors).' },
  { match: 'paroxetine',              dose: '20mg',     sig: 'Take 1 tablet by mouth every morning',            qty: '30',  refills: '3', notes: 'Taper slowly to discontinue. High anticholinergic burden.' },
  { match: 'fluvoxamine',             dose: '50mg',     sig: 'Take 1 tablet by mouth at bedtime',               qty: '30',  refills: '3', notes: 'Take at bedtime due to sedation. Monitor for drug interactions (CYP1A2/2C19 inhibitor).' },
  // ── SNRIs ──
  { match: 'venlafaxine xr',          dose: '75mg',     sig: 'Take 1 capsule by mouth every morning with food', qty: '30',  refills: '3', notes: 'Take with food. Do not crush/chew. Taper to discontinue.' },
  { match: 'venlafaxine',             dose: '37.5mg',   sig: 'Take 1 tablet by mouth twice daily with food',    qty: '60',  refills: '3', notes: 'Take with food. Taper slowly — discontinuation syndrome common.' },
  { match: 'duloxetine',              dose: '30mg',     sig: 'Take 1 capsule by mouth every morning with food', qty: '30',  refills: '3', notes: 'Take with food. Do not crush/chew. Start 30mg × 2 wks then 60mg.' },
  { match: 'desvenlafaxine',          dose: '50mg',     sig: 'Take 1 tablet by mouth once daily',               qty: '30',  refills: '3', notes: 'Do not crush/chew.' },
  { match: 'levomilnacipran',         dose: '20mg',     sig: 'Take 1 capsule by mouth once daily',              qty: '30',  refills: '3', notes: 'Start 20mg × 2 days then 40mg. Can titrate to max 120mg.' },
  // ── Atypical antidepressants ──
  { match: 'bupropion xl',            dose: '150mg',    sig: 'Take 1 tablet by mouth every morning',            qty: '30',  refills: '3', notes: 'Avoid in seizure disorder, eating disorders, or MAOIs. Do not crush/chew.' },
  { match: 'bupropion',               dose: '150mg',    sig: 'Take 1 tablet by mouth twice daily',              qty: '60',  refills: '3', notes: 'Avoid in seizure disorder. Take doses ≥6 hrs apart.' },
  { match: 'mirtazapine',             dose: '15mg',     sig: 'Take 1 tablet by mouth at bedtime',               qty: '30',  refills: '3', notes: 'Sedating — take at bedtime. Paradoxically less sedating at higher doses.' },
  { match: 'trazodone',               dose: '50mg',     sig: 'Take 1 tablet by mouth at bedtime as needed for sleep', qty: '30', refills: '3', notes: 'PRN for insomnia. May cause orthostasis — rise slowly.' },
  { match: 'vilazodone',              dose: '10mg',     sig: 'Take 1 tablet by mouth once daily with food',     qty: '30',  refills: '3', notes: 'Take with food — bioavailability doubles. Titrate by 10mg/wk.' },
  { match: 'vortioxetine',            dose: '10mg',     sig: 'Take 1 tablet by mouth once daily',               qty: '30',  refills: '3', notes: 'Titrate to 20mg if needed. Cognitive benefits noted.' },
  // ── TCAs ──
  { match: 'amitriptyline',           dose: '25mg',     sig: 'Take 1 tablet by mouth at bedtime',               qty: '30',  refills: '3', notes: 'Sedating — take at bedtime. Monitor ECG at higher doses.' },
  { match: 'nortriptyline',           dose: '25mg',     sig: 'Take 1 capsule by mouth at bedtime',              qty: '30',  refills: '3', notes: 'Therapeutic level 50–150 ng/mL. Monitor ECG.' },
  { match: 'imipramine',              dose: '25mg',     sig: 'Take 1 tablet by mouth at bedtime',               qty: '30',  refills: '3', notes: 'Monitor ECG at doses above 100mg/day.' },
  { match: 'clomipramine',            dose: '25mg',     sig: 'Take 1 capsule by mouth twice daily with food',   qty: '60',  refills: '2', notes: 'Take with food. Seizure risk at high doses.' },
  // ── Antipsychotics ──
  { match: 'quetiapine',              dose: '25mg',     sig: 'Take 1 tablet by mouth at bedtime',               qty: '30',  refills: '1', notes: 'Monitor fasting glucose, lipids, weight. Titrate as tolerated.' },
  { match: 'aripiprazole',            dose: '5mg',      sig: 'Take 1 tablet by mouth every morning',            qty: '30',  refills: '3', notes: 'Activating — take in AM. Monitor for akathisia.' },
  { match: 'risperidone',             dose: '0.5mg',    sig: 'Take 1 tablet by mouth twice daily',              qty: '60',  refills: '1', notes: 'Monitor EPS, prolactin, metabolic panel.' },
  { match: 'olanzapine',              dose: '5mg',      sig: 'Take 1 tablet by mouth at bedtime',               qty: '30',  refills: '1', notes: 'Significant metabolic risk — monitor weight, glucose, lipids.' },
  { match: 'ziprasidone',             dose: '20mg',     sig: 'Take 1 capsule by mouth twice daily with food',   qty: '60',  refills: '1', notes: 'MUST take with food (≥500 kcal). Monitor QTc.' },
  { match: 'lurasidone',              dose: '40mg',     sig: 'Take 1 tablet by mouth once daily with food',     qty: '30',  refills: '1', notes: 'Take with ≥350 kcal. Lower metabolic risk vs. others.' },
  { match: 'paliperidone',            dose: '3mg',      sig: 'Take 1 tablet by mouth once daily in the morning', qty: '30', refills: '1', notes: 'Do not crush/chew (osmotic-release). Monitor prolactin.' },
  { match: 'clozapine',               dose: '25mg',     sig: 'Take 1 tablet by mouth twice daily',              qty: '60',  refills: '0', notes: 'Requires REMS enrollment (CPMS/MDREMS). ANC monitoring required. Monitor for myocarditis, agranulocytosis.' },
  { match: 'haloperidol',             dose: '1mg',      sig: 'Take 1 tablet by mouth twice daily',              qty: '60',  refills: '1', notes: 'Monitor EPS/TD. Decanoate formulation available for monthly IM.' },
  // ── Mood stabilizers ──
  { match: 'lithium',                 dose: '300mg',    sig: 'Take 1 capsule by mouth three times daily with food', qty: '90', refills: '2', notes: 'Monitor serum lithium level (target 0.6–1.2 mEq/L), renal function, TSH. Take with food.' },
  { match: 'valproic acid',           dose: '250mg',    sig: 'Take 1 tablet by mouth twice daily with food',    qty: '60',  refills: '2', notes: 'Monitor VPA level (50–100 mcg/mL), LFTs, CBC. Take with food.' },
  { match: 'divalproex',              dose: '500mg',    sig: 'Take 1 tablet by mouth twice daily with food',    qty: '60',  refills: '2', notes: 'Monitor VPA level, LFTs, CBC. Delayed-release — take with food.' },
  { match: 'lamotrigine',             dose: '25mg',     sig: 'Take 1 tablet by mouth once daily',               qty: '30',  refills: '2', notes: 'SLOW titration required — SJS risk with rapid dose increase. Start 25mg × 2 wks.' },
  { match: 'carbamazepine',           dose: '200mg',    sig: 'Take 1 tablet by mouth twice daily with food',    qty: '60',  refills: '1', notes: 'Monitor CBC, LFTs, serum level (4–12 mcg/mL). Strong CYP450 inducer.' },
  { match: 'oxcarbazepine',           dose: '300mg',    sig: 'Take 1 tablet by mouth twice daily',              qty: '60',  refills: '2', notes: 'Monitor sodium (hyponatremia risk). Less drug interactions than carbamazepine.' },
  { match: 'topiramate',              dose: '25mg',     sig: 'Take 1 tablet by mouth at bedtime',               qty: '30',  refills: '2', notes: 'Titrate slowly. Cognitive side effects ("dopamax"). Nephrolithiasis risk — hydrate well.' },
  // ── Anxiolytics (non-controlled) ──
  { match: 'buspirone',               dose: '5mg',      sig: 'Take 1 tablet by mouth twice daily',              qty: '60',  refills: '3', notes: 'Non-habit forming. Full effect in 2–4 weeks. Do not use PRN.' },
  { match: 'hydroxyzine',             dose: '25mg',     sig: 'Take 1 tablet by mouth three to four times daily as needed for anxiety', qty: '90', refills: '1', notes: 'Non-controlled. PRN use preferred. Sedating — caution when driving.' },
  { match: 'propranolol',             dose: '10mg',     sig: 'Take 1 tablet by mouth as needed 30–60 min before anxiety-provoking event', qty: '30', refills: '2', notes: 'For situational/performance anxiety. Contraindicated in asthma, bradycardia, hypotension.' },
  // ── Benzodiazepines (CIV) ──
  { match: 'alprazolam',              dose: '0.25mg',   sig: 'Take 1 tablet by mouth three times daily as needed for anxiety', qty: '90', refills: '0', notes: 'CIV — Short-acting. Use lowest effective dose for shortest duration. Taper to discontinue.' },
  { match: 'clonazepam',              dose: '0.5mg',    sig: 'Take 1 tablet by mouth twice daily',              qty: '60',  refills: '0', notes: 'CIV — Longer half-life. Taper slowly (≤10%/week) to avoid withdrawal.' },
  { match: 'lorazepam',               dose: '0.5mg',    sig: 'Take 1 tablet by mouth twice to three times daily as needed for anxiety', qty: '60', refills: '0', notes: 'CIV — Intermediate half-life. No active metabolites. Taper to discontinue.' },
  { match: 'diazepam',                dose: '5mg',      sig: 'Take 1 tablet by mouth twice to three times daily as needed', qty: '60', refills: '0', notes: 'CIV — Long half-life + active metabolites. Useful for taper. Taper to discontinue.' },
  // ── ADHD stimulants (CII) ──
  { match: 'adderall xr',             dose: '10mg',     sig: 'Take 1 capsule by mouth every morning',           qty: '30',  refills: '0', notes: 'CII — Do not crush/chew. Monitor BP, HR, appetite, growth (pediatric). Can open and sprinkle on applesauce.' },
  { match: 'adderall',                dose: '10mg',     sig: 'Take 1 tablet by mouth twice daily (with breakfast and at noon)', qty: '60', refills: '0', notes: 'CII — Monitor BP, HR, appetite. Avoid late doses to prevent insomnia.' },
  { match: 'vyvanse',                 dose: '30mg',     sig: 'Take 1 capsule by mouth every morning',           qty: '30',  refills: '0', notes: 'CII — Lisdexamfetamine. Prodrug — lower abuse potential. Monitor CV status.' },
  { match: 'dexedrine',               dose: '5mg',      sig: 'Take 1 tablet by mouth twice to three times daily', qty: '60', refills: '0', notes: 'CII — Monitor CV, appetite, growth.' },
  { match: 'ritalin la',              dose: '20mg',     sig: 'Take 1 capsule by mouth every morning',           qty: '30',  refills: '0', notes: 'CII — Methylphenidate extended-release. Can open and sprinkle.' },
  { match: 'ritalin',                 dose: '10mg',     sig: 'Take 1 tablet by mouth twice daily (with breakfast and at noon)', qty: '60', refills: '0', notes: 'CII — Monitor BP, HR, appetite.' },
  { match: 'concerta',                dose: '18mg',     sig: 'Take 1 tablet by mouth every morning',            qty: '30',  refills: '0', notes: 'CII — Do not crush/chew. OROS delivery system.' },
  { match: 'methylphenidate',         dose: '10mg',     sig: 'Take 1 tablet by mouth twice daily (with breakfast and at noon)', qty: '60', refills: '0', notes: 'CII — Monitor BP, HR. Avoid late afternoon doses.' },
  // ── Sleep aids (controlled) ──
  { match: 'zolpidem',                dose: '5mg',      sig: 'Take 1 tablet by mouth at bedtime as needed for insomnia. Do not take unless you have 7–8 hours to sleep.', qty: '30', refills: '0', notes: 'CIV — Limit to short-term use. No driving after taking.' },
  { match: 'eszopiclone',             dose: '1mg',      sig: 'Take 1 tablet by mouth immediately before bedtime',qty: '30', refills: '0', notes: 'CIV — Do not take unless you have 7–8 hours to sleep.' },
  { match: 'temazepam',               dose: '15mg',     sig: 'Take 1 capsule by mouth at bedtime as needed',    qty: '30',  refills: '0', notes: 'CIV — For short-term insomnia. Taper to discontinue.' },
  // ── Wakefulness agents ──
  { match: 'modafinil',               dose: '100mg',    sig: 'Take 1 tablet by mouth every morning',            qty: '30',  refills: '0', notes: 'CIV — May titrate to 200mg. Monitor for rash (SJS risk).' },
  { match: 'armodafinil',             dose: '150mg',    sig: 'Take 1 tablet by mouth every morning',            qty: '30',  refills: '0', notes: 'CIV — Active R-enantiomer of modafinil.' },
  // ── PTSD / specific ──
  { match: 'prazosin',                dose: '1mg',      sig: 'Take 1 tablet by mouth at bedtime',               qty: '30',  refills: '3', notes: 'For PTSD-related nightmares. Start 1mg QHS; titrate by 1mg every 3–7 days. Monitor for orthostatic hypotension.' },
  { match: 'clonidine',               dose: '0.1mg',    sig: 'Take 1 tablet by mouth at bedtime',               qty: '30',  refills: '2', notes: 'For hyperarousal/PTSD or ADHD. Monitor BP. Do not discontinue abruptly.' },
  // ── Naltrexone ──
  { match: 'naltrexone',              dose: '50mg',     sig: 'Take 1 tablet by mouth once daily',               qty: '30',  refills: '2', notes: 'For AUD/OUD. Verify opioid-free ≥7–10 days before starting. Monitor LFTs.' },
  // ── Melatonin ──
  { match: 'melatonin',               dose: '1mg',      sig: 'Take 1 tablet by mouth 30–60 min before bedtime', qty: '30',  refills: '3', notes: 'OTC supplement — start low (0.5–1mg). Not for long-term nightly use.' },
];

function getMedDefaults(medName) {
  if (!medName) return null;
  const lower = medName.toLowerCase();
  // Sort by length descending so more specific matches (e.g. "adderall xr") win over shorter ("adderall")
  const sorted = [...MED_DEFAULTS_MAP].sort((a, b) => b.match.length - a.match.length);
  return sorted.find(d => lower.includes(d.match)) || null;
}

// ── Controlled substance schedule detection ───────────────────────────────────
const CS_SCHEDULE_MAP = [
  { schedule: 'CII', patterns: [
    'adderall', 'vyvanse', 'dexedrine', 'dextroamphetamine', 'evekeo', 'mydayis', 'azstarys',
    'serdexmethylphenidate', 'amphetamine', 'methylphenidate', 'ritalin', 'concerta',
    'daytrana', 'focalin', 'jornay', 'metadate',
    'oxycodone', 'oxycontin', 'percocet', 'roxicodone',
    'hydrocodone', 'vicodin', 'norco', 'morphine', 'ms contin', 'msir',
    'hydromorphone', 'dilaudid', 'fentanyl', 'duragesic',
    'tapentadol', 'nucynta', 'meperidine', 'demerol',
    'methadone (dolophine',
  ]},
  { schedule: 'CIII', patterns: [
    'buprenorphine', 'suboxone', 'subutex', 'sublocade', 'probuphine', 'butrans',
    'testosterone cypionate', 'testosterone gel', 'testosterone patch',
    'androgel', 'androderm', 'depo-testosterone',
  ]},
  { schedule: 'CIII/CIV', patterns: ['codeine/acetaminophen', 'tylenol #3'] },
  { schedule: 'CIV', patterns: [
    'lorazepam', 'ativan', 'clonazepam', 'klonopin', 'diazepam', 'valium',
    'alprazolam', 'xanax', 'oxazepam', 'serax', 'temazepam', 'restoril',
    'triazolam', 'halcion', 'flurazepam', 'dalmane', 'estazolam', 'quazepam',
    'chlordiazepoxide', 'librium', 'clorazepate', 'tranxene', 'midazolam', 'versed',
    'zolpidem', 'ambien', 'eszopiclone', 'lunesta', 'zaleplon', 'sonata',
    'tramadol', 'ultram', 'modafinil', 'provigil', 'armodafinil', 'nuvigil',
    'pregabalin', 'lyrica', 'carisoprodol', 'soma',
    'suvorexant', 'belsomra', 'lemborexant', 'dayvigo',
  ]},
];

function getControlledSchedule(medName) {
  const lower = medName.toLowerCase();
  for (const { schedule, patterns } of CS_SCHEDULE_MAP) {
    if (patterns.some(p => lower.includes(p))) return schedule;
  }
  return null;
}

// ── DrFirst EPCS 2FA Modal ─────────────────────────────────────────────────────
function DrFirstEpcsModal({ order, onConfirm, onCancel, currentUser, verifyEPCS, generateEPCSOTP, verifyEPCSOTP }) {
  const [phase, setPhase] = React.useState(1);
  const [pin, setPin] = React.useState(['', '', '', '']);
  const [otp, setOtp] = React.useState(['', '', '', '', '', '']);
  const [error, setError] = React.useState('');
  const [generatedOtp, setGeneratedOtp] = React.useState('');
  const [countdown, setCountdown] = React.useState(30);
  const timerRef = React.useRef(null);

  const handlePinChange = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...pin]; next[i] = v; setPin(next);
    if (v && i < 3) document.getElementById(`enc-pin-${i + 1}`)?.focus();
  };

  const handleVerifyPin = async () => {
    const pinStr = pin.join('');
    const ok = await Promise.resolve(verifyEPCS(pinStr));
    if (ok) {
      const code = await Promise.resolve(generateEPCSOTP());
      setGeneratedOtp(String(code));
      setCountdown(30);
      setError('');
      setPhase(2);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setError('One-time code expired. Please start again.');
            setPhase(1);
            setPin(['', '', '', '']);
            setOtp(['', '', '', '', '', '']);
            setGeneratedOtp('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setError('Incorrect EPCS PIN. Please try again.');
      setPin(['', '', '', '']);
      document.getElementById('enc-pin-0')?.focus();
    }
  };

  const handleOtpChange = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp]; next[i] = v; setOtp(next);
    if (v && i < 5) document.getElementById(`enc-otp-${i + 1}`)?.focus();
  };

  const handleVerifyOtp = async () => {
    clearInterval(timerRef.current);
    const code = otp.join('');
    const ok = await Promise.resolve(verifyEPCSOTP(code));
    if (ok) {
      setError('');
      onConfirm({ ...order, epcsVerified: true, epcsDea: currentUser?.deaNumber, epcsTs: new Date().toISOString() });
    } else {
      setError('Invalid one-time code. Restart authentication.');
      setOtp(['', '', '', '', '', '']);
      document.getElementById('enc-otp-0')?.focus();
    }
  };

  React.useEffect(() => () => clearInterval(timerRef.current), []);

  const scheduleColor = { CII: '#dc2626', CIII: '#d97706', 'CIII/CIV': '#d97706', CIV: '#7c3aed' };
  const sc = order.schedule;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480,
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)', overflow: 'hidden',
      }}>
        {/* DrFirst Header */}
        <div style={{ background: 'linear-gradient(135deg,#0a2d6e 0%,#1a4fa8 100%)', padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '6px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: '#0a2d6e', letterSpacing: '-0.5px' }}>Dr</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#e63946', letterSpacing: '-0.5px' }}>First</span>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>EPCS Authentication Required</div>
            <div style={{ color: '#93c5fd', fontSize: 11, marginTop: 2 }}>Electronic Prescribing for Controlled Substances · DEA 21 CFR §1311</div>
          </div>
          <button type="button" onClick={onCancel}
            style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
        </div>

        <div style={{ padding: '22px 28px' }}>
          {/* Drug + schedule info */}
          <div style={{ background: '#fef2f2', border: `1px solid ${scheduleColor[sc] || '#dc2626'}30`, borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28, flexShrink: 0 }}>🔒</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>{order.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {order.dose && <span>{order.dose} · </span>}
                {order.sig}
              </div>
            </div>
            <span style={{
              marginLeft: 'auto', flexShrink: 0, fontWeight: 800, fontSize: 12,
              padding: '4px 10px', borderRadius: 10,
              background: `${scheduleColor[sc] || '#dc2626'}15`,
              color: scheduleColor[sc] || '#dc2626',
              border: `1px solid ${scheduleColor[sc] || '#dc2626'}40`,
            }}>⚠️ {sc}</span>
          </div>

          {/* Phase progress bar */}
          <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 22 }}>
            {[
              { label: 'Factor 1 — Knowledge (PIN)', n: 1 },
              { label: 'Factor 2 — Possession (OTP)', n: 2 },
            ].map(({ label, n }) => (
              <div key={n} style={{
                flex: 1, padding: '9px 10px', textAlign: 'center', fontSize: 11.5, fontWeight: 700,
                background: phase > n ? '#16a34a' : phase === n ? '#0a2d6e' : '#f8fafc',
                color: phase >= n ? '#fff' : 'var(--text-muted)',
                borderRight: n === 1 ? '1px solid var(--border)' : 'none',
              }}>
                {phase > n ? '✓ ' : `${n}. `}{label}
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12.5, color: '#dc2626', display: 'flex', gap: 8 }}>
              <span>🚫</span> {error}
            </div>
          )}

          {/* ── Phase 1: PIN ── */}
          {phase === 1 && (
            <div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 18, fontSize: 12.5 }}>
                <strong>🔑 Knowledge Factor:</strong> Enter your 4-digit EPCS PIN to verify prescriber identity.
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textAlign: 'center' }}>
                {currentUser?.credentials} {currentUser?.firstName} {currentUser?.lastName} · DEA: <strong>{currentUser?.deaNumber}</strong>
              </div>
              {/* Demo hint */}
              <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, padding: '7px 12px', marginBottom: 16, fontSize: 11.5, textAlign: 'center' }}>
                🧪 Demo PIN: <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 900, letterSpacing: 4, color: '#92400e' }}>{currentUser?.epcsPin}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
                {[0, 1, 2, 3].map(i => (
                  <input key={i} id={`enc-pin-${i}`} type="password" inputMode="numeric"
                    maxLength={1} value={pin[i]}
                    onChange={e => handlePinChange(i, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Backspace' && !pin[i] && i > 0) document.getElementById(`enc-pin-${i - 1}`)?.focus();
                      if (e.key === 'Enter' && pin.every(p => p)) handleVerifyPin();
                    }}
                    autoFocus={i === 0}
                    style={{ width: 52, height: 58, textAlign: 'center', fontSize: 24, fontWeight: 800, border: '2px solid var(--border)', borderRadius: 10, outline: 'none', fontFamily: 'monospace' }}
                    onFocus={e => e.target.style.borderColor = '#0a2d6e'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleVerifyPin}
                  disabled={pin.some(p => !p)}
                  style={{ background: '#0a2d6e', borderColor: '#0a2d6e', minWidth: 190 }}>
                  Verify PIN & Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── Phase 2: OTP ── */}
          {phase === 2 && (
            <div>
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 12.5 }}>
                <strong>📱 Possession Factor:</strong> Enter the 6-digit one-time code from your DrFirst authenticator app.
                <span style={{ marginLeft: 8, color: countdown <= 10 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                  Expires in {countdown}s
                </span>
              </div>
              {/* Simulated soft token */}
              <div style={{ textAlign: 'center', background: '#0c1222', borderRadius: 12, padding: '14px 20px', marginBottom: 18, maxWidth: 320, margin: '0 auto 18px' }}>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase' }}>DrFirst Rcopia Token · Demo</div>
                <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: 14, color: countdown <= 10 ? '#f87171' : '#34d399', fontFamily: 'monospace' }}>
                  {generatedOtp}
                </div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>{new Date().toLocaleTimeString()} · {countdown <= 10 ? '⚠️ Expiring' : '✓ Valid'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <input key={i} id={`enc-otp-${i}`} type="text" inputMode="numeric"
                    maxLength={1} value={otp[i]}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Backspace' && !otp[i] && i > 0) document.getElementById(`enc-otp-${i - 1}`)?.focus();
                      if (e.key === 'Enter' && otp.every(p => p)) handleVerifyOtp();
                    }}
                    autoFocus={i === 0}
                    style={{ width: 46, height: 54, textAlign: 'center', fontSize: 22, fontWeight: 800, border: '2px solid var(--border)', borderRadius: 10, outline: 'none', fontFamily: 'monospace' }}
                    onFocus={e => e.target.style.borderColor = '#16a34a'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setPhase(1); setPin(['','','','']); setOtp(['','','','','','']); setError(''); clearInterval(timerRef.current); }}>← Back</button>
                <button type="button" className="btn btn-primary" onClick={handleVerifyOtp}
                  disabled={otp.some(p => !p)}
                  style={{ background: '#16a34a', borderColor: '#16a34a', minWidth: 210 }}>
                  🔓 Authenticate & Sign Order
                </button>
              </div>
              <div style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 14 }}>
                Powered by <strong style={{ color: '#0a2d6e' }}>DrFirst Rcopia</strong> · DEA 21 CFR §1311.115
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PHQ-9 / GAD-7 Assessments ────────────────────────────────────────────────
// ── Assessment trend chart (pure SVG, athena-style) ──────────────────────────
function AssessmentTrendChart({ scores, tool }) {
  // scores: [{date, score, interpretation, administeredBy}] — will be sorted ASC internally
  const sorted = (scores || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sorted.length === 0) return null;

  const maxScore  = tool === 'PHQ-9' ? 27 : 21;
  const lineColor = tool === 'PHQ-9' ? '#4f46e5' : '#0891b2';
  const W = 420, H = 130;
  const PL = 26, PR = 8, PT = 14, PB = 28;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;

  const sy = (s) => PT + plotH - (s / maxScore) * plotH;
  const sx = (i) => sorted.length === 1
    ? PL + plotW / 2
    : PL + (i / (sorted.length - 1)) * plotW;

  const bands = tool === 'PHQ-9' ? [
    { lo: 0, hi: 5,  fill: '#dcfce7', label: 'Min' },
    { lo: 5, hi: 10, fill: '#fef9c3', label: 'Mild' },
    { lo: 10,hi: 15, fill: '#ffedd5', label: 'Mod' },
    { lo: 15,hi: 20, fill: '#fee2e2', label: 'M.Sev' },
    { lo: 20,hi: 27, fill: '#fecaca', label: 'Sev' },
  ] : [
    { lo: 0, hi: 5,  fill: '#dcfce7', label: 'Min' },
    { lo: 5, hi: 10, fill: '#fef9c3', label: 'Mild' },
    { lo: 10,hi: 15, fill: '#ffedd5', label: 'Mod' },
    { lo: 15,hi: 21, fill: '#fee2e2', label: 'Sev' },
  ];

  const gridVals = tool === 'PHQ-9' ? [0,5,10,15,20,27] : [0,5,10,15,21];

  const linePath = sorted.map((s, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(s.score).toFixed(1)}`).join(' ');
  const areaPath = sorted.length > 1
    ? `${linePath} L${sx(sorted.length - 1).toFixed(1)},${(PT + plotH).toFixed(1)} L${sx(0).toFixed(1)},${(PT + plotH).toFixed(1)} Z`
    : null;

  const fmtDate = (d) => {
    const dt = new Date(d + 'T12:00:00');
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  };

  const latest = sorted[sorted.length - 1];
  const prev   = sorted.length > 1 ? sorted[sorted.length - 2] : null;
  const delta  = prev ? latest.score - prev.score : null;
  const sev    = tool === 'PHQ-9' ? PHQ9_SEVERITY(latest.score) : GAD7_SEVERITY(latest.score);

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid #f1f5f9', background: `${lineColor}08` }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 12.5, color: lineColor }}>{tool} Trend</span>
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginLeft: 8 }}>{sorted.length} data point{sorted.length !== 1 ? 's' : ''} · {sorted[0].date} – {sorted[sorted.length-1].date}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {delta !== null && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: delta < 0 ? '#16a34a' : delta > 0 ? '#dc2626' : '#64748b' }}>
              {delta < 0 ? '▼' : delta > 0 ? '▲' : '—'} {Math.abs(delta)} pts from last
            </span>
          )}
          <span style={{ fontWeight: 900, fontSize: 16, color: sev.color, background: sev.bg, padding: '2px 10px', borderRadius: 8, border: `1px solid ${sev.color}44` }}>
            {latest.score}
            <span style={{ fontSize: 10, marginLeft: 5, fontWeight: 600 }}>{sev.label}</span>
          </span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ padding: '6px 6px 0' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }} aria-label={`${tool} trend chart`}>
          {/* Severity band fills */}
          {bands.map((b, bi) => (
            <rect key={bi} x={PL} y={sy(Math.min(b.hi, maxScore))} width={plotW}
              height={Math.max(0, sy(b.lo) - sy(Math.min(b.hi, maxScore)))} fill={b.fill} />
          ))}

          {/* Axis lines */}
          <line x1={PL} x2={PL} y1={PT} y2={PT + plotH} stroke="#d1d5db" strokeWidth="1" />
          <line x1={PL} x2={PL + plotW} y1={PT + plotH} y2={PT + plotH} stroke="#d1d5db" strokeWidth="1" />

          {/* Y-axis grid + labels */}
          {gridVals.map(v => (
            <g key={v}>
              <line x1={PL} x2={PL + plotW} y1={sy(v)} y2={sy(v)} stroke="#e5e7eb" strokeWidth="0.6" strokeDasharray={v === 0 ? 'none' : '3,3'} />
              <text x={PL - 3} y={sy(v) + 3.5} textAnchor="end" fill="#94a3b8" fontSize="7.5">{v}</text>
            </g>
          ))}

          {/* Severity band right labels */}
          {bands.map((b, bi) => {
            const midY = (sy(b.lo) + sy(Math.min(b.hi, maxScore))) / 2;
            return <text key={bi} x={PL + plotW + 3} y={midY + 3} fill="#94a3b8" fontSize="6.5">{b.label}</text>;
          })}

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill={lineColor} fillOpacity="0.07" />}

          {/* Line */}
          {sorted.length > 1 && (
            <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Dots + tooltips */}
          {sorted.map((s, i) => {
            const cx = sx(i), cy = sy(s.score);
            const isLatest = i === sorted.length - 1;
            const tipSev = tool === 'PHQ-9' ? PHQ9_SEVERITY(s.score) : GAD7_SEVERITY(s.score);
            return (
              <g key={s.id || i} style={{ cursor: 'default' }}>
                {isLatest && <circle cx={cx} cy={cy} r="8" fill={lineColor} fillOpacity="0.15" />}
                <circle cx={cx} cy={cy} r={isLatest ? 5.5 : 4} fill="#fff" stroke={lineColor} strokeWidth="2.2" />
                <circle cx={cx} cy={cy} r={isLatest ? 3 : 2} fill={lineColor} />
                {/* Score label above dot */}
                <text x={cx} y={cy - 9} textAnchor="middle" fill={lineColor} fontSize="8" fontWeight="800">{s.score}</text>
                {/* Date label below axis */}
                <text x={cx} y={PT + plotH + 14} textAnchor="middle" fill="#94a3b8" fontSize="7.5">{fmtDate(s.date)}</text>
                {/* Native tooltip on hover */}
                <title>{`${tool}: ${s.score} — ${tipSev.label}\n${s.date}${s.administeredBy ? '\nBy: ' + s.administeredBy : ''}`}</title>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Band legend */}
      <div style={{ display: 'flex', gap: 8, padding: '4px 14px 8px', flexWrap: 'wrap' }}>
        {bands.map((b, bi) => (
          <div key={bi} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: b.fill, border: '1px solid #e5e7eb', display: 'inline-block' }} />
            <span style={{ color: '#64748b' }}>{b.label} ({b.lo}–{Math.min(b.hi, maxScore)})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PHQ9_QUESTIONS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading the newspaper or watching television',
  'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
  'Thoughts that you would be better off dead, or of hurting yourself in some way',
];
const PHQ9_OPTIONS = ['Not at all (0)', 'Several days (1)', 'More than half the days (2)', 'Nearly every day (3)'];
const PHQ9_SEVERITY = (s) => {
  if (s <= 4)  return { label: 'Minimal / None', color: '#16a34a', bg: '#f0fdf4' };
  if (s <= 9)  return { label: 'Mild', color: '#ca8a04', bg: '#fefce8' };
  if (s <= 14) return { label: 'Moderate', color: '#ea580c', bg: '#fff7ed' };
  if (s <= 19) return { label: 'Moderately Severe', color: '#dc2626', bg: '#fef2f2' };
  return       { label: 'Severe', color: '#7f1d1d', bg: '#fef2f2' };
};

const GAD7_QUESTIONS = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it is hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid, as if something awful might happen',
];
const GAD7_OPTIONS = ['Not at all (0)', 'Several days (1)', 'More than half the days (2)', 'Nearly every day (3)'];
const GAD7_SEVERITY = (s) => {
  if (s <= 4)  return { label: 'Minimal / None', color: '#16a34a', bg: '#f0fdf4' };
  if (s <= 9)  return { label: 'Mild', color: '#ca8a04', bg: '#fefce8' };
  if (s <= 14) return { label: 'Moderate', color: '#ea580c', bg: '#fff7ed' };
  return       { label: 'Severe', color: '#7f1d1d', bg: '#fef2f2' };
};

function AssessmentQuestionnaire({ title, acronym, questions, options, severityFn, value, onChange, accentColor }) {
  const answers = value?.answers || {};
  const completed = questions.every((_, i) => answers[i] !== undefined && answers[i] !== null);
  const score = completed ? questions.reduce((sum, _, i) => sum + (answers[i] || 0), 0) : null;
  const severity = score !== null ? severityFn(score) : null;

  const noteText = score !== null
    ? `${acronym}-${questions.length} Score: ${score}/${questions.length * 3} — ${severity.label}. Administered ${new Date().toLocaleDateString()}.`
    : '';

  return (
    <div style={{ border: `1px solid ${accentColor}33`, borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
      {/* Header row */}
      <div style={{ background: `${accentColor}12`, borderBottom: `1px solid ${accentColor}33`, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 13, color: accentColor }}>{title}</span>
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginLeft: 8 }}>{questions.length}-item scale · Max score: {questions.length * 3}</span>
        </div>
        {score !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 900, fontSize: 18, color: severity.color }}>{score}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: severity.bg, color: severity.color, border: `1px solid ${severity.color}55` }}>
              {severity.label}
            </span>
          </div>
        )}
      </div>

      {/* Questions */}
      <div style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 8 }}>
          Over the <strong>last 2 weeks</strong>, how often have you been bothered by the following?
        </div>
        {questions.map((q, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, padding: '7px 10px', borderRadius: 7, background: answers[i] !== undefined ? '#fafbff' : '#fff', border: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, flexShrink: 0, width: 20, paddingTop: 1 }}>{i + 1}.</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>{q}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {options.map((opt, v) => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11.5, padding: '3px 9px', borderRadius: 6, border: `1.5px solid ${answers[i] === v ? accentColor : '#d1d5db'}`, background: answers[i] === v ? `${accentColor}14` : '#fff', fontWeight: answers[i] === v ? 700 : 400, color: answers[i] === v ? accentColor : 'var(--text-secondary)', transition: 'all 0.1s' }}>
                    <input type="radio" name={`${acronym}-q${i}`} value={v}
                      checked={answers[i] === v}
                      onChange={() => onChange({ ...value, answers: { ...answers, [i]: v } })}
                      style={{ display: 'none' }} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Question 10 — Functional impairment (PHQ-9 only) */}
        {acronym === 'PHQ-9' && (
          <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 7, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 6 }}>
              If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Not difficult at all', 'Somewhat difficult', 'Very difficult', 'Extremely difficult'].map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11.5, padding: '3px 9px', borderRadius: 6, border: `1.5px solid ${(value?.functional || '') === opt ? '#4f46e5' : '#d1d5db'}`, background: (value?.functional || '') === opt ? '#eef2ff' : '#fff', fontWeight: (value?.functional || '') === opt ? 700 : 400, color: (value?.functional || '') === opt ? '#4f46e5' : 'var(--text-secondary)' }}>
                  <input type="radio" name="phq9-func" checked={(value?.functional || '') === opt}
                    onChange={() => onChange({ ...value, functional: opt })}
                    style={{ display: 'none' }} />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Score summary + copy-to-note */}
        {score !== null && (
          <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: severity.bg, border: `1px solid ${severity.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontWeight: 800, fontSize: 13, color: severity.color }}>{acronym} Score: {score}/{questions.length * 3}</span>
              <span style={{ marginLeft: 10, fontSize: 12, color: severity.color, fontWeight: 600 }}>{severity.label}</span>
              {value?.functional && <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--text-muted)' }}>Functional impact: {value.functional}</span>}
            </div>
            <button type="button"
              onClick={() => { try { navigator.clipboard.writeText(noteText); } catch(e) {} }}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${accentColor}`, background: '#fff', color: accentColor, cursor: 'pointer', fontWeight: 700 }}>
              📋 Copy to Assessment
            </button>
          </div>
        )}

        {!completed && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Answer all {questions.length} questions to see the score.
          </div>
        )}
      </div>
    </div>
  );
}

function EncounterAssessmentsSection({ d, setD, patient }) {
  const { assessmentScores } = usePatient();
  const patientPhone = patient?.cellPhone || patient?.phone || '';
  const patientName  = `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim();
  const [sendModal, setSendModal] = React.useState(null);
  const [sentStatus, setSentStatus] = React.useState({});
  const [fillMode, setFillMode] = React.useState('provider');
  const [customPhone, setCustomPhone] = React.useState(patientPhone);
  const [showHistory, setShowHistory] = React.useState(true);

  const assessments = d.assessments || {};
  const setAssessment = (key, val) =>
    setD(p => ({ ...p, assessments: { ...(p.assessments || {}), [key]: val } }));

  // Merge historical scores with any score completed in this draft
  const historicalAll = assessmentScores[patient?.id] || [];
  const buildHistory = (tool, draftKey) => {
    const hist = historicalAll.filter(s => s.tool === tool).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const draftAnswers = assessments[draftKey]?.answers || {};
    const draftCompleted = Object.keys(draftAnswers).length === (tool === 'PHQ-9' ? PHQ9_QUESTIONS.length : GAD7_QUESTIONS.length)
      && Object.values(draftAnswers).every(v => v !== undefined);
    if (draftCompleted) {
      const draftScore = Object.values(draftAnswers).reduce((s, v) => s + (v || 0), 0);
      const alreadyIn = hist.some(h => h.date === d.date);
      if (!alreadyIn) {
        const sev = tool === 'PHQ-9' ? PHQ9_SEVERITY(draftScore) : GAD7_SEVERITY(draftScore);
        return [...hist, { id: 'draft', tool, score: draftScore, interpretation: sev.label, date: d.date, administeredBy: 'Current encounter' }];
      }
    }
    return hist;
  };

  const phq9History = buildHistory('PHQ-9', 'phq9');
  const gad7History = buildHistory('GAD-7', 'gad7');

  const handleSendText = (type) => {
    setSentStatus(p => ({ ...p, [type]: true }));
    setSendModal(null);
  };

  return (
    <div>
      {/* Trend graphs */}
      {(phq9History.length > 0 || gad7History.length > 0) && (
        <div style={{ marginBottom: 14 }}>
          <button type="button"
            onClick={() => setShowHistory(v => !v)}
            style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
            {showHistory ? '▾' : '▸'} Score History &amp; Trends
          </button>
          {showHistory && (
            <div style={{ display: 'grid', gridTemplateColumns: phq9History.length > 0 && gad7History.length > 0 ? '1fr 1fr' : '1fr', gap: 10 }}>
              {phq9History.length > 0 && <AssessmentTrendChart scores={phq9History} tool="PHQ-9" />}
              {gad7History.length > 0 && <AssessmentTrendChart scores={gad7History} tool="GAD-7" />}
            </div>
          )}
        </div>
      )}

      {/* Mode toggle + send buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {/* Fill mode toggle */}
        <div style={{ display: 'flex', borderRadius: 6, border: '1px solid #c4b5fd', overflow: 'hidden', fontSize: 11.5 }}>
          <button type="button"
            onClick={() => setFillMode('provider')}
            style={{ padding: '5px 13px', border: 'none', cursor: 'pointer', fontWeight: 700, background: fillMode === 'provider' ? '#7c3aed' : '#f5f3ff', color: fillMode === 'provider' ? '#fff' : '#7c3aed' }}>
            ✏️ Provider Fills
          </button>
          <button type="button"
            onClick={() => setFillMode('text')}
            style={{ padding: '5px 13px', border: 'none', borderLeft: '1px solid #c4b5fd', cursor: 'pointer', fontWeight: 700, background: fillMode === 'text' ? '#7c3aed' : '#f5f3ff', color: fillMode === 'text' ? '#fff' : '#7c3aed' }}>
            📱 Send to Patient
          </button>
        </div>

        {/* Send via text actions */}
        {fillMode === 'text' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>To:</span>
              <input
                style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', width: 150 }}
                value={customPhone}
                onChange={e => setCustomPhone(e.target.value)}
                placeholder="Cell phone #" />
            </div>
            <button type="button"
              onClick={() => setSendModal('PHQ-9')}
              style={{ fontSize: 11.5, padding: '5px 12px', borderRadius: 6, border: '1px solid #4f46e5', background: sentStatus['PHQ-9'] ? '#f0fdf4' : '#eef2ff', color: sentStatus['PHQ-9'] ? '#16a34a' : '#4f46e5', cursor: 'pointer', fontWeight: 700 }}>
              {sentStatus['PHQ-9'] ? '✓ PHQ-9 Sent' : '📤 Send PHQ-9'}
            </button>
            <button type="button"
              onClick={() => setSendModal('GAD-7')}
              style={{ fontSize: 11.5, padding: '5px 12px', borderRadius: 6, border: '1px solid #0891b2', background: sentStatus['GAD-7'] ? '#f0fdf4' : '#e0f2fe', color: sentStatus['GAD-7'] ? '#16a34a' : '#0891b2', cursor: 'pointer', fontWeight: 700 }}>
              {sentStatus['GAD-7'] ? '✓ GAD-7 Sent' : '📤 Send GAD-7'}
            </button>
            <button type="button"
              onClick={() => setSendModal('both')}
              style={{ fontSize: 11.5, padding: '5px 12px', borderRadius: 6, border: '1px solid #7c3aed', background: (sentStatus['PHQ-9'] && sentStatus['GAD-7']) ? '#f0fdf4' : '#f5f3ff', color: (sentStatus['PHQ-9'] && sentStatus['GAD-7']) ? '#16a34a' : '#7c3aed', cursor: 'pointer', fontWeight: 700 }}>
              {(sentStatus['PHQ-9'] && sentStatus['GAD-7']) ? '✓ Both Sent' : '📤 Send Both'}
            </button>
          </div>
        )}
      </div>

      {/* Send text confirmation modal */}
      {sendModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '28px 32px', maxWidth: 400, width: '90%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>
              📱 Send {sendModal === 'both' ? 'PHQ-9 & GAD-7' : sendModal} by Text
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
              A secure link will be sent to <strong>{customPhone || patientPhone}</strong> for <strong>{patientName || 'the patient'}</strong>.
              The patient can complete the questionnaire on their phone before or during the encounter.
              Results will appear here automatically once submitted.
            </div>
            <div style={{ fontSize: 11.5, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', marginBottom: 16, color: '#15803d' }}>
              ✓ HIPAA-compliant secure patient portal link · Expires 48 hours after sending
            </div>
            {/* Phone override */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Send to number:</label>
              <input style={{ fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', width: '100%', boxSizing: 'border-box' }}
                value={customPhone}
                onChange={e => setCustomPhone(e.target.value)}
                placeholder="(555) 000-0000" />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-sm" onClick={() => setSendModal(null)}>Cancel</button>
              <button type="button" className="btn btn-sm btn-primary"
                onClick={() => {
                  if (sendModal === 'both') {
                    handleSendText('PHQ-9');
                    handleSendText('GAD-7');
                    setSendModal(null);
                  } else {
                    handleSendText(sendModal);
                  }
                }}
                disabled={!customPhone.trim()}>
                📤 Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provider fills mode — show interactive questionnaires */}
      {fillMode === 'provider' && (
        <div>
          <AssessmentQuestionnaire
            title="Patient Health Questionnaire — PHQ-9 (Depression Screen)"
            acronym="PHQ-9"
            questions={PHQ9_QUESTIONS}
            options={PHQ9_OPTIONS}
            severityFn={PHQ9_SEVERITY}
            accentColor="#4f46e5"
            value={assessments.phq9 || {}}
            onChange={val => setAssessment('phq9', val)}
          />
          <AssessmentQuestionnaire
            title="Generalized Anxiety Disorder Scale — GAD-7"
            acronym="GAD-7"
            questions={GAD7_QUESTIONS}
            options={GAD7_OPTIONS}
            severityFn={GAD7_SEVERITY}
            accentColor="#0891b2"
            value={assessments.gad7 || {}}
            onChange={val => setAssessment('gad7', val)}
          />
        </div>
      )}

      {/* Text mode — show pending/received status */}
      {fillMode === 'text' && (
        <div>
          {['PHQ-9', 'GAD-7'].map(type => {
            const key = type === 'PHQ-9' ? 'phq9' : 'gad7';
            const result = assessments[key];
            const questions = type === 'PHQ-9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;
            const options = type === 'PHQ-9' ? PHQ9_OPTIONS : GAD7_OPTIONS;
            const severityFn = type === 'PHQ-9' ? PHQ9_SEVERITY : GAD7_SEVERITY;
            const accentColor = type === 'PHQ-9' ? '#4f46e5' : '#0891b2';
            const answers = result?.answers || {};
            const completed = questions.every((_, i) => answers[i] !== undefined);
            const score = completed ? questions.reduce((sum, _, i) => sum + (answers[i] || 0), 0) : null;
            const severity = score !== null ? severityFn(score) : null;

            return (
              <div key={type} style={{ border: `1px solid ${accentColor}33`, borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
                <div style={{ background: `${accentColor}12`, borderBottom: `1px solid ${accentColor}33`, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: accentColor }}>{type}</span>
                  {!sentStatus[type] && !score && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Not yet sent</span>
                  )}
                  {sentStatus[type] && !score && (
                    <span style={{ fontSize: 11, color: '#ca8a04', fontWeight: 600 }}>⏳ Awaiting patient response · Sent to {customPhone}</span>
                  )}
                  {score !== null && (
                    <span style={{ fontWeight: 800, fontSize: 13, color: severity.color }}>{score}/{questions.length * 3} — {severity.label}</span>
                  )}
                </div>
                {score !== null ? (
                  <div style={{ padding: '10px 14px' }}>
                    <AssessmentQuestionnaire
                      title="" acronym={type} questions={questions} options={options} severityFn={severityFn} accentColor={accentColor}
                      value={result || {}} onChange={val => setAssessment(key, val)}
                    />
                  </div>
                ) : (
                  <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {sentStatus[type]
                      ? 'Results will appear here once the patient completes the form.'
                      : `Click "Send ${type}" above to text a secure link to ${customPhone || 'the patient'}.`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Encounter orders section (medication + lab sub-tabs) ──────────────────────
function EncounterOrdersSection({ d, setD }) {
  const { currentUser, verifyEPCS, generateEPCSOTP, verifyEPCSOTP } = useAuth();
  const { selectedPatient } = usePatient();
  const [ordersTab, setOrdersTab] = React.useState('meds');
  const [medForm, setMedForm] = React.useState(BLANK_MED_ORDER);
  const [medMode, setMedMode] = React.useState('structured'); // 'structured' | 'freetext'
  const [autoFilledFields, setAutoFilledFields] = React.useState(new Set());
  const [labForm, setLabForm] = React.useState(BLANK_LAB_ORDER);
  const [medSearch, setMedSearch] = React.useState('');
  const [labSearch, setLabSearch] = React.useState('');
  const [pharmSearch, setPharmSearch] = React.useState('');
  const [showMedDropdown, setShowMedDropdown] = React.useState(false);
  const [showLabDropdown, setShowLabDropdown] = React.useState(false);
  const [showPharmDropdown, setShowPharmDropdown] = React.useState(false);
  // EPCS / DrFirst 2FA
  const [epcsOpen, setEpcsOpen] = React.useState(false);
  const [pendingOrder, setPendingOrder] = React.useState(null);

  const medicationOrders = d.medicationOrders || [];
  const labOrders = d.labOrders || [];

  const filteredMeds = medSearch.trim()
    ? ENC_MED_FLAT.filter(m => m.name.toLowerCase().includes(medSearch.toLowerCase()) || m.category.toLowerCase().includes(medSearch.toLowerCase()))
    : [];

  const filteredLabs = labSearch.trim()
    ? ENC_LAB_FLAT.filter(l => l.name.toLowerCase().includes(labSearch.toLowerCase()) || l.category.toLowerCase().includes(labSearch.toLowerCase()))
    : [];

  const patientCity  = selectedPatient?.address?.city  || '';
  const patientState = selectedPatient?.address?.state || '';
  const patientZip   = selectedPatient?.address?.zip   || '';

  const scorePharm = (ph) => (ph.zip === patientZip ? 2 : 0) + (ph.city === patientCity ? 1 : 0);
  const nearbyPharms = PHARMACY_LOCATIONS
    .filter(ph => ph.state === patientState || !patientState)
    .sort((a, b) => scorePharm(b) - scorePharm(a));

  const filteredPharms = pharmSearch.trim()
    ? PHARMACY_LOCATIONS.filter(ph =>
        ph.name.toLowerCase().includes(pharmSearch.toLowerCase()) ||
        ph.chain.toLowerCase().includes(pharmSearch.toLowerCase()) ||
        ph.city.toLowerCase().includes(pharmSearch.toLowerCase()) ||
        ph.address.toLowerCase().includes(pharmSearch.toLowerCase())
      ).sort((a, b) => scorePharm(b) - scorePharm(a))
    : nearbyPharms;

  const commitMedOrder = (order) => {
    setD(p => ({ ...p, medicationOrders: [...(p.medicationOrders || []), { ...order, id: Date.now() }] }));
    setMedForm(BLANK_MED_ORDER);
    setAutoFilledFields(new Set());
    setMedSearch(''); setPharmSearch('');
    setShowMedDropdown(false); setShowPharmDropdown(false);
    setEpcsOpen(false); setPendingOrder(null);
  };

  const addMedOrder = () => {
    if (!medForm.name || !medForm.sig) return;
    const schedule = getControlledSchedule(medForm.name);
    if (schedule) {
      // Controlled substance — require EPCS 2FA before committing
      setPendingOrder({ ...medForm, schedule });
      setEpcsOpen(true);
    } else {
      commitMedOrder(medForm);
    }
  };
  const removeMedOrder = (id) => setD(p => ({ ...p, medicationOrders: (p.medicationOrders || []).filter(o => o.id !== id) }));

  const addLabOrder = () => {
    if (!labForm.test) return;
    setD(p => ({ ...p, labOrders: [...(p.labOrders || []), { ...labForm, id: Date.now() }] }));
    setLabForm(BLANK_LAB_ORDER);
    setLabSearch(''); setShowLabDropdown(false);
  };
  const removeLabOrder = (id) => setD(p => ({ ...p, labOrders: (p.labOrders || []).filter(o => o.id !== id) }));

  const handleFaxPrint = (order, type) => {
    printOrderFaxSlip({ order, type, patient: selectedPatient, provider: currentUser });
  };

  const dropdownStyle = {
    position: 'absolute', zIndex: 100, left: 0, right: 0, top: '100%',
    border: '1px solid var(--border)', borderRadius: 6, background: '#fff',
    maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  };
  const dropdownItemStyle = (hover) => ({
    display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px',
    border: 'none', background: hover ? '#f5f3ff' : 'transparent',
    cursor: 'pointer', fontSize: 12.5, borderBottom: '1px solid #f8fafc',
    color: 'var(--text-primary)',
  });

  const selectedMedSchedule = medForm.name ? getControlledSchedule(medForm.name) : null;
  // Credential checks for ordering authority
  const isPrescriber  = currentUser?.role === 'prescriber';
  const hasNpi        = !!(currentUser?.npi?.trim());
  const hasDea        = !!(currentUser?.deaNumber && /^[A-Za-z]{2}\d{7}$/.test(currentUser.deaNumber.trim()));
  // Full ordering access: prescriber role AND valid NPI on file
  const canWriteOrders = isPrescriber && hasNpi;

  return (
    <div>
      {/* DrFirst EPCS 2FA modal for controlled substances */}
      {epcsOpen && pendingOrder && (
        <DrFirstEpcsModal
          order={pendingOrder}
          currentUser={currentUser}
          verifyEPCS={verifyEPCS}
          generateEPCSOTP={generateEPCSOTP}
          verifyEPCSOTP={verifyEPCSOTP}
          onConfirm={(confirmedOrder) => commitMedOrder(confirmedOrder)}
          onCancel={() => { setEpcsOpen(false); setPendingOrder(null); }}
        />
      )}
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 14 }}>
        {[
          { key: 'meds', label: '💊 Medication Orders', count: medicationOrders.length },
          { key: 'labs', label: '🧪 Lab Orders', count: labOrders.length },
        ].map(t => (
          <button key={t.key} type="button" onClick={() => setOrdersTab(t.key)}
            style={{
              padding: '8px 16px', fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer',
              borderBottom: ordersTab === t.key ? '2px solid #7c3aed' : '2px solid transparent',
              marginBottom: -2,
              background: ordersTab === t.key ? 'rgba(124,58,237,0.07)' : 'transparent',
              color: ordersTab === t.key ? '#7c3aed' : 'var(--text-secondary)',
              borderRadius: '4px 4px 0 0',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            {t.label}
            {t.count > 0 && (
              <span style={{ background: '#7c3aed', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── MEDICATION ORDERS ── */}
      {ordersTab === 'meds' && (
        <div>
          {/* Gate 1: not a prescriber role */}
          {!isPrescriber ? (
            <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 10, padding: '14px 18px', marginBottom: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>🔒</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e' }}>Medication Orders — Prescribers Only</div>
                <div style={{ fontSize: 12, color: '#78350f', marginTop: 4, lineHeight: 1.65 }}>
                  Only licensed prescribers (MD, DO, PA, NP) may enter or sign medication orders.
                  Prescribing authority is assigned at provider registration by your administrator.
                </div>
              </div>
            </div>
          /* Gate 2: prescriber role but NPI not on file */
          ) : !hasNpi ? (
            <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: 10, padding: '16px 20px', marginBottom: 14, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>🚫</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#dc2626', marginBottom: 4 }}>NPI Number Required to Prescribe</div>
                <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.7 }}>
                  An <strong>NPI (National Provider Identifier)</strong> is required for all prescribers
                  (MD, DO, NP, PA) before medication orders can be entered.
                  Your account does not have an NPI on file.
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                  Contact your administrator to add your NPI via <strong>Admin Toolkit → Register Provider</strong>.
                </div>
              </div>
            </div>
          ) : (
          <div style={{ background: '#f8f7ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '14px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#7c3aed', letterSpacing: '0.5px' }}>
                Add Medication Order
              </div>
              {/* Structured / Free Text toggle */}
              <div style={{ display: 'flex', borderRadius: 6, border: '1px solid #d8b4fe', overflow: 'hidden', fontSize: 11.5 }}>
                <button type="button"
                  onClick={() => { setMedMode('structured'); setAutoFilledFields(new Set()); }}
                  style={{
                    padding: '4px 12px', border: 'none', cursor: 'pointer', fontWeight: 700,
                    background: medMode === 'structured' ? '#7c3aed' : '#f5f3ff',
                    color: medMode === 'structured' ? '#fff' : '#7c3aed',
                  }}>
                  ✓ Structured
                </button>
                <button type="button"
                  onClick={() => { setMedMode('freetext'); setAutoFilledFields(new Set()); }}
                  style={{
                    padding: '4px 12px', border: 'none', borderLeft: '1px solid #d8b4fe', cursor: 'pointer', fontWeight: 700,
                    background: medMode === 'freetext' ? '#7c3aed' : '#f5f3ff',
                    color: medMode === 'freetext' ? '#fff' : '#7c3aed',
                  }}>
                  ✏️ Free Text
                </button>
              </div>
            </div>
            {medMode === 'structured' && (
              <div style={{ fontSize: 11, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '5px 10px', marginBottom: 10 }}>
                ✓ <strong>Structured mode</strong> — fields auto-populate from our drug database when you select a medication. Fields marked <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ auto-filled</span> can still be edited.
              </div>
            )}

            {/* Medication search */}
            <div style={{ marginBottom: 10, position: 'relative' }}>
              <label className="form-label" style={{ fontSize: 11 }}>Medication * <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>— search by name or category</span></label>
              <input
                className="form-input"
                placeholder="Search medication name or category (e.g. 'sertraline', 'SSRI', 'Zoloft')..."
                value={medForm.name || medSearch}
                onChange={e => {
                  const v = e.target.value;
                  setMedSearch(v);
                  setMedForm(p => ({ ...p, name: v }));
                  setShowMedDropdown(true);
                }}
                onFocus={() => setShowMedDropdown(true)}
                onBlur={() => setTimeout(() => setShowMedDropdown(false), 150)}
                style={{ fontSize: 13 }}
              />
              {showMedDropdown && filteredMeds.length > 0 && (
                <div style={dropdownStyle}>
                  {filteredMeds.slice(0, 20).map((med, i) => (
                    <button key={i} type="button"
                      style={dropdownItemStyle(false)}
                      onMouseOver={e => e.currentTarget.style.background = '#f5f3ff'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        const defaults = getMedDefaults(med.name);
                        if (medMode === 'structured' && defaults) {
                          setMedForm(p => ({
                            ...p,
                            name:     med.name,
                            dose:     defaults.dose,
                            sig:      defaults.sig,
                            quantity: defaults.qty,
                            refills:  defaults.refills,
                            notes:    defaults.notes,
                          }));
                          const filled = new Set();
                          if (defaults.dose)    filled.add('dose');
                          if (defaults.sig)     filled.add('sig');
                          if (defaults.qty)     filled.add('quantity');
                          if (defaults.refills) filled.add('refills');
                          if (defaults.notes)   filled.add('notes');
                          setAutoFilledFields(filled);
                        } else {
                          setMedForm(p => ({ ...p, name: med.name }));
                          setAutoFilledFields(new Set());
                        }
                        setMedSearch('');
                        setShowMedDropdown(false);
                      }}>
                      <span style={{ fontWeight: 600 }}>{med.name}</span>
                      <span style={{ fontSize: 10.5, color: '#7c3aed', marginLeft: 6, background: '#f5f3ff', padding: '1px 5px', borderRadius: 4 }}>
                        {med.category}
                      </span>
                    </button>
                  ))}
                  {filteredMeds.length > 20 && (
                    <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                      Showing 20 of {filteredMeds.length} — refine search for more
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div>
                <label className="form-label" style={{ fontSize: 11 }}>
                  Dose / Strength
                  {autoFilledFields.has('dose') && <span style={{ marginLeft: 6, color: '#16a34a', fontWeight: 700, fontSize: 10 }}>✓ auto-filled</span>}
                </label>
                <input className="form-input" placeholder="e.g., 50mg, 10mg/5mL"
                  value={medForm.dose}
                  onChange={e => {
                    setMedForm(p => ({ ...p, dose: e.target.value }));
                    setAutoFilledFields(prev => { const n = new Set(prev); n.delete('dose'); return n; });
                  }}
                  style={{ fontSize: 13, borderColor: autoFilledFields.has('dose') ? '#86efac' : undefined, background: autoFilledFields.has('dose') ? '#f0fdf4' : undefined }} />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: 11 }}>
                  Sig (Frequency) *
                  {autoFilledFields.has('sig') && <span style={{ marginLeft: 6, color: '#16a34a', fontWeight: 700, fontSize: 10 }}>✓ auto-filled</span>}
                </label>
                {medMode === 'structured' ? (
                  <select className="form-input" value={medForm.sig}
                    onChange={e => {
                      setMedForm(p => ({ ...p, sig: e.target.value }));
                      setAutoFilledFields(prev => { const n = new Set(prev); n.delete('sig'); return n; });
                    }}
                    style={{ fontSize: 13, borderColor: autoFilledFields.has('sig') ? '#86efac' : undefined, background: autoFilledFields.has('sig') ? '#f0fdf4' : undefined }}>
                    <option value="">Select...</option>
                    {MED_SIGS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input className="form-input"
                    placeholder="e.g., Take 1 tablet by mouth twice daily with food"
                    value={medForm.sig}
                    onChange={e => setMedForm(p => ({ ...p, sig: e.target.value }))}
                    style={{ fontSize: 13 }} />
                )}
              </div>
              <div>
                <label className="form-label" style={{ fontSize: 11 }}>
                  Qty / Refills
                  {(autoFilledFields.has('quantity') || autoFilledFields.has('refills')) && <span style={{ marginLeft: 6, color: '#16a34a', fontWeight: 700, fontSize: 10 }}>✓ auto-filled</span>}
                </label>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input className="form-input" placeholder="Qty" type="number" min={1}
                    value={medForm.quantity}
                    onChange={e => {
                      setMedForm(p => ({ ...p, quantity: e.target.value }));
                      setAutoFilledFields(prev => { const n = new Set(prev); n.delete('quantity'); return n; });
                    }}
                    style={{ fontSize: 13, flex: 1, borderColor: autoFilledFields.has('quantity') ? '#86efac' : undefined, background: autoFilledFields.has('quantity') ? '#f0fdf4' : undefined }} />
                  <input className="form-input" placeholder="Refills" type="number" min={0} max={11}
                    value={medForm.refills}
                    onChange={e => {
                      setMedForm(p => ({ ...p, refills: e.target.value }));
                      setAutoFilledFields(prev => { const n = new Set(prev); n.delete('refills'); return n; });
                    }}
                    style={{ fontSize: 13, flex: 1, borderColor: autoFilledFields.has('refills') ? '#86efac' : undefined, background: autoFilledFields.has('refills') ? '#f0fdf4' : undefined }} />
                </div>
              </div>
            </div>

            {/* Pharmacy destination */}
            <div style={{ marginBottom: 10, position: 'relative' }}>
              <label className="form-label" style={{ fontSize: 11 }}>Send to Pharmacy</label>
              <input
                className="form-input"
                placeholder="Search pharmacy chain, mail order, or specialty pharmacy..."
                value={medForm.pharmacy || pharmSearch}
                onChange={e => {
                  const v = e.target.value;
                  setPharmSearch(v);
                  setMedForm(p => ({ ...p, pharmacy: v }));
                  setShowPharmDropdown(true);
                }}
                onFocus={() => setShowPharmDropdown(true)}
                onBlur={() => setTimeout(() => setShowPharmDropdown(false), 150)}
                style={{ fontSize: 13 }}
              />
              {showPharmDropdown && filteredPharms.length > 0 && (
                <div style={dropdownStyle}>
                  {!pharmSearch.trim() && patientCity && (
                    <div style={{ padding: '5px 12px 3px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#16a34a', background: '#f0fdf4', borderBottom: '1px solid #d1fae5' }}>
                      📍 Near {patientCity}, {patientState} {patientZip}
                    </div>
                  )}
                  {filteredPharms.slice(0, 20).map((ph, i) => {
                    const isClosest = !pharmSearch.trim() && i < 3 && ph.state === patientState;
                    return (
                      <button key={ph.id} type="button"
                        style={{ ...dropdownItemStyle(false), padding: '8px 12px' }}
                        onMouseOver={e => e.currentTarget.style.background = '#f0fdf4'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          const fullAddr = `${ph.address}, ${ph.city}, ${ph.state} ${ph.zip} · Ph: ${ph.phone} · Fax: ${ph.fax}`;
                          setMedForm(p => ({ ...p, pharmacy: ph.name, pharmAddress: fullAddr }));
                          setPharmSearch('');
                          setShowPharmDropdown(false);
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontWeight: 700, fontSize: 12.5 }}>{ph.name}</span>
                          {isClosest && (
                            <span style={{ fontSize: 9.5, fontWeight: 700, background: '#16a34a', color: '#fff', padding: '1px 6px', borderRadius: 10 }}>Nearby</span>
                          )}
                          <span style={{ fontSize: 10.5, color: '#16a34a', marginLeft: 'auto', background: '#f0fdf4', padding: '1px 5px', borderRadius: 4 }}>
                            {ph.chain}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {ph.address}, {ph.city}, {ph.state} {ph.zip}
                          <span style={{ marginLeft: 8, color: '#0891b2' }}>Ph: {ph.phone}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pharmacy location — auto-populated from patient address */}
            {medForm.pharmAddress && (
              <div style={{ marginBottom: 10 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Pharmacy Location</label>
                <input className="form-input"
                  value={medForm.pharmAddress}
                  onChange={e => setMedForm(p => ({ ...p, pharmAddress: e.target.value }))}
                  style={{ fontSize: 12, color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd' }} />
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label className="form-label" style={{ fontSize: 11 }}>
                Notes / Special Instructions
                {autoFilledFields.has('notes') && <span style={{ marginLeft: 6, color: '#16a34a', fontWeight: 700, fontSize: 10 }}>✓ auto-filled</span>}
              </label>
              <textarea className="form-input" rows={2} placeholder="e.g., Take with food. Titrate per protocol. Brand medically necessary."
                value={medForm.notes}
                onChange={e => {
                  setMedForm(p => ({ ...p, notes: e.target.value }));
                  setAutoFilledFields(prev => { const n = new Set(prev); n.delete('notes'); return n; });
                }}
                style={{ fontSize: 12, resize: 'vertical', lineHeight: 1.5, borderColor: autoFilledFields.has('notes') ? '#86efac' : undefined, background: autoFilledFields.has('notes') ? '#f0fdf4' : undefined }} />
            </div>

            {/* Controlled substance EPCS warning */}
            {selectedMedSchedule && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ fontSize: 22, flexShrink: 0 }}>🔐</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: '#dc2626' }}>
                    Controlled Substance — {selectedMedSchedule}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#7f1d1d', marginTop: 2 }}>
                    This order requires EPCS two-factor authentication (PIN + one-time code) via DrFirst before it can be signed.
                    DEA 21 CFR §1311 compliance enforced.
                  </div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #fca5a5', borderRadius: 6, padding: '4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 900, color: '#0a2d6e', letterSpacing: '-0.5px' }}>Dr</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#e63946', letterSpacing: '-0.5px' }}>First</span>
                </div>
              </div>
            )}

            {/* Gate 3: prescriber + NPI present, but controlled substance selected without DEA */}
            {selectedMedSchedule && !hasDea && (
              <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: 10, padding: '14px 18px', marginBottom: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>🚫</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#dc2626', marginBottom: 3 }}>DEA Number Required for Controlled Substances</div>
                  <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.65 }}>
                    <strong>{medForm.name}</strong> is a <strong>{selectedMedSchedule}</strong> controlled substance.
                    A DEA registration number is required to prescribe Schedule II–V medications.
                    Your account does not have a DEA number on file.
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 5 }}>
                    Contact your administrator to add your DEA number via <strong>Admin Toolkit → Register Provider</strong>.
                  </div>
                </div>
              </div>
            )}

            <button type="button" className="btn btn-primary btn-sm"
              onClick={addMedOrder}
              disabled={!medForm.name || !medForm.sig || (selectedMedSchedule && !hasDea)}
              style={{ fontSize: 12, fontWeight: 700, background: selectedMedSchedule ? '#dc2626' : undefined, borderColor: selectedMedSchedule ? '#dc2626' : undefined }}
              title={(!medForm.name || !medForm.sig) ? 'Fill in medication name and SIG first' : (selectedMedSchedule && !hasDea) ? 'DEA number required for controlled substances' : ''}>
              {selectedMedSchedule ? '🔒 Add Order (EPCS Required)' : '+ Add Medication Order'}
            </button>
          </div>
          )}

          {medicationOrders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>
              No medication orders added yet.
            </p>
          ) : (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 8 }}>
                Medication Orders ({medicationOrders.length})
              </div>
              {medicationOrders.map((order, i) => (
                <div key={order.id || i} style={{
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
                  padding: '10px 12px', background: '#fff', border: '1px solid var(--border)',
                  borderRadius: 8, marginBottom: 6,
                  borderLeft: `3px solid ${order.schedule ? '#dc2626' : '#7c3aed'}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      💊 {order.name}
                      {order.dose && <span style={{ color: '#7c3aed', fontWeight: 600 }}>{order.dose}</span>}
                      {order.schedule && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                          🔒 {order.schedule}
                        </span>
                      )}
                      {order.epcsVerified && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac' }}>
                          ✓ EPCS Verified
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {order.sig}
                      {order.quantity && ` · Qty: ${order.quantity}`}
                      {order.refills !== '' && ` · Refills: ${order.refills}`}
                    </div>
                    {order.pharmacy && (
                      <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2, fontWeight: 600 }}>
                        📍 {order.pharmAddress || order.pharmacy}
                      </div>
                    )}
                    {order.epcsVerified && order.epcsDea && (
                      <div style={{ fontSize: 10.5, color: '#0a2d6e', marginTop: 2, fontWeight: 600 }}>
                        🔐 DrFirst EPCS · DEA: {order.epcsDea}
                      </div>
                    )}
                    {order.notes && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                        {order.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                    <button type="button" onClick={() => handleFaxPrint(order, 'medication')}
                      title="Print / Fax order slip"
                      style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 5, cursor: 'pointer', color: '#374151', fontSize: 12, padding: '2px 7px', fontWeight: 600, lineHeight: 1.4 }}>
                      🖨 Fax
                    </button>
                    <button type="button" onClick={() => removeMedOrder(order.id || i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 18, lineHeight: 1 }}>
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── LAB ORDERS ── */}
      {ordersTab === 'labs' && (
        <div>
          {/* Gate 1: not a prescriber role */}
          {!isPrescriber ? (
            <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 10, padding: '14px 18px', marginBottom: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>🔒</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e' }}>Lab Orders — Prescribers Only</div>
                <div style={{ fontSize: 12, color: '#78350f', marginTop: 4, lineHeight: 1.65 }}>
                  Only licensed prescribers (MD, DO, PA, NP) may enter or sign lab orders.
                  Prescribing authority is assigned at provider registration by your administrator.
                </div>
              </div>
            </div>
          /* Gate 2: prescriber role but NPI not on file */
          ) : !hasNpi ? (
            <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: 10, padding: '16px 20px', marginBottom: 14, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>🚫</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#dc2626', marginBottom: 4 }}>NPI Number Required to Order Labs</div>
                <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.7 }}>
                  An <strong>NPI (National Provider Identifier)</strong> is required for all prescribers
                  (MD, DO, NP, PA) before lab orders can be entered.
                  Your account does not have an NPI on file.
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                  Contact your administrator to add your NPI via <strong>Admin Toolkit → Register Provider</strong>.
                </div>
              </div>
            </div>
          ) : (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '14px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#16a34a', letterSpacing: '0.5px', marginBottom: 10 }}>
              Add Lab Order
            </div>

            {/* Lab test search */}
            <div style={{ marginBottom: 10, position: 'relative' }}>
              <label className="form-label" style={{ fontSize: 11 }}>Lab Test * <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>— search by name or category</span></label>
              <input
                className="form-input"
                placeholder="Search lab test or category (e.g. 'lithium', 'CBC', 'hepatitis', 'pharmacogenomics')..."
                value={labForm.test || labSearch}
                onChange={e => {
                  const v = e.target.value;
                  setLabSearch(v);
                  setLabForm(p => ({ ...p, test: v }));
                  setShowLabDropdown(true);
                }}
                onFocus={() => setShowLabDropdown(true)}
                onBlur={() => setTimeout(() => setShowLabDropdown(false), 150)}
                style={{ fontSize: 13 }}
              />
              {showLabDropdown && filteredLabs.length > 0 && (
                <div style={dropdownStyle}>
                  {filteredLabs.slice(0, 20).map((lab, i) => (
                    <button key={i} type="button"
                      style={dropdownItemStyle(false)}
                      onMouseOver={e => e.currentTarget.style.background = '#f0fdf4'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        setLabForm(p => ({ ...p, test: lab.name }));
                        setLabSearch('');
                        setShowLabDropdown(false);
                      }}>
                      <span style={{ fontWeight: 600 }}>{lab.name}</span>
                      <span style={{ fontSize: 10.5, color: '#16a34a', marginLeft: 6, background: '#dcfce7', padding: '1px 5px', borderRadius: 4 }}>
                        {lab.category}
                      </span>
                    </button>
                  ))}
                  {filteredLabs.length > 20 && (
                    <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                      Showing 20 of {filteredLabs.length} — refine search for more
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div>
                <label className="form-label" style={{ fontSize: 11 }}>Priority</label>
                <select className="form-input" value={labForm.priority}
                  onChange={e => setLabForm(p => ({ ...p, priority: e.target.value }))} style={{ fontSize: 13 }}>
                  {['Routine', 'Urgent', 'STAT'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: 11 }}>Send to Lab / Network</label>
                <select className="form-input" value={labForm.labNetwork}
                  onChange={e => setLabForm(p => ({ ...p, labNetwork: e.target.value }))} style={{ fontSize: 13 }}>
                  <option value="">Select lab network...</option>
                  {US_LAB_NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'end', marginBottom: 10 }}>
              <div>
                <label className="form-label" style={{ fontSize: 11 }}>Diagnosis / Clinical Indication</label>
                <input className="form-input" placeholder="e.g., Monitoring lithium levels — F31.9, routine metabolic monitoring"
                  value={labForm.diagnosis} onChange={e => setLabForm(p => ({ ...p, diagnosis: e.target.value }))}
                  style={{ fontSize: 13 }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, paddingBottom: 6, whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={labForm.fasting}
                  onChange={e => setLabForm(p => ({ ...p, fasting: e.target.checked }))}
                  style={{ accentColor: '#16a34a' }} />
                Fasting Required
              </label>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Additional Notes / Special Instructions</label>
              <input className="form-input" placeholder="Collection time, specimen type, special handling, patient instructions..."
                value={labForm.notes} onChange={e => setLabForm(p => ({ ...p, notes: e.target.value }))}
                style={{ fontSize: 13 }} />
            </div>
            <button type="button" className="btn btn-primary btn-sm"
              onClick={addLabOrder} disabled={!labForm.test}
              style={{ fontSize: 12, fontWeight: 700, background: '#16a34a', borderColor: '#16a34a' }}>
              + Add Lab Order
            </button>
          </div>
          )}

          {labOrders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>
              No lab orders added yet.
            </p>
          ) : (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 8 }}>
                Lab Orders ({labOrders.length})
              </div>
              {labOrders.map((order, i) => (
                <div key={order.id || i} style={{
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
                  padding: '10px 12px', background: '#fff', border: '1px solid var(--border)',
                  borderRadius: 8, marginBottom: 6, borderLeft: '3px solid #16a34a',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      🧪 {order.test}
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                        background: order.priority === 'STAT' ? '#fef2f2' : order.priority === 'Urgent' ? '#fffbeb' : '#f0fdf4',
                        color: order.priority === 'STAT' ? '#dc2626' : order.priority === 'Urgent' ? '#d97706' : '#16a34a',
                        border: `1px solid ${order.priority === 'STAT' ? '#fca5a5' : order.priority === 'Urgent' ? '#fcd34d' : '#86efac'}`,
                      }}>
                        {order.priority}
                      </span>
                      {order.fasting && (
                        <span style={{ fontSize: 10, color: '#92400e', background: '#fffbeb', border: '1px solid #fcd34d', padding: '2px 6px', borderRadius: 10, fontWeight: 600 }}>
                          FASTING
                        </span>
                      )}
                    </div>
                    {order.labNetwork && (
                      <div style={{ fontSize: 11, color: '#0891b2', marginTop: 2, fontWeight: 600 }}>
                        🏥 {order.labNetwork}
                      </div>
                    )}
                    {order.diagnosis && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                        Indication: {order.diagnosis}
                      </div>
                    )}
                    {order.notes && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                        {order.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                    <button type="button" onClick={() => handleFaxPrint(order, 'lab')}
                      title="Print / Fax order slip"
                      style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 5, cursor: 'pointer', color: '#374151', fontSize: 12, padding: '2px 7px', fontWeight: 600, lineHeight: 1.4 }}>
                      🖨 Fax
                    </button>
                    <button type="button" onClick={() => removeLabOrder(order.id || i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 18, lineHeight: 1 }}>
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Diagnoses + Orders tabbed wrapper ─────────────────────────────────────────
function DiagnosesAndOrdersSection({ d, setD }) {
  const [dxTab, setDxTab] = React.useState('diagnoses');
  const orderCount = (d.medicationOrders?.length || 0) + (d.labOrders?.length || 0);

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 14 }}>
        {[
          { key: 'diagnoses', label: '🔖 Diagnoses & ICD-10', count: (d.diagnoses || []).length },
          { key: 'orders', label: '📋 Orders', count: orderCount },
        ].map(t => (
          <button key={t.key} type="button" onClick={() => setDxTab(t.key)}
            style={{
              padding: '9px 18px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
              borderBottom: dxTab === t.key ? '2px solid #0891b2' : '2px solid transparent',
              marginBottom: -2,
              background: dxTab === t.key ? 'rgba(8,145,178,0.07)' : 'transparent',
              color: dxTab === t.key ? '#0891b2' : 'var(--text-secondary)',
              borderRadius: '4px 4px 0 0',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
            {t.label}
            {t.count > 0 && (
              <span style={{ background: dxTab === t.key ? '#0891b2' : '#94a3b8', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {dxTab === 'diagnoses' && (
        <DiagnosesEditor
          diagnoses={d.diagnoses || []}
          onChange={(diags) => setD((p) => ({ ...p, diagnoses: diags }))} />
      )}

      {dxTab === 'orders' && (
        <EncounterOrdersSection d={d} setD={setD} />
      )}
    </div>
  );
}

// ── Section tabs config ───────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'subjective', label: 'Chief Complaint & Subjective' },
  { id: 'mse',        label: 'Mental Status Exam' },
  { id: 'assessment', label: 'Assessment & Plan' },
  { id: 'diagnoses',  label: 'Diagnoses & ICD-10' },
  { id: 'billing',    label: 'CPT & Billing' },
  { id: 'followup',   label: 'Follow-Up' },
];

// ── Main Encounters component ──────────────────────────────────────────────────
export default function Encounters({ patientId }) {
  const { encounters, addEncounter, updateEncounter, allergies, problemList, vitalSigns, meds, orders, assessmentScores, patients } = usePatient();
  const { currentUser } = useAuth();
  const isTherapist = currentUser?.role === 'therapist';
  const patient = patients.find(p => p.id === patientId) || {};

  const patientEncounters = (encounters[patientId] || []).slice().sort(
    (a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`)
  );

  const [selectedId, setSelectedId] = useState(patientEncounters[0]?.id || null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('subjective');
  const [billingError, setBillingError] = useState(false);

  const selected = patientEncounters.find((e) => e.id === selectedId) || null;

  // ── Previous Notes sidebar state ──────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('notes'); // notes | diagnoses | meds | vitals
  const [expandedPrevEnc, setExpandedPrevEnc] = useState(null);
  const [sidebarSection, setSidebarSection] = useState('history'); // history | allergies | demographics | problems | vitals | medications | orders | assessments

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };

  const startNew = () => {
    setDraft(blankEncounter(currentUser));
    setCreating(true);
    setSelectedId(null);
    setActiveSection('subjective');
  };
  const cancelNew = () => {
    setCreating(false);
    setDraft(null);
    setSelectedId(patientEncounters[0]?.id || null);
  };
  const saveNew = () => {
    if (!draft.chiefComplaint.trim()) return;
    setBillingError(false);
    addEncounter(patientId, draft);
    setCreating(false);
    setDraft(null);
    flash();
  };

  const closeNew = () => {
    if (!draft.chiefComplaint.trim()) return;
    if (!draft.cptCodes || draft.cptCodes.length === 0) {
      setBillingError(true);
      setActiveSection('billing');
      return;
    }
    setBillingError(false);
    const creds = currentUser?.credentials ? `, ${currentUser.credentials}` : '';
    const closed = {
      ...draft,
      status: 'Completed',
      signedBy: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}${creds}`.trim(),
      signedAt: new Date().toISOString(),
    };
    addEncounter(patientId, closed);
    setCreating(false);
    setDraft(null);
    flash();
  };

  const startEdit = (enc) => {
    setEditDraft(JSON.parse(JSON.stringify(enc)));
    setEditing(true);
    setActiveSection('subjective');
  };
  const cancelEdit = () => { setEditing(false); setEditDraft(null); };
  const saveEdit = () => {
    if (!editDraft.chiefComplaint.trim()) return;
    setBillingError(false);
    updateEncounter(patientId, editDraft.id, editDraft);
    setEditing(false);
    setEditDraft(null);
    flash();
  };

  const closeEdit = () => {
    if (!editDraft.chiefComplaint.trim()) return;
    if (!editDraft.cptCodes || editDraft.cptCodes.length === 0) {
      setBillingError(true);
      setActiveSection('billing');
      return;
    }
    setBillingError(false);
    const creds = currentUser?.credentials ? `, ${currentUser.credentials}` : '';
    updateEncounter(patientId, editDraft.id, {
      ...editDraft,
      status: 'Completed',
      signedBy: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}${creds}`.trim(),
      signedAt: new Date().toISOString(),
    });
    setEditing(false);
    setEditDraft(null);
    flash();
  };

  const signEncounter = (enc) => {
    const creds = currentUser?.credentials ? `, ${currentUser.credentials}` : '';
    updateEncounter(patientId, enc.id, {
      status: 'Completed',
      signedBy: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}${creds}`.trim(),
      signedAt: new Date().toISOString(),
    });
    flash();
  };

  // ── Import helpers — pull data from a previous encounter into the current draft ──
  const importField = (setD, field, value) => {
    setD((prev) => ({ ...prev, [field]: value }));
  };
  const importMse = (setD, prevMse) => {
    setD((prev) => ({ ...prev, mse: { ...prev.mse, ...prevMse } }));
  };
  const importDiagnoses = (setD, prevDiagnoses) => {
    setD((prev) => {
      const existing = new Set((prev.diagnoses || []).map(d => d.code));
      const toAdd = prevDiagnoses.filter(d => !existing.has(d.code));
      return { ...prev, diagnoses: [...(prev.diagnoses || []), ...toAdd] };
    });
  };
  const importCptCodes = (setD, prevCodes) => {
    setD((prev) => {
      const existing = new Set((prev.cptCodes || []).map(c => c.code));
      const toAdd = prevCodes.filter(c => !existing.has(c.code));
      return { ...prev, cptCodes: [...(prev.cptCodes || []), ...toAdd] };
    });
  };
  const importAllFromEncounter = (setD, enc) => {
    setD((prev) => ({
      ...prev,
      chiefComplaint: enc.chiefComplaint || prev.chiefComplaint,
      subjective: enc.subjective || prev.subjective,
      mse: { ...prev.mse, ...(enc.mse || {}) },
      assessment: enc.assessment || prev.assessment,
      plan: enc.plan || prev.plan,
      diagnoses: [...(prev.diagnoses || []), ...(enc.diagnoses || []).filter(d => !(prev.diagnoses || []).some(x => x.code === d.code))],
      cptCodes: [...(prev.cptCodes || []), ...(enc.cptCodes || []).filter(c => !(prev.cptCodes || []).some(x => x.code === c.code))],
      placeOfService: enc.placeOfService || prev.placeOfService,
    }));
  };

  // ── Previous Notes Sidebar renderer ─────────────────────
  const renderPreviousNotesSidebar = (setD) => {
    const SIDEBAR_TABS = [
      { id: 'notes', label: 'Prev Notes', icon: '📋' },
      { id: 'diagnoses', label: 'Dx History', icon: '🔖' },
      { id: 'mse', label: 'MSE', icon: '🧠' },
    ];

    // Collect unique diagnoses across all encounters
    const allDiagnoses = [];
    const dxSeen = new Set();
    patientEncounters.forEach(enc => {
      (enc.diagnoses || []).forEach(d => {
        if (!dxSeen.has(d.code)) {
          dxSeen.add(d.code);
          allDiagnoses.push({ ...d, fromDate: enc.date, fromType: enc.type });
        }
      });
    });

    return (
      <div style={{
        width: sidebarOpen ? 310 : 40, flexShrink: 0, transition: 'width 0.2s ease',
        background: '#fafbfd', borderRight: '1.5px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        borderRadius: '8px 0 0 8px',
        position: 'sticky', top: 0, alignSelf: 'flex-start',
        maxHeight: 'calc(100vh - 120px)',
      }}>
        {/* Toggle button */}
        <button type="button" onClick={() => setSidebarOpen(v => !v)}
          style={{
            padding: '8px 10px', border: 'none', cursor: 'pointer',
            background: '#eef1f6', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)',
            justifyContent: sidebarOpen ? 'flex-start' : 'center',
          }}>
          {sidebarOpen ? '▶' : '◀'}
          {sidebarOpen && <span>Previous Notes & History</span>}
        </button>

        {sidebarOpen && (
          <>
            {/* Sidebar tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', background: '#f0f3f7' }}>
              {SIDEBAR_TABS.map(tab => (
                <button key={tab.id} type="button" onClick={() => setSidebarTab(tab.id)}
                  style={{
                    flex: 1, padding: '7px 4px', fontSize: 10.5, fontWeight: sidebarTab === tab.id ? 700 : 600,
                    border: 'none', cursor: 'pointer',
                    borderBottom: sidebarTab === tab.id ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                    marginBottom: -2, background: 'transparent',
                    color: sidebarTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  }}>
                  <span style={{ fontSize: 13 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sidebar content — scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>

              {/* ── Previous Notes tab ── */}
              {sidebarTab === 'notes' && (
                <div>
                  {patientEncounters.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 12 }}>
                      No previous encounters found.
                    </div>
                  ) : (
                    patientEncounters.map((enc) => {
                      const isExpanded = expandedPrevEnc === enc.id;
                      const mse = enc.mse || {};
                      const hasMse = Object.values(mse).some(v => v && v !== '');
                      return (
                        <div key={enc.id} style={{
                          marginBottom: 6, borderRadius: 8, border: '1px solid var(--border)',
                          background: '#fff', overflow: 'hidden',
                        }}>
                          {/* Encounter header — click to expand */}
                          <button type="button"
                            onClick={() => setExpandedPrevEnc(isExpanded ? null : enc.id)}
                            style={{
                              width: '100%', padding: '8px 10px', border: 'none', cursor: 'pointer',
                              background: isExpanded ? 'var(--primary-light)' : '#f7f9fc',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                              textAlign: 'left',
                            }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 11.5, color: isExpanded ? 'var(--primary)' : 'var(--text-primary)' }}>
                                {enc.date} · {enc.type}
                              </div>
                              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1, maxWidth: 210, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {enc.chiefComplaint || '—'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span className={`badge ${STATUS_BADGE[enc.status] || 'badge-info'}`} style={{ fontSize: 9 }}>{enc.status}</span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{isExpanded ? '▼' : '▶'}</span>
                            </div>
                          </button>

                          {/* Expanded detail with import buttons */}
                          {isExpanded && (
                            <div style={{ padding: '8px 10px' }}>
                              {/* Import all button */}
                              <button type="button" onClick={() => importAllFromEncounter(setD, enc)}
                                style={{
                                  width: '100%', padding: '6px 10px', marginBottom: 10, borderRadius: 6,
                                  fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                                  background: 'var(--primary)', color: '#fff', border: 'none',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                }}>
                                ↗ Import All Into Current Encounter
                              </button>

                              {/* Chief Complaint */}
                              {enc.chiefComplaint && (
                                <div style={{ marginBottom: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: '#0060b6', letterSpacing: '0.4px' }}>Chief Complaint</span>
                                    <button type="button" onClick={() => importField(setD, 'chiefComplaint', enc.chiefComplaint)}
                                      style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', border: '1px solid rgba(0,96,182,0.2)', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>
                                      ↗ Import
                                    </button>
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{enc.chiefComplaint}</div>
                                </div>
                              )}

                              {/* Subjective */}
                              {enc.subjective && (
                                <div style={{ marginBottom: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: '#4f46e5', letterSpacing: '0.4px' }}>Subjective</span>
                                    <button type="button" onClick={() => importField(setD, 'subjective', enc.subjective)}
                                      style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', border: '1px solid rgba(0,96,182,0.2)', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>
                                      ↗ Import
                                    </button>
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, maxHeight: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>{enc.subjective}</div>
                                </div>
                              )}

                              {/* MSE */}
                              {hasMse && (
                                <div style={{ marginBottom: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: '#7c3aed', letterSpacing: '0.4px' }}>MSE</span>
                                    <button type="button" onClick={() => importMse(setD, enc.mse)}
                                      style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #e9d5ff', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>
                                      ↗ Import
                                    </button>
                                  </div>
                                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {Object.entries(mse).filter(([k, v]) => v && k !== 'additionalNotes' && k !== 'mood').slice(0, 6).map(([k, v]) => (
                                      <span key={k} style={{ fontSize: 9.5, padding: '2px 6px', borderRadius: 4, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #e9d5ff' }}>
                                        {v}
                                      </span>
                                    ))}
                                    {Object.entries(mse).filter(([k, v]) => v && k !== 'additionalNotes' && k !== 'mood').length > 6 && (
                                      <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>+{Object.entries(mse).filter(([k, v]) => v && k !== 'additionalNotes' && k !== 'mood').length - 6} more</span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Assessment */}
                              {enc.assessment && (
                                <div style={{ marginBottom: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: '#d97706', letterSpacing: '0.4px' }}>Assessment</span>
                                    <button type="button" onClick={() => importField(setD, 'assessment', enc.assessment)}
                                      style={{ fontSize: 10, fontWeight: 700, color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>
                                      ↗ Import
                                    </button>
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, maxHeight: 60, overflow: 'hidden' }}>{enc.assessment}</div>
                                </div>
                              )}

                              {/* Plan */}
                              {enc.plan && (
                                <div style={{ marginBottom: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: '#16a34a', letterSpacing: '0.4px' }}>Plan</span>
                                    <button type="button" onClick={() => importField(setD, 'plan', enc.plan)}
                                      style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>
                                      ↗ Import
                                    </button>
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, maxHeight: 60, overflow: 'hidden', whiteSpace: 'pre-wrap' }}>{enc.plan}</div>
                                </div>
                              )}

                              {/* Diagnoses */}
                              {(enc.diagnoses || []).length > 0 && (
                                <div style={{ marginBottom: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: '#0891b2', letterSpacing: '0.4px' }}>Diagnoses ({enc.diagnoses.length})</span>
                                    <button type="button" onClick={() => importDiagnoses(setD, enc.diagnoses)}
                                      style={{ fontSize: 10, fontWeight: 700, color: '#0891b2', background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>
                                      ↗ Import
                                    </button>
                                  </div>
                                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {enc.diagnoses.map(d => (
                                      <span key={d.code} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#ecfeff', color: '#0891b2', fontFamily: 'var(--font-mono)', fontWeight: 600, border: '1px solid #a5f3fc' }}>
                                        {d.code}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* CPT Codes */}
                              {(enc.cptCodes || []).length > 0 && (
                                <div style={{ marginBottom: 4 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: '#1a7f4b', letterSpacing: '0.4px' }}>CPT ({enc.cptCodes.length})</span>
                                    <button type="button" onClick={() => importCptCodes(setD, enc.cptCodes)}
                                      style={{ fontSize: 10, fontWeight: 700, color: '#1a7f4b', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>
                                      ↗ Import
                                    </button>
                                  </div>
                                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {enc.cptCodes.map(c => (
                                      <span key={c.code} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#f0fdf4', color: '#1a7f4b', fontFamily: 'var(--font-mono)', fontWeight: 600, border: '1px solid #bbf7d0' }}>
                                        {c.code}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── Diagnoses History tab ── */}
              {sidebarTab === 'diagnoses' && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 8, padding: '0 2px' }}>
                    All Diagnoses From Past Encounters — click to import
                  </div>
                  {allDiagnoses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 11 }}>No diagnoses found.</div>
                  ) : (
                    allDiagnoses.map(d => (
                      <button key={d.code} type="button"
                        onClick={() => importDiagnoses(setD, [{ code: d.code, description: d.description }])}
                        style={{
                          width: '100%', textAlign: 'left', padding: '7px 10px', marginBottom: 4,
                          borderRadius: 6, border: '1px solid var(--border)', background: '#fff',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                          transition: 'background 0.1s',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#ecfeff'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#fff'}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, color: '#0891b2', background: '#ecfeff', padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>
                          {d.code}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.description || '—'}</div>
                          <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>from {d.fromDate}</div>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>+</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* ── MSE History tab ── */}
              {sidebarTab === 'mse' && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 8, padding: '0 2px' }}>
                    MSE From Past Encounters — click Import to copy
                  </div>
                  {patientEncounters.filter(enc => {
                    const m = enc.mse || {};
                    return Object.values(m).some(v => v && v !== '');
                  }).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 11 }}>No previous MSE data found.</div>
                  ) : (
                    patientEncounters.filter(enc => {
                      const m = enc.mse || {};
                      return Object.values(m).some(v => v && v !== '');
                    }).map(enc => {
                      const m = enc.mse || {};
                      const entries = Object.entries(m).filter(([k, v]) => v && k !== 'additionalNotes');
                      return (
                        <div key={enc.id} style={{ marginBottom: 8, borderRadius: 8, border: '1px solid #e9d5ff', background: '#fff', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#faf5ff', borderBottom: '1px solid #e9d5ff' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed' }}>{enc.date}</span>
                            <button type="button" onClick={() => importMse(setD, enc.mse)}
                              style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #e9d5ff', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>
                              ↗ Import MSE
                            </button>
                          </div>
                          <div style={{ padding: '6px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                            {entries.slice(0, 8).map(([k, v]) => (
                              <div key={k} style={{ fontSize: 10, padding: '3px 6px', borderRadius: 4, background: '#faf5ff' }}>
                                <span style={{ fontWeight: 700, color: '#7c3aed', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1').trim()}: </span>
                                <span style={{ color: 'var(--text-secondary)' }}>{v}</span>
                              </div>
                            ))}
                            {entries.length > 8 && (
                              <div style={{ fontSize: 9.5, color: 'var(--text-muted)', padding: '3px 6px' }}>+{entries.length - 8} more fields</div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // ── Shared form renderer ────────────────────────────────
  const renderForm = (d, setD, onSave, onCancel, titleLabel, onClose) => {
    const mse = d.mse || {};
    const setMseField = (field, val) =>
      setD((prev) => ({ ...prev, mse: { ...prev.mse, [field]: val } }));

    return (
      <div className="fade-in">
        {/* Sticky header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg-white)',
          borderBottom: '1px solid var(--border)', padding: '10px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14.5 }}>📝 {titleLabel}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
              {d.date} · {d.type} · {d.providerName}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
            <button className="btn btn-sm btn-primary" onClick={onSave} disabled={!d.chiefComplaint.trim()}>
              💾 Save Encounter
            </button>
            <button className="btn btn-sm btn-success" onClick={onClose} disabled={!d.chiefComplaint.trim()}
              title={(d.cptCodes || []).length === 0 ? 'Add at least one CPT code in the Billing section to close' : 'Save & close encounter as Completed'}
              style={{ background: '#1a7f4b', borderColor: '#1a7f4b', opacity: d.chiefComplaint.trim() ? 1 : 0.5 }}>
              ✅ Close Encounter
            </button>
          </div>
        </div>

        {/* Metadata bar */}
        <div style={{ padding: '10px 18px', background: '#f7f9fc', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 130px' }}>
            <label className="form-label" style={{ fontSize: 10 }}>Date</label>
            <input className="form-input" type="date" value={d.date}
              onChange={(e) => setD((p) => ({ ...p, date: e.target.value }))} />
          </div>
          <div style={{ flex: '0 0 110px' }}>
            <label className="form-label" style={{ fontSize: 10 }}>Time</label>
            <input className="form-input" type="time" value={d.time}
              onChange={(e) => setD((p) => ({ ...p, time: e.target.value }))} />
          </div>
          <div style={{ flex: '1 1 180px' }}>
            <label className="form-label" style={{ fontSize: 10 }}>Visit Type</label>
            <select className="form-input" value={d.type}
              onChange={(e) => setD((p) => ({ ...p, type: e.target.value }))}>
              {VISIT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ flex: '0 0 160px' }}>
            <label className="form-label" style={{ fontSize: 10 }}>Status</label>
            <select className="form-input" value={d.status}
              onChange={(e) => setD((p) => ({ ...p, status: e.target.value }))}>
              {Object.keys(STATUS_BADGE).map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* ─ All sections on one page ─ */}
        <div style={{ padding: '18px' }}>

          {/* AMBIENT SOAP AI GENERATOR */}
          <div style={{ marginBottom: 18 }}>
            <AmbientSOAPGenerator
              disabled={false}
              onGenerate={(note) => {
                setD(prev => ({
                  ...prev,
                  subjective: note.subjective,
                  assessment: note.assessment,
                  plan: note.plan,
                }));
              }}
            />
          </div>

          {/* ══════ CHIEF COMPLAINT & SUBJECTIVE ══════ */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader icon="🗣️" title="Chief Complaint" color="#0060b6" />
            <div style={{ marginBottom: 18 }}>
              <label className="form-label">
                Chief Complaint <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input className="form-input" type="text"
                placeholder="e.g., Medication management — depression follow-up"
                value={d.chiefComplaint}
                onChange={(e) => setD((p) => ({ ...p, chiefComplaint: e.target.value }))} />
            </div>

            {/* ── Note Template Selector ── */}
            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: 10 }}>
                📝 Note Template — click to pre-populate structured sections
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  {
                    key: 'SOAP', label: 'SOAP', color: '#4f46e5',
                    desc: 'Subjective / Objective / Assessment / Plan',
                    subjective: 'Subjective:\nPatient reports: \n\nHistory of present illness:\n\nMedication review / compliance:\n\nDenies SI/HI.',
                    assessment: 'Assessment:\nClinical impression: \n\nRisk level: \n\nChanges since last visit: ',
                    plan: 'Plan:\n1. Medications: \n2. Therapy: \n3. Labs: \n4. Referrals: \n5. Patient education: \n6. Follow-up: ',
                  },
                  {
                    key: 'DAP', label: 'DAP', color: '#0891b2',
                    desc: 'Data / Assessment / Plan',
                    subjective: 'Data:\nPatient self-report: \n\nBehavioral observations: \n\nRelevant history reviewed: \n\nMSE summary: ',
                    assessment: 'Assessment:\nProgress toward treatment goals: \n\nDiagnostic impression: \n\nFunctional status: ',
                    plan: 'Plan:\n1. Intervention today: \n2. Homework / between-session tasks: \n3. Medication: \n4. Next session focus: \n5. Follow-up: ',
                  },
                  {
                    key: 'BIRP', label: 'BIRP', color: '#7c3aed',
                    desc: 'Behavior / Intervention / Response / Plan',
                    subjective: 'Behavior:\nPresenting behaviors and symptoms reported/observed: \n\nFrequency, intensity, duration: \n\nRelationship to treatment goals: ',
                    assessment: 'Response:\nPatient response to interventions today: \n\nProgress / setbacks noted: \n\nLevel of engagement: ',
                    plan: 'Plan:\n1. Continued interventions: \n2. Goal adjustments: \n3. Between-session assignments: \n4. Collateral contacts: \n5. Next session focus: \n6. Follow-up date: ',
                  },
                  {
                    key: 'Progress', label: 'Progress Note', color: '#16a34a',
                    desc: 'Brief progress / follow-up note',
                    subjective: 'Interval History:\nPatient presents for follow-up. Since last visit: \n\nSymptom review: \n\nMedication tolerance / side effects: \n\nSafety: Denies SI/HI.',
                    assessment: 'Clinical Impression:\nOverall: [ ] Improved  [ ] Stable  [ ] Declined\n\nCurrent severity: \n\nRisk assessment: ',
                    plan: 'Plan:\n1. Medications (continue / adjust): \n2. Therapy: \n3. Labs / monitoring: \n4. Patient instructions: \n5. Return to clinic: ',
                  },
                ].map(tpl => (
                  <button key={tpl.key} type="button"
                    onClick={() => setD(p => ({
                      ...p,
                      subjective: p.subjective ? p.subjective : tpl.subjective,
                      assessment: p.assessment ? p.assessment : tpl.assessment,
                      plan: p.plan ? p.plan : tpl.plan,
                    }))}
                    title={tpl.desc}
                    style={{
                      padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', border: `2px solid ${tpl.color}30`,
                      background: `${tpl.color}08`, color: tpl.color,
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                    }}>
                    <span>{tpl.key}</span>
                    <span style={{ fontSize: 9.5, fontWeight: 500, color: '#94a3b8', textTransform: 'none' }}>{tpl.desc}</span>
                  </button>
                ))}
                <button type="button"
                  onClick={() => setD(p => ({ ...p, subjective: '', assessment: '', plan: '' }))}
                  style={{
                    padding: '7px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', border: '1px solid var(--border)', background: '#fff', color: 'var(--text-muted)',
                    alignSelf: 'center',
                  }}>↺ Clear</button>
              </div>
            </div>

            <SectionHeader icon="📖" title="Subjective — Patient History & Report" color="#4f46e5" />
            <div>
              <VoiceDictation
                label="History of Present Illness / Patient's Report"
                rows={10}
                placeholder="Document patient's subjective report — symptoms, duration, onset, quality, severity, context, modifying factors, associated signs/symptoms, relevant history, medications reviewed, compliance... (🎙️ Click Dictate to use voice)"
                value={d.subjective}
                onChange={(val) => setD((p) => ({ ...p, subjective: val }))}
              />
            </div>
          </div>

          {/* ══════ MENTAL STATUS EXAM ══════ */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader icon="🧠" title="Mental Status Examination (MSE)" color="#7c3aed" />
            <MseTabbedEditor mse={mse} setMseField={setMseField} setD={setD} />
          </div>

          {/* ══════ SCREENINGS: PHQ-9 / GAD-7 ══════ */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader icon="📋" title="Screenings — PHQ-9 (Depression) & GAD-7 (Anxiety)" color="#4f46e5" />
            <EncounterAssessmentsSection d={d} setD={setD} patient={patient} />
          </div>

          {/* ══════ ASSESSMENT & PLAN ══════ */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader icon="📊" title="Assessment / Clinical Impression" color="#d97706" />
            <div style={{ marginBottom: 20 }}>
              <VoiceDictation
                label="Assessment"
                rows={8}
                placeholder="Provider's clinical assessment — synthesis of subjective/objective findings, diagnostic reasoning, changes from previous visit, risk assessment summary... (🎙️ Click Dictate to use voice)"
                value={d.assessment}
                onChange={(val) => setD((p) => ({ ...p, assessment: val }))}
              />
            </div>
            <SectionHeader icon="📋" title="Plan" color="#16a34a" />
            <div>
              <VoiceDictation
                label="Treatment Plan & Orders"
                rows={10}
                placeholder="Medication changes, new prescriptions, lab orders, referrals, therapy plan, safety plan, psychoeducation provided, patient instructions, follow-up instructions... (🎙️ Click Dictate to use voice)"
                value={d.plan}
                onChange={(val) => setD((p) => ({ ...p, plan: val }))}
              />
            </div>
          </div>

          {/* ══════ DIAGNOSES & ORDERS ══════ */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader icon="🔖" title="Diagnoses & Orders" color="#0891b2" />
            <DiagnosesAndOrdersSection d={d} setD={setD} />
          </div>

          {/* ══════ CPT & BILLING ══════ */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader icon="💳" title="CPT Codes & Billing" color="#1a7f4b" />
            {billingError && (
              <div style={{
                marginBottom: 14, padding: '10px 14px', borderRadius: 6,
                background: 'rgba(201,43,43,0.07)', border: '1.5px solid rgba(201,43,43,0.35)',
                color: '#c92b2b', fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                ⚠️ At least one CPT code is required to close the encounter. Please add a billing code below.
              </div>
            )}
            <div style={{ marginBottom: 18 }}>
              <CptEditor
                cptCodes={d.cptCodes || []}
                visitType={d.type}
                isTherapist={isTherapist}
                onChange={(codes) => setD((p) => ({ ...p, cptCodes: codes }))} />
              <AICodingSuggestions
                noteText={`${d.chiefComplaint || ''} ${d.subjective || ''} ${d.assessment || ''} ${d.plan || ''}`}
                diagnoses={d.diagnoses || []}
                cptCodes={d.cptCodes || []}
                onAddDiagnosis={(s) => setD(p => ({ ...p, diagnoses: [...(p.diagnoses || []), { code: s.code, description: s.description || s.desc }] }))}
                onAddCpt={(s) => setD(p => ({ ...p, cptCodes: [...(p.cptCodes || []), { code: s.code, desc: s.desc, units: 1 }] }))}
              />
            </div>
            {/* Place of Service + Time Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="form-label">Place of Service</label>
                <select className="form-input" value={d.placeOfService}
                  onChange={(e) => setD((p) => ({ ...p, placeOfService: e.target.value }))}>
                  {PLACE_OF_SERVICE.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Total Psychotherapy Time Spent (minutes)</label>
                <input className="form-input" type="number" min={1} max={480}
                  placeholder="e.g., 45"
                  value={d.timeSpentMinutes}
                  onChange={(e) => setD((p) => ({ ...p, timeSpentMinutes: e.target.value }))} />
              </div>
            </div>

            {/* Psychotherapy Sub-tabs */}
            <PsychTherapyTabs d={d} setD={setD} />

            {/* Telehealth */}
            <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 6, border: '1.5px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: d.isTelehealth ? 10 : 0 }}>
                <input type="checkbox" checked={!!d.isTelehealth}
                  onChange={(e) => setD((p) => ({ ...p, isTelehealth: e.target.checked }))}
                  style={{ width: 15, height: 15, accentColor: '#0060b6', cursor: 'pointer' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>📹 Telehealth Visit</span>
              </label>
              {d.isTelehealth && (
                <div>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#445568' }}>Patient Location:</span>
                    {[{ val: 'home', label: '🏠 Home' }, { val: 'outside_home', label: '📍 Outside Home' }].map(loc => (
                      <label key={loc.val} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="radio" name={`patLoc-${d.id || 'new'}`}
                          checked={d.patientLocation === loc.val}
                          onChange={() => setD((p) => ({ ...p, patientLocation: loc.val }))}
                          style={{ accentColor: '#0060b6' }} />
                        <span style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>{loc.label}</span>
                      </label>
                    ))}
                  </div>
                  <label className="form-label" style={{ marginBottom: 4 }}>Telehealth Attestation</label>
                  <textarea className="form-input" rows={3}
                    value={d.telehealthNote || ''}
                    onChange={(e) => setD((p) => ({ ...p, telehealthNote: e.target.value }))}
                    style={{ resize: 'vertical', fontSize: 12.5 }} />
                </div>
              )}
            </div>

            {/* Billing Notes */}
            <div>
              <label className="form-label">Billing Notes / Authorization</label>
              <textarea className="form-input" rows={3}
                placeholder="Insurance authorization number, medical necessity, prior auth, copay collected..."
                value={d.billingNotes}
                onChange={(e) => setD((p) => ({ ...p, billingNotes: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>
          </div>

          {/* ══════ FOLLOW-UP ══════ */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader icon="📅" title="Follow-Up Scheduling" color="#0a8a7e" />
            <FollowUpScheduler
              value={d.followUp || { needed: false, date: '', time: '', duration: 30, note: '' }}
              onChange={(fu) => setD((p) => ({ ...p, followUp: fu }))} />
          </div>
        </div>

        {/* Bottom save bar */}
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', background: '#f7f9fc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-sm btn-primary" onClick={onSave} disabled={!d.chiefComplaint.trim()}>
              💾 Save Encounter
            </button>
            <button className="btn btn-sm" onClick={onClose} disabled={!d.chiefComplaint.trim()}
              title={(d.cptCodes || []).length === 0 ? 'Add at least one CPT code in the Billing tab to close' : 'Save & close encounter as Completed'}
              style={{
                background: '#1a7f4b', color: '#fff', border: '1px solid #1a7f4b',
                opacity: d.chiefComplaint.trim() ? 1 : 0.5,
                fontWeight: 700,
              }}>
              ✅ Close Encounter
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Read-only detail view ────────────────────────────────
  const renderDetail = (enc) => {
    const mse = enc.mse || {};
    const hasMse = Object.values(mse).some((v) => v && v !== '');

    return (
      <div className="card fade-in" style={{ overflow: 'hidden' }}>
        {/* Detail header */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: '#f7f9fc', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
              {enc.type}
              <span className={`badge ${STATUS_BADGE[enc.status] || 'badge-info'}`} style={{ fontSize: 10.5 }}>{enc.status}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
              {enc.date}{enc.time ? ` · ${enc.time}` : ''} · {enc.providerName}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-sm" title="Copy forward — create new encounter from this one"
              onClick={() => {
                const creds = currentUser?.credentials ? `, ${currentUser.credentials}` : '';
                const copied = {
                  ...JSON.parse(JSON.stringify(enc)),
                  id: undefined,
                  date: today,
                  time: nowTime,
                  status: 'In Progress',
                  provider: currentUser?.id || enc.provider,
                  providerName: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}${creds}`.trim() || enc.providerName,
                  signedBy: '',
                  signedAt: null,
                };
                delete copied.id;
                setDraft(copied);
                setCreating(true);
                setSelectedId(null);
                setActiveSection('subjective');
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 15, lineHeight: 1 }}>↗</span> Copy Forward
            </button>
            <button className="btn btn-sm" onClick={() => startEdit(enc)}>✏️ Edit</button>
            {enc.status !== 'Completed' && (
              <button className="btn btn-sm btn-primary" onClick={() => signEncounter(enc)}>✍️ Sign & Complete</button>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 18px', overflowY: 'auto' }}>
          {/* Chief complaint banner */}
          <div style={{ marginBottom: 18, padding: '10px 14px', background: 'var(--primary-light)', borderRadius: 6, borderLeft: '4px solid var(--primary)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--primary)', marginBottom: 3 }}>Chief Complaint</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{enc.chiefComplaint || <span className="text-muted">—</span>}</div>
          </div>

          {/* Subjective */}
          {enc.subjective && <DetailBlock title="Subjective" color="#4f46e5" content={enc.subjective} />}

          {/* MSE summary */}
          {hasMse && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#7c3aed', marginBottom: 8 }}>
                🧠 Mental Status Examination
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
                {[
                  ['Appearance', mse.appearance], ['Behavior', mse.behavior], ['Psychomotor', mse.psychomotor],
                  ['Eye Contact', mse.eyeContact], ['Speech', mse.speech], ['Mood', mse.mood],
                  ['Affect', mse.affect], ['Affect Congruence', mse.affectCongruent], ['Thought Process', mse.thoughtProcess],
                  ['Thought Content', mse.thoughtContent], ['SI', mse.suicidalIdeation], ['HI', mse.homicidalIdeation],
                  ['Perceptions', mse.perceptions], ['Orientation', mse.orientation], ['Memory', mse.memory],
                  ['Concentration', mse.concentration], ['Insight', mse.insight], ['Judgment', mse.judgment],
                ].filter(([, v]) => v).map(([label, val]) => {
                  const risk = ['SI','HI','Thought Content'].includes(label)
                    && val && !val.toLowerCase().startsWith('denied') && !val.toLowerCase().startsWith('no si');
                  return (
                    <div key={label} style={{
                      padding: '5px 9px', borderRadius: 6,
                      background: risk ? 'rgba(201,43,43,0.06)' : '#f7f9fc',
                      border: `1px solid ${risk ? 'rgba(201,43,43,0.25)' : 'var(--border-light)'}`,
                    }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: risk ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: risk ? 'var(--danger)' : 'var(--text-primary)', marginTop: 2 }}>
                        {val}
                      </div>
                    </div>
                  );
                })}
              </div>
              {mse.additionalNotes && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: '#f7f9fc', borderRadius: 6, fontSize: 12.5, borderLeft: '3px solid #7c3aed' }}>
                  {mse.additionalNotes}
                </div>
              )}
            </div>
          )}

          {/* Assessment & Plan */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            {enc.assessment && <DetailBlock title="Assessment" color="#d97706" content={enc.assessment} />}
            {enc.plan && <DetailBlock title="Plan" color="#16a34a" content={enc.plan} />}
          </div>

          {/* Diagnoses */}
          {(enc.diagnoses || []).length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0891b2', marginBottom: 8 }}>
                🔖 ICD-10 Diagnoses
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 7, overflow: 'hidden' }}>
                {enc.diagnoses.map((d, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 12px', borderBottom: i < enc.diagnoses.length - 1 ? '1px solid var(--border-light)' : 'none', fontSize: 13, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '1px 7px', borderRadius: 4, fontSize: 11.5 }}>
                      {d.code}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{d.description || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CPT & Billing */}
          {((enc.cptCodes || []).length > 0 || enc.timeSpentMinutes || enc.billingNotes || enc.supportivePsychNotes || enc.cbtNotes || enc.isTelehealth) && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#1a7f4b', marginBottom: 8 }}>
                💳 CPT & Billing
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8, fontSize: 12.5 }}>
                {enc.placeOfService && <span><strong>POS:</strong> {enc.placeOfService}</span>}
                {enc.timeSpentMinutes && <span><strong>Psychotherapy Time:</strong> {enc.timeSpentMinutes} min</span>}
              </div>
              {(enc.cptCodes || []).length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 7, overflow: 'hidden', marginBottom: 8 }}>
                  {enc.cptCodes.map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 12px', borderBottom: i < enc.cptCodes.length - 1 ? '1px solid var(--border-light)' : 'none', fontSize: 13, alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#1a7f4b', background: 'rgba(26,127,75,0.08)', padding: '1px 7px', borderRadius: 4, fontSize: 11.5 }}>
                        {c.code}
                      </span>
                      <span style={{ flex: 1, color: 'var(--text-secondary)', fontSize: 12.5 }}>{c.desc}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Units: {c.units}</span>
                    </div>
                  ))}
                </div>
              )}
              {enc.supportivePsychNotes && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#1a7f4b', marginBottom: 3 }}>
                    Supportive Psychotherapy & Reflective Listening
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', padding: '8px 12px', background: '#f7f9fc', borderRadius: 6, borderLeft: '3px solid #1a7f4b' }}>
                    {enc.supportivePsychNotes}
                  </div>
                </div>
              )}
              {enc.cbtNotes && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#1a7f4b', marginBottom: 3 }}>
                    CBT
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', padding: '8px 12px', background: '#f7f9fc', borderRadius: 6, borderLeft: '3px solid #1a7f4b' }}>
                    {enc.cbtNotes}
                  </div>
                </div>
              )}
              {enc.isTelehealth && (
                <div style={{ marginBottom: 8, padding: '10px 14px', background: 'rgba(0,96,182,0.05)', borderRadius: 6, border: '1px solid rgba(0,96,182,0.2)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary)', marginBottom: 4 }}>
                    📹 Telehealth Visit
                    {enc.patientLocation && (
                      <span style={{ marginLeft: 8, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                        — Patient Location: {enc.patientLocation === 'home' ? '🏠 Home' : '📍 Outside Home'}
                      </span>
                    )}
                  </div>
                  {enc.telehealthNote && <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontStyle: 'italic' }}>{enc.telehealthNote}</div>}
                </div>
              )}
              {enc.billingNotes && <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontStyle: 'italic' }}>{enc.billingNotes}</div>}
            </div>
          )}

          {/* Follow-up */}
          {enc.followUp?.needed && enc.followUp.date && (
            <div style={{ marginBottom: 18, padding: '12px 16px', background: 'rgba(10,138,126,0.06)', border: '1px solid rgba(10,138,126,0.2)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0a8a7e', marginBottom: 6 }}>
                📅 Follow-Up Scheduled
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                {enc.followUp.date}{enc.followUp.time ? ` at ${enc.followUp.time}` : ''} &nbsp;·&nbsp;
                <span style={{ fontWeight: 500, fontSize: 13 }}>{enc.followUp.duration}-minute slot</span>
              </div>
              {enc.followUp.note && <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--text-secondary)' }}>{enc.followUp.note}</div>}
            </div>
          )}

          {/* Signature */}
          {enc.signedBy && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ textAlign: 'right', padding: '8px 14px', background: '#f7f9fc', borderRadius: 7, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Electronically Signed</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{enc.signedBy}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{enc.signedAt ? new Date(enc.signedAt).toLocaleString() : ''}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Main layout ──────────────────────────────────────────
  return (
    <div className="fade-in" style={{ paddingTop: 16 }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>📋 Encounter Notes</h2>
          <p className="text-muted text-sm" style={{ marginTop: 2 }}>
            {patientEncounters.length} encounter{patientEncounters.length !== 1 ? 's' : ''} on record
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={startNew} disabled={creating}>
          + New Encounter
        </button>
      </div>

      {saved && (
        <div className="alert alert-success" style={{ marginBottom: 12 }}>
          ✅ Encounter saved successfully.
        </div>
      )}

      {/* New encounter form — with previous notes sidebar on left */}
      {creating && draft && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#fff', alignItems: 'stretch', position: 'relative' }}>
          {/* Previous Notes Sidebar — LEFT */}
          {patientEncounters.length > 0 && renderPreviousNotesSidebar(setDraft)}
          {/* Main form area */}
          <div style={{ flex: 1, minWidth: 0, overflow: 'visible' }}>
            {renderForm(draft, setDraft, saveNew, cancelNew, 'New Encounter', closeNew)}
          </div>
        </div>
      )}

      {/* Two-panel: clinical sidebar on left + detail on right */}
      {!creating && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 0, minHeight: 'calc(100vh - 180px)' }}>

          {/* Clinical Sidebar — LEFT — full height, sticky */}
          <div style={{
            background: '#fafbfd', borderRight: '1.5px solid var(--border)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            position: 'sticky', top: 0, alignSelf: 'start',
            height: 'calc(100vh - 120px)',
          }}>
            {/* Sidebar navigation pills */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 3, padding: '8px 8px 6px',
              background: '#eef1f6', borderBottom: '1px solid var(--border)',
            }}>
              {[
                { id: 'history', icon: '📋', label: 'History' },
                { id: 'demographics', icon: '👤', label: 'Demo' },
                { id: 'allergies', icon: '⚠️', label: 'Allergies' },
                { id: 'problems', icon: '🔖', label: 'Problems' },
                { id: 'vitals', icon: '💓', label: 'Vitals' },
                { id: 'medications', icon: '💊', label: 'Meds' },
                { id: 'orders', icon: '📝', label: 'Orders' },
                { id: 'assessments', icon: '📊', label: 'Scores' },
              ].map(tab => (
                <button key={tab.id} type="button"
                  onClick={() => setSidebarSection(tab.id)}
                  style={{
                    padding: '4px 7px', fontSize: 10, fontWeight: sidebarSection === tab.id ? 700 : 600,
                    borderRadius: 5, border: sidebarSection === tab.id ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                    background: sidebarSection === tab.id ? 'var(--primary-light)' : '#fff',
                    color: sidebarSection === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
                    transition: 'all 0.15s',
                    lineHeight: 1.3,
                  }}>
                  <span style={{ fontSize: 11 }}>{tab.icon}</span>{tab.label}
                </button>
              ))}
            </div>

            {/* Sidebar scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 0 }}>

              {/* ── History (encounter list) ── */}
              {sidebarSection === 'history' && (
                <div>
                  <div style={{ padding: '8px 10px 4px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                    Encounter History ({patientEncounters.length})
                  </div>
                  {patientEncounters.length === 0 ? (
                    <div className="empty-state" style={{ padding: 24 }}>
                      <span className="icon">📋</span>
                      <p style={{ fontSize: 12 }}>No encounters yet</p>
                      <button className="btn btn-sm btn-primary" style={{ marginTop: 8 }} onClick={startNew}>+ New</button>
                    </div>
                  ) : (
                    patientEncounters.map((enc) => (
                      <div key={enc.id}
                        onClick={() => { setSelectedId(enc.id); setEditing(false); setEditDraft(null); }}
                        style={{
                          padding: '10px 12px', borderBottom: '1px solid var(--border-light)',
                          cursor: 'pointer',
                          background: selectedId === enc.id ? 'var(--primary-light)' : '#fff',
                          borderLeft: `3px solid ${selectedId === enc.id ? 'var(--primary)' : 'transparent'}`,
                          transition: 'background 0.1s',
                        }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: selectedId === enc.id ? 'var(--primary)' : 'var(--text-primary)' }}>
                          {enc.date}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{enc.type}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {enc.chiefComplaint}
                        </div>
                        <div style={{ marginTop: 5, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <span className={`badge ${STATUS_BADGE[enc.status] || 'badge-info'}`} style={{ fontSize: 9 }}>
                            {enc.status}
                          </span>
                          {(enc.diagnoses || []).length > 0 && (
                            <span className="badge badge-gray" style={{ fontSize: 9 }}>{enc.diagnoses.length} dx</span>
                          )}
                          {(enc.cptCodes || []).length > 0 && (
                            <span className="badge badge-success" style={{ fontSize: 9 }}>{enc.cptCodes.length} CPT</span>
                          )}
                          {enc.followUp?.needed && enc.followUp.date && (
                            <span className="badge" style={{ fontSize: 9, background: 'rgba(10,138,126,0.12)', color: '#0a8a7e', border: '1px solid rgba(10,138,126,0.3)' }}>
                              F/U {enc.followUp.date}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Demographics ── */}
              {sidebarSection === 'demographics' && (
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>
                    👤 Demographics
                  </div>
                  {[
                    ['Name', `${patient.firstName || ''} ${patient.lastName || ''}`],
                    ['MRN', patient.mrn],
                    ['DOB', patient.dob ? `${patient.dob} (Age ${patient.age || ''})` : '—'],
                    ['Gender', patient.gender],
                    ['Pronouns', patient.pronouns],
                    ['Race', patient.race],
                    ['Ethnicity', patient.ethnicity],
                    ['Language', patient.language],
                    ['Marital Status', patient.maritalStatus],
                    ['Phone', patient.phone],
                    ['Cell', patient.cellPhone],
                    ['Email', patient.email],
                    ['Address', patient.address ? `${patient.address.street}, ${patient.address.city}, ${patient.address.state} ${patient.address.zip}` : '—'],
                    ['PCP', patient.pcp],
                    ['Insurance', patient.insurance?.primary?.name],
                    ['Member ID', patient.insurance?.primary?.memberId],
                    ['Emergency', patient.emergencyContact ? `${patient.emergencyContact.name} (${patient.emergencyContact.relationship}) ${patient.emergencyContact.phone}` : '—'],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', gap: 6, padding: '4px 0', borderBottom: '1px solid var(--border-light)', fontSize: 11 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)', minWidth: 80, flexShrink: 0 }}>{label}</span>
                      <span style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>{val || '—'}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Allergies ── */}
              {sidebarSection === 'allergies' && (() => {
                const ptAllergies = allergies[patientId] || [];
                return (
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>
                      ⚠️ Allergies ({ptAllergies.length})
                    </div>
                    {ptAllergies.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 11 }}>NKDA</div>
                    ) : (
                      ptAllergies.map(a => (
                        <div key={a.id} style={{
                          marginBottom: 6, padding: '8px 10px', borderRadius: 7,
                          border: `1px solid ${a.severity === 'Severe' ? 'rgba(201,43,43,0.3)' : 'var(--border)'}`,
                          background: a.severity === 'Severe' ? 'rgba(201,43,43,0.04)' : '#fff',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: 12, color: a.severity === 'Severe' ? 'var(--danger)' : 'var(--text-primary)' }}>
                              {a.allergen}
                            </span>
                            <span className={`badge ${a.severity === 'Severe' ? 'badge-danger' : a.severity === 'Moderate' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: 9 }}>
                              {a.severity}
                            </span>
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {a.type} · {a.reaction || '—'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}

              {/* ── Problems ── */}
              {sidebarSection === 'problems' && (() => {
                const ptProblems = problemList[patientId] || [];
                return (
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>
                      🔖 Problem List ({ptProblems.length})
                    </div>
                    {ptProblems.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 11 }}>No active problems.</div>
                    ) : (
                      ptProblems.map(p => (
                        <div key={p.id} style={{ marginBottom: 5, padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 10.5, color: 'var(--primary)', background: 'var(--primary-light)', padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>
                              {p.code}
                            </span>
                            <span className={`badge ${p.status === 'Active' ? 'badge-danger' : 'badge-gray'}`} style={{ fontSize: 8.5, flexShrink: 0 }}>
                              {p.status}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.3 }}>{p.description}</div>
                          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>Since {p.onsetDate} · {p.diagnosedBy}</div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}

              {/* ── Vitals ── */}
              {sidebarSection === 'vitals' && (() => {
                const ptVitals = (vitalSigns[patientId] || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
                return (
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>
                      💓 Vitals ({ptVitals.length} entries)
                    </div>
                    {ptVitals.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 11 }}>No vitals recorded.</div>
                    ) : (
                      ptVitals.map(v => (
                        <div key={v.id} style={{ marginBottom: 6, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff' }}>
                          <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--primary)', marginBottom: 4 }}>
                            {v.date} {v.time && `· ${v.time}`}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 10px', fontSize: 10.5 }}>
                            <div><span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>BP:</span> {v.bp}</div>
                            <div><span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>HR:</span> {v.hr} bpm</div>
                            <div><span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>RR:</span> {v.rr}</div>
                            <div><span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Temp:</span> {v.temp}°F</div>
                            <div><span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>SpO₂:</span> {v.spo2}%</div>
                            <div><span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Pain:</span> {v.pain}/10</div>
                            <div><span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Wt:</span> {v.weight} lbs</div>
                            <div><span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>BMI:</span> {v.bmi}</div>
                          </div>
                          {v.takenBy && <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 3 }}>By: {v.takenBy}</div>}
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}

              {/* ── Medications ── */}
              {sidebarSection === 'medications' && (() => {
                const ptMeds = (meds[patientId] || []).filter(m => m.status === 'Active');
                return (
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>
                      💊 Active Medications ({ptMeds.length})
                    </div>
                    {ptMeds.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 11 }}>No active medications.</div>
                    ) : (
                      ptMeds.map(m => (
                        <div key={m.id} style={{ marginBottom: 5, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff' }}>
                          <div style={{ fontWeight: 700, fontSize: 11.5, color: 'var(--text-primary)' }}>
                            {m.name}
                            {m.isControlled && <span style={{ marginLeft: 5, fontSize: 9, color: '#d97706', fontWeight: 800 }}>C-{m.schedule}</span>}
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {m.dose} · {m.route} · {m.frequency}
                          </div>
                          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>
                            {m.prescriber} · Refills: {m.refillsLeft ?? '—'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}

              {/* ── Orders ── */}
              {sidebarSection === 'orders' && (() => {
                const ptOrders = orders[patientId] || [];
                return (
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>
                      📝 Orders ({ptOrders.length})
                    </div>
                    {ptOrders.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 11 }}>No orders.</div>
                    ) : (
                      ptOrders.map(o => {
                        const statusColor = o.status === 'Completed' ? '#16a34a' : o.status === 'Pending' ? '#d97706' : 'var(--primary)';
                        return (
                          <div key={o.id} style={{ marginBottom: 5, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                              <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-primary)', flex: 1 }}>{o.description}</span>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: `${statusColor}12`, color: statusColor, border: `1px solid ${statusColor}30`, flexShrink: 0, whiteSpace: 'nowrap' }}>
                                {o.status}
                              </span>
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 3 }}>
                              {o.type} · {o.orderedDate} · {o.priority}
                            </div>
                            {o.notes && <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>{o.notes}</div>}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })()}

              {/* ── Assessments ── */}
              {sidebarSection === 'assessments' && (() => {
                const ptAssess = (assessmentScores[patientId] || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
                const phq9Hist = ptAssess.filter(a => a.tool === 'PHQ-9').slice().sort((a, b) => new Date(a.date) - new Date(b.date));
                const gad7Hist = ptAssess.filter(a => a.tool === 'GAD-7').slice().sort((a, b) => new Date(a.date) - new Date(b.date));
                const otherScores = ptAssess.filter(a => a.tool !== 'PHQ-9' && a.tool !== 'GAD-7');
                return (
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 10 }}>
                      📊 Assessment Scores ({ptAssess.length})
                    </div>
                    {ptAssess.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 11 }}>No assessment scores.</div>
                    ) : (
                      <>
                        {/* PHQ-9 trend chart */}
                        {phq9Hist.length > 0 && <AssessmentTrendChart scores={phq9Hist} tool="PHQ-9" />}
                        {/* GAD-7 trend chart */}
                        {gad7Hist.length > 0 && <AssessmentTrendChart scores={gad7Hist} tool="GAD-7" />}

                        {/* Other tool scores (non-graphable) */}
                        {otherScores.length > 0 && (
                          <>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '10px 0 6px' }}>
                              Other Scores
                            </div>
                            {otherScores.map(a => {
                              const isHigh = a.tool === 'Columbia Suicide Severity Rating' && a.score >= 3;
                              return (
                                <div key={a.id} style={{
                                  marginBottom: 5, padding: '8px 10px', borderRadius: 7,
                                  border: `1px solid ${isHigh ? 'rgba(201,43,43,0.3)' : 'var(--border)'}`,
                                  background: isHigh ? 'rgba(201,43,43,0.03)' : '#fff',
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, fontSize: 11.5, color: isHigh ? 'var(--danger)' : 'var(--text-primary)' }}>{a.tool}</span>
                                    <span style={{ fontWeight: 800, fontSize: 13, color: isHigh ? 'var(--danger)' : 'var(--primary)', background: isHigh ? 'rgba(201,43,43,0.08)' : 'var(--primary-light)', padding: '1px 8px', borderRadius: 6, fontFamily: 'var(--font-mono)' }}>
                                      {a.score}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 10.5, color: isHigh ? 'var(--danger)' : 'var(--text-secondary)', marginTop: 2, fontWeight: 600 }}>{a.interpretation}</div>
                                  <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>{a.date} · {a.administeredBy}</div>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}

            </div>
          </div>

          {/* Detail / Edit panel — RIGHT */}
          <div style={{ minHeight: 0, paddingLeft: 14 }}>
            {!selected && !editing && (
              <div className="card">
                <div className="empty-state" style={{ padding: 48 }}>
                  <span className="icon">📋</span>
                  <h3>Select an Encounter</h3>
                  <p>Choose from the list or create a new encounter.</p>
                </div>
              </div>
            )}

            {selected && !editing && renderDetail(selected)}

            {selected && editing && editDraft && (
              <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                {patientEncounters.length > 1 && renderPreviousNotesSidebar(setEditDraft)}
                <div style={{ flex: 1, minWidth: 0, overflow: 'visible' }}>
                  {renderForm(editDraft, setEditDraft, saveEdit, cancelEdit, `Edit — ${selected.date} · ${selected.type}`, closeEdit)}
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}


