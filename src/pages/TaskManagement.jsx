import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

const TASK_STATUSES = ['To Do', 'In Progress', 'Blocked', 'Completed', 'Cancelled'];
const STATUS_COLORS = {
  'To Do':       { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
  'In Progress': { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
  Blocked:       { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  Completed:     { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  Cancelled:     { bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8' },
};
const PRIORITY_LEVELS = ['Critical', 'High', 'Normal', 'Low'];
const PRIORITY_COLORS = {
  Critical: { bg: '#fee2e2', color: '#991b1b' },
  High:     { bg: '#fef3c7', color: '#92400e' },
  Normal:   { bg: '#dbeafe', color: '#1e40af' },
  Low:      { bg: '#f1f5f9', color: '#475569' },
};
const CATEGORIES = ['Clinical', 'Administrative', 'Billing', 'Follow-Up', 'Compliance', 'Lab/Order', 'Referral', 'Other'];

const TEAM_MEMBERS = [
  { id: 'u1', name: 'Dr. Chris Lee', role: 'Psychiatrist', avatar: '👨‍⚕️' },
  { id: 'u2', name: 'Kelly Nguyen', role: 'Nurse', avatar: '👩‍⚕️' },
  { id: 'u3', name: 'Front Desk Staff', role: 'Front Desk', avatar: '🏥' },
  { id: 'u4', name: 'April Torres', role: 'Therapist', avatar: '👩‍⚕️' },
  { id: 'u5', name: 'Billing Team', role: 'Billing', avatar: '💰' },
];

const MOCK_TASKS = [
  { id: 't-1', title: 'Review abnormal lab — James Anderson lithium level', description: 'Lithium level 1.3 mEq/L (high). Evaluate for toxicity symptoms and adjust dose.', category: 'Clinical', priority: 'Critical', status: 'To Do', assignee: 'u1', createdBy: 'u2', patientName: 'James Anderson', dueDate: '2026-04-15', createdDate: '2026-04-14', completedDate: '', comments: [{ author: 'Kelly Nguyen', text: 'Lab came back flagged high. Patient called and reports tremor and nausea.', date: '2026-04-14' }] },
  { id: 't-2', title: 'Prior auth follow-up — Maria Garcia neuropsych testing', description: 'Aetna requested additional clinical documentation for neuropsych testing PA. Need to send GAD-7 and PHQ-9 scores.', category: 'Referral', priority: 'High', status: 'In Progress', assignee: 'u3', createdBy: 'u1', patientName: 'Maria Garcia', dueDate: '2026-04-16', createdDate: '2026-04-12', completedDate: '', comments: [] },
  { id: 't-3', title: 'Complete MIPS reporting for Q1', description: 'Finalize quality measure reporting for CMS MIPS. Deadline approaching.', category: 'Compliance', priority: 'High', status: 'In Progress', assignee: 'u3', createdBy: 'u1', patientName: '', dueDate: '2026-04-18', createdDate: '2026-04-10', completedDate: '', comments: [] },
  { id: 't-4', title: 'Call patient — Robert Chen medication side effects', description: 'Patient reported dizziness and fatigue after starting Venlafaxine 75mg. Follow up to assess.', category: 'Follow-Up', priority: 'High', status: 'To Do', assignee: 'u2', createdBy: 'u1', patientName: 'Robert Chen', dueDate: '2026-04-15', createdDate: '2026-04-14', completedDate: '', comments: [] },
  { id: 't-5', title: 'Submit denied claim appeal — Ashley Kim', description: 'Cigna denied 90837 session. Appeal with updated treatment plan and medical necessity letter.', category: 'Billing', priority: 'Normal', status: 'To Do', assignee: 'u5', createdBy: 'u3', patientName: 'Ashley Kim', dueDate: '2026-04-20', createdDate: '2026-04-13', completedDate: '', comments: [] },
  { id: 't-6', title: 'Onboard new patient — intake forms', description: 'Dorothy Wilson referred from cardiology. Send intake packet and verify insurance.', category: 'Administrative', priority: 'Normal', status: 'Completed', assignee: 'u3', createdBy: 'u2', patientName: 'Dorothy Wilson', dueDate: '2026-04-12', createdDate: '2026-04-10', completedDate: '2026-04-12', comments: [{ author: 'Front Desk Staff', text: 'Intake forms sent via portal. Insurance verified — Medicare Part B active.', date: '2026-04-12' }] },
  { id: 't-7', title: 'Co-sign therapy note — April Torres', description: 'Supervisory co-sign needed for LCSW therapy note from 4/11.', category: 'Clinical', priority: 'Normal', status: 'To Do', assignee: 'u1', createdBy: 'u4', patientName: 'Ashley Kim', dueDate: '2026-04-16', createdDate: '2026-04-11', completedDate: '', comments: [] },
  { id: 't-8', title: 'Credential renewal — DEA license', description: 'DEA license expires 5/30/2026. Begin renewal process.', category: 'Compliance', priority: 'Low', status: 'To Do', assignee: 'u1', createdBy: 'u3', patientName: '', dueDate: '2026-05-15', createdDate: '2026-04-01', completedDate: '', comments: [] },
];

export default function TaskManagement() {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [filterStatus, setFilterStatus] = useState('Active');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterAssignee, setFilterAssignee] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [addForm, setAddForm] = useState({ title: '', description: '', category: 'Clinical', priority: 'Normal', assignee: '', patientName: '', dueDate: '' });

  const filtered = useMemo(() => {
    let list = [...tasks];
    if (filterStatus === 'Active') list = list.filter(t => !['Completed', 'Cancelled'].includes(t.status));
    else if (filterStatus !== 'All') list = list.filter(t => t.status === filterStatus);
    if (filterCategory !== 'All') list = list.filter(t => t.category === filterCategory);
    if (filterAssignee !== 'All') list = list.filter(t => t.assignee === filterAssignee);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.patientName.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      const pOrder = { Critical: 0, High: 1, Normal: 2, Low: 3 };
      if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }, [tasks, filterStatus, filterCategory, filterAssignee, search]);

  const stats = useMemo(() => {
    const active = tasks.filter(t => !['Completed', 'Cancelled'].includes(t.status));
    return {
      total: active.length,
      overdue: active.filter(t => new Date(t.dueDate) < new Date()).length,
      critical: active.filter(t => t.priority === 'Critical').length,
      myTasks: active.filter(t => t.assignee === (currentUser?.id || 'u1')).length,
      completedToday: tasks.filter(t => t.status === 'Completed' && t.completedDate === new Date().toISOString().slice(0, 10)).length,
    };
  }, [tasks, currentUser]);

  const updateTask = (id, updates) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    if (selectedTask?.id === id) setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
  };

  const addComment = (id) => {
    if (!newComment.trim()) return;
    setTasks(prev => prev.map(t => t.id === id ? {
      ...t, comments: [...t.comments, { author: currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : 'You', text: newComment, date: new Date().toISOString().slice(0, 10) }]
    } : t));
    setNewComment('');
  };

  const addTask = () => {
    if (!addForm.title) return;
    const task = {
      id: `t-${Date.now()}`, ...addForm, status: 'To Do',
      createdBy: currentUser?.id || 'u1', createdDate: new Date().toISOString().slice(0, 10),
      completedDate: '', comments: [],
    };
    setTasks(prev => [task, ...prev]);
    setShowAdd(false);
    setAddForm({ title: '', description: '', category: 'Clinical', priority: 'Normal', assignee: '', patientName: '', dueDate: '' });
  };

  const isOverdue = (task) => task.status !== 'Completed' && task.status !== 'Cancelled' && new Date(task.dueDate) < new Date();

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>✅ Task Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Assign, track, and complete clinical and administrative tasks across your team</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>➕ New Task</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '📋', val: stats.total, label: 'Active Tasks', bg: '#eff6ff' },
          { icon: '🔴', val: stats.overdue, label: 'Overdue', bg: '#fee2e2' },
          { icon: '🚨', val: stats.critical, label: 'Critical', bg: '#fef3c7' },
          { icon: '👤', val: stats.myTasks, label: 'My Tasks', bg: '#dbeafe' },
          { icon: '✅', val: stats.completedToday, label: 'Done Today', bg: '#dcfce7' },
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
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="form-input" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 180, fontSize: 13 }} />
        <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 130, fontSize: 12 }}>
          <option value="Active">Active</option>
          <option value="All">All</option>
          {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-input" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ width: 130, fontSize: 12 }}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-input" value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} style={{ width: 150, fontSize: 12 }}>
          <option value="All">All Assignees</option>
          {TEAM_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {/* Task list + detail */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedTask ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>{filtered.length} Task{filtered.length !== 1 ? 's' : ''}</div>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {filtered.map(task => {
              const sc = STATUS_COLORS[task.status];
              const pc = PRIORITY_COLORS[task.priority];
              const overdue = isOverdue(task);
              const assignee = TEAM_MEMBERS.find(m => m.id === task.assignee);
              return (
                <div key={task.id} onClick={() => setSelectedTask(task)}
                  style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedTask?.id === task.id ? 'var(--primary-light)' : overdue ? '#fef2f2' : 'transparent', transition: 'background 0.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {task.status === 'Completed' ? '✅' : task.priority === 'Critical' ? '🔴' : '⬜'} {task.title}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: pc.bg, color: pc.color }}>{task.priority}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: sc.bg, color: sc.color }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />{task.status}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>{assignee?.avatar} {assignee?.name || 'Unassigned'}</span>
                    {task.patientName && <span>👤 {task.patientName}</span>}
                    <span style={{ color: overdue ? '#dc2626' : 'inherit', fontWeight: overdue ? 700 : 400 }}>📅 {task.dueDate}{overdue ? ' ⚠️ OVERDUE' : ''}</span>
                    {task.comments.length > 0 && <span>💬 {task.comments.length}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        {selectedTask && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{selectedTask.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{selectedTask.category}{selectedTask.patientName ? ` · ${selectedTask.patientName}` : ''}</div>
                </div>
                <button onClick={() => setSelectedTask(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>
            </div>
            <div style={{ padding: 20, overflowY: 'auto', maxHeight: 460 }}>
              <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16, padding: 12, background: 'var(--bg)', borderRadius: 8 }}>{selectedTask.description}</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                {[
                  ['Status', selectedTask.status], ['Priority', selectedTask.priority],
                  ['Assignee', TEAM_MEMBERS.find(m => m.id === selectedTask.assignee)?.name || 'Unassigned'],
                  ['Due Date', selectedTask.dueDate],
                  ['Created', selectedTask.createdDate], ['Completed', selectedTask.completedDate || '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Status actions */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {selectedTask.status !== 'Completed' && <button className="btn btn-primary btn-sm" onClick={() => updateTask(selectedTask.id, { status: 'Completed', completedDate: new Date().toISOString().slice(0, 10) })}>✅ Complete</button>}
                {selectedTask.status === 'To Do' && <button className="btn btn-secondary btn-sm" onClick={() => updateTask(selectedTask.id, { status: 'In Progress' })}>▶️ Start</button>}
                {selectedTask.status === 'In Progress' && <button className="btn btn-secondary btn-sm" onClick={() => updateTask(selectedTask.id, { status: 'Blocked' })}>🚫 Block</button>}
                {selectedTask.status === 'Blocked' && <button className="btn btn-secondary btn-sm" onClick={() => updateTask(selectedTask.id, { status: 'In Progress' })}>▶️ Unblock</button>}
              </div>

              {/* Comments */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Comments ({selectedTask.comments.length})</div>
                {selectedTask.comments.map((c, i) => (
                  <div key={i} style={{ padding: 10, background: 'var(--bg)', borderRadius: 8, marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{c.author}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.date}</span>
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.5 }}>{c.text}</div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input className="form-input" placeholder="Add a comment..." value={newComment} onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addComment(selectedTask.id); }}
                    style={{ flex: 1, fontSize: 12 }} />
                  <button className="btn btn-primary btn-sm" onClick={() => addComment(selectedTask.id)} disabled={!newComment.trim()}>💬</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>➕ New Task</div>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Task Title *</label>
                <input className="form-input" value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} placeholder="What needs to be done?" />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Description</label>
                <textarea className="form-textarea" rows={2} value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Category</label>
                  <select className="form-input" value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Priority</label>
                  <select className="form-input" value={addForm.priority} onChange={e => setAddForm(f => ({ ...f, priority: e.target.value }))}>
                    {PRIORITY_LEVELS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Assign To</label>
                  <select className="form-input" value={addForm.assignee} onChange={e => setAddForm(f => ({ ...f, assignee: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {TEAM_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Due Date</label>
                  <input type="date" className="form-input" value={addForm.dueDate} onChange={e => setAddForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Related Patient</label>
                <input className="form-input" value={addForm.patientName} onChange={e => setAddForm(f => ({ ...f, patientName: e.target.value }))} placeholder="Patient name (optional)" />
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addTask} disabled={!addForm.title}>📋 Create Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
