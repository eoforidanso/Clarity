import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

const NOTE_TYPES = ['Sticky Note', 'Provider-Only Note', 'Care Coordination Note', 'Safety Alert', 'Front Desk Note', 'Billing Note'];
const VISIBILITY = ['All Staff', 'Prescribers Only', 'My Eyes Only', 'Clinical Staff Only', 'Admin Only'];
const COLORS = [
  { id: 'yellow', bg: '#fef3c7', border: '#fde68a', text: '#92400e' },
  { id: 'blue',   bg: '#dbeafe', border: '#bfdbfe', text: '#1e40af' },
  { id: 'green',  bg: '#dcfce7', border: '#bbf7d0', text: '#166534' },
  { id: 'pink',   bg: '#fce7f3', border: '#fbcfe8', text: '#9d174d' },
  { id: 'red',    bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
  { id: 'purple', bg: '#f3e8ff', border: '#d8b4fe', text: '#6b21a8' },
];

const MOCK_NOTES = [
  { id: 'sn1', patientName: 'James Anderson', mrn: 'MRN-001', type: 'Safety Alert', content: '⚠️ Patient has hx of passive SI. Always administer C-SSRS at every visit. Safety plan on file — updated 3/18/2026.', color: 'red', visibility: 'Clinical Staff Only', author: 'Dr. Chris Lee', createdDate: '2026-03-18', pinned: true, expiresDate: '' },
  { id: 'sn2', patientName: 'James Anderson', mrn: 'MRN-001', type: 'Provider-Only Note', content: 'Patient disclosed DV situation at home during 4/1 session. Exploring safety planning. DO NOT discuss with anyone other than treating providers.', color: 'pink', visibility: 'Prescribers Only', author: 'April Torres, LCSW', createdDate: '2026-04-01', pinned: true, expiresDate: '' },
  { id: 'sn3', patientName: 'Maria Garcia', mrn: 'MRN-002', type: 'Sticky Note', content: 'Patient prefers morning appointments only. Gets anxious in waiting room — allow to wait in car and text when ready.', color: 'yellow', visibility: 'All Staff', author: 'Nurse Kelly', createdDate: '2026-03-10', pinned: false, expiresDate: '' },
  { id: 'sn4', patientName: 'Robert Chen', mrn: 'MRN-003', type: 'Care Coordination Note', content: 'PCP Dr. Amanda Liu faxed updated records 4/8. Pharmacy history shows gap in SSRI fills Dec 2025 — Feb 2026. Discuss medication adherence.', color: 'blue', visibility: 'Clinical Staff Only', author: 'Dr. Chris Lee', createdDate: '2026-04-08', pinned: false, expiresDate: '' },
  { id: 'sn5', patientName: 'Ashley Kim', mrn: 'MRN-004', type: 'Front Desk Note', content: 'Patient has outstanding balance of $245. Discussed payment plan at last visit. Follow up at next check-in.', color: 'purple', visibility: 'All Staff', author: 'Front Desk Staff', createdDate: '2026-04-05', pinned: false, expiresDate: '2026-05-05' },
  { id: 'sn6', patientName: 'Dorothy Wilson', mrn: 'MRN-005', type: 'Safety Alert', content: '🚨 Patient on Warfarin (managed by cardiologist). Check INR before starting any new psychiatric medications. Avoid: Fluoxetine, Fluvoxamine, Valproate.', color: 'red', visibility: 'Prescribers Only', author: 'Dr. Chris Lee', createdDate: '2026-04-12', pinned: true, expiresDate: '' },
  { id: 'sn7', patientName: 'Brian Foster', mrn: 'MRN-007', type: 'Billing Note', content: 'Insurance changed from Cigna to UHC effective 4/1/2026. New member ID: UHC-889102. Eligibility verified 4/10.', color: 'green', visibility: 'Admin Only', author: 'Front Desk Staff', createdDate: '2026-04-10', pinned: false, expiresDate: '' },
];

export default function SecureNotes() {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState(MOCK_NOTES);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterVisibility, setFilterVisibility] = useState('All');
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ patientName: '', type: 'Sticky Note', content: '', color: 'yellow', visibility: 'All Staff', pinned: false, expiresDate: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const filtered = useMemo(() => {
    let list = [...notes];
    if (filterType !== 'All') list = list.filter(n => n.type === filterType);
    if (filterVisibility !== 'All') list = list.filter(n => n.visibility === filterVisibility);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(n => n.patientName.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdDate) - new Date(a.createdDate);
    });
  }, [notes, search, filterType, filterVisibility]);

  const addNote = () => {
    if (!newForm.patientName.trim() || !newForm.content.trim()) return;
    setNotes(prev => [{
      id: `sn-${Date.now()}`, ...newForm, mrn: 'MRN-XXX',
      author: `${currentUser?.firstName} ${currentUser?.lastName}`,
      createdDate: new Date().toISOString().slice(0, 10),
    }, ...prev]);
    setShowNew(false);
    setNewForm({ patientName: '', type: 'Sticky Note', content: '', color: 'yellow', visibility: 'All Staff', pinned: false, expiresDate: '' });
  };

  const togglePin = (id) => setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  const deleteNote = (id) => setNotes(prev => prev.filter(n => n.id !== id));

  const startEdit = (note) => {
    setEditingId(note.id);
    setEditForm({ type: note.type, content: note.content, color: note.color, visibility: note.visibility, pinned: note.pinned, expiresDate: note.expiresDate || '' });
  };

  const saveEdit = (id) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...editForm } : n));
    setEditingId(null);
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>📌 Secure Internal Notes</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Confidential sticky notes, safety alerts, and provider-only annotations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>➕ New Note</button>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="form-input" placeholder="Search patients or note content..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, fontSize: 13 }} />
        <select className="form-input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 160, fontSize: 12 }}>
          <option value="All">All Types</option>
          {NOTE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select className="form-input" value={filterVisibility} onChange={e => setFilterVisibility(e.target.value)} style={{ width: 160, fontSize: 12 }}>
          <option value="All">All Visibility</option>
          {VISIBILITY.map(v => <option key={v}>{v}</option>)}
        </select>
      </div>

      {/* Notes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {filtered.map(note => {
          const isEditing = editingId === note.id;
          const displayColor = isEditing ? editForm.color : note.color;
          const clr = COLORS.find(c => c.id === displayColor) || COLORS[0];
          return (
            <div key={note.id} style={{ background: clr.bg, borderRadius: 14, border: `2px solid ${isEditing ? clr.text : clr.border}`, padding: 18, position: 'relative', transition: 'border-color 0.2s', minHeight: 140 }}>
              {/* Pin indicator (when not editing) */}
              {!isEditing && note.pinned && <span style={{ position: 'absolute', top: 8, right: 10, fontSize: 14 }}>📌</span>}

              {isEditing ? (
                /* ── Edit mode ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: clr.text, textTransform: 'uppercase', marginBottom: 3 }}>Type</div>
                      <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                        style={{ width: '100%', fontSize: 11, padding: '4px 6px', borderRadius: 6, border: `1px solid ${clr.border}`, background: 'rgba(255,255,255,0.7)', color: clr.text }}>
                        {NOTE_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: clr.text, textTransform: 'uppercase', marginBottom: 3 }}>Visibility</div>
                      <select value={editForm.visibility} onChange={e => setEditForm(f => ({ ...f, visibility: e.target.value }))}
                        style={{ width: '100%', fontSize: 11, padding: '4px 6px', borderRadius: 6, border: `1px solid ${clr.border}`, background: 'rgba(255,255,255,0.7)', color: clr.text }}>
                        {VISIBILITY.map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: clr.text, textTransform: 'uppercase', marginBottom: 3 }}>Color</div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {COLORS.map(c => (
                        <div key={c.id} onClick={() => setEditForm(f => ({ ...f, color: c.id }))}
                          style={{ width: 22, height: 22, borderRadius: 6, background: c.bg, border: `2px solid ${editForm.color === c.id ? c.text : c.border}`, cursor: 'pointer' }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: clr.text, textTransform: 'uppercase', marginBottom: 3 }}>Content</div>
                    <textarea value={editForm.content} onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))} rows={4}
                      style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 8, border: `1px solid ${clr.border}`, background: 'rgba(255,255,255,0.7)', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, color: clr.text, boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, cursor: 'pointer', color: clr.text }}>
                      <input type="checkbox" checked={editForm.pinned} onChange={e => setEditForm(f => ({ ...f, pinned: e.target.checked }))}
                        style={{ accentColor: clr.text }} /> 📌 Pinned
                    </label>
                    <input type="date" value={editForm.expiresDate} onChange={e => setEditForm(f => ({ ...f, expiresDate: e.target.value }))}
                      style={{ fontSize: 10, padding: '3px 6px', borderRadius: 6, border: `1px solid ${clr.border}`, background: 'rgba(255,255,255,0.7)', color: clr.text }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 2 }}>
                    <button onClick={() => setEditingId(null)}
                      style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${clr.border}`, background: 'rgba(255,255,255,0.5)', fontSize: 11, cursor: 'pointer', color: clr.text, fontWeight: 600 }}>✕ Cancel</button>
                    <button onClick={() => saveEdit(note.id)}
                      style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: clr.text, color: clr.bg, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>💾 Save</button>
                  </div>
                </div>
              ) : (
                /* ── Display mode ── */
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: clr.text }}>{note.patientName}</div>
                      <div style={{ fontSize: 10, color: clr.text, opacity: 0.7 }}>{note.mrn}</div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.6)', color: clr.text }}>{note.type}</span>
                  </div>

                  <div style={{ fontSize: 12, lineHeight: 1.6, color: clr.text, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{note.content}</div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: 10, color: clr.text, opacity: 0.6 }}>{note.author} · {note.createdDate}</div>
                      <div style={{ fontSize: 9, color: clr.text, opacity: 0.5, marginTop: 1 }}>👁 {note.visibility}{note.expiresDate ? ` · Expires: ${note.expiresDate}` : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => startEdit(note)} style={{ background: 'rgba(255,255,255,0.5)', border: 'none', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', fontSize: 11 }} title="Edit">✏️</button>
                      <button onClick={() => togglePin(note.id)} style={{ background: 'rgba(255,255,255,0.5)', border: 'none', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', fontSize: 11 }} title="Toggle Pin">
                        {note.pinned ? '📌' : '📎'}
                      </button>
                      <button onClick={() => deleteNote(note.id)} style={{ background: 'rgba(255,255,255,0.5)', border: 'none', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', fontSize: 11 }} title="Delete">🗑️</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* New Note Modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowNew(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #d97706, #b45309)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>📌 New Secure Note</div>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Patient Name</label>
                <input className="form-input" value={newForm.patientName} onChange={e => setNewForm(f => ({ ...f, patientName: e.target.value }))} placeholder="e.g., James Anderson" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Note Type</label>
                  <select className="form-input" value={newForm.type} onChange={e => setNewForm(f => ({ ...f, type: e.target.value }))}>
                    {NOTE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Visibility</label>
                  <select className="form-input" value={newForm.visibility} onChange={e => setNewForm(f => ({ ...f, visibility: e.target.value }))}>
                    {VISIBILITY.map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Note Color</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {COLORS.map(c => (
                    <div key={c.id} onClick={() => setNewForm(f => ({ ...f, color: c.id }))}
                      style={{ width: 28, height: 28, borderRadius: 8, background: c.bg, border: `2px solid ${newForm.color === c.id ? c.text : c.border}`, cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Content</label>
                <textarea className="form-textarea" rows={4} value={newForm.content} onChange={e => setNewForm(f => ({ ...f, content: e.target.value }))} placeholder="Write your note here..." />
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={newForm.pinned} onChange={e => setNewForm(f => ({ ...f, pinned: e.target.checked }))} /> 📌 Pin to top
                </label>
                <div style={{ flex: 1 }}>
                  <input type="date" className="form-input" value={newForm.expiresDate} onChange={e => setNewForm(f => ({ ...f, expiresDate: e.target.value }))} style={{ fontSize: 11 }} placeholder="Expires (optional)" />
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addNote}>📌 Create Note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
