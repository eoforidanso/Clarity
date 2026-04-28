import React from 'react';
import { usePatient } from '../../contexts/PatientContext';

export default function Demographics({ patientId }) {
  const { selectedPatient } = usePatient();
  if (!selectedPatient) return null;
  const p = selectedPatient;

  const Field = ({ label, value }) => (
    <div className="athena-field">
      <div className="athena-field-label">{label}</div>
      <div className="athena-field-value">{value || '—'}</div>
    </div>
  );

  return (
    <div className="athena-demographics">
      <div className="athena-summary-row-2">
        {/* Personal Information */}
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

        {/* Contact Information */}
        <div className="athena-panel">
          <div className="athena-panel-header">
            <div className="athena-panel-title"><span className="athena-panel-icon">📞</span>Contact Information</div>
          </div>
          <div className="athena-panel-body">
            <div className="athena-field-grid">
              <Field label="Home Phone" value={p.phone} />
              <Field label="Cell Phone" value={p.cellPhone} />
              <Field label="Email" value={p.email} />
              <Field label="Address" value={`${p.address.street}, ${p.address.city}, ${p.address.state} ${p.address.zip}`} />
            </div>

            <div className="athena-section-divider">
              <div className="athena-section-label">🆘 Emergency Contact</div>
              <div className="athena-field-grid">
                <Field label="Name" value={p.emergencyContact.name} />
                <Field label="Relationship" value={p.emergencyContact.relationship} />
                <Field label="Phone" value={p.emergencyContact.phone} />
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
              <Field label="Plan" value={p.insurance.primary.name} />
              <Field label="Member ID" value={p.insurance.primary.memberId} />
              <Field label="Group Number" value={p.insurance.primary.groupNumber} />
              <Field label="Copay" value={`$${p.insurance.primary.copay}`} />
            </div>

            {p.insurance.secondary && (
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

            {p.flags.length > 0 && (
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
