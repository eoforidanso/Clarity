import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/* ─── Ambient AI Scribe — Settings, History & Analytics Dashboard ─────────── */

const SAMPLE_HISTORY = [
  { id: 1, patientName: 'James Anderson', date: '2026-04-15', time: '09:15 AM', duration: '18:34', type: 'Follow-Up', status: 'Applied', accuracy: 94, wordCount: 412, noteType: 'SOAP' },
  { id: 2, patientName: 'Maria Garcia', date: '2026-04-15', time: '10:00 AM', duration: '22:10', type: 'Med Management', status: 'Applied', accuracy: 97, wordCount: 538, noteType: 'SOAP' },
  { id: 3, patientName: 'David Thompson', date: '2026-04-14', time: '02:30 PM', duration: '15:45', type: 'Therapy Session', status: 'Discarded', accuracy: 88, wordCount: 356, noteType: 'SOAP' },
  { id: 4, patientName: 'Emily Chen', date: '2026-04-14', time: '11:00 AM', duration: '20:22', type: 'Initial Evaluation', status: 'Applied', accuracy: 96, wordCount: 624, noteType: 'SOAP' },
  { id: 5, patientName: 'Robert Wilson', date: '2026-04-12', time: '03:15 PM', duration: '12:08', type: 'Crisis Follow-Up', status: 'Applied', accuracy: 91, wordCount: 298, noteType: 'SOAP' },
  { id: 6, patientName: 'Aisha Patel', date: '2026-04-11', time: '09:45 AM', duration: '25:01', type: 'Intake Assessment', status: 'Applied', accuracy: 95, wordCount: 712, noteType: 'SOAP' },
];

const DEFAULT_SETTINGS = {
  autoStart: false,
  autoApply: false,
  defaultNoteFormat: 'SOAP',
  language: 'English',
  specialtyContext: 'Psychiatry',
  includeRiskAssessment: true,
  includeMedicationReview: true,
  includeSafetyPlan: true,
  privacyMode: true,
  retainAudio: false,
  audioRetentionDays: 0,
  confidenceThreshold: 85,
  smartPhraseIntegration: true,
  voiceDictationEnhanced: true,
  realTimeTranscript: true,
  speakerDiarization: true,
  backgroundNoiseReduction: true,
};

export default function AmbientScribe() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const isPrescriber = currentUser?.role === 'prescriber';
  const isTherapist = currentUser?.role === 'therapist';
  const isNurse = currentUser?.role === 'nurse';

  const saveSettings = () => {
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const appliedNotes = SAMPLE_HISTORY.filter(h => h.status === 'Applied');
  const avgAccuracy = appliedNotes.length > 0 ? Math.round(appliedNotes.reduce((s, h) => s + h.accuracy, 0) / appliedNotes.length) : 0;
  const totalWords = SAMPLE_HISTORY.reduce((s, h) => s + h.wordCount, 0);
  const totalDuration = SAMPLE_HISTORY.reduce((s, h) => {
    const [m, sec] = h.duration.split(':').map(Number);
    return s + m * 60 + sec;
  }, 0);

  const card = {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  };

  const sectionLabel = {
    display: 'block',
    fontWeight: 700,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#64748b',
    marginBottom: 6,
  };

  const tabs = [
    { key: 'dashboard', icon: '📊', label: 'Dashboard' },
    { key: 'history', icon: '📜', label: 'Session History' },
    { key: 'settings', icon: '⚙️', label: 'Settings' },
    { key: 'help', icon: '❓', label: 'How It Works' },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            🎙️ Ambient AI Scribe
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            AI-powered encounter documentation — records conversations and auto-generates SOAP notes
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ padding: '6px 14px', borderRadius: 20, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>System Active</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
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

      {/* ════ Dashboard ════ */}
      {activeTab === 'dashboard' && (
        <div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Sessions This Week', value: SAMPLE_HISTORY.length, icon: '🎙️', color: '#4f46e5' },
              { label: 'Average Accuracy', value: `${avgAccuracy}%`, icon: '🎯', color: '#16a34a' },
              { label: 'Words Generated', value: totalWords.toLocaleString(), icon: '📝', color: '#0891b2' },
              { label: 'Time Saved (est.)', value: `${Math.round(totalDuration / 60 * 0.7)}m`, icon: '⏱️', color: '#d97706' },
            ].map(s => (
              <div key={s.label} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${s.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Access */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div style={card}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                🚀 Quick Start Guide
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { step: 1, text: 'Open an encounter from a patient\'s chart', icon: '📋' },
                  { step: 2, text: 'Click "Start Ambient Recording" in the encounter form', icon: '🎙️' },
                  { step: 3, text: 'Conduct your session — speak naturally with the patient', icon: '🗣️' },
                  { step: 4, text: 'Stop recording — AI processes and generates SOAP note', icon: '🧠' },
                  { step: 5, text: 'Review the generated note, edit if needed, then apply', icon: '✅' },
                ].map(s => (
                  <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f7f9fc', borderRadius: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{s.step}</div>
                    <span style={{ fontSize: 13, color: '#334155' }}>{s.text}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 18 }}>{s.icon}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={card}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                📊 Accuracy by Visit Type
              </h3>
              {[
                { type: 'Med Management', accuracy: 97, color: '#16a34a' },
                { type: 'Initial Evaluation', accuracy: 96, color: '#22c55e' },
                { type: 'Intake Assessment', accuracy: 95, color: '#4ade80' },
                { type: 'Follow-Up', accuracy: 94, color: '#86efac' },
                { type: 'Crisis Follow-Up', accuracy: 91, color: '#fbbf24' },
                { type: 'Therapy Session', accuracy: 88, color: '#f59e0b' },
              ].map(v => (
                <div key={v.type} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{v.type}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: v.color }}>{v.accuracy}%</span>
                  </div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${v.accuracy}%`, background: v.color, borderRadius: 3, transition: 'width 0.5s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div style={card}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              📜 Recent Scribe Sessions
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    {['Patient', 'Date', 'Time', 'Duration', 'Type', 'Status', 'Accuracy', 'Words'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_HISTORY.slice(0, 5).map(h => (
                    <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e293b' }}>{h.patientName}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{h.date}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{h.time}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{h.duration}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{h.type}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: h.status === 'Applied' ? '#f0fdf4' : '#fef2f2',
                          color: h.status === 'Applied' ? '#16a34a' : '#dc2626',
                        }}>{h.status}</span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: h.accuracy >= 95 ? '#16a34a' : h.accuracy >= 90 ? '#d97706' : '#dc2626' }}>{h.accuracy}%</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{h.wordCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════ History ════ */}
      {activeTab === 'history' && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: 0 }}>📜 All Scribe Sessions</h3>
            <div style={{ fontSize: 12, color: '#64748b' }}>{SAMPLE_HISTORY.length} sessions total</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['Patient', 'Date', 'Time', 'Duration', 'Visit Type', 'Note Format', 'Status', 'Accuracy', 'Words'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SAMPLE_HISTORY.map(h => (
                  <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e293b' }}>{h.patientName}</td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>{h.date}</td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>{h.time}</td>
                    <td style={{ padding: '10px 12px', color: '#475569', fontFamily: 'monospace' }}>{h.duration}</td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>{h.type}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: '#eff6ff', color: '#4f46e5', fontSize: 11, fontWeight: 700 }}>{h.noteType}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: h.status === 'Applied' ? '#f0fdf4' : '#fef2f2',
                        color: h.status === 'Applied' ? '#16a34a' : '#dc2626',
                      }}>{h.status === 'Applied' ? '✅ Applied' : '✕ Discarded'}</span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: h.accuracy >= 95 ? '#16a34a' : h.accuracy >= 90 ? '#d97706' : '#dc2626' }}>{h.accuracy}%</td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>{h.wordCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════ Settings ════ */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* General Settings */}
          <div style={card}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              ⚙️ General Settings
            </h3>
            {[
              { key: 'autoStart', label: 'Auto-start recording on encounter open', desc: 'Begin ambient recording automatically when a new encounter is created' },
              { key: 'autoApply', label: 'Auto-apply generated notes', desc: 'Skip review step and apply SOAP note directly (not recommended)' },
              { key: 'realTimeTranscript', label: 'Show real-time transcript', desc: 'Display live transcription during recording' },
              { key: 'smartPhraseIntegration', label: 'Smart Phrase integration', desc: 'Allow AI to use your custom Smart Phrases in generated notes' },
              { key: 'voiceDictationEnhanced', label: 'Enhanced voice dictation', desc: 'Use AI-powered dictation with medical vocabulary' },
            ].map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.desc}</div>
                </div>
                <button onClick={() => setSettings(prev => ({ ...prev, [s.key]: !prev[s.key] }))}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
                    background: settings[s.key] ? '#4f46e5' : '#cbd5e1', transition: 'background 0.2s',
                  }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
                    left: settings[s.key] ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
            ))}
          </div>

          {/* Clinical Settings */}
          <div style={card}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              🏥 Clinical Settings
            </h3>

            <div style={{ marginBottom: 16 }}>
              <label style={sectionLabel}>Default Note Format</label>
              <select className="form-input" value={settings.defaultNoteFormat}
                onChange={e => setSettings(prev => ({ ...prev, defaultNoteFormat: e.target.value }))} style={{ fontSize: 13 }}>
                <option value="SOAP">SOAP Note</option>
                <option value="DAP">DAP Note</option>
                <option value="BIRP">BIRP Note</option>
                <option value="Narrative">Narrative</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={sectionLabel}>Specialty Context</label>
              <select className="form-input" value={settings.specialtyContext}
                onChange={e => setSettings(prev => ({ ...prev, specialtyContext: e.target.value }))} style={{ fontSize: 13 }}>
                <option value="Psychiatry">Psychiatry</option>
                <option value="Psychology">Psychology</option>
                <option value="Social Work">Social Work / Therapy</option>
                <option value="Addiction Medicine">Addiction Medicine</option>
                <option value="Child & Adolescent">Child & Adolescent Psychiatry</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={sectionLabel}>Confidence Threshold (%)</label>
              <input type="range" min={50} max={100} value={settings.confidenceThreshold}
                onChange={e => setSettings(prev => ({ ...prev, confidenceThreshold: Number(e.target.value) }))}
                style={{ width: '100%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                <span>50% (more results)</span>
                <span style={{ fontWeight: 800, color: '#4f46e5' }}>{settings.confidenceThreshold}%</span>
                <span>100% (strict)</span>
              </div>
            </div>

            {[
              { key: 'includeRiskAssessment', label: 'Include risk assessment section', desc: 'Auto-generate safety/risk assessment in every note' },
              { key: 'includeMedicationReview', label: 'Include medication review', desc: 'Auto-populate current medications in note' },
              { key: 'includeSafetyPlan', label: 'Include safety plan prompt', desc: 'Flag safety planning when risk indicators detected' },
              { key: 'speakerDiarization', label: 'Speaker diarization', desc: 'Distinguish between clinician and patient speech' },
              { key: 'backgroundNoiseReduction', label: 'Background noise reduction', desc: 'Filter ambient noise for clearer transcription' },
            ].map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.desc}</div>
                </div>
                <button onClick={() => setSettings(prev => ({ ...prev, [s.key]: !prev[s.key] }))}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
                    background: settings[s.key] ? '#4f46e5' : '#cbd5e1', transition: 'background 0.2s',
                  }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
                    left: settings[s.key] ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
            ))}

            {/* Privacy */}
            <div style={{ marginTop: 16, padding: 14, background: '#fef3c7', borderRadius: 10, border: '1px solid #fde68a' }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: '#92400e', marginBottom: 4 }}>🔒 Privacy & Compliance</div>
              <div style={{ fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>
                Ambient recordings are processed in real-time and <strong>never stored</strong> on servers.
                All HIPAA and 42 CFR Part 2 protections apply. Audio is discarded immediately after SOAP generation.
                Generated text is associated with the encounter record only.
              </div>
            </div>
          </div>

          {/* Save */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setSettings(DEFAULT_SETTINGS)}
              style={{ padding: '10px 24px', borderRadius: 10, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Reset Defaults
            </button>
            <button onClick={saveSettings}
              style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {settingsSaved ? '✅ Settings Saved!' : '💾 Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* ════ How It Works ════ */}
      {activeTab === 'help' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={card}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>🎙️ What is Ambient AI Scribe?</h3>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, margin: '0 0 12px' }}>
              Ambient AI Scribe listens to your clinical encounter in real-time and automatically generates a structured
              clinical note using advanced natural language processing. It's designed to reduce documentation burden
              and let you focus on the patient.
            </p>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, margin: 0 }}>
              The AI understands psychiatric terminology, medication names, diagnostic criteria, and clinical workflow.
              It distinguishes between clinician and patient speech, and structures the output according to your preferred
              note format (SOAP, DAP, BIRP, or Narrative).
            </p>
          </div>

          <div style={card}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>🔒 Privacy & Compliance</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '🏥', text: 'HIPAA compliant — all data encrypted in transit and at rest' },
                { icon: '🔐', text: '42 CFR Part 2 compliant for substance abuse records' },
                { icon: '🗑️', text: 'Audio never stored — processed in real-time and immediately discarded' },
                { icon: '👤', text: 'Patient consent required — document consent before each recording' },
                { icon: '📋', text: 'Audit trail — all scribe sessions logged for compliance review' },
                { icon: '🛡️', text: 'SOC 2 Type II certified processing infrastructure' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f7f9fc', borderRadius: 8 }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: '#334155' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...card, gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>💡 Tips for Best Results</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { icon: '🗣️', title: 'Speak Naturally', text: 'No need to change your clinical style. The AI adapts to your conversational patterns.' },
                { icon: '🔇', title: 'Minimize Background Noise', text: 'Close windows, silence phones. Noise reduction helps but a quiet environment is best.' },
                { icon: '📋', title: 'State Key Details', text: 'Verbally mention medication names, doses, and diagnostic impressions for best accuracy.' },
                { icon: '✏️', title: 'Review Before Applying', text: 'Always review generated notes. AI is a tool to assist, not replace clinical judgment.' },
                { icon: '🎯', title: 'Use Smart Phrases', text: 'Enable Smart Phrase integration to let AI use your custom templates in generated notes.' },
                { icon: '📊', title: 'Track Accuracy', text: 'Monitor your accuracy scores over time — the AI learns from your editing patterns.' },
              ].map((tip, i) => (
                <div key={i} style={{ padding: 16, background: '#f7f9fc', borderRadius: 10 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{tip.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>{tip.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{tip.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
