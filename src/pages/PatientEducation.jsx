import React, { useState, useMemo } from 'react';

const CATEGORIES = ['Depression', 'Anxiety', 'PTSD', 'ADHD', 'Substance Use', 'Bipolar', 'Psychosis', 'Sleep', 'Grief & Loss', 'Medication', 'Wellness', 'Crisis & Safety', 'Caregiver Support', 'Child & Adolescent'];
const FORMATS = ['PDF', 'Video', 'Infographic', 'Worksheet', 'Web Link'];
const LANGUAGES = ['English', 'Spanish', 'Mandarin', 'Vietnamese', 'Korean', 'Arabic'];

const MOCK_RESOURCES = [
  { id: 'ed1', title: 'Understanding Your PHQ-9 Score', category: 'Depression', format: 'PDF', language: 'English', pages: 2, readTime: '3 min', description: 'Patient-friendly explanation of PHQ-9 depression screening scores, what they mean, and when to seek help.', lastUpdated: '2026-03-01', downloads: 142, tags: ['screening', 'PHQ-9', 'self-help'] },
  { id: 'ed2', title: 'Coping with Anxiety — Grounding Techniques', category: 'Anxiety', format: 'PDF', language: 'English', pages: 4, readTime: '5 min', description: 'Step-by-step guide to 5-4-3-2-1 grounding, box breathing, progressive muscle relaxation, and cognitive defusion.', lastUpdated: '2026-02-15', downloads: 287, tags: ['coping', 'self-help', 'CBT'] },
  { id: 'ed3', title: 'What is EMDR Therapy?', category: 'PTSD', format: 'Infographic', language: 'English', pages: 1, readTime: '2 min', description: 'Visual overview of Eye Movement Desensitization and Reprocessing therapy — what to expect in sessions.', lastUpdated: '2026-01-20', downloads: 95, tags: ['therapy', 'trauma'] },
  { id: 'ed4', title: 'ADHD Medication Guide for Adults', category: 'ADHD', format: 'PDF', language: 'English', pages: 6, readTime: '8 min', description: 'Comprehensive guide to stimulant and non-stimulant ADHD medications, side effects, and what to report to your provider.', lastUpdated: '2026-03-10', downloads: 198, tags: ['medication', 'stimulants', 'safety'] },
  { id: 'ed5', title: 'Naloxone (Narcan) — How to Save a Life', category: 'Substance Use', format: 'Infographic', language: 'English', pages: 1, readTime: '2 min', description: 'Visual guide on recognizing opioid overdose and administering intranasal naloxone.', lastUpdated: '2026-02-01', downloads: 76, tags: ['harm reduction', 'opioids', 'safety'] },
  { id: 'ed6', title: 'Entendiendo su Puntaje de PHQ-9', category: 'Depression', format: 'PDF', language: 'Spanish', pages: 2, readTime: '3 min', description: 'Spanish-language version of PHQ-9 score interpretation guide.', lastUpdated: '2026-03-01', downloads: 54, tags: ['screening', 'PHQ-9', 'Spanish'] },
  { id: 'ed7', title: 'Sleep Hygiene — 10 Rules for Better Sleep', category: 'Sleep', format: 'PDF', language: 'English', pages: 2, readTime: '4 min', description: 'Evidence-based sleep hygiene practices for patients with insomnia or disrupted sleep patterns.', lastUpdated: '2026-01-15', downloads: 312, tags: ['insomnia', 'self-help', 'wellness'] },
  { id: 'ed8', title: 'My Safety Plan Template', category: 'Crisis & Safety', format: 'Worksheet', language: 'English', pages: 1, readTime: '10 min', description: 'Fillable safety plan worksheet based on the Stanley-Brown Safety Planning Intervention. For patients with suicidal ideation.', lastUpdated: '2026-04-01', downloads: 167, tags: ['safety plan', 'suicide prevention', 'C-SSRS'] },
  { id: 'ed9', title: 'Bipolar Disorder — Mood Tracking Journal', category: 'Bipolar', format: 'Worksheet', language: 'English', pages: 4, readTime: '5 min', description: 'Daily mood tracking worksheet with sleep, medication adherence, and energy level columns.', lastUpdated: '2026-02-20', downloads: 89, tags: ['mood tracking', 'self-monitoring'] },
  { id: 'ed10', title: 'CBT Thought Record Worksheet', category: 'Anxiety', format: 'Worksheet', language: 'English', pages: 2, readTime: '10 min', description: 'Cognitive Behavioral Therapy thought record for identifying automatic thoughts, cognitive distortions, and balanced alternatives.', lastUpdated: '2026-03-15', downloads: 245, tags: ['CBT', 'worksheet', 'cognitive'] },
  { id: 'ed11', title: 'Supporting a Loved One with Depression', category: 'Caregiver Support', format: 'PDF', language: 'English', pages: 3, readTime: '5 min', description: 'Guide for family members and caregivers on how to support someone experiencing depression.', lastUpdated: '2026-02-10', downloads: 118, tags: ['family', 'support', 'caregiver'] },
  { id: 'ed12', title: 'Mindfulness Meditation — Getting Started', category: 'Wellness', format: 'Video', language: 'English', pages: 0, readTime: '12 min', description: '12-minute guided mindfulness meditation video for beginners. Includes body scan and breathing exercises.', lastUpdated: '2026-01-30', downloads: 203, tags: ['mindfulness', 'meditation', 'video'] },
];

export default function PatientEducation() {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [filterFmt, setFilterFmt] = useState('All');
  const [filterLang, setFilterLang] = useState('All');
  const [selectedRes, setSelectedRes] = useState(null);
  const [sendPatient, setSendPatient] = useState('');
  const [showSend, setShowSend] = useState(false);

  const filtered = useMemo(() => {
    let list = [...MOCK_RESOURCES];
    if (filterCat !== 'All') list = list.filter(r => r.category === filterCat);
    if (filterFmt !== 'All') list = list.filter(r => r.format === filterFmt);
    if (filterLang !== 'All') list = list.filter(r => r.language === filterLang);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.tags.some(t => t.includes(q)));
    }
    return list;
  }, [search, filterCat, filterFmt, filterLang]);

  const fmtIcon = { PDF: '📄', Video: '🎬', Infographic: '📊', Worksheet: '📝', 'Web Link': '🔗' };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>📚 Patient Education Library</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Browse, send, and print educational resources for patients and caregivers</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => alert('📤 Upload custom handout...')}>📤 Upload Resource</button>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '📚', val: MOCK_RESOURCES.length, label: 'Total Resources' },
          { icon: '📄', val: MOCK_RESOURCES.filter(r => r.format === 'PDF').length, label: 'PDFs' },
          { icon: '📝', val: MOCK_RESOURCES.filter(r => r.format === 'Worksheet').length, label: 'Worksheets' },
          { icon: '🌐', val: [...new Set(MOCK_RESOURCES.map(r => r.language))].length, label: 'Languages' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{s.icon}</div>
            <div><div style={{ fontSize: 18, fontWeight: 800 }}>{s.val}</div><div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="form-input" placeholder="Search resources, topics, tags..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, fontSize: 13 }} />
        <select className="form-input" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width: 150, fontSize: 12 }}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="form-input" value={filterFmt} onChange={e => setFilterFmt(e.target.value)} style={{ width: 130, fontSize: 12 }}>
          <option value="All">All Formats</option>
          {FORMATS.map(f => <option key={f}>{f}</option>)}
        </select>
        <select className="form-input" value={filterLang} onChange={e => setFilterLang(e.target.value)} style={{ width: 130, fontSize: 12 }}>
          <option value="All">All Languages</option>
          {LANGUAGES.map(l => <option key={l}>{l}</option>)}
        </select>
      </div>

      {/* Resource Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedRes ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 12 }}>
        {!selectedRes && filtered.map(r => (
          <div key={r.id} onClick={() => setSelectedRes(r)}
            style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 18, cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 24 }}>{fmtIcon[r.format] || '📄'}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#e0e7ff', color: '#3730a3' }}>{r.category}</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4, lineHeight: 1.3 }}>{r.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description}</div>
            <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--text-muted)' }}>
              <span>{r.format}</span>
              <span>·</span>
              <span>{r.readTime}</span>
              <span>·</span>
              <span>🌐 {r.language}</span>
              <span>·</span>
              <span>📥 {r.downloads}</span>
            </div>
          </div>
        ))}

        {selectedRes && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(r => (
                <div key={r.id} onClick={() => setSelectedRes(r)}
                  style={{ background: '#fff', borderRadius: 12, border: `1px solid ${selectedRes.id === r.id ? 'var(--primary)' : 'var(--border)'}`, padding: '12px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 18 }}>{fmtIcon[r.format]}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>{r.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.category} · {r.format} · {r.language}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, #4f46e5, #3730a3)', color: '#fff' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{fmtIcon[selectedRes.format]}</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{selectedRes.title}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{selectedRes.category} · {selectedRes.format} · {selectedRes.language}</div>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 16, color: 'var(--text-secondary)' }}>{selectedRes.description}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  {[
                    ['Format', selectedRes.format],
                    ['Read Time', selectedRes.readTime],
                    ['Pages', selectedRes.pages || 'N/A'],
                    ['Language', selectedRes.language],
                    ['Last Updated', selectedRes.lastUpdated],
                    ['Downloads', selectedRes.downloads],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{k}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Tags</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {selectedRes.tags.map(t => (
                      <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>#{t}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => { setShowSend(true); }}>📧 Send to Patient</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => alert('🖨️ Printing resource...')}>🖨️ Print</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => alert('📥 Downloading...')}>📥 Download</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedRes(null)}>← Back</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Send Modal */}
      {showSend && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowSend(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>📧 Send to Patient</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>{selectedRes?.title}</div>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Patient Name</label>
                <input className="form-input" value={sendPatient} onChange={e => setSendPatient(e.target.value)} placeholder="e.g., James Anderson" />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { alert('📧 Sent via Patient Portal'); setShowSend(false); }}>📱 Portal</button>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { alert('📧 Sent via Email'); setShowSend(false); }}>📧 Email</button>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { alert('📱 Sent via Text'); setShowSend(false); }}>💬 Text</button>
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowSend(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
