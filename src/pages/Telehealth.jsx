import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePatient } from '../contexts/PatientContext';
import { useAuth } from '../contexts/AuthContext';
import { useTelehealth } from '../contexts/TelehealthContext';

/* ─── helpers ────────────────────────────────────────────────────────── */
const getVideoLink = (apt) => `https://telehealth.clarity.health/room/${apt.id}`;
const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const isoNow = () => new Date().toISOString();
const fmtTimer = (s) =>
  `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const CONNECTION_QUALITY = ['Excellent', 'Good', 'Fair', 'Poor'];
const CPT_CODES = [
  { code: '99213-95', label: 'Office Visit Est. — Low Complexity (TH Mod 95)', typical: 'Follow-up 15–20 min' },
  { code: '99214-95', label: 'Office Visit Est. — Moderate Complexity (TH Mod 95)', typical: 'Follow-up 25–30 min' },
  { code: '99215-95', label: 'Office Visit Est. — High Complexity (TH Mod 95)', typical: 'Complex 40–55 min' },
  { code: '90837-95', label: 'Psychotherapy 60 min (TH Mod 95)', typical: 'Individual therapy' },
  { code: '90834-95', label: 'Psychotherapy 45 min (TH Mod 95)', typical: 'Individual therapy' },
  { code: '90832-95', label: 'Psychotherapy 30 min (TH Mod 95)', typical: 'Brief therapy' },
  { code: '99212-GT', label: 'Office Visit Est. — Minimal (GT Mod)', typical: 'Med check, very brief' },
];

const QUICK_NOTE_TEMPLATES = [
  { label: 'Stable / Routine', text: 'Patient seen via telehealth. Patient reports medication is working as expected with no significant side effects. Mood and affect stable. No SI/HI. Plan to continue current regimen.' },
  { label: 'Medication Adjustment', text: 'Patient seen via telehealth. Reports [symptom]. After discussion of risks, benefits, and alternatives, plan to [change]. Patient verbalized understanding. Follow up in [timeframe].' },
  { label: 'Crisis Assessment', text: 'Patient seen via STAT telehealth. Patient reported [presenting concern]. Safety assessment completed: SI [present/absent], HI [present/absent], plan [present/absent]. Protective factors [list]. Safety plan reviewed/updated. [Next steps].' },
  { label: 'Therapy Progress', text: 'Patient seen via telehealth for individual therapy. Continued work on [treatment focus]. Patient demonstrates [progress/challenges]. Session techniques: [CBT/DBT/CPT/other]. Assigned homework: [task].' },
];

/* ─── Provider compliance reminders (reference only — not a gate) ────── */
const PROVIDER_ATTESTATION_ITEMS = [
  'I have verified this patient\'s identity using two approved identifiers (name + DOB or MRN).',
  'I have confirmed the patient is physically located in Illinois at the time of this encounter.',
  'I have confirmed the patient is in a private and safe location.',
  'I have confirmed the patient has read and understands the Telehealth Consent.',
  'I have confirmed no recording will occur without separate consent.',
  'The standard of care for telehealth is equivalent to in-person care for this clinical scenario.',
];

/* ─── Quick Start Modal ─────────────────────────────────────────────── */
function QuickStartModal({ apt, patient, onStart, onCancel }) {
  const [patientLocation, setPatientLocation] = useState('');

  const handleStart = () => {
    onStart({
      timestamp: isoNow(),
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : apt.patientName,
      patientLocation: patientLocation.trim() || 'Not provided',
      aptId: apt.id,
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', padding: '18px 24px' }}>
          <div style={{ fontWeight: 900, color: '#fff', fontSize: 16 }}>📹 Start Telehealth Session</div>
          <div style={{ fontSize: 12, color: '#bfdbfe', marginTop: 3 }}>HIPAA-compliant video visit · Illinois Telehealth Act compliant</div>
        </div>
        {/* Patient bar */}
        <div style={{ background: '#f0f9ff', borderBottom: '1px solid #bae6fd', padding: '10px 24px', display: 'flex', gap: 20, fontSize: 13, flexWrap: 'wrap' }}>
          <span>👤 <strong>{apt.patientName}</strong></span>
          <span>🕐 {apt.time}</span>
          {apt.reason && <span>📍 {apt.reason}</span>}
        </div>
        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#0369a1', marginBottom: 18 }}>
            ℹ️ <strong>Patient telehealth consent</strong> is collected at registration. Provider compliance reminders are listed on the Telehealth page.
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
              Patient's Current Physical Location
              <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 6 }}>(recommended for safety &amp; emergencies)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Chicago, IL"
              value={patientLocation}
              onChange={e => setPatientLocation(e.target.value)}
              autoFocus
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', background: '#f8fafc' }}>
          <button onClick={onCancel} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151' }}>
            Cancel
          </button>
          <button onClick={handleStart} style={{ padding: '9px 22px', borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            📹 Start Session
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Post-Session Summary Modal ─────────────────────────────────────── */
function PostSessionModal({ apt, patient, sessionDuration, sessionNote, onClose }) {
  const [selectedCPT, setSelectedCPT] = useState(CPT_CODES[1].code);
  const [diagnosis, setDiagnosis] = useState('');
  const [plan, setPlan] = useState('');
  const [followUp, setFollowUp] = useState('2 weeks');
  const [saved, setSaved] = useState(false);

  const handleSave = () => setSaved(true);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 660, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
        <div style={{ background: 'linear-gradient(135deg,#065f46,#059669)', padding: '18px 24px' }}>
          <div style={{ fontWeight: 900, color: '#fff', fontSize: 16 }}>✅ Session Complete — Post-Visit Summary</div>
          <div style={{ fontSize: 12, color: '#a7f3d0', marginTop: 2 }}>Complete documentation before closing</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {saved ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#065f46', marginBottom: 6 }}>Session Documented</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Visit note saved. Billing code queued. Encounter closed.</div>
              <button onClick={onClose} style={{ marginTop: 20, padding: '9px 24px', borderRadius: 8, background: '#059669', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Patient', val: apt.patientName, icon: '👤' },
                  { label: 'Duration', val: fmtTimer(sessionDuration), icon: '⏱️' },
                  { label: 'Date', val: apt.date || new Date().toLocaleDateString(), icon: '📅' },
                  { label: 'Type', val: 'Telehealth', icon: '📹' },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20 }}>{s.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>💰 Billing CPT Code</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {CPT_CODES.map(c => (
                    <label key={c.code} style={{ display: 'flex', gap: 10, cursor: 'pointer', padding: '9px 12px', borderRadius: 8,
                      border: `1.5px solid ${selectedCPT === c.code ? '#6366f1' : '#e2e8f0'}`,
                      background: selectedCPT === c.code ? '#eef2ff' : '#fafafa' }}>
                      <input type="radio" name="cpt" checked={selectedCPT === c.code} onChange={() => setSelectedCPT(c.code)} style={{ accentColor: '#6366f1' }} />
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#3730a3' }}>{c.code}</span>
                        <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>{c.label}</span>
                        <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8, fontStyle: 'italic' }}>{c.typical}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>🏥 Diagnosis / Assessment</label>
                <textarea className="form-textarea" rows={2} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g., F32.1 Major Depressive Disorder, recurrent, moderate — stable; continue current regimen" style={{ fontSize: 13 }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>📋 Plan</label>
                <textarea className="form-textarea" rows={3} value={plan} onChange={e => setPlan(e.target.value)} placeholder="Continue Sertraline 100mg, refills authorized. Patient to follow up in 2 weeks. Safety plan reviewed." style={{ fontSize: 13 }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>📅 Follow-up</label>
                <select className="form-input" value={followUp} onChange={e => setFollowUp(e.target.value)} style={{ fontSize: 13 }}>
                  {['1 week', '2 weeks', '3 weeks', '4 weeks', '6 weeks', '8 weeks', '3 months', 'PRN', 'No follow-up needed'].map(f => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>
              {sessionNote && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>📝 Session Notes (from visit)</div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#475569', lineHeight: 1.6, maxHeight: 100, overflowY: 'auto' }}>
                    {sessionNote}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {!saved && (
          <div style={{ padding: '14px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', background: '#f8fafc' }}>
            <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151' }}>
              Close Without Saving
            </button>
            <button onClick={handleSave} style={{ padding: '9px 22px', borderRadius: 8, background: '#059669', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              💾 Save & Close Encounter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Send Link Modal ────────────────────────────────────────────────── */
function SendLinkModal({ apt, patients, onClose, onSent }) {
  const contact = patients?.find(p => p.id === apt.patientId);
  const link = getVideoLink(apt);
  const [method, setMethod] = useState('sms');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const smsText = `Clarity Health: Your telehealth appointment is at ${apt.time}. Join here: ${link}`;
  const emailSubject = `Your Clarity Telehealth Visit Link – ${apt.time}`;
  const emailBody = `Dear ${apt.patientName},\n\nYour telehealth appointment is scheduled for ${apt.time} on ${apt.date || 'today'}.\n\nJoin your visit at:\n${link}\n\nBefore your visit:\n• Find a private, quiet location\n• Test your camera and microphone\n• Have your medication list available\n• Call our office if you have trouble connecting\n\nClarity Health`;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, boxShadow: '0 20px 50px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>📤 Send Telehealth Link</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>✕</button>
        </div>
        <div style={{ padding: '18px 20px', display: 'grid', gap: 14 }}>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', border: '1px solid #e2e8f0', fontSize: 13 }}>
            <div style={{ fontWeight: 700, marginBottom: 3 }}>{apt.patientName}</div>
            <div style={{ color: '#64748b', fontSize: 12 }}>🕐 {apt.time}{apt.date ? ` · ${apt.date}` : ''}{apt.reason ? ` · ${apt.reason}` : ''}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Secure Video Link</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly value={link} style={{ flex: 1, padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12, color: '#4f46e5' }} />
              <button onClick={handleCopy} style={{ padding: '8px 14px', borderRadius: 7, border: 'none', background: copied ? '#059669' : '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {copied ? '✅ Copied' : '📋 Copy'}
              </button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Send via</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ k: 'sms', label: '📱 Text (SMS)' }, { k: 'email', label: '✉️ Email' }].map(m => (
                <button key={m.k} onClick={() => setMethod(m.k)}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `2px solid ${method === m.k ? '#4f46e5' : '#e2e8f0'}`, background: method === m.k ? '#eef2ff' : '#fff', color: method === m.k ? '#4338ca' : '#64748b', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {contact && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
              {method === 'sms'
                ? <span>📱 <strong>{contact.cellPhone || contact.phone || 'No phone on file'}</strong></span>
                : <span>✉️ <strong>{contact.email || 'No email on file'}</strong></span>}
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Preview</div>
            {method === 'sms'
              ? <div style={{ background: '#1a1a2e', color: '#e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 11, fontFamily: 'monospace', lineHeight: 1.65 }}>{smsText}</div>
              : <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 11, lineHeight: 1.65 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, color: '#374151' }}>Subject: {emailSubject}</div>
                  <div style={{ whiteSpace: 'pre-line', color: '#64748b' }}>{emailBody}</div>
                </div>}
          </div>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#f8fafc' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151' }}>Cancel</button>
          <button onClick={() => onSent(apt.id, method)} style={{ padding: '8px 18px', borderRadius: 8, background: '#4f46e5', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {method === 'sms' ? '📱 Send Text' : '✉️ Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Active Session View ────────────────────────────────────────────── */
function ActiveSession({ apt, patient, consentRecord }) {
  const {
    isMuted, isVideoOff, isRecording, camError, sessionTimer,
    localStreamRef, streamReady, toggleMute, toggleCamera, toggleRecording, endSession,
  } = useTelehealth();
  const [isScreenShare, setIsScreenShare]   = useState(false);
  const localVideoRef = useRef(null);
  // Callback ref: attaches stream the instant the <video> element enters the DOM.
  // Handles the case where streamReady is already true when the element mounts
  // (e.g. camera toggled off→on, or returning to /telehealth mid-session).
  const setVideoRef = useCallback((el) => {
    localVideoRef.current = el;
    if (el && localStreamRef.current) {
      el.srcObject = localStreamRef.current;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [handRaised, setHandRaised]         = useState(false);
  const [chatMessages, setChatMessages]     = useState([
    { from: 'system', text: `Session started. Patient: ${apt.patientName} · Consent recorded at ${new Date(consentRecord.timestamp).toLocaleTimeString()}.`, time: nowTime() },
  ]);
  const [chatInput, setChatInput]           = useState('');
  const [notes, setNotes]                   = useState('');
  const [noteTemplate, setNoteTemplate]     = useState('');
  const [sidePanel, setSidePanel]           = useState('chat');
  const [connectionQuality]                 = useState(CONNECTION_QUALITY[0]);
  const [showPostSession, setShowPostSession] = useState(false);
  const [patientMicMuted, setPatientMicMuted] = useState(false);
  const chatEndRef = useRef(null);

  // Secondary: re-attach when the stream first becomes ready (element already mounted)
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [streamReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages(p => [...p, { from: 'Provider', text: chatInput, time: nowTime() }]);
    setChatInput('');
    setTimeout(() => {
      const replies = ['Thank you, I understand.', 'Yes, I\'ve been taking it consistently.', 'Should I continue at this dose?', 'That makes sense.'];
      setChatMessages(p => [...p, { from: apt.patientName.split(' ')[0], text: replies[Math.floor(Math.random() * replies.length)], time: nowTime() }]);
    }, 2500);
  };

  const applyTemplate = (tmpl) => {
    setNotes(p => p ? p + '\n\n' + tmpl.text : tmpl.text);
    setNoteTemplate('');
  };

  const handleEndSession = () => {
    setShowPostSession(true);
  };

  const qualityColor = { Excellent: '#22c55e', Good: '#84cc16', Fair: '#f59e0b', Poor: '#ef4444' }[connectionQuality];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', background: '#0f172a', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
      {/* Top bar */}
      <div style={{ background: '#0f172a', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>📹 {apt.patientName}</div>
          <div style={{ background: '#ef444420', color: '#f87171', padding: '4px 12px', borderRadius: 7, fontSize: 13, fontWeight: 800, fontFamily: 'monospace' }}>
            🔴 LIVE · {fmtTimer(sessionTimer)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: qualityColor }}>
            <span>●</span> {connectionQuality}
          </div>
          <div style={{ padding: '3px 10px', borderRadius: 20, background: '#16a34a20', color: '#4ade80', fontSize: 11, fontWeight: 700 }}>
            🔒 AES-256 Encrypted
          </div>
          <div style={{ padding: '3px 10px', borderRadius: 20, background: '#0891b220', color: '#67e8f9', fontSize: 11, fontWeight: 700 }}>
            ✅ Consent on File
          </div>
          {isRecording && (
            <div style={{ padding: '3px 10px', borderRadius: 20, background: '#ef444420', color: '#f87171', fontSize: 11, fontWeight: 700 }}>
              ⏺️ Recording
            </div>
          )}
        </div>
        <button onClick={handleEndSession}
          style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
          End Session
        </button>
      </div>

      {/* Camera error banner */}
      {camError && (
        <div style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#b91c1c' }}>
          <span>⚠️</span>
          <span style={{ flex: 1 }}>
            {camError === 'denied'
              ? <><strong>Camera/microphone access was denied.</strong> Check your browser permissions (usually in the address bar or browser settings) and refresh to try again.</>
              : <><strong>No camera or microphone detected.</strong> Make sure a device is connected and not in use by another app, then refresh.</>}
          </span>
        </div>
      )}

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Video area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', background: '#0f172a', padding: 16, gap: 12 }}>
          {/* Patient video (main) */}
          <div style={{ flex: 1, background: '#1e293b', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 0 }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: '#fff', fontWeight: 800 }}>
              {(apt.patientName || 'P').split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 700, marginTop: 12 }}>{apt.patientName}</div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
              {patientMicMuted ? '🔇 Muted' : '🎤 Active'} · 📷 Camera on
            </div>
            <div style={{ position: 'absolute', bottom: 10, left: 14, display: 'flex', gap: 6 }}>
              <span style={{ background: '#10b98130', color: '#10b981', padding: '2px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>CONNECTED</span>
              {apt.reason && <span style={{ background: '#6366f130', color: '#a5b4fc', padding: '2px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>{apt.reason}</span>}
            </div>
            <button onClick={() => setPatientMicMuted(m => !m)}
              style={{ position: 'absolute', bottom: 10, right: 14, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 7, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
              {patientMicMuted ? '🔈 Unmute Pt' : '🔇 Mute Pt'}
            </button>
          </div>

          {/* Provider PiP */}
          <div style={{ position: 'absolute', top: 26, right: 26, width: 160, height: 110, background: '#1e293b', borderRadius: 10, overflow: 'hidden', border: '2px solid #3b82f6', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* live video */}
            {!camError && !isVideoOff && (
              <video ref={setVideoRef} autoPlay playsInline muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 8 }} />
            )}
            {/* camera off placeholder */}
            {(isVideoOff || camError) && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                <div style={{ fontSize: 26 }}>{camError ? '⚠️' : '📵'}</div>
                <div style={{ color: '#94a3b8', fontSize: 9, marginTop: 4, textAlign: 'center', padding: '0 6px' }}>
                  {camError === 'denied' ? 'Camera access denied' : camError === 'unavailable' ? 'No camera found' : 'Camera off'}
                </div>
              </div>
            )}
            {/* overlay label */}
            <div style={{ position: 'absolute', bottom: 5, left: 6, fontSize: 9, color: '#cbd5e1', background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '1px 6px' }}>
              You {isMuted ? '🔇' : '🎤'}
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', padding: '10px 0', flexShrink: 0 }}>
            {[
              { icon: isMuted ? '🔇' : '🎤', label: isMuted ? 'Unmute' : 'Mute', active: isMuted, onClick: toggleMute },
              { icon: isVideoOff ? '📵' : '📹', label: isVideoOff ? 'Cam On' : 'Cam Off', active: isVideoOff, onClick: toggleCamera },
              { icon: '🖥️', label: isScreenShare ? 'Stop Share' : 'Share Screen', active: isScreenShare, onClick: () => setIsScreenShare(s => !s) },
              { icon: '⏺️', label: isRecording ? 'Stop Rec' : 'Record', active: isRecording, onClick: toggleRecording },
              { icon: '✋', label: handRaised ? 'Lower Hand' : 'Raise Hand', active: handRaised, onClick: () => setHandRaised(h => !h) },
            ].map(ctrl => (
              <button key={ctrl.label} onClick={ctrl.onClick} title={ctrl.label}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: ctrl.active ? '#dc2626' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', color: '#fff', fontSize: 18, minWidth: 60, transition: 'background 0.15s' }}>
                <span>{ctrl.icon}</span>
                <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.8 }}>{ctrl.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width: 340, background: '#fff', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e2e8f0' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
            {[{ k: 'chat', label: '💬 Chat' }, { k: 'notes', label: '📝 Notes' }, { k: 'info', label: '📋 Patient' }].map(t => (
              <button key={t.k} onClick={() => setSidePanel(t.k)}
                style={{ flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  background: sidePanel === t.k ? '#fff' : '#f8fafc',
                  color: sidePanel === t.k ? '#4f46e5' : '#64748b',
                  borderBottom: `2px solid ${sidePanel === t.k ? '#4f46e5' : 'transparent'}` }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Chat */}
          {sidePanel === 'chat' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    {m.from === 'system'
                      ? <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 7, padding: '6px 10px', fontSize: 11, color: '#0369a1' }}>🔔 {m.text}</div>
                      : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: m.from === 'Provider' ? 'flex-end' : 'flex-start' }}>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>{m.from} · {m.time}</div>
                          <div style={{ maxWidth: '80%', background: m.from === 'Provider' ? '#eef2ff' : '#f8fafc', border: `1px solid ${m.from === 'Provider' ? '#c7d2fe' : '#e2e8f0'}`, borderRadius: 10, padding: '7px 11px', fontSize: 13, color: '#1e293b' }}>
                            {m.text}
                          </div>
                        </div>
                      )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div style={{ padding: 10, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder="Message patient…" style={{ flex: 1, padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }} />
                <button onClick={sendChat} style={{ padding: '8px 14px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Send</button>
              </div>
            </div>
          )}

          {/* Notes */}
          {sidePanel === 'notes' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 14, gap: 10, minHeight: 0 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Quick Note Template</div>
                <select value={noteTemplate} onChange={e => { if (e.target.value) applyTemplate(QUICK_NOTE_TEMPLATES.find(t => t.label === e.target.value)); }}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12 }}>
                  <option value="">— Insert template —</option>
                  {QUICK_NOTE_TEMPLATES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                </select>
              </div>
              <textarea
                style={{ flex: 1, padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, resize: 'none', lineHeight: 1.65, minHeight: 200 }}
                placeholder="Session notes…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          )}

          {/* Patient info */}
          {sidePanel === 'info' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>📋 {apt.patientName}</div>
              {patient && (
                <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'DOB', val: patient.dob },
                    { label: 'MRN', val: patient.mrn },
                    { label: 'Insurance', val: patient.insurance?.primary || 'N/A' },
                    { label: 'Phone', val: patient.cellPhone || patient.phone || 'N/A' },
                  ].filter(r => r.val).map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#64748b' }}>{r.label}</span>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#166534', marginBottom: 4 }}>✅ Consent Recorded</div>
                <div style={{ fontSize: 11, color: '#15803d', lineHeight: 1.6 }}>
                  {new Date(consentRecord.timestamp).toLocaleString()}<br />
                  Location: {consentRecord.patientLocation}<br />
                  Identity Verified ✓
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#374151', marginBottom: 6 }}>Appointment</div>
                {[
                  { label: 'Time', val: apt.time },
                  { label: 'Date', val: apt.date },
                  { label: 'Reason', val: apt.reason },
                  { label: 'Provider', val: apt.providerName || apt.provider },
                ].filter(r => r.val).map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b' }}>{r.label}</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showPostSession && (
        <PostSessionModal
          apt={apt}
          patient={patient}
          sessionDuration={sessionTimer}
          sessionNote={notes}
          onClose={() => { setShowPostSession(false); endSession(); }}
        />
      )}
    </div>
  );
}

/* ─── Main Telehealth Page ───────────────────────────────────────────── */
export default function Telehealth() {
  const { appointments, patients } = usePatient();
  const { currentUser } = useAuth();
  const { activeSession, startSession } = useTelehealth();
  const [sendModal, setSendModal]           = useState(null);
  const [linkSentFor, setLinkSentFor]       = useState({});
  const [consentModal, setConsentModal]     = useState(null);
  const [consentRecords, setConsentRecords] = useState({});

  const telehealthAppts = appointments.filter(a =>
    a.visitType === 'Telehealth' && a.status !== 'Completed' && a.status !== 'Cancelled'
  );

  const handleStartSession = (apt) => {
    if (consentRecords[apt.id]) {
      const patient = patients?.find(p => p.id === apt.patientId);
      startSession({ apt, patient, consentRecord: consentRecords[apt.id] });
    } else {
      setConsentModal(apt);
    }
  };

  const handleConsentComplete = (record) => {
    setConsentRecords(p => ({ ...p, [consentModal.id]: record }));
    const apt = consentModal;
    const patient = patients?.find(p => p.id === apt.patientId);
    setConsentModal(null);
    startSession({ apt, patient, consentRecord: record });
  };

  const handleLinkSent = (aptId, method) => {
    setLinkSentFor(p => ({ ...p, [aptId]: method }));
    setSendModal(null);
  };

  if (activeSession) {
    return (
      <div className="fade-in">
        <ActiveSession
          apt={activeSession.apt}
          patient={activeSession.patient}
          consentRecord={activeSession.consentRecord}
        />
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--text-primary)' }}>📹 Telehealth</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>HIPAA-compliant video visits · Illinois Telehealth Act compliant</p>
      </div>

      {/* Compliance banner */}
      <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#1e40af)', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 28 }}>🏛️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, color: '#fff', fontSize: 13 }}>Illinois Telehealth Act (410 ILCS 151) Compliance</div>
          <div style={{ fontSize: 11, color: '#bfdbfe', marginTop: 2 }}>Patient telehealth consent is collected at registration. Location confirmation occurs at session start. Provider compliance reminders are listed below.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Encrypted', 'HIPAA Compliant', 'IL Act Compliant', 'Registration Consent'].map(badge => (
            <span key={badge} style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.15)', color: '#bfdbfe', fontSize: 10, fontWeight: 700 }}>{badge}</span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Scheduled Today', val: telehealthAppts.length, icon: '📅', color: '#3b82f6' },
          { label: 'Ready (Checked In)', val: telehealthAppts.filter(a => a.status === 'Checked In').length, icon: '🟢', color: '#22c55e' },
          { label: 'Links Sent', val: Object.keys(linkSentFor).length, icon: '📤', color: '#8b5cf6' },
          { label: 'Sessions Started', val: Object.keys(consentRecords).length, icon: '▶️', color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontSize: 24 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Provider Compliance Reminders */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: '#1e40af', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          📋 Provider Telehealth Compliance Reminders
          <span style={{ fontWeight: 400, fontSize: 11, color: '#64748b' }}>— for reference; patient consent is captured at registration</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 8 }}>
          {PROVIDER_ATTESTATION_ITEMS.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f8fafc', borderRadius: 8, padding: '9px 12px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#0891b2', fontWeight: 900, fontSize: 12, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
              <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.55 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Virtual Waiting Room */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>🕐 Virtual Waiting Room</div>
          <span style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{telehealthAppts.length} appointment{telehealthAppts.length !== 1 ? 's' : ''}</span>
        </div>

        {telehealthAppts.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📹</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>No telehealth appointments scheduled</div>
          </div>
        ) : (
          <div>
            {telehealthAppts.map(apt => {
              const hasConsent = !!consentRecords[apt.id];
              const linkSent = linkSentFor[apt.id];
              const isReady = apt.status === 'Checked In' || apt.status === 'Confirmed';
              return (
                <div key={apt.id} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, background: isReady ? '#f0fdf4' : '#fff' }}>
                  <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 60 }}>
                    <div style={{ fontWeight: 900, fontSize: 16, color: 'var(--text-primary)' }}>{apt.time}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
                      background: isReady ? '#dcfce7' : '#dbeafe',
                      color: isReady ? '#166534' : '#1e40af' }}>
                      {isReady ? '🟢 Ready' : apt.status}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{apt.patientName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' }}>
                      {apt.reason && <span>📍 {apt.reason}</span>}
                      {apt.providerName && <span>👩‍⚕️ {apt.providerName}</span>}
                      {hasConsent && <span style={{ color: '#16a34a', fontWeight: 700 }}>✅ Consent on file</span>}
                      {linkSent && <span style={{ color: '#7c3aed', fontWeight: 700 }}>📤 Link sent via {linkSent.toUpperCase()}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button onClick={() => setSendModal(apt)}
                      style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, cursor: 'pointer', color: '#374151', fontWeight: 600 }}>
                      {linkSent ? '🔄 Resend Link' : '📤 Send Link'}
                    </button>
                    <button onClick={() => handleStartSession(apt)}
                      style={{ padding: '7px 16px', borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                      {hasConsent ? '📹 Resume Session' : '📹 Start Session'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ad-Hoc Session */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>⚡ Ad-Hoc Session</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Start an unscheduled telehealth visit for a walk-in or urgent need. Patient consent on file from registration applies.</p>
        <button
          onClick={() => setConsentModal({ id: 'adhoc-' + Date.now(), patientName: 'Patient', time: nowTime(), date: new Date().toLocaleDateString(), reason: 'Ad-Hoc Visit' })}
          style={{ padding: '10px 22px', borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
          📹 Start New Telehealth Session
        </button>
      </div>

      {/* Modals */}
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
