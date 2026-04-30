import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';
import { users } from '../data/mockData';

// ── US States list for license/DEA registration ──────────────────────────────
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

// ── DEA Number validation (2 letters + 7 digits, e.g. FM1234567) ────────────
function validateDEA(dea) {
  if (!dea) return null;
  if (!/^[A-Z]{2}\d{7}$/.test(dea.toUpperCase())) {
    return 'DEA number must be 2 letters followed by 7 digits (e.g. FM1234567).';
  }
  // DEA checksum: d1+d3+d5 + 2*(d2+d4+d6) → last digit = sum mod 10
  const d = dea.toUpperCase();
  const digits = d.slice(2).split('').map(Number);
  const check = (digits[0] + digits[2] + digits[4] + 2 * (digits[1] + digits[3] + digits[5])) % 10;
  if (check !== digits[6]) return 'DEA checksum invalid — please verify the number.';
  return null; // valid
}

function validateNPI(npi) {
  if (!npi) return null;
  if (!/^\d{10}$/.test(npi)) return 'NPI must be exactly 10 digits.';
  return null;
}

const PRESCRIBER_CREDENTIALS = [
  'MD', 'DO', 'MD, PhD', 'MD, MPH', 'DO, MPH',
  'NP', 'NP-C', 'PMHNP-BC', 'APRN',
  'PA', 'PA-C',
  'PharmD (clinical)',
];
const NON_PRESCRIBER_CREDENTIALS = [
  'LCSW', 'LPC', 'LMFT', 'LMHC', 'PhD (Psychology)', 'PsyD',
  'RN', 'LPN', 'MA', 'MSW',
];

const BLANK_STAFF_FORM = {
  firstName: '', lastName: '', credentials: '', role: 'prescriber',
  specialty: '', email: '', username: '', password: '',
  npi: '', deaNumber: '', deaState: '', licenseNumber: '', licenseState: '',
  epcsPin: '', twoFactorEnabled: true,
};

const PRESCRIBER_ROLES = ['prescriber'];
const REQUIRES_NPI_ROLES = ['prescriber', 'therapist', 'nurse'];
const REQUIRES_DEA_ROLES = ['prescriber'];

function StaffRegistrationModal({ onClose, onSave }) {
  const [form, setForm] = useState(BLANK_STAFF_FORM);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1); // 1=Basic, 2=Credentials, 3=Account
  const [saved, setSaved] = useState(false);

  const isPrescriber = PRESCRIBER_ROLES.includes(form.role);
  const needsNpi = REQUIRES_NPI_ROLES.includes(form.role);
  const needsDea = REQUIRES_DEA_ROLES.includes(form.role);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'Required';
    if (!form.lastName.trim()) errs.lastName = 'Required';
    if (!form.role) errs.role = 'Required';
    if (!form.email.trim()) errs.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
    if (!form.username.trim()) errs.username = 'Required';
    if (!form.password || form.password.length < 8) errs.password = 'Min 8 characters';

    if (needsNpi) {
      if (!form.npi.trim()) errs.npi = 'NPI is required for prescribers and clinical staff.';
      else { const e = validateNPI(form.npi.trim()); if (e) errs.npi = e; }
    }
    if (needsDea) {
      if (!form.deaNumber.trim()) errs.deaNumber = 'DEA number is required to prescribe controlled substances.';
      else { const e = validateDEA(form.deaNumber.trim()); if (e) errs.deaNumber = e; }
      if (!form.deaState) errs.deaState = 'DEA registration state required.';
      if (!form.licenseNumber.trim()) errs.licenseNumber = 'State medical license number required.';
      if (!form.licenseState) errs.licenseState = 'License state required.';
      if (form.epcsPin && (!/^\d{4,6}$/.test(form.epcsPin))) errs.epcsPin = 'EPCS PIN must be 4–6 digits.';
    }
    return errs;
  };

  const handleSave = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); setStep(Object.keys(errs).some(k => ['npi','deaNumber','deaState','licenseNumber','licenseState'].includes(k)) ? 2 : Object.keys(errs).some(k => ['email','username','password','epcsPin'].includes(k)) ? 3 : 1); return; }
    const newUser = {
      id: `u_reg_${Date.now()}`,
      ...form,
      deaNumber: form.deaNumber.toUpperCase(),
      npi: form.npi.trim(),
      epcsPin: form.epcsPin || null,
    };
    onSave(newUser);
    setSaved(true);
  };

  const inputStyle = (k) => ({
    borderColor: errors[k] ? '#ef4444' : undefined,
  });

  const ErrMsg = ({ k }) => errors[k] ? (
    <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3, display: 'flex', gap: 4, alignItems: 'flex-start' }}>
      <span>⚠️</span>{errors[k]}
    </div>
  ) : null;

  const stepDot = (n) => (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, flexShrink: 0,
      background: step > n ? '#16a34a' : step === n ? '#0a2d6e' : '#e2e8f0',
      color: step >= n ? '#fff' : '#64748b',
    }}>{step > n ? '✓' : n}</div>
  );

  if (saved) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 48, textAlign: 'center', maxWidth: 420, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Provider Registered</h2>
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>
            <strong>{form.credentials} {form.firstName} {form.lastName}</strong> has been added to the staff directory.
          </p>
          {form.npi && <p style={{ fontSize: 12, color: '#0a2d6e', fontFamily: 'monospace' }}>NPI: {form.npi}</p>}
          {form.deaNumber && <p style={{ fontSize: 12, color: '#dc2626', fontFamily: 'monospace' }}>DEA: {form.deaNumber.toUpperCase()} ({form.deaState})</p>}
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', overflow: 'hidden', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#0a2d6e 0%,#1a4fa8 100%)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0 }}>➕ Register New Provider / Staff</h2>
            <p style={{ color: '#93c5fd', fontSize: 11, margin: '3px 0 0' }}>DEA and NPI are required for prescribing authorization</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        {/* Step progress */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {stepDot(1)}
          <div style={{ flex: 1, height: 2, background: step > 1 ? '#16a34a' : '#e2e8f0', borderRadius: 2 }} />
          {stepDot(2)}
          <div style={{ flex: 1, height: 2, background: step > 2 ? '#16a34a' : '#e2e8f0', borderRadius: 2 }} />
          {stepDot(3)}
          <div style={{ marginLeft: 8, fontSize: 12, color: '#64748b' }}>
            {step === 1 ? 'Basic Info' : step === 2 ? 'Licensing & DEA' : 'Account Setup'}
          </div>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

          {/* ── Step 1: Basic Info ── */}
          {step === 1 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="form-label">First Name *</label>
                  <input className="form-input" style={inputStyle('firstName')} value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="First name" />
                  <ErrMsg k="firstName" />
                </div>
                <div>
                  <label className="form-label">Last Name *</label>
                  <input className="form-input" style={inputStyle('lastName')} value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Last name" />
                  <ErrMsg k="lastName" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="form-label">Role *</label>
                  <select className="form-input" value={form.role} onChange={e => set('role', e.target.value)}>
                    <optgroup label="✅ Can Order Meds & Labs">
                      <option value="prescriber">Prescriber (MD / DO / NP / PA)</option>
                    </optgroup>
                    <optgroup label="⛔ No Prescribing / Ordering Authority">
                      <option value="therapist">Therapist / Counselor (LCSW / LPC / LMFT)</option>
                      <option value="nurse">Nurse (RN / LPN)</option>
                      <option value="front_desk">Front Desk / Admin</option>
                      <option value="billing">Billing Staff</option>
                      <option value="care_coordinator">Care Coordinator</option>
                    </optgroup>
                  </select>
                  <ErrMsg k="role" />
                </div>
                <div>
                  <label className="form-label">Credentials / Degree</label>
                  <select className="form-input" value={form.credentials}
                    onChange={e => set('credentials', e.target.value)}>
                    <option value="">— Select or type below —</option>
                    {(isPrescriber ? PRESCRIBER_CREDENTIALS : NON_PRESCRIBER_CREDENTIALS).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="form-label">Specialty / Department</label>
                <input className="form-input" value={form.specialty} onChange={e => set('specialty', e.target.value)} placeholder="e.g. Psychiatry, Behavioral Health, General Practice" />
              </div>

              {/* Role-specific info box */}
              {isPrescriber && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 12.5 }}>
                  <strong>✅ Prescriber — Full Ordering Authority:</strong>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: '#1e3a8a', lineHeight: 1.8 }}>
                    <li>Can enter <strong>medication orders</strong> and <strong>lab orders</strong> in encounters</li>
                    <li>Can use <strong>E-Prescribe</strong> (standalone prescribing workflow)</li>
                    <li><strong>NPI (Type 1)</strong> — required to prescribe any medication</li>
                    <li><strong>State Medical License</strong> — required in each state of practice</li>
                    <li><strong>DEA Registration</strong> — required to prescribe controlled substances (CII–CV)</li>
                    <li><strong>EPCS PIN</strong> — required for electronic prescribing of controlled substances</li>
                  </ul>
                </div>
              )}
              {!isPrescriber && form.role && (
                <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 12.5 }}>
                  <strong>⛔ No Prescribing / Ordering Authority:</strong> This role cannot enter medication or lab orders, access E-Prescribe, or prescribe controlled substances.
                  {form.role === 'therapist' && <span> NPI may still be required for insurance billing purposes.</span>}
                  {form.role === 'nurse' && <span> Nurses may assist with documentation but cannot independently order medications or labs in this system.</span>}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Licensing & DEA ── */}
          {step === 2 && (
            <div>
              {/* NPI */}
              <div style={{ background: needsNpi ? '#eff6ff' : '#f8fafc', border: `1px solid ${needsNpi ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#1e293b' }}>
                  🏥 National Provider Identifier (NPI)
                  {needsNpi && <span style={{ color: '#dc2626', marginLeft: 4 }}>*</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">NPI Number {needsNpi ? '*' : '(if applicable)'}</label>
                    <input className="form-input" style={{ ...inputStyle('npi'), fontFamily: 'monospace', fontSize: 14, letterSpacing: 1 }}
                      value={form.npi} onChange={e => set('npi', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit NPI (e.g. 1234567890)" maxLength={10} />
                    <ErrMsg k="npi" />
                    {form.npi.length === 10 && !validateNPI(form.npi) && (
                      <div style={{ color: '#16a34a', fontSize: 11, marginTop: 3, fontWeight: 600 }}>✓ Valid NPI format</div>
                    )}
                    <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 4 }}>
                      Verify at: <strong>nppes.cms.hhs.gov</strong>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">State Medical License #</label>
                    <input className="form-input" style={inputStyle('licenseNumber')}
                      value={form.licenseNumber} onChange={e => set('licenseNumber', e.target.value)}
                      placeholder="e.g. G12345, 99876" />
                    <ErrMsg k="licenseNumber" />
                  </div>
                  <div>
                    <label className="form-label">License State</label>
                    <select className="form-input" style={inputStyle('licenseState')} value={form.licenseState}
                      onChange={e => set('licenseState', e.target.value)}>
                      <option value="">Select state...</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ErrMsg k="licenseState" />
                  </div>
                </div>
              </div>

              {/* DEA */}
              <div style={{ background: needsDea ? '#fef2f2' : '#f8fafc', border: `1px solid ${needsDea ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  🔒 DEA Registration — Controlled Substances (CII–CV)
                  {needsDea && <span style={{ color: '#dc2626' }}>*</span>}
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 12 }}>
                  Required to prescribe Schedule II–V controlled substances.
                  Verify at: <strong>apps.deadiversion.usdoj.gov</strong>
                </div>

                {!needsDea && (
                  <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                    DEA registration is not required for {form.role} role. Leave blank.
                  </div>
                )}

                {needsDea && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="form-label">DEA Number *</label>
                      <input className="form-input" style={{ ...inputStyle('deaNumber'), fontFamily: 'monospace', fontSize: 14, letterSpacing: 1 }}
                        value={form.deaNumber} onChange={e => set('deaNumber', e.target.value.toUpperCase().slice(0, 9))}
                        placeholder="e.g. FM1234567" maxLength={9} />
                      <ErrMsg k="deaNumber" />
                      {form.deaNumber.length === 9 && !validateDEA(form.deaNumber) && (
                        <div style={{ color: '#16a34a', fontSize: 11, marginTop: 3, fontWeight: 600 }}>✓ Valid DEA format &amp; checksum</div>
                      )}
                      <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 4 }}>
                        Format: 2 letters + 7 digits · Checksum validated
                      </div>
                    </div>
                    <div>
                      <label className="form-label">DEA Registration State *</label>
                      <select className="form-input" style={inputStyle('deaState')} value={form.deaState}
                        onChange={e => set('deaState', e.target.value)}>
                        <option value="">Select state...</option>
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <ErrMsg k="deaState" />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Authorized Schedules</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {['CII', 'CIII', 'CIV', 'CV'].map(s => (
                          <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, cursor: 'pointer', background: '#fef2f2', padding: '4px 10px', borderRadius: 8, border: '1px solid #fca5a5' }}>
                            <input type="checkbox" defaultChecked style={{ accentColor: '#dc2626' }} />
                            <span style={{ fontWeight: 600, color: '#dc2626' }}>{s}</span>
                          </label>
                        ))}
                      </div>
                      <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 4 }}>
                        Schedule II — highest restriction (no refills) · Schedule V — lowest restriction
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* EPCS PIN */}
              {needsDea && (
                <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#1e293b' }}>
                    🔐 EPCS PIN — Electronic Prescribing for Controlled Substances
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 10 }}>
                    Set a 4–6 digit PIN for DrFirst EPCS two-factor authentication. Required per DEA 21 CFR §1311.
                  </div>
                  <div style={{ maxWidth: 200 }}>
                    <label className="form-label">EPCS PIN (4–6 digits)</label>
                    <input className="form-input" style={{ ...inputStyle('epcsPin'), fontFamily: 'monospace', fontSize: 16, letterSpacing: 4 }}
                      type="password" inputMode="numeric" maxLength={6}
                      value={form.epcsPin} onChange={e => set('epcsPin', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="••••" />
                    <ErrMsg k="epcsPin" />
                    {form.epcsPin.length >= 4 && <div style={{ color: '#16a34a', fontSize: 11, marginTop: 3, fontWeight: 600 }}>✓ EPCS PIN set</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Account Setup ── */}
          {step === 3 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="form-label">Username *</label>
                  <input className="form-input" style={inputStyle('username')} value={form.username}
                    onChange={e => set('username', e.target.value.toLowerCase().replace(/\s/g, '.'))}
                    placeholder="e.g. dr.jane or jane.doe" />
                  <ErrMsg k="username" />
                </div>
                <div>
                  <label className="form-label">Work Email *</label>
                  <input className="form-input" style={inputStyle('email')} type="email"
                    value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="jane.doe@clarity.health" />
                  <ErrMsg k="email" />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="form-label">Temporary Password * <span style={{ fontWeight: 400, color: '#64748b' }}>(min 8 chars, user must change at first login)</span></label>
                <input className="form-input" style={inputStyle('password')} type="password"
                  value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="Minimum 8 characters" />
                <ErrMsg k="password" />
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13.5 }}>
                  <input type="checkbox" checked={form.twoFactorEnabled} onChange={e => set('twoFactorEnabled', e.target.checked)} style={{ accentColor: '#0a2d6e', width: 16, height: 16 }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>Enable Two-Factor Authentication</div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>Strongly recommended — required for HIPAA compliance and EPCS access</div>
                  </div>
                </label>
              </div>

              {/* Summary preview */}
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#16a34a', marginBottom: 10 }}>Registration Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12.5 }}>
                  {[
                    ['Name', `${form.credentials ? form.credentials + ' ' : ''}${form.firstName} ${form.lastName}`],
                    ['Role', form.role],
                    ['Specialty', form.specialty || '—'],
                    ['NPI', form.npi || '—'],
                    ['DEA', form.deaNumber ? `${form.deaNumber.toUpperCase()} (${form.deaState})` : '—'],
                    ['EPCS PIN', form.epcsPin ? '••••' : '—'],
                    ['2FA', form.twoFactorEnabled ? 'Enabled' : 'Disabled'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span style={{ color: '#64748b' }}>{k}: </span>
                      <strong style={{ fontFamily: ['NPI','DEA','EPCS PIN'].includes(k) ? 'monospace' : undefined }}>{v}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <button className="btn btn-secondary" onClick={step === 1 ? onClose : () => setStep(s => s - 1)}>
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          <div style={{ fontSize: 11.5, color: '#64748b' }}>Step {step} of 3</div>
          {step < 3
            ? <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Continue →</button>
            : <button className="btn btn-primary" onClick={handleSave} style={{ background: '#16a34a', borderColor: '#16a34a' }}>
                ✓ Register Provider
              </button>
          }
        </div>
      </div>
    </div>
  );
}


const FORMS_CATALOG = [
  // HIPAA / Legal
  { id: 'hipaa-npp',       category: 'HIPAA & Legal',      icon: '🔒', name: 'HIPAA Notice of Privacy Practices',         description: 'Acknowledgment of receipt of NPP — required at first visit.',              tag: 'Required' },
  { id: 'hipaa-roi',       category: 'HIPAA & Legal',      icon: '🔒', name: 'HIPAA Authorization – Release of Records',   description: 'Authorize disclosure of PHI to a third party.',                            tag: 'Required' },
  { id: 'hipaa-restrict',  category: 'HIPAA & Legal',      icon: '🔒', name: 'Request for Restriction of PHI',             description: 'Patient request to restrict use/disclosure of health information.',        tag: '' },
  { id: 'hipaa-amend',     category: 'HIPAA & Legal',      icon: '🔒', name: 'Request to Amend Health Record',             description: 'Request to correct or amend information in the medical record.',           tag: '' },
  { id: 'hipaa-access',    category: 'HIPAA & Legal',      icon: '🔒', name: 'Request for Access to Health Records',       description: 'Patient request to inspect or obtain a copy of their records.',            tag: '' },
  { id: 'consent-tx',      category: 'HIPAA & Legal',      icon: '📋', name: 'Consent for Treatment',                      description: 'General informed consent for outpatient psychiatric treatment.',           tag: 'Required' },
  { id: 'consent-telehealth',category: 'HIPAA & Legal',    icon: '📋', name: 'Telehealth Informed Consent',                description: 'Consent and acknowledgment for telehealth services per state regulations.',tag: 'Required' },
  { id: 'consent-photo',   category: 'HIPAA & Legal',      icon: '📋', name: 'Photography / Recording Consent',             description: 'Consent to photograph or record for educational or clinical purposes.',   tag: '' },
  { id: 'fin-assign',      category: 'HIPAA & Legal',      icon: '💰', name: 'Assignment of Benefits',                     description: 'Assigns insurance benefits directly to the practice.',                    tag: 'Required' },
  { id: 'fin-policy',      category: 'HIPAA & Legal',      icon: '💰', name: 'Financial Policy & Billing Agreement',        description: 'Practice billing policy, co-pay, and cancellation agreement.',            tag: 'Required' },

  // Intake & Demographic
  { id: 'intake-new',      category: 'Intake & Registration', icon: '📝', name: 'New Patient Intake Form',                 description: 'Demographics, contact, emergency contact, insurance, PCP.',               tag: 'New Patient' },
  { id: 'intake-demo',     category: 'Intake & Registration', icon: '📝', name: 'Demographic Update Form',                 description: 'Update address, phone, emergency contact, and insurance.',                tag: '' },
  { id: 'intake-insurance',category: 'Intake & Registration', icon: '📝', name: 'Insurance Verification Form',             description: 'Primary and secondary insurance information collection.',                 tag: '' },
  { id: 'intake-pharmacy', category: 'Intake & Registration', icon: '📝', name: 'Preferred Pharmacy Designation',          description: "Patient's preferred pharmacy for prescription routing.",                  tag: '' },
  { id: 'intake-social',   category: 'Intake & Registration', icon: '📝', name: 'Social & Family History Questionnaire',   description: 'Social determinants of health, family psychiatric history.',               tag: 'New Patient' },
  { id: 'intake-sleep',    category: 'Intake & Registration', icon: '📝', name: 'Sleep & Lifestyle Questionnaire',         description: 'Sleep habits, exercise, diet, substance use history.',                    tag: '' },

  // Psychiatric / Clinical
  { id: 'psych-intake',    category: 'Psychiatric Forms',  icon: '🧠', name: 'Psychiatric Intake / Chief Complaint',       description: 'Chief complaint, history of present illness, prior hospitalizations.',    tag: 'New Patient' },
  { id: 'psych-hx',        category: 'Psychiatric Forms',  icon: '🧠', name: 'Psychiatric History Form',                   description: 'Full psychiatric history, past diagnoses, prior medications.',             tag: 'New Patient' },
  { id: 'psych-sx',        category: 'Psychiatric Forms',  icon: '🧠', name: 'Symptom Checklist (SCL-90-R)',               description: 'Comprehensive 90-item symptom checklist across 9 domains.',               tag: '' },
  { id: 'psych-mood',      category: 'Psychiatric Forms',  icon: '🧠', name: 'Daily Mood Tracking Diary',                  description: 'Self-monitoring mood, energy, sleep, and medication adherence.',           tag: '' },
  { id: 'psych-safety',    category: 'Psychiatric Forms',  icon: '🚨', name: 'Safety Planning Worksheet',                  description: 'Collaborative safety plan for patients with suicidal ideation.',           tag: 'Crisis' },
  { id: 'psych-crisis',    category: 'Psychiatric Forms',  icon: '🚨', name: 'Crisis Response Plan',                       description: 'Warning signs, coping strategies, support contacts, 988 Lifeline.',       tag: 'Crisis' },
  { id: 'psych-meds',      category: 'Psychiatric Forms',  icon: '💊', name: 'Current Medications List',                   description: 'Patient self-reported medication reconciliation form.',                   tag: '' },
  { id: 'psych-allergy',   category: 'Psychiatric Forms',  icon: '⚠️', name: 'Allergy & Adverse Reactions Form',          description: 'Self-reported medication allergies and adverse reactions.',               tag: '' },
  { id: 'psych-advance',   category: 'Psychiatric Forms',  icon: '📋', name: 'Advance Directive / Psychiatric Directive',  description: 'Patient preferences for psychiatric treatment during incapacity.',         tag: '' },

  // Assessments – Psych Scales
  { id: 'phq9',            category: 'Assessments & Scales', icon: '📊', name: 'PHQ-9 — Patient Health Questionnaire',     description: 'Depression severity screening. 9 items, 0–27 scale.',                    tag: 'Depression' },
  { id: 'phq2',            category: 'Assessments & Scales', icon: '📊', name: 'PHQ-2 — Brief Depression Screen',          description: 'Ultra-brief 2-item depression pre-screen.',                              tag: 'Depression' },
  { id: 'gad7',            category: 'Assessments & Scales', icon: '📊', name: 'GAD-7 — Generalized Anxiety Disorder',     description: 'Anxiety severity screening. 7 items, 0–21 scale.',                       tag: 'Anxiety' },
  { id: 'gad2',            category: 'Assessments & Scales', icon: '📊', name: 'GAD-2 — Brief Anxiety Screen',             description: 'Ultra-brief 2-item anxiety pre-screen.',                                  tag: 'Anxiety' },
  { id: 'pcl5',            category: 'Assessments & Scales', icon: '📊', name: 'PCL-5 — PTSD Checklist (DSM-5)',           description: 'PTSD symptom severity. 20 items, 0–80 scale.',                           tag: 'PTSD' },
  { id: 'cssrs',           category: 'Assessments & Scales', icon: '🚨', name: 'C-SSRS — Columbia Suicide Severity',       description: 'Suicidal ideation and behavior rating scale.',                            tag: 'Safety' },
  { id: 'mdq',             category: 'Assessments & Scales', icon: '📊', name: 'MDQ — Mood Disorder Questionnaire',        description: 'Bipolar spectrum screening. 13 symptom items.',                          tag: 'Bipolar' },
  { id: 'ymrs',            category: 'Assessments & Scales', icon: '📊', name: 'YMRS — Young Mania Rating Scale',          description: 'Clinician-rated mania severity. 11 items.',                              tag: 'Bipolar' },
  { id: 'asrs',            category: 'Assessments & Scales', icon: '📊', name: 'ASRS v1.1 — Adult ADHD Self-Report',       description: 'WHO adult ADHD screening. 18-item symptom checklist.',                   tag: 'ADHD' },
  { id: 'audit',           category: 'Assessments & Scales', icon: '📊', name: 'AUDIT-C — Alcohol Use Disorders',          description: 'Alcohol use disorder screening. 3 items.',                               tag: 'Substance' },
  { id: 'dast10',          category: 'Assessments & Scales', icon: '📊', name: 'DAST-10 — Drug Abuse Screening Test',      description: 'Drug use disorder screening. 10 yes/no items.',                          tag: 'Substance' },
  { id: 'cage',            category: 'Assessments & Scales', icon: '📊', name: 'CAGE Questionnaire',                       description: 'Brief alcohol misuse screening. 4 yes/no items.',                        tag: 'Substance' },
  { id: 'moca',            category: 'Assessments & Scales', icon: '📊', name: 'MoCA — Montreal Cognitive Assessment',     description: 'Cognitive impairment screening. 30-point scale.',                        tag: 'Cognitive' },
  { id: 'mmse',            category: 'Assessments & Scales', icon: '📊', name: 'MMSE — Mini Mental State Exam',            description: 'Cognitive function screening for dementia. 30-point scale.',              tag: 'Cognitive' },
  { id: 'epds',            category: 'Assessments & Scales', icon: '📊', name: 'EPDS — Edinburgh Postnatal Depression',    description: 'Perinatal depression screening. 10 items.',                              tag: 'Perinatal' },
  { id: 'bdi',             category: 'Assessments & Scales', icon: '📊', name: 'BDI-II — Beck Depression Inventory',       description: 'Depression symptom severity. 21 items.',                                 tag: 'Depression' },
  { id: 'bai',             category: 'Assessments & Scales', icon: '📊', name: 'BAI — Beck Anxiety Inventory',             description: 'Anxiety symptom severity. 21 somatic/cognitive items.',                  tag: 'Anxiety' },
  { id: 'ptsd-child',      category: 'Assessments & Scales', icon: '📊', name: 'CPSS — Child PTSD Symptom Scale',          description: 'PTSD symptom screening for ages 8–18.',                                  tag: 'Pediatric' },
  { id: 'scared',          category: 'Assessments & Scales', icon: '📊', name: 'SCARED — Child Anxiety Scale',             description: 'Anxiety screening for children and adolescents. 41 items.',               tag: 'Pediatric' },

  // Medication-Specific
  { id: 'med-cloz',        category: 'Medication Monitoring', icon: '💊', name: 'Clozapine Consent & Monitoring',          description: 'REMS consent and ANC monitoring agreement for clozapine.',               tag: 'REMS' },
  { id: 'med-lithium',     category: 'Medication Monitoring', icon: '💊', name: 'Lithium Therapy Agreement',               description: 'Lab monitoring schedule and toxicity education for lithium.',             tag: '' },
  { id: 'med-controlled',  category: 'Medication Monitoring', icon: '🔒', name: 'Controlled Substance Agreement',          description: 'Opioid/stimulant treatment agreement, urine drug screen consent.',        tag: 'EPCS' },
  { id: 'med-tardive',     category: 'Medication Monitoring', icon: '💊', name: 'AIMS — Abnormal Involuntary Movement',    description: 'Tardive dyskinesia monitoring scale for antipsychotic users.',             tag: '' },
  { id: 'med-metabolic',   category: 'Medication Monitoring', icon: '💊', name: 'Metabolic Monitoring Consent',            description: 'Metabolic panel monitoring agreement for antipsychotic therapy.',          tag: '' },
];

const TAG_BADGE = {
  'Required':    'badge-danger',
  'New Patient': 'badge-info',
  'Crisis':      'badge-warning',
  'REMS':        'badge-warning',
  'EPCS':        'badge-info',
  'Depression':  'badge-success',
  'Anxiety':     'badge-success',
  'PTSD':        'badge-success',
  'Bipolar':     'badge-success',
  'ADHD':        'badge-success',
  'Substance':   'badge-gray',
  'Cognitive':   'badge-gray',
  'Safety':      'badge-warning',
  'Perinatal':   'badge-gray',
  'Pediatric':   'badge-gray',
};

const ROLE_LABELS = {
  prescriber: 'Prescriber (MD/DO/NP/PA)',
  nurse: 'Nurse',
  front_desk: 'Front Desk Staff',
  therapist: 'Therapist / Counselor',
  billing: 'Billing Staff',
  care_coordinator: 'Care Coordinator',
};

const ROLE_BADGE = {
  prescriber: 'badge-info',
  nurse: 'badge-success',
  front_desk: 'badge-gray',
  therapist: 'badge-success',
  billing: 'badge-gray',
  care_coordinator: 'badge-gray',
};

export default function HealthAdminToolkit() {
  const { currentUser } = useAuth();
  const { patients, appointments, btgAuditLog, inboxMessages, selectedPatient } = usePatient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showRegModal, setShowRegModal] = useState(false);
  const [registeredStaff, setRegisteredStaff] = useState([]);

  // Forms tab state
  const [formSearch, setFormSearch] = useState('');
  const [formCategory, setFormCategory] = useState('All');
  const [sendModal, setSendModal] = useState(null); // { form }
  const [previewForm, setPreviewForm] = useState(null);
  const [sendPatient, setSendPatient] = useState('');
  const [sendMethod, setSendMethod] = useState('email');
  const [sendContact, setSendContact] = useState('');
  const [sendNote, setSendNote] = useState('');
  const [sentSuccess, setSentSuccess] = useState(null);
  const [patientDropdown, setPatientDropdown] = useState([]);

  const isFrontDesk = currentUser?.role === 'front_desk';

  const totalAppts = appointments.length;
  const todayAppts = appointments.filter(
    (a) => a.date === new Date().toISOString().slice(0, 10)
  ).length;
  const activePatients = patients.filter((p) => p.isActive).length;
  const unreadMessages = inboxMessages.filter((m) => !m.read).length;

  const tabs = [
    { id: 'overview',  label: '📊 Overview' },
    { id: 'forms',     label: '📋 Forms & Outreach' },
    { id: 'users',     label: '👥 Staff' },
    { id: 'register',  label: '➕ Register Provider' },
    { id: 'patients',  label: '🧑‍⚕️ Patients' },
    { id: 'reports',   label: '📈 Reports' },
    { id: 'settings',  label: '⚙️ Settings' },
  ];

  return (
    <>
    <div className="fade-in">
      <div className="page-header">
        <h1>🗂️ Admin Toolkit</h1>
        <p>Practice management, staff oversight, and reporting · Clarity Health</p>
      </div>

      {!isFrontDesk && (
        <div className="alert alert-warning mb-4">
          <strong>⚠️ Limited Access:</strong> Some settings are restricted to front desk staff only. Contact your front desk manager for full access.
        </div>
      )}

      {/* Stat Cards */}
      <div className="stat-cards mb-4">
        <div className="stat-card">
          <span className="stat-label">Active Patients</span>
          <span className="stat-value">{activePatients}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Today's Appointments</span>
          <span className="stat-value">{todayAppts}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Appointments</span>
          <span className="stat-value">{totalAppts}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Unread Messages</span>
          <span className="stat-value">{unreadMessages}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">BTG Events</span>
          <span className="stat-value">{btgAuditLog.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Staff Members</span>
          <span className="stat-value">{users.length}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar mb-4" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 0, overflowX: 'auto', flexWrap: 'nowrap' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`btn btn-ghost${activeTab === t.id ? ' active' : ''}`}
            style={{
              borderRadius: '6px 6px 0 0',
              borderBottom: activeTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              fontWeight: activeTab === t.id ? 700 : 400,
              fontSize: 13,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Send Form Modal ─────────────────────────────────── */}
      {sendModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-white)', borderRadius: 12, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>📤 Send Form to Patient</h2>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{sendModal.name}</p>
              </div>
              <button onClick={() => { setSendModal(null); setSentSuccess(null); setSendPatient(''); setSendContact(''); setSendNote(''); setPatientDropdown([]); }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            {sentSuccess ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Form Sent!</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
                  <strong>{sendModal.name}</strong> was sent to{' '}
                  <strong>{sentSuccess.patient}</strong> via {sentSuccess.method === 'email' ? '📧 email' : '📱 SMS'} at <strong>{sentSuccess.contact}</strong>.
                </p>
                <button className="btn btn-primary mt-4" onClick={() => { setSendModal(null); setSentSuccess(null); setSendPatient(''); setSendContact(''); setSendNote(''); setPatientDropdown([]); }}>Done</button>
              </div>
            ) : (
              <div style={{ padding: '18px 20px' }}>
                {/* Patient search */}
                <div className="form-group mb-3">
                  <label className="form-label">Patient *</label>
                  <input
                    className="form-input"
                    placeholder="Search patient by name or MRN..."
                    value={sendPatient}
                    onChange={(e) => {
                      setSendPatient(e.target.value);
                      const q = e.target.value.toLowerCase();
                      setPatientDropdown(q.length > 1 ? patients.filter(p =>
                        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q)
                      ).slice(0, 6) : []);
                    }}
                  />
                  {patientDropdown.length > 0 && (
                    <div style={{ border: '1px solid var(--border)', borderRadius: 6, maxHeight: 160, overflowY: 'auto', marginTop: 2 }}>
                      {patientDropdown.map((p) => (
                        <div key={p.id}
                          style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border-light)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}
                          onClick={() => {
                            setSendPatient(`${p.firstName} ${p.lastName} (${p.mrn})`);
                            setSendContact(sendMethod === 'email' ? (p.email || '') : (p.cellPhone || p.phone || ''));
                            setPatientDropdown([]);
                          }}
                        >
                          <strong>{p.lastName}, {p.firstName}</strong> — {p.mrn}
                          <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{p.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Send method */}
                <div className="form-group mb-3">
                  <label className="form-label">Send Via</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[{ id: 'email', icon: '📧', label: 'Email' }, { id: 'sms', icon: '📱', label: 'SMS / Text' }].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => { setSendMethod(m.id); setSendContact(''); }}
                        style={{
                          flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                          border: sendMethod === m.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                          background: sendMethod === m.id ? 'var(--primary-light)' : 'var(--bg)',
                          color: sendMethod === m.id ? 'var(--primary)' : 'var(--text-primary)',
                        }}
                      >
                        {m.icon} {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact */}
                <div className="form-group mb-3">
                  <label className="form-label">{sendMethod === 'email' ? 'Email Address *' : 'Mobile Number *'}</label>
                  <input
                    className="form-input"
                    type={sendMethod === 'email' ? 'email' : 'tel'}
                    placeholder={sendMethod === 'email' ? 'patient@email.com' : '(555) 000-0000'}
                    value={sendContact}
                    onChange={(e) => setSendContact(e.target.value)}
                  />
                </div>

                {/* Optional note */}
                <div className="form-group mb-4">
                  <label className="form-label">Message to Patient (optional)</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder={`Please complete this form before your upcoming appointment. If you have any questions, call our office at (555) 800-1234.`}
                    value={sendNote}
                    onChange={(e) => setSendNote(e.target.value)}
                  />
                </div>

                <div className="alert alert-info mb-3" style={{ fontSize: 12 }}>
                  <strong>ℹ️ Demo mode:</strong> No actual message is transmitted. In production this would integrate with your patient messaging platform (Klara, Spruce, Luma Health, etc.).
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => { setSendModal(null); setSendPatient(''); setSendContact(''); setSendNote(''); setPatientDropdown([]); }}>Cancel</button>
                  <button
                    className="btn btn-primary"
                    disabled={!sendPatient.trim() || !sendContact.trim()}
                    onClick={() => setSentSuccess({ patient: sendPatient, method: sendMethod, contact: sendContact })}
                  >
                    {sendMethod === 'email' ? '📧 Send Email' : '📱 Send SMS'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Forms & Outreach Tab ─────────────────────────────── */}
      {activeTab === 'forms' && (() => {
        const categories = ['All', ...Array.from(new Set(FORMS_CATALOG.map(f => f.category)))];
        const filtered = FORMS_CATALOG.filter(f => {
          const matchCat = formCategory === 'All' || f.category === formCategory;
          const q = formSearch.toLowerCase();
          const matchQ = !q || f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) || f.tag.toLowerCase().includes(q);
          return matchCat && matchQ;
        });
        return (
          <div>
            {/* Filter bar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                className="form-input"
                style={{ flex: 1, minWidth: 220 }}
                placeholder="🔍 Search forms..."
                value={formSearch}
                onChange={(e) => setFormSearch(e.target.value)}
              />
              <select className="form-select" style={{ width: 220 }} value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{filtered.length} form{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Forms by category */}
            {categories.filter(c => c !== 'All' && (formCategory === 'All' || formCategory === c)).map((cat) => {
              const catForms = filtered.filter(f => f.category === cat);
              if (!catForms.length) return null;
              return (
                <div key={cat} className="mb-4">
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, paddingLeft: 2 }}>
                    {cat}
                  </div>
                  <div className="card">
                    <div className="card-body no-pad">
                      {catForms.map((form, idx) => (
                        <div key={form.id} style={{
                          display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                          borderBottom: idx < catForms.length - 1 ? '1px solid var(--border-light)' : 'none',
                        }}>
                          <span style={{ fontSize: 22, flexShrink: 0 }}>{form.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>
                              {form.name}
                              {form.tag && <span className={`badge ${TAG_BADGE[form.tag] || 'badge-gray'}`} style={{ marginLeft: 8, fontSize: 10 }}>{form.tag}</span>}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{form.description}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <button
                              className="btn btn-sm btn-secondary"
                              title="Preview form"
                              onClick={() => setPreviewForm(form)}
                            >
                              👁 Preview
                            </button>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => {
                                const initPatient = selectedPatient
                                  ? `${selectedPatient.firstName} ${selectedPatient.lastName} (${selectedPatient.mrn})`
                                  : '';
                                const initContact = selectedPatient
                                  ? (selectedPatient.email || selectedPatient.phone || '')
                                  : '';
                                setSendModal(form);
                                setSentSuccess(null);
                                setSendPatient(initPatient);
                                setSendContact(initContact);
                                setSendNote('');
                                setPatientDropdown([]);
                              }}
                            >
                              📤 Send
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Overview Tab */}
      {activeTab === 'overview' && (        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Quick Actions */}
          <div className="card">
            <div className="card-header"><h2 style={{ fontSize: 13 }}>⚡ Quick Actions</h2></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { icon: '📅', label: 'View Schedule',    action: () => navigate('/schedule') },
                  { icon: '🔍', label: 'Find Patient',     action: () => navigate('/patients') },
                  { icon: '📬', label: 'Inbox',            action: () => navigate('/inbox') },
                  { icon: '🔓', label: 'BTG Audit Log',    action: () => navigate('/btg-audit') },
                  { icon: '📋', label: 'Forms & Outreach', action: () => setActiveTab('forms') },
                  { icon: '📊', label: 'Staff Report',     action: () => setActiveTab('reports') },
                ].map((a) => (
                  <button
                    key={a.label}
                    className="btn btn-secondary"
                    style={{ justifyContent: 'flex-start', fontSize: 12, padding: '7px 10px', gap: 7 }}
                    onClick={a.action}
                  >
                    <span>{a.icon}</span>{a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Practice Info */}
          <div className="card">
            <div className="card-header"><h2 style={{ fontSize: 13 }}>🏥 Practice Info</h2></div>
            <div className="card-body">
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Practice Name', 'Clarity Health'],
                    ['Specialty', 'Outpatient Mental Health'],
                    ['NPI (Practice)', '1122334455'],
                    ['Address', '400 Wellness Blvd, Springfield, IL 62704'],
                    ['Phone', '(555) 800-1234'],
                    ['Fax', '(555) 800-1235'],
                    ['EHR Version', '1.0.0'],
                    ['Logged In As', `${currentUser?.firstName} ${currentUser?.lastName} (${ROLE_LABELS[currentUser?.role] || currentUser?.role})`],
                  ].map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 4px', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</td>
                      <td style={{ padding: '6px 4px' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compliance Summary */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header"><h2 style={{ fontSize: 13 }}>🛡️ Compliance Summary</h2></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { label: 'HIPAA Training', status: 'Current', badge: 'badge-success' },
                  { label: 'BTG Policy', status: 'Active', badge: 'badge-success' },
                  { label: 'Audit Log', status: `${btgAuditLog.length} events`, badge: 'badge-info' },
                  { label: 'DEA Compliance', status: 'Review Due', badge: 'badge-warning' },
                ].map((item) => (
                  <div key={item.label} style={{ textAlign: 'center', padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{item.label}</div>
                    <span className={`badge ${item.badge}`}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Tab */}
      {activeTab === 'users' && (() => {
        // Mock credential expiry data (in production: from DB)
        const today = new Date();
        const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r.toISOString().slice(0, 10); };
        const CRED_EXPIRY = {
          u1: { deaExpiry: addDays(today, 22), licenseExpiry: addDays(today, 310) },
          u4: { deaExpiry: null, licenseExpiry: addDays(today, 18) },
          u5: { deaExpiry: null, licenseExpiry: null },
          u6: { deaExpiry: null, licenseExpiry: null },
        };
        // Add expiry to registered staff too (dummy far-future)
        registeredStaff.forEach(u => {
          if (!CRED_EXPIRY[u.id]) {
            const far = addDays(today, 700);
            CRED_EXPIRY[u.id] = { deaExpiry: u.deaNumber ? far : null, licenseExpiry: u.npi ? far : null };
          }
        });

        const allStaff = [...users, ...registeredStaff];

        const expiryStatus = (dateStr) => {
          if (!dateStr) return null;
          const diff = Math.ceil((new Date(dateStr) - today) / 86400000);
          if (diff < 0) return { level: 'expired', color: '#dc2626', bg: '#fee2e2', label: 'Expired', diff };
          if (diff <= 30) return { level: 'critical', color: '#dc2626', bg: '#fee2e2', label: `${diff}d left`, diff };
          if (diff <= 90) return { level: 'warning', color: '#d97706', bg: '#fef3c7', label: `${diff}d left`, diff };
          return { level: 'ok', color: '#16a34a', bg: '#dcfce7', label: `${diff}d left`, diff };
        };

        // Gather compliance alerts
        const complianceAlerts = [];
        allStaff.forEach(u => {
          const expiry = CRED_EXPIRY[u.id] || {};
          const deaSt = expiryStatus(expiry.deaExpiry);
          const licSt = expiryStatus(expiry.licenseExpiry);
          if (deaSt && (deaSt.level === 'expired' || deaSt.level === 'critical' || deaSt.level === 'warning')) {
            complianceAlerts.push({ user: u, type: 'DEA', date: expiry.deaExpiry, status: deaSt });
          }
          if (licSt && (licSt.level === 'expired' || licSt.level === 'critical' || licSt.level === 'warning')) {
            complianceAlerts.push({ user: u, type: 'License', date: expiry.licenseExpiry, status: licSt });
          }
        });

        return (
        <div>
          {/* Compliance Alert Banner */}
          {complianceAlerts.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                🔔 Credential Expiration Alerts
                <span style={{ background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                  {complianceAlerts.length}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {complianceAlerts.map((a, i) => (
                  <div key={i} style={{ background: a.status.bg, border: `1px solid ${a.status.color}40`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{a.status.level === 'expired' ? '❌' : a.status.level === 'critical' ? '🚨' : '⚠️'}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: a.status.color }}>
                        {a.user.firstName} {a.user.lastName} — {a.type}
                        {a.user.credentials && <span style={{ fontWeight: 400, color: '#64748b' }}> ({a.user.credentials})</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                        {a.status.level === 'expired'
                          ? `${a.type} expired on ${a.date} — immediate renewal required`
                          : `Expires ${a.date} · ${a.status.label} — renew immediately`}
                      </div>
                      <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 4 }}>
                        {a.type === 'DEA' ? 'Renew at: apps.deadiversion.usdoj.gov' : 'Contact state medical board to renew'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 13 }}>👥 Staff Directory</h2>
              <button className="btn btn-sm btn-primary" onClick={() => setActiveTab('register')}>
                ➕ Register Provider
              </button>
            </div>
            <div className="card-body no-pad">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Role</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Specialty</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>NPI</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>DEA / Expiry</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>License Expiry</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>2FA</th>
                  </tr>
                </thead>
                <tbody>
                  {allStaff.map((u) => {
                    const expiry = CRED_EXPIRY[u.id] || {};
                    const deaSt = expiryStatus(expiry.deaExpiry);
                    const licSt = expiryStatus(expiry.licenseExpiry);
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600 }}>
                          {u.firstName} {u.lastName}
                          {u.credentials && <span style={{ color: 'var(--text-secondary)', marginLeft: 4, fontWeight: 400 }}>{u.credentials}</span>}
                          {registeredStaff.includes(u) && <span className="badge badge-success" style={{ marginLeft: 6, fontSize: 10 }}>New</span>}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span className={`badge ${ROLE_BADGE[u.role] || 'badge-gray'}`}>
                            {ROLE_LABELS[u.role] || u.role}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{u.specialty || '—'}</td>
                        <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12 }}>
                          {u.npi
                            ? <span style={{ color: '#16a34a' }}>{u.npi}</span>
                            : (u.role === 'prescriber' ? <span style={{ color: '#dc2626', fontWeight: 600 }}>⚠ Missing</span> : '—')}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 12 }}>
                          {u.deaNumber ? (
                            <div>
                              <span style={{ fontFamily: 'monospace', color: '#0a2d6e' }}>{u.deaNumber}</span>
                              {deaSt && (
                                <div style={{ marginTop: 2, fontSize: 10, fontWeight: 700, color: deaSt.color, background: deaSt.bg, display: 'inline-block', padding: '1px 6px', borderRadius: 4 }}>
                                  {deaSt.level === 'expired' ? '❌ Expired' : deaSt.level === 'critical' ? `🚨 ${deaSt.label}` : `⚠️ ${deaSt.label}`}
                                </div>
                              )}
                              {!deaSt && expiry.deaExpiry && <div style={{ fontSize: 10, color: '#16a34a' }}>✓ exp {expiry.deaExpiry}</div>}
                            </div>
                          ) : (
                            u.role === 'prescriber' ? <span style={{ color: '#f59e0b', fontWeight: 600 }}>No DEA</span> : '—'
                          )}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 12 }}>
                          {expiry.licenseExpiry ? (
                            <div style={{ fontSize: 10, fontWeight: 700, color: licSt?.color || '#16a34a', background: licSt?.bg || '#dcfce7', display: 'inline-block', padding: '2px 8px', borderRadius: 5 }}>
                              {licSt?.level === 'expired' ? '❌ Expired' : licSt && licSt.level !== 'ok' ? `${licSt.level === 'critical' ? '🚨' : '⚠️'} ${licSt.label}` : `✓ exp ${expiry.licenseExpiry}`}
                            </div>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          {u.twoFactorEnabled
                            ? <span className="badge badge-success">On</span>
                            : <span className="badge badge-gray">Off</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Register Provider Tab */}
      {activeTab === 'register' && (
        <div>
          <div style={{ background: 'linear-gradient(135deg,#0a2d6e 0%,#1a4fa8 100%)', borderRadius: 14, padding: '28px 32px', marginBottom: 20, color: '#fff' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>➕ Register New Provider / Staff</h2>
            <p style={{ opacity: 0.8, fontSize: 13, margin: '8px 0 0' }}>
              Complete provider credentialing — DEA number is required to prescribe controlled substances (CII–CV).<br />
              NPI number is required for all prescribers and clinical staff to prescribe any medication.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            {[
              { icon: '🏥', color: '#eff6ff', border: '#bfdbfe', title: 'NPI Required', body: 'All prescribers (MD, DO, NP, PA) must have a valid 10-digit NPI number (Type 1 — Individual) to prescribe any medication.' },
              { icon: '🔒', color: '#fef2f2', border: '#fca5a5', title: 'DEA Required for CII–CV', body: 'A DEA number is required to prescribe Schedule II–V controlled substances including opioids, stimulants (Adderall, Ritalin), and benzodiazepines.' },
              { icon: '🔐', color: '#f5f3ff', border: '#c4b5fd', title: 'EPCS PIN for 2FA', body: 'Electronic prescribing of controlled substances requires a DEA number plus an EPCS PIN for two-factor authentication per DEA 21 CFR §1311.' },
            ].map(c => (
              <div key={c.title} style={{ background: c.color, border: `1px solid ${c.border}`, borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{c.title}</div>
                <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.6 }}>{c.body}</div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <button
              className="btn btn-primary"
              style={{ fontSize: 16, padding: '14px 36px', borderRadius: 12, fontWeight: 700 }}
              onClick={() => setShowRegModal(true)}
            >
              ➕ Start Provider Registration
            </button>
            <p style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
              Fields marked * are required. DEA and NPI are verified with checksum/format validation.
            </p>
          </div>

          {/* Previously registered this session */}
          {registeredStaff.length > 0 && (
            <div className="card">
              <div className="card-header"><h2 style={{ fontSize: 13 }}>✅ Registered This Session ({registeredStaff.length})</h2></div>
              <div className="card-body no-pad">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Role</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>NPI</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>DEA</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>EPCS PIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registeredStaff.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600 }}>
                          {u.credentials && <span style={{ color: 'var(--text-secondary)', marginRight: 4 }}>{u.credentials}</span>}
                          {u.firstName} {u.lastName}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span className={`badge ${ROLE_BADGE[u.role] || 'badge-gray'}`}>
                            {ROLE_LABELS[u.role] || u.role}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, color: '#16a34a' }}>{u.npi || '—'}</td>
                        <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, color: '#0a2d6e' }}>{u.deaNumber || '—'}</td>
                        <td style={{ padding: '10px 16px' }}>
                          {u.epcsPin ? <span className="badge badge-success">Set</span> : <span className="badge badge-gray">Not set</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'patients' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 13 }}>🧑‍⚕️ Patient Roster ({patients.length})</h2>
            <button className="btn btn-sm btn-primary" onClick={() => navigate('/patients')}>
              Full Search →
            </button>
          </div>
          <div className="card-body no-pad">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>MRN</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>DOB</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Provider</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Last Visit</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => {
                  const provider = users.find((u) => u.id === p.assignedProvider);
                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => navigate(`/chart/${p.id}/summary`)}
                    >
                      <td style={{ padding: '10px 16px', fontWeight: 600 }}>
                        {p.firstName} {p.lastName}
                        {p.isBTG && <span className="badge badge-danger" style={{ marginLeft: 6 }}>BTG</span>}
                      </td>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12 }}>{p.mrn}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{p.dob}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                        {provider ? `${provider.firstName} ${provider.lastName}` : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{p.lastVisit || '—'}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span className={`badge ${p.isActive ? 'badge-success' : 'badge-gray'}`}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <div className="card-header"><h2 style={{ fontSize: 13 }}>📋 Appointment Summary</h2></div>
            <div className="card-body">
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Total Appointments', appointments.length],
                    ['Today', todayAppts],
                    ['Completed', appointments.filter((a) => a.status === 'Completed').length],
                    ['In-Person', appointments.filter((a) => a.visitType === 'In-Person').length],
                    ['Telehealth', appointments.filter((a) => a.visitType === 'Telehealth').length],
                    ['New Patient', appointments.filter((a) => a.type === 'New Patient').length],
                  ].map(([label, val]) => (
                    <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 4px', color: 'var(--text-secondary)' }}>{label}</td>
                      <td style={{ padding: '8px 4px', fontWeight: 700, textAlign: 'right' }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 style={{ fontSize: 13 }}>👥 Provider Workload</h2></div>
            <div className="card-body">
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 600 }}>Provider</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 600 }}>Appts</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 600 }}>Today</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter((u) => u.role === 'prescriber').map((u) => {
                    const provAppts = appointments.filter((a) => a.provider === u.id);
                    const provToday = provAppts.filter((a) => a.date === new Date().toISOString().slice(0, 10));
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 4px' }}>{u.firstName} {u.lastName} <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{u.credentials}</span></td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>{provAppts.length}</td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>{provToday.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header"><h2 style={{ fontSize: 13 }}>🔓 BTG Access Report</h2></div>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {btgAuditLog.length} break-the-glass events on record. 
                Review the full audit trail for HIPAA compliance.
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/btg-audit')}>
                View Full Log →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <div className="card-header"><h2 style={{ fontSize: 13 }}>⚙️ System Settings</h2></div>
            <div className="card-body">
              {[
                { label: 'Two-Factor Authentication', value: 'Required for prescribers', enabled: true },
                { label: 'Break-the-Glass', value: 'Enabled with audit logging', enabled: true },
                { label: 'EPCS (E-Prescribing)', value: 'Active — DEA compliant', enabled: true },
                { label: 'Telehealth Integration', value: 'Active', enabled: true },
                { label: 'Auto-logout Timeout', value: '15 minutes', enabled: true },
              ].map((s) => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.value}</div>
                  </div>
                  <span className={`badge ${s.enabled ? 'badge-success' : 'badge-gray'}`}>
                    {s.enabled ? 'On' : 'Off'}
                  </span>
                </div>
              ))}
              {!isFrontDesk && (
                <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                  🔒 Front desk privileges required to modify settings.
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 style={{ fontSize: 13 }}>🔔 Notification Settings</h2></div>
            <div className="card-body">
              {[
                { label: 'Appointment Reminders', value: '24h before — SMS + Email' },
                { label: 'Lab Result Alerts', value: 'Immediate — In-app + Email' },
                { label: 'Prescription Requests', value: 'Immediate — In-app' },
                { label: 'BTG Access Alerts', value: 'Immediate — Admin email' },
                { label: 'Message Notifications', value: 'Real-time — In-app' },
              ].map((n) => (
                <div key={n.label} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{n.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{n.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Provider Registration Modal */}
    {showRegModal && (
      <StaffRegistrationModal
        onClose={() => setShowRegModal(false)}
        onSave={(newUser) => {
          setRegisteredStaff(prev => [...prev, newUser]);
          setShowRegModal(false);
        }}
      />
    )}

    {/* Form Preview Modal */}
    {previewForm && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        onClick={e => { if (e.target === e.currentTarget) setPreviewForm(null); }}>
        <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>👁 Preview: {previewForm.name}</div>
            <button onClick={() => setPreviewForm(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 800, fontSize: 18, width: 30, height: 30, cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ padding: 24 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{previewForm.description}</p>
            <div style={{ padding: 16, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              📄 Form preview would render here in production (PDF viewer or embedded form fields)
            </div>
          </div>
          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setPreviewForm(null)}>Close</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
