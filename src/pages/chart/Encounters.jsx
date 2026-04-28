import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePatient } from '../../contexts/PatientContext';
import { useAuth } from '../../contexts/AuthContext';
import { icd10 as icd10Api } from '../../services/api';

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
    cptCodes: [],
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

          {/* ══════ DIAGNOSES ══════ */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader icon="🔖" title="Diagnoses — ICD-10 Codes" color="#0891b2" />
            <DiagnosesEditor
              diagnoses={d.diagnoses || []}
              onChange={(diags) => setD((p) => ({ ...p, diagnoses: diags }))} />
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
                return (
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>
                      📊 Assessment Scores ({ptAssess.length})
                    </div>
                    {ptAssess.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 11 }}>No assessment scores.</div>
                    ) : (
                      ptAssess.map(a => {
                        const isHigh = (a.tool === 'PHQ-9' && a.score >= 15) || (a.tool === 'GAD-7' && a.score >= 15) || (a.tool === 'Columbia Suicide Severity Rating' && a.score >= 3);
                        return (
                          <div key={a.id} style={{
                            marginBottom: 5, padding: '8px 10px', borderRadius: 7,
                            border: `1px solid ${isHigh ? 'rgba(201,43,43,0.3)' : 'var(--border)'}`,
                            background: isHigh ? 'rgba(201,43,43,0.03)' : '#fff',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, fontSize: 11.5, color: isHigh ? 'var(--danger)' : 'var(--text-primary)' }}>{a.tool}</span>
                              <span style={{
                                fontWeight: 800, fontSize: 13, color: isHigh ? 'var(--danger)' : 'var(--primary)',
                                background: isHigh ? 'rgba(201,43,43,0.08)' : 'var(--primary-light)',
                                padding: '1px 8px', borderRadius: 6, fontFamily: 'var(--font-mono)',
                              }}>
                                {a.score}
                              </span>
                            </div>
                            <div style={{ fontSize: 10.5, color: isHigh ? 'var(--danger)' : 'var(--text-secondary)', marginTop: 2, fontWeight: 600 }}>
                              {a.interpretation}
                            </div>
                            <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>{a.date} · {a.administeredBy}</div>
                          </div>
                        );
                      })
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


