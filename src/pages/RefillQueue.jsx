import React, { useState, useEffect } from 'react';
import { usePatient } from '../contexts/PatientContext';
import { useAuth } from '../contexts/AuthContext';

const REFILL_STATUSES = [
  { id: 'all', label: 'All', icon: '📄', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
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
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('daysRemaining'); // daysRemaining, patient, medication
  const [refillQueue, setRefillQueue] = useState([]);
  const [selectedRefills, setSelectedRefills] = useState(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const [showPharmacyModal, setShowPharmacyModal] = useState(false);
  const [selectedRefillForAction, setSelectedRefillForAction] = useState(null);
  const [showTelehealth, setShowTelehealth] = useState(false);
  const [selectedPatientForTelehealth, setSelectedPatientForTelehealth] = useState(null);
  const [copiedLinkId, setCopiedLinkId] = useState(null);
  const [pharmForm, setPharmForm] = useState({
    pharmacy: '',
    refills: 0,
    notes: '',
    priority: 'normal',
    verifyInsurance: false,
  });
  const [showDetails, setShowDetails] = useState(null);
  const [toast, setToast] = useState(null);
  const [eligibilityData, setEligibilityData] = useState(null);
  const [verifyingInsurance, setVerifyingInsurance] = useState(false);
  const [copayAmount, setCopayAmount] = useState(null);
  const [editPharmacyRefillId, setEditPharmacyRefillId] = useState(null);
  const [editPharmacyForm, setEditPharmacyForm] = useState({ pharmacy: '', pharmacyAddress: '', pharmacyPhone: '', pharmacyFax: '' });
  const [pharmSuggestions, setPharmSuggestions] = useState([]);
  const [pharmSearchLoading, setPharmSearchLoading] = useState(false);
  const [showPharmDropdown, setShowPharmDropdown] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const openEditPharmacy = (refill) => {
    setEditPharmacyRefillId(refill.id);
    setEditPharmacyForm({
      pharmacy: refill.pharmacy || '',
      pharmacyAddress: refill.pharmacyAddress || '',
      pharmacyPhone: refill.pharmacyPhone || '',
      pharmacyFax: refill.pharmacyFax || '',
    });
  };

  const searchIllinoisPharmacies = async (query) => {
    if (!query || query.trim().length < 2) { setPharmSuggestions([]); setShowPharmDropdown(false); return; }
    setPharmSearchLoading(true);
    try {
      const res = await fetch(
        `https://npiregistry.cms.hhs.gov/api/?version=2.1&enumeration_type=NPI-2&taxonomy_description=pharmacy&state=IL&organization_name=${encodeURIComponent(query.trim())}&limit=12`
      );
      const data = await res.json();
      const results = (data.results || []).map(r => {
        const loc = (r.addresses || []).find(a => a.address_purpose === 'LOCATION') || (r.addresses || [])[0] || {};
        const rawPhone = loc.telephone_number || '';
        const rawFax = loc.fax_number || '';
        const fmt = n => n.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
        return {
          name: (r.basic?.organization_name || '').replace(/\b\w/g, c => c.toUpperCase()),
          address: [loc.address_1, loc.address_2, loc.city, loc.state, loc.postal_code ? loc.postal_code.slice(0,5) : ''].filter(Boolean).join(', '),
          phone: rawPhone ? fmt(rawPhone) : '',
          fax: rawFax ? fmt(rawFax) : '',
        };
      }).filter(r => r.name);
      setPharmSuggestions(results);
      setShowPharmDropdown(results.length > 0);
    } catch {
      setPharmSuggestions([]);
      setShowPharmDropdown(false);
    }
    setPharmSearchLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(() => searchIllinoisPharmacies(editPharmacyForm.pharmacy), 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editPharmacyForm.pharmacy]);

  const saveEditPharmacy = () => {
    const updated = refillQueue.map(r =>
      r.id === editPharmacyRefillId ? { ...r, ...editPharmacyForm } : r
    );
    saveRefillQueue(updated);
    setEditPharmacyRefillId(null);
    showToast('✅ Pharmacy updated');
  };

  const generateTelehealthLink = (patientId) => {
    return `${window.location.origin}/telehealth/join/${patientId}?token=${btoa(patientId + Date.now())}`;
  };

  const copyTelehealthLink = (patientId, patientName) => {
    const link = generateTelehealthLink(patientId);
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLinkId(patientId);
      setTimeout(() => setCopiedLinkId(null), 2000);
    });
  };

  // Load refill data from localStorage — seed mock data for Emmanuel's patients if empty
  useEffect(() => {
    try {
      const stored = localStorage.getItem('clarity_refill_queue') || '[]';
      const data = JSON.parse(stored);
      if (data.length > 0) { setRefillQueue(data); return; }

      const seed = [
        {
          id: 'refill-seed-1',
          patientId: 'pe1', patientName: 'Nadia Osei',
          medicationId: 'mpe1a', medicationName: 'Escitalopram (Lexapro)',
          dose: '10mg', frequency: 'Once daily', refillsRemaining: 4, daysRemaining: 5,
          pharmacy: 'Walgreens – Emmaus Ave',
          pharmacyAddress: '601 Emmaus Ave, Emmaus, PA 18049',
          pharmacyPhone: '(610) 965-5600', pharmacyFax: '(610) 965-5601',
          status: 'pending', priority: 'urgent',
          createdBy: 'Emmanuel Ofori-Danso, NP',
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          notes: 'Patient called – running very low, needs refill ASAP',
        },
        {
          id: 'refill-seed-2',
          patientId: 'pe1', patientName: 'Nadia Osei',
          medicationId: 'mpe1b', medicationName: 'Hydroxyzine',
          dose: '25mg', frequency: 'Every 6 hours as needed', refillsRemaining: 2, daysRemaining: 14,
          pharmacy: 'Walgreens – Emmaus Ave',
          pharmacyAddress: '601 Emmaus Ave, Emmaus, PA 18049',
          pharmacyPhone: '(610) 965-5600', pharmacyFax: '(610) 965-5601',
          status: 'pending', priority: 'normal',
          createdBy: 'Emmanuel Ofori-Danso, NP',
          createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          notes: '',
        },
        {
          id: 'refill-seed-3',
          patientId: 'pe2', patientName: 'Kofi Mensah',
          medicationId: 'mpe2a', medicationName: 'Sertraline (Zoloft)',
          dose: '50mg', frequency: 'Once daily', refillsRemaining: 3, daysRemaining: 3,
          pharmacy: 'CVS Pharmacy – Emmaus',
          pharmacyAddress: '234 Main St, Emmaus, PA 18049',
          pharmacyPhone: '(610) 967-2100', pharmacyFax: '(610) 967-2101',
          status: 'pending', priority: 'urgent',
          createdBy: 'Emmanuel Ofori-Danso, NP',
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          notes: 'Patient has follow-up 6/25 – ensure 30-day supply',
        },
        {
          id: 'refill-seed-4',
          patientId: 'pe2', patientName: 'Kofi Mensah',
          medicationId: 'mpe2b', medicationName: 'Prazosin',
          dose: '1mg', frequency: 'Once daily at bedtime', refillsRemaining: 5, daysRemaining: 20,
          pharmacy: 'CVS Pharmacy – Emmaus',
          pharmacyAddress: '234 Main St, Emmaus, PA 18049',
          pharmacyPhone: '(610) 967-2100', pharmacyFax: '(610) 967-2101',
          status: 'queued', priority: 'normal',
          createdBy: 'Emmanuel Ofori-Danso, NP',
          createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
          queuedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          notes: '',
        },
        {
          id: 'refill-seed-5',
          patientId: 'pe3', patientName: 'Akua Boateng',
          medicationId: 'mpe3a', medicationName: 'Lamotrigine',
          dose: '100mg', frequency: 'Twice daily', refillsRemaining: 2, daysRemaining: 7,
          pharmacy: 'Rite Aid – Bethlehem Pike',
          pharmacyAddress: '1515 Bethlehem Pike, Flourtown, PA 19031',
          pharmacyPhone: '(215) 233-0800', pharmacyFax: '(215) 233-0801',
          status: 'pending', priority: 'high',
          createdBy: 'Emmanuel Ofori-Danso, NP',
          createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          notes: 'Titrating to 150mg next visit – send 100mg for now',
        },
        {
          id: 'refill-seed-6',
          patientId: 'pe3', patientName: 'Akua Boateng',
          medicationId: 'mpe3b', medicationName: 'Quetiapine (Seroquel)',
          dose: '50mg', frequency: 'Once daily at bedtime', refillsRemaining: 1, daysRemaining: 12,
          pharmacy: 'Rite Aid – Bethlehem Pike',
          pharmacyAddress: '1515 Bethlehem Pike, Flourtown, PA 19031',
          pharmacyPhone: '(215) 233-0800', pharmacyFax: '(215) 233-0801',
          status: 'sent', priority: 'normal',
          createdBy: 'Emmanuel Ofori-Danso, NP',
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          sentAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          notes: 'Sleep aid – last refill before re-evaluation',
        },
      ];

      localStorage.setItem('clarity_refill_queue', JSON.stringify(seed));
      setRefillQueue(seed);
    } catch {
      setRefillQueue([]);
    }
  }, []);

  // Filter and sort refills
  const filtered = refillQueue
    .filter(r => {
      if (filterStatus && filterStatus !== 'all' && r.status !== filterStatus) return false;
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
      verifyInsurance: false,
    });
    setEligibilityData(null);
    setCopayAmount(null);
    setShowPharmacyModal(true);
  };

  const handleVerifyInsurance = async () => {
    if (!selectedRefillForAction) return;

    setVerifyingInsurance(true);
    try {
      const response = await fetch(`/api/refills/${selectedRefillForAction.id}/verify-insurance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setEligibilityData(data);
        setCopayAmount(data.copayAmount);
        showToast(`✓ Eligible • Copay: $${data.copayAmount.toFixed(2)}`);
      } else {
        showToast('✗ Eligibility check failed');
      }
    } catch (error) {
      console.error('Insurance verification error:', error);
      showToast('✗ Could not verify insurance');
    } finally {
      setVerifyingInsurance(false);
    }
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
    <div className="fade-in" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <style>{`
        .rq-row:hover { background: #f8fafc !important; }
        .rq-action-btn { transition: all 0.15s !important; }
        .rq-action-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
        .rq-stat-card { transition: transform 0.15s; }
        .rq-stat-card:hover { transform: translateY(-2px); }
        .rq-pharmacy-cell { position: relative; cursor: default; }
        .rq-pharmacy-edit-btn { display: inline-flex; }
        .rq-pharmacy-popup {
          display: none; position: absolute; bottom: calc(100% + 8px); left: 0;
          background: #1e293b; color: white; border-radius: 10px;
          padding: 12px 14px; min-width: 220px; z-index: 100;
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
          pointer-events: none;
        }
        .rq-pharmacy-popup::after {
          content: ''; position: absolute; top: 100%; left: 16px;
          border: 6px solid transparent; border-top-color: #1e293b;
        }
        .rq-pharmacy-cell:hover .rq-pharmacy-popup { display: block; }
      `}</style>

      {/* ── Hero Header ──────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0c1e3e 0%, #0066cc 50%, #2563eb 100%)',
        color: 'white', padding: '44px 32px 40px', position: 'relative', overflow: 'hidden',
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0,102,204,0.35)',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', opacity: 0.7, marginBottom: 6, textTransform: 'uppercase' }}>
            Pharmacy Workflow
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                💊 Prescription Refill Queue
              </h1>
              <p style={{ fontSize: 15, opacity: 0.85, margin: 0 }}>Track, manage, and send refills to pharmacies</p>
            </div>
            {urgentCount > 0 && (
              <div style={{
                background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.5)',
                borderRadius: 10, padding: '10px 18px', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 18 }}>🔴</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{urgentCount} Urgent</div>
                  <div style={{ fontSize: 11, opacity: 0.85 }}>≤7 days remaining</div>
                </div>
              </div>
            )}
          </div>

          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 28 }}>
            {[
              { label: 'Pending', icon: '⏳', value: refillQueue.filter(r => r.status === 'pending').length, sub: urgentCount > 0 ? `${urgentCount} urgent` : 'up to date' },
              { label: 'Queued',  icon: '📋', value: queuedCount,    sub: 'ready to send' },
              { label: 'Sent Today', icon: '✅', value: sentTodayCount, sub: 'dispatched' },
              { label: 'Total',   icon: '💼', value: refillQueue.length, sub: 'all time' },
            ].map(stat => (
              <div key={stat.label} className="rq-stat-card" style={{
                background: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: '14px 16px',
                backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.18)',
              }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>{stat.icon}</span> {stat.label}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', bottom: 24, right: 24,
            background: '#0f172a', color: 'white',
            padding: '12px 20px', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            fontSize: 13, fontWeight: 600, zIndex: 3000,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {toast}
          </div>
        )}

        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div className="card" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#94a3b8' }}>🔍</span>
              <input
                type="text"
                placeholder="Search patient, medication, or pharmacy..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px 10px 34px', borderRadius: 8,
                  border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#374151', background: '#fff' }}
            >
              {REFILL_STATUSES.map(s => (
                <option key={s.id} value={s.id}>{s.icon} {s.label} ({refillQueue.filter(r => r.status === s.id).length})</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#374151', background: '#fff' }}
            >
              <option value="daysRemaining">Sort: Days Remaining</option>
              <option value="patient">Sort: Patient Name</option>
              <option value="medication">Sort: Medication</option>
            </select>
          </div>

          {selectedRefills.size > 0 && (
            <div style={{
              marginTop: 12, display: 'flex', gap: 10, alignItems: 'center',
              padding: '10px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>
                {selectedRefills.size} selected
              </span>
              <button
                className="rq-action-btn"
                onClick={handleBulkQueue}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#3b82f6', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                📋 Queue Selected
              </button>
              <button
                className="rq-action-btn"
                onClick={() => setShowPharmacyModal(true)}
                disabled={bulkSending}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#0066cc', color: 'white', fontSize: 12, fontWeight: 700, cursor: bulkSending ? 'not-allowed' : 'pointer', opacity: bulkSending ? 0.7 : 1 }}
              >
                {bulkSending ? '⏳ Sending...' : '✅ Send to Pharmacy'}
              </button>
            </div>
          )}
        </div>

        {/* ── Refill List ───────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="card" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '56px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🎯</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>No refills found</div>
            <div style={{ fontSize: 14, color: '#64748b' }}>
              {searchTerm ? 'Try adjusting your search or filter' : 'All caught up! No pending refills to process'}
            </div>
          </div>
        ) : (
          <div className="card no-hover" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 16px', width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selectedRefills.size === filtered.length && filtered.length > 0}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  {['Patient', 'Medication', 'Days Left', 'Pharmacy', 'Priority', 'Status', 'Actions'].map(col => (
                    <th key={col} style={{
                      padding: '12px 16px', textAlign: col === 'Actions' ? 'center' : 'left',
                      fontSize: 11, fontWeight: 700, color: '#64748b',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((refill, idx) => {
                  const statusOption = REFILL_STATUSES.find(s => s.id === refill.status);
                  const priorityOption = REFILL_PRIORITIES.find(p => p.id === refill.priority);
                  const isUrgent = refill.daysRemaining <= 7;

                  return (
                    <tr
                      key={refill.id}
                      className="rq-row"
                      style={{
                        borderBottom: idx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                        background: 'white',
                        transition: 'background 0.12s',
                      }}
                    >
                      {/* Urgent left-spine accent via first cell border-left */}
                      <td style={{
                        padding: '14px 16px',
                        borderLeft: isUrgent ? '3px solid #ef4444' : '3px solid transparent',
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedRefills.has(refill.id)}
                          onChange={() => handleToggleSelect(refill.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Patient */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{refill.patientName}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>ID: {refill.patientId?.slice(0,8) || '—'}</div>
                      </td>

                      {/* Medication */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{refill.medicationName}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{refill.dose} · {refill.frequency}</div>
                      </td>

                      {/* Days Left */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: isUrgent ? '#fef2f2' : '#f0fdf4',
                          color: isUrgent ? '#dc2626' : '#166534',
                          borderRadius: 20, padding: '4px 10px',
                          fontSize: 12, fontWeight: 700,
                        }}>
                          {isUrgent ? '🔴' : '🟢'} {refill.daysRemaining}d
                        </div>
                      </td>

                      {/* Pharmacy */}
                      <td className="rq-pharmacy-cell" style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>
                        {refill.pharmacy ? (
                          <>
                            <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                              🏪 {refill.pharmacy}
                              <button
                                className="rq-pharmacy-edit-btn rq-action-btn"
                                onClick={(e) => { e.stopPropagation(); openEditPharmacy(refill); }}
                                title="Edit pharmacy"
                                style={{
                                  alignItems: 'center', gap: 3, padding: '2px 8px',
                                  borderRadius: 6, border: '1.5px solid #e2e8f0',
                                  background: '#f8fafc', fontSize: 11, fontWeight: 600,
                                  color: '#0066cc', cursor: 'pointer',
                                }}
                              >
                                ✏️ Edit
                              </button>
                            </div>
                            {refill.pharmacyAddress && (
                              <div style={{ fontSize: 11, color: '#475569', marginTop: 3, display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                                <span>📍</span><span>{refill.pharmacyAddress}</span>
                              </div>
                            )}
                            {(refill.pharmacyPhone || refill.pharmacyFax) && (
                              <div className="rq-pharmacy-popup">
                                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 6 }}>
                                  🏪 {refill.pharmacy}
                                </div>
                                {refill.pharmacyAddress && (
                                  <div style={{ fontSize: 11, marginBottom: 5, display: 'flex', gap: 6 }}>
                                    <span style={{ opacity: 0.6, flexShrink: 0 }}>📍</span>
                                    <span>{refill.pharmacyAddress}</span>
                                  </div>
                                )}
                                {refill.pharmacyPhone && (
                                  <div style={{ fontSize: 11, marginBottom: 4, display: 'flex', gap: 6 }}>
                                    <span style={{ opacity: 0.6, flexShrink: 0 }}>📞</span>
                                    <span>{refill.pharmacyPhone}</span>
                                  </div>
                                )}
                                {refill.pharmacyFax && (
                                  <div style={{ fontSize: 11, display: 'flex', gap: 6 }}>
                                    <span style={{ opacity: 0.6, flexShrink: 0 }}>📠</span>
                                    <span>{refill.pharmacyFax}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => openEditPharmacy(refill)}
                            style={{
                              padding: '4px 10px', borderRadius: 6, border: '1.5px dashed #cbd5e1',
                              background: 'transparent', fontSize: 12, fontWeight: 600,
                              color: '#0066cc', cursor: 'pointer',
                            }}
                          >
                            + Add pharmacy
                          </button>
                        )}
                      </td>

                      {/* Priority */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                          fontSize: 11, fontWeight: 700,
                          background: priorityOption?.color ? `${priorityOption.color}18` : '#f3f4f6',
                          color: priorityOption?.color || '#6b7280',
                          border: `1px solid ${priorityOption?.color ? `${priorityOption.color}40` : '#e5e7eb'}`,
                        }}>
                          {priorityOption?.label || 'Normal'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px', borderRadius: 20,
                          fontSize: 11, fontWeight: 700,
                          background: statusOption.bg,
                          border: `1px solid ${statusOption.border}`,
                          color: statusOption.color,
                        }}>
                          {statusOption.icon} {statusOption.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            className="rq-action-btn"
                            onClick={() => { setSelectedPatientForTelehealth(refill.patientId); setShowTelehealth(true); }}
                            title="Send telehealth link"
                            style={{
                              padding: '5px 10px', borderRadius: 6,
                              border: '1.5px solid #e0f2fe',
                              background: copiedLinkId === refill.patientId ? '#059669' : '#f0f9ff',
                              color: copiedLinkId === refill.patientId ? 'white' : '#0891b2',
                              fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            {copiedLinkId === refill.patientId ? '✅' : '🔗'}
                          </button>

                          {refill.status === 'pending' && (<>
                            <button
                              className="rq-action-btn"
                              onClick={() => handleQueueRefill(refill.id)}
                              title="Queue this refill"
                              style={{
                                padding: '5px 10px', borderRadius: 6,
                                border: '1.5px solid #dbeafe', background: '#eff6ff',
                                fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#2563eb',
                              }}
                            >📋</button>
                            <button
                              className="rq-action-btn"
                              onClick={() => handleOpenPharmacyModal(refill)}
                              title="Send to pharmacy"
                              style={{
                                padding: '5px 10px', borderRadius: 6,
                                border: '1.5px solid #d1fae5', background: '#f0fdf4',
                                fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#059669',
                              }}
                            >✉️</button>
                          </>)}

                          {refill.status === 'queued' && (
                            <button
                              className="rq-action-btn"
                              onClick={() => handleOpenPharmacyModal(refill)}
                              title="Send to pharmacy"
                              style={{
                                padding: '5px 10px', borderRadius: 6, border: 'none',
                                background: '#0066cc', color: 'white',
                                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              }}
                            >✅ Send</button>
                          )}

                          {['sent', 'filled'].includes(refill.status) && (
                            <button
                              className="rq-action-btn"
                              onClick={() => setShowDetails(showDetails === refill.id ? null : refill.id)}
                              title="View details"
                              style={{
                                padding: '5px 10px', borderRadius: 6,
                                border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#64748b',
                              }}
                            >👁️</button>
                          )}

                          <button
                            className="rq-action-btn"
                            onClick={() => handleDeleteRefill(refill.id)}
                            title="Delete refill"
                            style={{
                              padding: '5px 10px', borderRadius: 6,
                              border: '1.5px solid #fecaca', background: '#fef2f2',
                              color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            }}
                          >🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Expanded Details */}
            {showDetails && filtered.find(r => r.id === showDetails) && (() => {
              const refill = filtered.find(r => r.id === showDetails);
              return (
                <div style={{
                  background: '#f8fafc', borderTop: '2px solid #e5e7eb',
                  padding: '20px 24px',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>
                    Refill Details
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                    {[
                      { label: 'Created', value: new Date(refill.createdAt).toLocaleDateString() },
                      refill.queuedAt && { label: 'Queued', value: new Date(refill.queuedAt).toLocaleDateString() },
                      refill.sentAt && { label: 'Sent', value: new Date(refill.sentAt).toLocaleDateString() },
                      { label: 'Created By', value: refill.createdBy },
                    ].filter(Boolean).map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{value}</div>
                      </div>
                    ))}
                    {refill.notes && (
                      <div style={{ gridColumn: '1/-1' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Notes</div>
                        <div style={{ fontSize: 13, color: '#475569', background: 'white', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          {refill.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── Pharmacy Modal ───────────────────────────────────────────────────── */}
      {showPharmacyModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: 24, backdropFilter: 'blur(4px)',
        }}>
          <div className="card no-hover" style={{
            borderRadius: 16, width: '100%', maxWidth: 520,
            boxShadow: '0 24px 64px rgba(0,0,0,0.28)', overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{
              background: 'linear-gradient(135deg, #0c1e3e 0%, #0066cc 50%, #2563eb 100%)',
              color: 'white', padding: '22px 28px', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>
                  {selectedRefillForAction ? '✉️ Send Refill to Pharmacy' : '✅ Bulk Send to Pharmacy'}
                </div>
                {selectedRefillForAction && (
                  <div style={{ fontSize: 13, opacity: 0.85, marginTop: 5 }}>
                    {selectedRefillForAction.medicationName} · {selectedRefillForAction.dose}
                  </div>
                )}
                {!selectedRefillForAction && (
                  <div style={{ fontSize: 13, opacity: 0.85, marginTop: 5 }}>
                    {selectedRefills.size} refill{selectedRefills.size > 1 ? 's' : ''} selected
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '24px 28px' }}>
              {/* Insurance check */}
              <div style={{ marginBottom: 18, padding: '12px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: pharmForm.verifyInsurance ? 10 : 0 }}>
                  <input type="checkbox" id="verify-insurance"
                    checked={pharmForm.verifyInsurance}
                    onChange={(e) => setPharmForm(prev => ({ ...prev, verifyInsurance: e.target.checked }))}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="verify-insurance" style={{ fontSize: 13, fontWeight: 700, color: '#166534', cursor: 'pointer' }}>
                    Verify insurance eligibility before sending
                  </label>
                </div>
                {pharmForm.verifyInsurance && !eligibilityData && (
                  <button onClick={handleVerifyInsurance} disabled={verifyingInsurance}
                    style={{
                      padding: '6px 14px', borderRadius: 6, border: '1px solid #86efac',
                      background: 'white', color: '#166534', fontSize: 12, fontWeight: 700,
                      cursor: verifyingInsurance ? 'not-allowed' : 'pointer', opacity: verifyingInsurance ? 0.6 : 1,
                    }}>
                    {verifyingInsurance ? '⏳ Checking...' : '✓ Check Eligibility'}
                  </button>
                )}
                {eligibilityData && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>
                    ✓ Eligible · Coverage: {eligibilityData.coverageType} · Copay: ${eligibilityData.copayAmount.toFixed(2)}
                  </div>
                )}
              </div>

              {/* Copay */}
              {copayAmount && (
                <div style={{ marginBottom: 18, padding: '12px 14px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fcd34d' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#78350f', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>💰 Estimated Copay</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#92400e' }}>${copayAmount.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>Verify final amount with pharmacy.</div>
                </div>
              )}

              {/* Form fields */}
              {[
                {
                  label: 'Pharmacy', required: true,
                  input: <input type="text" value={pharmForm.pharmacy}
                    onChange={(e) => setPharmForm(prev => ({ ...prev, pharmacy: e.target.value }))}
                    placeholder="e.g., CVS - Main St"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                  />,
                },
                {
                  label: 'Refills to Authorize',
                  input: <input type="number" value={pharmForm.refills} min="0"
                    onChange={(e) => setPharmForm(prev => ({ ...prev, refills: parseInt(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                  />,
                },
                {
                  label: 'Priority',
                  input: <select value={pharmForm.priority}
                    onChange={(e) => setPharmForm(prev => ({ ...prev, priority: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, background: '#fff', outline: 'none' }}>
                    {REFILL_PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>,
                },
              ].map(({ label, required, input }) => (
                <div key={label} style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569', letterSpacing: '0.04em' }}>
                    {label}{required && <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span>}
                  </label>
                  {input}
                </div>
              ))}

              <div style={{ marginBottom: 4 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#475569', letterSpacing: '0.04em' }}>Notes <span style={{ color: '#94a3b8', fontWeight: 500 }}>(optional)</span></label>
                <textarea value={pharmForm.notes}
                  onChange={(e) => setPharmForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g., Patient has insurance, call if any issues..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ padding: '16px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#fafafa' }}>
              <button
                onClick={() => { setShowPharmacyModal(false); setSelectedRefillForAction(null); }}
                style={{ padding: '10px 22px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#374151' }}
              >
                Cancel
              </button>
              <button
                onClick={() => selectedRefillForAction ? handleSendRefill(selectedRefillForAction.id) : handleBulkSend()}
                disabled={bulkSending || !pharmForm.pharmacy}
                style={{
                  padding: '10px 22px', borderRadius: 8, border: 'none',
                  background: !pharmForm.pharmacy || bulkSending ? '#9ca3af' : '#0066cc',
                  color: 'white', fontSize: 13, fontWeight: 700,
                  cursor: !pharmForm.pharmacy || bulkSending ? 'not-allowed' : 'pointer',
                }}
              >
                {bulkSending ? '⏳ Sending...' : '✅ Send to Pharmacy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Pharmacy Modal ──────────────────────────────────────────────── */}
      {editPharmacyRefillId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: 24, backdropFilter: 'blur(4px)',
        }}>
          <div className="card no-hover" style={{
            borderRadius: 16, width: '100%', maxWidth: 460,
            boxShadow: '0 24px 64px rgba(0,0,0,0.28)', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0c1e3e 0%, #0066cc 50%, #2563eb 100%)',
              color: 'white', padding: '20px 24px', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ fontWeight: 800, fontSize: 17 }}>🏪 Edit Pharmacy</div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                  {refillQueue.find(r => r.id === editPharmacyRefillId)?.patientName} ·{' '}
                  {refillQueue.find(r => r.id === editPharmacyRefillId)?.medicationName}
                </div>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>

              {/* ── Pharmacy Name with IL autocomplete ── */}
              <div style={{ marginBottom: 14, position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 5, letterSpacing: '0.04em' }}>
                  Pharmacy Name <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span>
                  <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 6, textTransform: 'none', letterSpacing: 0 }}>— type to search Illinois pharmacies</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={editPharmacyForm.pharmacy}
                    onChange={e => {
                      setEditPharmacyForm(prev => ({ ...prev, pharmacy: e.target.value }));
                      setShowPharmDropdown(true);
                    }}
                    placeholder="e.g. Walgreens, CVS, Rite Aid…"
                    autoComplete="off"
                    style={{
                      width: '100%', padding: '10px 36px 10px 12px', borderRadius: 8,
                      border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#0066cc';
                      if (pharmSuggestions.length > 0) setShowPharmDropdown(true);
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#e2e8f0';
                      setTimeout(() => setShowPharmDropdown(false), 180);
                    }}
                  />
                  {pharmSearchLoading && (
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#94a3b8' }}>
                      🔍
                    </span>
                  )}
                </div>

                {/* Suggestions dropdown */}
                {showPharmDropdown && pharmSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0,
                    background: 'white', border: '1.5px solid #dbeafe',
                    borderRadius: 10, boxShadow: '0 8px 28px rgba(0,102,204,0.15)',
                    zIndex: 9999, maxHeight: 220, overflowY: 'auto',
                  }}>
                    <div style={{ padding: '6px 12px 4px', fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>
                      Illinois Pharmacies
                    </div>
                    {pharmSuggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={() => {
                          setEditPharmacyForm({
                            pharmacy: s.name,
                            pharmacyAddress: s.address,
                            pharmacyPhone: s.phone,
                            pharmacyFax: s.fax,
                          });
                          setShowPharmDropdown(false);
                          setPharmSuggestions([]);
                        }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '9px 12px', border: 'none', background: 'transparent',
                          borderBottom: i < pharmSuggestions.length - 1 ? '1px solid #f8fafc' : 'none',
                          cursor: 'pointer', transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>🏪 {s.name}</div>
                        {s.address && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>📍 {s.address}</div>}
                        {s.phone && <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>📞 {s.phone}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Remaining fields ── */}
              {[
                { label: 'Address', key: 'pharmacyAddress', placeholder: 'e.g. 123 Main St, Chicago, IL 60601' },
                { label: 'Phone', key: 'pharmacyPhone', placeholder: 'e.g. (312) 555-0100' },
                { label: 'Fax', key: 'pharmacyFax', placeholder: 'e.g. (312) 555-0101' },
              ].map(({ label, key, placeholder }) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 5, letterSpacing: '0.04em' }}>
                    {label}
                  </label>
                  <input
                    type="text"
                    value={editPharmacyForm[key]}
                    onChange={e => setEditPharmacyForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = '#0066cc'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              ))}
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#fafafa' }}>
              <button
                onClick={() => setEditPharmacyRefillId(null)}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#374151' }}
              >
                Cancel
              </button>
              <button
                onClick={saveEditPharmacy}
                disabled={!editPharmacyForm.pharmacy.trim()}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: editPharmacyForm.pharmacy.trim() ? '#0066cc' : '#9ca3af',
                  color: 'white', fontSize: 13, fontWeight: 700,
                  cursor: editPharmacyForm.pharmacy.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Save Pharmacy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Telehealth Modal ─────────────────────────────────────────────────── */}
      {showTelehealth && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: 24, backdropFilter: 'blur(4px)',
        }}>
          <div className="card no-hover" style={{
            width: '100%', maxWidth: 480,
            boxShadow: '0 24px 64px rgba(0,0,0,0.28)', overflow: 'hidden',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0891b2 100%)',
              color: 'white', padding: '22px 28px', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>🔗 Share Telehealth Link</div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 5 }}>Send to patient for video consultation</div>
              </div>
            </div>

            <div style={{ padding: '24px 28px' }}>
              {/* Link box */}
              <div style={{ marginBottom: 18, padding: '14px', background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Telehealth Link</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'white', border: '1.5px solid #e0f2fe', borderRadius: 8, padding: '10px 12px' }}>
                  <span style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', color: '#0369a1', wordBreak: 'break-all' }}>
                    {generateTelehealthLink(selectedPatientForTelehealth)}
                  </span>
                  <button
                    onClick={() => copyTelehealthLink(selectedPatientForTelehealth, '')}
                    style={{
                      padding: '5px 12px', borderRadius: 6, border: 'none', whiteSpace: 'nowrap',
                      background: copiedLinkId === selectedPatientForTelehealth ? '#059669' : '#0369a1',
                      color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    {copiedLinkId === selectedPatientForTelehealth ? '✅ Copied' : '📋 Copy'}
                  </button>
                </div>
              </div>

              {/* Patient ready note */}
              <div style={{ marginBottom: 18, padding: '12px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.6 }}>
                  <strong>✅ Patient Ready</strong> — Share this link via email, SMS, or chat. Patient can click to join directly.
                </div>
              </div>

              {/* Send options */}
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Send Via</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  { icon: '📧', label: 'Email Patient', toast: '📧 Link copied! Send via email' },
                  { icon: '💬', label: 'Text / Message Patient', toast: '💬 Link copied! Send via SMS' },
                ].map(({ icon, label, toast: t }) => (
                  <button key={label}
                    className="rq-action-btn"
                    onClick={() => { copyTelehealthLink(selectedPatientForTelehealth, ''); showToast(t); }}
                    style={{
                      padding: '12px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                      background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      color: '#0f172a', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{icon}</span> {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '16px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', background: '#fafafa' }}>
              <button
                onClick={() => { setShowTelehealth(false); setSelectedPatientForTelehealth(null); }}
                style={{ padding: '10px 22px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#374151' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
