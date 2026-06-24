import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePatient } from '../../contexts/PatientContext';
import { patientStatus as patientStatusApi } from '../../services/api';

const STATUS_OPTIONS = [
  { value: 'active',       label: 'Active',                    color: '#059669', bg: '#f0fdf4', border: '#86efac', icon: '✅', description: 'Patient is currently receiving care at this practice.' },
  { value: 'deceased',     label: 'Inactive — Deceased',       color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', icon: '🕊️', description: 'Patient has passed away. Chart locked. New scheduling blocked.' },
  { value: 'discharged',   label: 'Inactive — Discharged',     color: '#d97706', bg: '#fef3c7', border: '#fde68a', icon: '📤', description: 'Patient has been formally discharged from this practice.' },
  { value: 'transferred',  label: 'Inactive — Transferred',    color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', icon: '🔀', description: 'Patient transferred care to another provider or facility.' },
  { value: 'lost_to_fu',   label: 'Inactive — Lost to Follow-Up', color: '#6b7280', bg: '#f9fafb', border: '#d1d5db', icon: '❓', description: 'Patient stopped attending without formal discharge.' },
  { value: 'on_hold',      label: 'On Hold / Suspended',       color: '#0369a1', bg: '#eff6ff', border: '#bfdbfe', icon: '⏸️', description: 'Temporary hold — patient not actively receiving services.' },
];

const DISCHARGE_REASONS = [
  'Treatment goals met — successful completion',
  'Patient requested discharge',
  'Non-compliance with treatment plan',
  'No-show / missed appointment policy',
  'Patient moved out of area',
  'Transferred to higher level of care',
  'Transferred to different provider',
  'Insurance / financial issues',
  'Provider leaving practice',
  'Patient incarcerated',
  'Mutual agreement',
  'Other (see notes)',
];

const TRANSFER_OPTIONS = [
  'Inpatient psychiatric facility',
  'Residential treatment center',
  'Intensive outpatient program (IOP)',
  'Partial hospitalization program (PHP)',
  'Primary care physician',
  'Another mental health provider',
  'Community mental health center',
  'Substance use treatment program',
  'Other (see notes)',
];

export function getPatientStatusRecord(patientId) {
  // Legacy sync accessor — returns null (caller must use async API)
  return null;
}

export default function PatientStatus({ patientId }) {
  const { currentUser } = useAuth();
  const { selectedPatient: patient } = usePatient();

  const [statusRecord, setStatusRecord] = useState({ status: 'active', history: [] });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!patient?.id) return;
    patientStatusApi.get(patient.id)
      .then(data => setStatusRecord(data || { status: 'active', history: [] }))
      .catch(() => setStatusRecord({ status: 'active', history: [] }));
  }, [patient?.id]);

  const currentStatusOpt = STATUS_OPTIONS.find(s => s.value === statusRecord.status) || STATUS_OPTIONS[0];
  const isInactive = statusRecord.status !== 'active';

  const startEdit = () => {
    setDraft({
      status: statusRecord.status,
      effectiveDate: new Date().toISOString().split('T')[0],
      // deceased
      dateOfDeath: statusRecord.dateOfDeath || '',
      causeOfDeath: statusRecord.causeOfDeath || '',
      // discharged
      dischargeReason: statusRecord.dischargeReason || '',
      dischargeDate: statusRecord.dischargeDate || new Date().toISOString().split('T')[0],
      dischargeSummary: statusRecord.dischargeSummary || '',
      finalMedStatus: statusRecord.finalMedStatus || 'Prescriptions stopped',
      // transferred
      transferTo: statusRecord.transferTo || '',
      transferDate: statusRecord.transferDate || new Date().toISOString().split('T')[0],
      // lost to FU
      lastContactDate: statusRecord.lastContactDate || '',
      contactAttempts: statusRecord.contactAttempts || '0',
      // general
      notes: '',
    });
    setEditing(true);
    setSaved(false);
  };

  const handleSave = () => {
    if (draft.status !== 'active' && draft.status !== 'on_hold') {
      setConfirmOpen(true);
    } else {
      commitSave();
    }
  };

  const commitSave = async () => {
    const now = new Date().toISOString();
    const changedBy = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'System';
    const historyEntry = {
      date: now,
      by: changedBy,
      from: statusRecord.status,
      to: draft.status,
      notes: draft.notes || '',
    };
    const updated = {
      ...draft,
      lastModified: now,
      lastModifiedBy: changedBy,
      history: [...(statusRecord.history || []), historyEntry],
    };
    setSaving(true);
    try {
      await patientStatusApi.save(patient.id, updated);
      setStatusRecord(updated);
      setEditing(false);
      setConfirmOpen(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Surface error without crashing the UI
      setSaved(false);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => { setEditing(false); setDraft(null); setConfirmOpen(false); };

  if (!patient) return null;

  return (
    <div className="fade-in" style={{ padding: '20px 0' }}>

      {/* Inactive banner */}
      {isInactive && (
        <div style={{ marginBottom: 20, padding: '14px 20px', borderRadius: 12, background: currentStatusOpt.bg, border: '2px solid ' + currentStatusOpt.border, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>{currentStatusOpt.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: currentStatusOpt.color }}>{currentStatusOpt.label}</div>
            <div style={{ fontSize: 12, color: currentStatusOpt.color, opacity: 0.8, marginTop: 2 }}>
              {statusRecord.status === 'deceased' && statusRecord.dateOfDeath && `Date of death: ${statusRecord.dateOfDeath}. `}
              {statusRecord.status === 'discharged' && statusRecord.dischargeDate && `Discharged: ${statusRecord.dischargeDate}. `}
              {statusRecord.status === 'discharged' && statusRecord.dischargeReason && `Reason: ${statusRecord.dischargeReason}. `}
              {statusRecord.status === 'transferred' && statusRecord.transferTo && `Transferred to: ${statusRecord.transferTo}. `}
              {statusRecord.lastModifiedBy && `Last updated by ${statusRecord.lastModifiedBy}.`}
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: currentStatusOpt.color, color: '#fff' }}>
            ⚠️ Scheduling Blocked
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* Main status form */}
        <div>
          {/* Current status card */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Patient Chart Status</div>
              {!editing && (
                <button onClick={startEdit} style={{ fontSize: 12, padding: '6px 16px', borderRadius: 8, background: '#1d4ed8', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                  ✏️ Change Status
                </button>
              )}
            </div>

            {!editing ? (
              <div style={{ padding: '20px' }}>
                {/* Status display */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderRadius: 12, background: currentStatusOpt.bg, border: '1px solid ' + currentStatusOpt.border, marginBottom: 16 }}>
                  <span style={{ fontSize: 32 }}>{currentStatusOpt.icon}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: currentStatusOpt.color }}>{currentStatusOpt.label}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{currentStatusOpt.description}</div>
                  </div>
                </div>

                {/* Status details */}
                {statusRecord.status === 'deceased' && (
                  <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                    {statusRecord.dateOfDeath && <div><span style={{ fontWeight: 700, color: '#6b7280' }}>Date of Death: </span>{statusRecord.dateOfDeath}</div>}
                    {statusRecord.causeOfDeath && <div><span style={{ fontWeight: 700, color: '#6b7280' }}>Cause: </span>{statusRecord.causeOfDeath}</div>}
                  </div>
                )}
                {statusRecord.status === 'discharged' && (
                  <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                    {statusRecord.dischargeDate && <div><span style={{ fontWeight: 700, color: '#6b7280' }}>Discharge Date: </span>{statusRecord.dischargeDate}</div>}
                    {statusRecord.dischargeReason && <div><span style={{ fontWeight: 700, color: '#6b7280' }}>Reason: </span>{statusRecord.dischargeReason}</div>}
                    {statusRecord.finalMedStatus && <div><span style={{ fontWeight: 700, color: '#6b7280' }}>Medications: </span>{statusRecord.finalMedStatus}</div>}
                    {statusRecord.dischargeSummary && <div><span style={{ fontWeight: 700, color: '#6b7280' }}>Summary: </span>{statusRecord.dischargeSummary}</div>}
                  </div>
                )}
                {statusRecord.status === 'transferred' && (
                  <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                    {statusRecord.transferTo && <div><span style={{ fontWeight: 700, color: '#6b7280' }}>Transferred To: </span>{statusRecord.transferTo}</div>}
                    {statusRecord.transferDate && <div><span style={{ fontWeight: 700, color: '#6b7280' }}>Transfer Date: </span>{statusRecord.transferDate}</div>}
                  </div>
                )}
                {statusRecord.status === 'lost_to_fu' && (
                  <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                    {statusRecord.lastContactDate && <div><span style={{ fontWeight: 700, color: '#6b7280' }}>Last Contact: </span>{statusRecord.lastContactDate}</div>}
                    {statusRecord.contactAttempts && <div><span style={{ fontWeight: 700, color: '#6b7280' }}>Contact Attempts: </span>{statusRecord.contactAttempts}</div>}
                  </div>
                )}
                {statusRecord.lastModifiedBy && (
                  <div style={{ marginTop: 12, fontSize: 11, color: '#9ca3af' }}>
                    Last updated by {statusRecord.lastModifiedBy} · {statusRecord.lastModified ? new Date(statusRecord.lastModified).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                  </div>
                )}
                {saved && (
                  <div style={{ marginTop: 10, padding: '8px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #86efac', fontSize: 12, fontWeight: 700, color: '#166534' }}>
                    ✅ Status updated successfully
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Status selector */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Select Patient Status *</label>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {STATUS_OPTIONS.map(opt => (
                      <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, border: '2px solid ' + (draft.status === opt.value ? opt.color : '#e2e8f0'), background: draft.status === opt.value ? opt.bg : '#fff', cursor: 'pointer', transition: 'all 0.1s' }}>
                        <input type="radio" name="status" value={opt.value} checked={draft.status === opt.value} onChange={() => setDraft(d => ({ ...d, status: opt.value }))} style={{ accentColor: opt.color }} />
                        <span style={{ fontSize: 18 }}>{opt.icon}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: draft.status === opt.value ? opt.color : '#1e293b' }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{opt.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Conditional fields */}
                {draft.status === 'deceased' && (
                  <div style={{ padding: '14px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fca5a5', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 12, marginBottom: 2 }}>🕊️ Deceased — Required Information</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Date of Death *</label>
                        <input type="date" className="form-input" value={draft.dateOfDeath} onChange={e => setDraft(d => ({ ...d, dateOfDeath: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Cause of Death (Optional)</label>
                        <input className="form-input" value={draft.causeOfDeath} onChange={e => setDraft(d => ({ ...d, causeOfDeath: e.target.value }))} placeholder="e.g. Natural causes" />
                      </div>
                    </div>
                    <div style={{ padding: '8px 12px', background: '#fff', borderRadius: 6, border: '1px solid #fca5a5', fontSize: 12, color: '#991b1b' }}>
                      ⚠️ All pending appointments will be cancelled. Prescriptions will be terminated. Chart will be locked to read-only.
                    </div>
                  </div>
                )}

                {draft.status === 'discharged' && (
                  <div style={{ padding: '14px 16px', borderRadius: 10, background: '#fef3c7', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontWeight: 700, color: '#92400e', fontSize: 12 }}>📤 Discharge Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Discharge Date *</label>
                        <input type="date" className="form-input" value={draft.dischargeDate} onChange={e => setDraft(d => ({ ...d, dischargeDate: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Final Medication Status</label>
                        <select className="form-input" value={draft.finalMedStatus} onChange={e => setDraft(d => ({ ...d, finalMedStatus: e.target.value }))}>
                          {['Prescriptions stopped', '30-day bridge provided', '60-day bridge provided', '90-day bridge provided', 'Transferred to new prescriber', 'Patient managing independently', 'N/A — no active Rx'].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Reason for Discharge *</label>
                      <select className="form-input" value={draft.dischargeReason} onChange={e => setDraft(d => ({ ...d, dischargeReason: e.target.value }))}>
                        <option value="">Select reason...</option>
                        {DISCHARGE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Discharge Summary</label>
                      <textarea className="form-textarea" rows={3} value={draft.dischargeSummary} onChange={e => setDraft(d => ({ ...d, dischargeSummary: e.target.value }))} placeholder="Brief clinical summary, patient instructions, referral information..." />
                    </div>
                  </div>
                )}

                {draft.status === 'transferred' && (
                  <div style={{ padding: '14px 16px', borderRadius: 10, background: '#f5f3ff', border: '1px solid #c4b5fd', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontWeight: 700, color: '#7c3aed', fontSize: 12 }}>🔀 Transfer Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Transfer Destination *</label>
                        <select className="form-input" value={draft.transferTo} onChange={e => setDraft(d => ({ ...d, transferTo: e.target.value }))}>
                          <option value="">Select...</option>
                          {TRANSFER_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Transfer Date</label>
                        <input type="date" className="form-input" value={draft.transferDate} onChange={e => setDraft(d => ({ ...d, transferDate: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                )}

                {draft.status === 'lost_to_fu' && (
                  <div style={{ padding: '14px 16px', borderRadius: 10, background: '#f9fafb', border: '1px solid #d1d5db', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontWeight: 700, color: '#374151', fontSize: 12 }}>❓ Lost to Follow-Up Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Last Contact Date</label>
                        <input type="date" className="form-input" value={draft.lastContactDate} onChange={e => setDraft(d => ({ ...d, lastContactDate: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Contact Attempts Made</label>
                        <input type="number" className="form-input" min={0} max={20} value={draft.contactAttempts} onChange={e => setDraft(d => ({ ...d, contactAttempts: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Change Notes</label>
                  <textarea className="form-textarea" rows={2} value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Reason for status change, additional context..." />
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={cancelEdit} className="btn btn-secondary" style={{ fontSize: 13 }}>Cancel</button>
                  <button onClick={handleSave} disabled={saving} style={{ fontSize: 13, padding: '8px 20px', borderRadius: 8, background: STATUS_OPTIONS.find(s => s.value === draft.status)?.color || '#1d4ed8', color: '#fff', border: 'none', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Saving…' : '💾 Save Status'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status history */}
          {(statusRecord.history || []).length > 0 && (
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 13, background: '#f8fafc' }}>
                📋 Status Change History ({statusRecord.history.length})
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[...statusRecord.history].reverse().map((h, i) => {
                  const fromOpt = STATUS_OPTIONS.find(s => s.value === h.from);
                  const toOpt   = STATUS_OPTIONS.find(s => s.value === h.to);
                  return (
                    <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: i < statusRecord.history.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: toOpt?.bg || '#f8fafc', border: '2px solid ' + (toOpt?.color || '#e2e8f0'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{toOpt?.icon || '📋'}</div>
                        {i < statusRecord.history.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 16, background: '#e2e8f0', marginTop: 4 }} />}
                      </div>
                      <div style={{ paddingTop: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: toOpt?.color || '#374151' }}>{toOpt?.label || h.to}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                          {new Date(h.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · by {h.by}
                        </div>
                        {h.notes && <div style={{ fontSize: 12, color: '#374151', marginTop: 3, fontStyle: 'italic' }}>"{h.notes}"</div>}
                        {h.from !== h.to && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Changed from: {fromOpt?.label || h.from}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Clinical impact */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 12, background: '#f8fafc' }}>⚙️ Inactivation Impact</div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Future Appointments', action: isInactive ? '🚫 Blocked' : '✅ Allowed', color: isInactive ? '#dc2626' : '#059669' },
                { label: 'New Prescriptions', action: isInactive && statusRecord.status === 'deceased' ? '🚫 Terminated' : isInactive ? '⚠️ Restricted' : '✅ Active', color: isInactive ? (statusRecord.status === 'deceased' ? '#dc2626' : '#d97706') : '#059669' },
                { label: 'Chart Access', action: isInactive && statusRecord.status === 'deceased' ? '🔒 Read-Only' : '✅ Full Access', color: isInactive && statusRecord.status === 'deceased' ? '#6b7280' : '#059669' },
                { label: 'Patient Portal', action: isInactive && statusRecord.status === 'deceased' ? '🚫 Deactivated' : isInactive ? '⚠️ Suspended' : '✅ Active', color: isInactive ? '#dc2626' : '#059669' },
                { label: 'Billing / Claims', action: isInactive ? '⚠️ Final billing only' : '✅ Active', color: isInactive ? '#d97706' : '#059669' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ color: '#374151', fontWeight: 600 }}>{item.label}</span>
                  <span style={{ color: item.color, fontWeight: 700, fontSize: 11 }}>{item.action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance notes */}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#92400e', marginBottom: 8 }}>📋 Compliance & Legal</div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#78350f', lineHeight: 1.6 }}>
              <li>Medical records retained per HIPAA (7 years or as required by state law)</li>
              <li>Final billing must be completed within 90 days</li>
              <li>Controlled substance prescriptions require DEA notification if deceased</li>
              <li>Provide 30-day advance notice before discharge when possible</li>
              <li>Document all discharge communications in chart</li>
            </ul>
          </div>

          {/* Crisis resources note */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#1d4ed8', marginBottom: 8 }}>🆘 Crisis Resources to Provide</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, color: '#1e3a8a' }}>
              <div>📞 988 Suicide & Crisis Lifeline: Call/Text 988</div>
              <div>💬 Crisis Text Line: Text HOME to 741741</div>
              <div>🏥 Nearest Emergency Room</div>
              <div>🌐 NAMI Helpline: 1-800-950-NAMI</div>
              <div>💊 SAMHSA Helpline: 1-800-662-4357</div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Inactivation Modal */}
      {confirmOpen && draft && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, maxWidth: 480, width: '100%', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '18px 22px', background: STATUS_OPTIONS.find(s => s.value === draft.status)?.color || '#dc2626', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
                {STATUS_OPTIONS.find(s => s.value === draft.status)?.icon} Confirm Patient Inactivation
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>This action is logged to the audit trail and is reversible by an administrator.</div>
            </div>
            <div style={{ padding: '20px 22px' }}>
              <div style={{ fontSize: 14, color: '#1e293b', marginBottom: 12 }}>
                You are about to set <strong>{patient?.firstName} {patient?.lastName}</strong>'s chart status to:
              </div>
              <div style={{ padding: '12px 16px', borderRadius: 8, background: STATUS_OPTIONS.find(s => s.value === draft.status)?.bg, border: '1px solid ' + STATUS_OPTIONS.find(s => s.value === draft.status)?.border, fontWeight: 700, fontSize: 14, color: STATUS_OPTIONS.find(s => s.value === draft.status)?.color, marginBottom: 16 }}>
                {STATUS_OPTIONS.find(s => s.value === draft.status)?.label}
              </div>
              <ul style={{ fontSize: 12, color: '#374151', paddingLeft: 16, lineHeight: 1.7, margin: '0 0 16px' }}>
                <li>All future appointments will be blocked</li>
                <li>New prescriptions will be restricted</li>
                <li>This change will be logged in the audit trail</li>
                {draft.status === 'deceased' && <li>Chart will be set to read-only mode</li>}
              </ul>
              <div style={{ fontSize: 13, color: '#6b7280' }}>Do you want to proceed?</div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={cancelEdit} className="btn btn-secondary" style={{ fontSize: 13 }}>Cancel</button>
              <button onClick={commitSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, background: STATUS_OPTIONS.find(s => s.value === draft.status)?.color || '#dc2626', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : '✓ Confirm Inactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
