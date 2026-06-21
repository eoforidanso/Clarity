import React, { useState, useMemo, useEffect } from 'react';
import { educationResources as educationResourcesApi } from '../services/api';

const CATEGORIES = ['Depression', 'Anxiety', 'PTSD', 'ADHD', 'Substance Use', 'Bipolar', 'Psychosis', 'Sleep', 'Grief & Loss', 'Medication', 'Wellness', 'Crisis & Safety', 'Caregiver Support', 'Child & Adolescent'];
const FORMATS = ['PDF', 'Video', 'Infographic', 'Worksheet', 'Web Link'];
const LANGUAGES = ['English', 'Spanish', 'Mandarin', 'Vietnamese', 'Korean', 'Arabic'];


export default function PatientEducation() {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [filterFmt, setFilterFmt] = useState('All');
  const [filterLang, setFilterLang] = useState('All');
  const [selectedRes, setSelectedRes] = useState(null);
  const [sendPatient, setSendPatient] = useState('');
  const [showSend, setShowSend] = useState(false);
  const [sentMethod, setSentMethod] = useState(null); // 'portal' | 'email' | 'text'
  const uploadRef = React.useRef(null);
  const [uploadedName, setUploadedName] = useState(null);

  const [resources, setResources] = useState([]);

  useEffect(() => {
    educationResourcesApi.list().then(data => {
      if (Array.isArray(data)) setResources(data);
    }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let list = [...resources];
    if (filterCat !== 'All') list = list.filter(r => r.category === filterCat);
    if (filterFmt !== 'All') list = list.filter(r => r.format === filterFmt);
    if (filterLang !== 'All') list = list.filter(r => r.language === filterLang);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || (r.tags || []).some(t => t.toLowerCase().includes(q)));
    }
    return list;
  }, [resources, search, filterCat, filterFmt, filterLang]);

  const fmtIcon = { PDF: '📄', Video: '🎬', Infographic: '📊', Worksheet: '📝', 'Web Link': '🔗' };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>📚 Patient Education Library</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Browse, send, and print educational resources for patients and caregivers</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <>
            <input ref={uploadRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) setUploadedName(e.target.files[0].name); }} />
            <button className="btn btn-secondary" onClick={() => uploadRef.current?.click()}>
              {uploadedName ? `✅ ${uploadedName}` : '📤 Upload Resource'}
            </button>
          </>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '📚', val: resources.length, label: 'Total Resources' },
          { icon: '📄', val: resources.filter(r => r.format === 'PDF').length, label: 'PDFs' },
          { icon: '📝', val: resources.filter(r => r.format === 'Worksheet').length, label: 'Worksheets' },
          { icon: '🌐', val: [...new Set(resources.map(r => r.language))].length, label: 'Languages' },
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
                  <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>🖨️ Print</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { const blob = new Blob([`${selectedRes.title}\n\n${selectedRes.description}\n\nTags: ${selectedRes.tags.join(', ')}\nFormat: ${selectedRes.format} | Language: ${selectedRes.language} | Updated: ${selectedRes.lastUpdated}`], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${selectedRes.title.replace(/\s+/g, '_')}.txt`; a.click(); URL.revokeObjectURL(url); }}>📥 Download</button>
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
                {sentMethod ? (
                  <div style={{ width: '100%', padding: '10px 14px', background: '#dcfce7', color: '#166534', borderRadius: 8, fontWeight: 700, fontSize: 13, textAlign: 'center' }}>
                    ✅ Sent via {sentMethod === 'portal' ? 'Patient Portal' : sentMethod === 'email' ? 'Email' : 'Text Message'}
                  </div>
                ) : (
                  <>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { setSentMethod('portal'); setTimeout(() => { setSentMethod(null); setShowSend(false); }, 1500); }}>📱 Portal</button>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { setSentMethod('email'); setTimeout(() => { setSentMethod(null); setShowSend(false); }, 1500); }}>📧 Email</button>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { setSentMethod('text'); setTimeout(() => { setSentMethod(null); setShowSend(false); }, 1500); }}>💬 Text</button>
                  </>
                )}
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
