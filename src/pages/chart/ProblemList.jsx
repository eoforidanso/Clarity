import React, { useState } from 'react';
import { usePatient } from '../../contexts/PatientContext';

export default function ProblemList({ patientId }) {
  const { problemList, addProblem, updateProblem } = usePatient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', status: 'Active', onsetDate: '', diagnosedBy: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const problems = problemList[patientId] || [];
  const active = problems.filter(p => p.status === 'Active');
  const resolved = problems.filter(p => p.status !== 'Active');

  const handleAdd = () => {
    if (!form.code.trim() || !form.description.trim()) return;
    addProblem(patientId, form);
    setForm({ code: '', description: '', status: 'Active', onsetDate: '', diagnosedBy: '' });
    setShowAdd(false);
  };

  const startEdit = (prob) => {
    setEditingId(prob.id);
    setEditForm({ code: prob.code, description: prob.description, status: prob.status, onsetDate: prob.onsetDate || '', diagnosedBy: prob.diagnosedBy || '' });
  };

  const saveEdit = () => {
    updateProblem(patientId, editingId, editForm);
    setEditingId(null);
  };

  const quickStatus = (prob, status) => updateProblem(patientId, prob.id, { status });

  const statusBadge = (s) => s === 'Active' ? 'badge-danger' : s === 'In Remission' ? 'badge-warning' : 'badge-success';

  const ProbRow = ({ prob, dimmed }) => {
    const isEditing = editingId === prob.id;
    return (
      <>
        <tr style={{ opacity: dimmed ? 0.65 : 1, background: isEditing ? '#f0f9ff' : 'transparent' }}>
          <td style={{ color: 'var(--primary)', fontWeight: 700, fontFamily: 'monospace' }}>
            {isEditing
              ? <input className="form-input" style={{ width: 90, fontSize: 12 }} value={editForm.code} onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))} />
              : prob.code}
          </td>
          <td className="font-medium">
            {isEditing
              ? <input className="form-input" style={{ fontSize: 12 }} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
              : prob.description}
          </td>
          <td>
            {isEditing
              ? <select className="form-select" style={{ fontSize: 12 }} value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  <option>Active</option><option>In Remission</option><option>Resolved</option>
                </select>
              : <span className={`badge ${statusBadge(prob.status)}`}>{prob.status}</span>}
          </td>
          <td className="text-sm">
            {isEditing
              ? <input type="date" className="form-input" style={{ fontSize: 12 }} value={editForm.onsetDate} onChange={e => setEditForm(f => ({ ...f, onsetDate: e.target.value }))} />
              : prob.onsetDate}
          </td>
          <td className="text-sm text-muted">
            {isEditing
              ? <input className="form-input" style={{ fontSize: 12 }} value={editForm.diagnosedBy} onChange={e => setEditForm(f => ({ ...f, diagnosedBy: e.target.value }))} />
              : prob.diagnosedBy}
          </td>
          <td style={{ whiteSpace: 'nowrap' }}>
            {isEditing ? (
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-sm btn-primary" style={{ fontSize: 10 }} onClick={saveEdit}>💾</button>
                <button className="btn btn-sm btn-secondary" style={{ fontSize: 10 }} onClick={() => setEditingId(null)}>✕</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-sm btn-secondary" style={{ fontSize: 10 }} onClick={() => startEdit(prob)}>✏️</button>
                {prob.status === 'Active' && (
                  <button className="btn btn-sm btn-secondary" style={{ fontSize: 10 }} onClick={() => quickStatus(prob, 'Resolved')} title="Mark Resolved">✅</button>
                )}
                {prob.status === 'Active' && (
                  <button className="btn btn-sm btn-secondary" style={{ fontSize: 10 }} onClick={() => quickStatus(prob, 'In Remission')} title="Mark In Remission">💤</button>
                )}
                {prob.status !== 'Active' && (
                  <button className="btn btn-sm btn-secondary" style={{ fontSize: 10 }} onClick={() => quickStatus(prob, 'Active')} title="Reactivate">↩️</button>
                )}
              </div>
            )}
          </td>
        </tr>
      </>
    );
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>🩺 Problem List ({active.length} active)</h2>
          <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(!showAdd)}>
            + Add Problem
          </button>
        </div>

        {showAdd && (
          <div className="card-body" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">ICD-10 Code *</label>
                <input className="form-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. F33.1" />
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Major Depressive Disorder" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option>Active</option><option>In Remission</option><option>Resolved</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Onset Date</label>
                <input type="date" className="form-input" value={form.onsetDate} onChange={(e) => setForm({ ...form, onsetDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Diagnosed By</label>
                <input className="form-input" value={form.diagnosedBy} onChange={(e) => setForm({ ...form, diagnosedBy: e.target.value })} placeholder="Provider name" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-primary" onClick={handleAdd}>Save Problem</button>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="card-body no-pad">
          <table className="data-table">
            <thead>
              <tr><th>ICD-10</th><th>Description</th><th>Status</th><th>Onset Date</th><th>Diagnosed By</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {active.map((prob) => <ProbRow key={prob.id} prob={prob} dimmed={false} />)}
              {resolved.length > 0 && (
                <>
                  <tr>
                    <td colSpan={6} style={{ background: 'var(--bg)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>
                      Resolved / In Remission
                    </td>
                  </tr>
                  {resolved.map((prob) => <ProbRow key={prob.id} prob={prob} dimmed={true} />)}
                </>
              )}
              {problems.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No problems recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
