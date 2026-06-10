/**
 * SafetyPlanBuilder — Stanley-Brown Safety Planning Intervention
 * Structured crisis safety plan with 6 steps. Saves to chart, prints to PDF.
 */
import React, { useState } from 'react';

const BG    = '#1a1f2e';
const BG2   = '#232838';
const BG3   = '#2a3045';
const BORDER = 'rgba(255,255,255,0.08)';
const T_PRI = 'rgba(255,255,255,0.95)';
const T_SEC = 'rgba(255,255,255,0.60)';
const T_MUT = 'rgba(255,255,255,0.38)';
const ACCENT = '#6366f1';
const DANGER = '#dc2626';

const STEP_CONFIG = [
  { num: 1, icon: '⚠️', title: 'Warning Signs',              desc: 'What thoughts, images, moods, situations, behaviors signal a crisis may be developing?', color: '#d97706', placeholder: 'e.g., I start isolating, I stop eating, I can\'t sleep, racing thoughts…' },
  { num: 2, icon: '🧘', title: 'Internal Coping Strategies', desc: 'Things I can do on my own to take my mind off problems without contacting another person.', color: '#7c3aed', placeholder: 'e.g., Go for a walk, listen to music, take a shower, meditate…' },
  { num: 3, icon: '👥', title: 'Social Contacts for Distraction', desc: 'People and social settings that provide distraction (not necessarily crisis-focused).',  color: '#0891b2', placeholder: 'Name / Phone / Place to go…' },
  { num: 4, icon: '🆘', title: 'People I Can Ask for Help',  desc: 'People I can tell that I\'m having a crisis and ask for help.', color: '#16a34a', placeholder: 'Name / Relationship / Phone…' },
  { num: 5, icon: '☎️', title: 'Professionals & Crisis Lines',desc: 'Clinicians, agencies, and hotlines I can contact during a crisis.', color: ACCENT, placeholder: '' },
  { num: 6, icon: '🔒', title: 'Making the Environment Safe', desc: 'Lethal means restriction — removing or securing items that could be used for self-harm.', color: DANGER, placeholder: 'e.g., Medications secured by family member, firearms stored at…' },
];

const DEFAULT_CRISIS_CONTACTS = [
  { label: '988 Suicide & Crisis Lifeline', value: 'Call or text 988' },
  { label: 'Crisis Text Line',              value: 'Text HOME to 741741' },
  { label: 'Emergency Services',            value: '911' },
];

function StepCard({ step, value, onChange }) {
  return (
    <div style={{
      background: BG2, border: `1px solid ${step.color}30`, borderRadius: 12,
      overflow: 'hidden', marginBottom: 12,
    }}>
      <div style={{
        padding: '10px 16px', background: `${step.color}15`,
        borderBottom: `1px solid ${step.color}30`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          fontSize: 9.5, fontWeight: 800, color: step.color, background: `${step.color}20`,
          padding: '2px 8px', borderRadius: 10, letterSpacing: '0.4px',
        }}>
          STEP {step.num}
        </span>
        <span style={{ fontSize: 14 }}>{step.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: T_PRI }}>{step.title}</span>
      </div>
      <div style={{ padding: '10px 16px' }}>
        <div style={{ fontSize: 11.5, color: T_SEC, marginBottom: 8, lineHeight: 1.5 }}>{step.desc}</div>

        {step.num === 5 ? (
          /* Professional contacts — structured + free text */
          <div>
            {DEFAULT_CRISIS_CONTACTS.map(c => (
              <div key={c.label} style={{
                fontSize: 12, color: T_SEC, padding: '5px 10px', background: BG3,
                borderRadius: 6, marginBottom: 5, display: 'flex', gap: 8,
              }}>
                <span style={{ color: T_MUT, minWidth: 140 }}>{c.label}:</span>
                <span style={{ color: T_PRI, fontWeight: 600 }}>{c.value}</span>
              </div>
            ))}
            <textarea
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder="Provider: Dr. [Name] — (xxx) xxx-xxxx&#10;After-hours line: (xxx) xxx-xxxx&#10;Nearest ER: [Hospital name]"
              style={{
                width: '100%', boxSizing: 'border-box', marginTop: 6,
                background: BG3, border: `1px solid ${BORDER}`, borderRadius: 8,
                color: T_PRI, fontSize: 12, padding: '8px 12px', resize: 'vertical',
                minHeight: 72, outline: 'none', lineHeight: 1.5,
                fontFamily: 'inherit',
              }}
            />
          </div>
        ) : (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={step.placeholder}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: BG3, border: `1px solid ${BORDER}`, borderRadius: 8,
              color: T_PRI, fontSize: 12, padding: '8px 12px', resize: 'vertical',
              minHeight: step.num === 1 ? 64 : 80, outline: 'none', lineHeight: 1.5,
              fontFamily: 'inherit',
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function SafetyPlanBuilder({ patient, provider, onSave, onClose, existingPlan }) {
  const initPlan = existingPlan || { step1:'', step2:'', step3:'', step4:'', step5:'', step6:'', reasonsForLiving:'', createdDate: '' };
  const [plan, setPlan] = useState(initPlan);
  const [saved, setSaved] = useState(false);

  const updateStep = (stepNum, val) => setPlan(prev => ({ ...prev, [`step${stepNum}`]: val }));
  const hasContent = STEP_CONFIG.some(s => (plan[`step${s.num}`] || '').trim().length > 0);

  const handleSave = () => {
    const entry = { ...plan, createdDate: new Date().toISOString().split('T')[0], provider };
    onSave?.(entry);
    setSaved(true);
  };

  const handlePrint = () => {
    const patName = patient ? `${patient.firstName} ${patient.lastName}` : 'Patient';
    const dob = patient?.dob || '';
    const w = window.open('', '_blank');
    w.document.write(`
      <!DOCTYPE html><html><head><title>Safety Plan — ${patName}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 32px; color: #111; }
        h1 { font-size: 18px; color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 6px; }
        .subtitle { font-size: 12px; color: #555; margin-top: 4px; }
        .step { margin-top: 18px; }
        .step-header { font-size: 13px; font-weight: bold; color: #1e3a5f; margin-bottom: 4px; }
        .step-content { font-size: 12px; white-space: pre-wrap; border: 1px solid #ccc; padding: 8px 12px; border-radius: 6px; min-height: 36px; background: #f9f9f9; }
        .crisis-line { font-size: 12px; padding: 4px 0; }
        .footer { margin-top: 28px; font-size: 10px; color: #888; border-top: 1px solid #ccc; padding-top: 8px; }
        @media print { body { padding: 12px; } }
      </style></head><body>
      <h1>Safety Planning Intervention</h1>
      <div class="subtitle">Patient: <strong>${patName}</strong> &nbsp;|&nbsp; DOB: ${dob} &nbsp;|&nbsp; Date: ${plan.createdDate || new Date().toISOString().split('T')[0]} &nbsp;|&nbsp; Provider: ${provider || ''}</div>
      ${STEP_CONFIG.map(s => `
        <div class="step">
          <div class="step-header">Step ${s.num}: ${s.title}</div>
          <div class="step-content">${plan[`step${s.num}`] || '(not completed)'}</div>
        </div>
      `).join('')}
      ${plan.reasonsForLiving ? `<div class="step"><div class="step-header">Reasons for Living</div><div class="step-content">${plan.reasonsForLiving}</div></div>` : ''}
      <div class="step"><div class="step-header">24/7 Crisis Resources</div>
        <div class="step-content">988 Suicide &amp; Crisis Lifeline: Call or text 988\nCrisis Text Line: Text HOME to 741741\nEmergency Services: 911</div></div>
      <div class="footer">This safety plan was developed collaboratively with the patient. Patient signature: __________________ &nbsp;&nbsp; Provider: __________________</div>
      </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div style={{
      background: BG, border: `1px solid ${BORDER}`, borderRadius: 14,
      overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Header */}
      <div style={{
        background: `${DANGER}18`, padding: '14px 20px',
        borderBottom: `1px solid ${DANGER}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: T_PRI, fontWeight: 700, fontSize: 15 }}>🛡 Safety Plan</div>
          <div style={{ color: T_MUT, fontSize: 11, marginTop: 2 }}>
            Stanley-Brown Safety Planning Intervention · {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handlePrint} style={{ background:'none', border:`1px solid ${BORDER}`, color:T_SEC, fontSize:11.5, padding:'5px 12px', borderRadius:6, cursor:'pointer' }}>
            🖨 Print
          </button>
          {onClose && <button onClick={onClose} style={{ background:'none', border:'none', color:T_MUT, fontSize:20, cursor:'pointer' }}>✕</button>}
        </div>
      </div>

      {/* Steps */}
      <div style={{ padding: '16px 20px', overflowY: 'auto', maxHeight: 520 }}>
        {STEP_CONFIG.map(step => (
          <StepCard
            key={step.num}
            step={step}
            value={plan[`step${step.num}`]}
            onChange={val => updateStep(step.num, val)}
          />
        ))}

        {/* Reasons for living */}
        <div style={{ background: BG2, border: `1px solid #16a34a30`, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ padding: '10px 16px', background: '#16a34a15', borderBottom: `1px solid #16a34a30`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>💚</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: T_PRI }}>Reasons for Living</span>
            <span style={{ fontSize: 10, color: T_MUT }}>(optional but powerful)</span>
          </div>
          <div style={{ padding: '10px 16px' }}>
            <textarea
              value={plan.reasonsForLiving}
              onChange={e => setPlan(prev => ({ ...prev, reasonsForLiving: e.target.value }))}
              placeholder="What are the most important reasons you have for living? (family, pets, goals, values…)"
              style={{ width:'100%', boxSizing:'border-box', background:BG3, border:`1px solid ${BORDER}`, borderRadius:8, color:T_PRI, fontSize:12, padding:'8px 12px', resize:'vertical', minHeight:60, outline:'none', lineHeight:1.5, fontFamily:'inherit' }}
            />
          </div>
        </div>

        {saved && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', color: '#15803d', fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
            ✅ Safety plan saved to chart — {new Date().toLocaleDateString()}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            disabled={!hasContent}
            onClick={handleSave}
            style={{
              flex: 1, padding: '10px', borderRadius: 8, border: 'none',
              background: hasContent ? '#16a34a' : BG3,
              color: hasContent ? '#fff' : T_MUT,
              fontSize: 13, fontWeight: 700, cursor: hasContent ? 'pointer' : 'default',
            }}
          >
            {saved ? '✓ Saved' : '💾 Save to Chart'}
          </button>
          <button
            onClick={handlePrint}
            style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${BORDER}`, background: BG3, color: T_SEC, fontSize: 13, cursor: 'pointer' }}
          >
            🖨 Print for Patient
          </button>
        </div>
      </div>
    </div>
  );
}
