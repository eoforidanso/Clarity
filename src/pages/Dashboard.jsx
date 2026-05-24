import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';

/* ── Metric SVG icons ───────────────────────────────────────── */
const SZ = { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: '1.6', strokeLinecap: 'round', strokeLinejoin: 'round' };
const METRIC_SVGS = {
  calendar:  <svg {...SZ}><rect x="3" y="4" width="14" height="14" rx="2"/><line x1="7" y1="2" x2="7" y2="6"/><line x1="13" y1="2" x2="13" y2="6"/><line x1="3" y1="9" x2="17" y2="9"/></svg>,
  clipboard: <svg {...SZ}><rect x="5" y="3" width="10" height="15" rx="1.5"/><path d="M8 3a2 2 0 014 0"/><line x1="7" y1="9" x2="13" y2="9"/><line x1="7" y1="12" x2="11" y2="12"/></svg>,
  clock:     <svg {...SZ}><circle cx="10" cy="10" r="7"/><polyline points="10,6 10,10 13,12"/></svg>,
  camera:    <svg {...SZ}><rect x="2" y="6" width="12" height="10" rx="2"/><polyline points="14,9 18,7 18,14 14,12"/></svg>,
  envelope:  <svg {...SZ}><rect x="2" y="5" width="16" height="11" rx="2"/><polyline points="2,5 10,12 18,5"/></svg>,
};
function MetricIcon({ type }) { return METRIC_SVGS[type] ?? null; }

export default function Dashboard() {
  const { currentUser } = useAuth();
  const { appointments, inboxMessages, patients, selectPatient, updateAppointmentStatus } = usePatient();
  const navigate = useNavigate();
  const [hoveredAction, setHoveredAction] = useState(null);
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Prior auth — M. Johnson', priority: 'high', done: false },
    { id: 2, text: 'Review labs — T. Williams', priority: 'high', done: false },
    { id: 3, text: 'Cosign nurse notes', priority: 'medium', done: false },
    { id: 4, text: 'Refill request — D. Thompson', priority: 'low', done: false },
  ]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const todayAppts = useMemo(() => (appointments || []).filter(
    (a) => a.provider === currentUser?.id || currentUser?.role === 'front_desk' || currentUser?.role === 'admin'
  ), [appointments, currentUser]);

  const myUnread = useMemo(() => (inboxMessages || []).filter(
    (m) => !m.read && (m.to === currentUser?.id || currentUser?.role === 'front_desk' || currentUser?.role === 'admin')
  ), [inboxMessages, currentUser]);

  const checkedIn     = todayAppts.filter((a) => a.status === 'Checked In').length;
  const inProgress    = todayAppts.filter((a) => a.status === 'In Progress').length;
  const completed     = todayAppts.filter((a) => a.status === 'Completed').length;
  const telehealthCnt = todayAppts.filter((a) => a.visitType === 'Telehealth').length;
  const remaining     = todayAppts.filter((a) => a.status !== 'Completed').length;

  const fmtTime = (t) => {
    if (!t) return '';
    const [hh, mm] = t.split(':').map(Number);
    const ap = hh < 12 ? 'AM' : 'PM';
    const h = hh % 12 === 0 ? 12 : hh % 12;
    return `${h}:${String(mm).padStart(2, '0')} ${ap}`;
  };

  const statusClass = (status) => {
    if (status === 'Checked In')  return 'status-checked-in';
    if (status === 'In Progress') return 'status-in-progress';
    if (status === 'Confirmed')   return 'status-confirmed';
    if (status === 'Completed')   return 'status-completed';
    return '';
  };

  const statusBadge = (status) => {
    const m = {
      'Checked In':  'badge-success',
      'Confirmed':   'badge-info',
      'In Progress': 'badge-warning',
      'Completed':   'badge-gray',
      'Scheduled':   'badge-gray',
    };
    return m[status] || 'badge-gray';
  };

  const goToPatient = (apt) => {
    if (apt.patientId) {
      selectPatient(apt.patientId);
      navigate(`/chart/${apt.patientId}/summary`);
    }
  };

  const handleGoToSession = (apt) => {
    if (apt.patientId) selectPatient(apt.patientId);
    navigate(`/session/${apt.id}`);
  };

  const stats = [
    { iconType: 'calendar',  value: todayAppts.length, label: "Today's Appts", color: 'blue' },
    { iconType: 'clipboard', value: checkedIn,          label: 'Checked In',   color: 'green' },
    { iconType: 'clock',     value: inProgress,         label: 'In Session',   color: 'yellow' },
    { iconType: 'camera',    value: telehealthCnt,      label: 'Telehealth',   color: 'teal' },
    { iconType: 'envelope',  value: myUnread.length,    label: 'Inbox',        color: 'red' },
  ];

  // Role-specific greeting subtexts
  const roleSubtext = {
    prescriber: `You have ${remaining} patients remaining today`,
    nurse: `${checkedIn} patients waiting for vitals`,
    front_desk: `${todayAppts.filter(a => a.status === 'Scheduled' || a.status === 'Confirmed').length} patients to check in`,
    admin: `${todayAppts.length} total appointments system-wide`,
    therapist: `${remaining} sessions remaining today`,
  };

  // Urgent messages for attention banner
  const urgentMessages = myUnread.filter(m => m.urgent);

  // Next appointment / telehealth
  const nextAppt = useMemo(() =>
    todayAppts.filter(a => a.status !== 'Completed').sort((a, b) => (a.time || '').localeCompare(b.time || ''))[0] || null
  , [todayAppts]);
  const nextTelehealth = useMemo(() =>
    todayAppts.filter(a => a.visitType === 'Telehealth' && a.status !== 'Completed').sort((a, b) => (a.time || '').localeCompare(b.time || ''))[0] || null
  , [todayAppts]);

  // Recent patients: from localStorage, fallback to today's appt patients
  const recentPatientsList = useMemo(() => {
    const ids = (() => { try { return JSON.parse(localStorage.getItem('clarity_recent_patients') || '[]'); } catch { return []; } })();
    const fromStorage = ids.map(id => patients.find(p => p.id === id)).filter(Boolean);
    if (fromStorage.length >= 3) return fromStorage.slice(0, 5);
    const fromAppts = todayAppts.map(a => patients.find(p => p.id === a.patientId)).filter(Boolean);
    const seen = new Set(fromStorage.map(p => p.id));
    return [...fromStorage, ...fromAppts.filter(p => !seen.has(p.id))].slice(0, 5);
  }, [patients, todayAppts]);

  // Clinical alerts derived from today's schedule
  const clinicalAlerts = useMemo(() => {
    const alerts = [];
    todayAppts.filter(a => a.status === 'Checked In').slice(0, 3).forEach(a =>
      alerts.push({ type: 'vitals', label: 'Vitals needed', text: a.patientName, severity: 'warning', patientId: a.patientId }));
    if (myUnread.some(m => m.subject?.toLowerCase().includes('lab')))
      alerts.push({ type: 'lab', label: 'Unreviewed lab', text: 'Lab result in inbox', severity: 'info' });
    todayAppts.filter(a => a.status === 'Scheduled' && a.time && a.time < new Date().toTimeString().slice(0,5)).slice(0, 2).forEach(a =>
      alerts.push({ type: 'overdue', label: 'Overdue check-in', text: a.patientName, severity: 'danger', patientId: a.patientId }));
    return alerts;
  }, [todayAppts, myUnread]);

  // Active theme label from localStorage
  const activeThemeId = localStorage.getItem('clarity_theme') || 'clinical-blue';
  const activeThemeLabel = activeThemeId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="fade-in">
      {/* Greeting */}
      <div className="dashboard-greeting">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>
            {greeting}, {currentUser?.firstName}
          </h1>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--primary)', opacity: 0.85, letterSpacing: '-0.2px', margin: '2px 0 4px', maxWidth: 400 }}>Clarity — Designed for healing</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {remaining > 0 && <span style={{ color: 'var(--primary)', fontWeight: 600 }}>· {roleSubtext[currentUser?.role] || `${remaining} remaining today`}</span>}
            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--purple-light)', color: 'var(--purple)', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Academic Medical Center</span>
          </p>
        </div>
        <div className="dashboard-greeting-actions">
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/patients')}>🔍 Find Patient</button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/schedule')}>📅 Full Schedule</button>
          <button className="btn btn-secondary btn-sm dashboard-export-btn" onClick={() => navigate('/analytics')}>📤 Export</button>
        </div>
        {/* Active theme color bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }} title={`Active theme: ${activeThemeLabel}`}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Theme</span>
          {['--primary', '--primary-dark', '--sidebar-bg'].map(v => (
            <div key={v} style={{ width: 14, height: 14, borderRadius: 3, background: `var(${v})`, border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0 }} />
          ))}
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{activeThemeLabel}</span>
        </div>
      </div>

      {/* Urgent attention banner */}
      {urgentMessages.length > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => navigate('/inbox')}>
          <div>
            <strong>⚠️ {urgentMessages.length} urgent message{urgentMessages.length > 1 ? 's' : ''} require attention</strong>
            <span style={{ marginLeft: 8, opacity: 0.8, fontSize: 12 }}>{urgentMessages[0]?.subject}</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600 }}>View →</span>
        </div>
      )}

      {/* Stat strip */}
      <div className="stagger dashboard-stats-grid">
        {stats.map((s) => (
          <div key={s.label} className={`stat-card row ${s.color} fade-in`}>
            <div className={`stat-icon ${s.color}`}><MetricIcon type={s.iconType} /></div>
            <div className="stat-info">
              <h3>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Next Up mini-cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {/* Next Appointment */}
        <div className="card" style={{ cursor: nextAppt ? 'pointer' : 'default' }} onClick={() => nextAppt && goToPatient(nextAppt)}>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              <MetricIcon type="calendar" />
              Next Appointment
            </div>
            {nextAppt ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{nextAppt.patientName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{fmtTime(nextAppt.time)} · {nextAppt.type}</div>
                <span className={`badge ${statusBadge(nextAppt.status)}`} style={{ marginTop: 6, display: 'inline-block' }}>{nextAppt.status}</span>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}>No upcoming appointments</div>
            )}
          </div>
        </div>

        {/* Next Telehealth */}
        <div className="card" style={{ cursor: nextTelehealth ? 'pointer' : 'default' }} onClick={() => nextTelehealth && handleGoToSession(nextTelehealth)}>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--teal)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              <MetricIcon type="camera" />
              Next Telehealth
            </div>
            {nextTelehealth ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{nextTelehealth.patientName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{fmtTime(nextTelehealth.time)}</div>
                <button className="btn btn-sm btn-outline" style={{ marginTop: 6, fontSize: 11, padding: '2px 10px', color: 'var(--teal)', borderColor: 'var(--teal)' }}
                  onClick={(e) => { e.stopPropagation(); handleGoToSession(nextTelehealth); }}>
                  Join Session →
                </button>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}>No telehealth sessions</div>
            )}
          </div>
        </div>

        {/* Next Task */}
        <div className="card">
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--warning)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              <MetricIcon type="clipboard" />
              Next Task
            </div>
            {tasks.filter(t => !t.done)[0] ? (
              <>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.3 }}>{tasks.filter(t => !t.done)[0].text}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {tasks.filter(t => !t.done).length} task{tasks.filter(t => !t.done).length !== 1 ? 's' : ''} remaining
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, marginTop: 4 }}>✅ All tasks complete</div>
            )}
          </div>
        </div>
      </div>

      {/* Main grid: 3-column layout */}
      <div className="dashboard-main-grid">

        {/* Left: Schedule timeline */}
        <div className="card">
          <div className="card-header">
            <h2>📅 Today's Schedule</h2>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {completed > 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{completed}/{todayAppts.length} completed</span>
              )}
              <button className="btn btn-sm btn-secondary" onClick={() => navigate('/schedule')}>View All →</button>
            </div>
          </div>
          <div className="card-body no-pad" style={{ maxHeight: 480, overflowY: 'auto' }}>
            {todayAppts.length === 0 ? (
              <div className="empty-state">
                <span className="icon">📅</span>
                <h3>No appointments today</h3>
                <p>Your schedule is clear</p>
              </div>
            ) : (
              todayAppts.map((apt) => (
                <div
                  key={apt.id}
                  className={`appt-row ${statusClass(apt.status)}`}
                  onClick={() => goToPatient(apt)}
                >
                  <div className="appt-time">{fmtTime(apt.time)}</div>
                  <div className="appt-patient-avatar">
                    {apt.patientName ? apt.patientName.split(' ').map(n => n[0]).join('').slice(0,2) : '?'}
                  </div>
                  <div className="appt-info" style={{ flex: 1 }}>
                    <div className="appt-name">
                      {apt.patientName}
                      {apt.visitType === 'Telehealth' && (
                        <span className="badge badge-teal" style={{ marginLeft: 6, fontSize: 10 }}>📹 TH</span>
                      )}
                    </div>
                    <div className="appt-type">{apt.type} · {apt.duration || 30} min</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span className={`badge ${statusBadge(apt.status)}`}>{apt.status}</span>
                    {(apt.status === 'In Progress' || apt.status === 'Checked In') && (
                      <button
                        className="btn btn-sm btn-success"
                        style={{ fontSize: 11, padding: '2px 8px' }}
                        onClick={(e) => { e.stopPropagation(); handleGoToSession(apt); }}
                      >
                        🩺 Session
                      </button>
                    )}
                    {(apt.status === 'Scheduled' || apt.status === 'Confirmed') && (
                      <button
                        className="btn btn-sm btn-outline"
                        style={{ fontSize: 11, padding: '2px 8px' }}
                        onClick={(e) => { e.stopPropagation(); updateAppointmentStatus(apt.id, 'Checked In'); if (apt.patientId) selectPatient(apt.patientId); navigate(`/session/${apt.id}`); }}
                      >
                        Check In
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Inbox preview */}
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: 13 }}>
                📬 Inbox
                {myUnread.length > 0 && (
                  <span className="badge badge-danger" style={{ marginLeft: 8 }}>{myUnread.length}</span>
                )}
              </h2>
              <button className="btn btn-sm btn-ghost" onClick={() => navigate('/inbox')}>View all</button>
            </div>
            <div className="card-body no-pad">
              {myUnread.length === 0 ? (
                <div className="empty-state" style={{ padding: '28px 16px' }}>
                  <span className="icon" style={{ fontSize: 28 }}>✉️</span>
                  <h3 style={{ fontSize: 13 }}>All caught up!</h3>
                  <p>No unread messages</p>
                </div>
              ) : (
                myUnread.slice(0, 4).map((msg) => (
                  <div
                    key={msg.id}
                    className="inbox-item unread"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/inbox')}
                  >
                    <div className="item-header">
                      <span className="item-from" style={{ fontSize: 12 }}>
                        {msg.urgent && <span style={{ color: 'var(--danger)', marginRight: 4 }}>●</span>}
                        {msg.from}
                      </span>
                      <span className="item-time">{msg.time || msg.date}</span>
                    </div>
                    <div className="item-subject">{msg.subject}</div>
                    <div className="item-preview">{msg.body?.substring(0, 55)}…</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: 13 }}>⚡ Quick Actions</h2>
            </div>
            <div className="card-body">
              {/* + New row */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {[
                  { label: '+ Encounter', path: '/encounters' },
                  { label: '+ Message',   path: '/staff-messaging' },
                  { label: '+ Document',  path: '/documents' },
                ].map((n) => (
                  <button
                    key={n.path}
                    className="btn btn-sm btn-primary"
                    style={{ flex: 1, fontSize: 11, padding: '5px 4px', fontWeight: 700 }}
                    onClick={() => navigate(n.path)}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { icon: '🔍', label: 'Find Patient',     path: '/patients' },
                  { icon: '📬', label: 'Inbox',             path: '/inbox' },
                  { icon: '📹', label: 'Telehealth',        path: '/telehealth' },
                  { icon: '💊', label: 'E-Prescribe',       path: '/prescribe' },
                  { icon: '⚡', label: 'Smart Phrases',     path: '/smart-phrases' },
                  { icon: '📄', label: 'Documents',         path: '/documents' },
                  { icon: '📊', label: 'Quality Measures',  path: '/quality-measures' },
                  { icon: '🗂️', label: 'Admin Tools',       path: '/admin-toolkit' },
                ].map((a) => {
                  const hovered = hoveredAction === a.path;
                  return (
                    <button
                      key={a.path}
                      className="btn btn-secondary"
                      style={{
                        justifyContent: 'flex-start', fontSize: 12, padding: '7px 10px', gap: 7,
                        transition: 'transform 150ms ease, box-shadow 150ms ease, background 150ms ease, border-color 150ms ease',
                        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
                        boxShadow: hovered ? '0 4px 12px rgba(0,0,0,0.10)' : 'none',
                        background: hovered ? 'var(--primary-light)' : undefined,
                        borderColor: hovered ? 'var(--primary)' : undefined,
                        color: hovered ? 'var(--primary)' : undefined,
                      }}
                      onMouseEnter={() => setHoveredAction(a.path)}
                      onMouseLeave={() => setHoveredAction(null)}
                      onClick={() => navigate(a.path)}
                    >
                      <span>{a.icon}</span>{a.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Progress for the day */}
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: 13 }}>📊 Day Progress</h2>
            </div>
            <div className="card-body">
              {todayAppts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-muted)', fontSize: 12 }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>☀️</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Ready for the day</div>
                  <div style={{ marginTop: 3 }}>No appointments scheduled</div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Patients seen</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{completed}/{todayAppts.length}</span>
                  </div>
                  <div className="score-bar" style={{ height: 8, borderRadius: 4 }}>
                    <div
                      className="fill"
                      style={{
                        width: `${(completed / todayAppts.length) * 100}%`,
                        background: completed === todayAppts.length ? 'var(--success)' : 'var(--primary)',
                        borderRadius: 4,
                        transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>🟢 Checked in: {checkedIn}</span>
                    <span>🟡 In session: {inProgress}</span>
                    <span>✅ Done: {completed}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Staff Chat Preview */}
          <div className="card card-hover" style={{ cursor: 'pointer' }} onClick={() => navigate('/staff-messaging')}>
            <div className="card-header">
              <h2 style={{ fontSize: 13 }}>💬 Staff Chat</h2>
              <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); navigate('/staff-messaging'); }}>Open</button>
            </div>
            <div className="card-body" style={{ padding: '10px 16px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Team communications channel
              </div>
              <div style={{ display: 'flex', gap: -6, marginBottom: 8 }}>
                {[
                  { initials: 'CL', bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
                  { initials: 'J', bg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
                  { initials: 'IS', bg: 'linear-gradient(135deg, #10b981, #059669)' },
                  { initials: 'KC', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' },
                ].map((a, i) => (
                  <div key={i} style={{
                    width: 26, height: 26, borderRadius: '50%', background: a.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 9, fontWeight: 700, border: '2px solid var(--bg-white)',
                    marginLeft: i > 0 ? -6 : 0, position: 'relative', zIndex: 4 - i,
                  }}>
                    {a.initials}
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                  5 team members online
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>
                Open Staff Chat →
              </div>
            </div>
          </div>

          {/* Appointment Reminders */}
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: 13 }}>📲 Appointment Reminders</h2>
            </div>
            <div className="card-body" style={{ padding: '10px 16px' }}>
              {todayAppts.filter(a => a.status === 'Confirmed' || a.status === 'Scheduled').length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>All reminders sent ✓</div>
              ) : (
                todayAppts.filter(a => a.status === 'Confirmed' || a.status === 'Scheduled').slice(0, 3).map(apt => (
                  <div key={apt.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 0', borderBottom: '1px solid var(--border-light)', fontSize: 12,
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{apt.patientName}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{apt.time} — {apt.type}</div>
                    </div>
                    <button
                      className="btn btn-sm btn-outline"
                      style={{ fontSize: 10, padding: '2px 8px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const btn = e.currentTarget;
                        btn.textContent = '✓ Sent';
                        btn.disabled = true;
                        btn.style.color = 'var(--success)';
                        btn.style.borderColor = 'var(--success)';
                      }}
                    >
                      📲 Send
                    </button>
                  </div>
                ))
              )}
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>SMS & Email reminders</span>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>Auto-send: ON</span>
              </div>
            </div>
          </div>

          {/* Recent Patients */}
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: 13 }}>🕑 Recent Patients</h2>
              <button className="btn btn-sm btn-ghost" onClick={() => navigate('/patients')}>All patients</button>
            </div>
            <div className="card-body no-pad">
              {recentPatientsList.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px 16px' }}>
                  <span className="icon" style={{ fontSize: 24 }}>👤</span>
                  <h3 style={{ fontSize: 12 }}>No recent patients</h3>
                  <p>Charts you open will appear here</p>
                </div>
              ) : (
                recentPatientsList.map((p) => (
                  <div
                    key={p.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', transition: 'background 120ms' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                    onClick={() => { selectPatient(p.id); navigate(`/chart/${p.id}/summary`); }}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {`${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.firstName} {p.lastName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {p.dob ? `DOB: ${p.dob}` : p.mrn ? `MRN: ${p.mrn}` : 'Patient'}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>Chart →</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tasks */}
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: 13 }}>✅ Tasks</h2>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tasks.filter(t => !t.done).length} remaining</span>
            </div>
            <div className="card-body no-pad">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border-light)', opacity: t.done ? 0.5 : 1, transition: 'opacity 200ms' }}
                >
                  <button
                    style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${t.done ? 'var(--success)' : t.priority === 'high' ? 'var(--danger)' : 'var(--border)'}`, background: t.done ? 'var(--success)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 150ms' }}
                    onClick={() => setTasks(prev => prev.map(x => x.id === t.id ? { ...x, done: !x.done } : x))}
                    aria-label={t.done ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {t.done && <span style={{ color: 'white', fontSize: 11, fontWeight: 900 }}>✓</span>}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', textDecoration: t.done ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.text}
                    </div>
                  </div>
                  {!t.done && (
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, background: t.priority === 'high' ? 'var(--danger-light)' : t.priority === 'medium' ? '#fef3c7' : 'var(--bg)', color: t.priority === 'high' ? 'var(--danger)' : t.priority === 'medium' ? '#92400e' : 'var(--text-muted)' }}>
                      {t.priority}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Clinical Alerts */}
          {(clinicalAlerts.length > 0) && (
            <div className="card" style={{ borderColor: 'var(--warning)', borderWidth: 1.5 }}>
              <div className="card-header" style={{ background: 'linear-gradient(180deg, #fffbeb, #fef3c7)' }}>
                <h2 style={{ fontSize: 13, color: '#92400e' }}>⚠️ Clinical Alerts</h2>
                <span style={{ fontSize: 11, background: '#fde68a', color: '#92400e', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>{clinicalAlerts.length}</span>
              </div>
              <div className="card-body no-pad">
                {clinicalAlerts.map((alert, i) => (
                  <div
                    key={i}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: i < clinicalAlerts.length - 1 ? '1px solid var(--border-light)' : 'none', cursor: alert.patientId ? 'pointer' : 'default' }}
                    onClick={() => alert.patientId && navigate(`/chart/${alert.patientId}/summary`)}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0 }}>
                      {alert.type === 'vitals' ? '🩺' : alert.type === 'lab' ? '🧪' : alert.type === 'overdue' ? '⏰' : '⚠️'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: alert.severity === 'danger' ? 'var(--danger)' : alert.severity === 'warning' ? '#92400e' : 'var(--text-primary)' }}>
                        {alert.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {alert.text}
                      </div>
                    </div>
                    {alert.patientId && <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>View →</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

