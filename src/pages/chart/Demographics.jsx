import React, { useState } from 'react';
import { usePatient } from '../../contexts/PatientContext';

export default function Demographics({ patientId }) {
  const { selectedPatient, updatePatient } = usePatient();
  const [editing, setEditing] = useState(null); // 'contact' | 'emergency' | 'insurance'
  const [draft, setDraft] = useState({});
  const [saved, setSaved] = useState(false);

  if (!selectedPatient) return null;
  const p = selectedPatient;

  const Field = ({ label, value }) => (
    <div className="athena-field">
      <div className="athena-field-label">{label}</div>
      <div className="athena-field-value">{value || '—'}</div>
    </div>
  );

  const startEdit = (section) => {
    if (section === 'contact') {
      setDraft({
        phone: p.phone || '',
        cellPhone: p.cellPhone || '',
        email: p.email || '',
        street: p.address?.street || '',
        city: p.address?.city || '',
        state: p.address?.state || '',
        zip: p.address?.zip || '',
      });
    } else if (section === 'emergency') {
      setDraft({
        ecName: p.emergencyContact?.name || '',
        ecRelationship: p.emergencyContact?.relationship || '',
        ecPhone: p.emergencyContact?.phone || '',
      });
    } else if (section === 'insurance') {
      setDraft({
        insName: p.insurance?.primary?.name || '',
        insMemberId: p.insurance?.primary?.memberId || '',
        insGroup: p.insurance?.primary?.groupNumber || '',
        insCopay: p.insurance?.primary?.copay || '',
      });
    }
    setEditing(section);
    setSaved(false);
  };

  const cancelEdit = () => { setEditing(null); setDraft({}); };

  const saveEdit = () => {
    if (editing === 'contact') {
      updatePatient(patientId, {
        phone: draft.phone,
        cellPhone: draft.cellPhone,
        email: draft.email,
        address: { ...p.address, street: draft.street, city: draft.city, state: draft.state, zip: draft.zip },
      });
    } else if (editing === 'emergency') {
      updatePatient(patientId, {
        emergencyContact: { ...p.emergencyContact, name: draft.ecName, relationship: draft.ecRelationship, phone: draft.ecPhone },
      });
    } else if (editing === 'insurance') {
      updatePatient(patientId, {
        insurance: {
          ...p.insurance,
          primary: { ...p.insurance.primary, name: draft.insName, memberId: draft.insMemberId, groupNumber: draft.insGroup, copay: draft.insCopay },
        },
      });
    }
    setSaved(true);
    setEditing(null);
    setDraft({});
  };

  const inp = (key, placeholder, type = 'text') => (
    <input
      type={type}
      className="form-input"
      style={{ fontSize: 12 }}
      value={draft[key] || ''}
      placeholder={placeholder}
      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
    />
  );

  const EditBar = ({ section }) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
      {editing === section ? (
        <>
          <button className="btn btn-sm btn-primary" onClick={saveEdit}>💾 Save</button>
          <button className="btn btn-sm btn-secondary" onClick={cancelEdit}>Cancel</button>
        </>
      ) : (
        <button className="btn btn-sm btn-secondary" style={{ fontSize: 11 }} onClick={() => startEdit(section)}>✏️ Edit</button>
      )}
    </div>
  );

  return (
    <div className="athena-demographics">
      {saved && (
        <div style={{ marginBottom: 12, padding: '8px 14px', background: '#dcfce7', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#166534' }}>
          ✅ Demographics updated successfully.
        </div>
      )}

      <div className="athena-summary-row-2">
        {/* Personal Information — read-only (DOB, MRN, SSN are system fields) */}
        <div className="athena-panel">
          <div className="athena-panel-header">
            <div className="athena-panel-title"><span className="athena-panel-icon">👤</span>Personal Information</div>
          </div>
          <div className="athena-panel-body">
            <div className="athena-field-grid">
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
            </div>
          </div>
        </div>

        {/* Contact Information — editable */}
        <div className="athena-panel">
          <div className="athena-panel-header">
            <div className="athena-panel-title"><span className="athena-panel-icon">📞</span>Contact Information</div>
            <EditBar section="contact" />
          </div>
          <div className="athena-panel-body">
            {editing === 'contact' ? (
              <div className="athena-field-grid">
                <div className="athena-field"><div className="athena-field-label">Home Phone</div>{inp('phone', '(555) 000-0000', 'tel')}</div>
                <div className="athena-field"><div className="athena-field-label">Cell Phone</div>{inp('cellPhone', '(555) 000-0000', 'tel')}</div>
                <div className="athena-field"><div className="athena-field-label">Email</div>{inp('email', 'email@example.com', 'email')}</div>
                <div className="athena-field"><div className="athena-field-label">Street</div>{inp('street', '123 Main St')}</div>
                <div className="athena-field"><div className="athena-field-label">City</div>{inp('city', 'Chicago')}</div>
                <div className="athena-field"><div className="athena-field-label">State</div>{inp('state', 'IL')}</div>
                <div className="athena-field"><div className="athena-field-label">ZIP</div>{inp('zip', '60601')}</div>
              </div>
            ) : (
              <div className="athena-field-grid">
                <Field label="Home Phone" value={p.phone} />
                <Field label="Cell Phone" value={p.cellPhone} />
                <Field label="Email" value={p.email} />
                <Field label="Address" value={p.address ? `${p.address.street}, ${p.address.city}, ${p.address.state} ${p.address.zip}` : '—'} />
              </div>
            )}

            <div className="athena-section-divider">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="athena-section-label">🆘 Emergency Contact</div>
                <EditBar section="emergency" />
              </div>
              {editing === 'emergency' ? (
                <div className="athena-field-grid" style={{ marginTop: 8 }}>
                  <div className="athena-field"><div className="athena-field-label">Name</div>{inp('ecName', 'Full name')}</div>
                  <div className="athena-field"><div className="athena-field-label">Relationship</div>{inp('ecRelationship', 'Spouse, Parent…')}</div>
                  <div className="athena-field"><div className="athena-field-label">Phone</div>{inp('ecPhone', '(555) 000-0000', 'tel')}</div>
                </div>
              ) : (
                <div className="athena-field-grid">
                  <Field label="Name" value={p.emergencyContact?.name} />
                  <Field label="Relationship" value={p.emergencyContact?.relationship} />
                  <Field label="Phone" value={p.emergencyContact?.phone} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="athena-summary-row-2" style={{ marginTop: 16 }}>
        {/* Insurance — editable */}
        <div className="athena-panel">
          <div className="athena-panel-header">
            <div className="athena-panel-title"><span className="athena-panel-icon">🏥</span>Insurance Information</div>
            <EditBar section="insurance" />
          </div>
          <div className="athena-panel-body">
            <div className="athena-insurance-label">Primary Insurance</div>
            {editing === 'insurance' ? (
              <div className="athena-field-grid">
                <div className="athena-field"><div className="athena-field-label">Plan Name</div>{inp('insName', 'BlueCross PPO')}</div>
                <div className="athena-field"><div className="athena-field-label">Member ID</div>{inp('insMemberId', 'BCB123456')}</div>
                <div className="athena-field"><div className="athena-field-label">Group Number</div>{inp('insGroup', 'GRP-001')}</div>
                <div className="athena-field"><div className="athena-field-label">Copay ($)</div>{inp('insCopay', '30', 'number')}</div>
              </div>
            ) : (
              <div className="athena-field-grid">
                <Field label="Plan" value={p.insurance?.primary?.name} />
                <Field label="Member ID" value={p.insurance?.primary?.memberId} />
                <Field label="Group Number" value={p.insurance?.primary?.groupNumber} />
                <Field label="Copay" value={p.insurance?.primary?.copay != null ? `$${p.insurance.primary.copay}` : '—'} />
              </div>
            )}

            {p.insurance?.secondary && (
              <div className="athena-section-divider">
                <div className="athena-insurance-label secondary">Secondary Insurance</div>
                <div className="athena-field-grid">
                  <Field label="Plan" value={p.insurance.secondary.name} />
                  <Field label="Member ID" value={p.insurance.secondary.memberId} />
                  {p.insurance.secondary.groupNumber && <Field label="Group Number" value={p.insurance.secondary.groupNumber} />}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Care Team */}
        <div className="athena-panel">
          <div className="athena-panel-header">
            <div className="athena-panel-title"><span className="athena-panel-icon">👨‍⚕️</span>Care Team</div>
          </div>
          <div className="athena-panel-body">
            <div className="athena-field-grid">
              <Field label="Primary Care Provider" value={p.pcp} />
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
