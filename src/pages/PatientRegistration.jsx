import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../contexts/PatientContext';
import { useAuth } from '../contexts/AuthContext';

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'];
const PRONOUNS = ['He/Him', 'She/Her', 'They/Them', 'Ze/Zir', 'Prefer not to say'];
const RACES = ['White', 'Black or African American', 'Asian', 'American Indian or Alaska Native', 'Native Hawaiian or Other Pacific Islander', 'Two or More Races', 'Unknown', 'Other'];
const ETHNICITIES = ['Hispanic or Latino', 'Not Hispanic or Latino', 'Unknown'];
const LANGUAGES = ['English', 'Spanish', 'French', 'Mandarin', 'Arabic', 'Portuguese', 'Vietnamese', 'Tagalog', 'Other'];
const RELATIONSHIPS = ['Parent', 'Guardian', 'Grandparent', 'Aunt/Uncle', 'Sibling', 'Other Family', 'Legal Guardian'];

const REGISTRATION_STEPS = [
  { id: 'personal',   label: 'Personal Info',       icon: '👤', number: 1 },
  { id: 'contact',    label: 'Contact & Address',   icon: '📞', number: 2 },
  { id: 'guardian',   label: 'Guardian (if minor)', icon: '👨‍👩‍👧', number: 3 },
  { id: 'insurance',  label: 'Insurance',           icon: '💳', number: 4 },
  { id: 'emergency',  label: 'Emergency Contact',   icon: '🆘', number: 5 },
  { id: 'review',     label: 'Review & Submit',     icon: '✅', number: 6 },
];

const DEFAULT_FORM = {
  firstName: '', lastName: '', dob: '', gender: '', pronouns: '',
  race: '', ethnicity: '', language: 'English', ssn: '',
  phone: '', cellPhone: '', email: '',
  addressStreet: '', addressCity: '', addressState: '', addressZip: '',
  guardianRequired: false, guardianFirstName: '', guardianLastName: '',
  guardianRelationship: '', guardianPhone: '', guardianEmail: '',
  guardianAddressSame: true,
  guardianAddressStreet: '', guardianAddressCity: '', guardianAddressState: '', guardianAddressZip: '',
  insuranceName: '', insuranceMemberId: '', insuranceGroupNumber: '', insuranceCopay: '',
  emergencyName: '', emergencyRelationship: '', emergencyPhone: '',
};

/* ─── Shared field styles ─────────────────────────────────────────────────── */
const inputBase = {
  width: '100%', padding: '11px 14px', borderRadius: 8,
  border: '1.5px solid #e2e8f0', fontSize: 15, color: '#0f172a',
  background: '#fff', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
};
const labelBase = {
  display: 'block', fontSize: 12, fontWeight: 600,
  marginBottom: 6, color: '#64748b', letterSpacing: '0.02em',
};
const helperBase = { fontSize: 11, color: '#94a3b8', marginTop: 4 };

/* ─── FocusInput — adds glow on focus ───────────────────────────────────── */
function Field({ label, helper, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {label && (
        <label style={labelBase}>
          {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
        </label>
      )}
      {children}
      {helper && <span style={helperBase}>{helper}</span>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', maxLength }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputBase,
        borderColor: focused ? '#0066cc' : '#e2e8f0',
        boxShadow: focused ? '0 0 0 3px rgba(0,102,204,0.12)' : 'none',
      }}
    />
  );
}

function Select({ value, onChange, children }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputBase,
        borderColor: focused ? '#0066cc' : '#e2e8f0',
        boxShadow: focused ? '0 0 0 3px rgba(0,102,204,0.12)' : 'none',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: 36,
      }}
    >
      {children}
    </select>
  );
}

/* ─── Card wrapper ──────────────────────────────────────────────────────── */
function SectionCard({ title, icon, accent = '#0066cc', children }) {
  return (
    <div className="card" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
      <div className="card-header" style={{ borderTop: `3px solid ${accent}` }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, color: '#1a2535', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <span>{icon}</span> {title}
        </h2>
      </div>
      <div className="card-body" style={{ padding: '24px 20px 28px' }}>
        {children}
      </div>
    </div>
  );
}

export default function PatientRegistration() {
  const navigate = useNavigate();
  const { addPatient } = usePatient();
  const { currentUser } = useAuth();
  const formRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [ageInYears, setAgeInYears] = useState(null);

  useEffect(() => {
    if (form.dob) {
      const today = new Date();
      const birthDate = new Date(form.dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      setAgeInYears(age);
      setForm(prev => ({ ...prev, guardianRequired: age < 18 }));
    }
  }, [form.dob]);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  const setCheckbox = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.checked }));

  const handleNext = () => {
    const step = REGISTRATION_STEPS[currentStep].id;
    if (validateStep(step)) {
      setCompletedSteps(prev => new Set([...prev, step]));
      setCurrentStep(prev => Math.min(prev + 1, REGISTRATION_STEPS.length - 1));
      // Auto-scroll to top of form
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  };

  const handlePrev = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const handleStepClick = (index) => {
    if (index < currentStep || completedSteps.has(REGISTRATION_STEPS[index].id)) {
      setCurrentStep(index);
    }
  };

  const validateStep = (stepId) => {
    setError('');
    switch (stepId) {
      case 'personal':
        if (!form.firstName.trim()) { setError('First name is required'); return false; }
        if (!form.lastName.trim())  { setError('Last name is required');  return false; }
        if (!form.dob)              { setError('Date of birth is required'); return false; }
        if (!form.gender)           { setError('Gender is required');     return false; }
        if (new Date(form.dob) > new Date()) { setError('Date of birth cannot be in the future'); return false; }
        return true;
      case 'contact':
        if (!form.phone && !form.cellPhone) { setError('At least one phone number is required'); return false; }
        if (form.phone && form.phone.replace(/\D/g, '').length !== 10) { setError('Phone must be 10 digits'); return false; }
        if (form.cellPhone && form.cellPhone.replace(/\D/g, '').length !== 10) { setError('Cell phone must be 10 digits'); return false; }
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Invalid email address'); return false; }
        if (!form.addressStreet || !form.addressCity || !form.addressState || !form.addressZip) { setError('Complete address is required'); return false; }
        return true;
      case 'guardian':
        if (form.guardianRequired) {
          if (!form.guardianFirstName.trim()) { setError('Guardian first name is required'); return false; }
          if (!form.guardianLastName.trim())  { setError('Guardian last name is required');  return false; }
          if (!form.guardianRelationship)     { setError('Relationship is required');         return false; }
          if (!form.guardianPhone)            { setError('Guardian phone is required');        return false; }
        }
        return true;
      case 'insurance':
        if (!form.insuranceName.trim())     { setError('Insurance plan name is required'); return false; }
        if (!form.insuranceMemberId.trim()) { setError('Member ID is required');           return false; }
        return true;
      case 'emergency':
        if (!form.emergencyName.trim())    { setError('Emergency contact name is required'); return false; }
        if (!form.emergencyRelationship)   { setError('Relationship is required');            return false; }
        if (!form.emergencyPhone)          { setError('Emergency contact phone is required'); return false; }
        return true;
      default: return true;
    }
  };

  const buildPayload = () => ({
    firstName: form.firstName, lastName: form.lastName, dob: form.dob,
    gender: form.gender, pronouns: form.pronouns, race: form.race,
    ethnicity: form.ethnicity, language: form.language, ssn: form.ssn,
    phone: form.phone, cellPhone: form.cellPhone, email: form.email,
    address: { street: form.addressStreet, city: form.addressCity, state: form.addressState, zip: form.addressZip },
    guardianInfo: form.guardianRequired ? {
      firstName: form.guardianFirstName, lastName: form.guardianLastName,
      relationship: form.guardianRelationship, phone: form.guardianPhone, email: form.guardianEmail,
      address: form.guardianAddressSame
        ? { street: form.addressStreet, city: form.addressCity, state: form.addressState, zip: form.addressZip }
        : { street: form.guardianAddressStreet, city: form.guardianAddressCity, state: form.guardianAddressState, zip: form.guardianAddressZip },
    } : null,
    emergencyContact: { name: form.emergencyName, relationship: form.emergencyRelationship, phone: form.emergencyPhone },
    insurance: { primary: { name: form.insuranceName, memberId: form.insuranceMemberId, groupNumber: form.insuranceGroupNumber, copay: form.insuranceCopay ? Number(form.insuranceCopay) : 0 } },
  });

  const handleSaveAndSchedule = async () => {
    if (!validateStep('emergency')) return;
    setSaving(true); setError('');
    try {
      const p = await addPatient(buildPayload());
      navigate(`/chart/${p.id}/appointments`, { state: { newPatientScheduling: true } });
    } catch (err) { setError(err.message || 'Failed to register patient'); setSaving(false); }
  };

  const handleSaveAndInsurance = async () => {
    if (!validateStep('emergency')) return;
    setSaving(true); setError('');
    try {
      const p = await addPatient(buildPayload());
      navigate(`/chart/${p.id}/demographics`, { state: { showInsuranceForm: true } });
    } catch (err) { setError(err.message || 'Failed to register patient'); setSaving(false); }
  };

  const step = REGISTRATION_STEPS[currentStep];
  const progress = Math.round(((completedSteps.size) / REGISTRATION_STEPS.length) * 100);

  return (
    <div className="fade-in" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .reg-step-btn:hover { transform: translateY(-1px); }
        .reg-nav-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .reg-nav-btn:active:not(:disabled) { transform: translateY(0); }
      `}</style>

      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0c1e3e 0%, #0066cc 50%, #2563eb 100%)',
        color: 'white', padding: '44px 32px 40px', position: 'relative', overflow: 'hidden',
        borderRadius: 16, margin: '0 0 0 0',
        boxShadow: '0 4px 20px rgba(0,102,204,0.3)',
      }}>
        {/* glass overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7, marginBottom: 6, textTransform: 'uppercase' }}>
                New Patient Intake
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                📝 Patient Registration
              </h1>
              <p style={{ fontSize: 15, opacity: 0.85, margin: 0 }}>
                Complete patient intake form with automatic guardian detection for minors
              </p>
            </div>
            {/* progress pill */}
            <div style={{
              background: 'rgba(255,255,255,0.15)', borderRadius: 40, padding: '10px 20px',
              backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)',
              textAlign: 'center', minWidth: 110,
            }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{progress}%</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Complete</div>
            </div>
          </div>
          {/* thin progress bar */}
          <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.2)', borderRadius: 4, height: 4 }}>
            <div style={{ height: 4, borderRadius: 4, background: '#a5f3fc', width: `${progress}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      </div>

      <div ref={formRef} style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px 48px' }}>

        {/* ── Step Navigation ──────────────────────────────────────────────── */}
        <div className="card" style={{
          borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          padding: '6px 8px', marginBottom: 28,
          display: 'flex', gap: 4, overflowX: 'auto',
        }}>
          {REGISTRATION_STEPS.map((s, i) => {
            const isActive = currentStep === i;
            const isDone = completedSteps.has(s.id);
            const isLocked = i > currentStep && !isDone;
            return (
              <React.Fragment key={s.id}>
                <button
                  className="reg-step-btn"
                  onClick={() => handleStepClick(i)}
                  disabled={isLocked}
                  title={s.label}
                  style={{
                    flex: '1 1 auto', padding: '10px 14px', borderRadius: 8,
                    border: isActive ? '2px solid #0066cc' : '2px solid transparent',
                    fontSize: 12, fontWeight: isActive ? 700 : 500,
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    background: isActive ? '#e8f2ff' : isDone ? '#f0fdf4' : 'transparent',
                    color: isActive ? '#004999' : isDone ? '#15803d' : isLocked ? '#cbd5e1' : '#6b7280',
                    whiteSpace: 'nowrap', transition: 'all 0.15s', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: 5,
                    minWidth: 0,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{isDone ? '✓' : s.icon}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
                </button>
                {i < REGISTRATION_STEPS.length - 1 && (
                  <div style={{ width: 1, background: '#e5e7eb', flexShrink: 0, alignSelf: 'stretch', margin: '8px 0' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Error Banner ──────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
            padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: 13,
            fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8,
            animation: 'slideUp 0.2s ease',
          }}>
            <span style={{ fontSize: 16 }}>⚠️</span> {error}
          </div>
        )}

        {/* ── Form Card ─────────────────────────────────────────────────────── */}
        <div style={{ animation: 'slideUp 0.25s ease' }}>

          {/* STEP 1 — Personal Info */}
          {currentStep === 0 && (
            <SectionCard title="Personal Info" icon="👤" accent="#0066cc">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px', marginBottom: 24 }}>
                <Field label="First Name" required>
                  <Input value={form.firstName} onChange={set('firstName')} placeholder="John" />
                </Field>
                <Field label="Last Name" required>
                  <Input value={form.lastName} onChange={set('lastName')} placeholder="Doe" />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px 24px', marginBottom: 24 }}>
                <Field label="Date of Birth" required helper="MM/DD/YYYY format">
                  <Input type="date" value={form.dob} onChange={set('dob')} />
                  {ageInYears !== null && (
                    <div style={{
                      marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: ageInYears < 18 ? '#fef2f2' : '#f0fdf4',
                      color: ageInYears < 18 ? '#b91c1c' : '#15803d',
                      border: `1px solid ${ageInYears < 18 ? '#fecaca' : '#86efac'}`,
                    }}>
                      {ageInYears < 18 ? '🔒 Minor' : '✓ Adult'} — Age {ageInYears}
                      {ageInYears < 18 && <span style={{ opacity: 0.8 }}>· Guardian required</span>}
                    </div>
                  )}
                </Field>
                <Field label="Gender" required>
                  <Select value={form.gender} onChange={set('gender')}>
                    <option value="">Select gender</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </Select>
                </Field>
                <Field label="Pronouns" helper="Optional — used in communications">
                  <Select value={form.pronouns} onChange={set('pronouns')}>
                    <option value="">Select pronouns</option>
                    {PRONOUNS.map(p => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px 24px', marginBottom: 24 }}>
                <Field label="Race">
                  <Select value={form.race} onChange={set('race')}>
                    <option value="">Select race</option>
                    {RACES.map(r => <option key={r} value={r}>{r}</option>)}
                  </Select>
                </Field>
                <Field label="Ethnicity">
                  <Select value={form.ethnicity} onChange={set('ethnicity')}>
                    <option value="">Select ethnicity</option>
                    {ETHNICITIES.map(e => <option key={e} value={e}>{e}</option>)}
                  </Select>
                </Field>
                <Field label="Preferred Language">
                  <Select value={form.language} onChange={set('language')}>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </Select>
                </Field>
              </div>

              <div style={{ maxWidth: 320 }}>
                <Field label="Social Security Number" helper="Stored encrypted — used for insurance verification only">
                  <Input type="password" value={form.ssn} onChange={set('ssn')} placeholder="XXX-XX-XXXX" />
                </Field>
              </div>

              {/* Minor alert */}
              {form.guardianRequired && ageInYears !== null && (
                <div style={{
                  marginTop: 24, background: '#fffbeb', border: '1px solid #fde68a',
                  borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12,
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>🔔</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 2 }}>
                      Guardian Information Required
                    </div>
                    <div style={{ fontSize: 12, color: '#78350f' }}>
                      This patient is {ageInYears} years old. Step 3 (Guardian) will collect required guardian details.
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* STEP 2 — Contact & Address */}
          {currentStep === 1 && (
            <SectionCard title="Contact & Address" icon="📞" accent="#0066cc">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px 24px', marginBottom: 24 }}>
                <Field label="Home Phone" helper="10-digit US number">
                  <Input type="tel" value={form.phone} onChange={set('phone')} placeholder="(555) 000-0000" />
                </Field>
                <Field label="Cell Phone" required helper="10-digit US number">
                  <Input type="tel" value={form.cellPhone} onChange={set('cellPhone')} placeholder="(555) 000-0000" />
                </Field>
                <Field label="Email Address" helper="Used for appointment reminders">
                  <Input type="email" value={form.email} onChange={set('email')} placeholder="john@example.com" />
                </Field>
              </div>

              <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0 24px' }} />

              <div style={{ marginBottom: 20 }}>
                <Field label="Street Address" required>
                  <Input value={form.addressStreet} onChange={set('addressStreet')} placeholder="123 Main Street, Apt 4B" />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px 24px' }}>
                <Field label="City" required>
                  <Input value={form.addressCity} onChange={set('addressCity')} placeholder="Chicago" />
                </Field>
                <Field label="State" required>
                  <Input value={form.addressState} onChange={set('addressState')} placeholder="IL" maxLength={2} />
                </Field>
                <Field label="ZIP Code" required>
                  <Input value={form.addressZip} onChange={set('addressZip')} placeholder="60601" />
                </Field>
              </div>
            </SectionCard>
          )}

          {/* STEP 3 — Guardian */}
          {currentStep === 2 && (
            <SectionCard title="Guardian (if minor)" icon="👨‍👩‍👧" accent="#dc2626">
              {!form.guardianRequired ? (
                <div style={{
                  background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
                  padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, color: '#1e40af',
                }}>
                  <span style={{ fontSize: 20 }}>ℹ️</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Guardian Not Required</div>
                    <div style={{ fontSize: 13 }}>Patient is {ageInYears} years old — no guardian information needed.</div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{
                    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
                    padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>🔒</span>
                    <div>
                      <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 13, marginBottom: 2 }}>
                        Minor — Guardian Required
                      </div>
                      <div style={{ fontSize: 12, color: '#7f1d1d' }}>
                        Patient is {ageInYears} years old. All fields below are required.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px', marginBottom: 24 }}>
                    <Field label="Guardian First Name" required>
                      <Input value={form.guardianFirstName} onChange={set('guardianFirstName')} placeholder="Jane" />
                    </Field>
                    <Field label="Guardian Last Name" required>
                      <Input value={form.guardianLastName} onChange={set('guardianLastName')} placeholder="Doe" />
                    </Field>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px 24px', marginBottom: 24 }}>
                    <Field label="Relationship to Patient" required>
                      <Select value={form.guardianRelationship} onChange={set('guardianRelationship')}>
                        <option value="">Select relationship</option>
                        {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                      </Select>
                    </Field>
                    <Field label="Guardian Phone" required>
                      <Input type="tel" value={form.guardianPhone} onChange={set('guardianPhone')} placeholder="(555) 000-0000" />
                    </Field>
                    <Field label="Guardian Email" helper="Optional">
                      <Input type="email" value={form.guardianEmail} onChange={set('guardianEmail')} placeholder="jane@example.com" />
                    </Field>
                  </div>

                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', marginBottom: form.guardianAddressSame ? 0 : 24 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={form.guardianAddressSame}
                        onChange={setCheckbox('guardianAddressSame')}
                        style={{ width: 16, height: 16, accentColor: '#0066cc' }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Same address as patient</span>
                    </label>
                  </div>

                  {!form.guardianAddressSame && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ marginBottom: 20 }}>
                        <Field label="Street Address">
                          <Input value={form.guardianAddressStreet} onChange={set('guardianAddressStreet')} placeholder="123 Main St" />
                        </Field>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px 24px' }}>
                        <Field label="City"><Input value={form.guardianAddressCity} onChange={set('guardianAddressCity')} placeholder="Chicago" /></Field>
                        <Field label="State"><Input value={form.guardianAddressState} onChange={set('guardianAddressState')} placeholder="IL" maxLength={2} /></Field>
                        <Field label="ZIP"><Input value={form.guardianAddressZip} onChange={set('guardianAddressZip')} placeholder="60601" /></Field>
                      </div>
                    </div>
                  )}
                </>
              )}
            </SectionCard>
          )}

          {/* STEP 4 — Insurance */}
          {currentStep === 3 && (
            <SectionCard title="Insurance Information" icon="💳" accent="#0066cc">
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px 24px', marginBottom: 24 }}>
                <Field label="Insurance Plan Name" required helper="e.g., Blue Cross Blue Shield PPO">
                  <Input value={form.insuranceName} onChange={set('insuranceName')} placeholder="Insurance provider name" />
                </Field>
                <Field label="Member ID" required helper="Found on your insurance card">
                  <Input value={form.insuranceMemberId} onChange={set('insuranceMemberId')} placeholder="ABC123456" />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px' }}>
                <Field label="Group Number" helper="Optional — from employer plan">
                  <Input value={form.insuranceGroupNumber} onChange={set('insuranceGroupNumber')} placeholder="GRP-123456" />
                </Field>
                <Field label="Copay Amount ($)" helper="Per-visit copay in dollars">
                  <Input type="number" value={form.insuranceCopay} onChange={set('insuranceCopay')} placeholder="25" />
                </Field>
              </div>
            </SectionCard>
          )}

          {/* STEP 5 — Emergency Contact */}
          {currentStep === 4 && (
            <SectionCard title="Emergency Contact" icon="🆘" accent="#dc2626">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px 24px' }}>
                <Field label="Full Name" required>
                  <Input value={form.emergencyName} onChange={set('emergencyName')} placeholder="Full name" />
                </Field>
                <Field label="Relationship" required>
                  <Select value={form.emergencyRelationship} onChange={set('emergencyRelationship')}>
                    <option value="">Select relationship</option>
                    {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                  </Select>
                </Field>
                <Field label="Phone Number" required helper="Best number to reach in emergency">
                  <Input type="tel" value={form.emergencyPhone} onChange={set('emergencyPhone')} placeholder="(555) 000-0000" />
                </Field>
              </div>
            </SectionCard>
          )}

          {/* STEP 6 — Review & Submit */}
          {currentStep === 5 && (
            <SectionCard title="Review & Submit" icon="✅" accent="#16a34a">
              <div style={{
                background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10,
                padding: '16px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 22 }}>🎉</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#15803d', fontSize: 14 }}>Ready to register</div>
                  <div style={{ fontSize: 12, color: '#166534' }}>All required fields completed. Choose how to proceed below.</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                {[
                  { label: '👤 Patient', value: `${form.firstName} ${form.lastName}` },
                  { label: '📅 Date of Birth', value: form.dob ? `${form.dob} (Age ${ageInYears})` : '—' },
                  { label: '📍 Address', value: `${form.addressCity}, ${form.addressState} ${form.addressZip}` },
                  { label: '📞 Phone', value: form.cellPhone || form.phone || '—' },
                  { label: '💳 Insurance', value: form.insuranceName || '—' },
                  ...(form.guardianRequired ? [{ label: '👨‍👩‍👧 Guardian', value: `${form.guardianFirstName} ${form.guardianLastName}` }] : []),
                ].map(item => (
                  <div key={item.label} style={{
                    background: '#f8fafc', borderRadius: 10, padding: '14px 16px',
                    border: '1px solid #e2e8f0',
                  }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* ── Navigation Buttons ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
          <button
            className="reg-nav-btn"
            onClick={handlePrev}
            disabled={currentStep === 0}
            style={{
              padding: '12px 24px', borderRadius: 10, border: '1.5px solid #e2e8f0',
              background: 'white', fontSize: 14, fontWeight: 600, cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              color: '#374151', opacity: currentStep === 0 ? 0.4 : 1, transition: 'all 0.15s',
            }}
          >
            ← Previous
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            {currentStep === 5 ? (
              <>
                <button
                  className="reg-nav-btn"
                  onClick={handleSaveAndSchedule}
                  disabled={saving}
                  style={{
                    padding: '12px 24px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #1e3a5f 0%, #0066cc 100%)',
                    color: 'white', fontSize: 14, fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'all 0.15s',
                  }}
                >
                  {saving ? '⏳ Saving…' : '📅 Save & Schedule'}
                </button>
                <button
                  className="reg-nav-btn"
                  onClick={handleSaveAndInsurance}
                  disabled={saving}
                  style={{
                    padding: '12px 24px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #0c2d5e 0%, #0550a0 100%)',
                    color: 'white', fontSize: 14, fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'all 0.15s',
                  }}
                >
                  {saving ? '⏳ Saving…' : '💳 Save & Add Insurance'}
                </button>
              </>
            ) : (
              <button
                className="reg-nav-btn"
                onClick={handleNext}
                style={{
                  padding: '12px 28px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #0066cc 0%, #004999 100%)',
                  color: 'white', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: '0 2px 8px rgba(0,102,204,0.3)',
                }}
              >
                Continue →
              </button>
            )}
          </div>
        </div>

        {/* step counter */}
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#94a3b8' }}>
          Step {currentStep + 1} of {REGISTRATION_STEPS.length}
        </div>
      </div>
    </div>
  );
}
