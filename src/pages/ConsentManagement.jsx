import React, { useState, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

const CONSENT_TYPES = [
  'General Consent to Treatment',
  'Telehealth Informed Consent',
  'Psychotropic Medication Consent',
  'Controlled Substance Agreement',
  'Release of Information (ROI)',
  'HIPAA Notice of Privacy Practices',
  'Financial Responsibility Agreement',
  'Electroconvulsive Therapy (ECT) Consent',
  'Behavioral Health Advance Directive',
  'Minor Consent — Parent/Guardian',
  'Research Study Participation',
  'Substance Use Treatment Consent (42 CFR Part 2)',
];

const STATUS_CLR = {
  Signed:   { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  Pending:  { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  Expired:  { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  Declined: { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
  Voided:   { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
};

const MOCK_CONSENTS = [
  { id: 'c1', patient: 'James Anderson', mrn: 'MRN-001', type: 'General Consent to Treatment', status: 'Signed', signedDate: '2026-01-15', signedBy: 'James Anderson', witnessedBy: 'Nurse Kelly', expiresDate: '2027-01-15', provider: 'Dr. Chris Lee', version: '3.2', method: 'E-Signature', ipAddress: '192.168.1.42' },
  { id: 'c2', patient: 'James Anderson', mrn: 'MRN-001', type: 'Psychotropic Medication Consent', status: 'Signed', signedDate: '2026-01-15', signedBy: 'James Anderson', witnessedBy: 'Dr. Chris Lee', expiresDate: '2027-01-15', provider: 'Dr. Chris Lee', version: '2.1', method: 'E-Signature', ipAddress: '192.168.1.42' },
  { id: 'c3', patient: 'James Anderson', mrn: 'MRN-001', type: 'Controlled Substance Agreement', status: 'Signed', signedDate: '2026-02-01', signedBy: 'James Anderson', witnessedBy: 'Dr. Chris Lee', expiresDate: '2027-02-01', provider: 'Dr. Chris Lee', version: '1.5', method: 'E-Signature', ipAddress: '192.168.1.42' },
  { id: 'c4', patient: 'Maria Garcia', mrn: 'MRN-002', type: 'Telehealth Informed Consent', status: 'Pending', signedDate: '', signedBy: '', witnessedBy: '', expiresDate: '', provider: 'Dr. Chris Lee', version: '2.0', method: '', ipAddress: '' },
  { id: 'c5', patient: 'Robert Chen', mrn: 'MRN-003', type: 'General Consent to Treatment', status: 'Pending', signedDate: '', signedBy: '', witnessedBy: '', expiresDate: '', provider: 'Dr. Chris Lee', version: '3.2', method: '', ipAddress: '' },
  { id: 'c6', patient: 'Ashley Kim', mrn: 'MRN-004', type: 'Release of Information (ROI)', status: 'Signed', signedDate: '2026-03-10', signedBy: 'Ashley Kim', witnessedBy: 'April Torres, LCSW', expiresDate: '2026-09-10', provider: 'April Torres, LCSW', version: '1.8', method: 'Wet Signature (Scanned)', ipAddress: '' },
  { id: 'c7', patient: 'Dorothy Wilson', mrn: 'MRN-005', type: 'HIPAA Notice of Privacy Practices', status: 'Expired', signedDate: '2025-04-01', signedBy: 'Dorothy Wilson', witnessedBy: 'Front Desk', expiresDate: '2026-04-01', provider: 'Dr. Chris Lee', version: '2.5', method: 'E-Signature', ipAddress: '10.0.0.55' },
  { id: 'c8', patient: 'Sophia Martinez', mrn: 'MRN-006', type: 'Substance Use Treatment Consent (42 CFR Part 2)', status: 'Declined', signedDate: '', signedBy: '', witnessedBy: '', expiresDate: '', provider: 'Dr. Chris Lee', version: '1.0', method: '', ipAddress: '', declineReason: 'Patient wants to discuss with family first. Will revisit next visit.' },
];

const CONSENT_TEMPLATES = {
  'General Consent to Treatment': `CONSENT TO TREATMENT\n\nI, the undersigned, hereby voluntarily consent to outpatient behavioral health treatment at Clarity Behavioral Health. I understand that:\n\n1. My treatment may include psychiatric evaluation, medication management, psychotherapy, psychological testing, and/or group therapy.\n\n2. I have the right to refuse any treatment offered.\n\n3. I have been informed of the potential risks, benefits, and alternatives to proposed treatments.\n\n4. All information shared during treatment is confidential except as required by law (e.g., danger to self/others, child/elder abuse, court order).\n\n5. I may revoke this consent at any time by providing written notice.\n\nBy signing below, I acknowledge that I have read and understand this consent form.`,
  'Telehealth Informed Consent': `TELEHEALTH INFORMED CONSENT\n\nI understand that telehealth involves the use of electronic communications to enable healthcare providers to deliver services remotely.\n\n1. I understand that telehealth is not a substitute for in-person care in emergencies.\n2. I will be in a private, safe location during sessions.\n3. I consent to the use of video/audio technology for my appointments.\n4. I understand the risks including technology failures and potential limits to confidentiality.\n5. I have the right to withdraw consent at any time.`,
  'Controlled Substance Agreement': `CONTROLLED SUBSTANCE AGREEMENT\n\nI understand that my provider has prescribed a controlled substance for my treatment. I agree to:\n\n1. Use the medication only as prescribed.\n2. Obtain controlled substances from one provider and one pharmacy only.\n3. Submit to random drug screening when requested.\n4. Not share, sell, or misuse my medications.\n5. Keep all scheduled appointments.\n6. Report any side effects immediately.\n7. Understand that violation of this agreement may result in discontinuation of the medication.`,
};

export default function ConsentManagement() {
  const { currentUser } = useAuth();
  const [consents, setConsents] = useState(MOCK_CONSENTS);
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedConsent, setSelectedConsent] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showSign, setShowSign] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newForm, setNewForm] = useState({ patient: '', type: CONSENT_TYPES[0] });

  const filtered = useMemo(() => {
    let list = [...consents];
    if (filterStatus !== 'All') list = list.filter(c => c.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.patient.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
    }
    return list;
  }, [consents, filterStatus, search]);

  const stats = useMemo(() => ({
    total: consents.length,
    signed: consents.filter(c => c.status === 'Signed').length,
    pending: consents.filter(c => c.status === 'Pending').length,
    expired: consents.filter(c => c.status === 'Expired').length,
  }), [consents]);

  // Canvas drawing for e-signature
  const startDraw = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };
  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };
  const endDraw = () => setIsDrawing(false);
  const clearSig = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const signConsent = () => {
    if (!selectedConsent) return;
    const today = new Date().toISOString().slice(0, 10);
    const expiresDate = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    setConsents(prev => prev.map(c => c.id === selectedConsent.id ? {
      ...c, status: 'Signed', signedDate: today, signedBy: selectedConsent.patient,
      witnessedBy: currentUser?.name || `${currentUser?.firstName} ${currentUser?.lastName}`,
      expiresDate, method: 'E-Signature', ipAddress: '192.168.1.x',
    } : c));
    setShowSign(false);
    setSelectedConsent(prev => prev ? { ...prev, status: 'Signed', signedDate: today } : null);
  };

  const sendForSignature = (id) => {
    alert('📧 Consent form sent to patient portal for e-signature.');
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>✍️ Consent & E-Signatures</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Manage informed consent forms, track signatures, and ensure compliance</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>➕ New Consent</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '📋', val: stats.total, label: 'Total', bg: '#eff6ff' },
          { icon: '✅', val: stats.signed, label: 'Signed', bg: '#dcfce7' },
          { icon: '⏳', val: stats.pending, label: 'Pending', bg: '#fef3c7' },
          { icon: '⚠️', val: stats.expired, label: 'Expired', bg: '#fee2e2' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{s.icon}</div>
            <div><div style={{ fontSize: 18, fontWeight: 800 }}>{s.val}</div><div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <input className="form-input" placeholder="Search patients or consent types..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
        <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 150, fontSize: 12 }}>
          <option value="All">All Statuses</option>
          {Object.keys(STATUS_CLR).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* List + Detail */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedConsent ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>{filtered.length} Consent Form{filtered.length !== 1 ? 's' : ''}</div>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {filtered.map(c => {
              const sc = STATUS_CLR[c.status] || STATUS_CLR.Pending;
              return (
                <div key={c.id} onClick={() => setSelectedConsent(c)}
                  style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedConsent?.id === c.id ? 'var(--primary-light)' : c.status === 'Expired' ? '#fef2f2' : 'transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{c.patient}</div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: sc.bg, color: sc.color }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />{c.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.type}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {c.signedDate ? `Signed: ${c.signedDate}` : 'Awaiting signature'} · v{c.version}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedConsent && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>✍️ {selectedConsent.type}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{selectedConsent.patient} · {selectedConsent.mrn}</div>
                </div>
                <button onClick={() => setSelectedConsent(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>
            </div>
            <div style={{ padding: 20, overflowY: 'auto', maxHeight: 460 }}>
              {/* Consent content preview */}
              <div style={{ padding: 14, background: '#fafafa', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 16, maxHeight: 160, overflowY: 'auto' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Document Preview</div>
                <div style={{ fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                  {CONSENT_TEMPLATES[selectedConsent.type] || `[${selectedConsent.type} — Standard institutional consent document v${selectedConsent.version}]\n\nFull document text would render here from the document template library.`}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                {[
                  ['Status', selectedConsent.status],
                  ['Version', `v${selectedConsent.version}`],
                  ['Provider', selectedConsent.provider],
                  ['Method', selectedConsent.method || '—'],
                  ['Signed Date', selectedConsent.signedDate || '—'],
                  ['Expires', selectedConsent.expiresDate || '—'],
                  ['Signed By', selectedConsent.signedBy || '—'],
                  ['Witnessed By', selectedConsent.witnessedBy || '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>

              {selectedConsent.status === 'Signed' && (
                <div style={{ padding: 12, background: '#dcfce7', borderRadius: 8, border: '1px solid #86efac', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>✅ Electronically Signed</div>
                  <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>IP: {selectedConsent.ipAddress || 'N/A'} · Timestamp: {selectedConsent.signedDate}</div>
                </div>
              )}

              {selectedConsent.declineReason && (
                <div style={{ padding: 12, background: '#fef3c7', borderRadius: 8, border: '1px solid #fde68a', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e' }}>⚠️ Decline Reason</div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>{selectedConsent.declineReason}</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selectedConsent.status === 'Pending' && (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowSign(true)}>✍️ Capture Signature</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => sendForSignature(selectedConsent.id)}>📧 Send to Portal</button>
                  </>
                )}
                {selectedConsent.status === 'Expired' && (
                  <button className="btn btn-primary btn-sm" onClick={() => sendForSignature(selectedConsent.id)}>🔄 Renew & Resend</button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => alert('🖨️ Printing consent form...')}>🖨️ Print</button>
                <button className="btn btn-secondary btn-sm" onClick={() => alert('📤 Downloading PDF...')}>📤 Download PDF</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* E-Signature Modal */}
      {showSign && selectedConsent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowSign(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>✍️ Capture E-Signature</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>{selectedConsent.patient} — {selectedConsent.type}</div>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                Please have the patient sign in the box below using a mouse, stylus, or finger (touch screen).
              </div>
              <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: 4, marginBottom: 12 }}>
                <canvas ref={canvasRef} width={420} height={150}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  style={{ cursor: 'crosshair', display: 'block', width: '100%', borderRadius: 8, background: '#fafafa' }} />
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                <button className="btn btn-sm btn-secondary" onClick={clearSig}>🗑️ Clear</button>
                <span style={{ flex: 1 }} />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  ⚖️ This constitutes a legally binding electronic signature per ESIGN Act
                </div>
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, marginBottom: 8 }}>
                <input type="checkbox" style={{ marginTop: 2 }} />
                I confirm this signature is my own and I have read and understood the above consent document.
              </label>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowSign(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={signConsent}>✍️ Apply Signature</button>
            </div>
          </div>
        </div>
      )}

      {/* New Consent Modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowNew(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #4f46e5, #3730a3)', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>➕ New Consent Form</div>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Patient Name</label>
                <input className="form-input" value={newForm.patient} onChange={e => setNewForm(f => ({ ...f, patient: e.target.value }))} placeholder="e.g., James Anderson" />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Consent Type</label>
                <select className="form-input" value={newForm.type} onChange={e => setNewForm(f => ({ ...f, type: e.target.value }))}>
                  {CONSENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                if (!newForm.patient.trim()) return;
                setConsents(prev => [{ id: `c-${Date.now()}`, patient: newForm.patient, mrn: 'MRN-NEW', type: newForm.type, status: 'Pending', signedDate: '', signedBy: '', witnessedBy: '', expiresDate: '', provider: `${currentUser?.firstName} ${currentUser?.lastName}`, version: '1.0', method: '', ipAddress: '', }, ...prev]);
                setShowNew(false);
                setNewForm({ patient: '', type: CONSENT_TYPES[0] });
              }}>📋 Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
