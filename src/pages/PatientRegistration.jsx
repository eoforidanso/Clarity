import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../contexts/PatientContext';
import { useAuth } from '../contexts/AuthContext';

const GENDERS = ['Male', 'Female', 'Non-binary', 'Transgender Male', 'Transgender Female', 'Other', 'Prefer not to say'];
const PRONOUNS = ['He/Him', 'She/Her', 'They/Them', 'Other'];
const RACES = ['White', 'Black or African American', 'Asian', 'American Indian or Alaska Native', 'Native Hawaiian or Other Pacific Islander', 'Two or More Races', 'Unknown', 'Other'];
const ETHNICITIES = ['Hispanic or Latino', 'Not Hispanic or Latino', 'Unknown'];
const LANGUAGES = ['English', 'Spanish', 'French', 'Mandarin', 'Arabic', 'Portuguese', 'Vietnamese', 'Tagalog', 'Other'];
const RELATIONSHIPS = ['Parent', 'Guardian', 'Grandparent', 'Aunt/Uncle', 'Sibling', 'Other Family', 'Legal Guardian'];

const REGISTRATION_STEPS = [
  { id: 'personal', label: 'Personal Info', icon: '👤', number: 1 },
  { id: 'contact', label: 'Contact & Address', icon: '📞', number: 2 },
  { id: 'guardian', label: 'Guardian (if minor)', icon: '👨‍👩‍👧', number: 3 },
  { id: 'insurance', label: 'Insurance', icon: '💳', number: 4 },
  { id: 'emergency', label: 'Emergency Contact', icon: '🆘', number: 5 },
  { id: 'review', label: 'Review & Submit', icon: '✅', number: 6 },
];

const DEFAULT_FORM = {
  // Personal
  firstName: '', lastName: '', dob: '', gender: '', pronouns: '',
  race: '', ethnicity: '', language: 'English', ssn: '',
  // Contact
  phone: '', cellPhone: '', email: '',
  addressStreet: '', addressCity: '', addressState: '', addressZip: '',
  // Guardian (for minors)
  guardianRequired: false, guardianFirstName: '', guardianLastName: '',
  guardianRelationship: '', guardianPhone: '', guardianEmail: '',
  guardianAddressSame: true,
  guardianAddressStreet: '', guardianAddressCity: '', guardianAddressState: '', guardianAddressZip: '',
  // Insurance
  insuranceName: '', insuranceMemberId: '', insuranceGroupNumber: '', insuranceCopay: '',
  // Emergency
  emergencyName: '', emergencyRelationship: '', emergencyPhone: '',
};

export default function PatientRegistration() {
  const navigate = useNavigate();
  const { addPatient } = usePatient();
  const { currentUser } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [ageInYears, setAgeInYears] = useState(null);

  // Calculate age and determine if minor
  useEffect(() => {
    if (form.dob) {
      const today = new Date();
      const birthDate = new Date(form.dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setAgeInYears(age);
      setForm(prev => ({
        ...prev,
        guardianRequired: age < 18
      }));
    }
  }, [form.dob]);

  const set = (field) => (e) => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const setCheckbox = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.checked }));
  };

  const handleNext = () => {
    const step = REGISTRATION_STEPS[currentStep].id;
    if (validateStep(step)) {
      setCompletedSteps(prev => new Set([...prev, step]));
      setCurrentStep(prev => Math.min(prev + 1, REGISTRATION_STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleStepClick = (index) => {
    setCurrentStep(index);
  };

  const validateStep = (stepId) => {
    setError('');
    switch (stepId) {
      case 'personal':
        if (!form.firstName.trim()) { setError('First name is required'); return false; }
        if (!form.lastName.trim()) { setError('Last name is required'); return false; }
        if (!form.dob) { setError('Date of birth is required'); return false; }
        if (!form.gender) { setError('Gender is required'); return false; }
        const dob = new Date(form.dob);
        if (dob > new Date()) { setError('Date of birth cannot be in the future'); return false; }
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
          if (!form.guardianLastName.trim()) { setError('Guardian last name is required'); return false; }
          if (!form.guardianRelationship) { setError('Relationship is required'); return false; }
          if (!form.guardianPhone) { setError('Guardian phone is required'); return false; }
        }
        return true;
      case 'insurance':
        if (!form.insuranceName.trim()) { setError('Insurance plan name is required'); return false; }
        if (!form.insuranceMemberId.trim()) { setError('Member ID is required'); return false; }
        return true;
      case 'emergency':
        if (!form.emergencyName.trim()) { setError('Emergency contact name is required'); return false; }
        if (!form.emergencyRelationship) { setError('Relationship is required'); return false; }
        if (!form.emergencyPhone) { setError('Emergency contact phone is required'); return false; }
        return true;
      default:
        return true;
    }
  };

  const handleSaveAndSchedule = async () => {
    if (!validateStep('emergency')) return;
    setSaving(true);
    setError('');
    try {
      const newPatient = await addPatient({
        firstName: form.firstName,
        lastName: form.lastName,
        dob: form.dob,
        gender: form.gender,
        pronouns: form.pronouns,
        race: form.race,
        ethnicity: form.ethnicity,
        language: form.language,
        ssn: form.ssn,
        phone: form.phone,
        cellPhone: form.cellPhone,
        email: form.email,
        address: {
          street: form.addressStreet,
          city: form.addressCity,
          state: form.addressState,
          zip: form.addressZip,
        },
        guardianInfo: form.guardianRequired ? {
          firstName: form.guardianFirstName,
          lastName: form.guardianLastName,
          relationship: form.guardianRelationship,
          phone: form.guardianPhone,
          email: form.guardianEmail,
          address: form.guardianAddressSame ? {
            street: form.addressStreet,
            city: form.addressCity,
            state: form.addressState,
            zip: form.addressZip,
          } : {
            street: form.guardianAddressStreet,
            city: form.guardianAddressCity,
            state: form.guardianAddressState,
            zip: form.guardianAddressZip,
          },
        } : null,
        emergencyContact: {
          name: form.emergencyName,
          relationship: form.emergencyRelationship,
          phone: form.emergencyPhone,
        },
      });
      navigate(`/chart/${newPatient.id}/appointments`, { state: { newPatientScheduling: true } });
    } catch (err) {
      setError(err.message || 'Failed to register patient');
      setSaving(false);
    }
  };

  const handleSaveAndInsurance = async () => {
    if (!validateStep('emergency')) return;
    setSaving(true);
    setError('');
    try {
      const newPatient = await addPatient({
        firstName: form.firstName,
        lastName: form.lastName,
        dob: form.dob,
        gender: form.gender,
        pronouns: form.pronouns,
        race: form.race,
        ethnicity: form.ethnicity,
        language: form.language,
        ssn: form.ssn,
        phone: form.phone,
        cellPhone: form.cellPhone,
        email: form.email,
        address: {
          street: form.addressStreet,
          city: form.addressCity,
          state: form.addressState,
          zip: form.addressZip,
        },
        guardianInfo: form.guardianRequired ? {
          firstName: form.guardianFirstName,
          lastName: form.guardianLastName,
          relationship: form.guardianRelationship,
          phone: form.guardianPhone,
          email: form.guardianEmail,
          address: form.guardianAddressSame ? {
            street: form.addressStreet,
            city: form.addressCity,
            state: form.addressState,
            zip: form.addressZip,
          } : {
            street: form.guardianAddressStreet,
            city: form.guardianAddressCity,
            state: form.guardianAddressState,
            zip: form.guardianAddressZip,
          },
        } : null,
        emergencyContact: {
          name: form.emergencyName,
          relationship: form.emergencyRelationship,
          phone: form.emergencyPhone,
        },
        insurance: {
          primary: {
            name: form.insuranceName,
            memberId: form.insuranceMemberId,
            groupNumber: form.insuranceGroupNumber,
            copay: form.insuranceCopay ? Number(form.insuranceCopay) : 0,
          },
        },
      });
      navigate(`/chart/${newPatient.id}/demographics`, { state: { showInsuranceForm: true } });
    } catch (err) {
      setError(err.message || 'Failed to register patient');
      setSaving(false);
    }
  };

  const handleSave = async () => {
    await handleSaveAndSchedule();
  };

  const step = REGISTRATION_STEPS[currentStep];

  return (
    <div className="fade-in" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: 'white', padding: '32px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px 0' }}>📝 Patient Registration</h1>
        <p style={{ fontSize: 14, opacity: 0.9, margin: 0 }}>Complete patient intake form with automatic guardian detection for minors</p>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
        {/* Progress Steps */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {REGISTRATION_STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => handleStepClick(i)}
                disabled={currentStep < i && !completedSteps.has(s.id)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: currentStep < i && !completedSteps.has(s.id) ? 'not-allowed' : 'pointer',
                  background: currentStep === i ? '#4f46e5' : completedSteps.has(s.id) ? '#10b981' : '#e5e7eb',
                  color: currentStep === i || completedSteps.has(s.id) ? 'white' : '#6b7280',
                  opacity: currentStep < i && !completedSteps.has(s.id) ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ marginRight: 6 }}>{s.icon}</span>
                {s.label}
                {completedSteps.has(s.id) && <span style={{ marginLeft: 6 }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Main Form Card */}
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: 32, marginBottom: 24 }}>
          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 20, color: '#dc2626', fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}

          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24, color: '#0f172a' }}>
            {step.icon} {step.label}
          </h2>

          {/* Personal Information */}
          {currentStep === 0 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>First Name *</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={set('firstName')}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                    placeholder="John"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Last Name *</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={set('lastName')}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Date of Birth *</label>
                  <input
                    type="date"
                    value={form.dob}
                    onChange={set('dob')}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                  {ageInYears !== null && (
                    <div style={{ fontSize: 12, color: ageInYears < 18 ? '#dc2626' : '#10b981', marginTop: 4, fontWeight: 600 }}>
                      {ageInYears < 18 ? `🔔 Minor (${ageInYears} years old) - Guardian required` : `Age: ${ageInYears} years old`}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Gender *</label>
                  <select
                    value={form.gender}
                    onChange={set('gender')}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  >
                    <option value="">Select gender</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Pronouns</label>
                  <select
                    value={form.pronouns}
                    onChange={set('pronouns')}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  >
                    <option value="">Select pronouns</option>
                    {PRONOUNS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Race</label>
                  <select
                    value={form.race}
                    onChange={set('race')}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  >
                    <option value="">Select race</option>
                    {RACES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Ethnicity</label>
                  <select
                    value={form.ethnicity}
                    onChange={set('ethnicity')}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  >
                    <option value="">Select ethnicity</option>
                    {ETHNICITIES.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Language</label>
                  <select
                    value={form.language}
                    onChange={set('language')}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  >
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>SSN (Optional)</label>
                <input
                  type="password"
                  value={form.ssn}
                  onChange={set('ssn')}
                  placeholder="XXX-XX-XXXX"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                />
              </div>
            </div>
          )}

          {/* Contact & Address */}
          {currentStep === 1 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Home Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder="(555) 000-0000"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Cell Phone *</label>
                  <input
                    type="tel"
                    value={form.cellPhone}
                    onChange={set('cellPhone')}
                    placeholder="(555) 000-0000"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="john@example.com"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Street Address *</label>
                <input
                  type="text"
                  value={form.addressStreet}
                  onChange={set('addressStreet')}
                  placeholder="123 Main St"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>City *</label>
                  <input
                    type="text"
                    value={form.addressCity}
                    onChange={set('addressCity')}
                    placeholder="Chicago"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>State *</label>
                  <input
                    type="text"
                    value={form.addressState}
                    onChange={set('addressState')}
                    placeholder="IL"
                    maxLength={2}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>ZIP *</label>
                  <input
                    type="text"
                    value={form.addressZip}
                    onChange={set('addressZip')}
                    placeholder="60601"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Guardian Info (conditional for minors) */}
          {currentStep === 2 && (
            <div>
              {!form.guardianRequired && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 16, marginBottom: 16, color: '#1e40af', fontSize: 14 }}>
                  ℹ️ Patient is {ageInYears} years old — guardian information not required.
                </div>
              )}

              {form.guardianRequired && (
                <>
                  <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 16, color: '#991b1b', fontSize: 13, fontWeight: 600 }}>
                    🔔 Patient is a minor ({ageInYears} years old) — guardian information required
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Guardian First Name *</label>
                      <input
                        type="text"
                        value={form.guardianFirstName}
                        onChange={set('guardianFirstName')}
                        placeholder="Jane"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Guardian Last Name *</label>
                      <input
                        type="text"
                        value={form.guardianLastName}
                        onChange={set('guardianLastName')}
                        placeholder="Doe"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Relationship *</label>
                      <select
                        value={form.guardianRelationship}
                        onChange={set('guardianRelationship')}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                      >
                        <option value="">Select relationship</option>
                        {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Phone *</label>
                      <input
                        type="tel"
                        value={form.guardianPhone}
                        onChange={set('guardianPhone')}
                        placeholder="(555) 000-0000"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Email</label>
                      <input
                        type="email"
                        value={form.guardianEmail}
                        onChange={set('guardianEmail')}
                        placeholder="jane@example.com"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={form.guardianAddressSame}
                        onChange={setCheckbox('guardianAddressSame')}
                      />
                      Same address as patient
                    </label>
                  </div>

                  {!form.guardianAddressSame && (
                    <>
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Street Address</label>
                        <input
                          type="text"
                          value={form.guardianAddressStreet}
                          onChange={set('guardianAddressStreet')}
                          placeholder="123 Main St"
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>City</label>
                          <input
                            type="text"
                            value={form.guardianAddressCity}
                            onChange={set('guardianAddressCity')}
                            placeholder="Chicago"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>State</label>
                          <input
                            type="text"
                            value={form.guardianAddressState}
                            onChange={set('guardianAddressState')}
                            placeholder="IL"
                            maxLength={2}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>ZIP</label>
                          <input
                            type="text"
                            value={form.guardianAddressZip}
                            onChange={set('guardianAddressZip')}
                            placeholder="60601"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Insurance */}
          {currentStep === 3 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Insurance Plan Name *</label>
                  <input
                    type="text"
                    value={form.insuranceName}
                    onChange={set('insuranceName')}
                    placeholder="e.g., Blue Cross Blue Shield"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Member ID *</label>
                  <input
                    type="text"
                    value={form.insuranceMemberId}
                    onChange={set('insuranceMemberId')}
                    placeholder="ABC123456"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Group Number</label>
                  <input
                    type="text"
                    value={form.insuranceGroupNumber}
                    onChange={set('insuranceGroupNumber')}
                    placeholder="GRP123"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Copay ($)</label>
                  <input
                    type="number"
                    value={form.insuranceCopay}
                    onChange={set('insuranceCopay')}
                    placeholder="25"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          {currentStep === 4 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Name *</label>
                  <input
                    type="text"
                    value={form.emergencyName}
                    onChange={set('emergencyName')}
                    placeholder="Emergency contact name"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Relationship *</label>
                  <select
                    value={form.emergencyRelationship}
                    onChange={set('emergencyRelationship')}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  >
                    <option value="">Select relationship</option>
                    {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Phone *</label>
                  <input
                    type="tel"
                    value={form.emergencyPhone}
                    onChange={set('emergencyPhone')}
                    placeholder="(555) 000-0000"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Review */}
          {currentStep === 5 && (
            <div>
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 8 }}>✅ Review Complete</div>
                <div style={{ fontSize: 12, color: '#166534' }}>
                  All required information has been entered. Click a save option below to register the patient and proceed.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>👤 {form.firstName} {form.lastName}</div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                    <div>📅 DOB: {form.dob}</div>
                    <div>📍 {form.addressCity}, {form.addressState}</div>
                    {form.guardianRequired && <div>👨‍👩‍👧 Guardian: {form.guardianFirstName} {form.guardianLastName}</div>}
                    <div>💳 Insurance: {form.insuranceName}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: 'white',
              fontSize: 14,
              fontWeight: 700,
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              opacity: currentStep === 0 ? 0.5 : 1,
            }}
          >
            ← Previous
          </button>

          <div style={{ display: 'flex', gap: 12 }}>
            {currentStep === 5 ? (
              <>
                <button
                  onClick={handleSaveAndSchedule}
                  disabled={saving}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? '⏳ Saving…' : '📅 Save & Schedule'}
                </button>
                <button
                  onClick={handleSaveAndInsurance}
                  disabled={saving}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? '⏳ Saving…' : '💳 Save & Insurance'}
                </button>
              </>
            ) : (
              <button
                onClick={handleNext}
                style={{
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#4f46e5',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
