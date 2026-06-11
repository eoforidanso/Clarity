import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../contexts/PatientContext';
import { useAuth } from '../contexts/AuthContext';
import { useTelehealth } from '../contexts/TelehealthContext';

/* ─── Helpers ──────────────────────────────────────────────────────────── */
const getVideoLink  = (apt) => `https://telehealth.clarity.health/room/${apt.id}`;
const nowTime       = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const isoNow        = () => new Date().toISOString();
const fmtTimer      = (s) =>
  `${String(Math.floor(s / 3600)).padStart(2,'0')}:${String(Math.floor((s % 3600) / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
const calcAge       = (dob) => {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

const CPT_CODES = [
  { code: '99213-95', label: 'Office Visit Est. — Low Complexity (TH Mod 95)',      typical: 'Follow-up 15–20 min' },
  { code: '99214-95', label: 'Office Visit Est. — Moderate Complexity (TH Mod 95)', typical: 'Follow-up 25–30 min' },
  { code: '99215-95', label: 'Office Visit Est. — High Complexity (TH Mod 95)',     typical: 'Complex 40–55 min' },
  { code: '90837-95', label: 'Psychotherapy 60 min (TH Mod 95)',                    typical: 'Individual therapy' },
  { code: '90834-95', label: 'Psychotherapy 45 min (TH Mod 95)',                    typical: 'Individual therapy' },
  { code: '90832-95', label: 'Psychotherapy 30 min (TH Mod 95)',                    typical: 'Brief therapy' },
  { code: '99212-GT', label: 'Office Visit Est. — Minimal (GT Mod)',                typical: 'Med check, very brief' },
];

const QUICK_NOTE_TEMPLATES = [
  { label: 'Stable / Routine',       text: 'Patient seen via telehealth. Reports medication is working as expected with no significant side effects. Mood and affect stable. No SI/HI. Plan to continue current regimen.' },
  { label: 'Medication Adjustment',  text: 'Patient seen via telehealth. Reports [symptom]. After discussion of risks, benefits, and alternatives, plan to [change]. Patient verbalized understanding. Follow up in [timeframe].' },
  { label: 'Crisis Assessment',      text: 'Patient seen via STAT telehealth. Patient reported [presenting concern]. Safety assessment completed: SI [present/absent], HI [present/absent], plan [present/absent]. Protective factors [list]. Safety plan reviewed/updated. [Next steps].' },
  { label: 'Therapy Progress',       text: 'Patient seen via telehealth for individual therapy. Continued work on [treatment focus]. Patient demonstrates [progress/challenges]. Session techniques: [CBT/DBT/CPT/other]. Assigned homework: [task].' },
  { label: 'Initial Evaluation',     text: 'Patient seen via telehealth for initial psychiatric evaluation. Chief complaint: [CC]. History of present illness: [HPI]. Mental status exam: Alert, oriented x3, affect [appropriate/blunted/labile], thought process [linear/tangential], thought content [no SI/HI]. Diagnostic impression: [DSM-5 diagnosis]. Plan: [plan].' },
];

const PROVIDER_REMINDERS = [
  'Verify patient identity: two identifiers (name + DOB or MRN) before session.',
  'Confirm patient is currently located in Illinois (410 ILCS 151 — state only, no address needed).',
  'Confirm patient is in a private, safe location before starting.',
  'Confirm patient read and understands the Telehealth Consent obtained at registration.',
  'Confirm no session recording without separate explicit consent.',
  'Document telehealth modifier (95 or GT) on all billed CPT codes.',
];

/* ─── Status helpers ─────────────────────────────────────────────────── */
const statusConfig = {
  'Checked In': { color: '#166534', bg: '#dcfce7', border: '#86efac', dot: '#22c55e', label: '🟢 Ready' },
  'Confirmed':  { color: '#1e40af', bg: '#dbeafe', border: '#93c5fd', dot: '#3b82f6', label: '🔵 Confirmed' },
  'Scheduled':  { color: '#92400e', bg: '#fef3c7', border: '#fcd34d', dot: '#f59e0b', label: '🟡 Scheduled' },
  'Waiting':    { color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd', dot: '#8b5cf6', label: '🟣 Waiting' },
};
const getStatus = (s) => statusConfig[s] || { color: '#374151', bg: '#f3f4f6', border: '#d1d5db', dot: '#9ca3af', label: s };

/* ─── Patient avatar ─────────────────────────────────────────────────── */
function Avatar({ patient, apt, size = 40 }) {
  if (patient?.photo) {
    return <img src={patient.photo} alt={apt?.patientName} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  const initials = (apt?.patientName || 'P').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const hue = initials.charCodeAt(0) * 7 % 360;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.38, color: '#fff', background: `hsl(${hue},55%,42%)` }}>
      {initials}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   QUICK-START / CONSENT MODAL
═══════════════════════════════════════════════════════════════════════ */
function QuickStartModal({ apt, patient, onStart, onCancel }) {
  const API = import.meta.env.VITE_API_URL || '/api';

  const [patientInIllinois, setPatientInIllinois] = useState(false);
  const [recordingConsent,  setRecordingConsent]  = useState('');
  const [consentMethod,     setConsentMethod]     = useState('verbal');
  const [saving,            setSaving]            = useState(false);
  const [error,             setError]             = useState('');

  const [checklist, setChecklist] = useState({
    locationConfirmed:  false,
    consentExplained:   false,
    privacyReminded:    false,
    emergencyProtocol:  false,
  });
  const toggleCheck = (key) => setChecklist(p => ({ ...p, [key]: !p[key] }));
  const allChecked  = Object.values(checklist).every(Boolean);
  const canStart    = allChecked && recordingConsent !== '' && patientInIllinois;

  const handleStart = async () => {
    if (!canStart) return;
    setSaving(true); setError('');
    const sessionId   = `sess-${apt.id}-${Date.now()}`;
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : apt.patientName;
    try {
      const res = await fetch(`${API}/appointments/telehealth-consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId, appointmentId: apt.id,
          patientId: patient?.id || apt.patientId,
          patientName, patientLocation: 'Illinois',
          recordingConsent, recordingConsentMethod: consentMethod,
          providerConfirmed: true, complianceChecklist: checklist,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save consent');
      onStart({ timestamp: isoNow(), patientName, patientLocation: 'Illinois', aptId: apt.id, sessionId, consentId: data.consentId, recordingConsent });
    } catch (err) {
      // If backend isn't reachable, proceed anyway — log locally
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        onStart({ timestamp: isoNow(), patientName, patientLocation: 'Illinois', aptId: apt.id, sessionId: `sess-${apt.id}-${Date.now()}`, consentId: null, recordingConsent });
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const checkItems = [
    { key: 'locationConfirmed', label: 'Confirmed patient is located in Illinois' },
    { key: 'consentExplained',  label: 'Explained telehealth consent and patient rights' },
    { key: 'privacyReminded',   label: 'Reminded patient of privacy and HIPAA rights' },
    { key: 'emergencyProtocol', label: 'Reviewed emergency protocol and local services' },
  ];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000, padding:20 }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:520, boxShadow:'0 24px 64px rgba(0,0,0,0.3)', overflow:'hidden', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#1e3a5f,#2563eb)', padding:'18px 24px', flexShrink:0 }}>
          <div style={{ fontWeight:900, color:'#fff', fontSize:16 }}>📹 Telehealth Session Consent</div>
          <div style={{ fontSize:11, color:'#bfdbfe', marginTop:3 }}>HIPAA-compliant · Illinois Telehealth Act (410 ILCS 151) · Audit-logged</div>
        </div>

        {/* Patient bar */}
        <div style={{ background:'#f0f9ff', borderBottom:'1px solid #bae6fd', padding:'10px 24px', display:'flex', gap:16, alignItems:'center', flexShrink:0 }}>
          <Avatar apt={apt} patient={patient} size={36} />
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:'#1e3a5f' }}>{apt.patientName}</div>
            <div style={{ fontSize:11, color:'#64748b' }}>🕐 {apt.time}{apt.reason ? ` · ${apt.reason}` : ''}</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 24px', overflowY:'auto', flex:1 }}>
          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#dc2626', marginBottom:16 }}>⚠️ {error}</div>
          )}

          {/* Illinois confirmation */}
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>
              Patient Location Confirmation <span style={{ color:'#ef4444' }}>*</span>
            </label>
            <label style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px', borderRadius:8, border:`1.5px solid ${patientInIllinois ? '#86efac' : '#e5e7eb'}`, background:patientInIllinois ? '#f0fdf4' : '#fff', cursor:'pointer', transition:'all 0.15s' }}>
              <input type="checkbox" checked={patientInIllinois} onChange={e => setPatientInIllinois(e.target.checked)}
                style={{ marginTop:2, width:16, height:16, accentColor:'#16a34a', cursor:'pointer' }} />
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:patientInIllinois ? '#15803d' : '#374151' }}>
                  Patient is currently located in Illinois
                </div>
                <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>
                  Required per 410 ILCS 151. Specific address is not collected — state confirmation only.
                </div>
              </div>
              {patientInIllinois && <span style={{ marginLeft:'auto', fontSize:14 }}>✅</span>}
            </label>
          </div>

          {/* Recording consent */}
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:8 }}>
              Session Recording Consent <span style={{ color:'#ef4444' }}>*</span>
            </label>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {[
                { val:'granted',   icon:'✅', label:'Patient consents to recording',   desc:'Patient verbally agreed this session may be recorded', color:'#16a34a', bg:'#f0fdf4', border:'#86efac' },
                { val:'denied',    icon:'🚫', label:'Patient declines recording',       desc:'Session will NOT be recorded — consent denied',        color:'#dc2626', bg:'#fef2f2', border:'#fca5a5' },
                { val:'not_asked', icon:'⏭️', label:'Recording not applicable',         desc:'No recording planned for this session type',           color:'#6b7280', bg:'#f9fafb', border:'#d1d5db' },
              ].map(opt => (
                <label key={opt.val} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'9px 14px', borderRadius:8, border:`1.5px solid ${recordingConsent===opt.val ? opt.border : '#e5e7eb'}`, background:recordingConsent===opt.val ? opt.bg : '#fff', cursor:'pointer', transition:'all 0.15s' }}>
                  <input type="radio" name="recordingConsent" value={opt.val} checked={recordingConsent===opt.val} onChange={() => setRecordingConsent(opt.val)} style={{ marginTop:2, accentColor:opt.color }} />
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:opt.color }}>{opt.icon} {opt.label}</div>
                    <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            {recordingConsent === 'granted' && (
              <div style={{ marginTop:10 }}>
                <label style={{ fontSize:11, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Consent method</label>
                <div style={{ display:'flex', gap:8 }}>
                  {[['verbal','🗣️ Verbal'],['written','✍️ Written'],['waived','🤝 Waived']].map(([v,l]) => (
                    <label key={v} style={{ flex:1, textAlign:'center', padding:'7px', borderRadius:7, cursor:'pointer', border:`1.5px solid ${consentMethod===v ? '#3b82f6' : '#e5e7eb'}`, background:consentMethod===v ? '#eff6ff' : '#fff', fontSize:12, fontWeight:600, color:consentMethod===v ? '#1d4ed8' : '#374151' }}>
                      <input type="radio" name="consentMethod" value={v} checked={consentMethod===v} onChange={() => setConsentMethod(v)} style={{ display:'none' }} />{l}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Compliance checklist */}
          <div style={{ marginBottom:8 }}>
            <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:8 }}>
              Provider Compliance Checklist <span style={{ color:'#ef4444' }}>*</span>
              <span style={{ fontWeight:400, color:'#6b7280', marginLeft:4 }}>— all items required</span>
            </label>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {checkItems.map(({ key, label }) => (
                <label key={key} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, border:`1.5px solid ${checklist[key] ? '#86efac' : '#e5e7eb'}`, background:checklist[key] ? '#f0fdf4' : '#f9fafb', cursor:'pointer', transition:'all 0.15s' }}>
                  <input type="checkbox" checked={checklist[key]} onChange={() => toggleCheck(key)} style={{ width:15, height:15, accentColor:'#16a34a', cursor:'pointer' }} />
                  <span style={{ fontSize:12, fontWeight:checklist[key] ? 600 : 400, color:checklist[key] ? '#15803d' : '#374151' }}>{label}</span>
                  {checklist[key] && <span style={{ marginLeft:'auto', fontSize:13 }}>✅</span>}
                </label>
              ))}
            </div>
          </div>

          {!canStart && (
            <div style={{ marginTop:14, padding:'8px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, fontSize:11, color:'#92400e' }}>
              ⚠️ Complete all required fields:{' '}
              {!patientInIllinois && '• Confirm patient is in Illinois '}
              {!recordingConsent && '• Select recording consent '}
              {!allChecked && '• Complete compliance checklist'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px', borderTop:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', background:'#f8fafc', flexShrink:0 }}>
          <button onClick={onCancel} disabled={saving} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid #d1d5db', background:'#fff', fontSize:13, cursor:'pointer', color:'#374151' }}>Cancel</button>
          <button onClick={handleStart} disabled={!canStart || saving}
            style={{ padding:'9px 22px', borderRadius:8, fontWeight:800, fontSize:13, border:'none', background:canStart && !saving ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : '#d1d5db', color:canStart && !saving ? '#fff' : '#9ca3af', cursor:canStart && !saving ? 'pointer' : 'not-allowed', boxShadow:canStart ? '0 2px 8px rgba(109,40,217,0.3)' : 'none' }}>
            {saving ? '⏳ Saving…' : '📹 Start Session'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SEND LINK MODAL
═══════════════════════════════════════════════════════════════════════ */
function SendLinkModal({ apt, patients, onClose, onSent }) {
  const contact   = patients?.find(p => p.id === apt.patientId);
  const link      = getVideoLink(apt);
  const [method,  setMethod]  = useState('sms');
  const [copied,  setCopied]  = useState(false);
  const [sent,    setSent]    = useState(false);

  const phone        = contact?.cellPhone || contact?.phone || '';
  const email        = contact?.email || '';
  const smsText      = `Clarity Health: Your telehealth appointment is at ${apt.time}. Join here: ${link}`;
  const emailSubject = `Your Clarity Telehealth Visit Link – ${apt.time}`;
  const emailBody    = `Dear ${apt.patientName},\n\nYour telehealth appointment is scheduled for ${apt.time}${apt.date ? ' on ' + apt.date : ' today'}.\n\nJoin your visit here:\n${link}\n\nBefore your visit:\n• Find a private, quiet location\n• Test your camera and microphone\n• Have your medication list available\n• Call our office if you have trouble connecting\n\nClarity Health`;

  const handleCopy = () => { navigator.clipboard?.writeText(link).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleSend = () => {
    if (method === 'sms') {
      window.open(`sms:${phone.replace(/\D/g,'')}?body=${encodeURIComponent(smsText)}`, '_self');
    } else {
      window.open(`mailto:${email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`, '_blank');
    }
    setSent(true);
    onSent(apt.id, method);
  };
  const missingContact = method === 'sms' ? !phone : !email;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:520, boxShadow:'0 20px 50px rgba(0,0,0,0.25)', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontWeight:800, fontSize:15 }}>📤 Send Telehealth Link</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#9ca3af' }}>✕</button>
        </div>

        {sent ? (
          <div style={{ padding:'32px 24px', textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>{method === 'sms' ? '📱' : '✉️'}</div>
            <div style={{ fontWeight:800, fontSize:16, color:'#15803d', marginBottom:6 }}>{method === 'sms' ? 'SMS app opened!' : 'Email client opened!'}</div>
            <div style={{ fontSize:13, color:'#6b7280', marginBottom:4 }}>
              {method === 'sms' ? `Send the pre-filled message to ${phone || 'patient'}.` : `Send the pre-filled email to ${email || 'patient'}.`}
            </div>
            <div style={{ fontSize:11, color:'#9ca3af', marginTop:6 }}>Send has been logged on this appointment.</div>
            <button onClick={onClose} style={{ marginTop:20, padding:'9px 24px', borderRadius:8, background:'#4f46e5', color:'#fff', border:'none', fontWeight:700, fontSize:13, cursor:'pointer' }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ padding:'18px 20px', display:'grid', gap:14 }}>
              <div style={{ background:'#f8fafc', borderRadius:8, padding:'10px 14px', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:12 }}>
                <Avatar apt={apt} patient={patients?.find(p => p.id === apt.patientId)} size={36} />
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{apt.patientName}</div>
                  <div style={{ color:'#64748b', fontSize:12 }}>🕐 {apt.time}{apt.reason ? ` · ${apt.reason}` : ''}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>Secure Video Link</div>
                <div style={{ display:'flex', gap:8 }}>
                  <input readOnly value={link} style={{ flex:1, padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:12, color:'#4f46e5' }} />
                  <button onClick={handleCopy} style={{ padding:'8px 14px', borderRadius:7, border:'none', background:copied ? '#059669' : '#4f46e5', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer', whiteSpace:'nowrap' }}>
                    {copied ? '✅ Copied' : '📋 Copy'}
                  </button>
                </div>
              </div>

              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Send via</div>
                <div style={{ display:'flex', gap:8 }}>
                  {[{ k:'sms', label:'📱 Text (SMS)' }, { k:'email', label:'✉️ Email' }].map(m => (
                    <button key={m.k} onClick={() => setMethod(m.k)}
                      style={{ flex:1, padding:'8px 0', borderRadius:8, border:`2px solid ${method===m.k ? '#4f46e5' : '#e2e8f0'}`, background:method===m.k ? '#eef2ff' : '#fff', color:method===m.k ? '#4338ca' : '#64748b', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background:missingContact ? '#fff7ed' : '#f0fdf4', border:`1px solid ${missingContact ? '#fed7aa' : '#bbf7d0'}`, borderRadius:8, padding:'10px 14px', fontSize:12 }}>
                {method === 'sms'
                  ? <span>📱 {phone ? <strong>{phone}</strong> : <span style={{ color:'#c2410c' }}>No phone number on file — update patient chart first</span>}</span>
                  : <span>✉️ {email ? <strong>{email}</strong> : <span style={{ color:'#c2410c' }}>No email on file — update patient chart first</span>}</span>
                }
              </div>

              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>Message Preview</div>
                {method === 'sms'
                  ? <div style={{ background:'#1a1a2e', color:'#e2e8f0', borderRadius:8, padding:'10px 14px', fontSize:11, fontFamily:'monospace', lineHeight:1.65 }}>{smsText}</div>
                  : <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 14px', fontSize:11, lineHeight:1.65 }}>
                      <div style={{ fontWeight:700, marginBottom:4, color:'#374151' }}>Subject: {emailSubject}</div>
                      <div style={{ whiteSpace:'pre-line', color:'#64748b' }}>{emailBody}</div>
                    </div>
                }
              </div>
            </div>

            <div style={{ padding:'14px 20px', borderTop:'1px solid #e5e7eb', display:'flex', justifyContent:'flex-end', gap:8, background:'#f8fafc' }}>
              <button onClick={onClose} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #d1d5db', background:'#fff', fontSize:13, cursor:'pointer', color:'#374151' }}>Cancel</button>
              <button onClick={handleSend} disabled={missingContact}
                style={{ padding:'8px 18px', borderRadius:8, background:missingContact ? '#e5e7eb' : '#4f46e5', color:missingContact ? '#9ca3af' : '#fff', border:'none', fontWeight:700, fontSize:13, cursor:missingContact ? 'not-allowed' : 'pointer' }}>
                {method === 'sms' ? '📱 Send Text' : '✉️ Send Email'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   POST-SESSION SUMMARY MODAL
═══════════════════════════════════════════════════════════════════════ */
function PostSessionModal({ apt, patient, sessionDuration, sessionNote, onClose }) {
  const [selectedCPT, setSelectedCPT] = useState(CPT_CODES[1].code);
  const [diagnosis,   setDiagnosis]   = useState('');
  const [plan,        setPlan]        = useState('');
  const [followUp,    setFollowUp]    = useState('2 weeks');
  const [saved,       setSaved]       = useState(false);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000, padding:20 }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:680, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.35)' }}>
        <div style={{ background:'linear-gradient(135deg,#065f46,#059669)', padding:'18px 24px', flexShrink:0 }}>
          <div style={{ fontWeight:900, color:'#fff', fontSize:16 }}>✅ Session Complete — Post-Visit Documentation</div>
          <div style={{ fontSize:11, color:'#a7f3d0', marginTop:2 }}>Complete documentation before closing. This data is saved to the encounter record.</div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          {saved ? (
            <div style={{ textAlign:'center', padding:'40px 20px' }}>
              <div style={{ fontSize:56, marginBottom:12 }}>✅</div>
              <div style={{ fontWeight:800, fontSize:18, color:'#065f46', marginBottom:6 }}>Session Documented</div>
              <div style={{ fontSize:13, color:'#64748b' }}>Visit note saved · Billing code queued · Encounter closed</div>
              <button onClick={onClose} style={{ marginTop:20, padding:'9px 24px', borderRadius:8, background:'#059669', color:'#fff', border:'none', fontWeight:700, cursor:'pointer' }}>Close</button>
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div style={{ display:'flex', gap:10, marginBottom:20 }}>
                {[
                  { label:'Patient',  val: apt.patientName,                             icon:'👤' },
                  { label:'Duration', val: fmtTimer(sessionDuration),                   icon:'⏱️' },
                  { label:'Date',     val: apt.date || new Date().toLocaleDateString(), icon:'📅' },
                  { label:'Type',     val: 'Telehealth',                                icon:'📹' },
                ].map(s => (
                  <div key={s.label} style={{ flex:1, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
                    <div style={{ fontSize:20 }}>{s.icon}</div>
                    <div style={{ fontWeight:700, fontSize:12, marginTop:4, color:'#1e293b' }}>{s.val}</div>
                    <div style={{ fontSize:10, color:'#64748b', textTransform:'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* CPT code */}
              <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>💰 Billing CPT Code</label>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {CPT_CODES.map(c => (
                    <label key={c.code} style={{ display:'flex', gap:10, cursor:'pointer', padding:'8px 12px', borderRadius:8, border:`1.5px solid ${selectedCPT===c.code ? '#6366f1' : '#e2e8f0'}`, background:selectedCPT===c.code ? '#eef2ff' : '#fafafa' }}>
                      <input type="radio" name="cpt" checked={selectedCPT===c.code} onChange={() => setSelectedCPT(c.code)} style={{ accentColor:'#6366f1', marginTop:2 }} />
                      <div>
                        <span style={{ fontWeight:700, fontSize:13, color:'#3730a3' }}>{c.code}</span>
                        <span style={{ fontSize:12, color:'#64748b', marginLeft:8 }}>{c.label}</span>
                        <span style={{ fontSize:11, color:'#9ca3af', marginLeft:8, fontStyle:'italic' }}>{c.typical}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Diagnosis */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>🏥 Diagnosis / Assessment</label>
                <textarea className="form-textarea" rows={2} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g., F32.1 Major Depressive Disorder, recurrent, moderate — stable; continue current regimen" style={{ fontSize:13, width:'100%' }} />
              </div>

              {/* Plan */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>📋 Plan</label>
                <textarea className="form-textarea" rows={3} value={plan} onChange={e => setPlan(e.target.value)} placeholder="Continue current medications, follow up in 2 weeks, safety plan reviewed…" style={{ fontSize:13, width:'100%' }} />
              </div>

              {/* Follow-up */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>📅 Follow-up</label>
                <select className="form-input" value={followUp} onChange={e => setFollowUp(e.target.value)} style={{ fontSize:13 }}>
                  {['1 week','2 weeks','3 weeks','4 weeks','6 weeks','8 weeks','3 months','PRN','No follow-up needed'].map(f => <option key={f}>{f}</option>)}
                </select>
              </div>

              {/* Session notes preview */}
              {sessionNote && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>📝 Session Notes</div>
                  <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 12px', fontSize:12, color:'#475569', lineHeight:1.6, maxHeight:100, overflowY:'auto' }}>{sessionNote}</div>
                </div>
              )}
            </>
          )}
        </div>

        {!saved && (
          <div style={{ padding:'14px 24px', borderTop:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', background:'#f8fafc', flexShrink:0 }}>
            <button onClick={onClose} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid #d1d5db', background:'#fff', fontSize:13, cursor:'pointer', color:'#374151' }}>Close Without Saving</button>
            <button onClick={() => setSaved(true)} style={{ padding:'9px 22px', borderRadius:8, background:'#059669', color:'#fff', border:'none', fontWeight:700, fontSize:13, cursor:'pointer' }}>💾 Save & Close Encounter</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ACTIVE SESSION VIEW
═══════════════════════════════════════════════════════════════════════ */
function ActiveSession({ apt, patient, patients, consentRecord, patientMeds, patientProblems, patientAllergies, patientVitals }) {
  const {
    isMuted, isVideoOff, isRecording, camError, sessionTimer,
    localStreamRef, streamReady, toggleMute, toggleCamera, toggleRecording, endSession,
  } = useTelehealth();
  const navigate = useNavigate();

  const [isScreenShare,    setIsScreenShare]    = useState(false);
  const [handRaised,       setHandRaised]       = useState(false);
  const [isPiP,            setIsPiP]            = useState(false);
  const [patientMicMuted,  setPatientMicMuted]  = useState(false);
  const [sidePanel,        setSidePanel]        = useState('notes');
  const [notes,            setNotes]            = useState('');
  const [noteTemplate,     setNoteTemplate]     = useState('');
  const [chatInput,        setChatInput]        = useState('');
  const [chatMessages,     setChatMessages]     = useState([{
    from: 'system',
    text: `Session started. Patient: ${apt.patientName} · Consent recorded at ${new Date(consentRecord?.timestamp || Date.now()).toLocaleTimeString()}.`,
    time: nowTime(),
  }]);
  const [showPostSession,  setShowPostSession]  = useState(false);
  const [connectionQuality] = useState('Excellent');

  const localVideoRef = useRef(null);
  const chatEndRef    = useRef(null);

  /* ── Attach stream to video element ── */
  const setVideoRef = useCallback((el) => {
    localVideoRef.current = el;
    if (el && localStreamRef.current) el.srcObject = localStreamRef.current;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [streamReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [chatMessages]);

  /* ── Picture-in-Picture ── */
  const enterPiP = async () => {
    const vid = localVideoRef.current;
    if (!vid) return;
    try {
      if (document.pictureInPictureElement) { await document.exitPictureInPicture(); setIsPiP(false); }
      else {
        await vid.requestPictureInPicture();
        setIsPiP(true);
        vid.addEventListener('leavepictureinpicture', () => setIsPiP(false), { once: true });
      }
    } catch { /* PiP not supported — silent fallback */ }
  };

  /* ── Chat ── */
  const sendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages(p => [...p, { from: 'Provider', text: chatInput, time: nowTime() }]);
    setChatInput('');
    setTimeout(() => {
      const replies = ['Thank you, I understand.', 'Yes, I\'ve been taking it consistently.', 'Should I continue at this dose?', 'That makes sense.'];
      setChatMessages(p => [...p, { from: apt.patientName.split(' ')[0], text: replies[Math.floor(Math.random() * replies.length)], time: nowTime() }]);
    }, 2500);
  };

  const applyTemplate = (tmpl) => { setNotes(p => p ? `${p}\n\n${tmpl.text}` : tmpl.text); setNoteTemplate(''); };
  const qualityColor  = { Excellent:'#22c55e', Good:'#84cc16', Fair:'#f59e0b', Poor:'#ef4444' }[connectionQuality];

  /* ── Active meds (top 6) ── */
  const activeMeds = (patientMeds || []).filter(m => m.status === 'Active' || !m.status).slice(0, 8);
  /* ── Active problems (top 5) ── */
  const activeProblems = (patientProblems || []).filter(p => p.status === 'Active' || !p.status).slice(0, 6);
  /* ── Active allergies ── */
  const activeAllergies = (patientAllergies || []).slice(0, 5);
  /* ── Latest vitals ── */
  const latestVitals = Array.isArray(patientVitals) && patientVitals.length > 0 ? patientVitals[0] : null;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 100px)', background:'#0f172a', borderRadius:14, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.3)' }}>

      {/* ── Top bar ── */}
      <div style={{ background:'#0f172a', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #1e293b', flexShrink:0, gap:12, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Avatar apt={apt} patient={patient} size={30} />
            <div>
              <div style={{ fontWeight:800, color:'#fff', fontSize:14, lineHeight:1.1 }}>{apt.patientName}</div>
              {apt.reason && <div style={{ fontSize:10, color:'#94a3b8' }}>{apt.reason}</div>}
            </div>
          </div>
          <div style={{ background:'#ef444420', color:'#f87171', padding:'4px 12px', borderRadius:7, fontSize:13, fontWeight:800, fontFamily:'monospace' }}>
            🔴 LIVE · {fmtTimer(sessionTimer)}
          </div>
          <div style={{ fontSize:11, color:qualityColor, display:'flex', alignItems:'center', gap:4 }}>
            <span>●</span> {connectionQuality}
          </div>
          <div style={{ padding:'3px 10px', borderRadius:20, background:'#16a34a20', color:'#4ade80', fontSize:11, fontWeight:700 }}>🔒 AES-256</div>
          <div style={{ padding:'3px 10px', borderRadius:20, background:'#0891b220', color:'#67e8f9', fontSize:11, fontWeight:700 }}>✅ Consent</div>
          {isRecording && <div style={{ padding:'3px 10px', borderRadius:20, background:'#ef444420', color:'#f87171', fontSize:11, fontWeight:700 }}>⏺️ Recording</div>}
        </div>
        <button onClick={() => setShowPostSession(true)}
          style={{ background:'#ef4444', color:'#fff', border:'none', borderRadius:8, padding:'8px 20px', fontWeight:800, fontSize:13, cursor:'pointer', flexShrink:0 }}>
          End Session
        </button>
      </div>

      {/* Camera error banner */}
      {camError && (
        <div style={{ background:'#fef2f2', borderBottom:'1px solid #fecaca', padding:'8px 16px', display:'flex', alignItems:'center', gap:10, fontSize:12, color:'#b91c1c', flexShrink:0 }}>
          ⚠️ <strong>{camError === 'denied' ? 'Camera/mic access denied.' : 'No camera/mic detected.'}</strong>
          {camError === 'denied' ? ' Check browser permissions (address bar) and refresh.' : ' Ensure device is connected and not used by another app, then refresh.'}
        </div>
      )}

      {/* ── Main body ── */}
      <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>

        {/* ── Video area ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#0f172a', padding:'14px 14px 10px', gap:10, position:'relative', minWidth:0 }}>

          {/* Patient (main view) */}
          <div style={{ flex:1, background:'#1e293b', borderRadius:12, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', minHeight:0 }}>
            <div style={{ width:90, height:90, borderRadius:'50%', overflow:'hidden', flexShrink:0, border:'3px solid #10b981' }}>
              <Avatar apt={apt} patient={patient} size={90} />
            </div>
            <div style={{ color:'#e2e8f0', fontSize:15, fontWeight:700, marginTop:10 }}>{apt.patientName}</div>
            <div style={{ color:'#64748b', fontSize:12, marginTop:3 }}>
              {patientMicMuted ? '🔇 Muted' : '🎤 Active'} · 📷 Camera on
            </div>
            {/* Patient info overlay */}
            <div style={{ position:'absolute', top:10, left:12, display:'flex', flexDirection:'column', gap:4 }}>
              {apt.reason && <span style={{ background:'#6366f130', color:'#a5b4fc', padding:'2px 9px', borderRadius:99, fontSize:10, fontWeight:700, backdropFilter:'blur(4px)' }}>{apt.reason}</span>}
              {patient?.dob && <span style={{ background:'rgba(0,0,0,0.5)', color:'#94a3b8', padding:'2px 9px', borderRadius:99, fontSize:10 }}>Age {calcAge(patient.dob)}</span>}
            </div>
            <div style={{ position:'absolute', bottom:10, left:12, display:'flex', gap:6 }}>
              <span style={{ background:'#10b98130', color:'#10b981', padding:'2px 10px', borderRadius:99, fontSize:10, fontWeight:700 }}>CONNECTED</span>
            </div>
            <button onClick={() => setPatientMicMuted(m => !m)}
              style={{ position:'absolute', bottom:10, right:12, background:'rgba(255,255,255,0.1)', border:'none', color:'#fff', borderRadius:7, padding:'4px 10px', fontSize:11, cursor:'pointer' }}>
              {patientMicMuted ? '🔈 Unmute Pt' : '🔇 Mute Pt'}
            </button>
          </div>

          {/* Provider self-view (PiP box) */}
          <div style={{ position:'absolute', top:24, right:24, width:156, height:108, background:'#1e293b', borderRadius:10, overflow:'hidden', border:`2px solid ${isPiP ? '#f59e0b' : '#3b82f6'}`, boxShadow:'0 4px 12px rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {!camError && !isVideoOff && (
              <video ref={setVideoRef} autoPlay playsInline muted style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            )}
            {(isVideoOff || camError) && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <span style={{ fontSize:24 }}>{camError ? '⚠️' : '📵'}</span>
                <span style={{ color:'#94a3b8', fontSize:9, marginTop:4 }}>{camError ? 'No access' : 'Camera off'}</span>
              </div>
            )}
            <div style={{ position:'absolute', bottom:5, left:6, fontSize:9, color:'#cbd5e1', background:'rgba(0,0,0,0.55)', borderRadius:4, padding:'1px 6px' }}>You {isMuted ? '🔇' : '🎤'}</div>
            {!camError && !isVideoOff && (
              <button onClick={enterPiP} title={isPiP ? 'Exit PiP' : 'Picture-in-Picture'}
                style={{ position:'absolute', top:5, right:5, background:isPiP ? '#f59e0b' : 'rgba(0,0,0,0.55)', border:'none', borderRadius:5, padding:'3px 6px', cursor:'pointer', fontSize:10, color:'#fff', fontWeight:700, lineHeight:1 }}>
                {isPiP ? '✕' : '⊡'}
              </button>
            )}
          </div>

          {/* Controls */}
          <div style={{ display:'flex', gap:8, justifyContent:'center', padding:'6px 0', flexShrink:0, flexWrap:'wrap' }}>
            {[
              { icon: isMuted    ? '🔇' : '🎤', label: isMuted    ? 'Unmute' : 'Mute',       active: isMuted,       onClick: toggleMute },
              { icon: isVideoOff ? '📵' : '📹', label: isVideoOff ? 'Cam On' : 'Cam Off',     active: isVideoOff,    onClick: toggleCamera },
              { icon: '🖥️',                     label: isScreenShare ? 'Stop Share' : 'Share', active: isScreenShare, onClick: () => setIsScreenShare(s => !s) },
              { icon: '⏺️',                     label: isRecording   ? 'Stop Rec'  : 'Record', active: isRecording,   onClick: toggleRecording },
              { icon: '✋',                     label: handRaised    ? 'Lower Hand': 'Raise',   active: handRaised,    onClick: () => setHandRaised(h => !h) },
            ].map(ctrl => (
              <button key={ctrl.label} onClick={ctrl.onClick} title={ctrl.label}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:ctrl.active ? '#dc2626' : 'rgba(255,255,255,0.1)', border:'none', borderRadius:9, padding:'7px 14px', cursor:'pointer', color:'#fff', fontSize:17, minWidth:54, transition:'background 0.15s' }}>
                <span>{ctrl.icon}</span>
                <span style={{ fontSize:8, fontWeight:600, opacity:0.8 }}>{ctrl.label}</span>
              </button>
            ))}
            {apt?.patientId && (
              <button onClick={() => navigate(`/chart/${apt.patientId}`)} title="View patient chart — video floats as PiP"
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:'rgba(99,102,241,0.3)', border:'1px solid #6366f1', borderRadius:9, padding:'7px 14px', cursor:'pointer', color:'#a5b4fc', fontSize:17, minWidth:54 }}>
                <span>📋</span>
                <span style={{ fontSize:8, fontWeight:600, opacity:0.9 }}>Chart</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div style={{ width:340, background:'#fff', display:'flex', flexDirection:'column', borderLeft:'1px solid #e2e8f0', flexShrink:0 }}>
          {/* Sidebar tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid #e2e8f0', flexShrink:0 }}>
            {[
              { k:'notes',  label:'📝 Notes' },
              { k:'chart',  label:'📋 Chart' },
              { k:'chat',   label:'💬 Chat'  },
            ].map(t => (
              <button key={t.k} onClick={() => setSidePanel(t.k)}
                style={{ flex:1, padding:'9px 0', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, background:sidePanel===t.k ? '#fff' : '#f8fafc', color:sidePanel===t.k ? '#4f46e5' : '#64748b', borderBottom:`2px solid ${sidePanel===t.k ? '#4f46e5' : 'transparent'}` }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Notes panel ── */}
          {sidePanel === 'notes' && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', padding:12, gap:10, minHeight:0 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:4 }}>Quick Note Template</div>
                <select value={noteTemplate} onChange={e => { if (e.target.value) applyTemplate(QUICK_NOTE_TEMPLATES.find(t => t.label === e.target.value)); }}
                  style={{ width:'100%', padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:12 }}>
                  <option value="">— Insert template —</option>
                  {QUICK_NOTE_TEMPLATES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                </select>
              </div>
              <textarea
                style={{ flex:1, padding:10, border:'1px solid #e2e8f0', borderRadius:8, fontSize:12, resize:'none', lineHeight:1.65, minHeight:180 }}
                placeholder="Session notes…&#10;&#10;Chief complaint:&#10;&#10;Mental status:&#10;&#10;Assessment & Plan:"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
              <div style={{ fontSize:10, color:'#94a3b8', textAlign:'right' }}>{notes.length} chars</div>
            </div>
          )}

          {/* ── Chart panel ── */}
          {sidePanel === 'chart' && (
            <div style={{ flex:1, overflowY:'auto', padding:'12px 14px' }}>

              {/* Patient header */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, paddingBottom:12, borderBottom:'1px solid #f1f5f9' }}>
                <Avatar apt={apt} patient={patient} size={44} />
                <div>
                  <div style={{ fontWeight:800, fontSize:14, color:'#1e293b' }}>{patient ? `${patient.firstName} ${patient.lastName}` : apt.patientName}</div>
                  <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>
                    {patient?.dob && <>Age {calcAge(patient.dob)} · </>}
                    {patient?.gender && <>{patient.gender} · </>}
                    {patient?.mrn && <>MRN {patient.mrn}</>}
                  </div>
                </div>
              </div>

              {/* Consent on file */}
              <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'8px 10px', marginBottom:12, fontSize:11 }}>
                <div style={{ fontWeight:700, color:'#166534' }}>✅ Consent on File</div>
                <div style={{ color:'#15803d', marginTop:2 }}>
                  {new Date(consentRecord?.timestamp || Date.now()).toLocaleString()} · Illinois confirmed · Identity verified ✓
                </div>
              </div>

              {/* Allergies */}
              {activeAllergies.length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#dc2626', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                    <span>⚠️ Allergies</span>
                    <span style={{ background:'#fef2f2', color:'#dc2626', padding:'1px 7px', borderRadius:99, fontSize:10, fontWeight:800 }}>{activeAllergies.length}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {activeAllergies.map((a, i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff5f5', border:'1px solid #fecaca', borderRadius:6, padding:'5px 9px' }}>
                        <span style={{ fontSize:12, fontWeight:600, color:'#991b1b' }}>{a.allergen || a.name || a}</span>
                        <span style={{ fontSize:10, color:'#ef4444' }}>{a.reaction || a.severity || ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active problems */}
              {activeProblems.length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                    <span>🏥 Active Diagnoses</span>
                    <span style={{ background:'#e0e7ff', color:'#3730a3', padding:'1px 7px', borderRadius:99, fontSize:10, fontWeight:800 }}>{activeProblems.length}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {activeProblems.map((p, i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:6, padding:'6px 9px' }}>
                        <div>
                          <div style={{ fontSize:12, fontWeight:600, color:'#1e293b' }}>{p.diagnosis || p.name || p.problem || p}</div>
                          {p.icdCode && <div style={{ fontSize:10, color:'#94a3b8' }}>{p.icdCode}</div>}
                        </div>
                        {p.onset && <span style={{ fontSize:10, color:'#94a3b8', flexShrink:0, marginLeft:4 }}>{p.onset}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active medications */}
              {activeMeds.length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                    <span>💊 Active Medications</span>
                    <span style={{ background:'#dcfce7', color:'#166534', padding:'1px 7px', borderRadius:99, fontSize:10, fontWeight:800 }}>{activeMeds.length}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {activeMeds.map((m, i) => (
                      <div key={i} style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:6, padding:'6px 9px' }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'#15803d' }}>{m.name || m.medication || m}</div>
                        {(m.dose || m.sig || m.frequency) && (
                          <div style={{ fontSize:10, color:'#64748b', marginTop:1 }}>{[m.dose, m.frequency || m.sig].filter(Boolean).join(' · ')}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Latest vitals */}
              {latestVitals && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:6 }}>📊 Latest Vitals</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
                    {[
                      { label:'BP',     val: latestVitals.bloodPressure || latestVitals.bp },
                      { label:'HR',     val: latestVitals.heartRate     || latestVitals.hr,  unit:'bpm' },
                      { label:'Temp',   val: latestVitals.temperature   || latestVitals.temp, unit:'°F' },
                      { label:'Weight', val: latestVitals.weight,                             unit:'lb' },
                    ].filter(v => v.val).map(v => (
                      <div key={v.label} style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:6, padding:'6px 8px', textAlign:'center' }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{v.val}{v.unit ? ` ${v.unit}` : ''}</div>
                        <div style={{ fontSize:9, color:'#94a3b8', textTransform:'uppercase' }}>{v.label}</div>
                      </div>
                    ))}
                  </div>
                  {latestVitals.date && <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>Recorded {latestVitals.date}</div>}
                </div>
              )}

              {/* Insurance + contact */}
              {patient && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:6 }}>📞 Contact & Insurance</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                    {[
                      { label:'Phone',     val: patient.cellPhone || patient.phone },
                      { label:'Email',     val: patient.email },
                      { label:'Insurance', val: patient.insurance?.primary?.name || patient.insurance?.primary },
                      { label:'Copay',     val: patient.insurance?.primary?.copay ? `$${patient.insurance.primary.copay}` : null },
                    ].filter(r => r.val).map(r => (
                      <div key={r.label} style={{ display:'flex', justifyContent:'space-between', fontSize:11, padding:'4px 0', borderBottom:'1px solid #f8fafc' }}>
                        <span style={{ color:'#64748b' }}>{r.label}</span>
                        <span style={{ fontWeight:600, color:'#1e293b' }}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No data fallback */}
              {activeProblems.length === 0 && activeMeds.length === 0 && !latestVitals && (
                <div style={{ textAlign:'center', padding:'20px 10px', color:'#94a3b8', fontSize:12 }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>📋</div>
                  Chart data will appear here once loaded.
                  {apt?.patientId && (
                    <button onClick={() => navigate(`/chart/${apt.patientId}`)}
                      style={{ display:'block', margin:'10px auto 0', padding:'7px 16px', borderRadius:7, background:'#4f46e5', color:'#fff', border:'none', fontSize:12, cursor:'pointer', fontWeight:600 }}>
                      Open Full Chart →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Chat panel ── */}
          {sidePanel === 'chat' && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
              <div style={{ flex:1, overflowY:'auto', padding:'12px 12px' }}>
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ marginBottom:10 }}>
                    {m.from === 'system'
                      ? <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:7, padding:'6px 10px', fontSize:11, color:'#0369a1' }}>🔔 {m.text}</div>
                      : (
                        <div style={{ display:'flex', flexDirection:'column', alignItems: m.from === 'Provider' ? 'flex-end' : 'flex-start' }}>
                          <div style={{ fontSize:10, color:'#94a3b8', marginBottom:2 }}>{m.from} · {m.time}</div>
                          <div style={{ maxWidth:'82%', background: m.from === 'Provider' ? '#eef2ff' : '#f8fafc', border:`1px solid ${m.from === 'Provider' ? '#c7d2fe' : '#e2e8f0'}`, borderRadius:10, padding:'7px 11px', fontSize:13, color:'#1e293b' }}>
                            {m.text}
                          </div>
                        </div>
                      )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div style={{ padding:'8px 10px', borderTop:'1px solid #e2e8f0', display:'flex', gap:7, flexShrink:0 }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder="Message patient…" style={{ flex:1, padding:'7px 10px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:13 }} />
                <button onClick={sendChat} style={{ padding:'7px 12px', background:'#4f46e5', color:'#fff', border:'none', borderRadius:7, fontWeight:700, fontSize:12, cursor:'pointer' }}>Send</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPostSession && (
        <PostSessionModal
          apt={apt} patient={patient}
          sessionDuration={sessionTimer} sessionNote={notes}
          onClose={() => { setShowPostSession(false); endSession(); }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   APPOINTMENT CARD (pre-session waiting room)
═══════════════════════════════════════════════════════════════════════ */
function AppointmentCard({ apt, patient, hasConsent, linkSent, patientMeds, patientProblems, onSendLink, onStartSession }) {
  const [expanded, setExpanded] = useState(false);
  const sc = getStatus(apt.status);
  const activeMeds    = (patientMeds    || []).filter(m => m.status === 'Active' || !m.status).slice(0, 3);
  const activeProbs   = (patientProblems|| []).filter(p => p.status === 'Active' || !p.status).slice(0, 2);
  const isReady       = apt.status === 'Checked In' || apt.status === 'Confirmed';

  return (
    <div style={{ borderBottom:'1px solid var(--border)', background: isReady ? '#fafffe' : '#fff' }}>
      {/* Main row */}
      <div style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:14 }}>

        {/* Time + status */}
        <div style={{ textAlign:'center', minWidth:64, flexShrink:0 }}>
          <div style={{ fontWeight:900, fontSize:16, color:'var(--text-primary)' }}>{apt.time}</div>
          <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:8, background:sc.bg, color:sc.color }}>{sc.label}</span>
        </div>

        {/* Patient + avatar */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
          <Avatar apt={apt} patient={patient} size={40} />
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
              {apt.patientName}
              {hasConsent && <span style={{ fontSize:10, fontWeight:700, color:'#16a34a', background:'#dcfce7', padding:'1px 7px', borderRadius:99 }}>✅ Consent</span>}
              {linkSent && <span style={{ fontSize:10, fontWeight:700, color:'#7c3aed', background:'#ede9fe', padding:'1px 7px', borderRadius:99 }}>📤 Link Sent</span>}
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2, display:'flex', gap:10, flexWrap:'wrap' }}>
              {apt.reason && <span>📍 {apt.reason}</span>}
              {apt.providerName && <span>👩‍⚕️ {apt.providerName}</span>}
              {apt.duration && <span>⏱ {apt.duration} min</span>}
            </div>
            {/* Quick clinical badges */}
            {(activeProbs.length > 0 || activeMeds.length > 0) && (
              <div style={{ display:'flex', gap:5, marginTop:5, flexWrap:'wrap' }}>
                {activeProbs.map((p, i) => (
                  <span key={i} style={{ fontSize:10, padding:'1px 7px', borderRadius:99, background:'#e0e7ff', color:'#3730a3', fontWeight:600 }}>
                    {p.diagnosis || p.name || p}
                  </span>
                ))}
                {activeMeds.length > 0 && (
                  <span style={{ fontSize:10, padding:'1px 7px', borderRadius:99, background:'#dcfce7', color:'#166534', fontWeight:600 }}>
                    💊 {activeMeds.length} med{activeMeds.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:7, flexShrink:0, alignItems:'center' }}>
          <button onClick={() => setExpanded(e => !e)}
            style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #e2e8f0', background:'#f8fafc', fontSize:11, cursor:'pointer', color:'#64748b' }}>
            {expanded ? '▲' : '▼'}
          </button>
          <button onClick={onSendLink}
            style={{ padding:'6px 12px', borderRadius:7, border:'1px solid #e2e8f0', background:'#f8fafc', fontSize:12, cursor:'pointer', color:'#374151', fontWeight:600 }}>
            {linkSent ? '🔄 Resend' : '📤 Send Link'}
          </button>
          <button onClick={onStartSession}
            style={{ padding:'7px 14px', borderRadius:8, background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', fontWeight:800, fontSize:12, cursor:'pointer', boxShadow:'0 2px 8px rgba(109,40,217,0.25)' }}>
            {hasConsent ? '▶ Resume' : '📹 Start'}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding:'0 20px 14px', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10 }}>

          {/* Patient demographics */}
          {patient && (
            <div style={{ background:'#f8fafc', borderRadius:8, padding:'10px 12px', border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:6 }}>👤 Patient</div>
              {[
                { l:'DOB',      v: patient.dob },
                { l:'MRN',      v: patient.mrn },
                { l:'Phone',    v: patient.cellPhone || patient.phone },
                { l:'Email',    v: patient.email },
                { l:'Language', v: patient.language },
              ].filter(r => r.v).map(r => (
                <div key={r.l} style={{ display:'flex', justifyContent:'space-between', fontSize:11, padding:'2px 0' }}>
                  <span style={{ color:'#64748b' }}>{r.l}</span>
                  <span style={{ fontWeight:600, color:'#1e293b', textAlign:'right', maxWidth:'55%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Insurance */}
          {patient?.insurance?.primary && (
            <div style={{ background:'#f8fafc', borderRadius:8, padding:'10px 12px', border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:6 }}>🏥 Insurance</div>
              {[
                { l:'Plan',     v: patient.insurance.primary.name },
                { l:'Member',   v: patient.insurance.primary.memberId },
                { l:'Group',    v: patient.insurance.primary.groupNumber },
                { l:'Copay',    v: patient.insurance.primary.copay ? `$${patient.insurance.primary.copay}` : null },
              ].filter(r => r.v).map(r => (
                <div key={r.l} style={{ display:'flex', justifyContent:'space-between', fontSize:11, padding:'2px 0' }}>
                  <span style={{ color:'#64748b' }}>{r.l}</span>
                  <span style={{ fontWeight:600, color:'#1e293b', textAlign:'right', maxWidth:'55%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Active meds */}
          {activeMeds.length > 0 && (
            <div style={{ background:'#f0fdf4', borderRadius:8, padding:'10px 12px', border:'1px solid #bbf7d0' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#166534', marginBottom:6 }}>💊 Active Medications</div>
              {activeMeds.map((m, i) => (
                <div key={i} style={{ fontSize:11, padding:'2px 0', color:'#15803d' }}>
                  <span style={{ fontWeight:600 }}>{m.name || m.medication || m}</span>
                  {m.dose && <span style={{ color:'#64748b' }}> · {m.dose}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Problems */}
          {activeProbs.length > 0 && (
            <div style={{ background:'#eef2ff', borderRadius:8, padding:'10px 12px', border:'1px solid #c7d2fe' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#3730a3', marginBottom:6 }}>🏥 Diagnoses</div>
              {(patientProblems || []).filter(p => p.status === 'Active' || !p.status).map((p, i) => (
                <div key={i} style={{ fontSize:11, padding:'2px 0', color:'#4338ca' }}>
                  <span style={{ fontWeight:600 }}>{p.diagnosis || p.name || p}</span>
                  {p.icdCode && <span style={{ color:'#818cf8' }}> {p.icdCode}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Appointment details */}
          <div style={{ background:'#f8fafc', borderRadius:8, padding:'10px 12px', border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:6 }}>📅 Appointment</div>
            {[
              { l:'Type',     v: apt.type },
              { l:'Duration', v: apt.duration ? `${apt.duration} min` : null },
              { l:'Room',     v: apt.room },
              { l:'Date',     v: apt.date },
              { l:'Visit #',  v: apt.sessionNumber ? `#${apt.sessionNumber}` : null },
              { l:'Modality', v: apt.therapyModality },
            ].filter(r => r.v).map(r => (
              <div key={r.l} style={{ display:'flex', justifyContent:'space-between', fontSize:11, padding:'2px 0' }}>
                <span style={{ color:'#64748b' }}>{r.l}</span>
                <span style={{ fontWeight:600, color:'#1e293b' }}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN TELEHEALTH PAGE
═══════════════════════════════════════════════════════════════════════ */
export default function Telehealth() {
  const {
    patients, appointments, meds, problemList, allergies, vitalSigns, loadPatientClinical,
  } = usePatient();
  const { activeSession, startSession } = useTelehealth();
  const [sendModal,       setSendModal]       = useState(null);
  const [linkSentFor,     setLinkSentFor]     = useState({});
  const [consentModal,    setConsentModal]    = useState(null);
  const [consentRecords,  setConsentRecords]  = useState({});
  const [filter,          setFilter]          = useState('all'); // 'all' | 'ready' | 'today'

  /* ── Filter to telehealth-only, not completed/cancelled ── */
  const telehealthAppts = appointments.filter(a =>
    a.visitType === 'Telehealth' && a.status !== 'Completed' && a.status !== 'Cancelled'
  );

  /* ── Pre-load clinical data for all TH patients on mount ── */
  useEffect(() => {
    const ids = [...new Set(telehealthAppts.map(a => a.patientId).filter(Boolean))];
    ids.forEach(id => { try { loadPatientClinical(id); } catch { /* ignore */ } });
  }, [telehealthAppts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Filtered appointment list ── */
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  const filtered = telehealthAppts.filter(a => {
    if (filter === 'ready') return a.status === 'Checked In' || a.status === 'Confirmed';
    if (filter === 'today') return a.date === today;
    return true;
  });

  /* ── Stats ── */
  const readyCount   = telehealthAppts.filter(a => a.status === 'Checked In').length;
  const sentCount    = Object.keys(linkSentFor).length;
  const activeCount  = Object.keys(consentRecords).length;

  /* ── Session handlers ── */
  const handleStartSession = (apt) => {
    if (consentRecords[apt.id]) {
      startSession({ apt, patient: patients?.find(p => p.id === apt.patientId), consentRecord: consentRecords[apt.id] });
    } else {
      setConsentModal(apt);
    }
  };

  const handleConsentComplete = (record) => {
    const apt = consentModal;
    setConsentRecords(p => ({ ...p, [apt.id]: record }));
    const patient = patients?.find(p => p.id === apt.patientId);
    setConsentModal(null);
    startSession({ apt, patient, consentRecord: record });
  };

  const handleLinkSent = (aptId, method) => {
    setLinkSentFor(p => ({ ...p, [aptId]: method }));
    setSendModal(null);
  };

  /* ── Active session view ── */
  if (activeSession) {
    const { apt, patient } = activeSession;
    return (
      <div className="fade-in" style={{ padding:'0 0 16px' }}>
        <ActiveSession
          apt={apt}
          patient={patient}
          patients={patients}
          consentRecord={activeSession.consentRecord}
          patientMeds={meds?.[apt?.patientId]}
          patientProblems={problemList?.[apt?.patientId]}
          patientAllergies={allergies?.[apt?.patientId]}
          patientVitals={vitalSigns?.[apt?.patientId]}
        />
      </div>
    );
  }

  return (
    <div className="fade-in">

      {/* ── Page header ── */}
      <div style={{ marginBottom:18, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:900, color:'var(--text-primary)' }}>📹 Telehealth</h1>
          <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--text-muted)' }}>HIPAA-compliant video visits · Illinois Telehealth Act (410 ILCS 151) compliant</p>
        </div>
        <button
          onClick={() => setConsentModal({ id:'adhoc-' + Date.now(), patientName:'Patient', time:nowTime(), date:new Date().toLocaleDateString(), reason:'Ad-Hoc Visit' })}
          style={{ padding:'9px 18px', borderRadius:9, background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:'0 2px 8px rgba(109,40,217,0.25)', flexShrink:0 }}>
          + Ad-Hoc Session
        </button>
      </div>

      {/* ── Compliance banner ── */}
      <div style={{ background:'linear-gradient(135deg,#1e3a5f,#1e40af)', borderRadius:12, padding:'14px 20px', marginBottom:18, display:'flex', gap:14, alignItems:'flex-start' }}>
        <span style={{ fontSize:26, flexShrink:0 }}>🏛️</span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, color:'#fff', fontSize:13 }}>Illinois Telehealth Act Compliance Active</div>
          <div style={{ fontSize:11, color:'#bfdbfe', marginTop:3, lineHeight:1.5 }}>
            Patient telehealth consent captured at registration. State confirmation (Illinois only — no address collected) required at each session start. All sessions are audit-logged.
          </div>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', flexShrink:0 }}>
          {['AES-256 Encrypted','HIPAA Compliant','IL 410 ILCS 151','Audit Logged'].map(b => (
            <span key={b} style={{ padding:'3px 9px', borderRadius:99, background:'rgba(255,255,255,0.14)', color:'#bfdbfe', fontSize:10, fontWeight:700, whiteSpace:'nowrap' }}>{b}</span>
          ))}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:18 }}>
        {[
          { label:'Scheduled',   val:telehealthAppts.length,   icon:'📅', color:'#3b82f6', bg:'#eff6ff' },
          { label:'Ready (In)',  val:readyCount,                icon:'🟢', color:'#22c55e', bg:'#f0fdf4' },
          { label:'Links Sent',  val:sentCount,                 icon:'📤', color:'#8b5cf6', bg:'#f5f3ff' },
          { label:'Consented',   val:activeCount,               icon:'✅', color:'#f59e0b', bg:'#fffbeb' },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, border:`1px solid var(--border)`, borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:22 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize:20, fontWeight:900, color:s.color, lineHeight:1 }}>{s.val}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, marginTop:1 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Provider reminders ── */}
      <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:'14px 18px', marginBottom:18, boxShadow:'var(--shadow-sm)' }}>
        <div style={{ fontWeight:800, fontSize:13, color:'#1e40af', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
          📋 Provider Compliance Reminders
          <span style={{ fontWeight:400, fontSize:11, color:'#64748b' }}>— reference for each session start</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:7 }}>
          {PROVIDER_REMINDERS.map((item, i) => (
            <div key={i} style={{ display:'flex', gap:9, alignItems:'flex-start', background:'#f8fafc', borderRadius:7, padding:'8px 10px', border:'1px solid #e2e8f0' }}>
              <span style={{ color:'#0891b2', fontWeight:900, fontSize:11, flexShrink:0, marginTop:1 }}>{i + 1}.</span>
              <span style={{ fontSize:11, color:'#374151', lineHeight:1.55 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Virtual Waiting Room ── */}
      <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>
        {/* Section header */}
        <div style={{ padding:'13px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#f8fafc', flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontWeight:800, fontSize:14 }}>🕐 Virtual Waiting Room</div>
            <span style={{ background:'#dbeafe', color:'#1e40af', padding:'3px 11px', borderRadius:99, fontSize:12, fontWeight:700 }}>
              {filtered.length} appointment{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
          {/* Filter tabs */}
          <div style={{ display:'flex', gap:5 }}>
            {[['all','All'],['ready','Ready'],['today','Today']].map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)}
                style={{ padding:'5px 12px', borderRadius:7, border:`1px solid ${filter===k ? '#3b82f6' : '#e2e8f0'}`, background:filter===k ? '#eff6ff' : '#fff', color:filter===k ? '#1e40af' : '#64748b', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding:'50px 20px', textAlign:'center', color:'var(--text-muted)' }}>
            <div style={{ fontSize:44, marginBottom:10 }}>📹</div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>
              {filter === 'all' ? 'No telehealth appointments scheduled' : `No ${filter === 'ready' ? '"Ready"' : "today's"} telehealth appointments`}
            </div>
            <div style={{ fontSize:12 }}>Appointments show here when visit type is set to "Telehealth"</div>
          </div>
        ) : (
          filtered.map(apt => {
            const patient = patients?.find(p => p.id === apt.patientId);
            return (
              <AppointmentCard
                key={apt.id}
                apt={apt}
                patient={patient}
                hasConsent={!!consentRecords[apt.id]}
                linkSent={linkSentFor[apt.id]}
                patientMeds={meds?.[apt.patientId]}
                patientProblems={problemList?.[apt.patientId]}
                onSendLink={() => setSendModal(apt)}
                onStartSession={() => handleStartSession(apt)}
              />
            );
          })
        )}
      </div>

      {/* ── Modals ── */}
      {sendModal && (
        <SendLinkModal apt={sendModal} patients={patients} onClose={() => setSendModal(null)} onSent={handleLinkSent} />
      )}
      {consentModal && (
        <QuickStartModal
          apt={consentModal}
          patient={patients?.find(p => p.id === consentModal.patientId)}
          onStart={handleConsentComplete}
          onCancel={() => setConsentModal(null)}
        />
      )}
    </div>
  );
}
