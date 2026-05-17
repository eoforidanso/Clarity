import React, { useState, useEffect } from 'react';
import { usePatient } from '../../contexts/PatientContext';
import { useAuth } from '../../contexts/AuthContext';

const GENDERS = ['Male', 'Female', 'Non-binary', 'Transgender Male', 'Transgender Female', 'Other', 'Prefer not to say'];
const PRONOUNS = ['He/Him', 'She/Her', 'They/Them', 'Other'];
const MARITAL = ['Single', 'Married', 'Divorced', 'Widowed', 'Separated', 'Domestic Partner'];
const RACES = ['White', 'Black or African American', 'Asian', 'American Indian or Alaska Native', 'Native Hawaiian or Other Pacific Islander', 'Two or More Races', 'Unknown', 'Other'];
const ETHNICITIES = ['Hispanic or Latino', 'Not Hispanic or Latino', 'Unknown'];
const LANGUAGES = ['English', 'Spanish', 'French', 'Mandarin', 'Cantonese', 'Vietnamese', 'Arabic', 'Tagalog', 'Korean', 'Other'];

function toForm(p) {
  return {
    firstName: p.firstName || '',
    lastName: p.lastName || '',
    dob: p.dob || '',
    gender: p.gender || '',
    pronouns: p.pronouns || '',
    maritalStatus: p.maritalStatus || '',
    race: p.race || '',
    ethnicity: p.ethnicity || '',
    language: p.language || '',
    ssn: p.ssn || '',
    phone: p.phone || '',
    cellPhone: p.cellPhone || '',
    email: p.email || '',
    addressStreet: p.address?.street || '',
    addressCity: p.address?.city || '',
    addressState: p.address?.state || '',
    addressZip: p.address?.zip || '',
    emergencyName: p.emergencyContact?.name || '',
    emergencyRelationship: p.emergencyContact?.relationship || '',
    emergencyPhone: p.emergencyContact?.phone || '',
    insurancePrimaryName: p.insurance?.primary?.name || '',
    insurancePrimaryMemberId: p.insurance?.primary?.memberId || '',
    insurancePrimaryGroupNumber: p.insurance?.primary?.groupNumber || '',
    insurancePrimaryCopay: p.insurance?.primary?.copay || '',
    insuranceSecondaryName: p.insurance?.secondary?.name || '',
    insuranceSecondaryMemberId: p.insurance?.secondary?.memberId || '',
    pcp: p.pcp || '',
  };
}

export default function Demographics({ patientId }) {
  const { selectedPatient, updatePatient } = usePatient();
  const { currentUser } = useAuth();
  const canEdit = ['prescriber', 'front_desk', 'nurse'].includes(currentUser?.role);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (selectedPatient) setForm(toForm(selectedPatient));
  }, [selectedPatient]);

  if (!selectedPatient) return null;
  const p = selectedPatient;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      await updatePatient(selectedPatient.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        dob: form.dob,
        gender: form.gender,
        pronouns: form.pronouns,
        maritalStatus: form.maritalStatus,
        race: form.race,
        ethnicity: form.ethnicity,
        language: form.language,
        phone: form.phone,
        cellPhone: form.cellPhone,
        email: form.email,
        address: {
          street: form.addressStreet,
          city: form.addressCity,
          state: form.addressState,
          zip: form.addressZip,
        },
        emergencyContact: {
          name: form.emergencyName,
          relationship: form.emergencyRelationship,
          phone: form.emergencyPhone,
        },
        insurance: {
          primary: {
            name: form.insurancePrimaryName,
            memberId: form.insurancePrimaryMemberId,
            groupNumber: form.insurancePrimaryGroupNumber,
            copay: form.insurancePrimaryCopay,
          },
          secondary: form.insuranceSecondaryName ? {
            name: form.insuranceSecondaryName,
            memberId: form.insuranceSecondaryMemberId,
          } : null,
        },
        pcp: form.pcp,
      });
      setSaveSuccess(true);
      setEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(toForm(p));
    setEditing(false);
    setSaveError('');
  };

  /* ── Read-only field ── */
  const Field = ({ label, value }) => (
    <div className="athena-field">
      <div className="athena-field-label">{label}</div>
      <div className="athena-field-value">{value || '—'}</div>
    </div>
  );

  /* ── Editable text field ── */
  const EField = ({ label, field, type = 'text', span = false }) => (
    <div className="athena-field" style={span ? { gridColumn: '1/-1' } : {}}>
      <div className="athena-field-label">{label}</div>
      <input
        type={type}
        value={form[field] || ''}
        onChange={set(field)}
        style={{
          width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)',
          background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 13,
        }}
      />
    </div>
  );

  /* ── Editable select field ── */
  const ESelect = ({ label, field, options }) => (
    <div className="athena-field">
      <div className="athena-field-label">{label}</div>
      <select
        value={form[field] || ''}
        onChange={set(field)}
        style={{
          width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)',
          background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 13,
        }}
      >
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="athena-demographics">

      {/* ── Edit / Save toolbar ── */}
      {canEdit && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '10px 16px', background: editing ? 'var(--bg-surface)' : 'transparent', border: editing ? '1px solid var(--border)' : 'none', borderRadius: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {editing ? '✏️ Editing patient demographics — changes will be saved to the chart.' : ''}
            {saveSuccess && <span style={{ color: '#10b981', fontWeight: 700 }}>✅ Saved successfully</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!editing ? (
              <button className="btn btn-secondary" style={{ fontSize: 13, padding: '6px 16px' }} onClick={() => setEditing(true)}>
                ✏️ Edit Demographics
              </button>
            ) : (
              <>
                <button type="button" className="btn btn-secondary" style={{ fontSize: 13, padding: '6px 14px' }} onClick={handleCancel} disabled={saving}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" style={{ fontSize: 13, padding: '6px 18px' }} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : '💾 Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {saveError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '9px 14px', color: '#dc2626', fontSize: 13, marginBottom: 12 }}>
          ⚠️ {saveError}
        </div>
      )}

      <div className="athena-summary-row-2">
        {/* Personal Information */}
        <div className="athena-panel">
          <div className="athena-panel-header">
            <div className="athena-panel-title"><span className="athena-panel-icon">👤</span>Personal Information</div>
          </div>
          <div className="athena-panel-body">
            <div className="athena-field-grid">
              {editing ? <>
                <EField label="First Name" field="firstName" />
                <EField label="Last Name" field="lastName" />
                <EField label="Date of Birth" field="dob" type="date" />
                <ESelect label="Gender" field="gender" options={GENDERS} />
                <ESelect label="Pronouns" field="pronouns" options={PRONOUNS} />
                <ESelect label="Marital Status" field="maritalStatus" options={MARITAL} />
                <ESelect label="Race" field="race" options={RACES} />
                <ESelect label="Ethnicity" field="ethnicity" options={ETHNICITIES} />
                <ESelect label="Preferred Language" field="language" options={LANGUAGES} />
              </> : <>
                <Field label="First Name" value={p.firstName} />
                <Field label="Last Name" value={p.lastName} />
                <Field label="Date of Birth" value={`${p.dob} (Age ${p.age})`} />
                <Field label="Gender" value={p.gender} />
                <Field label="Pronouns" value={p.pronouns} />
                <Field label="Marital Status" value={p.maritalStatus} />
                <Field label="Race" value={p.race} />
                <Field label="Ethnicity" value={p.ethnicity} />
                <Field label="Preferred Language" value={p.language} />
                <Field label="SSN" value={p.ssn} />
              </>}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="athena-panel">
          <div className="athena-panel-header">
            <div className="athena-panel-title"><span className="athena-panel-icon">📞</span>Contact Information</div>
          </div>
          <div className="athena-panel-body">
            <div className="athena-field-grid">
              {editing ? <>
                <EField label="Home Phone" field="phone" type="tel" />
                <EField label="Cell Phone" field="cellPhone" type="tel" />
                <EField label="Email" field="email" type="email" />
                <EField label="Street Address" field="addressStreet" />
                <EField label="City" field="addressCity" />
                <EField label="State" field="addressState" />
                <EField label="ZIP" field="addressZip" />
              </> : <>
                <Field label="Home Phone" value={p.phone} />
                <Field label="Cell Phone" value={p.cellPhone} />
                <Field label="Email" value={p.email} />
                <Field label="Address" value={`${p.address?.street}, ${p.address?.city}, ${p.address?.state} ${p.address?.zip}`} />
              </>}
            </div>

            <div className="athena-section-divider">
              <div className="athena-section-label">🆘 Emergency Contact</div>
              <div className="athena-field-grid">
                {editing ? <>
                  <EField label="Name" field="emergencyName" />
                  <EField label="Relationship" field="emergencyRelationship" />
                  <EField label="Phone" field="emergencyPhone" type="tel" />
                </> : <>
                  <Field label="Name" value={p.emergencyContact?.name} />
                  <Field label="Relationship" value={p.emergencyContact?.relationship} />
                  <Field label="Phone" value={p.emergencyContact?.phone} />
                </>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="athena-summary-row-2" style={{ marginTop: 16 }}>
        {/* Insurance */}
        <div className="athena-panel">
          <div className="athena-panel-header">
            <div className="athena-panel-title"><span className="athena-panel-icon">🏥</span>Insurance Information</div>
          </div>
          <div className="athena-panel-body">
            <div className="athena-insurance-label">Primary Insurance</div>
            <div className="athena-field-grid">
              {editing ? <>
                <EField label="Plan Name" field="insurancePrimaryName" />
                <EField label="Member ID" field="insurancePrimaryMemberId" />
                <EField label="Group Number" field="insurancePrimaryGroupNumber" />
                <EField label="Copay ($)" field="insurancePrimaryCopay" />
              </> : <>
                <Field label="Plan" value={p.insurance?.primary?.name} />
                <Field label="Member ID" value={p.insurance?.primary?.memberId} />
                <Field label="Group Number" value={p.insurance?.primary?.groupNumber} />
                <Field label="Copay" value={p.insurance?.primary?.copay ? `$${p.insurance.primary.copay}` : '—'} />
              </>}
            </div>

            <div className="athena-section-divider">
              <div className="athena-insurance-label secondary">Secondary Insurance</div>
              <div className="athena-field-grid">
                {editing ? <>
                  <EField label="Plan Name" field="insuranceSecondaryName" />
                  <EField label="Member ID" field="insuranceSecondaryMemberId" />
                </> : <>
                  <Field label="Plan" value={p.insurance?.secondary?.name} />
                  <Field label="Member ID" value={p.insurance?.secondary?.memberId} />
                </>}
              </div>
            </div>
          </div>
        </div>

        {/* Care Team */}
        <div className="athena-panel">
          <div className="athena-panel-header">
            <div className="athena-panel-title"><span className="athena-panel-icon">👨‍⚕️</span>Care Team</div>
          </div>
          <div className="athena-panel-body">
            <div className="athena-field-grid">
              {editing ? (
                <EField label="Primary Care Provider" field="pcp" />
              ) : (
                <Field label="Primary Care Provider" value={p.pcp} />
              )}
              <Field label="MRN" value={p.mrn} />
              <Field label="Last Visit" value={p.lastVisit} />
              <Field label="Next Appointment" value={p.nextAppointment} />
              <Field label="Status" value={p.isActive ? '● Active' : '○ Inactive'} />
            </div>

            {p.flags?.length > 0 && (
              <div className="athena-section-divider">
                <div className="athena-section-label">Patient Flags</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {p.flags.map((f, i) => (
                    <span key={i} className={
                      f.includes('Suicide') ? 'athena-flag-critical' :
                      f.includes('Substance') ? 'athena-flag-warning' :
                      f === 'VIP' ? 'athena-flag-vip' :
                      f.includes('BTG') ? 'athena-flag-critical' :
                      'athena-flag-info'
                    }>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
