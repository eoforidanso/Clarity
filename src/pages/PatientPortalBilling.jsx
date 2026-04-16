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
  },
  put: async (url, data) => {
    const token = localStorage.getItem('ehr_token');
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }
};

const PatientPortalBilling = () => {
  const [statements, setStatements] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('statements');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [patients, setPatients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'credit_card',
    card_last_four: '',
    transaction_id: ''
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      if (activeTab === 'statements') {
        fetchStatements();
      } else if (activeTab === 'payment-history') {
        fetchPaymentHistory();
      }
    }
  }, [selectedPatient, activeTab, currentPage]);

  const fetchPatients = async () => {
    try {
      const response = await api.get('/api/patients');
      setPatients(response.patients || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchStatements = async () => {
    if (!selectedPatient) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/api/billing/patient-portal/statements/${selectedPatient}?page=${currentPage}`);
      if (response.success) {
        setStatements(response.statements);
        setTotalPages(response.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching statements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!selectedPatient) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/api/billing/patient-portal/payment-history/${selectedPatient}?page=${currentPage}`);
      if (response.success) {
        setPaymentHistory(response.payments);
        setTotalPages(response.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateStatement = async () => {
    if (!selectedPatient) return;
    
    try {
      setLoading(true);
      const response = await api.post(`/api/billing/patient-portal/generate-statement/${selectedPatient}`, {
        statement_date: new Date().toISOString()
      });
      
      if (response.success) {
        alert(`Statement generated successfully! Statement ID: ${response.statement_id}, Amount: $${response.amount_due.toFixed(2)}`);
        fetchStatements();
      }
    } catch (error) {
      console.error('Error generating statement:', error);
      alert('Error generating statement. Patient may not have outstanding balance.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Generate transaction ID if not provided
      const transactionId = paymentForm.transaction_id || `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      
      const paymentData = {
        patient_id: selectedPatient,
        statement_id: selectedStatement.id,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        card_last_four: paymentForm.card_last_four,
        transaction_id: transactionId
      };
      
      const response = await api.post('/api/billing/patient-portal/payment', paymentData);
      
      if (response.success) {
        setShowPaymentModal(false);
        setPaymentForm({
          amount: '',
          payment_method: 'credit_card',
          card_last_four: '',
          transaction_id: ''
        });
        fetchStatements();
        alert(`Payment processed successfully! Remaining balance: $${response.remaining_balance.toFixed(2)}`);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error processing payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = (statement) => {
    setSelectedStatement(statement);
    setPaymentForm(prev => ({ ...prev, amount: statement.amount_due.toString() }));
    setShowPaymentModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    const colors = {
      'outstanding': '#FF9800',
      'partial': '#2196F3',
      'paid': '#4CAF50',
      'overdue': '#F44336'
    };
    return colors[status] || '#666';
  };

  const getPaymentMethodDisplay = (method) => {
    const methods = {
      'credit_card': 'Credit Card',
      'debit_card': 'Debit Card',
      'bank_transfer': 'Bank Transfer',
      'check': 'Check',
      'cash': 'Cash',
      'insurance': 'Insurance'
    };
    return methods[method] || method;
  };

  return (
    <div className="patient-portal-billing">
      <div className="page-header">
        <h1>Patient Portal Billing</h1>
        <p>Manage patient statements, payments, and billing communications</p>
      </div>

      {/* Patient Selection */}
      <div className="patient-selector-section">
        <div className="patient-selector">
          <label>Select Patient:</label>
          <select
            value={selectedPatient}
            onChange={(e) => {
              setSelectedPatient(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Select Patient</option>
            {patients.map(patient => (
              <option key={patient.id} value={patient.id}>
                {patient.first_name} {patient.last_name} - {patient.email}
              </option>
            ))}
          </select>
        </div>
        
        {selectedPatient && (
          <div className="patient-actions">
            <button 
              className="btn btn-primary"
              onClick={generateStatement}
              disabled={loading}
            >
              Generate Statement
            </button>
          </div>
        )}
      </div>

      {selectedPatient && (
        <>
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'statements' ? 'active' : ''}`}
              onClick={() => setActiveTab('statements')}
            >
              Patient Statements
            </button>
            <button 
              className={`tab-button ${activeTab === 'payment-history' ? 'active' : ''}`}
              onClick={() => setActiveTab('payment-history')}
            >
              Payment History
            </button>
          </div>

          {/* Statements Tab */}
          {activeTab === 'statements' && (
            <div className="tab-content">
              <div className="statements-container">
                {loading ? (
                  <div className="loading-spinner">Loading statements...</div>
                ) : statements.length === 0 ? (
                  <div className="empty-state">
                    <p>No statements found for this patient.</p>
                    <button 
                      className="btn btn-primary"
                      onClick={generateStatement}
                    >
                      Generate New Statement
                    </button>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Statement #</th>
                          <th>Statement Date</th>
                          <th>Due Date</th>
                          <th>Total Amount</th>
                          <th>Amount Due</th>
                          <th>Items</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statements.map((statement) => (
                          <tr key={statement.id}>
                            <td>
                              <code>{statement.statement_number}</code>
                            </td>
                            <td>{formatDate(statement.statement_date)}</td>
                            <td>
                              <span className={new Date(statement.due_date) < new Date() ? 'overdue-date' : ''}>
                                {formatDate(statement.due_date)}
                              </span>
                            </td>
                            <td>{formatCurrency(statement.total_amount)}</td>
                            <td>
                              <strong>{formatCurrency(statement.amount_due)}</strong>
                            </td>
                            <td>
                              <span className="item-count">{statement.item_count} items</span>
                            </td>
                            <td>
                              <span 
                                className="status-badge"
                                style={{ backgroundColor: getStatusColor(statement.status) }}
                              >
                                {statement.status.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button className="btn btn-outline btn-sm">
                                  View Details
                                </button>
                                <button className="btn btn-outline btn-sm">
                                  Download PDF
                                </button>
                                {statement.amount_due > 0 && (
                                  <button 
                                    className="btn btn-primary btn-sm"
                                    onClick={() => openPaymentModal(statement)}
                                  >
                                    Make Payment
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
            </div>
          )}

          {/* Payment History Tab */}
          {activeTab === 'payment-history' && (
            <div className="tab-content">
              <div className="payment-history-container">
                {loading ? (
                  <div className="loading-spinner">Loading payment history...</div>
                ) : paymentHistory.length === 0 ? (
                  <div className="empty-state">
                    <p>No payment history found for this patient.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Payment Date</th>
                          <th>Amount</th>
                          <th>Payment Method</th>
                          <th>Transaction ID</th>
                          <th>Claim #</th>
                          <th>Service Type</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map((payment) => (
                          <tr key={payment.id}>
                            <td>{formatDate(payment.payment_date)}</td>
                            <td>
                              <strong>{formatCurrency(payment.amount)}</strong>
                            </td>
                            <td>
                              <div className="payment-method">
                                {getPaymentMethodDisplay(payment.payment_method)}
                                {payment.card_last_four && (
                                  <small> ****{payment.card_last_four}</small>
                                )}
                              </div>
                            </td>
                            <td>
                              <code>{payment.transaction_id}</code>
                            </td>
                            <td>{payment.claim_number || '-'}</td>
                            <td>{payment.service_type || '-'}</td>
                            <td>
                              <span 
                                className="status-badge"
                                style={{ backgroundColor: payment.status === 'completed' ? '#4CAF50' : '#FF9800' }}
                              >
                                {payment.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedStatement && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Make Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="modal-close">×</button>
            </div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="modal-body">
                <div className="payment-details">
                  <h4>Statement Details</h4>
                  <p><strong>Statement #:</strong> {selectedStatement.statement_number}</p>
                  <p><strong>Amount Due:</strong> {formatCurrency(selectedStatement.amount_due)}</p>
                  <p><strong>Due Date:</strong> {formatDate(selectedStatement.due_date)}</p>
                </div>
                
                <div className="form-group">
                  <label>Payment Amount:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedStatement.amount_due}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                  <small>Maximum: {formatCurrency(selectedStatement.amount_due)}</small>
                </div>

                <div className="form-group">
                  <label>Payment Method:</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_method: e.target.value }))}
                    required
                  >
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>

                {(paymentForm.payment_method === 'credit_card' || paymentForm.payment_method === 'debit_card') && (
                  <div className="form-group">
                    <label>Card Last 4 Digits:</label>
                    <input
                      type="text"
                      maxLength="4"
                      pattern="[0-9]{4}"
                      value={paymentForm.card_last_four}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, card_last_four: e.target.value }))}
                      placeholder="1234"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Transaction ID (optional):</label>
                  <input
                    type="text"
                    value={paymentForm.transaction_id}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, transaction_id: e.target.value }))}
                    placeholder="Will be auto-generated if empty"
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Processing...' : 'Process Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientPortalBilling;
