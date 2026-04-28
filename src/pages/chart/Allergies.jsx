import React, { useState } from 'react';
import { usePatient } from '../../contexts/PatientContext';

export default function Allergies({ patientId }) {
  const { allergies, addAllergy } = usePatient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ allergen: '', type: 'Medication', reaction: '', severity: 'Moderate', status: 'Active', onsetDate: '', source: 'Patient Reported' });

  const patientAllergies = allergies[patientId] || [];

  const handleAdd = () => {
    if (!form.allergen.trim()) return;
    addAllergy(patientId, form);
    setForm({ allergen: '', type: 'Medication', reaction: '', severity: 'Moderate', status: 'Active', onsetDate: '', source: 'Patient Reported' });
    setShowAdd(false);
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>⚠️ Allergies ({patientAllergies.length})</h2>
          <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(!showAdd)}>
            + Add Allergy
          </button>
        </div>

        {showAdd && (
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
                <th>Allergen</th><th>Type</th><th>Reaction</th><th>Severity</th><th>Status</th><th>Onset</th><th>Source</th>
              </tr>
            </thead>
            <tbody>
              {patientAllergies.map((a) => (
                <tr key={a.id}>
                  <td className="font-semibold">{a.allergen}</td>
                  <td><span className="badge badge-gray">{a.type}</span></td>
                  <td>{a.reaction || '—'}</td>
                  <td>
                    <span className={`badge ${a.severity === 'Severe' ? 'badge-danger' : a.severity === 'Moderate' ? 'badge-warning' : 'badge-success'}`}>
                      {a.severity || '—'}
                    </span>
                  </td>
                  <td><span className="badge badge-info">{a.status}</span></td>
                  <td className="text-sm">{a.onsetDate || '—'}</td>
                  <td className="text-sm text-muted">{a.source}</td>
                </tr>
              ))}
              {patientAllergies.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No allergies recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
