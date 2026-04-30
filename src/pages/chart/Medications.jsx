import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../../contexts/PatientContext';
import { useAuth } from '../../contexts/AuthContext';
import { medicationInsurance } from '../../data/mockData';
import { generateILPmpReport } from '../../utils/pmpMock';

// ── confirmation modal ─────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, confirmClass = 'btn-danger', onConfirm, onCancel, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: 24,
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 12, width: '100%', maxWidth: 440,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)', overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
        </div>
        <div style={{ padding: '16px 20px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {message}
          {children}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
          <button className={`btn btn-sm ${confirmClass}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── detail panel ───────────────────────────────────────────────────────
function MedDetail({ med, patientId, onClose }) {
  const { updateMedication, removeMedication, addInboxMessage } = usePatient();
  const { currentUser } = useAuth();

  const [confirm, setConfirm] = useState(null); // 'refill' | 'delete'
  const [refillQty, setRefillQty] = useState(30);
  const [refillNote, setRefillNote] = useState('');
  const [toast, setToast] = useState(null);
  const [detailTab, setDetailTab] = useState('details');

  const flash = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── refill ─────────────────────────────────────────────────────────
  const handleRefill = () => {
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toTimeString().slice(0, 5);

    const newEntry = {
      date: today,
      prescribedBy: currentUser?.name || 'Provider',
      pharmacy: med.pharmacy || 'Pharmacy on file',
      qty: refillQty,
      refillNumber: (med.rxHistory || []).filter(h => h.type === 'Refill' || h.type === 'Written Rx').length + 1,
      type: med.isControlled ? 'Written Rx' : 'Refill',
      note: refillNote || '',
    };

    updateMedication(patientId, med.id, {
      refillsLeft: (med.refillsLeft || 0) + 1,
      lastFilled: today,
      rxHistory: [newEntry, ...(med.rxHistory || [])],
    });

    // send to inbox as Rx Refill Request
    addInboxMessage({
      type: 'Rx Refill Request',
      from: `${currentUser?.name || 'Provider'} (System)`,
      to: currentUser?.id || 'u1',
      patient: patientId,
      patientName: null, // resolved in Inbox via patientId
      subject: `Refill Authorized: ${med.name} ${med.dose}`,
      body: `Refill authorized by ${currentUser?.name || 'Provider'}.\nMedication: ${med.name} ${med.dose}\nSIG: ${med.sig || ''}\nQty: #${refillQty}\nPharmacy: ${med.pharmacy || 'On file'}${refillNote ? `\nNote: ${refillNote}` : ''}`,
      date: today,
      time,
      priority: med.isControlled ? 'High' : 'Normal',
    });

    setConfirm(null);
    flash(`✅ Refill authorized for ${med.name}. Sent to Clinical Inbox.`);
  };

  // ── delete ─────────────────────────────────────────────────────────
  const handleDelete = () => {
    removeMedication(patientId, med.id);
    setConfirm(null);
    onClose();
  };

  // ── discontinue (soft-delete / status change) ──────────────────────
  const handleDiscontinue = () => {
    updateMedication(patientId, med.id, { status: 'Discontinued' });
    setConfirm(null);
    flash(`${med.name} marked as Discontinued.`);
  };

  const rows = [
    { label: 'Medication', val: med.name },
    { label: 'Dose', val: med.dose },
    { label: 'Route', val: med.route },
    { label: 'Frequency', val: med.frequency },
    { label: 'SIG', val: med.sig },
    { label: 'Prescriber', val: med.prescriber },
    { label: 'Start Date', val: med.startDate },
    { label: 'Pharmacy', val: med.pharmacy },
    { label: 'Last Filled', val: med.lastFilled || '—' },
    { label: 'Refills Remaining', val: med.refillsLeft ?? '—' },
    { label: 'Status', val: med.status },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 900 }}
        onClick={onClose}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: 'var(--surface)', zIndex: 910, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.18)', borderLeft: '1px solid var(--border)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>💊 {med.name}</div>
            <div className="text-sm text-muted" style={{ marginTop: 3 }}>{med.dose} · {med.frequency}</div>
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>✕</button>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            margin: '10px 16px 0', padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: toast.type === 'success' ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.1)',
            color: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.2)'}`,
          }}>
            {toast.msg}
          </div>
        )}

        {/* Badges */}
        <div style={{ padding: '12px 20px 0', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          <span className={`badge ${med.status === 'Active' ? 'badge-success' : 'badge-gray'}`}>{med.status}</span>
          {med.isControlled && <span className="badge badge-warning">🔒 Controlled — {med.schedule}</span>}
          {med.refillsLeft === 0 && <span className="badge badge-danger">⚠️ No Refills</span>}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, marginTop: 8 }}>
          {[['details', '📋 Details'], ['insurance', '🛡️ Insurance'], ['history', '📜 Rx History']].map(([key, label]) => (
            <button key={key} onClick={() => setDetailTab(key)} style={{
              flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 700,
              background: 'none', border: 'none', cursor: 'pointer',
              color: detailTab === key ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: `2px solid ${detailTab === key ? 'var(--primary)' : 'transparent'}`,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>{label}</button>
          ))}
        </div>

        {/* Details */}
        {detailTab === 'details' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map(({ label, val }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', gap: 12,
                paddingBottom: 9, borderBottom: '1px solid var(--border)', fontSize: 13,
              }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
                <span style={{ fontWeight: 500, textAlign: 'right', wordBreak: 'break-word' }}>{val ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Insurance */}
        {detailTab === 'insurance' && (() => {
          const ins = medicationInsurance[med.id];
          if (!ins) return (
            <div style={{ flex: 1, padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No insurance information on file for this medication.
            </div>
          );
          const insRows = [
            { label: 'Insurance', val: ins.insuranceName },
            { label: 'Member ID', val: ins.memberId },
            { label: 'Formulary Tier', val: ins.formularyTier },
            { label: 'Rx Copay', val: ins.rxCopay === 0 ? '$0.00' : `$${ins.rxCopay.toFixed(2)}` },
            { label: 'Prior Auth Required', val: ins.priorAuthRequired ? '✅ Yes' : '❌ No' },
            { label: 'Coverage Status', val: ins.coverageStatus },
            { label: 'Quantity Limit', val: ins.quantityLimit },
            { label: 'Step Therapy', val: ins.stepTherapyRequired ? '✅ Required' : '❌ Not Required' },
          ];
          return (
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {insRows.map(({ label, val }) => (
                  <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between', gap: 12,
                    paddingBottom: 9, borderBottom: '1px solid var(--border)', fontSize: 13,
                  }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
                    <span style={{ fontWeight: 500, textAlign: 'right', wordBreak: 'break-word' }}>{val}</span>
                  </div>
                ))}
              </div>
              {ins.coverageNotes && (
                <div style={{
                  marginTop: 14, padding: '10px 12px', borderRadius: 8, fontSize: 12,
                  background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
                  color: 'var(--text-secondary)', lineHeight: 1.6,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coverage Notes</div>
                  {ins.coverageNotes}
                </div>
              )}
            </div>
          );
        })()}

        {/* Rx History */}
        {detailTab === 'history' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
          {(med.rxHistory || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              No prescription history recorded.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(med.rxHistory || []).map((entry, i) => (
                <div key={i} style={{
                  padding: '11px 14px', borderRadius: 8, fontSize: 13,
                  border: `1px solid ${entry.type === 'New Prescription' ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
                  background: entry.type === 'New Prescription' ? 'rgba(59,130,246,0.05)' : 'var(--bg)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: entry.type === 'New Prescription' ? 'var(--primary)' : 'var(--text)' }}>
                      {entry.type === 'New Prescription' ? '🆕 ' : '🔄 '}{entry.type}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{entry.date}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <div><span style={{ fontWeight: 600 }}>Prescriber: </span>{entry.prescribedBy}</div>
                    <div><span style={{ fontWeight: 600 }}>Pharmacy: </span>{entry.pharmacy}</div>
                    <div><span style={{ fontWeight: 600 }}>Qty: </span>#{entry.qty} &nbsp;·&nbsp; <span style={{ fontWeight: 600 }}>Refill #: </span>{entry.refillNumber}</div>
                    {entry.note && <div style={{ marginTop: 4, fontStyle: 'italic', color: 'var(--text-muted)' }}>"{entry.note}"</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Actions */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0,
        }}>
          {/* Therapist — read-only notice */}
          {currentUser?.role === 'therapist' && (
            <div style={{ padding: '12px 14px', borderRadius: 8, background: '#fef3c7', border: '1px solid #fde68a', fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>🚫 Therapist — View Only</div>
              Therapists cannot prescribe, authorize refills, discontinue, or modify medications.
              To request a medication change, contact the prescribing provider via <strong>Staff Messaging</strong> or
              submit a refill request through the <strong>E-Prescribe</strong> page for provider assignment.
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Prescribe', 'Refill', 'Discontinue', 'Delete'].map(action => (
                  <span key={action} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                    background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.15)',
                  }}>
                    ✕ {action}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Front Desk — read-only notice */}
          {currentUser?.role === 'front_desk' && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#dbeafe', border: '1px solid #93c5fd', fontSize: 12, color: '#1e40af', lineHeight: 1.5 }}>
              🚫 <strong>Front desk staff cannot prescribe medications or modify medication records.</strong><br />
              Use the <strong>E-Prescribe</strong> page to assign refill requests to a licensed provider for review and authorization.
            </div>
          )}

          {/* Refill — prescribers only */}
          {med.status === 'Active' && currentUser?.role === 'prescriber' && (
            <button className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => setConfirm('refill')}>
              🔄 Authorize Refill
            </button>
          )}

          {/* Discontinue — not available to therapists or front desk */}
          {med.status === 'Active' && currentUser?.role !== 'therapist' && currentUser?.role !== 'front_desk' && (
            <button className="btn"
              style={{ width: '100%', background: 'rgba(217,119,6,0.1)', color: '#d97706', border: '1px solid rgba(217,119,6,0.3)' }}
              onClick={() => setConfirm('discontinue')}>
              ⛔ Discontinue Medication
            </button>
          )}

          {/* Delete — not available to therapists or front desk */}
          {currentUser?.role !== 'therapist' && currentUser?.role !== 'front_desk' && (
            <button className="btn"
              style={{ width: '100%', background: 'rgba(220,38,38,0.07)', color: 'var(--danger)', border: '1px solid rgba(220,38,38,0.2)' }}
              onClick={() => setConfirm('delete')}>
              🗑️ Delete Medication Record
            </button>
          )}
        </div>
      </div>

      {/* ── Refill confirmation ── */}
      {confirm === 'refill' && (
        <ConfirmModal
          title="🔄 Authorize Refill"
          confirmLabel="✅ Confirm Refill"
          confirmClass="btn-primary"
          onConfirm={handleRefill}
          onCancel={() => setConfirm(null)}
          message={`You are authorizing a refill for:`}
        >
          <div style={{
            margin: '10px 0', padding: '10px 12px', borderRadius: 8,
            background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 13,
          }}>
            <div style={{ fontWeight: 700 }}>{med.name} {med.dose}</div>
            <div className="text-muted text-sm">{med.frequency} · {med.pharmacy || 'Pharmacy on file'}</div>
            {med.isControlled && (
              <div className="badge badge-warning" style={{ marginTop: 6, display: 'inline-block' }}>
                ⚠️ Controlled Substance — {med.schedule}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ fontSize: 12 }}>Qty to dispense</label>
              <input className="form-input" type="number" min={1} max={365}
                value={refillQty} onChange={(e) => setRefillQty(Number(e.target.value))}
                style={{ fontSize: 13 }} />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Note (optional)</label>
            <input className="form-input" type="text" placeholder="e.g., 90-day supply, send to CVS..."
              value={refillNote} onChange={(e) => setRefillNote(e.target.value)}
              style={{ fontSize: 13 }} />
          </div>
        </ConfirmModal>
      )}

      {/* ── Discontinue confirmation ── */}
      {confirm === 'discontinue' && (
        <ConfirmModal
          title="⛔ Discontinue Medication"
          message={`Mark ${med.name} ${med.dose} as discontinued? It will move to the inactive medications list and will not be available for new prescriptions. This can be reversed by editing the record.`}
          confirmLabel="Discontinue"
          confirmClass="btn-warning"
          onConfirm={handleDiscontinue}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* ── Delete confirmation ── */}
      {confirm === 'delete' && (
        <ConfirmModal
          title="🗑️ Delete Medication Record"
          message={`Permanently delete ${med.name} ${med.dose} from this patient's medication list? This action cannot be undone.`}
          confirmLabel="Delete Permanently"
          confirmClass="btn-danger"
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}

// ── IL PMP Modal ───────────────────────────────────────────────────────
function ILPmpModal({ patient, controlledMeds, onClose }) {
  const firstControlled = controlledMeds[0];
  const [selectedMedName, setSelectedMedName] = useState(firstControlled?.name || '');
  const [pmpData, setPmpData]     = useState(null);
  const [pmpLoading, setPmpLoading] = useState(false);
  const [queried, setQueried]     = useState(false);

  const runQuery = (medName) => {
    setPmpData(null);
    setPmpLoading(true);
    setQueried(true);
    const med = controlledMeds.find(m => m.name === medName) || controlledMeds[0];
    setTimeout(() => {
      setPmpData(generateILPmpReport(patient, medName, med?.schedule || 'Schedule II'));
      setPmpLoading(false);
    }, 1100);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 760, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#4338ca,#6366f1)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 26 }}>🏛️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: '#fff', fontSize: 15 }}>Illinois Prescription Monitoring Program (IL PMP)</div>
            <div style={{ fontSize: 11, color: '#c7d2fe' }}>Patient: {patient?.firstName} {patient?.lastName} · DOB: {patient?.dob}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', display: 'block', marginBottom: 4 }}>Controlled Substance</label>
              <select
                style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13 }}
                value={selectedMedName}
                onChange={e => setSelectedMedName(e.target.value)}>
                {controlledMeds.map(m => (
                  <option key={m.id} value={m.name}>{m.name} — {m.schedule}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => runQuery(selectedMedName)}
              disabled={pmpLoading}
              style={{ padding: '9px 18px', borderRadius: 8, background: '#4338ca', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0, opacity: pmpLoading ? 0.6 : 1 }}>
              {pmpLoading ? '⏳ Querying…' : '🔍 Query IL PMP'}
            </button>
          </div>

          {!queried && (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: '#6b7280' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏛️</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Query the Illinois PMP Registry</div>
              <div style={{ fontSize: 13 }}>Select a controlled substance and click Query IL PMP to retrieve this patient's dispensing history.</div>
            </div>
          )}

          {queried && pmpLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0' }}>
              <div style={{ width: 22, height: 22, border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 14, color: '#6366f1', fontWeight: 600 }}>Querying Illinois PMP registry…</span>
            </div>
          )}

          {pmpData && !pmpLoading && (() => {
            const pd = pmpData;
            return (
              <>
                {/* Meta */}
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748b', marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>Query ID: <strong>{pd.queryId}</strong></span>
                  <span>Date: <strong>{pd.queryDate} {pd.queryTime}</strong></span>
                  <span style={{ padding: '2px 8px', borderRadius: 12, background: '#dcfce7', color: '#166534', fontWeight: 700 }}>✅ Query Complete</span>
                </div>

                {/* Risk + stats */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                  <div style={{ background: pd.risk.bg, border: `2px solid ${pd.risk.border}`, borderRadius: 10, padding: '10px 16px', textAlign: 'center', minWidth: 110 }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: pd.risk.color }}>{pd.risk.score}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: pd.risk.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>NarxScore</div>
                    <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: `${pd.risk.color}20`, color: pd.risk.color }}>{pd.risk.level} Risk</div>
                  </div>
                  {[
                    { label: 'Prescribers (90d)', val: pd.stats.prescribers90, warn: pd.stats.prescribers90 > 1 },
                    { label: 'Pharmacies (90d)',  val: pd.stats.pharmacies90,  warn: pd.stats.pharmacies90  > 1 },
                    { label: 'Fills (90d)',       val: pd.stats.fills90,        warn: false },
                    { label: 'Fills (12 mo)',     val: pd.stats.fills365,       warn: false },
                  ].map(s => (
                    <div key={s.label} style={{ flex: '1 1 80px', background: s.warn ? '#fef3c7' : '#f8fafc', border: `1px solid ${s.warn ? '#fcd34d' : '#e2e8f0'}`, borderRadius: 8, padding: '9px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.warn ? '#d97706' : '#1e293b' }}>{s.val}</div>
                      <div style={{ fontSize: 10, color: s.warn ? '#92400e' : '#64748b', fontWeight: s.warn ? 700 : 400 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Alerts */}
                {pd.alerts.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    {pd.alerts.map((a, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, fontWeight: 600, padding: '8px 12px', borderRadius: 7, marginBottom: 5,
                        background: a.severity === 'danger' ? '#fee2e2' : '#fef9c3',
                        color: a.severity === 'danger' ? '#dc2626' : '#92400e',
                        border: `1px solid ${a.severity === 'danger' ? '#fca5a5' : '#fde68a'}` }}>
                        <span style={{ flexShrink: 0 }}>{a.severity === 'danger' ? '🚨' : '⚠️'}</span>
                        {a.text}
                      </div>
                    ))}
                  </div>
                )}

                {/* No alerts */}
                {pd.alerts.length === 0 && (
                  <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#166534', fontWeight: 600, marginBottom: 14 }}>
                    ✅ No alerts — no concerning patterns detected in the IL PMP for this patient.
                  </div>
                )}

                {/* Fill history */}
                <div style={{ fontSize: 12, fontWeight: 700, color: '#4338ca', marginBottom: 6 }}>Controlled Substance Fill History ({pd.fills.length} records)</div>
                <div style={{ overflowX: 'auto', border: '1px solid #e0e7ff', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#e0e7ff' }}>
                        {['Date', 'Drug', 'Schedule', 'Prescriber', 'Pharmacy', 'Qty', 'Days'].map(h => (
                          <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: '#3730a3', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pd.fills.map((f, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e0e7ff', background: i % 2 === 0 ? '#fff' : '#f8faff' }}>
                          <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{f.date}</td>
                          <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1e40af' }}>{f.drug}</td>
                          <td style={{ padding: '6px 10px', color: '#dc2626', fontWeight: 700 }}>{f.schedule}</td>
                          <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{f.prescriber}</td>
                          <td style={{ padding: '6px 10px' }}>{f.pharmacy.split('—')[0].trim()}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>{f.qty}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right' }}>{f.daysSupply}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────
export default function Medications({ patientId }) {
  const { meds, patients } = usePatient();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const isTherapist = currentUser?.role === 'therapist';
  const isFrontDesk = currentUser?.role === 'front_desk';

  const [selectedMed, setSelectedMed] = useState(null);
  const [showPmp, setShowPmp]         = useState(false);

  const patient = patients?.find(p => p.id === patientId);
  const patientMeds = meds[patientId] || [];
  const active   = patientMeds.filter(m => m.status === 'Active');
  const inactive = patientMeds.filter(m => m.status !== 'Active');
  const controlledActive = active.filter(m => m.isControlled);

  return (
    <div>
      {showPmp && controlledActive.length > 0 && (
        <ILPmpModal
          patient={patient}
          controlledMeds={controlledActive}
          onClose={() => setShowPmp(false)}
        />
      )}
      <div className="card">
        <div className="card-header">
          <h2>💊 Medications ({active.length} active)</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {controlledActive.length > 0 && (
              <button
                onClick={() => setShowPmp(true)}
                style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: 'linear-gradient(135deg,#4338ca,#6366f1)', color: '#fff', border: 'none',
                  display: 'flex', alignItems: 'center', gap: 5 }}>
                🏛️ Query IL PMP
              </button>
            )}
            {!isTherapist && !isFrontDesk && (
              <button className="btn btn-sm btn-primary" onClick={() => navigate('/prescribe')}>
                + New Prescription
              </button>
            )}
          </div>
        </div>
        <div className="card-body no-pad">
          <table className="data-table">
            <thead>
              <tr>
                <th>Medication</th>
                <th>Dose</th>
                <th>SIG</th>
                <th>Prescriber</th>
                <th>Start Date</th>
                <th>Pharmacy</th>
                <th>Refills</th>
                <th>Status</th>
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {active.map((m) => (
                <tr key={m.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedMed(m)}
                >
                  <td>
                    <div className="font-semibold">{m.name}</div>
                    {m.isControlled && (
                      <span className="badge badge-warning" style={{ marginTop: 4, fontSize: 10 }}>
                        🔒 {m.schedule}
                      </span>
                    )}
                  </td>
                  <td className="font-medium">{m.dose}</td>
                  <td className="text-sm" style={{ maxWidth: 200 }}>{m.sig}</td>
                  <td className="text-sm">{m.prescriber}</td>
                  <td className="text-sm">{m.startDate}</td>
                  <td className="text-sm">{m.pharmacy}</td>
                  <td>
                    <span className={m.refillsLeft === 0 ? 'text-danger font-bold' : ''}>
                      {m.refillsLeft ?? '—'}
                    </span>
                  </td>
                  <td><span className="badge badge-success">{m.status}</span></td>
                  <td>
                    <button className="btn btn-sm btn-primary"
                      style={{ fontSize: 11 }}
                      onClick={(e) => { e.stopPropagation(); setSelectedMed(m); }}>
                      Open
                    </button>
                  </td>
                </tr>
              ))}

              {inactive.length > 0 && (
                <>
                  <tr>
                    <td colSpan={9} style={{ background: 'var(--bg)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>
                      Inactive / Discontinued Medications
                    </td>
                  </tr>
                  {inactive.map((m) => (
                    <tr key={m.id}
                      style={{ opacity: 0.6, cursor: 'pointer' }}
                      onClick={() => setSelectedMed(m)}
                    >
                      <td>{m.name}</td>
                      <td>{m.dose}</td>
                      <td className="text-sm">{m.sig}</td>
                      <td className="text-sm">{m.prescriber}</td>
                      <td className="text-sm">{m.startDate}</td>
                      <td className="text-sm">{m.pharmacy}</td>
                      <td>{m.refillsLeft ?? '—'}</td>
                      <td><span className="badge badge-gray">{m.status}</span></td>
                      <td>
                        <button className="btn btn-sm"
                          style={{ fontSize: 11 }}
                          onClick={(e) => { e.stopPropagation(); setSelectedMed(m); }}>
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {patientMeds.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state" style={{ padding: 32 }}>
                      <span className="icon">💊</span>
                      <p>No medications on file</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMed && (
        <MedDetail
          med={patientMeds.find(m => m.id === selectedMed.id) || selectedMed}
          patientId={patientId}
          onClose={() => setSelectedMed(null)}
        />
      )}
    </div>
  );
}

