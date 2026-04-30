import React, { useState } from 'react';
import { usePatient } from '../../contexts/PatientContext';

export default function Allergies({ patientId }) {
  const { allergies, addAllergy, updateAllergy, removeAllergy } = usePatient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ allergen: '', type: 'Medication', reaction: '', severity: 'Moderate', status: 'Active', onsetDate: '', source: 'Patient Reported' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [nkda, setNkda] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const patientAllergies = allergies[patientId] || [];

  const handleAdd = () => {
    if (!form.allergen.trim()) return;
    addAllergy(patientId, form);
    setForm({ allergen: '', type: 'Medication', reaction: '', severity: 'Moderate', status: 'Active', onsetDate: '', source: 'Patient Reported' });
    setShowAdd(false);
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditForm({ allergen: a.allergen, type: a.type, reaction: a.reaction || '', severity: a.severity, status: a.status, onsetDate: a.onsetDate || '', source: a.source });
  };

  const saveEdit = () => {
    updateAllergy(patientId, editingId, editForm);
    setEditingId(null);
  };

  const sevBadge = (s) => s === 'Severe' ? 'badge-danger' : s === 'Moderate' ? 'badge-warning' : 'badge-success';

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>⚠️ Allergies ({patientAllergies.length})</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* NKDA toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={nkda}
                onChange={e => { setNkda(e.target.checked); if (e.target.checked) setShowAdd(false); }}
                style={{ width: 14, height: 14 }}
              />
              <span style={{ color: nkda ? '#166534' : '#64748b' }}>
                {nkda ? '✅ NKDA' : 'NKDA'}
              </span>
            </label>
            {!nkda && (
              <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(!showAdd)}>
                + Add Allergy
              </button>
            )}
          </div>
        </div>

        {nkda && (
          <div style={{ padding: '12px 18px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', fontSize: 13, fontWeight: 600, color: '#166534' }}>
            ✅ No Known Drug Allergies (NKDA) documented for this patient.
          </div>
        )}

        {showAdd && !nkda && (
          <div className="card-body" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Allergen *</label>
                <input className="form-input" value={form.allergen} onChange={(e) => setForm({ ...form, allergen: e.target.value })} placeholder="e.g. Penicillin" />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option>Medication</option><option>Food</option><option>Environmental</option><option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Severity</label>
                <select className="form-select" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                  <option>Mild</option><option>Moderate</option><option>Severe</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Reaction</label>
                <input className="form-input" value={form.reaction} onChange={(e) => setForm({ ...form, reaction: e.target.value })} placeholder="e.g. Hives, Anaphylaxis" />
              </div>
              <div className="form-group">
                <label className="form-label">Onset Date</label>
                <input type="date" className="form-input" value={form.onsetDate} onChange={(e) => setForm({ ...form, onsetDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Source</label>
                <select className="form-select" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  <option>Patient Reported</option><option>Clinician Verified</option><option>External Record</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-primary" onClick={handleAdd}>Save Allergy</button>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="card-body no-pad">
          <table className="data-table">
            <thead>
              <tr>
                <th>Allergen</th><th>Type</th><th>Reaction</th><th>Severity</th><th>Status</th><th>Onset</th><th>Source</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patientAllergies.map((a) => {
                const isEditing = editingId === a.id;
                return (
                  <tr key={a.id} style={{ background: isEditing ? '#f0f9ff' : 'transparent' }}>
                    <td className="font-semibold">
                      {isEditing
                        ? <input className="form-input" style={{ fontSize: 12 }} value={editForm.allergen} onChange={e => setEditForm(f => ({ ...f, allergen: e.target.value }))} />
                        : a.allergen}
                    </td>
                    <td>
                      {isEditing
                        ? <select className="form-select" style={{ fontSize: 12 }} value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}>
                            <option>Medication</option><option>Food</option><option>Environmental</option><option>Other</option>
                          </select>
                        : <span className="badge badge-gray">{a.type}</span>}
                    </td>
                    <td>
                      {isEditing
                        ? <input className="form-input" style={{ fontSize: 12 }} value={editForm.reaction} onChange={e => setEditForm(f => ({ ...f, reaction: e.target.value }))} />
                        : a.reaction || '—'}
                    </td>
                    <td>
                      {isEditing
                        ? <select className="form-select" style={{ fontSize: 12 }} value={editForm.severity} onChange={e => setEditForm(f => ({ ...f, severity: e.target.value }))}>
                            <option>Mild</option><option>Moderate</option><option>Severe</option>
                          </select>
                        : <span className={`badge ${sevBadge(a.severity)}`}>{a.severity || '—'}</span>}
                    </td>
                    <td>
                      {isEditing
                        ? <select className="form-select" style={{ fontSize: 12 }} value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                            <option>Active</option><option>Inactive</option>
                          </select>
                        : <span className="badge badge-info">{a.status}</span>}
                    </td>
                    <td className="text-sm">
                      {isEditing
                        ? <input type="date" className="form-input" style={{ fontSize: 12 }} value={editForm.onsetDate} onChange={e => setEditForm(f => ({ ...f, onsetDate: e.target.value }))} />
                        : a.onsetDate || '—'}
                    </td>
                    <td className="text-sm text-muted">
                      {isEditing
                        ? <select className="form-select" style={{ fontSize: 12 }} value={editForm.source} onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))}>
                            <option>Patient Reported</option><option>Clinician Verified</option><option>External Record</option>
                          </select>
                        : a.source}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm btn-primary" style={{ fontSize: 10 }} onClick={saveEdit}>💾</button>
                          <button className="btn btn-sm btn-secondary" style={{ fontSize: 10 }} onClick={() => setEditingId(null)}>✕</button>
                        </div>
                      ) : confirmDelete === a.id ? (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 600 }}>Remove?</span>
                          <button className="btn btn-sm btn-danger" style={{ fontSize: 10, background: '#dc2626', color: '#fff', border: 'none' }}
                            onClick={() => { removeAllergy(patientId, a.id); setConfirmDelete(null); }}>Yes</button>
                          <button className="btn btn-sm btn-secondary" style={{ fontSize: 10 }} onClick={() => setConfirmDelete(null)}>No</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm btn-secondary" style={{ fontSize: 10 }} onClick={() => startEdit(a)}>✏️</button>
                          <button className="btn btn-sm btn-secondary" style={{ fontSize: 10, color: '#dc2626' }} onClick={() => setConfirmDelete(a.id)} title="Remove">🗑️</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {patientAllergies.length === 0 && !nkda && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No allergies recorded — mark NKDA if confirmed</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
