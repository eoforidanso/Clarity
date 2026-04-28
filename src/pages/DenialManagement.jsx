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

const DenialManagement = () => {
  const [denials, setDenials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    priority: ''
  });
  const [selectedDenial, setSelectedDenial] = useState(null);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [appealForm, setAppealForm] = useState({
    appeal_notes: '',
    appeal_documents: [],
    priority: 'medium'
  });
  const [resolveForm, setResolveForm] = useState({
    resolution_notes: '',
    resolution_amount: ''
  });

  useEffect(() => {
    fetchDenials();
  }, [currentPage, filters]);

  const fetchDenials = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...filters
      });
      
      const response = await api.get(`/api/billing/denials?${params}`);
      if (response.success) {
        setDenials(response.denials);
        setTotalPages(response.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching denials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleAppealSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.post(`/api/billing/denials/${selectedDenial.id}/appeal`, appealForm);
      if (response.success) {
        setShowAppealModal(false);
        setAppealForm({ appeal_notes: '', appeal_documents: [], priority: 'medium' });
        fetchDenials();
      }
    } catch (error) {
      console.error('Error submitting appeal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.put(`/api/billing/denials/${selectedDenial.id}/resolve`, resolveForm);
      if (response.success) {
        setShowResolveModal(false);
        setResolveForm({ resolution_notes: '', resolution_amount: '' });
        fetchDenials();
      }
    } catch (error) {
      console.error('Error resolving denial:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'low': '#4CAF50',
      'medium': '#FF9800',
      'high': '#FF5722',
      'urgent': '#F44336'
    };
    return colors[priority] || '#666';
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#2196F3',
      'appealing': '#FF9800',
      'resolved': '#4CAF50',
      'closed': '#666'
    };
    return colors[status] || '#666';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  return (
    <div className="denial-management">
      <div className="page-header">
        <h1>Denial Management</h1>
        <p>Track and manage claim denials and appeals</p>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Status:</label>
          <select 
            value={filters.status} 
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="appealing">Appealing</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Priority:</label>
          <select 
            value={filters.priority} 
            onChange={(e) => handleFilterChange('priority', e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Denials Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-spinner">Loading denials...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Claim #</th>
                <th>Patient</th>
                <th>Denial Date</th>
                <th>Reason</th>
                <th>Amount</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Days Open</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {denials.map((denial) => {
                const daysOpen = Math.floor((new Date() - new Date(denial.denial_date)) / (1000 * 60 * 60 * 24));
                return (
                  <tr key={denial.id}>
                    <td>{denial.claim_number}</td>
                    <td>{denial.first_name} {denial.last_name}</td>
                    <td>{formatDate(denial.denial_date)}</td>
                    <td>
                      <div className="denial-reason">
                        <strong>{denial.denial_code}</strong>
                        <div className="reason-text">{denial.denial_reason}</div>
                      </div>
                    </td>
                    <td>{formatCurrency(denial.claim_amount)}</td>
                    <td>
                      <span 
                        className="priority-badge"
                        style={{ backgroundColor: getPriorityColor(denial.priority) }}
                      >
                        {denial.priority?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(denial.resolution_status) }}
                      >
                        {denial.resolution_status?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={daysOpen > 30 ? 'days-overdue' : 'days-normal'}>
                        {daysOpen} days
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {denial.resolution_status === 'pending' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setSelectedDenial(denial);
                              setShowAppealModal(true);
                            }}
                          >
                            Appeal
                          </button>
                        )}
                        {denial.resolution_status === 'appealing' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => {
                              setSelectedDenial(denial);
                              setShowResolveModal(true);
                            }}
                          >
                            Resolve
                          </button>
                        )}
                        <button className="btn btn-outline btn-sm">
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

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

      {/* Appeal Modal */}
      {showAppealModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Submit Appeal</h3>
              <button onClick={() => setShowAppealModal(false)} className="modal-close">×</button>
            </div>
            <form onSubmit={handleAppealSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Priority Level:</label>
                  <select 
                    value={appealForm.priority} 
                    onChange={(e) => setAppealForm(prev => ({ ...prev, priority: e.target.value }))}
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Appeal Notes:</label>
                  <textarea
                    value={appealForm.appeal_notes}
                    onChange={(e) => setAppealForm(prev => ({ ...prev, appeal_notes: e.target.value }))}
                    rows={4}
                    placeholder="Enter detailed appeal justification..."
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Supporting Documents:</label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.png"
                    onChange={(e) => setAppealForm(prev => ({ ...prev, appeal_documents: Array.from(e.target.files) }))}
                  />
                  <small>Upload supporting documentation (PDF, DOC, images)</small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAppealModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Appeal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Resolve Denial</h3>
              <button onClick={() => setShowResolveModal(false)} className="modal-close">×</button>
            </div>
            <form onSubmit={handleResolveSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Resolution Amount:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={resolveForm.resolution_amount}
                    onChange={(e) => setResolveForm(prev => ({ ...prev, resolution_amount: e.target.value }))}
                    placeholder="Enter resolved amount"
                  />
                </div>
                <div className="form-group">
                  <label>Resolution Notes:</label>
                  <textarea
                    value={resolveForm.resolution_notes}
                    onChange={(e) => setResolveForm(prev => ({ ...prev, resolution_notes: e.target.value }))}
                    rows={4}
                    placeholder="Enter resolution details and outcome..."
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowResolveModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? 'Resolving...' : 'Mark Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DenialManagement;
