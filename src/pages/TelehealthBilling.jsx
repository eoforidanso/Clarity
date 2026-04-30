import React, { useState, useEffect } from 'react';
import '../styles/global.css';

// Simple API client for billing operations
const api = {
  get: async (url) => {
    const token = localStorage.getItem('ehr_token');
    const response = await fetch(url, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  },
  post: async (url, data) => {
    const token = localStorage.getItem('ehr_token');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }
};

const TelehealthBilling = () => {
  const [sessions, setSessions] = useState([]);
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('new-session');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [patients, setPatients] = useState([]);
  const [providers, setProviders] = useState([]);
  const [submitMsg, setSubmitMsg] = useState(null); // { type: 'success'|'error', text: string }
  const [sessionForm, setSessionForm] = useState({
    session_id: '',
    patient_id: '',
    provider_id: '',
    session_duration: 45,
    session_type: 'therapy',
    platform_used: 'zoom',
    technology_fee: 0,
    documentation_notes: ''
  });

  useEffect(() => {
    fetchPatients();
    fetchProviders();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      fetchBillingHistory(selectedPatient);
    }
  }, [selectedPatient]);

  const fetchPatients = async () => {
    try {
      const response = await api.get('/api/patients');
      setPatients(response.patients || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await api.get('/api/users');
      const providerUsers = response.users?.filter(user => 
        user.role === 'provider' || user.role === 'psychiatrist' || user.role === 'therapist'
      ) || [];
      setProviders(providerUsers);
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

  const fetchBillingHistory = async (patientId) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/billing/telehealth/billing-history/${patientId}`);
      if (response.success) {
        setBillingHistory(response.billing_history);
      }
    } catch (error) {
      console.error('Error fetching billing history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.post('/api/billing/telehealth/session-billing', sessionForm);
      if (response.success) {
        setSessionForm({
          session_id: '',
          patient_id: '',
          provider_id: '',
          session_duration: 45,
          session_type: 'therapy',
          platform_used: 'zoom',
          technology_fee: 0,
          documentation_notes: ''
        });
        setSubmitMsg({ type: 'success', text: `✅ Billing created! Total: $${response.total_amount.toFixed(2)}` });
        setTimeout(() => setSubmitMsg(null), 4000);
      }
    } catch (error) {
      console.error('Error creating session billing:', error);
      setSubmitMsg({ type: 'error', text: '⚠️ Error creating session billing. Please try again.' });
      setTimeout(() => setSubmitMsg(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const generateSessionId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `TH-${timestamp}-${random}`;
  };

  const calculateEstimatedCost = () => {
    const baseCosts = {
      'therapy': 120,
      'consultation': 150,
      'follow-up': 80,
      'psychiatric-eval': 200
    };
    
    const baseAmount = baseCosts[sessionForm.session_type] || 120;
    const durationMultiplier = sessionForm.session_duration / 45; // Standard 45-minute session
    const totalAmount = (baseAmount * durationMultiplier) + parseFloat(sessionForm.technology_fee || 0);
    
    return totalAmount.toFixed(2);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#2196F3',
      'billed': '#FF9800',
      'paid': '#4CAF50',
      'cancelled': '#F44336'
    };
    return colors[status] || '#666';
  };

  return (
    <div className="telehealth-billing">
      <div className="page-header">
        <h1>Telehealth Billing</h1>
        <p>Manage billing for telehealth sessions and remote consultations</p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'new-session' ? 'active' : ''}`}
          onClick={() => setActiveTab('new-session')}
        >
          New Session Billing
        </button>
        <button 
          className={`tab-button ${activeTab === 'billing-history' ? 'active' : ''}`}
          onClick={() => setActiveTab('billing-history')}
        >
          Billing History
        </button>
      </div>

      {/* New Session Billing Tab */}
      {activeTab === 'new-session' && (
        <div className="tab-content">
          <div className="billing-form-container">
            <h3>Create Telehealth Session Billing</h3>
            <form onSubmit={handleSessionSubmit} className="billing-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Session ID:</label>
                  <div className="input-with-button">
                    <input
                      type="text"
                      value={sessionForm.session_id}
                      onChange={(e) => setSessionForm(prev => ({ ...prev, session_id: e.target.value }))}
                      placeholder="Enter or generate session ID"
                      required
                    />
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSessionForm(prev => ({ ...prev, session_id: generateSessionId() }))}
                    >
                      Generate
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Session Type:</label>
                  <select
                    value={sessionForm.session_type}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, session_type: e.target.value }))}
                    required
                  >
                    <option value="therapy">Therapy Session</option>
                    <option value="consultation">Consultation</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="psychiatric-eval">Psychiatric Evaluation</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Patient:</label>
                  <select
                    value={sessionForm.patient_id}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, patient_id: e.target.value }))}
                    required
                  >
                    <option value="">Select Patient</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Provider:</label>
                  <select
                    value={sessionForm.provider_id}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, provider_id: e.target.value }))}
                    required
                  >
                    <option value="">Select Provider</option>
                    {providers.map(provider => (
                      <option key={provider.id} value={provider.id}>
                        Dr. {provider.first_name} {provider.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Session Duration (minutes):</label>
                  <input
                    type="number"
                    min="15"
                    max="180"
                    value={sessionForm.session_duration}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, session_duration: parseInt(e.target.value) }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Platform Used:</label>
                  <select
                    value={sessionForm.platform_used}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, platform_used: e.target.value }))}
                  >
                    <option value="zoom">Zoom</option>
                    <option value="teams">Microsoft Teams</option>
                    <option value="doxy.me">Doxy.me</option>
                    <option value="simple-practice">SimplePractice</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Technology Fee ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sessionForm.technology_fee}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, technology_fee: parseFloat(e.target.value) || 0 }))}
                  />
                  <small>Additional fee for telehealth platform usage</small>
                </div>
                <div className="form-group">
                  <label>Estimated Total Cost:</label>
                  <div className="estimated-cost">
                    ${calculateEstimatedCost()}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Documentation Notes:</label>
                <textarea
                  value={sessionForm.documentation_notes}
                  onChange={(e) => setSessionForm(prev => ({ ...prev, documentation_notes: e.target.value }))}
                  rows={3}
                  placeholder="Enter session notes, outcomes, or special billing considerations..."
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating Billing...' : 'Create Session Billing'}
                </button>
              </div>
              {submitMsg && (
                <div style={{ marginTop: 12, padding: '10px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, background: submitMsg.type === 'success' ? '#dcfce7' : '#fee2e2', color: submitMsg.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${submitMsg.type === 'success' ? '#86efac' : '#fca5a5'}` }}>
                  {submitMsg.text}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Billing History Tab */}
      {activeTab === 'billing-history' && (
        <div className="tab-content">
          <div className="billing-history-container">
            <h3>Telehealth Billing History</h3>
            
            <div className="patient-selector">
              <label>Select Patient:</label>
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
              >
                <option value="">Select Patient to View History</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedPatient && (
              <div className="billing-history">
                {loading ? (
                  <div className="loading-spinner">Loading billing history...</div>
                ) : billingHistory.length === 0 ? (
                  <div className="empty-state">
                    <p>No telehealth billing history found for this patient.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Session ID</th>
                          <th>Date/Time</th>
                          <th>Provider</th>
                          <th>Session Type</th>
                          <th>Duration</th>
                          <th>Platform</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billingHistory.map((billing) => (
                          <tr key={billing.id}>
                            <td>
                              <code>{billing.session_id}</code>
                            </td>
                            <td>{formatDate(billing.created_at)}</td>
                            <td>
                              Dr. {billing.provider_first_name} {billing.provider_last_name}
                            </td>
                            <td>
                              <span className="session-type-badge">
                                {billing.session_type.replace('-', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td>{billing.session_duration} min</td>
                            <td className="platform-name">{billing.platform_used}</td>
                            <td className="amount-cell">
                              <div>
                                <strong>{formatCurrency(billing.total_amount)}</strong>
                                {billing.technology_fee > 0 && (
                                  <small>
                                    (Base: {formatCurrency(billing.base_amount)} + Tech Fee: {formatCurrency(billing.technology_fee)})
                                  </small>
                                )}
                              </div>
                            </td>
                            <td>
                              <span 
                                className="status-badge"
                                style={{ backgroundColor: getStatusColor(billing.billing_status) }}
                              >
                                {billing.billing_status.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button className="btn btn-outline btn-sm">
                                  View Details
                                </button>
                                {billing.billing_status === 'pending' && (
                                  <button className="btn btn-primary btn-sm">
                                    Generate Claim
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TelehealthBilling;
