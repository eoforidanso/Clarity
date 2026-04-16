import React, { useState } from 'react';
import { documents as docsApi } from '../services/api';

/**
 * DocumentViewer — Renders structured document data as a printable page
 * Supports: progress_note, prescription, patient_summary, discharge_summary
 */

const PRINT_STYLES = `
@media print {
  body * { visibility: hidden; }
  .document-print-area, .document-print-area * { visibility: visible; }
  .document-print-area { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
}
`;

function SectionHeader({ title }) {
  return (
    <div style={{ borderBottom: '2px solid #1e40af', marginBottom: 8, marginTop: 20 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
        {title}
      </h3>
    </div>
  );
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 4, fontSize: 12 }}>
      <strong style={{ color: '#374151' }}>{label}:</strong>{' '}
      <span style={{ color: '#1f2937', whiteSpace: 'pre-wrap' }}>{value}</span>
    </div>
  );
}

function DocumentHeader({ doc }) {
  return (
    <div style={{ borderBottom: '3px solid #1e40af', paddingBottom: 12, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e40af', margin: 0 }}>🧠 Clarity EHR</h1>
          <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>{doc.facility?.name}</p>
          <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>{doc.facility?.address}</p>
          {doc.facility?.phone && <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>Tel: {doc.facility.phone} {doc.facility?.fax ? `| Fax: ${doc.facility.fax}` : ''}</p>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{doc.title}</h2>
          <p style={{ fontSize: 10, color: '#6b7280', margin: '4px 0 0' }}>Generated: {new Date(doc.generatedAt).toLocaleString()}</p>
          <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>By: {doc.generatedBy}</p>
        </div>
      </div>
    </div>
  );
}

function PatientInfoBar({ patient }) {
  if (!patient) return null;
  return (
    <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '8px 12px', marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12 }}>
      <Field label="Patient" value={patient.name} />
      <Field label="MRN" value={patient.mrn} />
      <Field label="DOB" value={patient.dob} />
      <Field label="Gender" value={patient.gender} />
      <Field label="Phone" value={patient.phone} />
      <Field label="Insurance" value={patient.insurance} />
    </div>
  );
}

function ProgressNoteDocument({ doc }) {
  const { sections } = doc;
  return (
    <>
      <div style={{ display: 'flex', gap: 24, marginBottom: 12, fontSize: 12 }}>
        <Field label="Date" value={doc.encounter?.date} />
        <Field label="Visit Type" value={doc.encounter?.visitType} />
        <Field label="Duration" value={doc.encounter?.duration} />
        <Field label="CPT" value={doc.encounter?.cptCode} />
        <Field label="ICD-10" value={doc.encounter?.icdCode} />
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 12, fontSize: 12 }}>
        <Field label="Provider" value={`${doc.provider?.name}, ${doc.provider?.credentials}`} />
        <Field label="NPI" value={doc.provider?.npi} />
        <Field label="Specialty" value={doc.provider?.specialty} />
      </div>

      {sections.chiefComplaint && <><SectionHeader title="Chief Complaint" /><p style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{sections.chiefComplaint}</p></>}
      {sections.hpi && <><SectionHeader title="History of Present Illness" /><p style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{sections.hpi}</p></>}
      {sections.intervalNote && <><SectionHeader title="Interval Note" /><p style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{sections.intervalNote}</p></>}
      {sections.mentalStatusExam && <><SectionHeader title="Mental Status Examination" /><p style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{sections.mentalStatusExam}</p></>}

      {doc.vitals && (
        <>
          <SectionHeader title="Vitals" />
          <div style={{ display: 'flex', gap: 16, fontSize: 12, flexWrap: 'wrap' }}>
            <Field label="BP" value={doc.vitals.bp} />
            <Field label="HR" value={doc.vitals.hr} />
            <Field label="Temp" value={doc.vitals.temp} />
            <Field label="Weight" value={doc.vitals.weight} />
            <Field label="BMI" value={doc.vitals.bmi} />
          </div>
        </>
      )}

      {doc.assessmentScores?.length > 0 && (
        <>
          <SectionHeader title="Assessment Scores" />
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f3f4f6' }}><th style={{ padding: '4px 8px', textAlign: 'left' }}>Tool</th><th style={{ padding: '4px 8px', textAlign: 'left' }}>Score</th><th style={{ padding: '4px 8px', textAlign: 'left' }}>Interpretation</th></tr></thead>
            <tbody>{doc.assessmentScores.map((a, i) => <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}><td style={{ padding: '4px 8px' }}>{a.tool}</td><td style={{ padding: '4px 8px' }}>{a.score}</td><td style={{ padding: '4px 8px' }}>{a.interpretation}</td></tr>)}</tbody>
          </table>
        </>
      )}

      {sections.assessment && <><SectionHeader title="Assessment" /><p style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{sections.assessment}</p></>}
      {sections.plan && <><SectionHeader title="Plan" /><p style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{sections.plan}</p></>}

      <SectionHeader title="Safety Assessment" />
      <div style={{ fontSize: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Field label="SI" value={sections.safety?.siLevel} />
        <Field label="HI" value={sections.safety?.hiLevel} />
        {sections.safety?.safetyPlanUpdated && <span style={{ color: '#059669' }}>✅ Safety Plan Updated</span>}
        {sections.safety?.crisisResources && <span style={{ color: '#059669' }}>✅ Crisis Resources Provided</span>}
      </div>
      {sections.safety?.notes && <p style={{ fontSize: 11, color: '#374151', marginTop: 4 }}>{sections.safety.notes}</p>}

      <Field label="Follow-up" value={sections.followUp} />
      <Field label="Disposition" value={sections.disposition} />

      {doc.activeMedications?.length > 0 && (
        <>
          <SectionHeader title="Active Medications" />
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f3f4f6' }}><th style={{ padding: '4px 8px', textAlign: 'left' }}>Medication</th><th style={{ padding: '4px 8px', textAlign: 'left' }}>Dose</th><th style={{ padding: '4px 8px', textAlign: 'left' }}>Frequency</th></tr></thead>
            <tbody>{doc.activeMedications.map((m, i) => <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}><td style={{ padding: '4px 8px' }}>{m.name}</td><td style={{ padding: '4px 8px' }}>{m.dose}</td><td style={{ padding: '4px 8px' }}>{m.frequency}</td></tr>)}</tbody>
          </table>
        </>
      )}

      {doc.allergies?.length > 0 && (
        <>
          <SectionHeader title="Allergies" />
          <ul style={{ fontSize: 11, margin: 0, paddingLeft: 20 }}>
            {doc.allergies.map((a, i) => <li key={i}><strong>{a.allergen}</strong> — {a.reaction} ({a.severity})</li>)}
          </ul>
        </>
      )}
    </>
  );
}

function PrescriptionDocument({ doc }) {
  return (
    <>
      <div style={{ display: 'flex', gap: 24, marginBottom: 12, fontSize: 12 }}>
        <Field label="Prescriber" value={`${doc.prescriber?.name}, ${doc.prescriber?.credentials}`} />
        <Field label="NPI" value={doc.prescriber?.npi} />
        <Field label="DEA" value={doc.prescriber?.dea} />
      </div>

      {doc.medication?.isControlled && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#991b1b' }}>
          ⚠️ <strong>CONTROLLED SUBSTANCE — {doc.medication.schedule}</strong>
        </div>
      )}

      <SectionHeader title="Medication" />
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>{doc.medication?.name}</h3>
        <Field label="Dose" value={doc.medication?.dose} />
        <Field label="Route" value={doc.medication?.route} />
        <Field label="Frequency" value={doc.medication?.frequency} />
        <Field label="Sig" value={doc.medication?.sig} />
        <Field label="Pharmacy" value={doc.medication?.pharmacy} />
      </div>

      <SectionHeader title="Dispensing" />
      <div style={{ display: 'flex', gap: 24, fontSize: 12, flexWrap: 'wrap' }}>
        <Field label="Quantity" value={`${doc.dispense?.quantity} ${doc.dispense?.unit}`} />
        <Field label="Days Supply" value={doc.dispense?.daysSupply} />
        <Field label="Refills" value={doc.dispense?.refills} />
        <Field label="Substitution" value={doc.dispense?.substitutionAllowed ? 'Permitted' : 'Dispense as Written'} />
      </div>

      <Field label="Allergies" value={doc.allergies} />
    </>
  );
}

function PatientSummaryDocument({ doc }) {
  return (
    <>
      {doc.activeProblems?.length > 0 && (
        <>
          <SectionHeader title="Active Problems" />
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f3f4f6' }}><th style={{ padding: '4px 8px', textAlign: 'left' }}>ICD-10</th><th style={{ padding: '4px 8px', textAlign: 'left' }}>Description</th><th style={{ padding: '4px 8px', textAlign: 'left' }}>Onset</th></tr></thead>
            <tbody>{doc.activeProblems.map((p, i) => <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}><td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{p.code}</td><td style={{ padding: '4px 8px' }}>{p.description}</td><td style={{ padding: '4px 8px' }}>{p.onset}</td></tr>)}</tbody>
          </table>
        </>
      )}

      {doc.activeMedications?.length > 0 && (
        <>
          <SectionHeader title="Active Medications" />
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f3f4f6' }}><th style={{ padding: '4px 8px', textAlign: 'left' }}>Medication</th><th style={{ padding: '4px 8px', textAlign: 'left' }}>Dose</th><th style={{ padding: '4px 8px', textAlign: 'left' }}>Frequency</th><th style={{ padding: '4px 8px', textAlign: 'left' }}>Prescriber</th></tr></thead>
            <tbody>{doc.activeMedications.map((m, i) => <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}><td style={{ padding: '4px 8px' }}>{m.name}</td><td style={{ padding: '4px 8px' }}>{m.dose}</td><td style={{ padding: '4px 8px' }}>{m.frequency}</td><td style={{ padding: '4px 8px' }}>{m.prescriber}</td></tr>)}</tbody>
          </table>
        </>
      )}

      {doc.allergies?.length > 0 && (
        <>
          <SectionHeader title="Allergies" />
          <ul style={{ fontSize: 11, margin: 0, paddingLeft: 20 }}>
            {doc.allergies.map((a, i) => <li key={i}><strong>{a.allergen}</strong> ({a.type}) — {a.reaction}, {a.severity}</li>)}
          </ul>
        </>
      )}

      {doc.recentVitals?.length > 0 && (
        <>
          <SectionHeader title="Recent Vitals" />
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f3f4f6' }}><th style={{ padding: '4px 8px' }}>Date</th><th style={{ padding: '4px 8px' }}>BP</th><th style={{ padding: '4px 8px' }}>HR</th><th style={{ padding: '4px 8px' }}>Weight</th><th style={{ padding: '4px 8px' }}>BMI</th></tr></thead>
            <tbody>{doc.recentVitals.map((v, i) => <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}><td style={{ padding: '4px 8px' }}>{v.date}</td><td style={{ padding: '4px 8px' }}>{v.bp}</td><td style={{ padding: '4px 8px' }}>{v.hr}</td><td style={{ padding: '4px 8px' }}>{v.weight}</td><td style={{ padding: '4px 8px' }}>{v.bmi}</td></tr>)}</tbody>
          </table>
        </>
      )}

      {doc.assessmentScores?.length > 0 && (
        <>
          <SectionHeader title="Assessment Scores" />
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f3f4f6' }}><th style={{ padding: '4px 8px' }}>Date</th><th style={{ padding: '4px 8px' }}>Tool</th><th style={{ padding: '4px 8px' }}>Score</th><th style={{ padding: '4px 8px' }}>Interpretation</th></tr></thead>
            <tbody>{doc.assessmentScores.map((a, i) => <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}><td style={{ padding: '4px 8px' }}>{a.date}</td><td style={{ padding: '4px 8px' }}>{a.tool}</td><td style={{ padding: '4px 8px' }}>{a.score}</td><td style={{ padding: '4px 8px' }}>{a.interpretation}</td></tr>)}</tbody>
          </table>
        </>
      )}

      {doc.immunizations?.length > 0 && (
        <>
          <SectionHeader title="Immunizations" />
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f3f4f6' }}><th style={{ padding: '4px 8px' }}>Vaccine</th><th style={{ padding: '4px 8px' }}>Date</th><th style={{ padding: '4px 8px' }}>Next Due</th></tr></thead>
            <tbody>{doc.immunizations.map((i, idx) => <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}><td style={{ padding: '4px 8px' }}>{i.vaccine}</td><td style={{ padding: '4px 8px' }}>{i.date}</td><td style={{ padding: '4px 8px' }}>{i.nextDue}</td></tr>)}</tbody>
          </table>
        </>
      )}

      {doc.recentEncounters?.length > 0 && (
        <>
          <SectionHeader title="Recent Encounters" />
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f3f4f6' }}><th style={{ padding: '4px 8px' }}>Date</th><th style={{ padding: '4px 8px' }}>Type</th><th style={{ padding: '4px 8px' }}>Provider</th><th style={{ padding: '4px 8px' }}>Assessment</th></tr></thead>
            <tbody>{doc.recentEncounters.map((e, i) => <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}><td style={{ padding: '4px 8px' }}>{e.date}</td><td style={{ padding: '4px 8px' }}>{e.visitType}</td><td style={{ padding: '4px 8px' }}>{e.provider}</td><td style={{ padding: '4px 8px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.assessment}</td></tr>)}</tbody>
          </table>
        </>
      )}
    </>
  );
}

function SignatureBlock({ signature }) {
  if (!signature) return null;
  return (
    <div style={{ marginTop: 32, borderTop: '1px solid #d1d5db', paddingTop: 16 }}>
      <p style={{ fontSize: 12, fontStyle: 'italic', color: '#374151' }}>{signature.line}</p>
      <p style={{ fontSize: 10, color: '#6b7280' }}>Date: {new Date(signature.date).toLocaleString()}</p>
      {signature.npi && <p style={{ fontSize: 10, color: '#6b7280' }}>NPI: {signature.npi}</p>}
      {signature.dea && <p style={{ fontSize: 10, color: '#6b7280' }}>DEA: {signature.dea}</p>}
      <p style={{ fontSize: 9, color: '#9ca3af', marginTop: 8 }}>
        This document was electronically generated by Clarity EHR. The electronic signature above constitutes a valid signature under applicable law.
      </p>
    </div>
  );
}

/**
 * DocumentViewer component
 * 
 * Usage:
 *   <DocumentViewer type="progress_note" encounterId="enc-1" patientId="p1" />
 *   <DocumentViewer type="prescription" medicationId="m1" patientId="p1" />
 *   <DocumentViewer type="patient_summary" patientId="p1" />
 */
export default function DocumentViewer({ type, patientId, encounterId, medicationId, onClose }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      let result;
      switch (type) {
        case 'progress_note':
          result = await docsApi.progressNote(encounterId, patientId);
          break;
        case 'prescription':
          result = await docsApi.prescription(medicationId, patientId);
          break;
        case 'patient_summary':
          result = await docsApi.patientSummary(patientId);
          break;
        case 'discharge_summary':
          result = await docsApi.dischargeSummary({ patientId, encounterId });
          break;
        default:
          throw new Error(`Unknown document type: ${type}`);
      }
      setDoc(result);
    } catch (err) {
      setError(err.message || 'Failed to generate document');
    }
    setLoading(false);
  };

  const handlePrint = () => window.print();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
      <style>{PRINT_STYLES}</style>
      <div style={{ background: '#fff', borderRadius: 12, width: '90%', maxWidth: 800, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        {/* Toolbar */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>📄 Document Viewer</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {!doc && <button className="btn btn-primary btn-sm" onClick={generate} disabled={loading}>{loading ? '⏳ Generating…' : '📄 Generate Document'}</button>}
            {doc && <button className="btn btn-primary btn-sm" onClick={handlePrint}>🖨️ Print / Save PDF</button>}
            {onClose && <button className="btn btn-secondary btn-sm" onClick={onClose}>✕ Close</button>}
          </div>
        </div>

        {/* Content */}
        <div className="document-print-area" style={{ padding: '24px 32px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
          {error && <div className="alert alert-danger">{error}</div>}
          {!doc && !loading && !error && (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
              <p style={{ fontSize: 48 }}>📄</p>
              <p>Click "Generate Document" to create the {type?.replace(/_/g, ' ')}</p>
            </div>
          )}
          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
              <p>⏳ Generating document…</p>
            </div>
          )}
          {doc && (
            <>
              <DocumentHeader doc={doc} />
              <PatientInfoBar patient={doc.patient} />
              {doc.type === 'progress_note' && <ProgressNoteDocument doc={doc} />}
              {doc.type === 'prescription' && <PrescriptionDocument doc={doc} />}
              {(doc.type === 'patient_summary' || doc.type === 'discharge_summary') && <PatientSummaryDocument doc={doc} />}
              <SignatureBlock signature={doc.signature} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
