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
    clinicalNotes,
    signedAt,
  } = prescription;

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 14,
      overflow: 'hidden',
      marginTop: 20,
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
            📋 Prescription Preview
          </div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff' }}>
            {medicationName} {strength}
          </h2>
          {brandName && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{brandName}</div>}
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 20,
          padding: '4px 12px',
          fontSize: 11,
          fontWeight: 700,
          color: '#fff',
        }}>
          Ready to Send
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Medication */}
        <Section title="Medication">
          <Grid>
            <Field label="SIG" value={sig} />
            <Field label="Qty / Refills" value={`${quantity} / ${refills}`} />
            <Field label="Dispense as Written" value={daw ? 'Yes — No substitutions' : 'No'} />
          </Grid>
        </Section>

        {/* Patient */}
        {patient && (
          <Section title="Patient">
            <Grid>
              <Field label="Name" value={`${patient.lastName}, ${patient.firstName}`} />
              <Field label="DOB / Sex" value={`${patient.dob} · ${patient.sex || patient.gender || '—'}`} />
              <Field label="MRN" value={patient.mrn} />
            </Grid>
          </Section>
        )}

        {/* Diagnosis */}
        {diagnosis && (
          <Section title="Diagnosis">
            <div style={{ fontSize: 14, color: '#0f172a' }}>
              <strong>{diagnosis.code}</strong>{diagnosis.description ? ` — ${diagnosis.description}` : ''}
            </div>
          </Section>
        )}

        {/* Safety */}
        {safety && (
          <Section title="Safety & Clinical Checks">
            <Grid cols={2}>
              {safety.allergies    && <Field label="Allergies"          value={safety.allergies} />}
              {safety.interactions && <Field label="Interactions"       value={safety.interactions} />}
              {safety.duplicateTherapy && <Field label="Duplicate therapy" value={safety.duplicateTherapy} />}
              {safety.age          && <Field label="Age considerations"  value={safety.age} />}
              {safety.blackBox     && <Field label="Black‑box warnings"  value={safety.blackBox} warn />}
            </Grid>
          </Section>
        )}

        {/* Pharmacy */}
        {pharmacy && (
          <Section title="Pharmacy Routing">
            <Grid>
              <Field label="Pharmacy" value={pharmacy.name} />
              <Field label="Method / Status" value={`${pharmacy.method || '—'} · ${pharmacy.status || '—'}`} />
            </Grid>
          </Section>
        )}

        {/* Prescriber */}
        {prescriber && (
          <Section title="Prescriber">
            <Grid>
              <Field label="Name"     value={prescriber.name} />
              <Field label="NPI / DEA" value={`NPI: ${prescriber.npi || '—'} · DEA: ${prescriber.dea || '—'}`} />
              {signedAt && <Field label="Electronically signed" value={signedAt} />}
            </Grid>
          </Section>
        )}

        {/* Clinical Notes */}
        {clinicalNotes && (
          <Section title="Clinical Notes">
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
              {clinicalNotes}
            </div>
          </Section>
        )}

      </div>
    </div>
  );
}

/* ── Sub-components ── */
function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#6b7280', borderBottom: '1px solid #f1f5f9', paddingBottom: 6, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Grid({ children, cols = 2 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '10px 24px' }}>
      {children}
    </div>
  );
}

function Field({ label, value, warn }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: warn ? '#dc2626' : '#0f172a' }}>{value || '—'}</div>
    </div>
  );
}
