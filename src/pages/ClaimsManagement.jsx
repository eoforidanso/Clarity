import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';
import { encounters as mockEncounters, encounterHistory } from '../data/mockData';

// ─── CPT Fee Schedule ───────────────────────────────────────────────────────
const CPT_FEE = {
  '99213': 120, '99214': 185, '99215': 250,
  '90792': 350, '96127': 30,
  '90837': 175, '90834': 140, '90832': 105, '90853': 120,
  '99202': 110, '99203': 145, '99204': 185, '99205': 230,
};
const CPT_DESC = {
  '99213': 'Office/Outpatient Visit, Low Complexity',
  '99214': 'Office/Outpatient Visit, Moderate Complexity',
  '99215': 'Office/Outpatient Visit, High Complexity',
  '90792': 'Psychiatric Diagnostic Evaluation w/ Medical Services',
  '96127': 'Brief Emotional/Behavioral Assessment',
  '90837': 'Psychotherapy, 60 minutes',
  '90834': 'Psychotherapy, 45 minutes',
  '90832': 'Psychotherapy, 30 minutes',
  '90853': 'Group Psychotherapy',
  '99202': 'Office/Outpatient New Patient, Straightforward',
  '99203': 'Office/Outpatient New Patient, Low Complexity',
  '99204': 'Office/Outpatient New Patient, Moderate Complexity',
  '99205': 'Office/Outpatient New Patient, High Complexity',
};

// ─── Seed Claims ─────────────────────────────────────────────────────────────
const SEED_CLAIMS = [
  {
    id: 'clm-001', claim_number: 'CLM-2026-001', encounterId: 'enc-hist-1',
    patientId: 'p1', first_name: 'James', last_name: 'Anderson', mrn: 'MRN-00001',
    service_date: '2026-03-12', provider_first_name: 'Elena', provider_last_name: 'Martinez, MD, PhD',
    cpt_codes: [{ code: '99214', description: CPT_DESC['99214'], charge: 185 }],
    icd_codes: ['F33.1'], diagnosis: 'Major depressive disorder, recurrent, moderate',
    insurance_name: 'Blue Cross Blue Shield', member_id: 'BCB123456789',
    total_charges: 185, insurance_payment: 140, patient_payment: 30, balance: 15,
    status: 'Paid', generated_date: '2026-03-13', submitted_date: '2026-03-14', paid_date: '2026-03-28',
  },
  {
    id: 'clm-002', claim_number: 'CLM-2026-002', encounterId: 'enc-hist-2',
    patientId: 'p1', first_name: 'James', last_name: 'Anderson', mrn: 'MRN-00001',
    service_date: '2026-02-14', provider_first_name: 'Elena', provider_last_name: 'Martinez, MD, PhD',
    cpt_codes: [{ code: '99214', description: CPT_DESC['99214'], charge: 185 }],
    icd_codes: ['F33.1'], diagnosis: 'Major depressive disorder, recurrent, moderate',
    insurance_name: 'Blue Cross Blue Shield', member_id: 'BCB123456789',
    total_charges: 185, insurance_payment: 140, patient_payment: 30, balance: 15,
    status: 'Paid', generated_date: '2026-02-15', submitted_date: '2026-02-16', paid_date: '2026-02-28',
  },
  {
    id: 'clm-003', claim_number: 'CLM-2026-003', encounterId: 'enc-hist-3',
    patientId: 'p2', first_name: 'Maria', last_name: 'Garcia', mrn: 'MRN-00002',
    service_date: '2026-03-25', provider_first_name: 'Elena', provider_last_name: 'Martinez, MD, PhD',
    cpt_codes: [{ code: '99215', description: CPT_DESC['99215'], charge: 250 }],
    icd_codes: ['F43.10'], diagnosis: 'Post-traumatic stress disorder',
    insurance_name: 'Aetna', member_id: 'AET987654321',
    total_charges: 250, insurance_payment: 210, patient_payment: 25, balance: 15,
    status: 'Paid', generated_date: '2026-03-26', submitted_date: '2026-03-27', paid_date: '2026-04-10',
  },
  {
    id: 'clm-004', claim_number: 'CLM-2026-004', encounterId: 'enc-hist-4',
    patientId: 'p4', first_name: 'Emily', last_name: 'Chen', mrn: 'MRN-00004',
    service_date: '2026-03-15', provider_first_name: 'Michael', provider_last_name: 'Johnson, PMHNP-BC',
    cpt_codes: [{ code: '99214', description: CPT_DESC['99214'], charge: 185 }],
    icd_codes: ['F90.0'], diagnosis: 'ADHD, predominantly inattentive type',
    insurance_name: 'Cigna', member_id: 'CIG321654987',
    total_charges: 185, insurance_payment: 155, patient_payment: 20, balance: 10,
    status: 'Processed', generated_date: '2026-03-16', submitted_date: '2026-03-17',
  },
  {
    id: 'clm-005', claim_number: 'CLM-2026-005', encounterId: 'enc-hist-5',
    patientId: 'p6', first_name: 'Aisha', last_name: 'Patel', mrn: 'MRN-00006',
    service_date: '2026-03-20', provider_first_name: 'Elena', provider_last_name: 'Martinez, MD, PhD',
    cpt_codes: [{ code: '99214', description: CPT_DESC['99214'], charge: 185 }],
    icd_codes: ['F31.32'], diagnosis: 'Bipolar disorder, current episode depressed, moderate',
    insurance_name: 'Anthem', member_id: 'ANT654987321',
    total_charges: 185, insurance_payment: 0, patient_payment: 0, balance: 185,
    status: 'Denied', generated_date: '2026-03-21', submitted_date: '2026-03-22',
    denial_reason: 'Prior authorization required. Submit PA request to Anthem before resubmission.',
  },
  {
    id: 'clm-006', claim_number: 'CLM-2025-006', encounterId: 'enc-p1-0',
    patientId: 'p1', first_name: 'James', last_name: 'Anderson', mrn: 'MRN-00001',
    service_date: '2025-11-03', provider_first_name: 'Dr. Chris', provider_last_name: 'L., MD, PhD',
    cpt_codes: [
      { code: '90792', description: CPT_DESC['90792'], charge: 350 },
      { code: '96127', description: CPT_DESC['96127'], charge: 30 },
    ],
    icd_codes: ['F33.1', 'F41.1'], diagnosis: 'MDD initial evaluation + Generalized Anxiety Disorder',
    insurance_name: 'Blue Cross Blue Shield', member_id: 'BCB123456789',
    total_charges: 380, insurance_payment: 320, patient_payment: 30, balance: 30,
    status: 'Submitted', generated_date: '2025-11-04', submitted_date: '2025-11-05',
  },
  {
    id: 'clm-007', claim_number: 'CLM-2026-007', encounterId: 'enc-therapy-p3-1',
    patientId: 'p3', first_name: 'David', last_name: 'Thompson', mrn: 'MRN-00003',
    service_date: '2026-04-01', provider_first_name: 'April', provider_last_name: 'T., LCSW',
    cpt_codes: [{ code: '90837', description: CPT_DESC['90837'], charge: 175 }],
    icd_codes: ['F11.20'], diagnosis: 'Opioid use disorder, uncomplicated',
    insurance_name: 'United Healthcare', member_id: 'UHC456789012',
    total_charges: 175, insurance_payment: 0, patient_payment: 0, balance: 175,
    status: 'Generated', generated_date: '2026-04-02',
  },
  {
    id: 'clm-008', claim_number: 'CLM-2026-008', encounterId: 'enc-therapy-p2-1',
    patientId: 'p2', first_name: 'Maria', last_name: 'Garcia', mrn: 'MRN-00002',
    service_date: '2026-04-09', provider_first_name: 'April', provider_last_name: 'T., LCSW',
    cpt_codes: [{ code: '90837', description: CPT_DESC['90837'], charge: 175 }],
    icd_codes: ['F43.10'], diagnosis: 'Post-traumatic stress disorder',
    insurance_name: 'Aetna', member_id: 'AET987654321',
    total_charges: 175, insurance_payment: 0, patient_payment: 0, balance: 175,
    status: 'Generated', generated_date: '2026-04-10',
  },
];

// ─── Build billable encounters per patient from mock data ────────────────────
function getBillableEncounters(patientId, billedEncounterIds) {
  const results = [];
  const histList = encounterHistory[patientId] || [];
  histList.forEach(enc => {
    if (billedEncounterIds.has(enc.id)) return;
    if (!enc.cptCode) return;
    results.push({
      id: enc.id,
      date: enc.date,
      label: enc.date + ' \u2014 ' + enc.visitType + ' (' + (enc.reason || '').slice(0, 40) + ')',
      providerName: (enc.provider || '') + (enc.credentials ? ', ' + enc.credentials : ''),
      cptCodes: [enc.cptCode],
      icdCode: enc.icdCode || '',
      diagnosis: enc.icdCode ? enc.icdCode.split(' - ').slice(1).join(' - ') : '',
    });
  });
  const detailedList = mockEncounters[patientId] || [];
  detailedList.forEach(enc => {
    if (billedEncounterIds.has(enc.id)) return;
    if (enc.status !== 'Completed') return;
    if (!enc.cptCodes || enc.cptCodes.length === 0) return;
    results.push({
      id: enc.id,
      date: enc.date,
      label: enc.date + ' \u2014 ' + enc.type,
      providerName: enc.providerName || '',
      cptCodes: enc.cptCodes,
      icdCode: '',
      diagnosis: '',
    });
  });
  return results;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt$ = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);

const STATUS_STYLE = {
  Generated: { bg: '#6b7280', color: '#fff' },
  Submitted: { bg: '#3b82f6', color: '#fff' },
  Processed: { bg: '#f59e0b', color: '#fff' },
  Paid:      { bg: '#10b981', color: '#fff' },
  Denied:    { bg: '#ef4444', color: '#fff' },
  Appealed:  { bg: '#8b5cf6', color: '#fff' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Generated;
  return (
    <span style={{ backgroundColor: s.bg, color: s.color, padding: '3px 9px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
      {status}
    </span>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px',
      borderLeft: '4px solid ' + accent, flex: '1 1 140px', minWidth: 130 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Claim Detail Modal ───────────────────────────────────────────────────────
function ClaimDetailModal({ claim, onClose }) {
  if (!claim) return null;
  const totalPaid = claim.insurance_payment + claim.patient_payment;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 680, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>📋 Claim {claim.claim_number}</h3>
            <div style={{ marginTop: 6 }}><StatusBadge status={claim.status} /></div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Patient</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{claim.first_name} {claim.last_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>MRN: {claim.mrn}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Insurance</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{claim.insurance_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Member ID: {claim.member_id}</div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Service Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Service Date: </span>
                <strong>{new Date(claim.service_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>
              </div>
              <div><span style={{ color: 'var(--text-muted)' }}>Provider: </span>
                <strong>{claim.provider_first_name} {claim.provider_last_name}</strong>
              </div>
              {claim.icd_codes && claim.icd_codes.length > 0 && (
                <div style={{ gridColumn: '1/-1' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Diagnosis Codes: </span>
                  <strong>{claim.icd_codes.join(', ')}</strong>
                  {claim.diagnosis && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> — {claim.diagnosis}</span>}
                </div>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Procedure Codes</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>CPT Code</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Description</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>Charge</th>
                </tr>
              </thead>
              <tbody>
                {claim.cpt_codes.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: 'monospace' }}>{c.code}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{c.description}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{fmt$(c.charge)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Financial Summary</div>
            <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              {[
                ['Total Charges', fmt$(claim.total_charges), '#1e293b'],
                ['Insurance Payment', fmt$(claim.insurance_payment), '#10b981'],
                ['Patient Payment', fmt$(claim.patient_payment), '#10b981'],
                ['Total Collected', fmt$(totalPaid), '#10b981'],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 700, color }}>{val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Balance Due</span>
                <span style={{ fontWeight: 800, fontSize: 15, color: claim.balance > 0 ? '#ef4444' : '#10b981' }}>{fmt$(claim.balance)}</span>
              </div>
            </div>
          </div>

          {claim.denial_reason && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 4, fontSize: 12 }}>⛔ Denial Reason</div>
              <div style={{ fontSize: 13, color: '#7f1d1d' }}>{claim.denial_reason}</div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Timeline</div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12 }}>
              {[['Generated', claim.generated_date], ['Submitted', claim.submitted_date], ['Paid', claim.paid_date]].map(([label, date]) =>
                date ? (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                    <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
                    <strong>{new Date(date + 'T00:00:00').toLocaleDateString()}</strong>
                  </div>
                ) : null
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {claim.status === 'Denied' && (
            <button className="btn btn-secondary" style={{ fontSize: 13 }}>Appeal Claim</button>
          )}
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Generate Claim Modal ─────────────────────────────────────────────────────
function GenerateClaimModal({ onClose, onGenerate, patients, billedEncounterIds }) {
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedEncounterId, setSelectedEncounterId] = useState('');

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || null;

  const billableEncounters = useMemo(() =>
    selectedPatientId ? getBillableEncounters(selectedPatientId, billedEncounterIds) : [],
    [selectedPatientId, billedEncounterIds]
  );

  const selectedEncounter = billableEncounters.find(e => e.id === selectedEncounterId) || null;

  const handleGenerate = () => {
    if (!selectedPatient || !selectedEncounter) return;
    onGenerate(selectedEncounter, selectedPatient);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 600 }}>
        <div className="modal-header">
          <h3>📋 Generate New Claim</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label className="form-label">Patient *</label>
            <select
              value={selectedPatientId}
              onChange={e => { setSelectedPatientId(e.target.value); setSelectedEncounterId(''); }}
              className="form-input"
            >
              <option value="">Select a patient...</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.mrn})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Billable Encounter *</label>
            <select
              value={selectedEncounterId}
              onChange={e => setSelectedEncounterId(e.target.value)}
              className="form-input"
              disabled={!selectedPatientId}
            >
              <option value="">
                {!selectedPatientId ? 'Select patient first' :
                 billableEncounters.length === 0 ? 'No unbilled encounters found' :
                 'Select an encounter...'}
              </option>
              {billableEncounters.map(enc => (
                <option key={enc.id} value={enc.id}>{enc.label}</option>
              ))}
            </select>
            {selectedPatientId && billableEncounters.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                All completed encounters have already been billed for this patient.
              </div>
            )}
          </div>

          {selectedEncounter && selectedPatient && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 14px', fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: '#166534', marginBottom: 8 }}>Claim Preview</div>
              <div style={{ display: 'grid', gap: 4 }}>
                <div><span style={{ color: '#166534' }}>Patient: </span>{selectedPatient.firstName} {selectedPatient.lastName}</div>
                <div><span style={{ color: '#166534' }}>Insurance: </span>{(selectedPatient.insurance && selectedPatient.insurance.primary && selectedPatient.insurance.primary.name) || 'Unknown'}</div>
                <div><span style={{ color: '#166534' }}>Provider: </span>{selectedEncounter.providerName}</div>
                <div><span style={{ color: '#166534' }}>CPT Codes: </span>{selectedEncounter.cptCodes.join(', ')}</div>
                <div>
                  <span style={{ color: '#166534' }}>Est. Charges: </span>
                  <strong>{fmt$(selectedEncounter.cptCodes.reduce((s, c) => s + (CPT_FEE[c] || 0), 0))}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={!selectedPatientId || !selectedEncounterId}
          >
            Generate Claim
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ClaimsManagement() {
  const { currentUser } = useAuth();
  const { patients } = usePatient();

  const [claims, setClaims] = useState(SEED_CLAIMS);
  const [selectedClaims, setSelectedClaims] = useState([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [viewClaim, setViewClaim] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState('');

  const [filters, setFilters] = useState({ patientId: '', status: '', dateFrom: '', dateTo: '' });

  const billedEncounterIds = useMemo(() =>
    new Set(claims.map(c => c.encounterId).filter(Boolean)),
    [claims]
  );

  const stats = useMemo(() => ({
    total: claims.length,
    generated: claims.filter(c => c.status === 'Generated').length,
    submitted: claims.filter(c => c.status === 'Submitted').length,
    paid: claims.filter(c => c.status === 'Paid').length,
    denied: claims.filter(c => c.status === 'Denied').length,
    totalCharges: claims.reduce((s, c) => s + c.total_charges, 0),
    totalPaid: claims.reduce((s, c) => s + c.insurance_payment + c.patient_payment, 0),
    totalBalance: claims.reduce((s, c) => s + c.balance, 0),
  }), [claims]);

  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      if (filters.patientId && c.patientId !== filters.patientId) return false;
      if (filters.status && c.status !== filters.status) return false;
      if (filters.dateFrom && c.service_date < filters.dateFrom) return false;
      if (filters.dateTo && c.service_date > filters.dateTo) return false;
      return true;
    });
  }, [claims, filters]);

  const eligibleForSubmission = filteredClaims.filter(c => c.status === 'Generated');
  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const handleSelectClaim = (id, checked) =>
    setSelectedClaims(prev => checked ? [...prev, id] : prev.filter(x => x !== id));

  const handleSelectAll = (checked) =>
    setSelectedClaims(checked ? eligibleForSubmission.map(c => c.id) : []);

  const handleSubmit = () => {
    const today = new Date().toISOString().split('T')[0];
    setClaims(prev => prev.map(c =>
      selectedClaims.includes(c.id) ? { ...c, status: 'Submitted', submitted_date: today } : c
    ));
    const count = selectedClaims.length;
    setSelectedClaims([]);
    setSubmitSuccess(count + ' claim' + (count !== 1 ? 's' : '') + ' submitted successfully.');
    setTimeout(() => setSubmitSuccess(''), 4000);
  };

  const handleGenerate = (encounter, patient) => {
    const claimNum = 'CLM-' + new Date().getFullYear() + '-' + String(claims.length + 1).padStart(3, '0');
    const cptList = encounter.cptCodes || [];
    const totalCharges = cptList.reduce((s, code) => s + (CPT_FEE[code] || 0), 0);
    const newClaim = {
      id: 'clm-gen-' + Date.now(),
      claim_number: claimNum,
      encounterId: encounter.id,
      patientId: patient.id,
      first_name: patient.firstName,
      last_name: patient.lastName,
      mrn: patient.mrn,
      service_date: encounter.date,
      provider_first_name: encounter.providerName.split(' ')[0],
      provider_last_name: encounter.providerName.split(' ').slice(1).join(' '),
      cpt_codes: cptList.map(code => ({ code, description: CPT_DESC[code] || code, charge: CPT_FEE[code] || 0 })),
      icd_codes: encounter.icdCode ? [encounter.icdCode.split(' - ')[0]] : [],
      diagnosis: encounter.diagnosis || '',
      insurance_name: (patient.insurance && patient.insurance.primary && patient.insurance.primary.name) || '',
      member_id: (patient.insurance && patient.insurance.primary && patient.insurance.primary.memberId) || '',
      total_charges: totalCharges,
      insurance_payment: 0,
      patient_payment: 0,
      balance: totalCharges,
      status: 'Generated',
      generated_date: new Date().toISOString().split('T')[0],
    };
    setClaims(prev => [newClaim, ...prev]);
    setShowGenerateModal(false);
  };

  return (
    <div className="claims-management fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>📋 Claims Management</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Generate, submit, and track insurance claims</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {selectedClaims.length > 0 && (
            <button className="btn btn-primary" onClick={handleSubmit} style={{ fontSize: 13, fontWeight: 700 }}>
              📤 Submit {selectedClaims.length} Claim{selectedClaims.length !== 1 ? 's' : ''}
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setShowGenerateModal(true)} style={{ fontSize: 13, fontWeight: 700 }}>
            ➕ Generate Claim
          </button>
        </div>
      </div>

      {submitSuccess && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px',
          marginBottom: '1rem', fontSize: 13, color: '#166534', fontWeight: 600 }}>
          ✅ {submitSuccess}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <StatCard label="Total Claims" value={stats.total} accent="#6366f1" />
        <StatCard label="Generated" value={stats.generated} sub="Ready to submit" accent="#6b7280" />
        <StatCard label="Submitted" value={stats.submitted} sub="Awaiting processing" accent="#3b82f6" />
        <StatCard label="Paid" value={stats.paid} accent="#10b981" />
        <StatCard label="Denied" value={stats.denied} accent="#ef4444" />
        <StatCard label="Total Charges" value={fmt$(stats.totalCharges)} accent="#8b5cf6" />
        <StatCard label="Total Collected" value={fmt$(stats.totalPaid)} accent="#10b981" />
        <StatCard label="Outstanding Balance" value={fmt$(stats.totalBalance)} accent="#f59e0b" />
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
            <div>
              <label className="form-label">Patient</label>
              <select value={filters.patientId} onChange={e => setFilters(p => ({ ...p, patientId: e.target.value }))} className="form-input">
                <option value="">All Patients</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.mrn})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} className="form-input">
                <option value="">All Statuses</option>
                {['Generated', 'Submitted', 'Processed', 'Paid', 'Denied', 'Appealed'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Service Date From</label>
              <input type="date" value={filters.dateFrom} onChange={e => setFilters(p => ({ ...p, dateFrom: e.target.value }))} className="form-input" />
            </div>
            <div>
              <label className="form-label">Service Date To</label>
              <input type="date" value={filters.dateTo} onChange={e => setFilters(p => ({ ...p, dateTo: e.target.value }))} className="form-input" />
            </div>
            <button onClick={() => setFilters({ patientId: '', status: '', dateFrom: '', dateTo: '' })}
              className="btn btn-secondary" style={{ height: 'fit-content' }} disabled={!hasActiveFilters}>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Claims Table */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Claims List</h2>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                {filteredClaims.length} claim{filteredClaims.length !== 1 ? 's' : ''}{hasActiveFilters ? ' matching filters' : ' total'}
              </p>
            </div>
            {eligibleForSubmission.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  id="selectAll"
                  checked={selectedClaims.length === eligibleForSubmission.length && eligibleForSubmission.length > 0}
                  onChange={e => handleSelectAll(e.target.checked)}
                />
                <label htmlFor="selectAll" style={{ fontSize: 13, margin: 0, cursor: 'pointer' }}>
                  Select All Ready ({eligibleForSubmission.length})
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {filteredClaims.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <p style={{ margin: 0 }}>No claims found{hasActiveFilters ? ' matching your filters' : ''}.</p>
              {!hasActiveFilters && (
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowGenerateModal(true)}>
                  Generate Your First Claim
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '10px 12px', width: 36 }}></th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Claim #</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Patient</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Service Date</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Provider</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>CPT Codes</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>Charges</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>Collected</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>Balance</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.map((claim, i) => (
                    <tr key={claim.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <input
                          type="checkbox"
                          checked={selectedClaims.includes(claim.id)}
                          onChange={e => handleSelectClaim(claim.id, e.target.checked)}
                          disabled={claim.status !== 'Generated'}
                        />
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>
                        {claim.claim_number}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{claim.first_name} {claim.last_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>MRN: {claim.mrn}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {new Date(claim.service_date + 'T00:00:00').toLocaleDateString()}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12 }}>
                        {claim.provider_first_name} {claim.provider_last_name}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12 }}>
                        {claim.cpt_codes.slice(0, 2).map(c => c.code).join(', ')}
                        {claim.cpt_codes.length > 2 && ' +' + (claim.cpt_codes.length - 2)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                        {fmt$(claim.total_charges)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--success-color)' }}>
                        {fmt$(claim.insurance_payment + claim.patient_payment)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600,
                        color: claim.balance > 0 ? '#dc2626' : '#10b981' }}>
                        {fmt$(claim.balance)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <StatusBadge status={claim.status} />
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => setViewClaim(claim)}
                          style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                            background: '#fff', cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showGenerateModal && (
        <GenerateClaimModal
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleGenerate}
          patients={patients}
          billedEncounterIds={billedEncounterIds}
        />
      )}
      {viewClaim && (
        <ClaimDetailModal claim={viewClaim} onClose={() => setViewClaim(null)} />
      )}
    </div>
  );
}
