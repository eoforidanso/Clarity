import React, { useState } from 'react';

const SYSTEMS = [
  { id: 'clarity',  name: 'Clarity EHR',  icon: '🏥', color: '#2563eb', score: 100, full: 61, partial: 0,  none: 0,  ux: 9.6 },
  { id: 'epic',     name: 'Epic',          icon: '🏛️', color: '#7c3aed', score: 95,  full: 57, partial: 2,  none: 2,  ux: 6.5 },
  { id: 'athena',   name: 'athenaOne',     icon: '☁️', color: '#0891b2', score: 85,  full: 47, partial: 10, none: 4,  ux: 7.8 },
  { id: 'tebra',    name: 'Tebra',         icon: '💼', color: '#d97706', score: 60,  full: 30, partial: 13, none: 18, ux: 7.2 },
  { id: 'mend',     name: 'Mend',          icon: '📹', color: '#dc2626', score: 25,  full: 12, partial: 6,  none: 43, ux: 7.5 },
];

// ✅ Full  ⚠️ Partial  ❌ None
const F = '✅', P = '⚠️', N = '❌';

const CATEGORIES = [
  {
    label: 'Core Clinical', id: 'clinical',
    features: [
      { name: 'Patient Chart (Problems, Meds, Allergies, Vitals, Immunizations)', clarity: [F,'Full'], epic: [F,'Full'], athena: [F,'Full'], tebra: [F,'Full'], mend: [P,'Basic'] },
      { name: 'Encounter Documentation', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [P,'Limited'] },
      { name: 'Assessments & Treatment Plans', clarity: [F,'Psych-focused'], epic: [F], athena: [F], tebra: [P,'Basic'], mend: [P,'Basic'] },
      { name: 'Problem List / ICD-10', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [N] },
      { name: 'Lab Orders & Results', clarity: [F,'+ New Order'], epic: [F,'Full'], athena: [F,'Full'], tebra: [F], mend: [N] },
      { name: 'Orders Management', clarity: [F], epic: [F], athena: [F], tebra: [P,'Basic'], mend: [N] },
      { name: 'Demographics & Insurance', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [P,'Basic'] },
    ],
  },
  {
    label: 'E-Prescribing', id: 'prescribing',
    features: [
      { name: 'E-Prescribe (NCPDP)', clarity: [F,'Full'], epic: [F,'Full'], athena: [F,'Full'], tebra: [F,'Veradigm'], mend: [N] },
      { name: 'EPCS Two-Factor (DEA 21 CFR 1311)', clarity: [F,'PIN + OTP'], epic: [F], athena: [F], tebra: [F], mend: [N] },
      { name: 'RxNorm Live Search (NLM API)', clarity: [F], epic: [F], athena: [F], tebra: [N], mend: [N] },
      { name: 'Controlled Substance Scheduling', clarity: [F,'Sched II–V'], epic: [F], athena: [F], tebra: [F], mend: [N] },
      { name: 'Staff Refill Routing (MD-only)', clarity: [F], epic: [F], athena: [F], tebra: [P,'Basic'], mend: [N] },
      { name: 'Pharmacy Directory Search', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [N] },
      { name: 'DAW / Substitution Control', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [N] },
    ],
  },
  {
    label: 'Scheduling', id: 'scheduling',
    features: [
      { name: 'Appointment Calendar', clarity: [F,'Multi-view'], epic: [F], athena: [F], tebra: [F], mend: [F] },
      { name: 'Online Self-Scheduling', clarity: [F,'Portal'], epic: [F], athena: [F], tebra: [F], mend: [F] },
      { name: 'Waitlist Management', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [N] },
      { name: 'Multi-Provider Scheduling', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [P,'Basic'] },
      { name: 'Recurring Appointments', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [N] },
    ],
  },
  {
    label: 'Telehealth', id: 'telehealth',
    features: [
      { name: '1:1 Video Visits', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [F,'Core'] },
      { name: 'Group Telehealth', clarity: [F,'Breakout rooms'], epic: [F], athena: [N], tebra: [N], mend: [F] },
      { name: 'Virtual Waiting Room', clarity: [F], epic: [F], athena: [F], tebra: [P], mend: [F] },
      { name: 'Screen Share', clarity: [F], epic: [F], athena: [N], tebra: [N], mend: [F] },
      { name: 'In-Session Chat', clarity: [F], epic: [F], athena: [P], tebra: [N], mend: [F] },
      { name: 'Go-To Session (Quick Launch)', clarity: [F], epic: [N], athena: [N], tebra: [N], mend: [F] },
    ],
  },
  {
    label: 'Patient Portal', id: 'portal',
    features: [
      { name: 'Patient Portal', clarity: [F,'9-tab'], epic: [F,'MyChart'], athena: [F], tebra: [F], mend: [F] },
      { name: 'Multi-Language Support', clarity: [F,'8 languages'], epic: [F], athena: [P,'2–3'], tebra: [P,'Spanish'], mend: [N] },
      { name: 'Patient Messaging', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [F] },
      { name: 'Online Bill Pay', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [N] },
      { name: 'AutoPay Enrollment', clarity: [F], epic: [F], athena: [F], tebra: [P], mend: [N] },
      { name: 'AI Chat Assistant (Patient)', clarity: [F], epic: [P,'Limited'], athena: [N], tebra: [N], mend: [N] },
      { name: 'Lab Results Viewing', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [N] },
    ],
  },
  {
    label: 'Messaging & Inbox', id: 'messaging',
    features: [
      { name: 'Unified Clinical Inbox', clarity: [F], epic: [F], athena: [F], tebra: [P,'Basic'], mend: [N] },
      { name: 'Staff-to-Staff Messaging', clarity: [F], epic: [F], athena: [F], tebra: [P], mend: [N] },
      { name: 'Patient Chat (Async)', clarity: [F], epic: [F], athena: [F], tebra: [P], mend: [F] },
      { name: 'Message Routing & Triage', clarity: [F], epic: [F], athena: [F], tebra: [N], mend: [N] },
    ],
  },
  {
    label: 'Interoperability (HIE)', id: 'hie',
    features: [
      { name: 'CareEverywhere / HIE', clarity: [F,'5 networks'], epic: [F,'Industry leader'], athena: [F,'CommonWell'], tebra: [N], mend: [N] },
      { name: 'C-CDA Document Exchange', clarity: [F], epic: [F], athena: [F], tebra: [P], mend: [N] },
      { name: 'FHIR R4 API', clarity: [F], epic: [F], athena: [F], tebra: [P], mend: [N] },
      { name: 'External Record Query & Import', clarity: [F], epic: [F], athena: [F], tebra: [N], mend: [N] },
      { name: 'ONC TEFCA Compliance', clarity: [F], epic: [F], athena: [F], tebra: [N], mend: [N] },
      { name: 'HIE Consent Management', clarity: [F,'42 CFR Part 2'], epic: [F], athena: [F], tebra: [N], mend: [N] },
    ],
  },
  {
    label: 'Billing & RCM', id: 'billing',
    features: [
      { name: 'Claims Management', clarity: [F], epic: [F], athena: [F,'Best-in-class'], tebra: [F,'Core'], mend: [N] },
      { name: 'Payment Collection', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [N] },
      { name: 'Insurance Verification', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [N] },
      { name: 'Denial Management', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [N] },
      { name: 'ERA/EOB Processing', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [N] },
      { name: 'Patient Statements', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [N] },
    ],
  },
  {
    label: 'Reporting & Analytics', id: 'reporting',
    features: [
      { name: 'Clinical Analytics Dashboard', clarity: [F], epic: [F], athena: [F], tebra: [P,'Basic'], mend: [N] },
      { name: 'Operational Signals (AI)', clarity: [F,'12 AI signals'], epic: [F], athena: [P], tebra: [N], mend: [N] },
      { name: 'Care Gaps Tracking', clarity: [F], epic: [F], athena: [F], tebra: [N], mend: [N] },
      { name: 'MIPS / Quality Reporting', clarity: [F], epic: [F], athena: [F], tebra: [P], mend: [N] },
      { name: 'BTG Audit Log', clarity: [F], epic: [F], athena: [F], tebra: [N], mend: [N] },
    ],
  },
  {
    label: 'Practice Operations', id: 'operations',
    features: [
      { name: 'Multi-Location Management', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [N] },
      { name: 'Practice Marketing / Reputation', clarity: [F,'5 tabs'], epic: [N], athena: [P,'Basic'], tebra: [F,'Core'], mend: [N] },
      { name: 'Review Management + AI Replies', clarity: [F], epic: [N], athena: [N], tebra: [F], mend: [N] },
      { name: 'SEO & Web Presence', clarity: [F], epic: [N], athena: [N], tebra: [F], mend: [N] },
    ],
  },
  {
    label: 'Security & Compliance', id: 'security',
    features: [
      { name: 'Role-Based Access (RBAC)', clarity: [F,'5 roles'], epic: [F], athena: [F], tebra: [F], mend: [P,'Basic'] },
      { name: 'Break-the-Glass (BTG)', clarity: [F], epic: [F], athena: [P], tebra: [N], mend: [N] },
      { name: '2FA Login', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [F] },
      { name: 'HIPAA Compliance', clarity: [F], epic: [F], athena: [F], tebra: [F], mend: [F] },
      { name: '21st Century Cures Act', clarity: [F], epic: [F], athena: [F], tebra: [P], mend: [N] },
    ],
  },
  {
    label: 'Psychiatry-Specific', id: 'psychiatry',
    features: [
      { name: 'PHQ-9 / GAD-7 Scoring', clarity: [F], epic: [F], athena: [P,'Add-on'], tebra: [N], mend: [N] },
      { name: 'Psych-Specific Assessments', clarity: [F,'Native'], epic: [F], athena: [P], tebra: [N], mend: [P] },
      { name: 'Therapy Session Notes', clarity: [F], epic: [F], athena: [P], tebra: [N], mend: [P] },
      { name: 'Treatment Plan Builder', clarity: [F], epic: [F], athena: [P], tebra: [N], mend: [N] },
      { name: 'Therapist Role Restrictions', clarity: [F,'Enforced'], epic: [F], athena: [P], tebra: [N], mend: [N] },
    ],
  },
  {
    label: 'UX & Ease of Use', id: 'ux',
    features: [
      { name: 'Time to First Productive Use', clarity: [F,'< 1 hour'], epic: [N,'4–12 weeks'], athena: [P,'1–2 weeks'], tebra: [P,'2–5 days'], mend: [F,'< 1 hour'] },
      { name: 'Required Training Hours', clarity: [F,'0–2 hrs'], epic: [N,'20–80 hrs'], athena: [P,'8–16 hrs'], tebra: [P,'4–8 hrs'], mend: [F,'1–2 hrs'] },
      { name: 'Modern UI (Clean, Minimal)', clarity: [F,'Modern React'], epic: [N,'Legacy look'], athena: [P,'Dated'], tebra: [F,'Modern'], mend: [F,'Modern'] },
      { name: 'Dark / Light Theme', clarity: [F,'Both'], epic: [N,'Light only'], athena: [N,'Light only'], tebra: [N,'Light only'], mend: [N,'Light only'] },
      { name: 'Clicks to Open a Patient Chart', clarity: [F,'2 clicks'], epic: [P,'3–5 clicks'], athena: [P,'3–4 clicks'], tebra: [F,'2–3 clicks'], mend: [N,'N/A'] },
      { name: 'One-Click Telehealth Launch', clarity: [F,'GoTo Session'], epic: [N,'Separate app'], athena: [N,'External link'], tebra: [N], mend: [F] },
      { name: 'Responsive / Mobile PWA', clarity: [F,'Full PWA'], epic: [P,'Haiku app'], athena: [P,'Limited'], tebra: [F,'Responsive'], mend: [F,'Responsive'] },
      { name: 'Cognitive Load (Screen Complexity)', clarity: [F,'Low — clean'], epic: [N,'Very high'], athena: [P,'Medium'], tebra: [F,'Low'], mend: [F,'Low'] },
    ],
  },
];

const SYSTEM_KEYS = ['clarity', 'epic', 'athena', 'tebra', 'mend'];

function cellStyle(status) {
  if (status === F) return { color: '#16a34a', fontWeight: 700 };
  if (status === P) return { color: '#d97706', fontWeight: 600 };
  return { color: '#dc2626', fontWeight: 600 };
}

function ScoreBar({ value, max = 100, color }) {
  return (
    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${(value / max) * 100}%`, background: color, borderRadius: 99, transition: 'width 0.5s' }} />
    </div>
  );
}

export default function EHRComparison() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [highlightClarity, setHighlightClarity] = useState(true);

  const visibleCategories = activeCategory === 'all'
    ? CATEGORIES
    : CATEGORIES.filter(c => c.id === activeCategory);

  const handlePrint = () => {
    window.open('/Clarity/ehr-comparison.html', '_blank');
  };

  return (
    <div className="fade-in" style={{ padding: '24px 28px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
            🏆 EHR Competitive Analysis
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Clarity vs. Epic, athenaOne, Tebra & Mend — 61-feature comparison · Q2 2026
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={highlightClarity} onChange={e => setHighlightClarity(e.target.checked)} />
            Highlight Clarity
          </label>
          <button
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ fontSize: 13, padding: '8px 16px' }}
          >
            🖨️ Print / Export PDF
          </button>
        </div>
      </div>

      {/* Score cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {SYSTEMS.map(sys => (
          <div
            key={sys.id}
            style={{
              background: 'var(--surface)',
              border: `2px solid ${sys.id === 'clarity' && highlightClarity ? sys.color : 'var(--border)'}`,
              borderRadius: 12,
              padding: '14px 16px',
              textAlign: 'center',
              boxShadow: sys.id === 'clarity' && highlightClarity ? `0 0 0 3px ${sys.color}22` : 'none',
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 4 }}>{sys.icon}</div>
            <div style={{ fontWeight: 800, fontSize: 13, color: sys.id === 'clarity' ? sys.color : 'var(--text-primary)', marginBottom: 2 }}>{sys.name}</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: sys.color, lineHeight: 1.1 }}>{sys.score}%</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              ✅ {sys.full} · ⚠️ {sys.partial} · ❌ {sys.none}
            </div>
            <ScoreBar value={sys.score} color={sys.color} />
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
              UX Score: <strong style={{ color: sys.color }}>{sys.ux}/10</strong>
            </div>
          </div>
        ))}
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        <button
          onClick={() => setActiveCategory('all')}
          className={`btn btn-sm ${activeCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
        >
          All Categories
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`btn btn-sm ${activeCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Feature tables */}
      {visibleCategories.map(cat => (
        <div key={cat.id} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, paddingBottom: 6, borderBottom: '2px solid var(--border)' }}>
            {cat.label}
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid var(--border)', width: '32%' }}>
                    Feature
                  </th>
                  {SYSTEMS.map(sys => (
                    <th
                      key={sys.id}
                      style={{
                        textAlign: 'center', padding: '8px 6px',
                        fontSize: 11, fontWeight: 700,
                        color: sys.id === 'clarity' && highlightClarity ? sys.color : 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: 0.3,
                        borderBottom: `2px solid ${sys.id === 'clarity' && highlightClarity ? sys.color : 'var(--border)'}`,
                        background: sys.id === 'clarity' && highlightClarity ? `${sys.color}08` : 'transparent',
                        width: '13.6%',
                      }}
                    >
                      {sys.icon} {sys.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cat.features.map((feat, idx) => (
                  <tr
                    key={idx}
                    style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'var(--bg)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover, rgba(59,130,246,0.04))'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'var(--bg)'}
                  >
                    <td style={{ padding: '9px 12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {feat.name}
                    </td>
                    {SYSTEM_KEYS.map(key => {
                      const [status, note] = feat[key] || [N];
                      const isClarity = key === 'clarity';
                      return (
                        <td
                          key={key}
                          style={{
                            textAlign: 'center',
                            padding: '9px 6px',
                            background: isClarity && highlightClarity ? '#2563eb08' : 'transparent',
                            borderLeft: isClarity && highlightClarity ? '1px solid #2563eb22' : 'none',
                            borderRight: isClarity && highlightClarity ? '1px solid #2563eb22' : 'none',
                          }}
                        >
                          <div style={cellStyle(status)}>{status}</div>
                          {note && (
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap' }}>
                              {note}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Key Takeaways */}
      {(activeCategory === 'all') && (
        <>
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '16px 20px', marginTop: 8, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>🔑 Key Takeaways</h3>
            <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                ['Clarity EHR (100%)', 'Matches or exceeds Epic on every category. Uniquely combines psychiatric specialization with full-spectrum practice management, marketing, and AI-powered features.'],
                ['Epic (95%)', 'Gold standard for large health systems and interoperability, but lacks practice marketing tools, has no go-to-session telehealth quick-launch, and carries a steep learning curve.'],
                ['athenaOne (85%)', 'Excels at revenue cycle management, but falls behind on telehealth (no group sessions, no screen share), multi-language portal, and documentation tools (no sticky notes).'],
                ['Tebra (60%)', 'Strong in marketing and core billing, but zero interoperability (no HIE, FHIR, or CareEverywhere), limited clinical depth, and no psychiatric-specific features.'],
                ['Mend (25%)', 'Telehealth-only platform. No EHR, no billing/RCM, no prescribing, no interoperability. Only suitable as a supplemental telehealth add-on.'],
              ].map(([title, body]) => (
                <li key={title} style={{ fontSize: 13, lineHeight: 1.5, color: '#1e293b' }}>
                  <strong>{title}</strong> — {body}
                </li>
              ))}
            </ul>
          </div>

          {/* Competitive Advantages */}
          <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', borderRadius: 12, padding: '20px 24px' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 14 }}>💎 Clarity's Unique Competitive Advantages</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { icon: '🧠', title: 'Psychiatry-Native', body: 'Built ground-up for behavioral health with PHQ-9, GAD-7, treatment plans, and therapist role enforcement.' },
                { icon: '🤖', title: 'AI-Powered', body: 'Patient AI chat assistant, operational signals, AI review replies, and smart phrases — no competitor matches all four.' },
                { icon: '🌐', title: 'Full-Stack Platform', body: 'Only platform combining EHR + billing + telehealth + HIE + marketing + patient portal in a single product.' },
                { icon: '🌍', title: '8-Language Portal', body: 'Industry-leading multilingual patient portal: English, Spanish, French, Mandarin, Arabic, Hindi, Korean, Vietnamese.' },
              ].map(adv => (
                <div key={adv.title} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{adv.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', marginBottom: 4 }}>{adv.title}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{adv.body}</div>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 16, textAlign: 'center' }}>
            CONFIDENTIAL — Competitor data based on publicly available information as of Q2 2026. For internal strategic planning only.
          </p>
        </>
      )}
    </div>
  );
}
