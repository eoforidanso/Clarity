import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

/* ─── Mock Group Sessions ─────────────────────────────────── */
const MOCK_GROUP_SESSIONS = [
  { id: 'gs1', name: 'DBT Skills Group — Distress Tolerance', type: 'DBT Skills', host: 'April Torres, LCSW', hostId: 'u8', date: '2026-04-15', time: '10:00 AM', duration: 90, maxParticipants: 8, participants: ['p1', 'p2', 'p4', 'p6'], status: 'scheduled', recurring: 'Weekly — Tuesdays', room: 'group-dbt-001', notes: 'Module 4: TIPP skills and radical acceptance', waitlist: ['p5'] },
  { id: 'gs2', name: 'Medication Management Group', type: 'Med Management', host: 'Dr. Chris L.', hostId: 'u1', date: '2026-04-15', time: '2:00 PM', duration: 60, maxParticipants: 6, participants: ['p3', 'p5', 'p7'], status: 'scheduled', recurring: 'Biweekly — Tuesdays', room: 'group-med-002', notes: 'Topic: Managing side effects and adherence strategies', waitlist: [] },
  { id: 'gs3', name: 'Anxiety & Coping Support Group', type: 'Support Group', host: 'April Torres, LCSW', hostId: 'u8', date: '2026-04-16', time: '11:00 AM', duration: 75, maxParticipants: 10, participants: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], status: 'scheduled', recurring: 'Weekly — Wednesdays', room: 'group-anx-003', notes: 'Open discussion + grounding techniques practice', waitlist: ['p7', 'p8'] },
  { id: 'gs4', name: 'Trauma Processing Group (CPT)', type: 'Trauma', host: 'April Torres, LCSW', hostId: 'u8', date: '2026-04-14', time: '3:00 PM', duration: 90, maxParticipants: 6, participants: ['p2', 'p4', 'p6', 'p8'], status: 'completed', recurring: 'Weekly — Mondays', room: 'group-cpt-004', notes: 'Session 8: Challenging stuck points', waitlist: [] },
  { id: 'gs5', name: 'Substance Use Recovery Group', type: 'Recovery', host: 'Dr. Chris L.', hostId: 'u1', date: '2026-04-17', time: '9:00 AM', duration: 60, maxParticipants: 12, participants: ['p3', 'p5', 'p7', 'p9', 'p10'], status: 'scheduled', recurring: 'Weekly — Thursdays', room: 'group-sud-005', notes: 'Relapse prevention strategies — motivational interviewing', waitlist: [] },
  { id: 'gs6', name: 'Mindfulness & Meditation', type: 'Wellness', host: 'April Torres, LCSW', hostId: 'u8', date: '2026-04-13', time: '4:00 PM', duration: 45, maxParticipants: 15, participants: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'], status: 'completed', recurring: 'Weekly — Sundays', room: 'group-mind-006', notes: 'Body scan meditation + journaling', waitlist: [] },
];

const MOCK_PATIENTS = [
  { id: 'p1', name: 'James Anderson' }, { id: 'p2', name: 'Maria Garcia' }, { id: 'p3', name: 'Robert Chen' },
  { id: 'p4', name: 'Ashley Kim' }, { id: 'p5', name: 'Dorothy Wilson' }, { id: 'p6', name: 'Marcus Brown' },
  { id: 'p7', name: 'Sarah Johnson' }, { id: 'p8', name: 'Kevin Lee' }, { id: 'p9', name: 'Lisa Park' }, { id: 'p10', name: 'David Nguyen' },
];

const GROUP_TYPES = ['DBT Skills', 'Support Group', 'Med Management', 'Trauma', 'Recovery', 'Wellness', 'Psychoeducation', 'Family'];

const pName = (id) => MOCK_PATIENTS.find(p => p.id === id)?.name || id;

export default function GroupTelehealth() {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState(MOCK_GROUP_SESSIONS);
  const [view, setView] = useState('list'); // list | create | active
  const [activeSession, setActiveSession] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newSession, setNewSession] = useState({ name: '', type: 'Support Group', date: '2026-04-18', time: '10:00', duration: 60, maxParticipants: 8, recurring: 'None', notes: '', participants: [] });
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [participantSearch, setParticipantSearch] = useState('');
  const [sessionTimer, setSessionTimer] = useState(0);
  const timerRef = useRef(null);

  // Timer for active session
  useEffect(() => {
    if (activeSession && activeSession.status === 'in-progress') {
      timerRef.current = setInterval(() => setSessionTimer(t => t + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [activeSession]);

  const formatTimer = (s) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const filtered = sessions.filter(s => {
    if (filter === 'today') return s.date === '2026-04-15';
    if (filter === 'upcoming') return s.date >= '2026-04-15' && s.status === 'scheduled';
    if (filter === 'completed') return s.status === 'completed';
    return true;
  });

  const handleCreateSession = () => {
    const id = `gs${Date.now()}`;
    setSessions(prev => [...prev, { ...newSession, id, host: `${currentUser.firstName} ${currentUser.lastName}`, hostId: currentUser.id, status: 'scheduled', room: `group-${id}`, waitlist: [] }]);
    setShowCreate(false);
    setNewSession({ name: '', type: 'Support Group', date: '2026-04-18', time: '10:00', duration: 60, maxParticipants: 8, recurring: 'None', notes: '', participants: [] });
  };

  const startSession = (session) => {
    setActiveSession({ ...session, status: 'in-progress' });
    setSessionTimer(0);
    setChatMessages([{ from: 'system', text: `Group session "${session.name}" started. ${session.participants.length} participants connected.`, time: new Date().toLocaleTimeString() }]);
    setView('active');
  };

  const endSession = () => {
    setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, status: 'completed' } : s));
    clearInterval(timerRef.current);
    setActiveSession(null);
    setView('list');
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { from: currentUser.firstName, text: chatInput, time: new Date().toLocaleTimeString() }]);
    setChatInput('');
  };

  const statusBadge = (status) => {
    const colors = { scheduled: '#3b82f6', 'in-progress': '#10b981', completed: '#64748b', cancelled: '#ef4444' };
    return <span style={{ background: `${colors[status]}18`, color: colors[status], padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{status}</span>;
  };

  /* ─── Active Session View ─── */
  if (view === 'active' && activeSession) {
    return (
      <div style={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Session Header */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', color: '#fff', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>📹 {activeSession.name}</h2>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>Host: {activeSession.host} · {activeSession.type} · {activeSession.duration} min</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ background: '#ef444420', color: '#f87171', padding: '6px 14px', borderRadius: 8, fontSize: 14, fontWeight: 800, fontFamily: 'monospace' }}>
              🔴 LIVE · {formatTimer(sessionTimer)}
            </div>
            <button onClick={endSession} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 700, cursor: 'pointer' }}>
              End Session
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Video Grid */}
          <div style={{ flex: 1, padding: 20, display: 'grid', gridTemplateColumns: `repeat(${Math.min(activeSession.participants.length + 1, 3)}, 1fr)`, gap: 12, background: '#0f172a', overflow: 'auto' }}>
            {/* Host */}
            <div style={{ background: '#1e293b', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180, border: '2px solid #3b82f6', position: 'relative' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', fontWeight: 800 }}>
                {activeSession.host.split(' ').map(n => n[0]).join('')}
              </div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginTop: 8 }}>{activeSession.host}</div>
              <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>HOST</div>
              <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                <span style={{ fontSize: 14 }}>🎤</span>
                <span style={{ fontSize: 14 }}>📷</span>
              </div>
            </div>
            {/* Participants */}
            {activeSession.participants.map(pid => (
              <div key={pid} style={{ background: '#1e293b', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180, position: 'relative' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', fontWeight: 800 }}>
                  {pName(pid).split(' ').map(n => n[0]).join('')}
                </div>
                <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, marginTop: 6 }}>{pName(pid)}</div>
                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: 12 }}>🎤</span>
                  <span style={{ fontSize: 12 }}>📷</span>
                </div>
                <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
                  <span style={{ background: '#10b98130', color: '#10b981', padding: '1px 8px', borderRadius: 99, fontSize: 9, fontWeight: 700 }}>CONNECTED</span>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar: Chat + Controls */}
          <div style={{ width: 320, borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#fff' }}>
            {/* Participant List */}
            <div style={{ padding: 12, borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>👥 Participants ({activeSession.participants.length + 1})</div>
              <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>🔵 {activeSession.host} (Host)</div>
              {activeSession.participants.map(pid => (
                <div key={pid} style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>🟢 {pName(pid)}</div>
              ))}
            </div>

            {/* Session Controls */}
            <div style={{ padding: 12, borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button className="btn btn-sm btn-secondary" title="Mute All">🔇 Mute All</button>
              <button className="btn btn-sm btn-secondary" title="Screen Share">🖥️ Share</button>
              <button className="btn btn-sm btn-secondary" title="Whiteboard">✏️ Board</button>
              <button className="btn btn-sm btn-secondary" title="Record">⏺️ Record</button>
              <button className="btn btn-sm btn-secondary" title="Breakout Rooms">🚪 Breakout</button>
              <button className="btn btn-sm btn-secondary" title="Hand Raise">✋ Hands</button>
            </div>

            {/* Group Chat */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '8px 12px', fontWeight: 700, fontSize: 12, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>💬 Group Chat</div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ marginBottom: 8, fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: m.from === 'system' ? '#8b5cf6' : '#1e40af' }}>{m.from === 'system' ? '🔔 System' : m.from}: </span>
                    <span style={{ color: '#334155' }}>{m.text}</span>
                    <span style={{ color: '#94a3b8', fontSize: 9, marginLeft: 6 }}>{m.time}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', padding: 8, borderTop: '1px solid #e2e8f0', gap: 6 }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Type a message…" style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', fontSize: 12 }} />
                <button onClick={sendChat} className="btn btn-sm btn-primary">Send</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── List View ─── */
  return (
    <div className="page-padding">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>📹 Group Telehealth</h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>Schedule and manage group video therapy sessions</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary">
          ➕ New Group Session
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Active Groups', value: sessions.filter(s => s.status === 'scheduled').length, icon: '📹', color: '#3b82f6' },
          { label: "Today's Sessions", value: sessions.filter(s => s.date === '2026-04-15').length, icon: '📅', color: '#10b981' },
          { label: 'Total Participants', value: sessions.reduce((a, s) => a + s.participants.length, 0), icon: '👥', color: '#8b5cf6' },
          { label: 'Avg Group Size', value: (sessions.reduce((a, s) => a + s.participants.length, 0) / sessions.length).toFixed(1), icon: '📊', color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all', 'today', 'upcoming', 'completed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} style={{ textTransform: 'capitalize' }}>
            {f === 'all' ? 'All Sessions' : f === 'today' ? "Today's" : f}
          </button>
        ))}
      </div>

      {/* Session Cards */}
      <div style={{ display: 'grid', gap: 12 }}>
        {filtered.map(session => (
          <div key={session.id} className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{session.name}</h3>
                  {statusBadge(session.status)}
                  <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, color: '#475569' }}>{session.type}</span>
                </div>
                <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                  <span>👩‍⚕️ {session.host}</span>
                  <span>📅 {session.date} at {session.time}</span>
                  <span>⏱️ {session.duration} min</span>
                  <span>🔁 {session.recurring}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>👥 {session.participants.length}/{session.maxParticipants}</span>
                  <div style={{ flex: 1, maxWidth: 200, height: 6, background: '#f1f5f9', borderRadius: 99 }}>
                    <div style={{ width: `${(session.participants.length / session.maxParticipants) * 100}%`, height: '100%', background: session.participants.length >= session.maxParticipants ? '#ef4444' : '#10b981', borderRadius: 99, transition: 'width 0.3s' }} />
                  </div>
                  {session.waitlist.length > 0 && <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>⏳ {session.waitlist.length} waitlisted</span>}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {session.participants.map(pid => (
                    <span key={pid} style={{ background: '#eff6ff', color: '#1e40af', padding: '1px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600 }}>{pName(pid)}</span>
                  ))}
                </div>
                {session.notes && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, fontStyle: 'italic' }}>📝 {session.notes}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 16 }}>
                {session.status === 'scheduled' && (
                  <>
                    <button onClick={() => startSession(session)} className="btn btn-sm btn-primary">▶️ Start</button>
                    <button className="btn btn-sm btn-secondary">✏️ Edit</button>
                    <button onClick={() => {
                      const link = `https://telehealth.clarity.health/group/${session.room}`;
                      navigator.clipboard?.writeText(link);
                      alert(`Link copied: ${link}`);
                    }} className="btn btn-sm btn-secondary">🔗 Copy Link</button>
                  </>
                )}
                {session.status === 'completed' && (
                  <button className="btn btn-sm btn-secondary">📄 View Notes</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📹</div>
            <div style={{ fontWeight: 700 }}>No group sessions found</div>
          </div>
        )}
      </div>

      {/* ─── Create Modal ─── */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowCreate(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, width: 520, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800 }}>📹 New Group Session</h2>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Session Name *</label>
                <input value={newSession.name} onChange={e => setNewSession(p => ({ ...p, name: e.target.value }))} className="form-input" placeholder="e.g., DBT Skills — Emotion Regulation" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Group Type</label>
                  <select value={newSession.type} onChange={e => setNewSession(p => ({ ...p, type: e.target.value }))} className="form-input">
                    {GROUP_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Max Participants</label>
                  <input type="number" value={newSession.maxParticipants} onChange={e => setNewSession(p => ({ ...p, maxParticipants: +e.target.value }))} className="form-input" min={2} max={50} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Date</label>
                  <input type="date" value={newSession.date} onChange={e => setNewSession(p => ({ ...p, date: e.target.value }))} className="form-input" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Time</label>
                  <input type="time" value={newSession.time} onChange={e => setNewSession(p => ({ ...p, time: e.target.value }))} className="form-input" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Duration (min)</label>
                  <input type="number" value={newSession.duration} onChange={e => setNewSession(p => ({ ...p, duration: +e.target.value }))} className="form-input" min={15} step={15} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Recurring</label>
                <select value={newSession.recurring} onChange={e => setNewSession(p => ({ ...p, recurring: e.target.value }))} className="form-input">
                  {['None', 'Weekly', 'Biweekly', 'Monthly'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Add Participants</label>
                <input value={participantSearch} onChange={e => setParticipantSearch(e.target.value)} className="form-input" placeholder="Search patients…" />
                {participantSearch && (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, maxHeight: 120, overflowY: 'auto' }}>
                    {MOCK_PATIENTS.filter(p => p.name.toLowerCase().includes(participantSearch.toLowerCase()) && !newSession.participants.includes(p.id)).map(p => (
                      <div key={p.id} onClick={() => { setNewSession(prev => ({ ...prev, participants: [...prev.participants, p.id] })); setParticipantSearch(''); }} style={{ padding: '6px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid #f8fafc' }} className="hover-highlight">
                        {p.name}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                  {newSession.participants.map(pid => (
                    <span key={pid} style={{ background: '#eff6ff', color: '#1e40af', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {pName(pid)}
                      <span onClick={() => setNewSession(p => ({ ...p, participants: p.participants.filter(x => x !== pid) }))} style={{ cursor: 'pointer', color: '#ef4444' }}>×</span>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Session Notes</label>
                <textarea value={newSession.notes} onChange={e => setNewSession(p => ({ ...p, notes: e.target.value }))} className="form-input" rows={3} placeholder="Session agenda, topics, materials…" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleCreateSession} disabled={!newSession.name} className="btn btn-primary">Create Session</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
