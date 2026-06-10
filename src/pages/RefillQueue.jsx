import React, { useState, useEffect } from 'react';
import { usePatient } from '../contexts/PatientContext';
import { useAuth } from '../contexts/AuthContext';

const REFILL_STATUSES = [
  { id: 'pending', label: 'Pending', icon: '⏳', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  { id: 'queued', label: 'Queued', icon: '📋', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'sent', label: 'Sent to Pharmacy', icon: '✅', color: '#10b981', bg: '#f0fdf4', border: '#86efac' },
  { id: 'filled', label: 'Filled', icon: '💊', color: '#8b5cf6', bg: '#faf5ff', border: '#ddd6fe' },
  { id: 'rejected', label: 'Rejected', icon: '❌', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
];

const REFILL_PRIORITIES = [
  { id: 'low', label: 'Low', color: '#6b7280' },
  { id: 'normal', label: 'Normal', color: '#3b82f6' },
  { id: 'high', label: 'High', color: '#f59e0b' },
  { id: 'urgent', label: 'Urgent', color: '#ef4444' },
];

export default function RefillQueue() {
  const { patients, selectedPatient } = usePatient();
  const { currentUser } = useAuth();
  const [filterStatus, setFilterStatus] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('daysRemaining'); // daysRemaining, patient, medication
  const [refillQueue, setRefillQueue] = useState([]);
  const [selectedRefills, setSelectedRefills] = useState(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const [showPharmacyModal, setShowPharmacyModal] = useState(false);
  const [selectedRefillForAction, setSelectedRefillForAction] = useState(null);
  const [pharmForm, setPharmForm] = useState({
    pharmacy: '',
    refills: 0,
    notes: '',
    priority: 'normal',
  });
  const [showDetails, setShowDetails] = useState(null);

  // Load refill data from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('clarity_refill_queue') || '[]';
      const data = JSON.parse(stored);
      setRefillQueue(data);
    } catch {
      setRefillQueue([]);
    }
  }, []);

  // Filter and sort refills
  const filtered = refillQueue
    .filter(r => {
      if (filterStatus && r.status !== filterStatus) return false;
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        r.patientName.toLowerCase().includes(q) ||
        r.medicationName.toLowerCase().includes(q) ||
        r.pharmacy?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'daysRemaining':
          return a.daysRemaining - b.daysRemaining;
        case 'patient':
          return a.patientName.localeCompare(b.patientName);
        case 'medication':
          return a.medicationName.localeCompare(b.medicationName);
        default:
          return 0;
      }
    });

  const saveRefillQueue = (queue) => {
    try {
      localStorage.setItem('clarity_refill_queue', JSON.stringify(queue));
      setRefillQueue(queue);
    } catch { /* storage full */ }
  };

  const handleAddRefill = (patientId, medication) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const newRefill = {
      id: `refill-${Date.now()}`,
      patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      medicationId: medication.id,
      medicationName: medication.name,
      dose: medication.dose,
      frequency: medication.frequency,
      refillsRemaining: medication.refillsLeft || 0,
      daysRemaining: Math.floor(medication.daysSupply || 30),
      lastFilled: medication.lastFilled || new Date().toISOString().slice(0, 10),
      pharmacy: medication.pharmacy || patient.preferredPharmacy || '',
      pharmacyPhone: medication.pharmacyPhone || patient.preferredPharmacyPhone || '',
      status: 'pending',
      priority: 'normal',
      createdAt: new Date().toISOString(),
      createdBy: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'System',
      queuedAt: null,
      sentAt: null,
      notes: '',
    };

    const updated = [...refillQueue, newRefill];
    saveRefillQueue(updated);
  };

  const handleToggleSelect = (refillId) => {
    const updated = new Set(selectedRefills);
    if (updated.has(refillId)) {
      updated.delete(refillId);
    } else {
      updated.add(refillId);
    }
    setSelectedRefills(updated);
  };

  const handleSelectAll = () => {
    if (selectedRefills.size === filtered.length) {
      setSelectedRefills(new Set());
    } else {
      setSelectedRefills(new Set(filtered.map(r => r.id)));
    }
  };

  const handleQueueRefill = (refillId) => {
    const updated = refillQueue.map(r =>
      r.id === refillId ? { ...r, status: 'queued', queuedAt: new Date().toISOString() } : r
    );
    saveRefillQueue(updated);
  };

  const handleOpenPharmacyModal = (refill) => {
    setSelectedRefillForAction(refill);
    setPharmForm({
      pharmacy: refill.pharmacy,
      refills: refill.refillsRemaining,
      notes: '',
      priority: refill.priority,
    });
    setShowPharmacyModal(true);
  };

  const handleSendRefill = (refillId) => {
    const updated = refillQueue.map(r => {
      if (r.id === refillId) {
        return {
          ...r,
          status: 'sent',
          sentAt: new Date().toISOString(),
          pharmacy: pharmForm.pharmacy,
          refillsRemaining: pharmForm.refills,
          notes: pharmForm.notes,
          priority: pharmForm.priority,
        };
      }
      return r;
    });
    saveRefillQueue(updated);
    setShowPharmacyModal(false);
    setSelectedRefillForAction(null);
  };

  const handleBulkQueue = () => {
    const updated = refillQueue.map(r =>
      selectedRefills.has(r.id) ? { ...r, status: 'queued', queuedAt: new Date().toISOString() } : r
    );
    saveRefillQueue(updated);
    setSelectedRefills(new Set());
  };

  const handleBulkSend = async () => {
    if (!pharmForm.pharmacy) {
      alert('Please select a pharmacy');
      return;
    }

    setBulkSending(true);
    // Simulate sending refills
    await new Promise(resolve => setTimeout(resolve, 800));

    const updated = refillQueue.map(r => {
      if (selectedRefills.has(r.id)) {
        return {
          ...r,
          status: 'sent',
          sentAt: new Date().toISOString(),
          pharmacy: pharmForm.pharmacy,
          refillsRemaining: pharmForm.refills,
          notes: pharmForm.notes,
          priority: pharmForm.priority,
        };
      }
      return r;
    });
    saveRefillQueue(updated);
    setSelectedRefills(new Set());
    setBulkSending(false);
  };

  const handleDeleteRefill = (refillId) => {
    const updated = refillQueue.filter(r => r.id !== refillId);
    saveRefillQueue(updated);
  };

  const statusOption = REFILL_STATUSES.find(s => s.id === filterStatus) || REFILL_STATUSES[0];
  const urgentCount = refillQueue.filter(r => r.status === 'pending' && r.daysRemaining <= 7).length;
  const queuedCount = refillQueue.filter(r => r.status === 'queued').length;
  const sentTodayCount = refillQueue.filter(r => r.status === 'sent' && r.sentAt?.includes(new Date().toISOString().slice(0, 10))).length;

  return (
    <div className="fade-in" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px 0' }}>💊 Prescription Refill Queue</h1>
        <p style={{ fontSize: 14, opacity: 0.9, margin: '0 0 20px 0' }}>Track, manage, and send refills to pharmacies</p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 11, opacity: 0.9 }}>⏳ Pending</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{refillQueue.filter(r => r.status === 'pending').length}</div>
            {urgentCount > 0 && <div style={{ fontSize: 11, color: '#fbbf24' }}>🔴 {urgentCount} urgent (≤7 days)</div>}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 11, opacity: 0.9 }}>📋 Queued</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{queuedCount}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 11, opacity: 0.9 }}>✅ Sent Today</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{sentTodayCount}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 11, opacity: 0.9 }}>💼 Total</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{refillQueue.length}</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        {/* Toolbar */}
        <div style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search patient, medication, or pharmacy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, minWidth: 200, padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
            >
              {REFILL_STATUSES.map(s => (
                <option key={s.id} value={s.id}>{s.label} ({refillQueue.filter(r => r.status === s.id).length})</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
            >
              <option value="daysRemaining">Sort: Days Remaining</option>
              <option value="patient">Sort: Patient Name</option>
              <option value="medication">Sort: Medication</option>
            </select>
          </div>

          {selectedRefills.size > 0 && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>
                {selectedRefills.size} selected
              </span>
              <button
                onClick={handleBulkQueue}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#3b82f6',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                📋 Queue Selected
              </button>
              <button
                onClick={() => setShowPharmacyModal(true)}
                disabled={bulkSending}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#10b981',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: bulkSending ? 'not-allowed' : 'pointer',
                  opacity: bulkSending ? 0.7 : 1,
                }}
              >
                {bulkSending ? '⏳ Sending...' : '✅ Send to Pharmacy'}
              </button>
            </div>
          )}
        </div>

        {/* Refill List */}
        {filtered.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#0f172a' }}>No refills found</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              {searchTerm ? 'Try adjusting your search filters' : 'All caught up! No pending refills to process'}
            </div>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                    <input
                      type="checkbox"
                      checked={selectedRefills.size === filtered.length && filtered.length > 0}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b' }}>Patient</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b' }}>Medication</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b' }}>Days Left</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b' }}>Pharmacy</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b' }}>Priority</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#64748b' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((refill) => {
                  const statusOption = REFILL_STATUSES.find(s => s.id === refill.status);
                  const priorityOption = REFILL_PRIORITIES.find(p => p.id === refill.priority);
                  const isUrgent = refill.daysRemaining <= 7;

                  return (
                    <tr key={refill.id} style={{ borderBottom: '1px solid #e2e8f0', hover: { background: '#f9fafb' } }}>
                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="checkbox"
                          checked={selectedRefills.has(refill.id)}
                          onChange={() => handleToggleSelect(refill.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        {refill.patientName}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                        <div style={{ fontWeight: 600 }}>{refill.medicationName}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{refill.dose} · {refill.frequency}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: isUrgent ? '#dc2626' : '#64748b' }}>
                        {isUrgent && <span style={{ marginRight: 4 }}>🔴</span>}
                        {refill.daysRemaining}d
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                        {refill.pharmacy || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          background: priorityOption?.color ? `${priorityOption.color}20` : '#f3f4f6',
                          color: priorityOption?.color || '#6b7280',
                        }}>
                          {priorityOption?.label || 'Normal'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          background: statusOption.bg,
                          border: `1px solid ${statusOption.border}`,
                          color: statusOption.color,
                        }}>
                          {statusOption.icon} {statusOption.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          {refill.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleQueueRefill(refill.id)}
                                title="Queue this refill"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 4,
                                  border: '1px solid #cbd5e1',
                                  background: 'white',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  color: '#3b82f6',
                                }}
                              >
                                📋
                              </button>
                              <button
                                onClick={() => handleOpenPharmacyModal(refill)}
                                title="Send to pharmacy"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 4,
                                  border: '1px solid #cbd5e1',
                                  background: 'white',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  color: '#10b981',
                                }}
                              >
                                ✉️
                              </button>
                            </>
                          )}
                          {refill.status === 'queued' && (
                            <button
                              onClick={() => handleOpenPharmacyModal(refill)}
                              title="Send to pharmacy"
                              style={{
                                padding: '4px 8px',
                                borderRadius: 4,
                                border: '1px solid #cbd5e1',
                                background: '#3b82f6',
                                color: 'white',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              ✅ Send
                            </button>
                          )}
                          {['sent', 'filled'].includes(refill.status) && (
                            <button
                              onClick={() => setShowDetails(showDetails === refill.id ? null : refill.id)}
                              title="View details"
                              style={{
                                padding: '4px 8px',
                                borderRadius: 4,
                                border: '1px solid #cbd5e1',
                                background: 'white',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                color: '#64748b',
                              }}
                            >
                              👁️
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRefill(refill.id)}
                            title="Delete refill"
                            style={{
                              padding: '4px 8px',
                              borderRadius: 4,
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#dc2626',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Expanded Details */}
            {showDetails && (
              <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: 16 }}>
                {filtered.find(r => r.id === showDetails) && (() => {
                  const refill = filtered.find(r => r.id === showDetails);
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>Created</div>
                        <div style={{ fontSize: 13, color: '#0f172a' }}>{new Date(refill.createdAt).toLocaleDateString()}</div>
                      </div>
                      {refill.queuedAt && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>Queued</div>
                          <div style={{ fontSize: 13, color: '#0f172a' }}>{new Date(refill.queuedAt).toLocaleDateString()}</div>
                        </div>
                      )}
                      {refill.sentAt && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>Sent</div>
                          <div style={{ fontSize: 13, color: '#0f172a' }}>{new Date(refill.sentAt).toLocaleDateString()}</div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>Created By</div>
                        <div style={{ fontSize: 13, color: '#0f172a' }}>{refill.createdBy}</div>
                      </div>
                      {refill.notes && (
                        <div style={{ gridColumn: '1/-1' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>Notes</div>
                          <div style={{ fontSize: 13, color: '#475569', background: 'white', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                            {refill.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pharmacy Modal */}
      {showPharmacyModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: 24,
        }}>
          <div style={{
            background: 'white', borderRadius: 12, width: '100%', maxWidth: 500,
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)', overflow: 'hidden',
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>
                {selectedRefillForAction ? '✉️ Send Refill to Pharmacy' : '✅ Send Refills in Bulk'}
              </div>
              {selectedRefillForAction && (
                <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>
                  {selectedRefillForAction.medicationName} ({selectedRefillForAction.dose})
                </div>
              )}
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Pharmacy *</label>
                <input
                  type="text"
                  value={pharmForm.pharmacy}
                  onChange={(e) => setPharmForm(prev => ({ ...prev, pharmacy: e.target.value }))}
                  placeholder="e.g., CVS - Main St"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Refills to Authorize</label>
                <input
                  type="number"
                  value={pharmForm.refills}
                  onChange={(e) => setPharmForm(prev => ({ ...prev, refills: parseInt(e.target.value) || 0 }))}
                  min="0"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Priority</label>
                <select
                  value={pharmForm.priority}
                  onChange={(e) => setPharmForm(prev => ({ ...prev, priority: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
                >
                  {REFILL_PRIORITIES.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569' }}>Notes (Optional)</label>
                <textarea
                  value={pharmForm.notes}
                  onChange={(e) => setPharmForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g., Patient has insurance, call if any issues..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => {
                  setShowPharmacyModal(false);
                  setSelectedRefillForAction(null);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedRefillForAction) {
                    handleSendRefill(selectedRefillForAction.id);
                  } else {
                    handleBulkSend();
                  }
                }}
                disabled={bulkSending || !pharmForm.pharmacy}
                style={{
                  padding: '10px 20px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#10b981',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: !pharmForm.pharmacy || bulkSending ? 'not-allowed' : 'pointer',
                  opacity: !pharmForm.pharmacy || bulkSending ? 0.6 : 1,
                }}
              >
                {bulkSending ? '⏳ Sending...' : '✅ Send to Pharmacy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
