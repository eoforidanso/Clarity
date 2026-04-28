import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';
import { medicationDatabase, pharmacies, users } from '../data/mockData';
import { rxnorm as rxnormApi, openfda as openfdaApi } from '../services/api';

// ── MD-only helper: only licensed MDs may authorize / receive refills ──
const isMD = (user) => /\bMD\b/i.test(user?.credentials || '');

// ── Staff Refill Request (non-prescriber) ────────────────────────
function StaffRefillRequest() {
  const { currentUser } = useAuth();
  const { patients, selectedPatient, selectPatient, meds, inboxMessages, addInboxMessage, updateMessageStatus } = usePatient();

  // Only MDs can authorize refills — NPs, PAs, and therapists are excluded
  const providers = users.filter(u => u.role === 'prescriber' && isMD(u));

  const [activeTab, setActiveTab] = useState('assign'); // 'assign' | 'new'

  // ── New Request form state ──────────────────────────────────
  const [patientSearch, setPatientSearch] = useState('');
  const [reqPatient, setReqPatient] = useState(selectedPatient);
  const [selectedMedName, setSelectedMedName] = useState('');
  const [customMed, setCustomMed] = useState('');
  const [providerId, setProviderId] = useState(providers[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── Assign view state ───────────────────────────────────────
  // Track per-message selected provider + assigned state
  const [assignSelections, setAssignSelections] = useState({});   // msgId -> providerId
  const [assignedIds, setAssignedIds] = useState({});             // msgId -> true

  useEffect(() => {
    if (selectedPatient) {
      setReqPatient(selectedPatient);
      setPatientSearch('');
    }
  }, [selectedPatient?.id]);

  // Pending refill requests not yet assigned by staff
  const pendingRefills = inboxMessages.filter(
    m => m.type === 'Rx Refill Request' && m.status !== 'Forwarded' && !assignedIds[m.id]
  );

  const filteredPts = patientSearch.length > 1
    ? patients.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.mrn.toLowerCase().includes(patientSearch.toLowerCase())
      )
    : patients;

  const patientMeds = reqPatient ? (meds[reqPatient.id] || []).filter(m => m.status === 'Active') : [];

  // ── Assign a pending refill to a provider ──────────────────
  const handleAssign = (msg) => {
    const targetProviderId = assignSelections[msg.id] || providers[0]?.id;
    if (!targetProviderId) return;

    const provider = providers.find(p => p.id === targetProviderId);
    const providerLabel = provider
      ? `${provider.credentials ? provider.credentials + ' ' : ''}${provider.firstName} ${provider.lastName}`
      : 'Provider';

    addInboxMessage({
      type: 'Rx Refill Request',
      from: `${currentUser.firstName} ${currentUser.lastName} (Staff — Forwarded)`,
      to: targetProviderId,
      patient: msg.patient,
      patientName: msg.patientName,
      subject: msg.subject,
      body: `[Assigned by ${currentUser.firstName} ${currentUser.lastName}]\n\n${msg.body}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      priority: msg.priority || 'Normal',
      urgent: msg.urgent || false,
      status: 'Unread',
    });

    updateMessageStatus(msg.id, 'Forwarded');
    setAssignedIds(prev => ({ ...prev, [msg.id]: true }));
  };

  // ── Submit new manual request ───────────────────────────────
  const handleSubmit = () => {
    const medLabel = selectedMedName === '__custom__' ? customMed : selectedMedName;
    if (!reqPatient || !medLabel.trim() || !providerId) return;

    const provider = providers.find(p => p.id === providerId);
    const providerLabel = provider
      ? `${provider.credentials ? provider.credentials + ' ' : ''}${provider.firstName} ${provider.lastName}`
      : 'Provider';

    addInboxMessage({
      type: 'Rx Refill Request',
      from: `${currentUser.firstName} ${currentUser.lastName} (Staff)`,
      to: providerId,
      patient: reqPatient.id,
      patientName: `${reqPatient.firstName} ${reqPatient.lastName}`,
      subject: `Refill Request: ${medLabel} — ${reqPatient.firstName} ${reqPatient.lastName}`,
      body: `Refill request submitted by ${currentUser.firstName} ${currentUser.lastName} (${currentUser.role}).\n\nPatient: ${reqPatient.firstName} ${reqPatient.lastName} (${reqPatient.mrn})\nMedication: ${medLabel}\nAssigned to: ${providerLabel}${notes ? `\n\nNotes: ${notes}` : ''}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      priority: urgent ? 'High' : 'Normal',
      urgent,
      status: 'Unread',
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSelectedMedName('');
      setCustomMed('');
      setNotes('');
      setUrgent(false);
    }, 3000);
  };

  const medLabel = selectedMedName === '__custom__' ? customMed : selectedMedName;
  const canSubmit = reqPatient && medLabel.trim() && providerId;

  const isTherapistUser = currentUser?.role === 'therapist';

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>{isTherapistUser ? '� Refill Request Assignment' : '�💊 Refill Management'}</h1>
        <p>{isTherapistUser
          ? 'As a therapist, you can assign refill requests to licensed prescribers for authorization'
          : 'Assign incoming refill requests to providers or submit a new refill request'
        }</p>
      </div>

      {isTherapistUser && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>🚫</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#92400e', marginBottom: 4 }}>Therapist — No Prescribing Authority</div>
            <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
              Licensed therapists (LCSW / LPC / LMFT) <strong>cannot prescribe, authorize refills, or send prescriptions to pharmacies</strong>.
              You may use this page to assign pending refill requests or submit new refill requests to a licensed MD for review and authorization.
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Prescribe', 'Authorize Refills', 'Send to Pharmacy', 'Order Labs'].map(action => (
                <span key={action} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  padding: '2px 9px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                  background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.15)',
                }}>
                  ✕ {action}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isTherapistUser && (
        <div className="alert" style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
          <strong>⚠️ Staff Notice:</strong> Only licensed prescribers can approve and send prescriptions to pharmacies. Use this panel to route refill requests to the appropriate provider's inbox.
        </div>
      )}

      {/* MD-only notice */}
      <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>⚕️</span>
        <span><strong>MD Authorization Only:</strong> Refill requests may only be routed to and authorized by a licensed <strong>Medical Doctor (MD)</strong>. Nurse Practitioners (NP) and Physician Assistants (PA) are not authorized to approve refills in this system.</span>
      </div>

      {/* ── Toggle tabs ── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', width: 'fit-content' }}>
        {[
          { key: 'assign', label: `🔀 Assign Pending Refills${pendingRefills.length > 0 ? ` (${pendingRefills.length})` : ''}` },
          { key: 'new',    label: '➕ New Refill Request' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              padding: '10px 22px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              background: activeTab === t.key ? 'var(--primary)' : 'var(--bg)',
              color: activeTab === t.key ? 'white' : 'var(--text-muted)',
              borderRight: t.key === 'assign' ? '1px solid var(--border)' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ ASSIGN TAB ══════════ */}
      {activeTab === 'assign' && (
        <div>
          {pendingRefills.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Pending Refills</h3>
              <p className="text-secondary">All refill requests have been assigned to a provider.</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setActiveTab('new')}>
                ➕ Submit a New Refill Request
              </button>
            </div>
          ) : (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>🔀 Pending Refill Requests — Awaiting Assignment</h2>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', background: 'var(--warning-bg, #fef3c7)', color: '#92400e', borderRadius: 20 }}>
                  {pendingRefills.length} unassigned
                </span>
              </div>
              <div>
                {pendingRefills.map(msg => {
                  const selectedProv = assignSelections[msg.id] || providers[0]?.id || '';
                  const alreadyAssigned = assignedIds[msg.id];
                  return (
                    <div key={msg.id} style={{
                      padding: '16px 20px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 16,
                      background: msg.urgent ? '#fffbeb' : 'transparent',
                    }}>
                      {/* Icon + priority */}
                      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: msg.urgent ? '#fef3c7' : 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                          💊
                        </div>
                        {msg.urgent && <span style={{ fontSize: 9, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: 8 }}>URGENT</span>}
                      </div>

                      {/* Message info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{msg.subject}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                          <span>👤 <strong>{msg.patientName}</strong></span>
                          <span>📤 From: {msg.from}</span>
                          <span>📅 {msg.date}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', lineHeight: 1.6, maxHeight: 60, overflow: 'hidden' }}>
                          {msg.body}
                        </div>
                      </div>

                      {/* Assign controls */}
                      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assign to Provider</label>
                        <select
                          className="form-select"
                          value={selectedProv}
                          onChange={e => setAssignSelections(prev => ({ ...prev, [msg.id]: e.target.value }))}
                          style={{ fontSize: 12 }}
                        >
                          {providers.length === 0 && (
                          <option value="">No MD prescribers available</option>
                        )}
                        {providers.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.firstName} {p.lastName}{p.credentials ? ` — ${p.credentials}` : ''}
                            </option>
                          ))}
                        </select>
                        <div style={{ fontSize: 9, color: '#92400e', fontWeight: 600, marginTop: 2 }}>MD only</div>
                        {alreadyAssigned ? (
                          <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#065f46', background: '#dcfce7', borderRadius: 6, padding: '7px 0' }}>
                            ✅ Assigned
                          </div>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleAssign(msg)}
                            style={{ fontWeight: 700 }}
                          >
                            📨 Assign to Inbox
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ NEW REQUEST TAB ══════════ */}
      {activeTab === 'new' && (
        submitted ? (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Refill Request Sent</h2>
            <p className="text-secondary">The refill request has been delivered to the provider's inbox for review and approval.</p>
          </div>
        ) : (
          <>
            {/* Patient */}
            <div className="card mb-4">
              <div className="card-header"><h2>👤 Patient</h2></div>
              <div className="card-body">
                {reqPatient ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                      {reqPatient.firstName[0]}{reqPatient.lastName[0]}
                    </div>
                    <div>
                      <div className="font-bold">{reqPatient.lastName}, {reqPatient.firstName}</div>
                      <div className="text-sm text-muted">{reqPatient.mrn} · DOB: {reqPatient.dob}</div>
                    </div>
                    <button className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => setReqPatient(null)}>Change</button>
                  </div>
                ) : (
                  <div>
                    <input
                      className="form-input"
                      placeholder="Search patient by name or MRN..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                    />
                    {patientSearch.length > 1 && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                        {filteredPts.map((p) => (
                          <div key={p.id}
                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13 }}
                            onClick={() => { setReqPatient(p); selectPatient(p.id); setPatientSearch(''); }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}
                          >
                            <strong>{p.lastName}, {p.firstName}</strong> — {p.mrn}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Refill Details */}
            <div className="card mb-4">
              <div className="card-header"><h2>💊 Medication & Provider</h2></div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Medication *</label>
                  {patientMeds.length > 0 ? (
                    <select className="form-select" value={selectedMedName} onChange={(e) => { setSelectedMedName(e.target.value); setCustomMed(''); }}>
                      <option value="">— Select medication —</option>
                      {patientMeds.map((m, i) => (
                        <option key={i} value={`${m.name} ${m.dose}`}>{m.name} {m.dose} — {m.frequency}</option>
                      ))}
                      <option value="__custom__">Other (enter manually)</option>
                    </select>
                  ) : (
                    <input className="form-input" placeholder="Enter medication name and dose..." value={customMed}
                      onChange={(e) => { setCustomMed(e.target.value); setSelectedMedName('__custom__'); }} />
                  )}
                </div>

                {selectedMedName === '__custom__' && patientMeds.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Medication name / dose *</label>
                    <input className="form-input" placeholder="e.g. Sertraline 50mg" value={customMed} onChange={(e) => setCustomMed(e.target.value)} />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">
                    Assign to Provider *
                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '1px 7px', borderRadius: 10 }}>MD Only</span>
                  </label>
                  <select className="form-select" value={providerId} onChange={(e) => setProviderId(e.target.value)}>
                    {providers.length === 0 && <option value="">No MD prescribers available</option>}
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}{p.credentials ? ` — ${p.credentials}` : ''}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: 11, color: '#92400e', marginTop: 4 }}>⚕️ Only licensed MDs can authorize refills. NPs and PAs are not eligible.</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes / Reason</label>
                  <textarea className="form-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Patient reports running low on medication, last filled 03/15..." />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
                    <span className="text-sm font-medium">Mark as Urgent</span>
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={!canSubmit}
                title={!canSubmit ? 'Select a patient and medication first' : ''}>
                📨 Send to Provider Inbox
              </button>
            </div>
          </>
        )
      )}
    </div>
  );
}

// ── Main EPrescribe (prescribers only) ──────────────────────────
export default function EPrescribe() {
  const { currentUser, verifyEPCS, generateEPCSOTP, verifyEPCSOTP } = useAuth();
  const { patients, selectedPatient, selectPatient, addMedication, addOrder } = usePatient();

  const [step, setStep] = useState(1);
  const [selectedMed, setSelectedMed] = useState(null);
  const [medSearch, setMedSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [prescriptionPatient, setPrescriptionPatient] = useState(selectedPatient);

  // Keep in sync if selectedPatient changes (e.g. navigated from chart)
  useEffect(() => {
    if (selectedPatient) {
      setPrescriptionPatient(selectedPatient);
      setPatientSearch('');
    }
  }, [selectedPatient?.id]);
  const [rx, setRx] = useState({
    dose: '',
    frequency: 'Once daily',
    quantity: '30',
    refills: '0',
    sig: '',
    pharmacy: '',
    notes: '',
    daw: false,
  });
  const [pharmacySearch, setPharmacySearch] = useState('');
  const [showPharmacyDropdown, setShowPharmacyDropdown] = useState(false);

  // ── Live RxNorm search state ─────────────────────────────
  const [rxnormResults, setRxnormResults] = useState([]);
  const [rxnormLoading, setRxnormLoading] = useState(false);
  const [rxnormError, setRxnormError] = useState(false);
  const [searchMode, setSearchMode] = useState('local'); // 'local' or 'rxnorm'
  const rxnormTimer = useRef(null);

  // Debounced RxNorm live search
  useEffect(() => {
    if (searchMode !== 'rxnorm' || medSearch.length < 2) { setRxnormResults([]); return; }
    clearTimeout(rxnormTimer.current);
    rxnormTimer.current = setTimeout(async () => {
      setRxnormLoading(true);
      setRxnormError(false);
      try {
        const results = await rxnormApi.searchDrugs(medSearch);
        setRxnormResults(Array.isArray(results) ? results : []);
      } catch {
        setRxnormError(true);
        setRxnormResults([]);
      }
      setRxnormLoading(false);
    }, 400);
    return () => clearTimeout(rxnormTimer.current);
  }, [medSearch, searchMode]);

  // EPCS two-factor state
  const [epcsPhase, setEpcsPhase] = useState(1);        // 1 = PIN, 2 = OTP
  const [epcsPin, setEpcsPin] = useState(['', '', '', '']);
  const [epcsOtpInputs, setEpcsOtpInputs] = useState(['', '', '', '', '', '']);
  const [epcsError, setEpcsError] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');  // shown to demo user
  const [otpExpiry, setOtpExpiry] = useState(null);
  const [otpCountdown, setOtpCountdown] = useState(30);
  const [showSuccess, setShowSuccess] = useState(false);
  const otpTimerRef = useRef(null);

  // Only MDs get full e-prescribe. NPs, PAs, or any non-MD prescriber → staff form.
  if (currentUser?.role !== 'prescriber' || !isMD(currentUser)) {
    return <StaffRefillRequest />;
  }

  const filteredMeds = medSearch.length > 1
    ? medicationDatabase.filter(m =>
        m.name.toLowerCase().includes(medSearch.toLowerCase()) ||
        m.class.toLowerCase().includes(medSearch.toLowerCase())
      )
    : medicationDatabase;

  const filteredPatients = patientSearch.length > 1
    ? patients.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.mrn.toLowerCase().includes(patientSearch.toLowerCase())
      )
    : patients;

  const handleSelectMed = (med) => {
    setSelectedMed(med);
    setRx({ ...rx, dose: med.doses[0] });
    setStep(2);
  };

  const handleSelectPatient = (p) => {
    setPrescriptionPatient(p);
    selectPatient(p.id);
    setPatientSearch('');
  };

  const handlePinChange = (index, value) => {
    if (value.length > 1) return;
    const newPin = [...epcsPin];
    newPin[index] = value;
    setEpcsPin(newPin);
    if (value && index < 3) {
      document.getElementById(`pin-${index + 1}`)?.focus();
    }
  };

  // Phase 1: Verify PIN → generate OTP and advance to phase 2
  const handleVerifyPin = () => {
    const pin = epcsPin.join('');
    if (verifyEPCS(pin)) {
      const otp = generateEPCSOTP();
      setGeneratedOTP(otp);
      setOtpExpiry(Date.now() + 30000);
      setOtpCountdown(30);
      setEpcsError('');
      setEpcsPhase(2);
      // Countdown timer
      clearInterval(otpTimerRef.current);
      otpTimerRef.current = setInterval(() => {
        setOtpCountdown(prev => {
          if (prev <= 1) {
            clearInterval(otpTimerRef.current);
            setEpcsError('One-time code expired. Please start again.');
            setEpcsPhase(1);
            setEpcsPin(['', '', '', '']);
            setEpcsOtpInputs(['', '', '', '', '', '']);
            setGeneratedOTP('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setEpcsError('Incorrect EPCS PIN. Verify your credentials and try again.');
      setEpcsPin(['', '', '', '']);
      document.getElementById('pin-0')?.focus();
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value) || value.length > 1) return;
    const next = [...epcsOtpInputs];
    next[index] = value;
    setEpcsOtpInputs(next);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  // Phase 2: Verify OTP → submit prescription
  const handleVerifyOTP = () => {
    clearInterval(otpTimerRef.current);
    const code = epcsOtpInputs.join('');
    if (verifyEPCSOTP(code)) {
      setEpcsError('');
      handleSubmitPrescription(true);
    } else {
      setEpcsError('Invalid one-time code. Please start the authentication process again.');
      setEpcsOtpInputs(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    }
  };

  const resetEPCS = () => {
    clearInterval(otpTimerRef.current);
    setEpcsPhase(1);
    setEpcsPin(['', '', '', '']);
    setEpcsOtpInputs(['', '', '', '', '', '']);
    setEpcsError('');
    setGeneratedOTP('');
    setStep(2);
  };

  const handleSubmitPrescription = (epcsVerified = false) => {
    if (!prescriptionPatient || !selectedMed) return;

    if (selectedMed.isControlled && !epcsVerified) {
      setStep(3);
      return;
    }

    const newMed = {
      name: selectedMed.name,
      dose: rx.dose,
      route: selectedMed.routes[0],
      frequency: rx.frequency,
      startDate: new Date().toISOString().split('T')[0],
      prescriber: `${currentUser.credentials ? currentUser.credentials + ' ' : ''}${currentUser.firstName} ${currentUser.lastName}`,
      status: 'Active',
      refillsLeft: parseInt(rx.refills) || 0,
      isControlled: selectedMed.isControlled,
      schedule: selectedMed.schedule || null,
      pharmacy: rx.pharmacy || 'Default Pharmacy',
      lastFilled: '',
      sig: rx.sig || `Take ${rx.dose} by ${selectedMed.routes[0].toLowerCase()} ${rx.frequency.toLowerCase()}`,
    };

    addMedication(prescriptionPatient.id, newMed);
    addOrder(prescriptionPatient.id, {
      type: 'Prescription',
      description: `${selectedMed.name} ${rx.dose} - ${rx.frequency}`,
      status: selectedMed.isControlled ? 'Completed (EPCS Verified)' : 'Sent to Pharmacy',
      orderedDate: new Date().toISOString().split('T')[0],
      orderedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      priority: 'Routine',
      notes: rx.notes || `Qty: ${rx.quantity}, Refills: ${rx.refills}${selectedMed.isControlled ? ' [EPCS Authenticated]' : ''}`,
    });

    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setStep(1);
      setSelectedMed(null);
      setMedSearch('');
      setRx({ dose: '', frequency: 'Once daily', quantity: '30', refills: '0', sig: '', pharmacy: '', notes: '', daw: false });
      setPharmacySearch('');
      setShowPharmacyDropdown(false);
      setEpcsPin(['', '', '', '']);
      setEpcsOtpInputs(['', '', '', '', '', '']);
      setEpcsPhase(1);
      setGeneratedOTP('');
    }, 3000);
  };

  if (showSuccess) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Prescription Sent Successfully</h2>
        <p className="text-secondary">
          {selectedMed?.name} {rx.dose} has been sent to {rx.pharmacy || 'the pharmacy'}
          {selectedMed?.isControlled && ' (EPCS Verified)'}
        </p>
        <p className="text-muted mt-2">
          Patient: {prescriptionPatient?.firstName} {prescriptionPatient?.lastName}
        </p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>💊 E-Prescribe</h1>
        <p>Electronic prescribing with EPCS authentication for controlled substances</p>
      </div>

      {/* Step Indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
        {['Select Medication', 'Prescription Details', 'EPCS Authentication'].map((s, i) => (
          <div key={i} style={{
            flex: 1,
            padding: '10px 16px',
            background: step > i ? 'var(--primary)' : step === i + 1 ? 'var(--primary-light)' : 'var(--bg)',
            color: step > i ? 'white' : step === i + 1 ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: step === i + 1 ? 700 : 500,
            fontSize: 13,
            textAlign: 'center',
            borderRadius: i === 0 ? '8px 0 0 8px' : i === 2 ? '0 8px 8px 0' : 0,
          }}>
            Step {i + 1}: {s}
          </div>
        ))}
      </div>

      {/* Patient Selection */}
      <div className="card mb-4">
        <div className="card-header">
          <h2>👤 Patient</h2>
        </div>
        <div className="card-body">
          {prescriptionPatient ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                {prescriptionPatient.firstName[0]}{prescriptionPatient.lastName[0]}
              </div>
              <div>
                <div className="font-bold">{prescriptionPatient.lastName}, {prescriptionPatient.firstName}</div>
                <div className="text-sm text-muted">{prescriptionPatient.mrn} · DOB: {prescriptionPatient.dob}</div>
              </div>
              <button className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => setPrescriptionPatient(null)}>
                Change
              </button>
            </div>
          ) : (
            <div>
              <input
                className="form-input"
                placeholder="Search patient by name or MRN..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
              {patientSearch.length > 1 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                  {filteredPatients.map((p) => (
                    <div key={p.id} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13 }} onClick={() => handleSelectPatient(p)}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <strong>{p.lastName}, {p.firstName}</strong> — {p.mrn}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Step 1: Select Medication */}
      {step === 1 && (
        <div className="card">
          <div className="card-header">
            <h2>💊 Select Medication</h2>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                className={`btn btn-sm ${searchMode === 'local' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSearchMode('local')}
                style={{ fontSize: 11 }}
              >📋 Local Database</button>
              <button
                className={`btn btn-sm ${searchMode === 'rxnorm' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSearchMode('rxnorm')}
                style={{ fontSize: 11 }}
              >🌐 RxNorm (Live NLM API)</button>
            </div>
          </div>
          <div className="card-body">
            <input
              className="form-input mb-3"
              placeholder={searchMode === 'rxnorm' ? 'Search NLM RxNorm database (e.g. sertraline, prozac, abilify)...' : 'Search medications by name or class...'}
              value={medSearch}
              onChange={(e) => setMedSearch(e.target.value)}
              autoFocus
              style={{ fontSize: 16, padding: '12px 16px', borderColor: searchMode === 'rxnorm' ? '#0891b2' : undefined }}
            />

            {searchMode === 'rxnorm' && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0891b2', marginBottom: 4 }}>
                  🔗 Live results from NLM RxNorm API — rxnav.nlm.nih.gov
                </div>
                {rxnormLoading && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 0' }}>⏳ Searching NLM RxNorm database...</div>}
                {rxnormError && <div style={{ fontSize: 12, color: '#d97706', padding: '6px 0' }}>⚠️ RxNorm API unavailable — switch to Local Database</div>}
                {!rxnormLoading && rxnormResults.length > 0 && (
                  <div style={{ maxHeight: 400, overflowY: 'auto', border: '1.5px solid #0891b230', borderRadius: 8, background: '#f0fdfa' }}>
                    {rxnormResults.map((r) => (
                      <button key={r.rxcui} type="button"
                        onClick={() => {
                          // Convert RxNorm result to local format for prescribing
                          const med = {
                            name: r.name,
                            class: r.tty === 'SBD' ? 'Brand Name' : r.tty === 'SCD' ? 'Clinical Drug' : r.tty || 'Drug',
                            doses: ['As directed'],
                            routes: ['Oral'],
                            isControlled: false,
                            rxcui: r.rxcui,
                            source: 'RxNorm',
                          };
                          handleSelectMed(med);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                          padding: '10px 14px', border: 'none', borderBottom: '1px solid #0891b215',
                          background: 'transparent', cursor: 'pointer', textAlign: 'left',
                        }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 10, color: '#0891b2', background: '#0891b218', padding: '2px 8px', borderRadius: 4, flexShrink: 0 }}>
                          RXCUI:{r.rxcui}
                        </span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</span>
                        <span className="badge badge-gray" style={{ fontSize: 10 }}>{r.tty}</span>
                        <span style={{ fontSize: 11, color: '#0891b2', fontWeight: 600 }}>Select →</span>
                      </button>
                    ))}
                  </div>
                )}
                {medSearch.length >= 2 && !rxnormLoading && rxnormResults.length === 0 && !rxnormError && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 0' }}>No RxNorm results — try a different term</div>
                )}
              </div>
            )}

            {searchMode === 'local' && (
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Medication</th><th>Class</th><th>Available Doses</th><th>Route</th><th>Controlled</th><th></th></tr>
                </thead>
                <tbody>
                  {filteredMeds.map((m, i) => (
                    <tr key={i}>
                      <td className="font-semibold">{m.name}</td>
                      <td><span className="badge badge-gray">{m.class}</span></td>
                      <td className="text-sm">{m.doses.join(', ')}</td>
                      <td>{m.routes.join(', ')}</td>
                      <td>
                        {m.isControlled ? (
                          <span className="badge badge-warning">🔒 {m.schedule}</span>
                        ) : (
                          <span className="text-muted">No</span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-sm btn-primary" onClick={() => handleSelectMed(m)}>
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Prescription Details */}
      {step === 2 && selectedMed && (
        <div className="card">
          <div className="card-header">
            <h2>📝 Prescription Details — {selectedMed.name}</h2>
            <button className="btn btn-sm btn-secondary" onClick={() => { setStep(1); setSelectedMed(null); }}>
              ← Back
            </button>
          </div>
          <div className="card-body">
            {!prescriptionPatient && (
              <div className="alert alert-warning mb-4">
                <strong>⚠️ No patient selected.</strong> Please select a patient above before sending this prescription.
              </div>
            )}

            {selectedMed.isControlled && (
              <div className="alert alert-warning mb-4">
                <strong>⚠️ Controlled Substance ({selectedMed.schedule}):</strong> This medication requires EPCS (Electronic Prescribing for Controlled Substances) authentication with two-factor verification before it can be sent to the pharmacy.
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Dose *</label>
                <select className="form-select" value={rx.dose} onChange={(e) => setRx({ ...rx, dose: e.target.value })}>
                  {selectedMed.doses.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Route</label>
                <input className="form-input" value={selectedMed.routes[0]} readOnly style={{ background: '#f1f5f9' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Frequency *</label>
                <select className="form-select" value={rx.frequency} onChange={(e) => setRx({ ...rx, frequency: e.target.value })}>
                  <option>Once daily</option>
                  <option>Once daily in the morning</option>
                  <option>Once daily at bedtime</option>
                  <option>Twice daily</option>
                  <option>Three times daily</option>
                  <option>Four times daily</option>
                  <option>Every 4 hours</option>
                  <option>Every 6 hours</option>
                  <option>Every 8 hours</option>
                  <option>Every 12 hours</option>
                  <option>As needed</option>
                  <option>Once weekly</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input className="form-input" value={rx.quantity} onChange={(e) => setRx({ ...rx, quantity: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Refills</label>
                <select className="form-select" value={rx.refills} onChange={(e) => setRx({ ...rx, refills: e.target.value })}>
                  {selectedMed.isControlled && selectedMed.schedule === 'Schedule II' ? (
                    <option value="0">0 (Schedule II - No refills allowed)</option>
                  ) : (
                    <>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Pharmacy *</label>
                {rx.pharmacy ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                    <span style={{ flex: 1 }}>🏥 <strong>{rx.pharmacy}</strong></span>
                    <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)' }} onClick={() => { setRx({ ...rx, pharmacy: '' }); setPharmacySearch(''); }}>×</button>
                  </div>
                ) : (
                  <>
                    <input className="form-input" value={pharmacySearch}
                      onChange={(e) => { setPharmacySearch(e.target.value); setShowPharmacyDropdown(true); }}
                      onFocus={() => setShowPharmacyDropdown(true)}
                      placeholder="Search pharmacy by name, chain, or city..." />
                    {showPharmacyDropdown && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg-white)', boxShadow: 'var(--shadow-md)' }}>
                        {pharmacies.filter(p =>
                          !pharmacySearch || p.name.toLowerCase().includes(pharmacySearch.toLowerCase()) || p.chain.toLowerCase().includes(pharmacySearch.toLowerCase()) || p.city.toLowerCase().includes(pharmacySearch.toLowerCase()) || p.address.toLowerCase().includes(pharmacySearch.toLowerCase())
                        ).slice(0, 15).map(p => (
                          <div key={p.id} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', fontSize: 12 }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}
                            onClick={() => { setRx({ ...rx, pharmacy: `${p.name} — ${p.address}, ${p.city}` }); setPharmacySearch(''); setShowPharmacyDropdown(false); }}>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            <div style={{ color: 'var(--text-muted)' }}>{p.address}, {p.city}, {p.state} {p.zip} · {p.phone}</div>
                          </div>
                        ))}
                        {pharmacies.filter(p => !pharmacySearch || p.name.toLowerCase().includes(pharmacySearch.toLowerCase()) || p.chain.toLowerCase().includes(pharmacySearch.toLowerCase()) || p.city.toLowerCase().includes(pharmacySearch.toLowerCase())).length === 0 && (
                          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No pharmacies found</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">SIG (Directions)</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={rx.sig}
                onChange={(e) => setRx({ ...rx, sig: e.target.value })}
                placeholder={`Take ${rx.dose} by ${selectedMed.routes[0].toLowerCase()} ${rx.frequency.toLowerCase()}`}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={2} value={rx.notes} onChange={(e) => setRx({ ...rx, notes: e.target.value })} placeholder="Additional notes..." />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={rx.daw} onChange={(e) => setRx({ ...rx, daw: e.target.checked })} />
                <span className="text-sm font-medium">Dispense as Written (DAW) — No substitutions</span>
              </label>
            </div>

            {/* Prescription Preview */}
            <div style={{ background: 'var(--bg)', padding: 20, borderRadius: 'var(--radius-lg)', marginTop: 20, border: '2px solid var(--border)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📋 Prescription Preview</h3>
              <div className="grid-2">
                <div><span className="text-muted text-xs">Medication:</span><div className="font-bold">{selectedMed.name} {rx.dose}</div></div>
                <div><span className="text-muted text-xs">Patient:</span><div className="font-bold">{prescriptionPatient?.lastName}, {prescriptionPatient?.firstName}</div></div>
                <div><span className="text-muted text-xs">SIG:</span><div>{rx.sig || `Take ${rx.dose} by ${selectedMed.routes[0].toLowerCase()} ${rx.frequency.toLowerCase()}`}</div></div>
                <div><span className="text-muted text-xs">Qty / Refills:</span><div>{rx.quantity} / {rx.refills}</div></div>
                <div><span className="text-muted text-xs">Prescriber:</span><div>{currentUser?.credentials} {currentUser?.firstName} {currentUser?.lastName} | NPI: {currentUser?.npi}</div></div>
                <div><span className="text-muted text-xs">DEA:</span><div>{currentUser?.deaNumber}</div></div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => { setStep(1); setSelectedMed(null); }}>Cancel</button>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => handleSubmitPrescription()}
                disabled={!prescriptionPatient}
                title={!prescriptionPatient ? 'Select a patient above first' : ''}
              >
                {selectedMed.isControlled ? '🔒 Proceed to EPCS Authentication' : '📤 Send to Pharmacy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: EPCS Two-Factor Authentication */}
      {step === 3 && (
        <div className="card">
          <div className="card-body epcs-modal" style={{ padding: 40 }}>
            <div className="lock-icon">🔐</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>EPCS Two-Factor Authentication</h2>
            <p className="text-secondary" style={{ marginBottom: 4 }}>
              Controlled Substance: <strong>{selectedMed?.name} ({selectedMed?.schedule})</strong>
            </p>
            <p className="text-secondary" style={{ marginBottom: 20 }}>
              Patient: <strong>{prescriptionPatient?.firstName} {prescriptionPatient?.lastName}</strong>
            </p>

            {/* DEA Compliance Badge */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
              <span style={{ background: '#1e3a8a', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                🏛️ DEA 21 CFR Part 1311
              </span>
              <span style={{ background: '#065f46', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                🔒 Two-Factor Required
              </span>
              <span style={{ background: '#92400e', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                ⚠️ {selectedMed?.schedule}
              </span>
            </div>

            {/* Phase indicator */}
            <div style={{ display: 'flex', gap: 0, maxWidth: 400, margin: '0 auto 28px', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
              {['Factor 1: Knowledge (PIN)', 'Factor 2: Possession (OTP)'].map((label, i) => (
                <div key={i} style={{
                  flex: 1, padding: '10px 8px', textAlign: 'center', fontSize: 12, fontWeight: 600,
                  background: epcsPhase > i ? 'var(--success)' : epcsPhase === i + 1 ? 'var(--primary)' : 'var(--bg)',
                  color: epcsPhase >= i + 1 ? 'white' : 'var(--text-muted)',
                }}>
                  {epcsPhase > i ? '✓ ' : `${i + 1}. `}{label}
                </div>
              ))}
            </div>

            {epcsError && (
              <div className="alert alert-danger" style={{ maxWidth: 480, margin: '0 auto 20px', textAlign: 'left' }}>
                🚫 {epcsError}
              </div>
            )}

            {/* ── Phase 1: PIN ── */}
            {epcsPhase === 1 && (
              <div style={{ maxWidth: 400, margin: '0 auto' }}>
                <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: 10, padding: 16, marginBottom: 20, textAlign: 'left', fontSize: 13 }}>
                  <strong>🔑 Step 1 of 2 — Knowledge Factor</strong><br />
                  Enter your 4-digit EPCS PIN to verify your identity.
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Prescriber: <strong>{currentUser?.credentials} {currentUser?.firstName} {currentUser?.lastName}</strong><br />
                  DEA: <strong>{currentUser?.deaNumber}</strong> | NPI: <strong>{currentUser?.npi}</strong>
                </p>
                {/* Demo hint */}
                <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: 12, textAlign: 'center' }}>
                  🧪 <strong>Demo Mode</strong> — Your mock EPCS PIN: <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 900, letterSpacing: 4, color: '#92400e' }}>{currentUser?.epcsPin}</span>
                </div>
                <div className="pin-input" style={{ justifyContent: 'center', marginBottom: 20 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <input
                      key={i}
                      id={`pin-${i}`}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={epcsPin[i]}
                      onChange={(e) => handlePinChange(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !epcsPin[i] && i > 0) document.getElementById(`pin-${i - 1}`)?.focus();
                        if (e.key === 'Enter' && epcsPin.every(p => p)) handleVerifyPin();
                      }}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button className="btn btn-secondary" onClick={resetEPCS}>← Back</button>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleVerifyPin}
                    disabled={epcsPin.some(p => !p)}
                  >
                    Verify PIN & Continue →
                  </button>
                </div>
              </div>
            )}

            {/* ── Phase 2: OTP ── */}
            {epcsPhase === 2 && (
              <div style={{ maxWidth: 480, margin: '0 auto' }}>
                <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: 16, marginBottom: 20, textAlign: 'left', fontSize: 13 }}>
                  <strong>📱 Step 2 of 2 — Possession Factor</strong><br />
                  A one-time passcode has been sent to your registered authenticator device.<br />
                  <span style={{ color: 'var(--text-muted)' }}>This code expires in <strong style={{ color: otpCountdown <= 10 ? '#dc2626' : 'var(--success)' }}>{otpCountdown}s</strong>.</span>
                </div>

                {/* Demo OTP display — in production this would come from a hardware/software token */}
                <div style={{ textAlign: 'center', background: '#0c1222', borderRadius: 12, padding: '16px 24px', marginBottom: 20, maxWidth: 340, margin: '0 auto 20px' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, letterSpacing: 1 }}>SOFT TOKEN — DEMO MODE</div>
                  <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 12, color: otpCountdown <= 10 ? '#f87171' : '#34d399', fontFamily: 'monospace' }}>
                    {generatedOTP}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 6 }}>Clarity Authenticator · {new Date().toLocaleTimeString()}</div>
                </div>

                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, textAlign: 'center' }}>
                  Enter the 6-digit code shown on your authenticator app:
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={epcsOtpInputs[i]}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !epcsOtpInputs[i] && i > 0) document.getElementById(`otp-${i - 1}`)?.focus();
                        if (e.key === 'Enter' && epcsOtpInputs.every(p => p)) handleVerifyOTP();
                      }}
                      autoFocus={i === 0}
                      style={{
                        width: 48, height: 56, textAlign: 'center', fontSize: 22, fontWeight: 800,
                        border: '2px solid var(--border)', borderRadius: 10, outline: 'none',
                        fontFamily: 'monospace', transition: 'border-color 0.2s',
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button className="btn btn-secondary" onClick={resetEPCS}>← Start Over</button>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleVerifyOTP}
                    disabled={epcsOtpInputs.some(p => !p)}
                    style={{ minWidth: 220 }}
                  >
                    🔓 Authenticate & Sign Prescription
                  </button>
                </div>
                <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                  DEA 21 CFR §1311.115 — Logical Access Credential Verified
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
