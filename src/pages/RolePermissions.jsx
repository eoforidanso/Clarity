import React, { useState, useMemo } from 'react';

// ─── Role Definitions ─────────────────────────────────────────────────────────
const ROLES = [
  {
    id: 'super_admin', label: 'Super Admin', icon: '👑', color: '#7c3aed', bg: '#f5f3ff',
    description: 'Full system access — platform-wide settings, user management, all clinics',
    userCount: 1,
  },
  {
    id: 'physician', label: 'Physician / MD / PhD', icon: '🩺', color: '#1d4ed8', bg: '#eff6ff',
    description: 'Full clinical access — prescribe, sign notes, order labs, view all charts',
    userCount: 2,
  },
  {
    id: 'np', label: 'NP / PMHNP', icon: '💊', color: '#0e7490', bg: '#ecfeff',
    description: 'Clinical prescriber — full clinical except DEA schedule II override',
    userCount: 1,
  },
  {
    id: 'therapist', label: 'LCSW / Therapist', icon: '🧠', color: '#059669', bg: '#f0fdf4',
    description: 'Therapy-only — notes, treatment plans, messaging. Cannot prescribe.',
    userCount: 3,
  },
  {
    id: 'nurse', label: 'Nurse / Medical Assistant', icon: '🩻', color: '#16a34a', bg: '#f0fdf4',
    description: 'Clinical support — vitals, medication reconciliation, order results.',
    userCount: 2,
  },
  {
    id: 'front_desk', label: 'Front Desk / Receptionist', icon: '🗂️', color: '#d97706', bg: '#fef3c7',
    description: 'Scheduling, check-in, insurance verification. No clinical note access.',
    userCount: 3,
  },
  {
    id: 'billing', label: 'Billing Staff', icon: '💰', color: '#dc2626', bg: '#fef2f2',
    description: 'Billing, claims, ERA posting. PHI access limited to billing demographics.',
    userCount: 2,
  },
  {
    id: 'readonly', label: 'Read-Only / Supervisor', icon: '👁️', color: '#6b7280', bg: '#f9fafb',
    description: 'Supervisory view — read charts and reports. Cannot create or modify records.',
    userCount: 1,
  },
];

// ─── Permission Categories ─────────────────────────────────────────────────────
const PERMISSIONS = [
  {
    category: 'Clinical — Charts',
    perms: [
      { id: 'chart.view',       label: 'View Patient Charts' },
      { id: 'chart.edit',       label: 'Edit / Update Charts' },
      { id: 'chart.sign',       label: 'Sign Clinical Notes' },
      { id: 'chart.btg',        label: 'Break-The-Glass (Emergency Access)' },
      { id: 'chart.export',     label: 'Export / Print Chart' },
    ],
  },
  {
    category: 'Clinical — Orders & Rx',
    perms: [
      { id: 'rx.prescribe',     label: 'Prescribe Medications (e-Prescribe)' },
      { id: 'rx.controlled',    label: 'Prescribe Controlled Substances (DEA)' },
      { id: 'orders.labs',      label: 'Order Laboratory Tests' },
      { id: 'orders.imaging',   label: 'Order Imaging / Radiology' },
      { id: 'orders.referral',  label: 'Create Referrals' },
    ],
  },
  {
    category: 'Clinical — Treatment',
    perms: [
      { id: 'tx.plans',         label: 'Create / Edit Treatment Plans' },
      { id: 'tx.goals',         label: 'Update Goal Progress' },
      { id: 'tx.outcomes',      label: 'Record Outcome Measures (PHQ-9, GAD-7)' },
      { id: 'tx.priorauth',     label: 'Submit Prior Authorization Requests' },
      { id: 'tx.careplan',      label: 'Approve & Co-sign Care Plans' },
    ],
  },
  {
    category: 'Scheduling & Front Desk',
    perms: [
      { id: 'sched.view',       label: 'View Schedule' },
      { id: 'sched.manage',     label: 'Create / Modify Appointments' },
      { id: 'sched.checkin',    label: 'Patient Check-In / Check-Out' },
      { id: 'sched.waitlist',   label: 'Manage Waitlist' },
      { id: 'sched.reminders',  label: 'Send Appointment Reminders' },
    ],
  },
  {
    category: 'Billing & Revenue Cycle',
    perms: [
      { id: 'bill.view',        label: 'View Billing Dashboard' },
      { id: 'bill.claims',      label: 'Create / Submit Claims' },
      { id: 'bill.era',         label: 'Post Remittances (ERA)' },
      { id: 'bill.payer',       label: 'Manage Payer Profiles & Contracts' },
      { id: 'bill.statements',  label: 'Generate Patient Statements' },
      { id: 'bill.void',        label: 'Void / Adjust Claims' },
    ],
  },
  {
    category: 'Patient Communication',
    perms: [
      { id: 'msg.staff',        label: 'Staff Messaging' },
      { id: 'msg.patient',      label: 'Secure Patient Messaging' },
      { id: 'msg.broadcast',    label: 'Broadcast / Mass Notifications' },
      { id: 'efax.send',        label: 'Send / Receive eFax' },
    ],
  },
  {
    category: 'Analytics & Reporting',
    perms: [
      { id: 'analytics.view',   label: 'View Analytics Dashboard' },
      { id: 'analytics.outcomes', label: 'View Clinical Outcomes Dashboard' },
      { id: 'report.build',     label: 'Build Custom Reports' },
      { id: 'report.export',    label: 'Export Reports / Data' },
      { id: 'audit.view',       label: 'View Audit Trail' },
    ],
  },
  {
    category: 'Administration & Security',
    perms: [
      { id: 'admin.users',      label: 'Manage Users & Roles' },
      { id: 'admin.roles',      label: 'Edit Role Permissions (this page)' },
      { id: 'admin.clinics',    label: 'Manage Clinic Locations' },
      { id: 'admin.settings',   label: 'System Settings' },
      { id: 'admin.integrations', label: 'Configure Integrations / APIs' },
      { id: 'admin.audit_config', label: 'Configure Audit & Compliance Rules' },
    ],
  },
];

// ─── Default Permission Matrix ─────────────────────────────────────────────────
const DEFAULT_MATRIX = {
  super_admin: new Set(PERMISSIONS.flatMap(c => c.perms.map(p => p.id))),
  physician:   new Set(['chart.view','chart.edit','chart.sign','chart.btg','chart.export','rx.prescribe','rx.controlled','orders.labs','orders.imaging','orders.referral','tx.plans','tx.goals','tx.outcomes','tx.priorauth','tx.careplan','sched.view','sched.manage','msg.staff','msg.patient','efax.send','analytics.view','analytics.outcomes','report.build','report.export']),
  np:          new Set(['chart.view','chart.edit','chart.sign','chart.btg','chart.export','rx.prescribe','orders.labs','orders.referral','tx.plans','tx.goals','tx.outcomes','tx.priorauth','sched.view','sched.manage','msg.staff','msg.patient','efax.send','analytics.view','analytics.outcomes']),
  therapist:   new Set(['chart.view','chart.edit','chart.sign','chart.export','tx.plans','tx.goals','tx.outcomes','orders.referral','sched.view','msg.staff','msg.patient','analytics.view','analytics.outcomes']),
  nurse:       new Set(['chart.view','chart.edit','orders.labs','tx.goals','tx.outcomes','sched.view','sched.checkin','msg.staff','efax.send']),
  front_desk:  new Set(['sched.view','sched.manage','sched.checkin','sched.waitlist','sched.reminders','msg.staff','msg.patient','efax.send']),
  billing:     new Set(['bill.view','bill.claims','bill.era','bill.payer','bill.statements','bill.void','analytics.view','report.build','report.export','msg.staff']),
  readonly:    new Set(['chart.view','sched.view','analytics.view','analytics.outcomes','report.build','audit.view']),
};

// ─── Clinic Locations ─────────────────────────────────────────────────────────
const CLINICS = [
  { id: 'clinic-main',  label: 'Main Clinic', address: '100 Healthcare Blvd, Suite 200' },
  { id: 'clinic-north', label: 'North Satellite', address: '450 Medical Park Dr' },
  { id: 'clinic-south', label: 'South Annex', address: '1200 Southside Ave' },
  { id: 'clinic-virtual', label: 'Virtual / Telehealth', address: 'Remote — statewide' },
];

// Default clinic access per role
const DEFAULT_CLINIC_ACCESS = {
  super_admin: new Set(['clinic-main','clinic-north','clinic-south','clinic-virtual']),
  physician:   new Set(['clinic-main','clinic-north','clinic-virtual']),
  np:          new Set(['clinic-main','clinic-virtual']),
  therapist:   new Set(['clinic-main','clinic-south','clinic-virtual']),
  nurse:       new Set(['clinic-main','clinic-north']),
  front_desk:  new Set(['clinic-main']),
  billing:     new Set(['clinic-main','clinic-north','clinic-south','clinic-virtual']),
  readonly:    new Set(['clinic-main']),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function deepCopyMatrix(m) {
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, new Set(v)]));
}
function deepCopyClinic(m) {
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, new Set(v)]));
}

// ─── Toggle Icon ──────────────────────────────────────────────────────────────
function ToggleSwitch({ on, onChange, disabled = false }) {
  return (
    <button onClick={() => !disabled && onChange(!on)} title={disabled ? 'Cannot remove from Super Admin' : (on ? 'Revoke permission' : 'Grant permission')}
      style={{ width: 32, height: 18, borderRadius: 9, border: 'none', background: on ? '#059669' : '#d1d5db', cursor: disabled ? 'default' : 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, outline: 'none', padding: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 15 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RolePermissions() {
  const [selectedRoleId, setSelectedRoleId] = useState('physician');
  const [matrix, setMatrix] = useState(() => deepCopyMatrix(DEFAULT_MATRIX));
  const [clinicAccess, setClinicAccess] = useState(() => deepCopyClinic(DEFAULT_CLINIC_ACCESS));
  const [hasChanges, setHasChanges] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState('permissions');
  const [search, setSearch] = useState('');
  const [showMatrix, setShowMatrix] = useState(false);

  const selectedRole = ROLES.find(r => r.id === selectedRoleId) || ROLES[0];
  const rolePerms = matrix[selectedRoleId] || new Set();
  const roleClinics = clinicAccess[selectedRoleId] || new Set();

  const allPermIds = PERMISSIONS.flatMap(c => c.perms.map(p => p.id));
  const grantedCount = rolePerms.size;
  const totalCount   = allPermIds.length;

  const filteredCategories = useMemo(() => {
    if (!search) return PERMISSIONS;
    const q = search.toLowerCase();
    return PERMISSIONS.map(cat => ({
      ...cat,
      perms: cat.perms.filter(p => p.label.toLowerCase().includes(q) || p.id.includes(q)),
    })).filter(cat => cat.perms.length > 0 || cat.category.toLowerCase().includes(q));
  }, [search]);

  const togglePerm = (permId) => {
    if (selectedRoleId === 'super_admin') return; // super admin always full
    setMatrix(prev => {
      const next = deepCopyMatrix(prev);
      if (next[selectedRoleId].has(permId)) {
        next[selectedRoleId].delete(permId);
      } else {
        next[selectedRoleId].add(permId);
      }
      return next;
    });
    setHasChanges(true);
    setSaved(false);
  };

  const toggleClinic = (clinicId) => {
    if (selectedRoleId === 'super_admin') return;
    setClinicAccess(prev => {
      const next = deepCopyClinic(prev);
      if (next[selectedRoleId].has(clinicId)) {
        next[selectedRoleId].delete(clinicId);
      } else {
        next[selectedRoleId].add(clinicId);
      }
      return next;
    });
    setHasChanges(true);
    setSaved(false);
  };

  const grantAll = () => {
    if (selectedRoleId === 'super_admin') return;
    setMatrix(prev => { const n = deepCopyMatrix(prev); n[selectedRoleId] = new Set(allPermIds); return n; });
    setHasChanges(true); setSaved(false);
  };

  const revokeAll = () => {
    if (selectedRoleId === 'super_admin') return;
    if (!window.confirm(`Revoke all permissions from "${selectedRole.label}"? This will prevent access to all features.`)) return;
    setMatrix(prev => { const n = deepCopyMatrix(prev); n[selectedRoleId] = new Set(); return n; });
    setHasChanges(true); setSaved(false);
  };

  const resetToDefault = () => {
    setMatrix(prev => { const n = deepCopyMatrix(prev); n[selectedRoleId] = new Set(DEFAULT_MATRIX[selectedRoleId]); return n; });
    setClinicAccess(prev => { const n = deepCopyClinic(prev); n[selectedRoleId] = new Set(DEFAULT_CLINIC_ACCESS[selectedRoleId]); return n; });
    setHasChanges(true); setSaved(false);
  };

  const handleSave = () => {
    // In production this would call an API — here we simulate
    setTimeout(() => { setSaved(true); setHasChanges(false); }, 400);
  };

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🔐 Role-Based Permissions</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Configure role definitions, granular feature permissions, and multi-clinic access controls</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowMatrix(!showMatrix)} className="btn btn-secondary" style={{ fontSize: 12 }}>
            {showMatrix ? 'Hide' : '📊 Show'} Full Matrix
          </button>
          {hasChanges && (
            <button onClick={handleSave} style={{ padding: '8px 18px', borderRadius: 8, background: '#059669', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              💾 Save Changes
            </button>
          )}
          {saved && !hasChanges && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', padding: '8px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>✅ Changes saved</span>
          )}
        </div>
      </div>

      {/* Full Matrix View */}
      {showMatrix && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 16, overflow: 'auto' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 13 }}>Permission Matrix — All Roles × All Features</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 900 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: 10, color: '#6b7280', minWidth: 200 }}>Permission</th>
                  {ROLES.map(r => (
                    <th key={r.id} style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, fontSize: 10, color: r.color, minWidth: 68, borderLeft: '1px solid #f1f5f9' }}>
                      {r.icon} {r.label.split(' ')[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map(cat => [
                  <tr key={cat.category + '-header'} style={{ background: '#f1f5f9' }}>
                    <td colSpan={ROLES.length + 1} style={{ padding: '5px 16px', fontWeight: 800, fontSize: 10, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 }}>{cat.category}</td>
                  </tr>,
                  ...cat.perms.map(perm => (
                    <tr key={perm.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '7px 16px', color: '#374151' }}>{perm.label}</td>
                      {ROLES.map(r => {
                        const granted = matrix[r.id]?.has(perm.id);
                        return (
                          <td key={r.id} style={{ padding: '7px 10px', textAlign: 'center', borderLeft: '1px solid #f8fafc', background: granted ? r.bg : '#fff' }}>
                            {granted ? <span style={{ color: r.color, fontSize: 13 }}>✓</span> : <span style={{ color: '#e2e8f0', fontSize: 12 }}>—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ])}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>

        {/* Role list */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 12, color: '#374151', background: '#f8fafc' }}>Roles ({ROLES.length})</div>
          {ROLES.map(r => {
            const perms = matrix[r.id] || new Set();
            const clinics = clinicAccess[r.id] || new Set();
            const isSelected = selectedRoleId === r.id;
            return (
              <div key={r.id} onClick={() => setSelectedRoleId(r.id)}
                style={{ padding: '12px 14px', cursor: 'pointer', background: isSelected ? r.bg : '#fff', borderBottom: '1px solid #f1f5f9', borderLeft: '3px solid ' + (isSelected ? r.color : 'transparent'), transition: 'all 0.1s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{r.icon} {r.label}</span>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: r.bg, color: r.color, fontWeight: 800, border: '1px solid ' + r.color + '33' }}>{r.userCount} user{r.userCount !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, lineHeight: 1.4 }}>{r.description}</div>
                <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#9ca3af' }}>
                  <span style={{ fontWeight: 700, color: r.color }}>{perms.size} perms</span>
                  <span>·</span>
                  <span>{clinics.size} clinic{clinics.size !== 1 ? 's' : ''}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Permission editor */}
        <div>
          {/* Role header */}
          <div style={{ background: 'linear-gradient(135deg, ' + selectedRole.color + ', ' + selectedRole.color + 'cc)', color: '#fff', borderRadius: '12px 12px 0 0', padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{selectedRole.icon} {selectedRole.label}</div>
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 3 }}>{selectedRole.description}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.2)' }}>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>{grantedCount}</div>
                  <div style={{ fontSize: 9, opacity: 0.8 }}>of {totalCount} perms</div>
                </div>
                <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.2)' }}>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>{roleClinics.size}</div>
                  <div style={{ fontSize: 9, opacity: 0.8 }}>of {CLINICS.length} clinics</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: '#fff' }}>
            {[['permissions','🔑 Permissions'], ['clinics','🏥 Clinic Access'], ['audit','📋 Audit Log']].map(([t, l]) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '10px 18px', border: 'none', background: tab === t ? '#fff' : '#f8fafc', fontWeight: tab === t ? 700 : 500, fontSize: 12, cursor: 'pointer', color: tab === t ? selectedRole.color : '#6b7280', borderBottom: '2px solid ' + (tab === t ? selectedRole.color : 'transparent') }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>

            {/* ── Permissions Tab ── */}
            {tab === 'permissions' && (
              <div style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
                  <input className="form-input" placeholder="Search permissions…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, fontSize: 13 }} />
                  {selectedRoleId !== 'super_admin' && (
                    <>
                      <button onClick={grantAll} style={{ fontSize: 11, padding: '6px 12px', borderRadius: 7, background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', fontWeight: 700, cursor: 'pointer' }}>✓ Grant All</button>
                      <button onClick={revokeAll} style={{ fontSize: 11, padding: '6px 12px', borderRadius: 7, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontWeight: 700, cursor: 'pointer' }}>✕ Revoke All</button>
                      <button onClick={resetToDefault} style={{ fontSize: 11, padding: '6px 12px', borderRadius: 7, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer' }}>↺ Reset Default</button>
                    </>
                  )}
                  {selectedRoleId === 'super_admin' && (
                    <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, background: '#f5f3ff', padding: '5px 10px', borderRadius: 6 }}>👑 Super Admin always has full access</span>
                  )}
                </div>

                {filteredCategories.map(cat => (
                  <div key={cat.category} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                      {cat.category}
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {cat.perms.map(perm => {
                        const granted = rolePerms.has(perm.id);
                        const isSuper = selectedRoleId === 'super_admin';
                        return (
                          <div key={perm.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: granted ? (selectedRole.bg || '#f8fafc') : '#fafafa', border: '1px solid ' + (granted ? selectedRole.color + '44' : '#e2e8f0'), transition: 'all 0.1s' }}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 12, fontWeight: granted ? 700 : 500, color: granted ? selectedRole.color : '#374151' }}>{perm.label}</span>
                              <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 8, fontFamily: 'monospace' }}>{perm.id}</span>
                            </div>
                            <ToggleSwitch on={granted || isSuper} onChange={() => togglePerm(perm.id)} disabled={isSuper} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Clinic Access Tab ── */}
            {tab === 'clinics' && (
              <div style={{ padding: '18px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Multi-Clinic Access for {selectedRole.label}</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {CLINICS.map(clinic => {
                    const hasAccess = roleClinics.has(clinic.id);
                    const isSuper = selectedRoleId === 'super_admin';
                    return (
                      <div key={clinic.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 10, border: '1px solid ' + (hasAccess ? selectedRole.color + '55' : '#e2e8f0'), background: hasAccess ? (selectedRole.bg || '#f8fafc') : '#fafafa', transition: 'all 0.2s' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: hasAccess ? selectedRole.color : '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                          {clinic.id === 'clinic-virtual' ? '🌐' : clinic.id === 'clinic-north' ? '🏢' : clinic.id === 'clinic-south' ? '🏛️' : '🏥'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: hasAccess ? selectedRole.color : '#374151' }}>{clinic.label}</div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{clinic.address}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {hasAccess && <span style={{ fontSize: 10, fontWeight: 700, color: selectedRole.color }}>Access Granted</span>}
                          <ToggleSwitch on={hasAccess || isSuper} onChange={() => toggleClinic(clinic.id)} disabled={isSuper} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 14, padding: '10px 14px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a', fontSize: 12, color: '#92400e' }}>
                  <strong>ℹ️ Multi-Clinic Note:</strong> Users with this role can only view patient data, schedule appointments, and generate reports for their assigned clinics. Super Admin can access all locations.
                </div>
              </div>
            )}

            {/* ── Audit Tab ── */}
            {tab === 'audit' && (
              <div style={{ padding: '18px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>📋 Permission Change History — {selectedRole.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { date: '2026-05-20', user: 'Admin', action: 'Granted', perm: 'analytics.outcomes', note: 'Expanded for clinical review workflow' },
                    { date: '2026-04-12', user: 'Admin', action: 'Revoked', perm: 'admin.settings', note: 'Tightened admin access post-audit' },
                    { date: '2026-03-01', user: 'Admin', action: 'Granted', perm: 'report.export', note: 'Per compliance review' },
                    { date: '2026-01-15', user: 'Admin', action: 'Reset to Default', perm: '—', note: 'Role reconfigured per new org policy' },
                  ].map((entry, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', borderRadius: 8, background: entry.action === 'Granted' ? '#f0fdf4' : entry.action === 'Revoked' ? '#fef2f2' : '#eff6ff', border: '1px solid ' + (entry.action === 'Granted' ? '#bbf7d0' : entry.action === 'Revoked' ? '#fca5a5' : '#bfdbfe') }}>
                      <div style={{ fontSize: 10, color: '#6b7280', minWidth: 80 }}>{entry.date}</div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: entry.action === 'Granted' ? '#166534' : entry.action === 'Revoked' ? '#dc2626' : '#1d4ed8' }}>{entry.action}</span>
                        {entry.perm !== '—' && <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151', marginLeft: 8, background: '#fff', padding: '1px 5px', borderRadius: 3 }}>{entry.perm}</span>}
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{entry.note} · by {entry.user}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🔐 Current Role Summary</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ padding: '12px 14px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>Clinical Access</div>
                      {PERMISSIONS[0].perms.map(p => (
                        <div key={p.id} style={{ fontSize: 11, color: rolePerms.has(p.id) ? '#059669' : '#9ca3af', marginBottom: 2 }}>
                          {rolePerms.has(p.id) ? '✓' : '✕'} {p.label}
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '12px 14px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>Admin Access</div>
                      {PERMISSIONS[7].perms.map(p => (
                        <div key={p.id} style={{ fontSize: 11, color: rolePerms.has(p.id) ? '#059669' : '#9ca3af', marginBottom: 2 }}>
                          {rolePerms.has(p.id) ? '✓' : '✕'} {p.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
