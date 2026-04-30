import React, { useState } from 'react';
import { usePatient } from '../../contexts/PatientContext';

export default function Vitals({ patientId }) {
  const { vitalSigns, addVitals } = usePatient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    bp: '', hr: '', rr: '', temp: '', spo2: '', weight: '', height: '', bmi: '', pain: '', takenBy: ''
  });

  const patientVitals = vitalSigns[patientId] || [];

  const calculateBMI = (w, h) => {
    if (w && h) {
      const bmi = ((w / (h * h)) * 703).toFixed(1);
      return bmi;
    }
    return '';
  };

  const handleWeightChange = (val) => {
    const f = { ...form, weight: val };
    if (val && form.height) f.bmi = calculateBMI(parseFloat(val), parseFloat(form.height));
    setForm(f);
  };

  const handleHeightChange = (val) => {
    const f = { ...form, height: val };
    if (form.weight && val) f.bmi = calculateBMI(parseFloat(form.weight), parseFloat(val));
    setForm(f);
  };

  const handleAdd = () => {
    if (!form.bp) return;
    addVitals(patientId, {
      ...form,
      hr: parseInt(form.hr, 10) || 0,
      rr: parseInt(form.rr, 10) || 0,
      temp: parseFloat(form.temp) || 0,
      spo2: parseInt(form.spo2, 10) || 0,
      weight: parseFloat(form.weight) || 0,
      height: parseFloat(form.height) || 0,
      bmi: parseFloat(form.bmi) || 0,
      pain: parseInt(form.pain, 10) || 0,
    });
    setForm({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      bp: '', hr: '', rr: '', temp: '', spo2: '', weight: '', height: '', bmi: '', pain: '', takenBy: ''
    });
    setShowAdd(false);
  };

  const getBPClass = (bp) => {
    if (!bp) return '';
    const sys = parseInt(bp.split('/')[0], 10);
    if (sys >= 140) return 'text-danger font-bold';
    if (sys >= 130) return 'text-warning font-bold';
    return '';
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>💓 Vital Signs ({patientVitals.length} entries)</h2>
          <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(!showAdd)}>
            + Record Vitals
          </button>
        </div>

        {showAdd && (
          <div className="card-body" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Time</label>
                <input type="time" className="form-input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Blood Pressure *</label>
                <input className="form-input" value={form.bp} onChange={(e) => setForm({ ...form, bp: e.target.value })} placeholder="120/80" />
              </div>
              <div className="form-group">
                <label className="form-label">Heart Rate</label>
                <input type="number" className="form-input" value={form.hr} onChange={(e) => setForm({ ...form, hr: e.target.value })} placeholder="bpm" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Resp Rate</label>
                <input type="number" className="form-input" value={form.rr} onChange={(e) => setForm({ ...form, rr: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Temp (°F)</label>
                <input type="number" step="0.1" className="form-input" value={form.temp} onChange={(e) => setForm({ ...form, temp: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">SpO2 (%)</label>
                <input type="number" className="form-input" value={form.spo2} onChange={(e) => setForm({ ...form, spo2: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Pain (0-10)</label>
                <input type="number" min="0" max="10" className="form-input" value={form.pain} onChange={(e) => setForm({ ...form, pain: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Weight (lbs)</label>
                <input type="number" className="form-input" value={form.weight} onChange={(e) => handleWeightChange(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Height (in)</label>
                <input type="number" className="form-input" value={form.height} onChange={(e) => handleHeightChange(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">BMI (auto)</label>
                <input className="form-input" value={form.bmi} readOnly style={{ background: '#f1f5f9' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Taken By</label>
                <input className="form-input" value={form.takenBy} onChange={(e) => setForm({ ...form, takenBy: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-primary" onClick={handleAdd}>Save Vitals</button>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="card-body no-pad">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date/Time</th><th>BP</th><th>HR</th><th>RR</th><th>Temp</th><th>SpO2</th><th>Weight</th><th>BMI</th><th>Pain</th><th>By</th>
              </tr>
            </thead>
            <tbody>
              {patientVitals.map((v) => (
                <tr key={v.id}>
                  <td className="font-medium">{v.date} {v.time}</td>
                  <td className={getBPClass(v.bp)}>{v.bp}</td>
                  <td>{v.hr} <span className="text-muted text-xs">bpm</span></td>
                  <td>{v.rr}</td>
                  <td>{v.temp}°F</td>
                  <td>{v.spo2}%</td>
                  <td>{v.weight} <span className="text-muted text-xs">lbs</span></td>
                  <td>{v.bmi}</td>
                  <td>
                    <span style={{ 
                      fontWeight: 700, 
                      color: v.pain >= 7 ? 'var(--danger)' : v.pain >= 4 ? 'var(--warning)' : 'var(--success)' 
                    }}>
                      {v.pain}/10
                    </span>
                  </td>
                  <td className="text-sm text-muted">{v.takenBy}</td>
                </tr>
              ))}
              {patientVitals.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No vitals recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
