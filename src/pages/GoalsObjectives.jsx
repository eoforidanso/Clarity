import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import {
  GOAL_STATUSES, GOAL_STATUS_COLORS,
} from '../data/treatmentPlansData';
import { useTreatmentPlans } from '../hooks/useTreatmentPlans';

const TODAY = new Date().toISOString().split('T')[0];

function ProgressRing({ pct, size = 52, stroke = 5 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 100 ? '#059669' : pct >= 60 ? '#3b82f6' : pct >= 30 ? '#f59e0b' : '#ef4444';
  const fontSize = size <= 40 ? 9 : 11;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize, fontWeight: 800, color, lineHeight: 1,
      }}>{pct}%</div>
    </div>
  );
}

export default function GoalsObjectives() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { plans, setPlans } = useTreatmentPlans();
  const { addNotification } = useNotifications();

  // Flatten goals with their parent plan info
  const allGoals = useMemo(() =>
    plans.flatMap(plan =>
      (plan.goals || []).map(goal => ({
        ...goal,
        planId:     plan.id,
        clientName: plan.patientName,
        patientId:  plan.patientId,
        diagnoses:  plan.diagnoses,
      }))
    ),
    [plans]
  );

  // Filters
  const [filterClient, setFilterClient] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDomain, setFilterDomain] = useState('all');
  const [sortBy, setSortBy] = useState('targetDate');

  // Modals
  const [checkInGoal, setCheckInGoal] = useState(null); // { goal, planId }
  const [newCheckIn, setNewCheckIn] = useState({ date: TODAY, progress: 50, note: '' });
  const [expandedCheckIns, setExpandedCheckIns] = useState({});

  const clientNames = useMemo(() => {
    const names = [...new Set(allGoals.map(g => g.clientName))].sort();
    return names;
  }, [allGoals]);

  const activeDomains = useMemo(() => {
    return [...new Set(allGoals.map(g => g.domain))].sort();
  }, [allGoals]);

  const filtered = useMemo(() => {
    let goals = allGoals;
    if (filterClient !== 'all') goals = goals.filter(g => g.clientName === filterClient);
    if (filterStatus !== 'all') goals = goals.filter(g => g.status === filterStatus);
    if (filterDomain !== 'all') goals = goals.filter(g => g.domain === filterDomain);

    return [...goals].sort((a, b) => {
      if (sortBy === 'targetDate') return (a.targetDate || '9999').localeCompare(b.targetDate || '9999');
      if (sortBy === 'progress') return a.progress - b.progress;
      if (sortBy === 'client') return a.clientName.localeCompare(b.clientName);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return 0;
    });
  }, [allGoals, filterClient, filterStatus, filterDomain, sortBy]);

  // Summary stats
  const stats = useMemo(() => {
    const active = allGoals.filter(g => g.status === 'Active').length;
    const progressing = allGoals.filter(g => g.status === 'Progressing').length;
    const met = allGoals.filter(g => g.status === 'Met').length;
    const overdue = allGoals.filter(g =>
      g.targetDate && g.targetDate < TODAY && g.status !== 'Met' && g.status !== 'Discontinued'
    ).length;
    return { active, progressing, met, overdue };
  }, [allGoals]);

  const isOverdue = (goal) =>
    goal.targetDate && goal.targetDate < TODAY &&
    goal.status !== 'Met' && goal.status !== 'Discontinued';

  const isDueSoon = (goal) => {
    if (!goal.targetDate || isOverdue(goal) || goal.status === 'Met') return false;
    const daysUntil = Math.ceil((new Date(goal.targetDate) - new Date(TODAY)) / 86400000);
    return daysUntil <= 30;
  };

  const updateGoalInPlan = (planId, goalId, updates) => {
    setPlans(prev => prev.map(p =>
      p.id === planId
        ? { ...p, goals: p.goals.map(g => g.id === goalId ? { ...g, ...updates } : g) }
        : p
    ));
  };

  const addCheckIn = () => {
    if (!newCheckIn.note.trim() || !checkInGoal) return;
    const entry = {
      id: `ci-${Date.now()}`,
      ...newCheckIn,
      author: `${currentUser.firstName} ${currentUser.lastName}`,
    };
    const { goal, planId } = checkInGoal;
    const newStatus = newCheckIn.progress >= 100 ? 'Met'
      : newCheckIn.progress > 0 ? 'Progressing'
      : 'Active';
    updateGoalInPlan(planId, goal.id, {
      checkIns: [...(goal.checkIns || []), entry],
      progress: newCheckIn.progress,
      status: newStatus,
    });
    setCheckInGoal(null);
    setNewCheckIn({ date: TODAY, progress: 50, note: '' });
    addNotification({ type: 'success', title: 'Check-in Saved', message: `Progress updated to ${newCheckIn.progress}%` });
  };

  const openCheckIn = (goal) => {
    setCheckInGoal(goal);
    setNewCheckIn({ date: TODAY, progress: goal.progress, note: '' });
  };

  return (
    <div className="fade-in">
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>🎯 Goals & Objectives</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Cross-client view of all treatment goals — track progress, add check-ins, and update statuses
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/treatment-plans')}
        >
          📋 Treatment Plans
        </button>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Active', value: stats.active, color: '#1e40af', bg: '#dbeafe', icon: '🟦' },
          { label: 'Progressing', value: stats.progressing, color: '#92400e', bg: '#fef3c7', icon: '🟡' },
          { label: 'Met', value: stats.met, color: '#166534', bg: '#dcfce7', icon: '✅' },
          { label: 'Overdue', value: stats.overdue, color: '#991b1b', bg: '#fee2e2', icon: '⚠️' },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>{icon} {label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color }}>{value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>goal{value !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          className="form-input"
          style={{ fontSize: 12, padding: '6px 10px', minWidth: 150 }}
          value={filterClient}
          onChange={e => setFilterClient(e.target.value)}
        >
          <option value="all">All Clients</option>
          {clientNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>

        <select
          className="form-input"
          style={{ fontSize: 12, padding: '6px 10px', minWidth: 140 }}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="all">All Statuses</option>
          {GOAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          className="form-input"
          style={{ fontSize: 12, padding: '6px 10px', minWidth: 170 }}
          value={filterDomain}
          onChange={e => setFilterDomain(e.target.value)}
        >
          <option value="all">All Domains</option>
          {activeDomains.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Sort:</span>
          {[
            { key: 'targetDate', label: 'Due Date' },
            { key: 'progress', label: 'Progress' },
            { key: 'client', label: 'Client' },
            { key: 'status', label: 'Status' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 6,
                border: sortBy === key ? '2px solid #7c3aed' : '1px solid var(--border)',
                background: sortBy === key ? '#ede9fe' : '#fff',
                color: sortBy === key ? '#5b21b6' : 'var(--text-secondary)',
                fontWeight: sortBy === key ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginLeft: 4 }}>
          {filtered.length} goal{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Goals grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 14, border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>No goals match your filters</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting the client, status, or domain filter</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 14 }}>
          {filtered.map(goal => {
            const gsc = GOAL_STATUS_COLORS[goal.status] || GOAL_STATUS_COLORS.Active;
            const overdue = isOverdue(goal);
            const dueSoon = isDueSoon(goal);
            const lastCheckIn = goal.checkIns?.at(-1);
            const expanded = expandedCheckIns[goal.id];

            return (
              <div
                key={goal.id}
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  border: `1px solid ${overdue ? '#fca5a5' : 'var(--border)'}`,
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  boxShadow: overdue ? '0 0 0 2px #fee2e2' : undefined,
                }}
              >
                {/* Card header: client + progress ring */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <button
                      onClick={() => navigate(`/chart/${goal.patientId}/summary`)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 13, fontWeight: 800, color: '#5b21b6', padding: 0,
                        textAlign: 'left', marginBottom: 6,
                      }}
                    >
                      👤 {goal.clientName}
                    </button>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: '#ede9fe', color: '#5b21b6', fontWeight: 700 }}>{goal.domain}</span>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: gsc.bg, color: gsc.color, fontWeight: 700 }}>{goal.status}</span>
                      {overdue && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', fontWeight: 700 }}>⚠ Overdue</span>}
                      {dueSoon && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>⏳ Due Soon</span>}
                    </div>
                  </div>
                  <ProgressRing pct={goal.progress} size={52} stroke={5} />
                </div>

                {/* Goal description */}
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: 'var(--text-primary)' }}>
                  {goal.description}
                </div>

                {/* Outcome measure scores */}
                {goal.outcomeMeasure && goal.baselineScore != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd', fontSize: 11 }}>
                    <span style={{ fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>{goal.outcomeMeasure}</span>
                    <span style={{ color: '#64748b' }}>{goal.baselineScore} → </span>
                    <span style={{ fontWeight: 800, color: goal.currentScore <= goal.baselineScore ? '#059669' : '#dc2626' }}>
                      {goal.currentScore}
                      {goal.currentScore < goal.baselineScore &&
                        ` (↓${Math.round(((goal.baselineScore - goal.currentScore) / goal.baselineScore) * 100)}%)`}
                    </span>
                  </div>
                )}

                {/* Meta row */}
                <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-secondary)' }}>
                  {goal.targetDate && (
                    <span style={{ color: overdue ? '#dc2626' : 'inherit', fontWeight: overdue ? 700 : 400 }}>
                      📅 {goal.targetDate}
                    </span>
                  )}
                  {goal.measure && <span>📏 {goal.measure}</span>}
                  {goal.interventions?.length > 0 && (
                    <span>🩹 {goal.interventions.length} intervention{goal.interventions.length !== 1 ? 's' : ''}</span>
                  )}
                </div>

                {/* Last check-in */}
                {lastCheckIn && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '6px 10px', background: '#f8fafc', borderRadius: 6, borderLeft: '3px solid #c7d2fe', lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 700, color: '#4f46e5' }}>Last check-in {lastCheckIn.date}:</span> {lastCheckIn.note.slice(0, 100)}{lastCheckIn.note.length > 100 ? '…' : ''}
                  </div>
                )}

                {/* Check-in history toggle */}
                {goal.checkIns?.length > 0 && (
                  <div>
                    <button
                      onClick={() => setExpandedCheckIns(prev => ({ ...prev, [goal.id]: !prev[goal.id] }))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#6366f1', padding: 0 }}
                    >
                      {expanded ? '▾' : '▸'} Check-in History ({goal.checkIns.length})
                    </button>
                    {expanded && (
                      <div style={{ marginTop: 8, borderLeft: '3px solid #c7d2fe', paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {goal.checkIns.map(ci => (
                          <div key={ci.id}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: '#4f46e5', background: '#eef2ff', padding: '1px 5px', borderRadius: 4 }}>{ci.date}</span>
                              <span style={{ fontSize: 10, color: '#6b7280' }}>{ci.author}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#3b82f6', marginLeft: 'auto' }}>{ci.progress}%</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.4 }}>{ci.note}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Action row */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                  {GOAL_STATUSES.filter(s => s !== goal.status).map(s => (
                    <button
                      key={s}
                      onClick={() => { updateGoalInPlan(goal.planId, goal.id, { status: s }); addNotification({ type: 'success', title: 'Goal Updated', message: `Status changed to ${s}` }); }}
                      style={{
                        fontSize: 9, padding: '3px 8px', borderRadius: 4,
                        border: '1px solid var(--border)', background: '#fff',
                        color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      → {s}
                    </button>
                  ))}
                  <button
                    onClick={() => openCheckIn(goal)}
                    style={{
                      fontSize: 9, padding: '3px 10px', borderRadius: 4,
                      border: '1px solid #c7d2fe', background: '#eef2ff',
                      color: '#4f46e5', fontWeight: 700, cursor: 'pointer', marginLeft: 'auto',
                    }}
                  >
                    📝 Add Check-in
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Check-in modal */}
      {checkInGoal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setCheckInGoal(null); }}
        >
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>📝 Add Goal Check-In</div>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                {checkInGoal.clientName} — {checkInGoal.domain}
              </div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                {checkInGoal.description.slice(0, 70)}{checkInGoal.description.length > 70 ? '…' : ''}
              </div>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Date</label>
                  <input type="date" className="form-input" value={newCheckIn.date} onChange={e => setNewCheckIn(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Progress: {newCheckIn.progress}%</label>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={newCheckIn.progress}
                    onChange={e => setNewCheckIn(p => ({ ...p, progress: parseInt(e.target.value) }))}
                    style={{ width: '100%', height: 6, borderRadius: 3, appearance: 'none', background: `linear-gradient(to right, #7c3aed ${newCheckIn.progress}%, #e2e8f0 ${newCheckIn.progress}%)`, cursor: 'pointer', marginTop: 8 }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Session Note *</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={newCheckIn.note}
                  onChange={e => setNewCheckIn(p => ({ ...p, note: e.target.value }))}
                  placeholder="Describe progress, barriers, interventions used, and plan for next session…"
                />
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setCheckInGoal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={addCheckIn} disabled={!newCheckIn.note.trim()}>📝 Save Check-In</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
