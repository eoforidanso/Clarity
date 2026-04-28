import React, { useState, useMemo } from 'react';
import { usePatient } from '../contexts/PatientContext';

export default function BTGAuditLog() {
  const { btgAuditLog } = usePatient();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const filteredLogs = useMemo(() => {
    let logs = [...btgAuditLog].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (search.trim()) {
      const q = search.toLowerCase();
      logs = logs.filter(l =>
        l.userName.toLowerCase().includes(q) ||
        l.patientName.toLowerCase().includes(q) ||
        l.reason.toLowerCase().includes(q)
      );
    }

    if (dateFilter) {
      logs = logs.filter(l => l.timestamp.startsWith(dateFilter));
    }

    return logs;
  }, [btgAuditLog, search, dateFilter]);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>🔓 Break-the-Glass Audit Log</h1>
        <p>Record of all BTG access events — HIPAA compliance review · {btgAuditLog.length} total events</p>
      </div>

      {/* Stats */}
      <div className="stat-cards mb-4">
        <div className="stat-card">
          <span className="stat-label">Total BTG Events</span>
          <span className="stat-value">{btgAuditLog.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Unique Users</span>
          <span className="stat-value">{new Set(btgAuditLog.map(l => l.userId)).size}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Unique Patients</span>
          <span className="stat-value">{new Set(btgAuditLog.map(l => l.patientId)).size}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Today</span>
          <span className="stat-value">
            {btgAuditLog.filter(l => l.timestamp.startsWith(new Date().toISOString().slice(0, 10))).length}
          </span>
        </div>
      </div>

      <div className="alert alert-warning mb-4">
        <strong>⚠️ Compliance Notice:</strong> Break-the-Glass (BTG) access allows providers to view restricted patient records in emergencies. 
        All BTG events are logged permanently and subject to periodic compliance review. Unauthorized access may result in disciplinary action.
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="form-input"
          placeholder="🔍 Search by user, patient, or reason..."
          style={{ flex: 1, maxWidth: 400 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          className="form-input"
          type="date"
          style={{ width: 180 }}
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        <span className="text-muted text-sm">{filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Audit Table */}
      <div className="card">
        <div className="card-body no-pad">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Role</th>
                <th>Patient Accessed</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, i) => (
                <tr key={i}>
                  <td className="text-sm">
                    <div className="font-bold">{new Date(log.timestamp).toLocaleDateString()}</div>
                    <div className="text-muted">{new Date(log.timestamp).toLocaleTimeString()}</div>
                  </td>
                  <td className="font-semibold">{log.userName}</td>
                  <td><span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{log.userRole?.replace('_', ' ') || 'N/A'}</span></td>
                  <td className="font-semibold">{log.patientName}</td>
                  <td style={{ maxWidth: 300 }}>
                    <div className="text-sm" style={{ lineHeight: 1.5 }}>{log.reason}</div>
                  </td>
                  <td>
                    <span className="badge badge-warning">🔓 BTG Access</span>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                    <h3>No audit records found</h3>
                    <p className="text-sm mt-1">
                      {search || dateFilter
                        ? 'Try adjusting your search filters'
                        : 'No Break-the-Glass events have been recorded'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
