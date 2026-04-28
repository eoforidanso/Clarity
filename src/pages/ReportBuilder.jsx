import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

const REPORT_TYPES = [
  { id: 'financial', label: '💰 Financial', desc: 'Revenue, collections, AR aging, payer mix' },
  { id: 'clinical',  label: '🩺 Clinical', desc: 'Diagnosis frequency, outcome measures, screenings' },
  { id: 'operational', label: '📊 Operational', desc: 'Appointments, no-shows, wait times, utilization' },
  { id: 'compliance', label: '🛡️ Compliance', desc: 'HIPAA audits, training, incident reports' },
  { id: 'quality',   label: '⭐ Quality', desc: 'HEDIS, MIPS, care gaps, patient satisfaction' },
  { id: 'custom',    label: '🛠️ Custom', desc: 'Build your own report from available data fields' },
];

const AVAILABLE_FIELDS = {
  financial: ['Charges', 'Payments', 'Adjustments', 'Outstanding Balance', 'Days in AR', 'Payer Name', 'Claim Status', 'CPT Code', 'ICD-10 Code', 'Service Date', 'Provider', 'Location'],
  clinical:  ['Patient Name', 'Diagnosis', 'Medication', 'PHQ-9 Score', 'GAD-7 Score', 'AUDIT-C Score', 'C-SSRS Level', 'Last Visit Date', 'Treatment Plan Status', 'Allergies', 'Vitals', 'Lab Results'],
  operational: ['Appointment Date', 'Appointment Type', 'Provider', 'Status (Scheduled/Completed/No-Show)', 'Check-in Time', 'Wait Time', 'Visit Duration', 'New vs Follow-up', 'Telehealth vs In-Person', 'Cancellation Reason'],
  compliance: ['Audit Date', 'Audit Type', 'User', 'Action', 'Resource Accessed', 'IP Address', 'BTG Invoked', 'Training Module', 'Completion Date', 'Incident Type'],
  quality: ['Measure Name', 'Numerator', 'Denominator', 'Performance Rate', 'Benchmark', 'Gap Status', 'Patient', 'Due Date', 'Completed Date', 'Provider'],
  custom: ['Patient Name', 'MRN', 'DOB', 'Insurance', 'Provider', 'Diagnosis', 'Medication', 'Appointment Date', 'Charges', 'Payments', 'PHQ-9 Score', 'Last Visit', 'Treatment Plan'],
};

const DATE_RANGES = ['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'Last 6 Months', 'Last 12 Months', 'Year to Date', 'Custom Range'];
const EXPORT_FORMATS = ['PDF', 'CSV', 'Excel', 'JSON'];

const SAVED_REPORTS = [
  { id: 'sr1', name: 'Monthly Revenue Summary', type: 'financial', schedule: 'Monthly — 1st of month', lastRun: '2026-04-01', createdBy: 'Dr. Chris Lee' },
  { id: 'sr2', name: 'PHQ-9 Compliance Report', type: 'quality', schedule: 'Weekly — Monday', lastRun: '2026-04-14', createdBy: 'Admin' },
  { id: 'sr3', name: 'No-Show Rate by Provider', type: 'operational', schedule: 'On Demand', lastRun: '2026-04-10', createdBy: 'Admin' },
  { id: 'sr4', name: 'AR Aging Over 90 Days', type: 'financial', schedule: 'Bi-weekly', lastRun: '2026-04-08', createdBy: 'Admin' },
  { id: 'sr5', name: 'HIPAA Audit Trail Export', type: 'compliance', schedule: 'Quarterly', lastRun: '2026-04-01', createdBy: 'Admin' },
  { id: 'sr6', name: 'Diagnosis Distribution', type: 'clinical', schedule: 'On Demand', lastRun: '2026-03-15', createdBy: 'Dr. Chris Lee' },
];

const MOCK_RESULTS = [
  { provider: 'Dr. Chris Lee', appointments: 142, completed: 128, noShows: 8, cancelRate: '4.2%', revenue: '$38,400', avgWait: '8 min' },
  { provider: 'April Torres, LCSW', appointments: 96, completed: 89, noShows: 4, cancelRate: '3.1%', revenue: '$14,240', avgWait: '5 min' },
  { provider: 'Nurse Kelly', appointments: 64, completed: 62, noShows: 1, cancelRate: '1.6%', revenue: '$6,200', avgWait: '3 min' },
];

export default function ReportBuilder() {
  const { currentUser } = useAuth();
  const [step, setStep] = useState('gallery'); // gallery, builder, results
  const [selectedType, setSelectedType] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [reportName, setReportName] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [savedReports, setSavedReports] = useState(SAVED_REPORTS);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleFreq, setScheduleFreq] = useState('On Demand');
  const [exportFmt, setExportFmt] = useState('PDF');

  const availableFields = selectedType ? AVAILABLE_FIELDS[selectedType.id] || [] : [];

  const toggleField = (field) => {
    setSelectedFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
  };

  const startBuilder = (type) => {
    setSelectedType(type);
    setSelectedFields([]);
    setReportName('');
    setStep('builder');
  };

  const runReport = () => {
    if (selectedFields.length === 0) { alert('Select at least one field.'); return; }
    setStep('results');
    setShowResults(true);
  };

  const saveReport = () => {
    if (!reportName.trim()) { alert('Give your report a name.'); return; }
    setSavedReports(prev => [...prev, {
      id: `sr-${Date.now()}`, name: reportName, type: selectedType?.id || 'custom',
      schedule: scheduleFreq, lastRun: new Date().toISOString().slice(0, 10),
      createdBy: currentUser?.name || 'User',
    }]);
    alert(`✅ Report "${reportName}" saved!`);
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>📊 Report Builder</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Create custom reports, schedule recurring exports, and analyze practice data</p>
        </div>
        {step !== 'gallery' && (
          <button className="btn btn-secondary" onClick={() => { setStep('gallery'); setShowResults(false); }}>← Back to Gallery</button>
        )}
      </div>

      {/* Gallery View */}
      {step === 'gallery' && (
        <>
          {/* Report Type Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {REPORT_TYPES.map(rt => (
              <div key={rt.id} onClick={() => startBuilder(rt)}
                style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 20, cursor: 'pointer', transition: 'all 0.2s', ':hover': { borderColor: 'var(--primary)' } }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{rt.label.split(' ')[0]}</div>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{rt.label.slice(3)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{rt.desc}</div>
              </div>
            ))}
          </div>

          {/* Saved Reports */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: 14 }}>📁 Saved Reports ({savedReports.length})</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
                  {['Report Name', 'Type', 'Schedule', 'Last Run', 'Created By', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {savedReports.map(sr => (
                  <tr key={sr.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>📋 {sr.name}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#e0e7ff', color: '#3730a3', textTransform: 'capitalize' }}>{sr.type}</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11 }}>{sr.schedule}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11 }}>{sr.lastRun}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11 }}>{sr.createdBy}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-primary" onClick={() => { setSelectedType(REPORT_TYPES.find(t => t.id === sr.type)); setStep('results'); setShowResults(true); setSelectedFields(AVAILABLE_FIELDS[sr.type]?.slice(0, 4) || []); }}>▶ Run</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => alert(`📤 Exporting "${sr.name}" as PDF...`)}>📤</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Builder View */}
      {step === 'builder' && selectedType && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
          {/* Field Selector */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{selectedType.label}</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Select fields for your report</div>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Available Fields</div>
              {availableFields.map(field => (
                <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: selectedFields.includes(field) ? 'var(--primary-light)' : 'transparent', marginBottom: 2 }}>
                  <input type="checkbox" checked={selectedFields.includes(field)} onChange={() => toggleField(field)} />
                  <span style={{ fontSize: 12, fontWeight: selectedFields.includes(field) ? 700 : 400 }}>{field}</span>
                </label>
              ))}
              <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                <button className="btn btn-sm btn-secondary" onClick={() => setSelectedFields(availableFields)}>Select All</button>
                <button className="btn btn-sm btn-secondary" onClick={() => setSelectedFields([])}>Clear</button>
              </div>
            </div>
          </div>

          {/* Config Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>⚙️ Report Configuration</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Report Name</label>
                  <input className="form-input" value={reportName} onChange={e => setReportName(e.target.value)} placeholder="e.g., Monthly Revenue Summary" />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Date Range</label>
                  <select className="form-input" value={dateRange} onChange={e => setDateRange(e.target.value)}>
                    {DATE_RANGES.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Export Format</label>
                  <select className="form-input" value={exportFmt} onChange={e => setExportFmt(e.target.value)}>
                    {EXPORT_FORMATS.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Schedule</label>
                  <select className="form-input" value={scheduleFreq} onChange={e => setScheduleFreq(e.target.value)}>
                    {['On Demand', 'Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Quarterly'].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Selected Fields Preview */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>📋 Selected Columns ({selectedFields.length})</div>
              {selectedFields.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Select fields from the left panel to build your report</div>
              ) : (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selectedFields.map((f, i) => (
                    <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: '#e0e7ff', color: '#3730a3', fontSize: 11, fontWeight: 600 }}>
                      {i + 1}. {f}
                      <button onClick={() => toggleField(f)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: 12, fontWeight: 800 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={saveReport}>💾 Save Report</button>
              <button className="btn btn-primary" onClick={runReport}>▶ Run Report</button>
            </div>
          </div>
        </div>
      )}

      {/* Results View */}
      {step === 'results' && showResults && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>📊 Report Results — {selectedType?.label || 'Report'} ({dateRange})</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-secondary" onClick={() => alert(`📤 Exporting as ${exportFmt}...`)}>📤 Export {exportFmt}</button>
              <button className="btn btn-sm btn-secondary" onClick={() => window.print()}>🖨️ Print</button>
            </div>
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Total Records', val: '302', change: '+12%' },
              { label: 'Total Revenue', val: '$58,840', change: '+8%' },
              { label: 'Avg per Provider', val: '$19,613', change: '+3%' },
              { label: 'Completion Rate', val: '92.4%', change: '+1.5%' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 700 }}>↑ {s.change}</div>
              </div>
            ))}
          </div>

          {/* Mini Chart */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>📈 Trend — Last 30 Days</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
              {[35, 42, 38, 55, 48, 62, 58, 70, 65, 78, 72, 85, 80, 88, 92, 75, 82, 90, 95, 88, 92, 98, 85, 90, 95, 100, 92, 88, 95, 98].map((v, i) => (
                <div key={i} style={{ flex: 1, height: `${v}%`, background: 'linear-gradient(to top, #3b82f6, #93c5fd)', borderRadius: '3px 3px 0 0', minWidth: 4 }} title={`Day ${i + 1}: ${v}`} />
              ))}
            </div>
          </div>

          {/* Results Table */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
                  {['Provider', 'Appointments', 'Completed', 'No-Shows', 'Cancel Rate', 'Revenue', 'Avg Wait'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_RESULTS.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{r.provider}</td>
                    <td style={{ padding: '12px 14px' }}>{r.appointments}</td>
                    <td style={{ padding: '12px 14px' }}>{r.completed}</td>
                    <td style={{ padding: '12px 14px', color: r.noShows > 5 ? '#dc2626' : 'inherit', fontWeight: r.noShows > 5 ? 700 : 400 }}>{r.noShows}</td>
                    <td style={{ padding: '12px 14px' }}>{r.cancelRate}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#059669' }}>{r.revenue}</td>
                    <td style={{ padding: '12px 14px' }}>{r.avgWait}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
