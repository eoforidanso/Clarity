import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';
import { DemoDisabled } from '../demo/DemoGuard';
import { useDemo } from '../demo/DemoContext';
import { useGuidedTour } from '../demo/DemoGuidedTourProvider';

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
  const { isDemo } = useDemo();
  const { start: startTour } = useGuidedTour();
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
    (m) => !m.read && (m.to === currentUser?.id || m.to === 'demo-u1' || currentUser?.role === 'front_desk' || currentUser?.role === 'admin')
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

  // Minutes until next appointment
  const minsUntilNext = useMemo(() => {
    if (!nextAppt?.time) return null;
    const [hh, mm] = nextAppt.time.split(':').map(Number);
    const now = new Date();
    const apptMins = hh * 60 + mm;
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const diff = apptMins - nowMins;
    return diff > 0 && diff < 180 ? diff : null;
  }, [nextAppt]);

  return (
    <div className="fade-in">

      {/* ── TIER 1: Greeting + critical alerts ─────────────────────────── */}
      <div style={{ marginBottom: 16, padding: '18px 22px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            {/* Primary greeting */}
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, letterSpacing: '-0.8px', color: '#0f172a', lineHeight: 1.1 }}>
              {greeting}, {currentUser?.firstName}.
            </h1>
            {/* Date — Tier 1 prominence */}
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)', margin: '4px 0 2px', letterSpacing: '-0.2px' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {remaining > 0 && <span style={{ color: '#475569' }}>{roleSubtext[currentUser?.role] || `${remaining} remaining today`}</span>}
              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--purple-light)', color: 'var(--purple)', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Academic Medical Center</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/patients')}>🔍 Find Patient</button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/schedule')}>📅 Full Schedule</button>
            {isDemo && (
              <button
                className="btn btn-sm"
                data-demo-allowed
                onClick={startTour}
                style={{ background: 'linear-gradient(135deg,#6366f1,#0891b2)', color: '#fff', border: 'none', fontWeight: 700 }}
              >
                ▶ Guided Tour
              </button>
            )}
            <DemoDisabled reason="Data export is disabled in demo mode">
            <button className="btn btn-secondary btn-sm dashboard-export-btn" onClick={() => navigate('/analytics')}>📤 Export</button>
          </DemoDisabled>
          </div>
        </div>

        {/* Critical alerts — inline in Tier 1 */}
        {(urgentMessages.length > 0 || clinicalAlerts.some(a => a.severity === 'danger')) && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {urgentMessages.length > 0 && (
              <div
                onClick={() => navigate('/inbox')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 8, cursor: 'pointer', flex: 1, minWidth: 220 }}>
                <span style={{ fontSize: 16 }}>🚨</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#991b1b' }}>{urgentMessages.length} urgent message{urgentMessages.length > 1 ? 's' : ''}</div>
                  <div style={{ fontSize: 11, color: '#b91c1c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{urgentMessages[0]?.subject}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#991b1b' }}>View →</span>
              </div>
            )}
            {clinicalAlerts.filter(a => a.severity === 'danger').map((alert, i) => (
              <div key={i}
                onClick={() => alert.patientId && navigate(`/chart/${alert.patientId}/summary`)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 8, cursor: alert.patientId ? 'pointer' : 'default' }}>
                <span style={{ fontSize: 14 }}>⏰</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#c2410c' }}>{alert.label}</div>
                  <div style={{ fontSize: 11, color: '#ea580c' }}>{alert.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── TIER 1: Next Appointment + Next Telehealth side-by-side ──────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

        {/* Next Appointment — hero card */}
        <div
          onClick={() => nextAppt && goToPatient(nextAppt)}
          style={{
            background: nextAppt ? 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' : '#f8fafc',
            borderRadius: 12, padding: '20px 22px', cursor: nextAppt ? 'pointer' : 'default',
            border: nextAppt ? 'none' : '1px solid #e2e8f0',
            boxShadow: nextAppt ? '0 4px 20px rgba(15,23,42,0.18)' : 'none',
            transition: 'transform 150ms, box-shadow 150ms',
            position: 'relative', overflow: 'hidden',
          }}
          onMouseEnter={e => nextAppt && (e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = '0 8px 28px rgba(15,23,42,0.24)')}
          onMouseLeave={e => nextAppt && (e.currentTarget.style.transform = '', e.currentTarget.style.boxShadow = '0 4px 20px rgba(15,23,42,0.18)')}
        >
          {/* subtle background glow */}
          {nextAppt && <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', pointerEvents: 'none' }} />}
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: nextAppt ? 'rgba(148,163,184,0.9)' : 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
            <MetricIcon type="calendar" /> Next Appointment
          </div>
          {nextAppt ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: 4 }}>{nextAppt.patientName}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>{fmtTime(nextAppt.time)} · {nextAppt.type}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`badge ${statusBadge(nextAppt.status)}`}>{nextAppt.status}</span>
                {minsUntilNext !== null && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: minsUntilNext <= 10 ? '#f87171' : '#60a5fa', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 6 }}>
                    in {minsUntilNext} min
                  </span>
                )}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}>No upcoming appointments</div>
          )}
        </div>

        {/* Next Telehealth — hero card */}
        <div
          onClick={() => nextTelehealth && handleGoToSession(nextTelehealth)}
          style={{
            background: nextTelehealth ? 'linear-gradient(135deg, #0d4f4a 0%, #0f766e 100%)' : '#f8fafc',
            borderRadius: 12, padding: '20px 22px', cursor: nextTelehealth ? 'pointer' : 'default',
            border: nextTelehealth ? 'none' : '1px solid #e2e8f0',
            boxShadow: nextTelehealth ? '0 4px 20px rgba(13,79,74,0.22)' : 'none',
            transition: 'transform 150ms, box-shadow 150ms',
            position: 'relative', overflow: 'hidden',
          }}
          onMouseEnter={e => nextTelehealth && (e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = '0 8px 28px rgba(13,79,74,0.3)')}
          onMouseLeave={e => nextTelehealth && (e.currentTarget.style.transform = '', e.currentTarget.style.boxShadow = '0 4px 20px rgba(13,79,74,0.22)')}
        >
          {nextTelehealth && <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(20,184,166,0.15)', pointerEvents: 'none' }} />}
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: nextTelehealth ? 'rgba(148,163,184,0.9)' : 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
            <MetricIcon type="camera" /> Next Telehealth
          </div>
          {nextTelehealth ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#f0fdfa', letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: 4 }}>{nextTelehealth.patientName}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#99f6e4', marginBottom: 10 }}>{fmtTime(nextTelehealth.time)}</div>
              <button
                className="btn btn-sm"
                style={{ background: '#14b8a6', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, padding: '6px 16px', borderRadius: 7 }}
                onClick={e => { e.stopPropagation(); handleGoToSession(nextTelehealth); }}
              >
                📹 Join Session →
              </button>
            </>
          ) : (
            <div style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}>No telehealth sessions</div>
          )}
        </div>
      </div>

      {/* ── TIER 2: Glassmorphism metric strip ───────────────────────────── */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 16,
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(226,232,240,0.8)',
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
        overflow: 'hidden',
      }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '12px 8px',
            borderRight: i < stats.length - 1 ? '1px solid rgba(226,232,240,0.7)' : 'none',
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginTop: 3, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</div>
          </div>
        ))}
        {/* Tasks chip in same strip */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '12px 8px',
          borderLeft: '1px solid rgba(226,232,240,0.7)',
          cursor: 'pointer',
        }} onClick={() => navigate('/tasks')}>
          <div style={{ fontSize: 22, fontWeight: 900, color: tasks.filter(t => !t.done).length > 0 ? '#d97706' : '#22c55e', lineHeight: 1 }}>
            {tasks.filter(t => !t.done).length}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.4 }}>Tasks</div>
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
                  <div className="appt-patient-avatar" style={{ overflow:'hidden', padding:0 }}>
                    {(() => {
                      const _photo = patients?.find(p => p.id === apt.patientId)?.photo;
                      const _ini   = apt.patientName ? apt.patientName.split(' ').map(n=>n[0]).join('').slice(0,2) : '?';
                      return _photo
                        ? <img src={_photo} alt={apt.patientName} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        : _ini;
                    })()}
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
                    <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700 }}>
                      {p.photo
                        ? <img src={p.photo} alt={p.firstName} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        : `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`.toUpperCase()}
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

          {/* Non-critical clinical alerts (warnings only — danger shown above fold) */}
          {clinicalAlerts.filter(a => a.severity !== 'danger').length > 0 && (
            <div className="card" style={{ borderColor: '#fbbf24', borderWidth: 1.5 }}>
              <div className="card-header" style={{ background: 'linear-gradient(180deg, #fffbeb, #fef3c7)' }}>
                <h2 style={{ fontSize: 13, color: '#92400e' }}>⚠️ Clinical Alerts</h2>
                <span style={{ fontSize: 11, background: '#fde68a', color: '#92400e', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>{clinicalAlerts.filter(a => a.severity !== 'danger').length}</span>
              </div>
              <div className="card-body no-pad">
                {clinicalAlerts.filter(a => a.severity !== 'danger').map((alert, i, arr) => (
                  <div
                    key={i}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border-light)' : 'none', cursor: alert.patientId ? 'pointer' : 'default' }}
                    onClick={() => alert.patientId && navigate(`/chart/${alert.patientId}/summary`)}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0 }}>
                      {alert.type === 'vitals' ? '🩺' : alert.type === 'lab' ? '🧪' : '⚠️'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>{alert.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alert.text}</div>
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

