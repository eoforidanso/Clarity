import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePatient } from '../../contexts/PatientContext';
import { labOrderDatabase, labFacilities, users, orderInsurance } from '../../data/mockData';

export default function Orders({ patientId }) {
  const { currentUser } = useAuth();
  const { orders, addOrder, updateOrder, addInboxMessage, patients } = usePatient();
  const [showAdd, setShowAdd] = useState(false);
  const [orderType, setOrderType] = useState('Lab');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ type: 'Lab', description: '', priority: 'Routine', notes: '' });
  const [labFacilitySearch, setLabFacilitySearch] = useState('');
  const [selectedLabFacility, setSelectedLabFacility] = useState(null);
  const [labFacilityFocused, setLabFacilityFocused] = useState(false);
  const [forwardTo, setForwardTo] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);

  const isFrontDesk  = currentUser?.role === 'front_desk';
  const isTherapist  = currentUser?.role === 'therapist';
  const isAdmin      = currentUser?.role === 'admin';
  const mustForward  = isFrontDesk;
  const providers = users.filter(u => u.role === 'prescriber');

  const patient = patients?.find(p => p.id === patientId);

  const printOrder = (order) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : patientId;
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
  <div class="facility-name">Clarity Behavioral Health</div>
  <div class="facility-sub">200 N Michigan Ave, Suite 1400, Chicago, IL 60601<br/>Phone: (312) 555-0200 &nbsp;|&nbsp; Fax: (312) 555-0201</div>
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
    if (!form.description.trim()) return;
    if (mustForward && !forwardTo) return;

    const forwardProvider = mustForward ? providers.find(p => p.id === forwardTo) : null;

    addOrder(patientId, {
      ...form,
      labFacility: form.type === 'Lab' && selectedLabFacility ? `${selectedLabFacility.name} — ${selectedLabFacility.city}` : '',
      status: mustForward ? 'Pending Provider Review' : 'Pending',
      orderedDate: new Date().toISOString().split('T')[0],
      orderedBy: mustForward
        ? `${currentUser.firstName} ${currentUser.lastName} → ${forwardProvider.firstName} ${forwardProvider.lastName}`
        : `${currentUser.firstName} ${currentUser.lastName}`,
      forwardedTo: forwardProvider ? `${forwardProvider.firstName} ${forwardProvider.lastName}` : null,
    });

    if (mustForward && forwardProvider) {
      addInboxMessage({
        type: 'Order Forward',
        from: `${currentUser.firstName} ${currentUser.lastName} (${isFrontDesk ? 'Front Desk' : currentUser.role})`,
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
                        placeholder="Search or browse all Illinois labs (Quest, LabCorp…)"
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

            <div className="form-group">
              <label className="form-label">Order Description *</label>
              <input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the order..." />
            </div>
            <div className="form-group">
              <label className="form-label">Clinical Notes</label>
              <textarea className="form-textarea" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." />
            </div>
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
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-primary" onClick={handleAdd} disabled={mustForward && !forwardTo}>
                {mustForward ? '📨 Forward to Provider' : 'Place Order'}
              </button>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
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
