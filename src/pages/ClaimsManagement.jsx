import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';

export default function ClaimsManagement() {
  const { currentUser } = useAuth();
  const { patients } = usePatient();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClaims, setSelectedClaims] = useState([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    patientId: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    providerId: '',
    page: 1,
    limit: 25
  });

  // Pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });

  useEffect(() => {
    fetchClaims();
  }, [filters]);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.set(key, value);
      });

      const response = await fetch(`/api/billing/claims?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ehr_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch claims');
      }

      const data = await response.json();
      setClaims(data.claims || []);
      setPagination(data.pagination || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateClaim = async (encounterId, patientId, providerId) => {
    try {
      const response = await fetch('/api/billing/claims/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ehr_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ encounterId, patientId, providerId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate claim');
      }

      const newClaim = await response.json();
      setClaims(prev => [newClaim, ...prev]);
      setShowGenerateModal(false);
      
      // Show success message
      alert('Claim generated successfully!');
    } catch (err) {
      alert('Error generating claim: ' + err.message);
    }
  };

  const submitClaims = async (claimIds) => {
    try {
      const response = await fetch('/api/billing/claims/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ehr_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ claimIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit claims');
      }

      const result = await response.json();
      
      // Refresh claims list
      fetchClaims();
      setSelectedClaims([]);
      
      alert(`Successfully submitted ${result.submitted} claims. ${result.failed} failed.`);
    } catch (err) {
      alert('Error submitting claims: ' + err.message);
    }
  };

  const handleSelectClaim = (claimId, checked) => {
    if (checked) {
      setSelectedClaims(prev => [...prev, claimId]);
    } else {
      setSelectedClaims(prev => prev.filter(id => id !== claimId));
    }
  };

  const handleSelectAllClaims = (checked) => {
    if (checked) {
      const eligibleClaims = claims.filter(c => c.status === 'Generated').map(c => c.id);
      setSelectedClaims(eligibleClaims);
    } else {
      setSelectedClaims([]);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      'Generated': { bg: '#6b7280', color: 'white' },
      'Submitted': { bg: '#3b82f6', color: 'white' },
      'Processed': { bg: '#f59e0b', color: 'white' },
      'Paid': { bg: '#10b981', color: 'white' },
      'Denied': { bg: '#ef4444', color: 'white' },
      'Appealed': { bg: '#8b5cf6', color: 'white' }
    };
    
    const style = statusStyles[status] || statusStyles['Generated'];
    
    return (
      <span style={{
        backgroundColor: style.bg,
        color: style.color,
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '600'
      }}>
        {status}
      </span>
    );
  };

  const canSubmitClaims = selectedClaims.length > 0;
  const eligibleForSubmission = claims.filter(c => c.status === 'Generated');

  return (
    <div className="claims-management fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>📋 Claims Management</h1>
            <p>Generate, submit, and track insurance claims</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {canSubmitClaims && (
              <button
                className="btn btn-primary"
                onClick={() => submitClaims(selectedClaims)}
                style={{ fontSize: '14px' }}
              >
                📤 Submit {selectedClaims.length} Claim{selectedClaims.length !== 1 ? 's' : ''}
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => setShowGenerateModal(true)}
              style={{ fontSize: '14px' }}
            >
              ➕ Generate Claim
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
            <div>
              <label className="form-label">Patient</label>
              <select 
                value={filters.patientId} 
                onChange={(e) => setFilters(prev => ({ ...prev, patientId: e.target.value, page: 1 }))}
                className="form-input"
              >
                <option value="">All Patients</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName} ({patient.mrn})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="form-label">Status</label>
              <select 
                value={filters.status} 
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className="form-input"
              >
                <option value="">All Statuses</option>
                <option value="Generated">Generated</option>
                <option value="Submitted">Submitted</option>
                <option value="Processed">Processed</option>
                <option value="Paid">Paid</option>
                <option value="Denied">Denied</option>
                <option value="Appealed">Appealed</option>
              </select>
            </div>
            
            <div>
              <label className="form-label">Service Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value, page: 1 }))}
                className="form-input"
              />
            </div>
            
            <div>
              <label className="form-label">Service Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value, page: 1 }))}
                className="form-input"
              />
            </div>
            
            <button
              onClick={() => setFilters({ patientId: '', status: '', dateFrom: '', dateTo: '', providerId: '', page: 1, limit: 25 })}
              className="btn btn-secondary"
              style={{ height: 'fit-content' }}
            >
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
              <h2>Claims List</h2>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
                {pagination.total} total claims • Page {pagination.page} of {pagination.pages}
              </p>
            </div>
            {eligibleForSubmission.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={selectedClaims.length === eligibleForSubmission.length && eligibleForSubmission.length > 0}
                  onChange={(e) => handleSelectAllClaims(e.target.checked)}
                />
                <label style={{ fontSize: '14px', margin: 0 }}>
                  Select All Ready ({eligibleForSubmission.length})
                </label>
              </div>
            )}
          </div>
        </div>
        
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="spinner">Loading claims...</div>
            </div>
          ) : error ? (
            <div className="alert alert-error" style={{ margin: '1rem' }}>
              <strong>Error:</strong> {error}
            </div>
          ) : claims.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <p>No claims found matching your criteria.</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowGenerateModal(true)}
              >
                Generate Your First Claim
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedClaims.length === eligibleForSubmission.length && eligibleForSubmission.length > 0}
                        onChange={(e) => handleSelectAllClaims(e.target.checked)}
                        disabled={eligibleForSubmission.length === 0}
                      />
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Claim #</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Patient</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Service Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Provider</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>CPT Codes</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Charges</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Payments</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Balance</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim, index) => (
                    <tr key={claim.id} style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--bg-secondary)'
                    }}>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="checkbox"
                          checked={selectedClaims.includes(claim.id)}
                          onChange={(e) => handleSelectClaim(claim.id, e.target.checked)}
                          disabled={claim.status !== 'Generated'}
                        />
                      </td>
                      <td style={{ padding: '12px', fontWeight: '600', fontSize: '13px' }}>
                        {claim.claim_number}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600' }}>{claim.first_name} {claim.last_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>MRN: {claim.mrn}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {new Date(claim.service_date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {claim.provider_first_name} {claim.provider_last_name}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontSize: '12px' }}>
                          {claim.cpt_codes.slice(0, 2).map(cpt => cpt.code).join(', ')}
                          {claim.cpt_codes.length > 2 && ` +${claim.cpt_codes.length - 2} more`}
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                        {formatCurrency(claim.total_charges)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: 'var(--success-color)' }}>
                        {formatCurrency(claim.insurance_payment + claim.patient_payment)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                        {formatCurrency(claim.balance)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {getStatusBadge(claim.status)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button 
                          className="btn-link"
                          style={{ fontSize: '12px', padding: '4px 8px' }}
                          onClick={() => {/* TODO: Open claim details */}}
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

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button
            className="btn btn-secondary"
            disabled={pagination.page <= 1}
            onClick={() => setFilters(prev => ({ ...prev, page: pagination.page - 1 }))}
          >
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '14px' }}>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            className="btn btn-secondary"
            disabled={pagination.page >= pagination.pages}
            onClick={() => setFilters(prev => ({ ...prev, page: pagination.page + 1 }))}
          >
            Next
          </button>
        </div>
      )}

      {/* Generate Claim Modal */}
      {showGenerateModal && (
        <GenerateClaimModal 
          onClose={() => setShowGenerateModal(false)}
          onGenerate={generateClaim}
          patients={patients}
        />
      )}
    </div>
  );
}

// Separate component for the Generate Claim Modal
function GenerateClaimModal({ onClose, onGenerate, patients }) {
  const [selectedPatient, setSelectedPatient] = useState('');
  const [encounters, setEncounters] = useState([]);
  const [selectedEncounter, setSelectedEncounter] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPatient) {
      fetchEncounters();
    }
  }, [selectedPatient]);

  const fetchEncounters = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/patients/${selectedPatient}/encounters`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ehr_token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter encounters that can be billed (completed, have CPT codes)
        const billableEncounters = data.filter(enc => 
          enc.status === 'Completed' && 
          enc.cpt_codes && 
          JSON.parse(enc.cpt_codes).length > 0
        );
        setEncounters(billableEncounters);
      }
    } catch (error) {
      console.error('Error fetching encounters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (!selectedPatient || !selectedEncounter) {
      alert('Please select both patient and encounter');
      return;
    }

    const encounter = encounters.find(e => e.id === selectedEncounter);
    onGenerate(selectedEncounter, selectedPatient, encounter?.provider);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '600px' }}>
        <div className="modal-header">
          <h3>📋 Generate New Claim</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label className="form-label">Patient *</label>
              <select
                value={selectedPatient}
                onChange={(e) => {
                  setSelectedPatient(e.target.value);
                  setSelectedEncounter('');
                  setEncounters([]);
                }}
                className="form-input"
                required
              >
                <option value="">Select a patient...</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName} ({patient.mrn})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Billable Encounter *</label>
              <select
                value={selectedEncounter}
                onChange={(e) => setSelectedEncounter(e.target.value)}
                className="form-input"
                disabled={!selectedPatient || loading}
                required
              >
                <option value="">
                  {!selectedPatient ? 'Select patient first' : 
                   loading ? 'Loading encounters...' : 
                   'Select an encounter...'}
                </option>
                {encounters.map(encounter => (
                  <option key={encounter.id} value={encounter.id}>
                    {encounter.date} - {encounter.type} (Provider: {encounter.provider_name})
                  </option>
                ))}
              </select>
              {selectedPatient && encounters.length === 0 && !loading && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  No billable encounters found. Encounters must be completed with CPT codes.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleGenerate}
            disabled={!selectedPatient || !selectedEncounter}
          >
            Generate Claim
          </button>
        </div>
      </div>
    </div>
  );
}
