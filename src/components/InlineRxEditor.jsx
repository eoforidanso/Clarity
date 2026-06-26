import React, { useState, useEffect } from 'react';
import RxSignatureBlock   from './RxSignatureBlock';
import RxReadinessScore   from './RxReadinessScore';
import PharmacySearch     from './PharmacySearch';

const COL = { display: 'flex', flexDirection: 'column', gap: 10 };

const SEVERITY_COLORS = {
  Contraindicated: { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', badge: '#fee2e2' },
  Major:           { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c', badge: '#ffedd5' },
  Moderate:        { bg: '#fefce8', border: '#fde68a', text: '#ca8a04', badge: '#fef9c3' },
};

const SIG_CHIP_COLORS = {
  patient_history:  { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
  provider_favorite:{ bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
  clinic_default:   { bg: '#f5f3ff', border: '#c4b5fd', text: '#6d28d9' },
};

// ── Preview eRx drawer ────────────────────────────────────────────────────────
function PreviewDrawer({ open, onClose, rxForm, rxSchedule, provider, patient, officeLocation, priority }) {
  if (!open) return null;

  const today   = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const office  = officeLocation?.name    || 'Clarity Behavioral Health';
  const addr    = officeLocation?.address || '200 N Michigan Ave, Suite 1400, Chicago, IL 60601';
  const phone   = officeLocation?.phone   || '(312) 555-0200';
  const fax     = officeLocation?.fax;
  const pName   = patient ? `${patient.firstName} ${patient.lastName}` : '—';

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=680,height=620');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>eRx Preview — ${pName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:28px 36px;}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1d4ed8;padding-bottom:12px;margin-bottom:16px;}
.clinic{font-size:20px;font-weight:800;color:#1d4ed8;}
.clinic-sub{font-size:12px;color:#374151;margin-top:3px;line-height:1.6;}
.badge{display:inline-block;background:#dbeafe;color:#1e40af;font-weight:700;font-size:11px;padding:3px 9px;border-radius:12px;border:1px solid #93c5fd;}
.sec{margin-bottom:14px;}
.sec-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin-bottom:8px;}
table{width:100%;border-collapse:collapse;}
td{padding:5px 6px;vertical-align:top;font-size:12.5px;}
td.lbl{width:38%;font-weight:600;color:#374151;}
.footer{margin-top:20px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:10.5px;color:#6b7280;text-align:center;}
@media print{body{padding:10px 16px;}}
</style></head><body>
<div class="hdr"><div>
  <div class="clinic">${office}</div>
  <div class="clinic-sub">${addr}<br/>Phone: ${phone}${fax ? ` · Fax: ${fax}` : ''}</div>
</div><div style="text-align:right;font-size:11px;color:#374151;">
  <span class="badge">Prescription</span>
  <div style="margin-top:8px">Date: <strong>${today}</strong></div>
</div></div>
<div class="sec"><div class="sec-title">Patient</div><table>
  <tr><td class="lbl">Name</td><td>${pName}</td></tr>
  ${patient?.dob  ? `<tr><td class="lbl">Date of Birth</td><td>${patient.dob}</td></tr>` : ''}
  ${patient?.mrn  ? `<tr><td class="lbl">MRN</td><td>${patient.mrn}</td></tr>` : ''}
</table></div>
<div class="sec"><div class="sec-title">Medication</div><table>
  <tr><td class="lbl">Drug</td><td><strong>${rxForm.name}${rxForm.dose ? ' — ' + rxForm.dose : ''}</strong>${rxSchedule ? ` <span style="color:#dc2626;font-size:11px;">[${rxSchedule}]</span>` : ''}</td></tr>
  <tr><td class="lbl">SIG</td><td>${rxForm.sig || '—'}</td></tr>
  <tr><td class="lbl">Qty / Refills</td><td>${rxForm.quantity || '—'} / ${rxForm.refills || '0'}</td></tr>
  <tr><td class="lbl">DAW</td><td>${rxForm.daw ? 'Yes — No generic substitution' : 'No'}</td></tr>
  ${rxForm.notes  ? `<tr><td class="lbl">Notes</td><td>${rxForm.notes}</td></tr>` : ''}
  ${priority && priority !== 'Routine' ? `<tr><td class="lbl">Priority</td><td><strong>${priority}</strong></td></tr>` : ''}
</table></div>
${rxForm.pharmacy ? `<div class="sec"><div class="sec-title">Pharmacy</div><table>
  <tr><td class="lbl">Name</td><td>${rxForm.pharmacy}</td></tr>
  ${rxForm.pharmAddress ? `<tr><td class="lbl">Address</td><td>${rxForm.pharmAddress}</td></tr>` : ''}
  ${rxForm.pharmPhone   ? `<tr><td class="lbl">Phone</td><td>${rxForm.pharmPhone}</td></tr>` : ''}
  ${rxForm.pharmFax     ? `<tr><td class="lbl">Fax</td><td>${rxForm.pharmFax}</td></tr>` : ''}
</table></div>` : ''}
<div class="sec"><div class="sec-title">Prescriber</div><table>
  <tr><td class="lbl">Name</td><td>${provider ? `${provider.firstName} ${provider.lastName}` : '—'}${provider?.credentials ? ', ' + provider.credentials : ''}</td></tr>
  ${provider?.npi       ? `<tr><td class="lbl">NPI</td><td>${provider.npi}</td></tr>` : ''}
  ${provider?.deaNumber ? `<tr><td class="lbl">DEA</td><td>${provider.deaNumber}</td></tr>` : ''}
</table></div>
<div class="footer">Preview generated ${today} · Clarity EHR · Confidential — Not a valid prescription until signed</div>
</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const row = (label, value) => value ? (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 4, padding: '5px 0', borderBottom: '1px solid var(--border-light)', fontSize: 12.5 }}>
      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
      <span>{value}</span>
    </div>
  ) : null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-white)', borderRadius: 14, width: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>👁 Preview eRx</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Not a valid prescription until signed and transmitted</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', flex: 1 }}>
          {/* Clinic banner */}
          <div style={{ background: 'var(--primary)', color: '#fff', borderRadius: 9, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{office}</div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{addr} · {phone}{fax ? ` · Fax: ${fax}` : ''}</div>
          </div>

          {/* Patient section */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)', marginBottom: 6 }}>Patient</div>
            {row('Name', pName)}
            {row('Date of Birth', patient?.dob)}
            {row('MRN', patient?.mrn)}
          </div>

          {/* Medication section */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)', marginBottom: 6 }}>Medication</div>
            {row('Drug',
              <><strong>{rxForm.name}{rxForm.dose ? ` — ${rxForm.dose}` : ''}</strong>
                {rxSchedule && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>{rxSchedule}</span>}
              </>
            )}
            {row('SIG', rxForm.sig || '—')}
            {row('Qty / Refills', `${rxForm.quantity || '—'} / ${rxForm.refills || '0'}`)}
            {row('DAW', rxForm.daw ? 'Yes — No generic substitution' : 'No')}
            {row('Priority', priority !== 'Routine' ? priority : null)}
            {row('Notes', rxForm.notes)}
          </div>

          {/* Pharmacy section */}
          {rxForm.pharmacy && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)', marginBottom: 6 }}>Pharmacy</div>
              {row('Name', rxForm.pharmacy)}
              {row('Address', rxForm.pharmAddress)}
              {row('Phone', rxForm.pharmPhone)}
              {row('Fax', rxForm.pharmFax)}
            </div>
          )}

          {/* Prescriber section */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)', marginBottom: 6 }}>Prescriber</div>
            {row('Name', provider ? `${provider.firstName} ${provider.lastName}${provider.credentials ? ', ' + provider.credentials : ''}` : '—')}
            {row('NPI', provider?.npi)}
            {row('DEA', provider?.deaNumber)}
          </div>

          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 12, fontStyle: 'italic', textAlign: 'center' }}>
            Preview generated {today} · Clarity EHR · Confidential
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose}
            style={{ padding: '7px 16px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, border: '1.5px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            Close
          </button>
          <button onClick={handlePrint}
            style={{ padding: '7px 16px', borderRadius: 7, fontSize: 12.5, fontWeight: 700, border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer' }}>
            🖨️ Print
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main InlineRxEditor component ─────────────────────────────────────────────
export default function InlineRxEditor({
  rxForm, setRxForm,
  rxPharmAutoSource, setRxPharmAutoSource,
  rxSigSuggestions,
  rxSchedule,
  rxInteractions, rxIxnWorst,
  rxActiveMeds, rxDuplicates,
  rxShowActiveMeds, setRxShowActiveMeds,
  rxPdmpAcknowledged, rxPdmpLoading,
  onOpenPdmpDrawer, onOpenPharmDrawer,
  provider, patient, officeLocation, priority,
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pharmObjLocal, setPharmObjLocal] = useState(
    rxForm.pharmacy ? { name: rxForm.pharmacy, address: rxForm.pharmAddress } : null
  );

  // Sync pharmObjLocal when rxForm.pharmacy is set externally (auto-populate)
  useEffect(() => {
    if (rxForm.pharmacy && !pharmObjLocal) {
      setPharmObjLocal({ name: rxForm.pharmacy, address: rxForm.pharmAddress });
    } else if (!rxForm.pharmacy && pharmObjLocal) {
      setPharmObjLocal(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rxForm.pharmacy]);

  const maxRefills = rxSchedule === 'Schedule II' ? 0 : rxSchedule ? 5 : 12;

  return (
    <>
      <RxReadinessScore provider={provider} onFixSignature={() => window.open('/settings#signature', '_blank')} />

      <div style={{ border: '1px solid #e0e7ff', borderRadius: 12, background: '#fafafe', overflow: 'hidden', marginBottom: 12 }}>
        {/* Section header */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #e0e7ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0f0ff' }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#4338ca', letterSpacing: '0.5px' }}>
            💊 Prescription Details
          </span>
          <button type="button" onClick={() => setPreviewOpen(true)}
            style={{ fontSize: 12, fontWeight: 700, padding: '4px 13px', borderRadius: 7, cursor: 'pointer', border: '1.5px solid #6366f1', background: 'transparent', color: '#4338ca', display: 'flex', alignItems: 'center', gap: 5 }}>
            👁 Preview eRx
          </button>
        </div>

        {/* Two-column body */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>

          {/* ── LEFT: Drug + SIG ── */}
          <div style={{ ...COL, padding: '14px 16px', borderRight: '1px solid #e0e7ff' }}>

            {/* Drug name */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Medication *</label>
              <input className="form-input"
                value={rxForm.name}
                onChange={e => setRxForm(p => ({ ...p, name: e.target.value, sig: '' }))}
                placeholder="e.g. sertraline, quetiapine…"
                style={{ fontSize: 13 }} />
              {rxSchedule && (
                <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                  🔒 {rxSchedule}
                </span>
              )}
            </div>

            {/* Drug interaction alert */}
            {rxIxnWorst && (() => {
              const c = SEVERITY_COLORS[rxIxnWorst];
              return (
                <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '9px 13px' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: c.text, marginBottom: 5 }}>
                    ⚠ Drug Interaction — {rxIxnWorst} ({rxInteractions.length})
                  </div>
                  {rxInteractions.slice(0, 3).map((ixn, i) => (
                    <div key={i} style={{ fontSize: 11.5, color: c.text, marginBottom: 3, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 700, background: c.badge, padding: '1px 6px', borderRadius: 4, fontSize: 10.5, flexShrink: 0 }}>{ixn.severity}</span>
                      <div><strong>{ixn.pairLabel}</strong> — {ixn.effect}
                        {ixn.action && <div style={{ fontSize: 10.5, fontStyle: 'italic', marginTop: 1 }}>→ {ixn.action}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Active meds context */}
            {rxActiveMeds.length > 0 && (
              <div style={{ border: `1px solid ${rxDuplicates.length ? '#fde68a' : 'var(--border)'}`, borderRadius: 8, overflow: 'hidden' }}>
                <button type="button" onClick={() => setRxShowActiveMeds(v => !v)}
                  style={{ width: '100%', textAlign: 'left', padding: '6px 11px', background: rxDuplicates.length ? '#fffbeb' : 'var(--bg)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 700, color: rxDuplicates.length ? '#92400e' : 'var(--text-secondary)' }}>
                  <span>{rxDuplicates.length ? '⚠ Duplicate? — ' : ''}Active Meds ({rxActiveMeds.length}{rxDuplicates.length ? ` · ${rxDuplicates.length} matching` : ''})</span>
                  <span>{rxShowActiveMeds ? '▲' : '▼'}</span>
                </button>
                {rxShowActiveMeds && (
                  <div style={{ maxHeight: 130, overflowY: 'auto', borderTop: '1px solid var(--border)' }}>
                    {rxActiveMeds.map((m, i) => {
                      const isDup = rxDuplicates.some(d => d.id === m.id);
                      return (
                        <div key={m.id || i} style={{ padding: '5px 11px', fontSize: 11.5, borderBottom: '1px solid var(--border)', background: isDup ? '#fef9c3' : 'transparent', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{isDup && <span style={{ color: '#d97706', fontWeight: 700, marginRight: 4 }}>⚠</span>}
                            <strong>{m.name}</strong> {m.dose}
                            <span style={{ color: 'var(--text-muted)', fontSize: 10.5, marginLeft: 4 }}>{m.frequency}</span>
                          </span>
                          {m.lastFilled && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Last: {m.lastFilled}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* PDMP banner */}
            {rxSchedule && (
              <div style={{ background: rxPdmpAcknowledged ? '#f0fdf4' : '#fff7ed', border: `1px solid ${rxPdmpAcknowledged ? '#86efac' : '#fed7aa'}`, borderRadius: 8, padding: '9px 13px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: rxPdmpAcknowledged ? '#15803d' : '#ea580c' }}>
                    {rxPdmpAcknowledged ? '✅ IL PMP Reviewed' : `⚠ ${rxSchedule} — Review Required`}
                  </div>
                  <div style={{ fontSize: 10.5, color: rxPdmpAcknowledged ? '#166534' : '#9a3412', marginTop: 1 }}>
                    {rxPdmpAcknowledged ? 'Report reviewed and acknowledged.' : 'Illinois PMP check required before prescribing.'}
                  </div>
                </div>
                {!rxPdmpAcknowledged && (
                  <button type="button" onClick={onOpenPdmpDrawer} disabled={rxPdmpLoading}
                    style={{ padding: '5px 11px', borderRadius: 7, fontSize: 11.5, fontWeight: 700, background: '#ea580c', color: '#fff', border: 'none', cursor: 'pointer', opacity: rxPdmpLoading ? 0.6 : 1, flexShrink: 0 }}>
                    {rxPdmpLoading ? '⏳…' : '🏛 PDMP →'}
                  </button>
                )}
              </div>
            )}

            {/* Dose */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Dose / Strength</label>
              <input className="form-input" value={rxForm.dose}
                onChange={e => setRxForm(p => ({ ...p, dose: e.target.value }))}
                placeholder="e.g. 50mg, 100mg" style={{ fontSize: 13 }} />
            </div>

            {/* SIG */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>SIG — Patient Instructions *</label>
              <textarea className="form-input" rows={2}
                value={rxForm.sig}
                onChange={e => setRxForm(p => ({ ...p, sig: e.target.value }))}
                placeholder="e.g. Take 1 tablet by mouth once daily in the morning"
                style={{ fontSize: 12.5, resize: 'vertical' }} />
              {rxSigSuggestions.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Smart SIG:</span>
                  {rxSigSuggestions.map((s, i) => {
                    const chip = SIG_CHIP_COLORS[s.source] || SIG_CHIP_COLORS.clinic_default;
                    return (
                      <button key={i} type="button" onClick={() => setRxForm(p => ({ ...p, sig: s.sig }))} title={s.sig}
                        style={{ padding: '3px 9px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: chip.bg, border: `1px solid ${chip.border}`, color: chip.text, cursor: 'pointer', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Qty / Refills / DAW / Pharmacy / Notes ── */}
          <div style={{ ...COL, padding: '14px 16px' }}>

            {/* Qty + Refills row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Quantity</label>
                <input className="form-input" type="number" min={1}
                  value={rxForm.quantity}
                  onChange={e => setRxForm(p => ({ ...p, quantity: e.target.value }))}
                  placeholder="30" style={{ fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Refills <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(max {maxRefills})</span>
                </label>
                <input className="form-input" type="number" min={0} max={maxRefills}
                  value={rxForm.refills}
                  onChange={e => setRxForm(p => ({ ...p, refills: e.target.value }))}
                  placeholder="0" style={{ fontSize: 13 }} />
              </div>
            </div>

            {/* DAW checkbox */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 12px', background: rxForm.daw ? '#eff6ff' : 'var(--bg)', border: `1.5px solid ${rxForm.daw ? '#93c5fd' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.12s' }}>
              <input type="checkbox"
                checked={!!rxForm.daw}
                onChange={e => setRxForm(p => ({ ...p, daw: e.target.checked }))}
                style={{ marginTop: 1, width: 15, height: 15, accentColor: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: rxForm.daw ? '#1d4ed8' : 'var(--text-primary)' }}>
                  Dispense As Written (DAW)
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                  No generic substitution — brand medically necessary
                </div>
              </div>
            </label>

            {/* Pharmacy */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Send to Pharmacy</label>
                <button type="button" onClick={onOpenPharmDrawer}
                  style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', background: 'linear-gradient(135deg,#4338ca,#6366f1)', color: '#fff', border: 'none' }}>
                  🔍 IL Directory
                </button>
              </div>

              {rxPharmAutoSource && rxForm.pharmacy && (
                <div style={{ marginBottom: 6, padding: '4px 10px', borderRadius: 6, fontSize: 11, background: '#eff6ff', border: '1px solid #93c5fd', color: '#1d4ed8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>ℹ {rxPharmAutoSource}</span>
                  <button type="button" onClick={() => setRxPharmAutoSource(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#6b7280' }}>✕</button>
                </div>
              )}

              <PharmacySearch
                value={pharmObjLocal}
                onChange={ph => {
                  setPharmObjLocal(ph);
                  setRxPharmAutoSource(null);
                  if (ph) {
                    const addr = ph.fullAddress || [ph.address, ph.city, ph.state, ph.zip].filter(Boolean).join(', ');
                    setRxForm(p => ({ ...p, pharmacy: ph.name || '', pharmAddress: addr }));
                  } else {
                    setRxForm(p => ({ ...p, pharmacy: '', pharmAddress: '' }));
                  }
                }}
                defaultCity={patient?.address?.city || ''}
                defaultZip={patient?.address?.zip || ''}
                compact
              />
            </div>

            {/* Notes */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Notes</label>
              <textarea className="form-input" rows={2}
                value={rxForm.notes}
                onChange={e => setRxForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Special instructions, patient allergies, brand preference…"
                style={{ fontSize: 12.5, resize: 'vertical' }} />
            </div>

            {/* Quick-fill defaults strip */}
            <div style={{ marginTop: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { label: '30 tabs · 0 Rx',  qty: '30', ref: '0' },
                { label: '60 tabs · 1 Rx',  qty: '60', ref: '1' },
                { label: '90 tabs · 3 Rx',  qty: '90', ref: '3' },
              ].map(p => (
                <button key={p.label} type="button"
                  onClick={() => setRxForm(v => ({ ...v, quantity: p.qty, refills: p.ref }))}
                  style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 10, cursor: 'pointer', background: rxForm.quantity === p.qty && rxForm.refills === p.ref ? '#e0e7ff' : 'var(--bg)', border: '1px solid var(--border)', color: rxForm.quantity === p.qty && rxForm.refills === p.ref ? '#4338ca' : 'var(--text-muted)' }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Prescriber signature block */}
        <div style={{ padding: '0 16px 14px' }}>
          <RxSignatureBlock provider={provider} onGoToSettings={() => window.open('/settings#signature', '_blank')} />
        </div>
      </div>

      {/* Preview drawer */}
      <PreviewDrawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        rxForm={rxForm}
        rxSchedule={rxSchedule}
        provider={provider}
        patient={patient}
        officeLocation={officeLocation}
        priority={priority}
      />
    </>
  );
}
