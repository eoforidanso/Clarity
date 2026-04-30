import React, { useState, useMemo, useCallback } from 'react';

const PRIORITY_LEVELS = ['Urgent', 'High', 'Normal', 'Low'];
const PRIORITY_COLORS = {
  Urgent: { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  High:   { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  Normal: { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
  Low:    { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
};
const WAIT_STATUSES = ['Waiting', 'Contacted', 'Scheduled', 'Cancelled'];
const STATUS_COLORS = {
  Waiting:   { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  Contacted: { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
  Scheduled: { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  Cancelled: { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
};

const MOCK_WAITLIST = [
  { id: 'w1', patientName: 'Marcus Williams', patientDOB: '1988-03-12', phone: '(555) 234-0001', email: 'marcus.w@email.com', addedDate: '2026-04-10', preferredProvider: 'Dr. Chris Lee', appointmentType: 'Medication Management', priority: 'Urgent', status: 'Waiting', preferredDays: ['Mon', 'Wed', 'Fri'], preferredTime: 'Morning', notes: 'Switching from another provider urgently — suicidal ideation history. Needs earliest available slot.', insurancePlan: 'Blue Cross PPO', contactAttempts: 2, lastContacted: '2026-04-13', waitDays: 5 },
  { id: 'w2', patientName: 'Sophia Martinez', patientDOB: '1995-07-22', phone: '(555) 234-0002', email: 'sophia.m@email.com', addedDate: '2026-04-08', preferredProvider: 'Dr. April Torres', appointmentType: 'Therapy — Initial Evaluation', priority: 'High', status: 'Contacted', preferredDays: ['Tue', 'Thu'], preferredTime: 'Afternoon', notes: 'Referred by PCP for trauma processing. Has been waiting 3 weeks for an available therapist.', insurancePlan: 'Aetna HMO', contactAttempts: 1, lastContacted: '2026-04-12', waitDays: 7 },
  { id: 'w3', patientName: 'David Park', patientDOB: '1972-11-05', phone: '(555) 234-0003', email: 'david.p@email.com', addedDate: '2026-04-12', preferredProvider: 'Any', appointmentType: 'Neuropsych Testing', priority: 'Normal', status: 'Waiting', preferredDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], preferredTime: 'Any', notes: 'ADHD evaluation requested. Flexible with scheduling.', insurancePlan: 'UnitedHealthcare', contactAttempts: 0, lastContacted: '', waitDays: 3 },
  { id: 'w4', patientName: 'Evelyn Brooks', patientDOB: '1960-02-18', phone: '(555) 234-0004', email: 'evelyn.b@email.com', addedDate: '2026-04-05', preferredProvider: 'Kelly Nguyen NP', appointmentType: 'Medication Management — Follow-Up', priority: 'Normal', status: 'Contacted', preferredDays: ['Wed', 'Fri'], preferredTime: 'Morning', notes: 'Needs med check. Current provider left practice. Stable on current regimen.', insurancePlan: 'Medicare Part B', contactAttempts: 3, lastContacted: '2026-04-14', waitDays: 10 },
  { id: 'w5', patientName: 'Jason Lee', patientDOB: '2001-09-30', phone: '(555) 234-0005', email: 'jason.l@email.com', addedDate: '2026-04-14', preferredProvider: 'Dr. April Torres', appointmentType: 'Therapy — Anxiety/OCD', priority: 'High', status: 'Waiting', preferredDays: ['Mon', 'Wed'], preferredTime: 'Evening', notes: 'College student, evening availability only. ERP/CBT preferred. Moderate OCD symptoms.', insurancePlan: 'Cigna', contactAttempts: 0, lastContacted: '', waitDays: 1 },
  { id: 'w6', patientName: 'Linda Tran', patientDOB: '1985-06-14', phone: '(555) 234-0006', email: 'linda.t@email.com', addedDate: '2026-04-01', preferredProvider: 'Dr. Chris Lee', appointmentType: 'TMS Consultation', priority: 'Normal', status: 'Scheduled', preferredDays: ['Any'], preferredTime: 'Any', notes: 'Scheduled for April 18. Treatment-resistant depression, tried 3 SSRIs and Wellbutrin.', insurancePlan: 'Aetna PPO', contactAttempts: 2, lastContacted: '2026-04-11', waitDays: 14 },
  { id: 'w7', patientName: 'Brian Foster', patientDOB: '1978-12-01', phone: '(555) 234-0007', email: 'brian.f@email.com', addedDate: '2026-04-11', preferredProvider: 'Any', appointmentType: 'IOP Intake', priority: 'Urgent', status: 'Waiting', preferredDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], preferredTime: 'Morning', notes: 'Substance use relapse. ASAM 2.1 — IOP recommended. Needs group spot ASAP.', insurancePlan: 'Medicaid', contactAttempts: 1, lastContacted: '2026-04-13', waitDays: 4 },
];

export default function PatientWaitlist() {
  const [waitlist, setWaitlist] = useState(MOCK_WAITLIST);
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ patientName: '', phone: '', appointmentType: '', preferredProvider: '', priority: 'Normal', preferredTime: 'Any', notes: '' });

  // AI Waitlist Auto-Fill state
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [msgSent, setMsgSent] = useState(null);

  const filtered = useMemo(() => {
    let list = [...waitlist];
    if (filterPriority !== 'All') list = list.filter(e => e.priority === filterPriority);
    if (filterStatus !== 'All') list = list.filter(e => e.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => e.patientName.toLowerCase().includes(q) || e.appointmentType.toLowerCase().includes(q) || e.preferredProvider.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      const pOrder = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
      if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
      return b.waitDays - a.waitDays;
    });
  }, [waitlist, filterPriority, filterStatus, search]);

  const stats = useMemo(() => ({
    total: waitlist.filter(e => e.status === 'Waiting' || e.status === 'Contacted').length,
    urgent: waitlist.filter(e => e.priority === 'Urgent' && e.status !== 'Scheduled' && e.status !== 'Cancelled').length,
    avgWait: (waitlist.filter(e => e.status !== 'Cancelled').reduce((s, e) => s + e.waitDays, 0) / waitlist.filter(e => e.status !== 'Cancelled').length).toFixed(1),
    scheduled: waitlist.filter(e => e.status === 'Scheduled').length,
    needsContact: waitlist.filter(e => e.status === 'Waiting' && e.contactAttempts === 0).length,
  }), [waitlist]);

  const updateStatus = (id, newStatus) => {
    setWaitlist(prev => prev.map(e => e.id === id ? { ...e, status: newStatus, lastContacted: newStatus === 'Contacted' ? new Date().toISOString().slice(0, 10) : e.lastContacted, contactAttempts: newStatus === 'Contacted' ? e.contactAttempts + 1 : e.contactAttempts } : e));
    if (selectedEntry?.id === id) setSelectedEntry(prev => prev ? { ...prev, status: newStatus } : null);
  };

  const addPatient = () => {
    if (!addForm.patientName || !addForm.appointmentType) return;
    const entry = {
      id: `w-${Date.now()}`, ...addForm, patientDOB: '', email: '', addedDate: new Date().toISOString().slice(0, 10),
      preferredDays: ['Any'], status: 'Waiting', insurancePlan: '', contactAttempts: 0, lastContacted: '', waitDays: 0,
    };
    setWaitlist(prev => [entry, ...prev]);
    setShowAdd(false);
    setAddForm({ patientName: '', phone: '', appointmentType: '', preferredProvider: '', priority: 'Normal', preferredTime: 'Any', notes: '' });
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>📋 Patient Waitlist</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Manage patients waiting for appointments — priority queue, outreach tracking, and auto-scheduling</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>➕ Add to Waitlist</button>
      </div>

      {/* AI Waitlist Auto-Fill Panel */}
      <div style={{
        marginBottom: 16, padding: '14px 18px', borderRadius: 12,
        background: 'linear-gradient(135deg, #eef2ff, #faf5ff)',
        border: '1.5px solid #c4b5fd',
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 24 }}>🤖</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#4c1d95' }}>AI-Powered Waitlist Scheduling</div>
          <div style={{ fontSize: 11, color: '#6d28d9', marginTop: 2 }}>
            Automatically match cancelled/open slots with waitlisted patients based on preference, priority, and availability
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" style={{ background: '#8b5cf6', color: '#fff', border: 'none', fontWeight: 700 }}
            disabled={aiRunning}
            onClick={() => {
              setAiRunning(true);
              setShowAiPanel(true);
              setAiResults(null);
              // Simulate AI matching
              setTimeout(() => {
                const waiting = waitlist.filter(e => e.status === 'Waiting' || e.status === 'Contacted');
                const MOCK_OPEN_SLOTS = [
                  { date: '2026-04-16', time: '9:00 AM', provider: 'Dr. Chris Lee', duration: 30 },
                  { date: '2026-04-16', time: '2:30 PM', provider: 'Dr. April Torres', duration: 60 },
                  { date: '2026-04-17', time: '10:00 AM', provider: 'Dr. Chris Lee', duration: 30 },
                  { date: '2026-04-17', time: '3:00 PM', provider: 'Kelly Nguyen NP', duration: 30 },
                  { date: '2026-04-18', time: '11:00 AM', provider: 'Dr. April Torres', duration: 60 },
                ];
                const matches = waiting.slice(0, Math.min(waiting.length, MOCK_OPEN_SLOTS.length)).map((patient, i) => ({
                  patient,
                  slot: MOCK_OPEN_SLOTS[i],
                  confidence: Math.round(75 + Math.random() * 20),
                  reason: patient.priority === 'Urgent' ? 'Priority: Urgent — matched first available'
                    : patient.preferredProvider !== 'Any' && MOCK_OPEN_SLOTS[i].provider.includes(patient.preferredProvider.split(' ')[0])
                    ? 'Preferred provider match'
                    : 'Best available slot for preference window',
                }));
                setAiResults({ matches, slotsScanned: 23, patientsAnalyzed: waiting.length });
                setAiRunning(false);
              }, 2500);
            }}>
            {aiRunning ? '⏳ Scanning...' : '🧠 Run AI Match'}
          </button>
          {aiResults && (
            <button className="btn btn-sm btn-secondary" onClick={() => setShowAiPanel(v => !v)}>
              {showAiPanel ? '▲ Hide' : '▼ Show'} Results ({aiResults.matches.length})
            </button>
          )}
        </div>
      </div>

      {/* AI Results Panel */}
      {showAiPanel && aiResults && (
        <div style={{ marginBottom: 16, border: '1.5px solid #c4b5fd', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
          <div style={{ padding: '10px 16px', background: '#eef2ff', borderBottom: '1px solid #c4b5fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#4c1d95' }}>
              🤖 AI Match Results — {aiResults.matches.length} patients matched to open slots
            </div>
            <div style={{ fontSize: 11, color: '#6d28d9' }}>
              {aiResults.slotsScanned} slots scanned · {aiResults.patientsAnalyzed} patients analyzed
            </div>
          </div>
          <div>
            {aiResults.matches.map((m, i) => (
              <div key={i} style={{
                padding: '12px 16px', borderBottom: '1px solid var(--border-light)',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#6d28d9' }}>
                  {m.confidence}%
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    {m.patient.patientName}
                    <span className={`badge ${PRIORITY_COLORS[m.patient.priority] ? '' : 'badge-info'}`}
                      style={{ marginLeft: 8, fontSize: 9, background: PRIORITY_COLORS[m.patient.priority]?.bg, color: PRIORITY_COLORS[m.patient.priority]?.color }}>
                      {m.patient.priority}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.patient.appointmentType}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>→</div>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--primary)' }}>
                    📅 {m.slot.date} at {m.slot.time}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{m.slot.provider} · {m.slot.duration}min</div>
                </div>
                <div style={{ fontSize: 10, color: '#6d28d9', maxWidth: 160, fontStyle: 'italic' }}>{m.reason}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-success" style={{ fontSize: 10, padding: '3px 10px' }}
                    onClick={() => {
                      setWaitlist(prev => prev.map(e => e.id === m.patient.id ? { ...e, status: 'Scheduled' } : e));
                      setAiResults(prev => ({ ...prev, matches: prev.matches.filter((_, j) => j !== i) }));
                    }}>
                    ✅ Book
                  </button>
                  <button className="btn btn-sm btn-secondary" style={{ fontSize: 10, padding: '3px 10px' }}>Skip</button>
                </div>
              </div>
            ))}
            {aiResults.matches.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                All matched patients have been scheduled! 🎉
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '⏳', val: stats.total, label: 'Active Waitlist', bg: '#fef3c7' },
          { icon: '🔴', val: stats.urgent, label: 'Urgent', bg: '#fee2e2' },
          { icon: '📅', val: `${stats.avgWait}d`, label: 'Avg Wait Time', bg: '#eff6ff' },
          { icon: '✅', val: stats.scheduled, label: 'Scheduled', bg: '#dcfce7' },
          { icon: '📞', val: stats.needsContact, label: 'Needs Contact', bg: '#faf5ff' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <input className="form-input" placeholder="Search waitlist..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
        <select className="form-input" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ width: 130, fontSize: 12 }}>
          <option value="All">All Priorities</option>
          {PRIORITY_LEVELS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 130, fontSize: 12 }}>
          <option value="All">All Status</option>
          {WAIT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Waitlist table */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedEntry ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>
            {filtered.length} Patient{filtered.length !== 1 ? 's' : ''} on Waitlist
          </div>
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {filtered.map(entry => {
              const pc = PRIORITY_COLORS[entry.priority];
              const sc = STATUS_COLORS[entry.status];
              return (
                <div key={entry.id} onClick={() => setSelectedEntry(entry)}
                  style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedEntry?.id === entry.id ? 'var(--primary-light)' : 'transparent', transition: 'background 0.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{entry.patientName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.appointmentType}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: pc.bg, color: pc.color }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: pc.dot }} />{entry.priority}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: sc.bg, color: sc.color }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />{entry.status}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>🩺 {entry.preferredProvider}</span>
                    <span>⏳ {entry.waitDays}d waiting</span>
                    <span>📞 {entry.contactAttempts} attempts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        {selectedEntry && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedEntry.patientName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{selectedEntry.appointmentType}</div>
                </div>
                <button onClick={() => setSelectedEntry(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                {[
                  ['Phone', selectedEntry.phone], ['Email', selectedEntry.email || '—'],
                  ['DOB', selectedEntry.patientDOB || '—'], ['Insurance', selectedEntry.insurancePlan || '—'],
                  ['Preferred Provider', selectedEntry.preferredProvider], ['Preferred Time', selectedEntry.preferredTime],
                  ['Preferred Days', selectedEntry.preferredDays.join(', ')], ['Added', selectedEntry.addedDate],
                  ['Wait Days', `${selectedEntry.waitDays} days`], ['Contact Attempts', selectedEntry.contactAttempts],
                  ['Last Contacted', selectedEntry.lastContacted || 'Never'], ['Priority', selectedEntry.priority],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
              {selectedEntry.notes && (
                <div style={{ padding: 12, background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a', marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', marginBottom: 4 }}>Notes</div>
                  <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>{selectedEntry.notes}</div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selectedEntry.status !== 'Scheduled' && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(selectedEntry.id, 'Scheduled')}>📅 Mark Scheduled</button>}
                {selectedEntry.status === 'Waiting' && <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(selectedEntry.id, 'Contacted')}>📞 Log Contact</button>}
                {selectedEntry.status !== 'Cancelled' && <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(selectedEntry.id, 'Cancelled')}>❌ Cancel</button>}
                <button className="btn btn-secondary btn-sm" style={msgSent === selectedEntry.id ? { background: '#dcfce7', color: '#166534', borderColor: '#86efac' } : {}} onClick={() => { setMsgSent(selectedEntry.id); setTimeout(() => setMsgSent(null), 2000); }}>{msgSent === selectedEntry.id ? '✅ Message Sent' : '📧 Send Message'}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>➕ Add Patient to Waitlist</div>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Patient Name *</label>
                  <input className="form-input" value={addForm.patientName} onChange={e => setAddForm(f => ({ ...f, patientName: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Phone</label>
                  <input className="form-input" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Appointment Type *</label>
                <input className="form-input" value={addForm.appointmentType} onChange={e => setAddForm(f => ({ ...f, appointmentType: e.target.value }))} placeholder="Therapy, Medication Management, Testing..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Preferred Provider</label>
                  <input className="form-input" value={addForm.preferredProvider} onChange={e => setAddForm(f => ({ ...f, preferredProvider: e.target.value }))} placeholder="Any" />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Priority</label>
                  <select className="form-input" value={addForm.priority} onChange={e => setAddForm(f => ({ ...f, priority: e.target.value }))}>
                    {PRIORITY_LEVELS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea className="form-textarea" rows={2} value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addPatient} disabled={!addForm.patientName || !addForm.appointmentType}>📋 Add to Waitlist</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
