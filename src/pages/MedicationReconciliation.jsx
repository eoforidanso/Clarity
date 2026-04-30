import React, { useState, useMemo } from 'react';
import { usePatient } from '../contexts/PatientContext';
import { useAuth } from '../contexts/AuthContext';

const MED_SOURCES = ['Patient Reported', 'EHR Active', 'Pharmacy Import', 'Inpatient MAR', 'External Record'];
const REC_ACTIONS = ['Continue', 'Discontinue', 'Dose Change', 'New Rx', 'Held', 'Substitution'];
const REC_STATUS  = ['Pending', 'Reviewed', 'Reconciled', 'Discrepancy'];
const STATUS_CLR = {
  Pending:      { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  Reviewed:     { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
  Reconciled:   { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  Discrepancy:  { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
};

const MOCK_MEDS = [
  { id: 'm1', name: 'Sertraline (Zoloft)', dose: '100 mg', freq: 'QD', route: 'PO', source: 'EHR Active', patientReports: 'Taking as prescribed', action: 'Continue', status: 'Reconciled', prescriber: 'Dr. Chris Lee', lastFill: '2026-03-28', notes: '' },
  { id: 'm2', name: 'Bupropion XL (Wellbutrin)', dose: '150 mg', freq: 'QAM', route: 'PO', source: 'EHR Active', patientReports: 'Taking — reports insomnia', action: 'Continue', status: 'Reviewed', prescriber: 'Dr. Chris Lee', lastFill: '2026-04-01', notes: 'Monitor insomnia, may reduce to 100 mg if persists' },
  { id: 'm3', name: 'Trazodone', dose: '50 mg', freq: 'QHS PRN', route: 'PO', source: 'Patient Reported', patientReports: 'Got from PCP for sleep', action: '', status: 'Discrepancy', prescriber: 'Dr. External PCP', lastFill: '2026-03-15', notes: 'Not in EHR — need to verify with PCP and add' },
  { id: 'm4', name: 'Alprazolam (Xanax)', dose: '0.5 mg', freq: 'BID PRN', route: 'PO', source: 'Pharmacy Import', patientReports: 'Only takes occasionally — maybe 2x/week', action: '', status: 'Discrepancy', prescriber: 'Dr. External PCP', lastFill: '2026-04-05', notes: 'PDMP shows 60 tabs filled 4/5. Discuss with patient re: benzo taper.' },
  { id: 'm5', name: 'Lisinopril', dose: '10 mg', freq: 'QD', route: 'PO', source: 'External Record', patientReports: 'Taking daily', action: 'Continue', status: 'Reconciled', prescriber: 'Dr. Heart Clinic', lastFill: '2026-03-20', notes: 'Managed by cardiology — no changes' },
  { id: 'm6', name: 'Hydroxyzine', dose: '25 mg', freq: 'TID PRN', route: 'PO', source: 'EHR Active', patientReports: 'Stopped taking — wasn\'t helping', action: '', status: 'Pending', prescriber: 'Dr. Chris Lee', lastFill: '2026-01-10', notes: '' },
  { id: 'm7', name: 'Melatonin', dose: '5 mg', freq: 'QHS', route: 'PO', source: 'Patient Reported', patientReports: 'OTC supplement for sleep', action: 'Continue', status: 'Reviewed', prescriber: 'OTC', lastFill: '', notes: 'No interactions with current regimen' },
  { id: 'm8', name: 'Aripiprazole (Abilify)', dose: '5 mg', freq: 'QD', route: 'PO', source: 'EHR Active', patientReports: 'Discontinued on own 2 weeks ago — weight gain', action: '', status: 'Discrepancy', prescriber: 'Dr. Chris Lee', lastFill: '2026-03-01', notes: 'Patient self-discontinued. Need to discuss risks of abrupt cessation and alternatives.' },
];

export default function MedicationReconciliation() {
  const { currentUser } = useAuth();
  const { patients } = usePatient();
  const [meds, setMeds] = useState(MOCK_MEDS);
  const [selectedPt] = useState('James Anderson');
  const [view, setView] = useState('all'); // all, discrepancies, pending
  const [selectedMed, setSelectedMed] = useState(null);
  const [editAction, setEditAction] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [reconcileError, setReconcileError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  const filtered = useMemo(() => {
    if (view === 'discrepancies') return meds.filter(m => m.status === 'Discrepancy');
    if (view === 'pending')       return meds.filter(m => m.status === 'Pending' || m.status === 'Discrepancy');
    return meds;
  }, [meds, view]);

  const stats = useMemo(() => ({
    total: meds.length,
    reconciled: meds.filter(m => m.status === 'Reconciled').length,
    discrepancies: meds.filter(m => m.status === 'Discrepancy').length,
    pending: meds.filter(m => m.status === 'Pending').length,
  }), [meds]);

  const openEdit = (med) => {
    setSelectedMed(med);
    setEditAction(med.action || '');
    setEditNotes(med.notes || '');
  };

  const saveEdit = () => {
    if (!selectedMed) return;
    setMeds(prev => prev.map(m => m.id === selectedMed.id ? {
      ...m,
      action: editAction,
      notes: editNotes,
      status: editAction ? 'Reviewed' : m.status,
    } : m));
    setSelectedMed(null);
  };

  const reconcileMed = (id) => {
    setMeds(prev => prev.map(m => m.id === id ? { ...m, status: 'Reconciled' } : m));
  };

  const reconcileAll = () => {
    const unresolved = meds.filter(m => m.status !== 'Reconciled' && !m.action);
    if (unresolved.length > 0) {
      setReconcileError(`${unresolved.length} medication(s) still need an action assigned before completing.`);
      setTimeout(() => setReconcileError(''), 4000);
      return;
    }
    setReconcileError('');
    setMeds(prev => prev.map(m => ({ ...m, status: 'Reconciled' })));
    setShowCompleteModal(true);
  };

  const pctDone = stats.total ? Math.round((stats.reconciled / stats.total) * 100) : 0;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>💊 Medication Reconciliation</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Compare, verify, and reconcile medications from all sources — CMS-required at every transition of care</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" disabled={syncing || synced} onClick={() => { setSyncing(true); setTimeout(() => { setSyncing(false); setSynced(true); setTimeout(() => setSynced(false), 3000); }, 1800); }}>
            {syncing ? '⏳ Syncing…' : synced ? '✅ Synced' : '🔄 Pharmacy Sync'}
          </button>
          <button className="btn btn-primary" onClick={reconcileAll}>✅ Complete Reconciliation</button>
        </div>
      </div>

      {reconcileError && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, border: '1px solid #fca5a5', fontSize: 13, fontWeight: 600 }}>
          ⚠️ {reconcileError}
        </div>
      )}

      {/* Patient Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', borderRadius: 14, padding: '16px 22px', marginBottom: 18, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>👤 {selectedPt}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>MRN-001 · DOB 1985-07-12 · Encounter: Office Visit 4/15/2026</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{pctDone}%</div>
          <div style={{ fontSize: 10, opacity: 0.8 }}>Reconciliation Complete</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '💊', val: stats.total, label: 'Total Meds', bg: '#eff6ff' },
          { icon: '✅', val: stats.reconciled, label: 'Reconciled', bg: '#dcfce7' },
          { icon: '⚠️', val: stats.discrepancies, label: 'Discrepancies', bg: '#fee2e2' },
          { icon: '🔄', val: stats.pending, label: 'Pending', bg: '#fef3c7' },
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

      {/* View tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {[['all', 'All Medications'], ['discrepancies', `⚠️ Discrepancies (${stats.discrepancies})`], ['pending', `🔄 Needs Review (${stats.pending + stats.discrepancies})`]].map(([k, lbl]) => (
          <button key={k} className={`btn btn-sm ${view === k ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView(k)}>{lbl}</button>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pctDone}%`, background: pctDone === 100 ? '#22c55e' : '#3b82f6', borderRadius: 4, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* Med Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
              {['Medication', 'Dose / Freq', 'Source', 'Patient Reports', 'Action', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(med => {
              const sc = STATUS_CLR[med.status];
              return (
                <tr key={med.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', background: med.status === 'Discrepancy' ? '#fef2f2' : 'transparent' }}
                  onClick={() => openEdit(med)}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700 }}>{med.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Rx: {med.prescriber}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div>{med.dose} {med.route}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{med.freq}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: med.source === 'Patient Reported' ? '#fef3c7' : med.source === 'Pharmacy Import' ? '#dbeafe' : '#f1f5f9', color: 'var(--text-secondary)' }}>{med.source}</span>
                  </td>
                  <td style={{ padding: '12px 14px', maxWidth: 180 }}>
                    <div style={{ fontSize: 11, lineHeight: 1.4 }}>{med.patientReports}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {med.action ? (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: med.action === 'Discontinue' ? '#fee2e2' : med.action === 'Continue' ? '#dcfce7' : '#e0e7ff', color: med.action === 'Discontinue' ? '#991b1b' : med.action === 'Continue' ? '#166534' : '#3730a3' }}>{med.action}</span>
                    ) : <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>⚠️ Needs Action</span>}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: sc.bg, color: sc.color }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />{med.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {med.status !== 'Reconciled' && (
                      <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); reconcileMed(med.id); }} style={{ fontSize: 10 }}>✅ Reconcile</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Med Modal */}
      {selectedMed && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedMed(null); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: selectedMed.status === 'Discrepancy' ? 'linear-gradient(135deg, #dc2626, #ef4444)' : 'linear-gradient(135deg, #1e40af, #3b82f6)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{selectedMed.status === 'Discrepancy' ? '⚠️ ' : '💊 '}{selectedMed.name}</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>{selectedMed.dose} {selectedMed.route} {selectedMed.freq} · {selectedMed.source}</div>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ marginBottom: 14, padding: 12, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Patient Reports</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{selectedMed.patientReports}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Last Fill</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{selectedMed.lastFill || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Prescriber</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{selectedMed.prescriber}</div>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Reconciliation Action</label>
                <select className="form-input" value={editAction} onChange={e => setEditAction(e.target.value)}>
                  <option value="">— Select Action —</option>
                  {REC_ACTIONS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Clinical Notes</label>
                <textarea className="form-textarea" rows={3} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Rationale, patient discussion, instructions..." />
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setSelectedMed(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>💾 Save & Mark Reviewed</button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowCompleteModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 380, padding: 30, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontWeight: 800, marginBottom: 6 }}>Reconciliation Complete</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>All {stats.total} medications have been reviewed and reconciled for {selectedPt}.</p>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>
              Reconciled by {currentUser?.name || 'Provider'} on {new Date().toLocaleDateString()}
            </div>
            <button className="btn btn-primary" onClick={() => setShowCompleteModal(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
