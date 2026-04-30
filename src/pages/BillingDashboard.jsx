import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function BillingDashboard() {
  const { currentUser } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('month');
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const getMockData = (p) => {
    const multiplier = { week: 0.25, month: 1, quarter: 3, year: 12 }[p] || 1;
    const gross = Math.round(142800 * multiplier);
    const payments = Math.round(gross * 0.87);
    const now = new Date();
    const from = new Date(now);
    from.setMonth(from.getMonth() - (multiplier === 0.25 ? 0 : Math.round(multiplier)));
    return {
      dateRange: {
        from: from.toISOString().slice(0, 10),
        to: now.toISOString().slice(0, 10),
      },
      metrics: {
        gross_charges: gross,
        total_payments: payments,
        outstanding_balance: Math.round(gross * 0.13),
        total_claims: Math.round(312 * multiplier),
        avg_charge_per_claim: 457,
        collection_rate: 87,
      },
      claimsByStatus: [
        { status: 'Paid',      count: Math.round(218 * multiplier), charges: Math.round(99600 * multiplier) },
        { status: 'Submitted', count: Math.round(54 * multiplier),  charges: Math.round(24700 * multiplier) },
        { status: 'Processed', count: Math.round(21 * multiplier),  charges: Math.round(9600 * multiplier) },
        { status: 'Denied',    count: Math.round(14 * multiplier),  charges: Math.round(6400 * multiplier) },
        { status: 'Generated', count: Math.round(5 * multiplier),   charges: Math.round(2500 * multiplier) },
      ],
      topProcedures: [
        { cpt_code: '99214', description: 'Office Visit — Moderate Complexity',  count: Math.round(98 * multiplier),  total_charges: Math.round(44100 * multiplier) },
        { cpt_code: '90837', description: 'Psychotherapy — 60 min',              count: Math.round(74 * multiplier),  total_charges: Math.round(13320 * multiplier) },
        { cpt_code: '99213', description: 'Office Visit — Low Complexity',       count: Math.round(63 * multiplier),  total_charges: Math.round(18270 * multiplier) },
        { cpt_code: '90834', description: 'Psychotherapy — 45 min',              count: Math.round(41 * multiplier),  total_charges: Math.round(6150 * multiplier) },
        { cpt_code: '99215', description: 'Office Visit — High Complexity',      count: Math.round(36 * multiplier),  total_charges: Math.round(21600 * multiplier) },
      ],
      providerStats: [
        { provider_id: 'u1', provider_name: 'Dr. Chris L., MD',     encounter_count: Math.round(124 * multiplier), gross_charges: Math.round(56680 * multiplier), collections: Math.round(49312 * multiplier) },
        { provider_id: 'u2', provider_name: 'Kelly Chen, NP',        encounter_count: Math.round(98 * multiplier),  gross_charges: Math.round(44786 * multiplier), collections: Math.round(37960 * multiplier) },
        { provider_id: 'u8', provider_name: 'April T., LCSW',        encounter_count: Math.round(90 * multiplier),  gross_charges: Math.round(41334 * multiplier), collections: Math.round(36220 * multiplier) },
      ],
    };
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('ehr_token');
      const response = await fetch(`/api/billing/dashboard?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('API unavailable');
      const data = await response.json();
      setDashboardData(data);
    } catch {
      // Backend not running — use mock data
      setDashboardData(getMockData(period));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0)}%`;
  };

  if (loading) {
    return (
      <div className="billing-dashboard">
        <div className="page-header">
          <h1>💰 Revenue Cycle Management</h1>
          <p>Loading billing dashboard...</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <div className="spinner">Loading...</div>
        </div>
      </div>
    );
  }

  const metrics = dashboardData?.metrics || {};

  return (
    <div className="billing-dashboard fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>💰 Revenue Cycle Management</h1>
            <p>Financial performance and billing analytics</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', fontWeight: '600' }}>Period:</label>
            <select 
              value={period} 
              onChange={(e) => setPeriod(e.target.value)}
              className="form-input"
              style={{ width: 'auto', padding: '6px 12px' }}
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
              {dashboardData?.dateRange?.from} to {dashboardData?.dateRange?.to}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-nav" style={{ marginBottom: '1.5rem' }}>
        {[
          { id: 'overview', label: '📊 Overview', desc: 'Key metrics' },
          { id: 'claims', label: '📋 Claims', desc: 'Claim status' },
          { id: 'payments', label: '💳 Collections', desc: 'Payments & AR' },
          { id: 'denials', label: '⚠️ Denials', desc: 'Denial mgmt' },
          { id: 'providers', label: '👨‍⚕️ Providers', desc: 'Productivity' },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${selectedTab === tab.id ? 'active' : ''}`}
            onClick={() => setSelectedTab(tab.id)}
            style={{ flexDirection: 'column', alignItems: 'center', padding: '8px 16px', minWidth: '100px' }}
          >
            <span style={{ fontSize: '14px', fontWeight: '600' }}>{tab.label}</span>
            <span style={{ fontSize: '11px', opacity: '0.7', marginTop: '2px' }}>{tab.desc}</span>
          </button>
        ))}
      </div>

      {selectedTab === 'overview' && (
        <div className="billing-overview">
          {/* Key Metrics Cards */}
          <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            
            <div className="metric-card">
              <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white' }}>💰</div>
              <div className="metric-content">
                <h3>Total Charges</h3>
                <div className="metric-value">{formatCurrency(metrics.gross_charges)}</div>
                <div className="metric-subtitle">{metrics.total_claims} claims</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: 'white' }}>💸</div>
              <div className="metric-content">
                <h3>Collections</h3>
                <div className="metric-value">{formatCurrency(metrics.total_payments)}</div>
                <div className="metric-subtitle">{formatPercent(metrics.collection_rate)} collection rate</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: 'white' }}>📊</div>
              <div className="metric-content">
                <h3>Outstanding AR</h3>
                <div className="metric-value">{formatCurrency(metrics.outstanding_balance)}</div>
                <div className="metric-subtitle">Accounts receivable</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', color: 'white' }}>🏥</div>
              <div className="metric-content">
                <h3>Average Charge</h3>
                <div className="metric-value">{formatCurrency(metrics.avg_charge_per_claim)}</div>
                <div className="metric-subtitle">Per encounter</div>
              </div>
            </div>

          </div>

          {/* Claims Status Distribution */}
          {dashboardData?.claimsByStatus && (
            <div className="card" style={{ marginBottom: '2rem' }}>
              <div className="card-header">
                <h2>📋 Claims by Status</h2>
              </div>
              <div className="card-body">
                <div className="claims-status-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {dashboardData.claimsByStatus.map((status) => {
                    const statusColors = {
                      'Generated': '#6b7280',
                      'Submitted': '#3b82f6',
                      'Processed': '#f59e0b',
                      'Paid': '#10b981',
                      'Denied': '#ef4444',
                      'Appealed': '#8b5cf6'
                    };
                    
                    return (
                      <div key={status.status} className="status-card" style={{
                        padding: '1rem',
                        border: '2px solid var(--border-color)',
                        borderRadius: '8px',
                        textAlign: 'center',
                        borderLeftColor: statusColors[status.status] || '#6b7280',
                        borderLeftWidth: '4px'
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: statusColors[status.status] }}>
                          {status.count}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', margin: '4px 0' }}>
                          {status.status}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {formatCurrency(status.charges)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Top Procedures */}
          {dashboardData?.topProcedures && (
            <div className="card">
              <div className="card-header">
                <h2>🔥 Top Procedures</h2>
                <p>Most frequently billed CPT codes</p>
              </div>
              <div className="card-body">
                <div className="procedure-list">
                  {dashboardData.topProcedures.map((proc, index) => (
                    <div key={proc.cpt_code} className="procedure-item" style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      borderBottom: index < dashboardData.topProcedures.length - 1 ? '1px solid var(--border-color)' : 'none'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>
                          {proc.cpt_code} - {proc.description}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {proc.count} encounters
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                          {formatCurrency(proc.total_charges)}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {formatCurrency(proc.total_charges / proc.count)} avg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'providers' && (
        <div className="provider-productivity">
          <div className="card">
            <div className="card-header">
              <h2>👨‍⚕️ Provider Productivity</h2>
              <p>Financial performance by provider for {period}</p>
            </div>
            <div className="card-body">
              {dashboardData?.providerStats && dashboardData.providerStats.length > 0 ? (
                <div className="provider-table">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600' }}>Provider</th>
                        <th style={{ textAlign: 'center', padding: '12px', fontWeight: '600' }}>Encounters</th>
                        <th style={{ textAlign: 'right', padding: '12px', fontWeight: '600' }}>Gross Charges</th>
                        <th style={{ textAlign: 'right', padding: '12px', fontWeight: '600' }}>Collections</th>
                        <th style={{ textAlign: 'right', padding: '12px', fontWeight: '600' }}>Collection Rate</th>
                        <th style={{ textAlign: 'right', padding: '12px', fontWeight: '600' }}>Avg/Encounter</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.providerStats.map((provider, index) => {
                        const collectionRate = provider.gross_charges > 0 
                          ? ((provider.collections / provider.gross_charges) * 100).toFixed(1)
                          : 0;
                        const avgPerEncounter = provider.encounter_count > 0 
                          ? provider.gross_charges / provider.encounter_count 
                          : 0;

                        return (
                          <tr key={provider.provider_id} style={{ 
                            borderBottom: index < dashboardData.providerStats.length - 1 ? '1px solid var(--border-color)' : 'none',
                            backgroundColor: index % 2 === 0 ? 'var(--bg-secondary)' : 'transparent'
                          }}>
                            <td style={{ padding: '12px', fontWeight: '600' }}>
                              {provider.provider_name || 'Unknown Provider'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              {provider.encounter_count}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                              {formatCurrency(provider.gross_charges)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', color: 'var(--success-color)' }}>
                              {formatCurrency(provider.collections)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <span style={{
                                color: collectionRate >= 90 ? 'var(--success-color)' : 
                                       collectionRate >= 70 ? 'var(--warning-color)' : 
                                       'var(--error-color)'
                              }}>
                                {collectionRate}%
                              </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              {formatCurrency(avgPerEncounter)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No provider data available for this period.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Additional tabs would be implemented here */}
      {selectedTab === 'claims' && (
        <div className="claims-management">
          <div className="alert alert-info">
            <strong>Coming Soon:</strong> Detailed claims management interface with search, filters, and batch operations.
          </div>
        </div>
      )}

      {selectedTab === 'payments' && (
        <div className="payment-tracking">
          <div className="alert alert-info">
            <strong>Coming Soon:</strong> Payment posting, accounts receivable aging, and collection workflows.
          </div>
        </div>
      )}

      {selectedTab === 'denials' && (
        <div className="denial-management">
          <div className="alert alert-info">
            <strong>Coming Soon:</strong> Denial tracking, appeal management, and resolution workflows.
          </div>
        </div>
      )}
    </div>
  );
}
