import React from "react";

export function PrescriptionPreview({ prescription }) {
  const {
    medicationName,
    brandName,
    strength,
    sig,
    daw,
    quantity,
    refills,
    patient,
    diagnosis,
    safety,
    pharmacy,
    prescriber,
    clinic,
    clinicalNotes,
    signedAt,
    sendDate,
  } = prescription;

  const today = new Date().toISOString().split('T')[0];
  const isPostDated = sendDate && sendDate !== today;
  const sendDateLabel = sendDate
    ? new Date(sendDate + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Today';

  return (
    <div className="rx-card">
      {/* Header */}
      <div className="rx-card__header">
        <div>
          <div className="rx-pill-label">Prescription Preview</div>
          <h2 className="rx-med-name">
            {medicationName} {strength}
          </h2>
          {brandName && <div className="rx-med-subtitle">{brandName}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div className="rx-chip rx-chip--status">Ready to Send</div>
          <div style={{ fontSize: 11, color: isPostDated ? '#f59e0b' : '#64748b', fontWeight: isPostDated ? 700 : 400 }}>
            {isPostDated ? `📅 Post-dated: ${sendDateLabel}` : `📅 Send: ${sendDateLabel}`}
          </div>
        </div>
      </div>

      {/* Medication */}
      <section className="rx-section">
        <h3 className="rx-section__title">Medication</h3>
        <div className="rx-grid rx-grid--2">
          <div>
            <div className="rx-label">SIG</div>
            <div className="rx-value">{sig}</div>
          </div>
          <div>
            <div className="rx-label">Qty / Refills</div>
            <div className="rx-value">{quantity} / {refills}</div>
          </div>
          <div>
            <div className="rx-label">Dispense as Written</div>
            <div className="rx-value">{daw ? "Yes — No substitutions" : "No"}</div>
          </div>
        </div>
      </section>

      {/* Patient */}
      {patient && (
        <section className="rx-section">
          <h3 className="rx-section__title">Patient</h3>
          <div className="rx-grid rx-grid--2">
            <div>
              <div className="rx-label">Name</div>
              <div className="rx-value">{patient.lastName}, {patient.firstName}</div>
            </div>
            <div>
              <div className="rx-label">DOB / Sex</div>
              <div className="rx-value">{patient.dob} · {patient.sex || patient.gender || '—'}</div>
            </div>
            <div>
              <div className="rx-label">MRN</div>
              <div className="rx-value">{patient.mrn}</div>
            </div>
          </div>
        </section>
      )}

      {/* Diagnosis */}
      {diagnosis && (
        <section className="rx-section">
          <h3 className="rx-section__title">Diagnosis</h3>
          <div className="rx-value">
            <strong>{diagnosis.code}</strong>{diagnosis.description ? ` — ${diagnosis.description}` : ''}
          </div>
        </section>
      )}

      {/* Safety */}
      {safety && (
        <section className="rx-section">
          <h3 className="rx-section__title">Safety & Clinical Checks</h3>
          <div className="rx-safety-grid">
            {safety.allergies       && <div><div className="rx-label">Allergies</div><div className="rx-value">{safety.allergies}</div></div>}
            {safety.interactions    && <div><div className="rx-label">Interactions</div><div className="rx-value">{safety.interactions}</div></div>}
            {safety.duplicateTherapy && <div><div className="rx-label">Duplicate therapy</div><div className="rx-value">{safety.duplicateTherapy}</div></div>}
            {safety.age             && <div><div className="rx-label">Age considerations</div><div className="rx-value">{safety.age}</div></div>}
            {safety.blackBox        && <div><div className="rx-label">Black‑box warnings</div><div className="rx-value rx-value--warning">{safety.blackBox}</div></div>}
          </div>
        </section>
      )}

      {/* Pharmacy */}
      {pharmacy && (
        <section className="rx-section">
          <h3 className="rx-section__title">Pharmacy Routing</h3>
          <div className="rx-grid rx-grid--2">
            <div>
              <div className="rx-label">Pharmacy</div>
              <div className="rx-value">{pharmacy.name}</div>
            </div>
            <div>
              <div className="rx-label">Method / Status</div>
              <div className="rx-value">{pharmacy.method} · {pharmacy.status}</div>
            </div>
          </div>
        </section>
      )}

      {/* Clinic */}
      {clinic && (
        <section className="rx-section">
          <h3 className="rx-section__title">Clinic</h3>
          <div className="rx-grid rx-grid--2">
            <div>
              <div className="rx-label">Name</div>
              <div className="rx-value">{clinic.name}</div>
            </div>
            {clinic.phone && (
              <div>
                <div className="rx-label">Phone</div>
                <div className="rx-value">{clinic.phone}</div>
              </div>
            )}
            {clinic.address && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="rx-label">Address</div>
                <div className="rx-value">{clinic.address}</div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Prescriber */}
      {prescriber && (
        <section className="rx-section">
          <h3 className="rx-section__title">Prescriber</h3>
          <div className="rx-grid rx-grid--2">
            <div>
              <div className="rx-label">Name</div>
              <div className="rx-value">{prescriber.name}</div>
            </div>
            <div>
              <div className="rx-label">NPI / DEA</div>
              <div className="rx-value">NPI: {prescriber.npi} · DEA: {prescriber.dea}</div>
            </div>
            {signedAt && (
              <div>
                <div className="rx-label">Electronically signed</div>
                <div className="rx-value">{signedAt}</div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Clinical Notes */}
      {clinicalNotes && (
        <section className="rx-section">
          <h3 className="rx-section__title">Clinical Notes</h3>
          <div className="rx-notes">{clinicalNotes}</div>
        </section>
      )}
    </div>
  );
}
