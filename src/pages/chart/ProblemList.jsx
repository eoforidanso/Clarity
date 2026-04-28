import React, { useState } from 'react';
import { usePatient } from '../../contexts/PatientContext';

export default function ProblemList({ patientId }) {
  const { problemList, addProblem } = usePatient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', status: 'Active', onsetDate: '', diagnosedBy: '' });

  const problems = problemList[patientId] || [];
  const active = problems.filter(p => p.status === 'Active');
  const resolved = problems.filter(p => p.status !== 'Active');

  const handleAdd = () => {
    if (!form.code.trim() || !form.description.trim()) return;
    addProblem(patientId, form);
    setForm({ code: '', description: '', status: 'Active', onsetDate: '', diagnosedBy: '' });
    setShowAdd(false);
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
              <tr><th>ICD-10</th><th>Description</th><th>Status</th><th>Onset Date</th><th>Diagnosed By</th></tr>
            </thead>
            <tbody>
              {active.map((p) => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--primary)', fontWeight: 700, fontFamily: 'monospace' }}>{p.code}</td>
                  <td className="font-medium">{p.description}</td>
                  <td><span className="badge badge-danger">{p.status}</span></td>
                  <td className="text-sm">{p.onsetDate}</td>
                  <td className="text-sm text-muted">{p.diagnosedBy}</td>
                </tr>
              ))}
              {resolved.length > 0 && (
                <>
                  <tr><td colSpan={5} style={{ background: 'var(--bg)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>Resolved / In Remission</td></tr>
                  {resolved.map((p) => (
                    <tr key={p.id} style={{ opacity: 0.7 }}>
                      <td style={{ fontFamily: 'monospace' }}>{p.code}</td>
                      <td>{p.description}</td>
                      <td><span className="badge badge-success">{p.status}</span></td>
                      <td className="text-sm">{p.onsetDate}</td>
                      <td className="text-sm text-muted">{p.diagnosedBy}</td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
