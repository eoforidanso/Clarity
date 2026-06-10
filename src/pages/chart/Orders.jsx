import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePatient } from '../../contexts/PatientContext';
import { labOrderDatabase, labFacilities, users, orderInsurance } from '../../data/mockData';
import { locations as locationsApi } from '../../services/api';
import { getControlledSchedule } from '../../utils/controlledSubstances';
import { checkInteractions }     from '../../data/drugInteractions';
import { resolvePharmacy, resolveSigSuggestions, getActiveMedContext } from '../../utils/rxAutoPopulate';
import { generateILPmpReport }   from '../../utils/pmpMock';
import { buildSignaturePayload } from '../../utils/providerSignature';
import PDMPDrawer                from '../../components/PDMPDrawer';
import PharmacySelectorDrawer    from '../../components/PharmacySelectorDrawer';
import RxSignatureBlock          from '../../components/RxSignatureBlock';
import RxReadinessScore          from '../../components/RxReadinessScore';
import { PSYCH_MED_DEFAULTS }    from '../../components/RxComposerDrawer';

export default function Orders({ patientId }) {
  const { currentUser } = useAuth();
  const { orders, meds, addOrder, updateOrder, addInboxMessage, patients } = usePatient();
  const [showAdd, setShowAdd] = useState(false);
  const [orderType, setOrderType] = useState('Lab');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ type: 'Lab', description: '', priority: 'Routine', notes: '' });
  const [labFacilitySearch, setLabFacilitySearch] = useState('');
  const [selectedLabFacility, setSelectedLabFacility] = useState(null);
  const [labFacilityFocused, setLabFacilityFocused] = useState(false);
  const [forwardTo, setForwardTo] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [formError, setFormError] = useState('');
  const [officeLocation, setOfficeLocation] = useState(null);

  // ── Prescription sub-form state (mirrors Order Group features) ────────────
  const [rxForm, setRxForm] = useState({
    name: '', dose: '', sig: '', quantity: '30', refills: '0',
    pharmacy: '', pharmAddress: '', notes: '',
  });
  const [rxPharmAutoSource, setRxPharmAutoSource]     = useState(null);
  const [rxSigSuggestions, setRxSigSuggestions]       = useState([]);
  const [rxShowActiveMeds, setRxShowActiveMeds]       = useState(false);
  const [rxPharmDrawerOpen, setRxPharmDrawerOpen]     = useState(false);
  const [rxPdmpDrawerOpen, setRxPdmpDrawerOpen]       = useState(false);
  const [rxPdmpReport, setRxPdmpReport]               = useState(null);
  const [rxPdmpLoading, setRxPdmpLoading]             = useState(false);
  const [rxPdmpAcknowledged, setRxPdmpAcknowledged]   = useState(false);
  const rxPdmpTimer = useRef(null);

  useEffect(() => {
    locationsApi.list().then(locs => {
      if (!locs?.length) return;
      const userLocId = currentUser?.locationId;
      const matched = userLocId ? locs.find(l => l.id === userLocId) : null;
      setOfficeLocation(matched || locs[0]);
    }).catch(() => {});
  }, [currentUser?.locationId]);

  const isFrontDesk  = currentUser?.role === 'front_desk';
  const isTherapist  = currentUser?.role === 'therapist';
  const isAdmin      = currentUser?.role === 'admin';
  const mustForward  = isFrontDesk;
  const providers = users.filter(u => u.role === 'prescriber');

  // ── Derived smart Rx values ───────────────────────────────────────────────
  const patientMeds   = meds?.[patientId] || [];
  const rxSchedule    = getControlledSchedule(rxForm.name);
  const rxInteractions = rxForm.name.length >= 3
    ? checkInteractions(patientMeds.map(m => m.name), rxForm.name)
    : [];
  const rxIxnWorst = rxInteractions.find(i => i.severity === 'Contraindicated') ? 'Contraindicated'
    : rxInteractions.find(i => i.severity === 'Major') ? 'Major'
    : rxInteractions.length > 0 ? 'Moderate' : null;
  const { activeMeds: rxActiveMeds, duplicates: rxDuplicates } = getActiveMedContext(rxForm.name, patientMeds);

  // ── Pharmacy auto-populate when prescription form opens ──────────────────
  useEffect(() => {
    if (form.type === 'Prescription' && showAdd && !rxForm.pharmacy) {
      const resolved = resolvePharmacy(patient, currentUser, patientMeds);
      if (resolved) {
        setRxForm(p => ({ ...p, pharmacy: resolved.name, pharmAddress: resolved.address || '' }));
        setRxPharmAutoSource(resolved.sourceLabel);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.type, showAdd]);

  // ── Sig suggestions when drug name changes ────────────────────────────────
  useEffect(() => {
    const suggestions = resolveSigSuggestions(
      rxForm.name, patientMeds, currentUser?.sigFavorites || [], PSYCH_MED_DEFAULTS,
    );
    setRxSigSuggestions(suggestions);
    if (!rxForm.sig && suggestions.length > 0) {
      setRxForm(p => ({ ...p, sig: suggestions[0].sig }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rxForm.name]);

  // ── PDMP auto-query for controlled substances ─────────────────────────────
  useEffect(() => {
    clearTimeout(rxPdmpTimer.current);
    if (rxSchedule && patient && rxForm.name.length >= 3) {
      setRxPdmpReport(null); setRxPdmpAcknowledged(false); setRxPdmpLoading(true);
      rxPdmpTimer.current = setTimeout(() => {
        setRxPdmpReport(generateILPmpReport(patient, rxForm.name, rxSchedule));
        setRxPdmpLoading(false);
      }, 900);
    } else {
      setRxPdmpReport(null); setRxPdmpAcknowledged(false); setRxPdmpLoading(false);
    }
    return () => clearTimeout(rxPdmpTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rxForm.name, rxSchedule, patient?.id]);

  const patient = patients?.find(p => p.id === patientId);

  const printOrder = (order) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : patientId;
    const officeName = officeLocation?.name || 'Clarity Behavioral Health';
    const officeAddress = officeLocation?.address || '200 N Michigan Ave, Suite 1400, Chicago, IL 60601';
    const officePhone = officeLocation?.phone ? `Phone: ${officeLocation.phone}` : 'Phone: (312) 555-0200';
    const officeFax = officeLocation?.fax ? ` | Fax: ${officeLocation.fax}` : '';
    const win = window.open('', '_blank', 'width=700,height=600');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>Order — ${patientName} — ${order.type}</title><style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:Arial,sans-serif; font-size:13px; color:#111; padding:28px 36px; }
.header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1d4ed8; padding-bottom:12px; margin-bottom:16px; }
.facility-name { font-size:20px; font-weight:800; color:#1d4ed8; }
.facility-sub { font-size:12px; color:#374151; margin-top:3px; line-height:1.6; }
.header-right { text-align:right; font-size:11px; color:#374151; }
.badge { display:inline-block; background:#dbeafe; color:#1e40af; font-weight:700; font-size:11px; padding:3px 9px; border-radius:12px; border:1px solid #93c5fd; }
.section { margin-bottom:14px; }
.section-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#6b7280; border-bottom:1px solid #e5e7eb; padding-bottom:4px; margin-bottom:8px; }
table { width:100%; border-collapse:collapse; }
td { padding:5px 6px; vertical-align:top; font-size:12.5px; }
td.lbl { width:38%; font-weight:600; color:#374151; }
.footer { margin-top:20px; padding-top:8px; border-top:1px solid #e5e7eb; font-size:10.5px; color:#6b7280; text-align:center; }
@media print { body { padding:10px 16px; } }
</style></head><body>
<div class="header"><div>
  <div class="facility-name">${officeName}</div>
  <div class="facility-sub">${officeAddress}<br/>${officePhone}${officeFax}</div>
</div><div class="header-right">
  <span class="badge">${order.type} Order</span>
  <div style="margin-top:8px">Date: <strong>${dateStr}</strong></div>
  <div>Time: <strong>${timeStr}</strong></div>
</div></div>
<div class="section"><div class="section-title">Patient</div><table>
  <tr><td class="lbl">Name</td><td>${patientName}</td></tr>
  ${patient?.dob ? `<tr><td class="lbl">Date of Birth</td><td>${patient.dob}</td></tr>` : ''}
  ${patient?.mrn ? `<tr><td class="lbl">MRN</td><td>${patient.mrn}</td></tr>` : ''}
</table></div>
<div class="section"><div class="section-title">Order Details</div><table>
  <tr><td class="lbl">Type</td><td>${order.type}</td></tr>
  <tr><td class="lbl">Description</td><td><strong>${order.description}</strong></td></tr>
  <tr><td class="lbl">Priority</td><td>${order.priority}</td></tr>
  <tr><td class="lbl">Status</td><td>${order.status}</td></tr>
  <tr><td class="lbl">Date Ordered</td><td>${order.orderedDate}</td></tr>
  <tr><td class="lbl">Ordered By</td><td>${order.orderedBy}</td></tr>
  ${order.labFacility ? `<tr><td class="lbl">Lab Facility</td><td>${order.labFacility}</td></tr>` : ''}
  ${order.forwardedTo ? `<tr><td class="lbl">Forwarded To</td><td>${order.forwardedTo}</td></tr>` : ''}
  ${order.orderedByNpi ? `<tr><td class="lbl">Prescriber NPI</td><td>${order.orderedByNpi}</td></tr>` : ''}
  ${order.orderedByDea ? `<tr><td class="lbl">Prescriber DEA</td><td>${order.orderedByDea}</td></tr>` : ''}
  ${order.notes ? `<tr><td class="lbl">Clinical Notes</td><td>${order.notes}</td></tr>` : ''}
</table></div>
<div class="footer">Printed ${dateStr} at ${timeStr} · Clarity EHR · Confidential — For authorized use only</div>
</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const patientOrders = orders[patientId] || [];

  const filteredLabs = search.length > 0
    ? labOrderDatabase.filter(l => l.name.toLowerCase().includes(search.toLowerCase()) || l.code.includes(search))
    : labOrderDatabase;

  const handleAdd = () => {
    // ── Prescription path ──────────────────────────────────────
    if (form.type === 'Prescription') {
      if (!rxForm.name.trim()) { setFormError('Medication name is required.'); return; }
      if (!rxForm.sig.trim())  { setFormError('SIG instructions are required.'); return; }
      if (rxSchedule && !rxPdmpAcknowledged) { setFormError('You must review the IL PMP report before prescribing a controlled substance.'); return; }
      if (mustForward && !forwardTo) { setFormError('Please select a provider to forward this prescription to.'); return; }
      setFormError('');

      const forwardProvider = mustForward ? providers.find(p => p.id === forwardTo) : null;
      const isPrescriber = currentUser?.role === 'prescriber';
      const rxDescription = `${rxForm.name}${rxForm.dose ? ' ' + rxForm.dose : ''} — Qty: ${rxForm.quantity || '—'}, Refills: ${rxForm.refills || '0'}, Pharmacy: ${rxForm.pharmacy || 'TBD'}`;
      const sigPayload = buildSignaturePayload(currentUser);

      addOrder(patientId, {
        type: 'Prescription',
        description: rxDescription,
        priority: form.priority || 'Routine',
        notes: rxForm.notes,
        sig: rxForm.sig,
        dose: rxForm.dose,
        quantity: rxForm.quantity,
        refills: rxForm.refills,
        pharmacy: rxForm.pharmacy,
        pharmAddress: rxForm.pharmAddress,
        controlledSchedule: rxSchedule || null,
        status: rxSchedule ? 'Pending EPCS Auth' : mustForward ? 'Pending Provider Review' : 'Active',
        orderedDate: new Date().toISOString().split('T')[0],
        orderedBy: mustForward
          ? `${currentUser.firstName} ${currentUser.lastName} → ${forwardProvider.firstName} ${forwardProvider.lastName}`
          : `${currentUser.firstName} ${currentUser.lastName}`,
        forwardedTo: forwardProvider ? `${forwardProvider.firstName} ${forwardProvider.lastName}` : null,
        orderedByNpi: isPrescriber ? (currentUser.npi || '') : '',
        orderedByDea: isPrescriber ? (currentUser.deaNumber || '') : '',
        ...sigPayload,
      });

      if (mustForward && forwardProvider) {
        addInboxMessage({
          type: 'Order Forward',
          from: `${currentUser.firstName} ${currentUser.lastName} (${isFrontDesk ? 'Front Desk' : currentUser.role})`,
          to: forwardProvider.id,
          subject: `Rx Forwarded: ${rxForm.name}${rxForm.dose ? ' ' + rxForm.dose : ''}`,
          body: `${currentUser.firstName} ${currentUser.lastName} has forwarded a prescription for your review and signature.\n\nMedication: ${rxForm.name} ${rxForm.dose || ''}\nSIG: ${rxForm.sig}\nQty: ${rxForm.quantity} · Refills: ${rxForm.refills}\nPharmacy: ${rxForm.pharmacy || 'Not specified'}\nNotes: ${rxForm.notes || 'None'}\n\nPlease review and authorize.`,
          patient: patientId,
          date: new Date().toISOString().split('T')[0],
          status: 'Unread',
          urgent: form.priority === 'STAT',
        });
      }

      setRxForm({ name: '', dose: '', sig: '', quantity: '30', refills: '0', pharmacy: '', pharmAddress: '', notes: '' });
      setRxPharmAutoSource(null);
      setRxSigSuggestions([]);
      setRxShowActiveMeds(false);
      setRxPdmpReport(null);
      setRxPdmpAcknowledged(false);
      setForm({ type: 'Lab', description: '', priority: 'Routine', notes: '' });
      setForwardTo('');
      setFormError('');
      setShowAdd(false);
      return;
    }

    // ── Generic orders path ────────────────────────────────────
    if (!form.description.trim()) {
      setFormError('Order description is required.');
      return;
    }
    if (mustForward && !forwardTo) {
      setFormError('Please select a provider to forward this order to.');
      return;
    }
    setFormError('');

    const forwardProvider = mustForward ? providers.find(p => p.id === forwardTo) : null;

    const isPrescriber = currentUser?.role === 'prescriber';
    addOrder(patientId, {
      ...form,
      labFacility: form.type === 'Lab' && selectedLabFacility ? `${selectedLabFacility.name} — ${selectedLabFacility.city}` : '',
      status: mustForward ? 'Pending Provider Review' : 'Pending',
      orderedDate: new Date().toISOString().split('T')[0],
      orderedBy: mustForward
        ? `${currentUser.firstName} ${currentUser.lastName} → ${forwardProvider.firstName} ${forwardProvider.lastName}`
        : `${currentUser.firstName} ${currentUser.lastName}`,
      forwardedTo: forwardProvider ? `${forwardProvider.firstName} ${forwardProvider.lastName}` : null,
      orderedByNpi: isPrescriber ? (currentUser.npi || '') : '',
      orderedByDea: isPrescriber ? (currentUser.deaNumber || '') : '',
    });

    if (mustForward && forwardProvider) {
      addInboxMessage({
        type: 'Order Forward',
        from: `${currentUser.firstName} ${currentUser.lastName} (${isFrontDesk ? 'Front Desk' : currentUser.role})`,
        to: forwardProvider.id,
        subject: `Order Forwarded: ${form.type} — ${form.description}`,
        body: `${currentUser.firstName} ${currentUser.lastName} has forwarded a ${form.priority} ${form.type} order for your review and signature.\n\nOrder: ${form.description}\nPriority: ${form.priority}\nNotes: ${form.notes || 'None'}\n\nPlease review and sign this order in the patient's chart.`,
        patient: patientId,
        date: new Date().toISOString().split('T')[0],
        status: 'Unread',
        urgent: form.priority === 'STAT',
      });
    }

    setForm({ type: 'Lab', description: '', priority: 'Routine', notes: '' });
    setSelectedLabFacility(null);
    setLabFacilitySearch('');
    setForwardTo('');
    setFormError('');
    setShowAdd(false);
  };

  const selectLabOrder = (lab) => {
    setForm({ ...form, description: form.description ? `${form.description}, ${lab.name}` : lab.name, type: 'Lab' });
  };

  // ── Therapist: fully read-only view ──────────────────────────
  if (isTherapist) {
    return (
      <div>
        <div className="card">
          <div className="card-header">
            <h2>📝 Orders ({patientOrders.length})</h2>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 14px', background: '#fef3c7', color: '#92400e', borderRadius: 20, border: '1px solid #fde68a' }}>
              🔒 Read-Only
            </span>
          </div>

          {/* Therapist restriction banner */}
          <div style={{ padding: '14px 20px', background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>🚫</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#92400e', marginBottom: 4 }}>
                  Therapists Cannot Place Orders
                </div>
                <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
                  As a licensed therapist (LCSW / LPC / LMFT), you <strong>do not have ordering privileges</strong> for prescriptions, labs, imaging, referrals, or procedures.
                  To request an order on behalf of a patient, please <strong>contact the prescribing provider directly</strong> via Staff Messaging or assign a refill request through the E-Prescribe page.
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { icon: '💊', label: 'Prescriptions', color: '#dc2626' },
                    { icon: '🧪', label: 'Lab Orders', color: '#dc2626' },
                    { icon: '🩻', label: 'Imaging', color: '#dc2626' },
                    { icon: '📋', label: 'Referrals', color: '#dc2626' },
                    { icon: '🔧', label: 'Procedures', color: '#dc2626' },
                  ].map(item => (
                    <span key={item.label} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: 'rgba(220,38,38,0.08)', color: item.color, border: '1px solid rgba(220,38,38,0.2)',
                    }}>
                      {item.icon} {item.label} — Not Authorized
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card-body no-pad">
            <table className="data-table">
              <thead>
                <tr><th>Type</th><th>Description</th><th>Status</th><th>Date</th><th>Ordered By</th><th>Priority</th><th>Insurance</th><th>Notes</th><th></th></tr>
              </thead>
              <tbody>
                {patientOrders.map((o) => {
                  const ins = orderInsurance[o.id];
                  return (
                    <React.Fragment key={o.id}>
                      <tr style={{ cursor: ins ? 'pointer' : 'default' }} onClick={() => ins && setExpandedOrder(expandedOrder === o.id ? null : o.id)}>
                        <td><span className={`badge ${o.type === 'Lab' ? 'badge-info' : o.type === 'Referral' ? 'badge-purple' : o.type === 'Imaging' ? 'badge-warning' : 'badge-gray'}`}>{o.type}</span></td>
                        <td className="font-medium">{o.description}</td>
                        <td>
                          <span className={`badge ${
                            o.status === 'Completed' ? 'badge-success' :
                            o.status === 'Pending' ? 'badge-warning' :
                            o.status === 'Pending EPCS Auth' ? 'badge-danger' :
                            o.status === 'Pending Provider Review' ? 'badge-purple' :
                            o.status === 'Active' ? 'badge-info' : 'badge-gray'
                          }`}>{o.status}</span>
                        </td>
                        <td className="text-sm">{o.orderedDate}</td>
                        <td className="text-sm">{o.orderedBy}</td>
                        <td><span className={`badge ${o.priority === 'Urgent' || o.priority === 'STAT' ? 'badge-danger' : 'badge-gray'}`}>{o.priority}</span></td>
                        <td className="text-sm">
                          {ins ? (
                            <span className={`badge ${ins.coverageStatus === 'Covered' ? 'badge-success' : ins.coverageStatus.includes('Pending') ? 'badge-warning' : 'badge-info'}`}>
                              {ins.coverageStatus}
                            </span>
                          ) : <span className="text-muted">—</span>}
                        </td>
                        <td className="text-sm text-muted">{o.notes}</td>
                        <td><button className="btn btn-sm btn-secondary" title="Print order slip" onClick={e => { e.stopPropagation(); printOrder(o); }}>🖨️</button></td>
                      </tr>
                      {expandedOrder === o.id && ins && (
                        <tr>
                          <td colSpan={9} style={{ padding: 0, background: 'var(--bg)' }}>
                            <div style={{ padding: '12px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px 24px', fontSize: 12 }}>
                              <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Insurance:</span> {ins.insuranceName}</div>
                              <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Member ID:</span> {ins.memberId}</div>
                              <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Coverage:</span> {ins.coverageStatus}</div>
                              <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Prior Auth:</span> {ins.priorAuthRequired ? `✅ Required` : '❌ Not Required'}</div>
                              {ins.authorizationNumber && <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Auth #:</span> {ins.authorizationNumber}</div>}
                              <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Est. Patient Cost:</span> {ins.estimatedPatientCost === 0 ? '$0.00' : `$${ins.estimatedPatientCost.toFixed(2)}`}</div>
                            </div>
                            {ins.coverageNotes && (
                              <div style={{ padding: '0 20px 12px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Notes:</span> {ins.coverageNotes}
                              </div>
                            )}
                            {(o.orderedByNpi || o.orderedByDea) && (
                              <div style={{ padding: '0 20px 10px', display: 'flex', gap: 20, fontSize: 12 }}>
                                {o.orderedByNpi && <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>NPI:</span> <span style={{ fontFamily: 'monospace' }}>{o.orderedByNpi}</span></div>}
                                {o.orderedByDea && <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>DEA:</span> <span style={{ fontFamily: 'monospace' }}>{o.orderedByDea}</span></div>}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {patientOrders.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No orders</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── Admin / Prescriber / Nurse: full order form ──────────────
  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>📝 Orders ({patientOrders.length})</h2>
          <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(!showAdd)}>
            + New Order
          </button>
        </div>

        {showAdd && (
          <>
          <div className="card-body" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Order Type</label>
                <select className="form-select" value={form.type} onChange={(e) => { setForm({ ...form, type: e.target.value }); setOrderType(e.target.value); }}>
                  <option>Lab</option><option>Imaging</option><option>Referral</option>
                  {!isAdmin && <option>Prescription</option>}
                  <option>Procedure</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option>Routine</option><option>Urgent</option><option>STAT</option>
                </select>
              </div>
            </div>

            {/* ── Prescription sub-form with all smart features ── */}
            {form.type === 'Prescription' && (
              <>
              {/* ── Prescription Readiness Score ── */}
              <RxReadinessScore
                provider={currentUser}
                onFixSignature={() => window.open('/settings#signature', '_blank')}
              />

              <div style={{ border: '1px solid #e0e7ff', borderRadius: 10, padding: '14px 16px', background: '#fafafe', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#4338ca', letterSpacing: '0.5px', marginBottom: 12 }}>
                  💊 Prescription Details
                </div>

                {/* Drug name */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11 }}>Medication *</label>
                  <input className="form-input"
                    value={rxForm.name}
                    onChange={e => setRxForm(p => ({ ...p, name: e.target.value, sig: '' }))}
                    placeholder="Medication name (e.g. sertraline, quetiapine…)"
                    style={{ fontSize: 13 }} />
                  {rxSchedule && (
                    <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                      🔒 Controlled — {rxSchedule}
                    </span>
                  )}
                </div>

                {/* Drug interaction alert */}
                {rxIxnWorst && (() => {
                  const c = { Contraindicated: { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', badge: '#fee2e2' }, Major: { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c', badge: '#ffedd5' }, Moderate: { bg: '#fefce8', border: '#fde68a', text: '#ca8a04', badge: '#fef9c3' } }[rxIxnWorst];
                  return (
                    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: c.text, marginBottom: 6 }}>
                        ⚠ Drug Interaction — {rxIxnWorst} ({rxInteractions.length})
                      </div>
                      {rxInteractions.slice(0, 3).map((ixn, i) => (
                        <div key={i} style={{ fontSize: 12, color: c.text, marginBottom: 4, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                          <span style={{ fontWeight: 700, background: c.badge, padding: '1px 6px', borderRadius: 4, fontSize: 11, flexShrink: 0 }}>{ixn.severity}</span>
                          <div><strong>{ixn.pairLabel}</strong> — {ixn.effect}{ixn.action && <div style={{ fontSize: 11, fontStyle: 'italic', marginTop: 1 }}>→ {ixn.action}</div>}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Active meds context panel */}
                {rxActiveMeds.length > 0 && (
                  <div style={{ border: `1px solid ${rxDuplicates.length ? '#fde68a' : 'var(--border)'}`, borderRadius: 8, marginBottom: 10, overflow: 'hidden' }}>
                    <button type="button" onClick={() => setRxShowActiveMeds(v => !v)}
                      style={{ width: '100%', textAlign: 'left', padding: '7px 12px', background: rxDuplicates.length ? '#fffbeb' : 'var(--bg)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: rxDuplicates.length ? '#92400e' : 'var(--text-secondary)' }}>
                      <span>{rxDuplicates.length ? '⚠ Duplicate? — ' : ''}Active Meds ({rxActiveMeds.length}{rxDuplicates.length ? ` · ${rxDuplicates.length} matching` : ''})</span>
                      <span>{rxShowActiveMeds ? '▲' : '▼'}</span>
                    </button>
                    {rxShowActiveMeds && (
                      <div style={{ maxHeight: 150, overflowY: 'auto', borderTop: '1px solid var(--border)' }}>
                        {rxActiveMeds.map((m, i) => {
                          const isDup = rxDuplicates.some(d => d.id === m.id);
                          return (
                            <div key={m.id || i} style={{ padding: '6px 12px', fontSize: 12, borderBottom: '1px solid var(--border)', background: isDup ? '#fef9c3' : 'transparent', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{isDup && <span style={{ color: '#d97706', fontWeight: 700, marginRight: 4 }}>⚠</span>}<strong>{m.name}</strong> {m.dose} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{m.frequency}</span></span>
                              {m.lastFilled && <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Last: {m.lastFilled}</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* PDMP banner */}
                {rxSchedule && (
                  <div style={{ background: rxPdmpAcknowledged ? '#f0fdf4' : '#fff7ed', border: `1px solid ${rxPdmpAcknowledged ? '#86efac' : '#fed7aa'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: rxPdmpAcknowledged ? '#15803d' : '#ea580c' }}>
                        {rxPdmpAcknowledged ? '✅ IL PMP Reviewed' : `⚠ Controlled Substance — ${rxSchedule}`}
                      </div>
                      <div style={{ fontSize: 11, color: rxPdmpAcknowledged ? '#166534' : '#9a3412', marginTop: 2 }}>
                        {rxPdmpAcknowledged ? 'IL PMP report reviewed and acknowledged.' : 'Illinois PMP check required before prescribing.'}
                      </div>
                    </div>
                    {!rxPdmpAcknowledged && (
                      <button type="button" onClick={() => setRxPdmpDrawerOpen(true)} disabled={rxPdmpLoading || !rxPdmpReport}
                        style={{ padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: '#ea580c', color: '#fff', border: 'none', cursor: 'pointer', opacity: rxPdmpLoading ? 0.6 : 1, flexShrink: 0 }}>
                        {rxPdmpLoading ? '⏳ Loading…' : '🏛️ View PDMP →'}
                      </button>
                    )}
                  </div>
                )}

                {/* Dose + sig row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: 11 }}>Dose / Strength</label>
                    <input className="form-input" value={rxForm.dose} onChange={e => setRxForm(p => ({ ...p, dose: e.target.value }))} placeholder="e.g. 50mg" style={{ fontSize: 13 }} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 11 }}>Qty / Refills</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input className="form-input" type="number" min={1} value={rxForm.quantity} onChange={e => setRxForm(p => ({ ...p, quantity: e.target.value }))} placeholder="Qty" style={{ fontSize: 13 }} />
                      <input className="form-input" type="number" min={0} max={rxSchedule === 'Schedule II' ? 0 : 12} value={rxForm.refills} onChange={e => setRxForm(p => ({ ...p, refills: e.target.value }))} placeholder="Refills" style={{ fontSize: 13 }} />
                    </div>
                  </div>
                </div>

                {/* SIG */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11 }}>SIG (Patient Instructions) *</label>
                  <textarea className="form-input" rows={2} value={rxForm.sig} onChange={e => setRxForm(p => ({ ...p, sig: e.target.value }))} placeholder="e.g. Take 1 tablet by mouth once daily in the morning" style={{ fontSize: 12.5, resize: 'vertical' }} />
                  {/* Sig suggestion chips */}
                  {rxSigSuggestions.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', alignSelf: 'center', textTransform: 'uppercase' }}>Smart SIG:</span>
                      {rxSigSuggestions.map((s, i) => {
                        const chip = s.source === 'patient_history' ? { bg: '#f0fdf4', border: '#86efac', text: '#166534' } : s.source === 'provider_favorite' ? { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' } : { bg: '#f5f3ff', border: '#c4b5fd', text: '#6d28d9' };
                        return (
                          <button key={i} type="button" onClick={() => setRxForm(p => ({ ...p, sig: s.sig }))} title={s.sig}
                            style={{ padding: '3px 9px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: chip.bg, border: `1px solid ${chip.border}`, color: chip.text, cursor: 'pointer', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Pharmacy */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ marginBottom: 0, fontSize: 11 }}>Send to Pharmacy</label>
                    <button type="button" onClick={() => setRxPharmDrawerOpen(true)}
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
                  <input className="form-input" value={rxForm.pharmacy} onChange={e => { setRxForm(p => ({ ...p, pharmacy: e.target.value })); setRxPharmAutoSource(null); }} placeholder="Pharmacy name" style={{ fontSize: 13, marginBottom: 6 }} />
                  <input className="form-input" value={rxForm.pharmAddress} onChange={e => setRxForm(p => ({ ...p, pharmAddress: e.target.value }))} placeholder="Address, city, state, zip…" style={{ fontSize: 12, color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd' }} />
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11 }}>Notes</label>
                  <textarea className="form-input" rows={2} value={rxForm.notes} onChange={e => setRxForm(p => ({ ...p, notes: e.target.value }))} placeholder="Special instructions…" style={{ fontSize: 12.5, resize: 'vertical' }} />
                </div>

                {/* ── Prescriber signature preview ── */}
                <RxSignatureBlock
                  provider={currentUser}
                  onGoToSettings={() => window.open('/settings#signature', '_blank')}
                />
              </div>
              </>
            )}

            {form.type === 'Lab' && (
              <>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Lab Facility</label>
                  {selectedLabFacility ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 'var(--radius)', fontSize: 12 }}>
                      <span style={{ flex: 1 }}>🧪 <strong>{selectedLabFacility.name}</strong> — {selectedLabFacility.address}, {selectedLabFacility.city}</span>
                      <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)' }} onClick={() => { setSelectedLabFacility(null); setLabFacilitySearch(''); }}>×</button>
                    </div>
                  ) : (
                    <>
                      <input
                        className="form-input"
                        value={labFacilitySearch}
                        onChange={(e) => setLabFacilitySearch(e.target.value)}
                        onFocus={() => setLabFacilityFocused(true)}
                        onBlur={() => setTimeout(() => setLabFacilityFocused(false), 200)}
                        placeholder="Search all US labs by name, chain, or city (Quest, LabCorp…)"
                      />
                      {labFacilityFocused && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg-white)', boxShadow: 'var(--shadow-md)' }}>
                          {labFacilities.filter(f =>
                            !labFacilitySearch ||
                            f.name.toLowerCase().includes(labFacilitySearch.toLowerCase()) ||
                            f.chain.toLowerCase().includes(labFacilitySearch.toLowerCase()) ||
                            f.city.toLowerCase().includes(labFacilitySearch.toLowerCase()) ||
                            f.address.toLowerCase().includes(labFacilitySearch.toLowerCase())
                          ).map(f => (
                            <div key={f.id} style={{ padding: '7px 10px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', fontSize: 12 }}
                              onMouseEnter={e => e.currentTarget.style.background = '#ecfdf5'}
                              onMouseLeave={e => e.currentTarget.style.background = ''}
                              onClick={() => { setSelectedLabFacility(f); setLabFacilitySearch(''); setLabFacilityFocused(false); }}>
                              <div style={{ fontWeight: 600 }}>{f.name}</div>
                              <div style={{ color: 'var(--text-muted)' }}>{f.address}, {f.city} {f.zip} · {f.phone}</div>
                            </div>
                          ))}
                          {labFacilities.filter(f =>
                            !labFacilitySearch ||
                            f.name.toLowerCase().includes(labFacilitySearch.toLowerCase()) ||
                            f.chain.toLowerCase().includes(labFacilitySearch.toLowerCase()) ||
                            f.city.toLowerCase().includes(labFacilitySearch.toLowerCase())
                          ).length === 0 && (
                            <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No labs found</div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Search Lab Orders</label>
                  <input className="form-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search labs..." />
                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginTop: 4 }}>
                    {filteredLabs.map((lab) => (
                      <div
                        key={lab.code}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}
                        onClick={() => selectLabOrder(lab)}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-light)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = ''}
                      >
                        <span>{lab.name}</span>
                        <span className="text-muted text-xs">{lab.code} · {lab.category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {form.type !== 'Prescription' && (
              <>
                <div className="form-group">
                  <label className="form-label">Order Description *</label>
                  <input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the order..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Clinical Notes</label>
                  <textarea className="form-textarea" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." />
                </div>
              </>
            )}
            {mustForward && (
              <div className="form-group">
                <label className="form-label">Forward to Provider *</label>
                <select className="form-select" value={forwardTo} onChange={(e) => setForwardTo(e.target.value)}>
                  <option value="">— Select a provider —</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.credentials ? `, ${p.credentials}` : ''} — {p.specialty}</option>
                  ))}
                </select>
                {!forwardTo && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Front desk staff cannot place orders directly. Select a provider to forward this order for review and signature.
                  </span>
                )}
              </div>
            )}
            {formError && (
              <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 8, padding: '6px 10px', background: 'rgba(220,38,38,0.07)', borderRadius: 'var(--radius)', border: '1px solid rgba(220,38,38,0.2)' }}>
                ⚠️ {formError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-primary" onClick={handleAdd}
                disabled={
                  form.type === 'Prescription'
                    ? (!rxForm.name.trim() || !rxForm.sig.trim() || (rxSchedule && !rxPdmpAcknowledged) || (mustForward && !forwardTo))
                    : (!form.description.trim() || (mustForward && !forwardTo))
                }>
                {mustForward ? '📨 Forward to Provider' : form.type === 'Prescription' ? '💊 Send Prescription' : 'Place Order'}
              </button>
              <button className="btn btn-sm btn-secondary" onClick={() => { setShowAdd(false); setFormError(''); setRxForm({ name: '', dose: '', sig: '', quantity: '30', refills: '0', pharmacy: '', pharmAddress: '', notes: '' }); setRxPharmAutoSource(null); }}>Cancel</button>
            </div>
          </div>

          {/* PDMPDrawer — prescription controlled substance */}
          <PDMPDrawer
            isOpen={rxPdmpDrawerOpen}
            onClose={() => setRxPdmpDrawerOpen(false)}
            report={rxPdmpReport}
            onAcknowledge={() => { setRxPdmpAcknowledged(true); setRxPdmpDrawerOpen(false); }}
          />
          {/* PharmacySelectorDrawer — IL directory */}
          <PharmacySelectorDrawer
            isOpen={rxPharmDrawerOpen}
            onClose={() => setRxPharmDrawerOpen(false)}
            onSelect={(pharm) => {
              setRxForm(p => ({ ...p, pharmacy: pharm.name || '', pharmAddress: pharm.address || '' }));
              setRxPharmAutoSource('Auto-selected: IL directory');
              setRxPharmDrawerOpen(false);
            }}
            patientAddress={patient?.address
              ? `${patient.address.street || ''} ${patient.address.city || ''} ${patient.address.state || ''} ${patient.address.zip || ''}`.trim()
              : ''}
          />
          </>
        )}

        <div className="card-body no-pad">
          <table className="data-table">
            <thead>
              <tr><th>Type</th><th>Description</th><th>Status</th><th>Date</th><th>Ordered By</th><th>Priority</th><th>Insurance</th><th>Notes</th><th></th></tr>
            </thead>
            <tbody>
              {patientOrders.map((o) => {
                const ins = orderInsurance[o.id];
                return (
                <React.Fragment key={o.id}>
                <tr style={{ cursor: ins ? 'pointer' : 'default' }} onClick={() => ins && setExpandedOrder(expandedOrder === o.id ? null : o.id)}>
                  <td><span className={`badge ${o.type === 'Lab' ? 'badge-info' : o.type === 'Referral' ? 'badge-purple' : o.type === 'Imaging' ? 'badge-warning' : 'badge-gray'}`}>{o.type}</span></td>
                  <td className="font-medium">{o.description}</td>
                  <td>
                    <span className={`badge ${
                      o.status === 'Completed' ? 'badge-success' :
                      o.status === 'Pending' ? 'badge-warning' :
                      o.status === 'Pending EPCS Auth' ? 'badge-danger' :
                      o.status === 'Pending Provider Review' ? 'badge-purple' :
                      o.status === 'Active' ? 'badge-info' : 'badge-gray'
                    }`}>{o.status}</span>
                  </td>
                  <td className="text-sm">{o.orderedDate}</td>
                  <td className="text-sm">{o.orderedBy}</td>
                  <td><span className={`badge ${o.priority === 'Urgent' || o.priority === 'STAT' ? 'badge-danger' : 'badge-gray'}`}>{o.priority}</span></td>
                  <td className="text-sm">
                    {ins ? (
                      <span className={`badge ${ins.coverageStatus === 'Covered' ? 'badge-success' : ins.coverageStatus.includes('Pending') ? 'badge-warning' : 'badge-info'}`}>
                        {ins.coverageStatus}
                      </span>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td className="text-sm text-muted">{o.notes}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm btn-secondary" title="Print order slip" onClick={e => { e.stopPropagation(); printOrder(o); }} style={{ marginRight: 4 }}>🖨️</button>
                    {!['Completed', 'Cancelled'].includes(o.status) && (<>
                      <button className="btn btn-sm btn-success" title="Mark complete" style={{ marginRight: 4 }}
                        onClick={e => { e.stopPropagation(); updateOrder(patientId, o.id, { status: 'Completed' }); }}>✅</button>
                      <button className="btn btn-sm btn-danger" title="Cancel order"
                        onClick={e => { e.stopPropagation(); updateOrder(patientId, o.id, { status: 'Cancelled' }); }}>✕</button>
                    </>)}
                  </td>
                </tr>
                {expandedOrder === o.id && ins && (
                  <tr>
                    <td colSpan={9} style={{ padding: 0, background: 'var(--bg)' }}>
                      <div style={{ padding: '12px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px 24px', fontSize: 12 }}>
                        <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Insurance:</span> {ins.insuranceName}</div>
                        <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Member ID:</span> {ins.memberId}</div>
                        <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Coverage:</span> {ins.coverageStatus}</div>
                        <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Prior Auth:</span> {ins.priorAuthRequired ? `\u2705 Required` : '\u274c Not Required'}</div>
                        {ins.authorizationNumber && <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Auth #:</span> {ins.authorizationNumber}</div>}
                        <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Est. Patient Cost:</span> {ins.estimatedPatientCost === 0 ? '$0.00' : `$${ins.estimatedPatientCost.toFixed(2)}`}</div>
                      </div>
                      {ins.coverageNotes && (
                        <div style={{ padding: '0 20px 12px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Notes:</span> {ins.coverageNotes}
                        </div>
                      )}
                      {(o.orderedByNpi || o.orderedByDea) && (
                        <div style={{ padding: '0 20px 10px', display: 'flex', gap: 20, fontSize: 12 }}>
                          {o.orderedByNpi && <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>NPI:</span> <span style={{ fontFamily: 'monospace' }}>{o.orderedByNpi}</span></div>}
                          {o.orderedByDea && <div><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>DEA:</span> <span style={{ fontFamily: 'monospace' }}>{o.orderedByDea}</span></div>}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                </React.Fragment>
              );
              })}
              {patientOrders.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No orders</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
