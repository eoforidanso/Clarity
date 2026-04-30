import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';

const FORM_TEMPLATES = [
  { id: 'intake-adult', name: 'Adult Intake Questionnaire', category: 'Intake', pages: 4, estimatedTime: '15 min', required: true },
  { id: 'consent-treatment', name: 'Consent to Treatment', category: 'Consent', pages: 2, estimatedTime: '5 min', required: true },
  { id: 'consent-hipaa', name: 'HIPAA Notice & Acknowledgement', category: 'Consent', pages: 3, estimatedTime: '5 min', required: true },
  { id: 'consent-telehealth', name: 'Telehealth Informed Consent', category: 'Consent', pages: 2, estimatedTime: '5 min', required: false },
  { id: 'consent-medication', name: 'Medication Consent & Side Effects', category: 'Consent', pages: 2, estimatedTime: '5 min', required: false },
  { id: 'consent-psychotherapy', name: 'Psychotherapy Informed Consent', category: 'Consent', pages: 2, estimatedTime: '5 min', required: false },
  { id: 'history-psychiatric', name: 'Psychiatric History Form', category: 'History', pages: 6, estimatedTime: '20 min', required: true },
  { id: 'history-substance', name: 'Substance Use History', category: 'History', pages: 3, estimatedTime: '10 min', required: false },
  { id: 'history-medical', name: 'Medical & Surgical History', category: 'History', pages: 3, estimatedTime: '10 min', required: true },
  { id: 'history-family', name: 'Family Psychiatric History', category: 'History', pages: 2, estimatedTime: '8 min', required: false },
  { id: 'insurance-auth', name: 'Insurance Authorization Form', category: 'Insurance', pages: 1, estimatedTime: '3 min', required: true },
  { id: 'release-records', name: 'Release of Information (ROI)', category: 'Legal', pages: 1, estimatedTime: '3 min', required: false },
  { id: 'advance-directive', name: 'Psychiatric Advance Directive', category: 'Legal', pages: 3, estimatedTime: '12 min', required: false },
  { id: 'safety-plan', name: 'Safety Plan', category: 'Clinical', pages: 2, estimatedTime: '10 min', required: false },
  { id: 'demographics', name: 'Demographics & Contact Info', category: 'Intake', pages: 1, estimatedTime: '3 min', required: true },
];

const CATEGORIES = ['All', 'Intake', 'Consent', 'History', 'Insurance', 'Legal', 'Clinical'];

const MOCK_PACKETS = [
  { id: 'pkt-1', patientId: 'p1', patientName: 'James Anderson', sentDate: '2026-04-10', dueDate: '2026-04-14', status: 'Completed', completedDate: '2026-04-12', forms: [
    { formId: 'intake-adult', name: 'Adult Intake Questionnaire', status: 'Completed', completedDate: '2026-04-12T10:22:00' },
    { formId: 'consent-treatment', name: 'Consent to Treatment', status: 'Completed', completedDate: '2026-04-12T10:28:00' },
    { formId: 'consent-hipaa', name: 'HIPAA Notice & Acknowledgement', status: 'Completed', completedDate: '2026-04-12T10:30:00' },
    { formId: 'history-psychiatric', name: 'Psychiatric History Form', status: 'Completed', completedDate: '2026-04-12T10:45:00' },
    { formId: 'history-medical', name: 'Medical & Surgical History', status: 'Completed', completedDate: '2026-04-12T10:52:00' },
  ]},
  { id: 'pkt-2', patientId: 'p3', patientName: 'Robert Chen', sentDate: '2026-04-13', dueDate: '2026-04-16', status: 'In Progress', completedDate: null, forms: [
    { formId: 'intake-adult', name: 'Adult Intake Questionnaire', status: 'Completed', completedDate: '2026-04-14T09:12:00' },
    { formId: 'consent-treatment', name: 'Consent to Treatment', status: 'Completed', completedDate: '2026-04-14T09:18:00' },
    { formId: 'consent-hipaa', name: 'HIPAA Notice & Acknowledgement', status: 'Pending', completedDate: null },
    { formId: 'history-psychiatric', name: 'Psychiatric History Form', status: 'Pending', completedDate: null },
    { formId: 'consent-medication', name: 'Medication Consent & Side Effects', status: 'Pending', completedDate: null },
  ]},
  { id: 'pkt-3', patientId: 'p5', patientName: 'Dorothy Wilson', sentDate: '2026-04-14', dueDate: '2026-04-18', status: 'Sent', completedDate: null, forms: [
    { formId: 'intake-adult', name: 'Adult Intake Questionnaire', status: 'Pending', completedDate: null },
    { formId: 'consent-treatment', name: 'Consent to Treatment', status: 'Pending', completedDate: null },
    { formId: 'consent-hipaa', name: 'HIPAA Notice & Acknowledgement', status: 'Pending', completedDate: null },
    { formId: 'consent-telehealth', name: 'Telehealth Informed Consent', status: 'Pending', completedDate: null },
    { formId: 'history-psychiatric', name: 'Psychiatric History Form', status: 'Pending', completedDate: null },
    { formId: 'history-medical', name: 'Medical & Surgical History', status: 'Pending', completedDate: null },
  ]},
];

export default function IntakeForms() {
  const { currentUser } = useAuth();
  const { patients } = usePatient();
  const [activeView, setActiveView] = useState('packets'); // 'packets' | 'templates'
  const [packets, setPackets] = useState(MOCK_PACKETS);
  const [filterCategory, setFilterCategory] = useState('All');
  const [showNewPacket, setShowNewPacket] = useState(false);
  const [newPacketPatient, setNewPacketPatient] = useState('');
  const [newPacketForms, setNewPacketForms] = useState([]);
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [remindedPackets, setRemindedPackets] = useState(new Set());
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const filteredTemplates = filterCategory === 'All' ? FORM_TEMPLATES : FORM_TEMPLATES.filter(f => f.category === filterCategory);

  const toggleFormSelection = (formId) => {
    setNewPacketForms(prev => prev.includes(formId) ? prev.filter(f => f !== formId) : [...prev, formId]);
  };

  const sendPacket = () => {
    const patient = patients.find(p => p.id === newPacketPatient);
    if (!patient || newPacketForms.length === 0) return;
    const packet = {
      id: `pkt-${Date.now()}`,
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      sentDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 4*86400000).toISOString().split('T')[0],
      status: 'Sent',
      completedDate: null,
      forms: newPacketForms.map(fid => {
        const t = FORM_TEMPLATES.find(f => f.id === fid);
        return { formId: fid, name: t.name, status: 'Pending', completedDate: null };
      }),
    };
    setPackets(prev => [packet, ...prev]);
    setShowNewPacket(false);
    setNewPacketPatient('');
    setNewPacketForms([]);
  };

  const stats = useMemo(() => ({
    total: packets.length,
    completed: packets.filter(p => p.status === 'Completed').length,
    inProgress: packets.filter(p => p.status === 'In Progress').length,
    sent: packets.filter(p => p.status === 'Sent').length,
    overdue: packets.filter(p => p.status !== 'Completed' && new Date(p.dueDate) < new Date()).length,
    completionRate: (() => {
      const allForms = packets.flatMap(p => p.forms);
      const done = allForms.filter(f => f.status === 'Completed').length;
      return allForms.length > 0 ? Math.round((done / allForms.length) * 100) : 0;
    })(),
  }), [packets]);

  const pktStatusColor = (status) => {
    if (status === 'Completed') return { bg: '#dcfce7', color: '#166534', dot: '#22c55e' };
    if (status === 'In Progress') return { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' };
    if (status === 'Sent') return { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' };
    return { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' };
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>📝 Patient Intake & Consent Forms</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Digital intake packets, consent management, and pre-visit form workflows</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setShowNewPacket(true)}>📤 Send Packet</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '📋', value: stats.total, label: 'Total Packets', bg: '#eff6ff' },
          { icon: '✅', value: stats.completed, label: 'Completed', bg: '#dcfce7' },
          { icon: '⏳', value: stats.inProgress, label: 'In Progress', bg: '#fef3c7' },
          { icon: '🔴', value: stats.overdue, label: 'Overdue', bg: '#fee2e2' },
          { icon: '📊', value: `${stats.completionRate}%`, label: 'Form Completion', bg: '#f0f4ff' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {['packets', 'templates'].map(v => (
          <button key={v} onClick={() => setActiveView(v)}
            style={{ padding: '8px 16px', borderRadius: 8, border: activeView === v ? '2px solid var(--primary)' : '1px solid var(--border)', background: activeView === v ? 'var(--primary-light)' : '#fff', color: activeView === v ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>
            {v === 'packets' ? '📨 Patient Packets' : '📄 Form Templates'}
          </button>
        ))}
      </div>

      {activeView === 'packets' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedPacket ? '1fr 1fr' : '1fr', gap: 16 }}>
          {/* Packets list */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>
              📨 Intake Packets ({packets.length})
            </div>
            {packets.map(pkt => {
              const sc = pktStatusColor(pkt.status);
              const completedCount = pkt.forms.filter(f => f.status === 'Completed').length;
              const isOverdue = pkt.status !== 'Completed' && new Date(pkt.dueDate) < new Date();
              return (
                <div key={pkt.id} onClick={() => setSelectedPacket(pkt)}
                  style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedPacket?.id === pkt.id ? 'var(--primary-light)' : 'transparent', transition: 'background 0.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{pkt.patientName}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {isOverdue && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', fontWeight: 800 }}>OVERDUE</span>}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: sc.bg, color: sc.color }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />{pkt.status}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    {completedCount}/{pkt.forms.length} forms completed · Sent {pkt.sentDate} · Due {pkt.dueDate}
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 4, borderRadius: 2, background: '#e2e8f0', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, background: completedCount === pkt.forms.length ? '#22c55e' : '#3b82f6', width: `${(completedCount / pkt.forms.length) * 100}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Packet detail */}
          {selectedPacket && (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{selectedPacket.patientName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Sent {selectedPacket.sentDate} · Due {selectedPacket.dueDate}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => {
                        setRemindedPackets(prev => new Set([...prev, selectedPacket.id]));
                        setTimeout(() => setRemindedPackets(prev => { const n = new Set(prev); n.delete(selectedPacket.id); return n; }), 3000);
                      }}>
                      {remindedPackets.has(selectedPacket.id) ? '✅ Reminded' : '📧 Remind'}
                    </button>
                    <button onClick={() => setSelectedPacket(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                  </div>
                </div>
              </div>
              <div style={{ padding: 20 }}>
                {selectedPacket.forms.map((form, i) => (
                  <div key={form.formId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < selectedPacket.forms.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: form.status === 'Completed' ? '#dcfce7' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                      {form.status === 'Completed' ? '✅' : '📄'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{form.name}</div>
                      {form.completedDate && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                          Completed {new Date(form.completedDate).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: form.status === 'Completed' ? '#dcfce7' : '#fef3c7', color: form.status === 'Completed' ? '#166534' : '#92400e' }}>
                      {form.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeView === 'templates' && (
        <div>
          {/* Category filters */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setFilterCategory(c)}
                style={{ padding: '6px 14px', borderRadius: 8, border: filterCategory === c ? '2px solid var(--primary)' : '1px solid var(--border)', background: filterCategory === c ? 'var(--primary-light)' : '#fff', color: filterCategory === c ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                {c}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {filteredTemplates.map(t => (
              <div key={t.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 28 }}>📄</div>
                  {t.required && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', fontWeight: 800 }}>REQUIRED</span>}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.pages} page{t.pages > 1 ? 's' : ''} · ~{t.estimatedTime}</div>
                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: '#eff6ff', color: '#1e40af', fontWeight: 600, alignSelf: 'flex-start' }}>{t.category}</span>
                <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => setPreviewTemplate(t)}>👁️ Preview</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send Packet Modal */}
      {showNewPacket && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowNewPacket(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '80vh', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #0891b2, #0e7490)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>📤 Send Intake Packet</div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Select forms to send to the patient's portal</div>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14, flex: 1, overflowY: 'auto' }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Patient *</label>
                <select className="form-input" value={newPacketPatient} onChange={e => setNewPacketPatient(e.target.value)}>
                  <option value="">Select patient...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.lastName}, {p.firstName} — MRN {p.mrn}</option>)}
                </select>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>Select Forms ({newPacketForms.length})</label>
                  <button onClick={() => setNewPacketForms(newPacketForms.length === FORM_TEMPLATES.length ? [] : FORM_TEMPLATES.map(f => f.id))}
                    style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700 }}>
                    {newPacketForms.length === FORM_TEMPLATES.length ? 'Deselect All' : 'Select All Required'}
                  </button>
                </div>
                {CATEGORIES.filter(c => c !== 'All').map(cat => {
                  const catForms = FORM_TEMPLATES.filter(f => f.category === cat);
                  return (
                    <div key={cat} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>{cat}</div>
                      {catForms.map(f => (
                        <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                          <input type="checkbox" checked={newPacketForms.includes(f.id)} onChange={() => toggleFormSelection(f.id)} />
                          {f.name}
                          {f.required && <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: '#fee2e2', color: '#991b1b', fontWeight: 800 }}>REQ</span>}
                          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>~{f.estimatedTime}</span>
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{newPacketForms.length} form{newPacketForms.length !== 1 ? 's' : ''} selected</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setShowNewPacket(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={sendPacket} disabled={!newPacketPatient || newPacketForms.length === 0}>📤 Send to Patient</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Template Preview Modal */}
      {previewTemplate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setPreviewTemplate(null); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '80vh', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #0891b2, #0e7490)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>📄 {previewTemplate.name}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{previewTemplate.category} · {previewTemplate.pages} page{previewTemplate.pages !== 1 ? 's' : ''} · ~{previewTemplate.estimatedTime}</div>
              </div>
              <button onClick={() => setPreviewTemplate(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>✕ Close</button>
            </div>
            <div style={{ padding: 22, flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: '#eff6ff', color: '#1e40af', fontWeight: 700 }}>{previewTemplate.category}</span>
                {previewTemplate.required && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', fontWeight: 800 }}>REQUIRED</span>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Form Overview</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }}>
                {[['Pages', previewTemplate.pages], ['Est. Completion', previewTemplate.estimatedTime], ['Category', previewTemplate.category], ['Required for Intake', previewTemplate.required ? 'Yes' : 'No']].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 700, color: 'var(--text-secondary)', width: '40%' }}>{k}</td>
                    <td style={{ padding: '7px 10px' }}>{String(v)}</td>
                  </tr>
                ))}
              </table>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Sample Questions</div>
              <ul style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 18, lineHeight: 1.8, margin: 0 }}>
                {previewTemplate.category === 'Intake' && ['Full legal name and preferred name', 'Date of birth and gender identity', 'Emergency contact information', 'Reason for seeking services today', 'Previous mental health treatment history'].map(q => <li key={q}>{q}</li>)}
                {previewTemplate.category === 'Consent' && ['I have read and understood the above document', 'I voluntarily consent to the described services', 'I understand I may withdraw consent at any time', 'I have had the opportunity to ask questions'].map(q => <li key={q}>{q}</li>)}
                {previewTemplate.category === 'History' && ['Previous diagnoses and treatment', 'Current medications and supplements', 'Family psychiatric history', 'Substance use history', 'Trauma / adverse childhood experiences (ACEs)'].map(q => <li key={q}>{q}</li>)}
                {previewTemplate.category === 'Insurance' && ['Primary insurance carrier', 'Member ID and group number', 'Policy holder name and relationship', 'Secondary insurance (if applicable)'].map(q => <li key={q}>{q}</li>)}
                {previewTemplate.category === 'Legal' && ['Authorized recipients of information', 'Scope and purpose of disclosure', 'Expiration date of authorization', 'Right to revoke authorization in writing'].map(q => <li key={q}>{q}</li>)}
                {previewTemplate.category === 'Clinical' && ['Safety contacts and crisis resources', 'Warning signs to watch for', 'Coping strategies and self-care steps', 'Steps to take if crisis escalates'].map(q => <li key={q}>{q}</li>)}
              </ul>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setPreviewTemplate(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setShowNewPacket(true); setPreviewTemplate(null); }}>📤 Use in Packet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
