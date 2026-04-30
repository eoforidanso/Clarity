import React, { useState, useCallback, useMemo, useRef } from 'react';
import { usePatient } from '../contexts/PatientContext';

/* ── Patient Self Check-In Page ─────────────────────────────
   Digital intake with screeners, consent forms, insurance card scan
   Matches athenaOne's self check-in workflow
──────────────────────────────────────────────────────────── */

const CHECKIN_STEPS = [
  { id: 'verify',    label: 'Verify Identity',   icon: '🆔' },
  { id: 'demo',      label: 'Demographics',      icon: '👤' },
  { id: 'insurance', label: 'Insurance',          icon: '💳' },
  { id: 'consent',   label: 'Consent Forms',      icon: '✍️' },
  { id: 'screeners', label: 'Screeners',          icon: '📋' },
  { id: 'payment',   label: 'Copay Payment',      icon: '💰' },
  { id: 'complete',  label: 'Complete',            icon: '✅' },
];

const PHQ2_QUESTIONS = [
  'Over the last 2 weeks, have you had little interest or pleasure in doing things?',
  'Over the last 2 weeks, have you been feeling down, depressed, or hopeless?',
];
const GAD2_QUESTIONS = [
  'Over the last 2 weeks, have you felt nervous, anxious, or on edge?',
  'Over the last 2 weeks, have you not been able to stop or control worrying?',
];
const SAFETY_QUESTIONS = [
  'Have you had thoughts of hurting yourself or ending your life?',
  'Do you feel safe in your current living situation?',
  'Have you experienced any abuse or violence recently?',
];

const CONSENT_FORMS = [
  { id: 'treatment', title: 'Consent for Treatment', desc: 'I consent to evaluation, treatment, and procedures as recommended by my provider.', required: true },
  { id: 'hipaa', title: 'HIPAA Notice of Privacy Practices', desc: 'I acknowledge receipt of the Notice of Privacy Practices and understand how my health information may be used.', required: true },
  { id: 'telehealth', title: 'Telehealth Consent', desc: 'I consent to receiving healthcare services via audio/video telecommunications technology.', required: false },
  { id: 'medication', title: 'Medication Consent', desc: 'I consent to medication management and understand the risks, benefits, and alternatives discussed.', required: false },
  { id: 'release', title: 'Release of Information', desc: 'I authorize the release of my medical records as specified to designated individuals.', required: false },
  { id: 'financial', title: 'Financial Agreement', desc: 'I agree to be responsible for applicable copays, deductibles, and non-covered services.', required: true },
];

export default function PatientCheckIn() {
  const { patients } = usePatient();
  const frontFileRef = useRef(null);
  const backFileRef = useRef(null);
  const [step, setStep] = useState(0);
  const [verifyError, setVerifyError] = useState('');
  const [dobError, setDobError] = useState('');
  const [data, setData] = useState({
    // Verification
    dob: '', lastName: '', verified: false, matchedPatient: null,
    // Demographics (populated after successful identity match)
    firstName: '', lastNameDemo: '', dobDemo: '',
    phone: '', email: '',
    address: '',
    emergencyName: '', emergencyPhone: '', emergencyRelation: '',
    pharmacy: '',
    demoConfirmed: false,
    // Insurance
    insuranceCardFront: null, insuranceCardBack: null,
    memberId: '', groupNumber: '', payer: '',
    insuranceConfirmed: false,
    // Consents
    consents: {},
    // Screeners
    phq2: [null, null], gad2: [null, null], safety: [null, null, null],
    // Payment
    copayAmount: 0, paymentMethod: '', paymentComplete: false,
  });

  const today = new Date().toISOString().split('T')[0];

  const updateData = useCallback((field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleDobChange = useCallback((value) => {
    if (value && value > today) {
      setDobError('Date of birth cannot be in the future.');
    } else {
      setDobError('');
    }
    updateData('dob', value);
  }, [today, updateData]);

  const handleVerify = useCallback(() => {
    setVerifyError('');
    const enteredLast = data.lastName.trim().toLowerCase();
    const enteredDob  = data.dob;
    if (!enteredLast || !enteredDob) return;
    if (enteredDob > today) {
      setDobError('Date of birth cannot be in the future.');
      return;
    }
    const match = patients.find(
      p => p.lastName.toLowerCase() === enteredLast && p.dob === enteredDob
    );
    if (!match) {
      setVerifyError('No matching patient found. Please check your last name and date of birth.');
      return;
    }
    const ins = match.insurance?.primary;
    setData(prev => ({
      ...prev,
      verified: true,
      matchedPatient: match,
      firstName: match.firstName,
      lastNameDemo: match.lastName,
      dobDemo: match.dob,
      phone: match.cellPhone || match.phone || '',
      email: match.email || '',
      address: match.address
        ? `${match.address.street}, ${match.address.city}, ${match.address.state} ${match.address.zip}`
        : '',
      emergencyName: match.emergencyContact?.name || '',
      emergencyPhone: match.emergencyContact?.phone || '',
      emergencyRelation: match.emergencyContact?.relationship || '',
      memberId: ins?.memberId || '',
      groupNumber: ins?.groupNumber || '',
      payer: ins?.name || '',
      copayAmount: ins?.copay ?? 0,
    }));
  }, [data.lastName, data.dob, today, patients]);

  const currentStep = CHECKIN_STEPS[step];
  const canProceed = useMemo(() => {
    switch (currentStep?.id) {
      case 'verify': return data.verified;
      case 'demo': return data.demoConfirmed;
      case 'insurance': return data.insuranceConfirmed;
      case 'consent': {
        const requiredForms = CONSENT_FORMS.filter(f => f.required);
        return requiredForms.every(f => data.consents[f.id]);
      }
      case 'screeners': return data.phq2.every(v => v !== null) && data.gad2.every(v => v !== null) && data.safety.every(v => v !== null);
      case 'payment': return data.paymentComplete;
      default: return true;
    }
  }, [step, data, currentStep]);

  const phq2Score = data.phq2.reduce((s, v) => s + (v || 0), 0);
  const gad2Score = data.gad2.reduce((s, v) => s + (v || 0), 0);
  const safetyFlag = data.safety.some(v => v === 1);

  const renderStep = () => {
    switch (currentStep?.id) {
      case 'verify':
        return (
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>🆔 Verify Your Identity</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
              Please confirm your information to begin check-in.
            </p>
            <div style={{ display: 'grid', gap: 14, maxWidth: 400 }}>
              <div>
                <label className="form-label">Last Name</label>
                <input className="form-input" placeholder="Enter your last name"
                  value={data.lastName} onChange={e => updateData('lastName', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Date of Birth</label>
                <input className="form-input" type="date"
                  value={data.dob}
                  max={today}
                  onChange={e => handleDobChange(e.target.value)} />
                {dobError && (
                  <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{dobError}</p>
                )}
              </div>
              <button className="btn btn-primary"
                disabled={!data.lastName || !data.dob || !!dobError}
                onClick={handleVerify}>
                ✅ Verify Identity
              </button>
              {verifyError && (
                <div className="alert alert-danger" style={{ marginTop: 8 }}>
                  ❌ {verifyError}
                </div>
              )}
              {data.verified && (
                <div className="alert alert-success" style={{ marginTop: 8 }}>
                  ✅ Identity verified — Welcome, {data.firstName} {data.lastNameDemo}!
                </div>
              )}
            </div>
          </div>
        );

      case 'demo':
        return (
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>👤 Confirm Your Demographics</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
              Please review and update your information if anything has changed.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 600 }}>
              <div><label className="form-label">First Name</label><input className="form-input" value={data.firstName} onChange={e => updateData('firstName', e.target.value)} /></div>
              <div><label className="form-label">Last Name</label><input className="form-input" value={data.lastNameDemo} onChange={e => updateData('lastNameDemo', e.target.value)} /></div>
              <div><label className="form-label">Date of Birth</label><input className="form-input" type="date" value={data.dobDemo} readOnly style={{ background: '#f7f9fc' }} /></div>
              <div><label className="form-label">Phone</label><input className="form-input" value={data.phone} onChange={e => updateData('phone', e.target.value)} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Email</label><input className="form-input" value={data.email} onChange={e => updateData('email', e.target.value)} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Address</label><input className="form-input" value={data.address} onChange={e => updateData('address', e.target.value)} /></div>
              <div><label className="form-label">Preferred Pharmacy</label><input className="form-input" value={data.pharmacy} onChange={e => updateData('pharmacy', e.target.value)} /></div>
            </div>
            <div style={{ marginTop: 20, padding: 14, border: '1px solid var(--border)', borderRadius: 8, background: '#fafbfc' }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>🚨 Emergency Contact</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div><label className="form-label" style={{ fontSize: 10 }}>Name</label><input className="form-input" value={data.emergencyName} onChange={e => updateData('emergencyName', e.target.value)} /></div>
                <div><label className="form-label" style={{ fontSize: 10 }}>Phone</label><input className="form-input" value={data.emergencyPhone} onChange={e => updateData('emergencyPhone', e.target.value)} /></div>
                <div><label className="form-label" style={{ fontSize: 10 }}>Relation</label><input className="form-input" value={data.emergencyRelation} onChange={e => updateData('emergencyRelation', e.target.value)} /></div>
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => updateData('demoConfirmed', true)}>
              ✅ Confirm Demographics
            </button>
            {data.demoConfirmed && <div className="alert alert-success" style={{ marginTop: 8 }}>✅ Demographics confirmed</div>}
          </div>
        );

      case 'insurance':
        return (
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>💳 Insurance Verification</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
              Upload photos of your insurance card or confirm information on file.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, maxWidth: 600 }}>
              <div style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: 24, textAlign: 'center', background: data.insuranceCardFront ? '#f0fdf4' : '#fafbfc', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => frontFileRef.current?.click()}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{data.insuranceCardFront ? '✅' : '📷'}</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{data.insuranceCardFront ? `✅ ${data.insuranceCardFront}` : 'Tap to Upload Front'}</div>
                {!data.insuranceCardFront && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>JPG, PNG, or PDF</div>}
              </div>
              <div style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: 24, textAlign: 'center', background: data.insuranceCardBack ? '#f0fdf4' : '#fafbfc', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => backFileRef.current?.click()}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{data.insuranceCardBack ? '✅' : '📷'}</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{data.insuranceCardBack ? `✅ ${data.insuranceCardBack}` : 'Tap to Upload Back'}</div>
                {!data.insuranceCardBack && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>JPG, PNG, or PDF</div>}
              </div>
              <input ref={frontFileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) updateData('insuranceCardFront', e.target.files[0].name); }} />
              <input ref={backFileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) updateData('insuranceCardBack', e.target.files[0].name); }} />
            </div>
            <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8, background: '#fafbfc', maxWidth: 600, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>📋 Insurance on File</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                <div><strong>Payer:</strong> {data.payer}</div>
                <div><strong>Member ID:</strong> {data.memberId}</div>
                <div><strong>Group #:</strong> {data.groupNumber}</div>
                <div><strong>Copay:</strong> ${data.copayAmount}</div>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => updateData('insuranceConfirmed', true)}>
              ✅ Confirm Insurance Information
            </button>
            {data.insuranceConfirmed && <div className="alert alert-success" style={{ marginTop: 8 }}>✅ Insurance verified</div>}
          </div>
        );

      case 'consent':
        return (
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>✍️ Consent Forms</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
              Please review and sign the following consent forms. Required forms are marked with *.
            </p>
            <div style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
              {CONSENT_FORMS.map(form => {
                const signed = !!data.consents[form.id];
                return (
                  <div key={form.id} style={{
                    border: `1.5px solid ${signed ? '#86efac' : form.required ? '#fca5a5' : 'var(--border)'}`,
                    borderRadius: 10, overflow: 'hidden', background: signed ? '#f0fdf4' : '#fff',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {form.title}
                          {form.required && <span style={{ color: '#ef4444', fontSize: 12 }}>*</span>}
                          {signed && <span className="badge badge-success" style={{ fontSize: 10 }}>✓ Signed</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{form.desc}</div>
                      </div>
                      <button className={`btn btn-sm ${signed ? 'btn-success' : 'btn-primary'}`}
                        onClick={() => updateData('consents', { ...data.consents, [form.id]: signed ? false : new Date().toISOString() })}>
                        {signed ? '✓ Signed' : '✍️ Sign'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'screeners':
        return (
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>📋 Pre-Visit Screeners</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
              Please complete the following brief assessments before your visit.
            </p>

            {/* PHQ-2 */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16, overflow: 'hidden', maxWidth: 640 }}>
              <div style={{ padding: '10px 16px', background: '#eef2ff', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, color: '#4338ca' }}>
                😔 PHQ-2 Depression Screening
              </div>
              <div style={{ padding: 16 }}>
                {PHQ2_QUESTIONS.map((q, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, marginBottom: 6 }}>{q}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[{ v: 0, l: 'Not at all' }, { v: 1, l: 'Several days' }, { v: 2, l: 'More than half' }, { v: 3, l: 'Nearly every day' }].map(opt => (
                        <button key={opt.v} className={`btn btn-sm ${data.phq2[i] === opt.v ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: 11 }}
                          onClick={() => { const n = [...data.phq2]; n[i] = opt.v; updateData('phq2', n); }}>
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 8, padding: '6px 12px', borderRadius: 6, background: phq2Score >= 3 ? '#fef2f2' : '#f0fdf4', fontSize: 12, fontWeight: 600 }}>
                  Score: {phq2Score}/6 {phq2Score >= 3 ? '⚠️ Positive screen — PHQ-9 recommended' : '✅ Negative screen'}
                </div>
              </div>
            </div>

            {/* GAD-2 */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16, overflow: 'hidden', maxWidth: 640 }}>
              <div style={{ padding: '10px 16px', background: '#fefce8', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, color: '#a16207' }}>
                😰 GAD-2 Anxiety Screening
              </div>
              <div style={{ padding: 16 }}>
                {GAD2_QUESTIONS.map((q, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, marginBottom: 6 }}>{q}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[{ v: 0, l: 'Not at all' }, { v: 1, l: 'Several days' }, { v: 2, l: 'More than half' }, { v: 3, l: 'Nearly every day' }].map(opt => (
                        <button key={opt.v} className={`btn btn-sm ${data.gad2[i] === opt.v ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: 11 }}
                          onClick={() => { const n = [...data.gad2]; n[i] = opt.v; updateData('gad2', n); }}>
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 8, padding: '6px 12px', borderRadius: 6, background: gad2Score >= 3 ? '#fef2f2' : '#f0fdf4', fontSize: 12, fontWeight: 600 }}>
                  Score: {gad2Score}/6 {gad2Score >= 3 ? '⚠️ Positive screen — GAD-7 recommended' : '✅ Negative screen'}
                </div>
              </div>
            </div>

            {/* Safety Screening */}
            <div style={{ border: '1.5px solid #fca5a5', borderRadius: 10, overflow: 'hidden', maxWidth: 640 }}>
              <div style={{ padding: '10px 16px', background: '#fef2f2', borderBottom: '1px solid #fca5a5', fontWeight: 700, fontSize: 13, color: '#991b1b' }}>
                🛡️ Safety Screening
              </div>
              <div style={{ padding: 16 }}>
                {SAFETY_QUESTIONS.map((q, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, marginBottom: 6 }}>{q}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[{ v: 0, l: 'No' }, { v: 1, l: 'Yes' }].map(opt => (
                        <button key={opt.v} className={`btn btn-sm ${data.safety[i] === opt.v ? (opt.v === 1 ? 'btn-danger' : 'btn-primary') : 'btn-secondary'}`}
                          style={{ fontSize: 11, minWidth: 60 }}
                          onClick={() => { const n = [...data.safety]; n[i] = opt.v; updateData('safety', n); }}>
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {safetyFlag && (
                  <div className="alert alert-danger" style={{ marginTop: 8, fontSize: 12 }}>
                    🚨 Safety concern flagged — Care team will be notified immediately upon check-in completion.
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'payment':
        return (
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>💰 Copay Payment</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
              Your estimated copay for today's visit is shown below.
            </p>
            <div style={{ maxWidth: 440, margin: '0 auto', textAlign: 'center' }}>
              <div style={{ padding: 24, border: '2px solid var(--border)', borderRadius: 16, marginBottom: 20, background: '#fafbfc' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Estimated Copay</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--primary)' }}>${data.copayAmount}.00</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{data.payer} · In-Network</div>
              </div>
              <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
                {['Credit/Debit Card', 'HSA/FSA Card', 'Pay at Visit'].map(method => (
                  <button key={method}
                    className={`btn ${data.paymentMethod === method ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '12px 20px', fontSize: 13 }}
                    onClick={() => updateData('paymentMethod', method)}>
                    {method === 'Credit/Debit Card' ? '💳' : method === 'HSA/FSA Card' ? '🏦' : '🏥'} {method}
                  </button>
                ))}
              </div>
              {data.paymentMethod && (
                <button className="btn btn-success" style={{ width: '100%', padding: '12px 20px', fontSize: 14 }}
                  onClick={() => updateData('paymentComplete', true)}>
                  {data.paymentMethod === 'Pay at Visit' ? '✅ Confirm — Pay at Visit' : `✅ Pay $${data.copayAmount}.00 Now`}
                </button>
              )}
              {data.paymentComplete && (
                <div className="alert alert-success" style={{ marginTop: 12 }}>
                  ✅ {data.paymentMethod === 'Pay at Visit' ? 'Payment deferred to visit' : `Payment of $${data.copayAmount}.00 processed successfully`}
                </div>
              )}
            </div>
          </div>
        );

      case 'complete':
        return (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 22, marginBottom: 8 }}>Check-In Complete!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 480, margin: '0 auto', lineHeight: 1.6, marginBottom: 24 }}>
              You're all set. Your care team has been notified and your visit will begin shortly. 
              Please have a seat in the waiting area.
            </p>
            <div style={{ display: 'inline-grid', gridTemplateColumns: '1fr 1fr', gap: 12, textAlign: 'left', marginBottom: 24 }}>
              <div style={{ padding: '12px 16px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #86efac' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#166534' }}>PHQ-2</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{phq2Score}/6</div>
              </div>
              <div style={{ padding: '12px 16px', borderRadius: 8, background: '#fefce8', border: '1px solid #fde047' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#a16207' }}>GAD-2</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{gad2Score}/6</div>
              </div>
            </div>
            {safetyFlag && (
              <div className="alert alert-danger" style={{ maxWidth: 480, margin: '0 auto' }}>
                🚨 Safety concern flagged — Your provider has been notified and will address this during your visit.
              </div>
            )}
            <div style={{ marginTop: 20 }}>
              <button className="btn btn-primary" onClick={() => { setStep(0); setData(prev => ({ ...prev, verified: false, demoConfirmed: false, insuranceConfirmed: false, consents: {}, phq2: [null, null], gad2: [null, null], safety: [null, null, null], paymentComplete: false, paymentMethod: '' })); }}>
                🔄 Start New Check-In
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1>📱 Patient Self Check-In</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Digital intake — screeners, consent forms, insurance verification, and copay collection
          </p>
        </div>
        <span className="badge badge-info" style={{ fontSize: 11 }}>Kiosk Mode Ready</span>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {CHECKIN_STEPS.map((s, i) => (
          <div key={s.id} style={{ flex: 1, cursor: i <= step ? 'pointer' : 'default' }}
            onClick={() => { if (i <= step) setStep(i); }}>
            <div style={{
              height: 4, borderRadius: 4,
              background: i < step ? '#22c55e' : i === step ? 'var(--primary)' : 'var(--border)',
              transition: 'all 0.3s',
            }} />
            <div style={{
              fontSize: 10, fontWeight: i === step ? 700 : 500, marginTop: 4, textAlign: 'center',
              color: i < step ? '#22c55e' : i === step ? 'var(--primary)' : 'var(--text-muted)',
            }}>
              {s.icon} {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="card" style={{ padding: 24, minHeight: 400 }}>
        {renderStep()}
      </div>

      {/* Navigation */}
      {currentStep?.id !== 'complete' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
          <button className="btn btn-secondary" disabled={step === 0} onClick={() => setStep(s => s - 1)}>
            ← Back
          </button>
          <button className="btn btn-primary" disabled={!canProceed} onClick={() => setStep(s => s + 1)}>
            {step === CHECKIN_STEPS.length - 2 ? 'Complete Check-In ✅' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  );
}
