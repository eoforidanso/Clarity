import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

const FAX_STATUSES = ['Queued', 'Sending', 'Delivered', 'Failed', 'Received'];
const STATUS_COLORS = {
  Queued:    { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
  Sending:   { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  Delivered: { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  Failed:    { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  Received:  { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
};

const MOCK_FAXES = [
  { id: 'fax-1', direction: 'Outbound', recipientName: 'Springfield Neurology Associates', recipientFax: '(555) 234-5678', patientName: 'James Anderson', subject: 'Referral — EEG Evaluation', pages: 4, status: 'Delivered', sentDate: '2026-04-14 10:22 AM', deliveredDate: '2026-04-14 10:24 AM', sender: 'Dr. Chris L.', documents: ['Referral form', 'Medication list', 'Progress notes', 'Lab results'], confirmationNumber: 'FAX-2026-8842', retries: 0 },
  { id: 'fax-2', direction: 'Outbound', recipientName: 'Aetna Prior Auth Department', recipientFax: '(800) 555-1234', patientName: 'Maria Garcia', subject: 'Prior Authorization — Neuropsych Testing', pages: 6, status: 'Delivered', sentDate: '2026-04-14 09:15 AM', deliveredDate: '2026-04-14 09:18 AM', sender: 'Front Desk Staff', documents: ['PA form', 'Clinical summary', 'GAD-7 scores', 'PHQ-9 scores', 'Treatment plan', 'Letter of necessity'], confirmationNumber: 'FAX-2026-8840', retries: 0 },
  { id: 'fax-3', direction: 'Inbound', recipientName: 'Clarity Behavioral Health', recipientFax: '(555) 100-2000', patientName: 'Robert Chen', subject: 'PCP Records — Treatment-Resistant Depression', pages: 12, status: 'Received', sentDate: '2026-04-13 02:45 PM', deliveredDate: '2026-04-13 02:45 PM', sender: 'Dr. Amanda Liu (PCP)', documents: ['Patient records', 'Lab panel', 'Pharmacy history', 'Referral letter'], confirmationNumber: 'FAX-IN-4420', retries: 0 },
  { id: 'fax-4', direction: 'Outbound', recipientName: 'UnitedHealthcare Appeals', recipientFax: '(800) 555-9876', patientName: 'Ashley Kim', subject: 'Appeal — Spravato Prior Auth Denial', pages: 8, status: 'Sending', sentDate: '2026-04-15 08:30 AM', deliveredDate: '', sender: 'Dr. Chris L.', documents: ['Appeal letter', 'Updated medication history', 'Peer-reviewed literature', 'Treatment plan', 'Provider notes', 'Patient consent', 'Original denial letter', 'Letter of necessity'], confirmationNumber: '', retries: 0 },
  { id: 'fax-5', direction: 'Outbound', recipientName: 'Cigna Clinical Review', recipientFax: '(800) 555-4321', patientName: 'Robert Chen', subject: 'Additional Info — IOP Authorization', pages: 5, status: 'Failed', sentDate: '2026-04-14 04:10 PM', deliveredDate: '', sender: 'Front Desk Staff', documents: ['ASAM assessment', 'Treatment history', 'Letter of necessity', 'Clinical summary', 'Authorization form'], confirmationNumber: '', retries: 2 },
  { id: 'fax-6', direction: 'Inbound', recipientName: 'Clarity Behavioral Health', recipientFax: '(555) 100-2000', patientName: 'Dorothy Wilson', subject: 'Cardiology Notes & EKG Report', pages: 8, status: 'Received', sentDate: '2026-04-12 11:20 AM', deliveredDate: '2026-04-12 11:20 AM', sender: 'Dr. James Park (Cardiologist)', documents: ['Cardiology notes', 'EKG report', 'Current medications', 'Referral request'], confirmationNumber: 'FAX-IN-4418', retries: 0 },
  { id: 'fax-7', direction: 'Outbound', recipientName: 'LabCorp — Downtown', recipientFax: '(555) 345-6789', patientName: 'James Anderson', subject: 'Lab Order — Lithium Level, TSH, BMP', pages: 2, status: 'Queued', sentDate: '', deliveredDate: '', sender: 'Dr. Chris L.', documents: ['Lab order form', 'Insurance authorization'], confirmationNumber: '', retries: 0 },
];

export default function EFaxCenter() {
  const { currentUser } = useAuth();
  const [faxes, setFaxes] = useState(MOCK_FAXES);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDirection, setFilterDirection] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedFax, setSelectedFax] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeForm, setComposeForm] = useState({ recipientName: '', recipientFax: '', patientName: '', subject: '', documents: '' });

  const filtered = useMemo(() => {
    let list = [...faxes];
    if (filterStatus !== 'All') list = list.filter(f => f.status === filterStatus);
    if (filterDirection !== 'All') list = list.filter(f => f.direction === filterDirection);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f => f.recipientName.toLowerCase().includes(q) || f.patientName.toLowerCase().includes(q) || f.subject.toLowerCase().includes(q));
    }
    return list;
  }, [faxes, filterStatus, filterDirection, search]);

  const stats = useMemo(() => ({
    total: faxes.length,
    outbound: faxes.filter(f => f.direction === 'Outbound').length,
    inbound: faxes.filter(f => f.direction === 'Inbound').length,
    delivered: faxes.filter(f => f.status === 'Delivered').length,
    failed: faxes.filter(f => f.status === 'Failed').length,
    pending: faxes.filter(f => f.status === 'Queued' || f.status === 'Sending').length,
    totalPages: faxes.reduce((s, f) => s + f.pages, 0),
  }), [faxes]);

  const retryFax = (id) => {
    setFaxes(prev => prev.map(f => f.id === id ? { ...f, status: 'Sending', retries: f.retries + 1, sentDate: new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, year: 'numeric', month: '2-digit', day: '2-digit' }) } : f));
    setTimeout(() => {
      setFaxes(prev => prev.map(f => f.id === id && f.status === 'Sending' ? { ...f, status: 'Delivered', deliveredDate: new Date().toLocaleString(), confirmationNumber: `FAX-${Date.now().toString().slice(-6)}` } : f));
    }, 2000);
  };

  const sendFax = () => {
    if (!composeForm.recipientName || !composeForm.recipientFax) return;
    const newFax = {
      id: `fax-${Date.now()}`, direction: 'Outbound', ...composeForm,
      pages: composeForm.documents.split(',').filter(Boolean).length || 1,
      status: 'Queued', sentDate: '', deliveredDate: '', sender: `${currentUser.firstName} ${currentUser.lastName}`,
      documents: composeForm.documents.split(',').map(d => d.trim()).filter(Boolean),
      confirmationNumber: '', retries: 0,
    };
    setFaxes(prev => [newFax, ...prev]);
    setShowCompose(false);
    setComposeForm({ recipientName: '', recipientFax: '', patientName: '', subject: '', documents: '' });
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>📠 eFax Center</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Send and receive faxes digitally — referrals, authorizations, medical records, and lab orders</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCompose(true)}>📤 Send Fax</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '📠', val: stats.total, label: 'Total', bg: '#eff6ff' },
          { icon: '↗️', val: stats.outbound, label: 'Outbound', bg: '#f0fdf4' },
          { icon: '↙️', val: stats.inbound, label: 'Inbound', bg: '#faf5ff' },
          { icon: '✅', val: stats.delivered, label: 'Delivered', bg: '#dcfce7' },
          { icon: '❌', val: stats.failed, label: 'Failed', bg: '#fee2e2' },
          { icon: '📄', val: stats.totalPages, label: 'Total Pages', bg: '#fef3c7' },
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

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <input className="form-input" placeholder="Search faxes..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
        <select className="form-input" value={filterDirection} onChange={e => setFilterDirection(e.target.value)} style={{ width: 130, fontSize: 12 }}>
          <option value="All">All Directions</option>
          <option value="Outbound">Outbound</option>
          <option value="Inbound">Inbound</option>
        </select>
        <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 130, fontSize: 12 }}>
          <option value="All">All Status</option>
          {FAX_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Fax list */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedFax ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
            <span>{filtered.length} Fax{filtered.length !== 1 ? 'es' : ''}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: '#dcfce7', color: '#166534', fontWeight: 700 }}>↗ {stats.outbound}</span>
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: '#dbeafe', color: '#1e40af', fontWeight: 700 }}>↙ {stats.inbound}</span>
            </div>
          </div>
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {filtered.map(fax => {
              const sc = STATUS_COLORS[fax.status];
              return (
                <div key={fax.id} onClick={() => setSelectedFax(fax)}
                  style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedFax?.id === fax.id ? 'var(--primary-light)' : 'transparent', transition: 'background 0.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{fax.direction === 'Outbound' ? '↗️' : '↙️'}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{fax.recipientName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fax.recipientFax}</div>
                      </div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: sc.bg, color: sc.color }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />{fax.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, marginLeft: 26 }}>{fax.subject}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12, marginLeft: 26 }}>
                    <span>👤 {fax.patientName}</span>
                    <span>📄 {fax.pages} page{fax.pages > 1 ? 's' : ''}</span>
                    {fax.sentDate && <span>🕐 {fax.sentDate}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        {selectedFax && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedFax.direction === 'Outbound' ? '↗️' : '↙️'} {selectedFax.subject}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{selectedFax.recipientName} · {selectedFax.recipientFax}</div>
                </div>
                <button onClick={() => setSelectedFax(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                {[
                  ['Direction', selectedFax.direction], ['Status', selectedFax.status],
                  ['Patient', selectedFax.patientName], ['Sender', selectedFax.sender],
                  ['Pages', selectedFax.pages], ['Retries', selectedFax.retries],
                  ['Sent', selectedFax.sentDate || '—'], ['Delivered', selectedFax.deliveredDate || '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
              {selectedFax.confirmationNumber && (
                <div style={{ padding: 10, background: '#dcfce7', borderRadius: 8, fontSize: 12, color: '#065f46', fontWeight: 600, marginBottom: 16 }}>
                  ✅ Confirmation: {selectedFax.confirmationNumber}
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Documents</div>
                {selectedFax.documents.map(d => (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 14 }}>📄</span>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{d}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {selectedFax.status === 'Failed' && <button className="btn btn-primary btn-sm" onClick={() => retryFax(selectedFax.id)}>🔄 Retry</button>}
                {selectedFax.status === 'Queued' && <button className="btn btn-primary btn-sm" onClick={() => { setFaxes(prev => prev.map(f => f.id === selectedFax.id ? { ...f, status: 'Sending', sentDate: new Date().toLocaleString() } : f)); }}>📤 Send Now</button>}
                <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>🖨️ Print</button>
                <button className="btn btn-secondary btn-sm" style={selectedFax.attachedToChart ? { background: '#dcfce7', color: '#166534', borderColor: '#86efac' } : {}} onClick={() => { if (!selectedFax.attachedToChart) { setFaxes(prev => prev.map(f => f.id === selectedFax.id ? { ...f, attachedToChart: true } : f)); setSelectedFax(prev => ({ ...prev, attachedToChart: true })); } }}>
                  {selectedFax.attachedToChart ? '✅ Attached to Chart' : '📋 Attach to Chart'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowCompose(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #475569, #1e293b)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>📤 Compose Fax</div>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Recipient Name *</label>
                  <input className="form-input" value={composeForm.recipientName} onChange={e => setComposeForm(f => ({ ...f, recipientName: e.target.value }))} placeholder="Office or person name..." />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Fax Number *</label>
                  <input className="form-input" value={composeForm.recipientFax} onChange={e => setComposeForm(f => ({ ...f, recipientFax: e.target.value }))} placeholder="(555) 123-4567" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Patient Name</label>
                <input className="form-input" value={composeForm.patientName} onChange={e => setComposeForm(f => ({ ...f, patientName: e.target.value }))} placeholder="Patient this fax relates to..." />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Subject *</label>
                <input className="form-input" value={composeForm.subject} onChange={e => setComposeForm(f => ({ ...f, subject: e.target.value }))} placeholder="Referral, Prior Auth, Records..." />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Attached Documents (comma-separated)</label>
                <textarea className="form-textarea" rows={2} value={composeForm.documents} onChange={e => setComposeForm(f => ({ ...f, documents: e.target.value }))} placeholder="Referral form, Lab results, Progress notes..." />
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowCompose(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={sendFax} disabled={!composeForm.recipientName || !composeForm.recipientFax}>📠 Queue Fax</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
