import React, { useState, useEffect } from 'react';
import { usePatient } from '../../contexts/PatientContext';
import { useAuth } from '../../contexts/AuthContext';
import PatientPhotoUpload from '../../components/PatientPhotoUpload';
import { DemoSafe, DemoDisabled } from '../../demo/DemoGuard';
import { useDemo } from '../../demo/DemoContext';

const GENDERS = ['Male', 'Female'];
const PRONOUNS = ['He/Him', 'She/Her'];
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
    preferredPharmacy: p.preferredPharmacy || '',
    preferredPharmacyPhone: p.preferredPharmacyPhone || '',
    preferredPharmacyFax: p.preferredPharmacyFax || '',
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
  const [showPhotoModal, setShowPhotoModal] = useState(false);

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
        preferredPharmacy: form.preferredPharmacy,
        preferredPharmacyPhone: form.preferredPharmacyPhone,
        preferredPharmacyFax: form.preferredPharmacyFax,
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

  const initials = `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`;

  return (
    <div className="athena-demographics">

      {/* ── Patient Photo ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
        <div
          onClick={() => setShowPhotoModal(true)}
          style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
          title="Click to update patient photo"
          role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && setShowPhotoModal(true)}
          aria-label="Update patient photo"
        >
          {p.photo ? (
            <img src={p.photo} alt={`${p.firstName} ${p.lastName}`}
              style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', border: '2px solid #e2e8f0', display: 'block' }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', border: '2px solid #e2e8f0' }}>
              {initials}
            </div>
          )}
          <div style={{ position: 'absolute', inset: 0, borderRadius: 10, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, transition: 'background 0.15s', opacity: 0 }}
            className="photo-hover-overlay">
          </div>
          <div style={{ position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: '50%', background: '#0891b2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', border: '2px solid #fff' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>Patient Photo</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
            {p.photo ? 'Photo on file · Click to update' : 'No photo on file · Click to upload'}
          </div>
          <button onClick={() => setShowPhotoModal(true)}
            style={{ padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, border: '1px solid #bae6fd', background: '#f0f9ff', color: '#0891b2', cursor: 'pointer' }}>
            {p.photo ? '📷 Update Photo' : '📷 Upload Photo'}
          </button>
          {p.photo && (
            <button onClick={() => { const { updatePatientPhoto } = require('../../contexts/PatientContext'); }}
              style={{ marginLeft: 6, padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}
              onClick={() => setShowPhotoModal(true)}>
              Remove
            </button>
          )}
        </div>
        {showPhotoModal && <PatientPhotoUpload patient={p} onClose={() => setShowPhotoModal(false)} />}
      </div>

      {/* ── Edit / Save toolbar ── */}
      {canEdit && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '16px 20px', background: editing ? 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)' : 'linear-gradient(135deg, #f0f9ff 0%, #e0f4ff 100%)', border: editing ? '2px solid #0284c7' : '2px solid #06b6d4', borderRadius: 12, boxShadow: '0 2px 8px rgba(2, 132, 199, 0.1)' }}>
          <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>
            {editing && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0c4a6e' }}>
                <span style={{ fontSize: 18 }}>✏️</span>
                Editing patient demographics — changes will be saved to the chart.
              </span>
            )}
            {!editing && saveSuccess && <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>✅ Saved successfully</span>}
            {!editing && !saveSuccess && <span style={{ color: '#0c4a6e' }}>Update patient information as needed</span>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {!editing ? (
              <DemoDisabled reason="Editing patient demographics is disabled in demo mode">
                <button
                  className="btn btn-primary"
                  style={{
                    fontSize: 14,
                    padding: '10px 24px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setEditing(true)}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(2, 132, 199, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(2, 132, 199, 0.3)';
                  }}
                >
                  ✏️ Edit Demographics
                </button>
              </DemoDisabled>
            ) : (
              <>
                <button type="button" className="btn btn-secondary" style={{ fontSize: 13, padding: '8px 16px', fontWeight: 600 }} onClick={handleCancel} disabled={saving}>
                  Cancel
                </button>
                <DemoDisabled reason="Saving patient data is disabled in demo mode">
                  <button type="button" className="btn btn-primary" style={{ fontSize: 14, padding: '10px 22px', fontWeight: 700, background: '#10b981', border: 'none', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }} onClick={handleSave} disabled={saving}>
                    {saving ? '⏳ Saving…' : '💾 Save Changes'}
                  </button>
                </DemoDisabled>
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
                <Field label="SSN" value={<DemoSafe mask="███-██-████">{p.ssn}</DemoSafe>} />
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
                {/* Email field with portal invite shortcut */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: 'span 2' }}>
                  <div style={{ flex: 1 }}>
                    <Field label="Email" value={p.email} />
                  </div>
                  {p.email && (
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Send portal invite to ${p.email}?`)) return;
                        try {
                          const API = import.meta.env.VITE_API_URL || '/api';
                          const res = await fetch(`${API}/patient-portal/request-access`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ email: p.email }),
                          });
                          if (res.ok) alert(`✅ Portal invite sent to ${p.email}`);
                          else alert('Failed to send invite');
                        } catch { alert('Network error'); }
                      }}
                      style={{
                        marginTop: 18, padding: '5px 12px', borderRadius: 6, fontSize: 11,
                        fontWeight: 700, border: '1px solid #93c5fd',
                        background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer',
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}
                    >
                      📧 Send portal invite
                    </button>
                  )}
                  {!p.email && (
                    <span style={{ marginTop: 18, fontSize: 11, color: '#ef4444', fontWeight: 600, flexShrink: 0 }}>
                      ⚠️ No email — click Edit to add
                    </span>
                  )}
                </div>
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
                <Field label="Member ID" value={<DemoSafe mask="██████████">{p.insurance?.primary?.memberId}</DemoSafe>} />
                <Field label="Group Number" value={<DemoSafe mask="████████">{p.insurance?.primary?.groupNumber}</DemoSafe>} />
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
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>💊 Preferred Pharmacy</div>
              <div className="athena-field-grid">
                {editing ? (
                  <EField label="Pharmacy Name / Address" field="preferredPharmacy" span />
                ) : (
                  <Field label="Pharmacy Name / Address" value={p.preferredPharmacy} />
                )}
                {editing ? (
                  <EField label="Phone" field="preferredPharmacyPhone" />
                ) : (
                  <Field label="Phone" value={p.preferredPharmacyPhone} />
                )}
                {editing ? (
                  <EField label="Fax" field="preferredPharmacyFax" />
                ) : (
                  <Field label="Fax" value={p.preferredPharmacyFax} />
                )}
              </div>
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
