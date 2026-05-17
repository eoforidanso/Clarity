import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { users as usersApi } from '../services/api';

const ROLES = ['prescriber', 'nurse', 'front_desk', 'therapist'];
const ROLE_LABEL = { prescriber: 'Prescriber', nurse: 'Nurse', front_desk: 'Front Desk', therapist: 'Therapist' };

const EMPTY_FORM = {
  firstName: '', lastName: '', username: '', email: '',
  password: '', role: 'prescriber', credentials: '',
  specialty: '', npi: '', deaNumber: '', twoFactorEnabled: true,
};

function validate(form, isNew) {
  const errs = {};
  if (!form.firstName.trim()) errs.firstName = 'Required';
  if (!form.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errs.email = 'Valid email required';
  if (form.npi && !/^\d{10}$/.test(form.npi.trim())) errs.npi = 'NPI must be exactly 10 digits';
  if (form.deaNumber && !/^[A-Z]{2}\d{7}$/.test(form.deaNumber.trim())) errs.deaNumber = 'DEA format: 2 letters + 7 digits (e.g. AB1234563)';
  if (isNew) {
    if (!form.username.trim()) errs.username = 'Required';
    if (!form.password || form.password.length < 8) errs.password = 'Min 8 characters';
    if (!/[A-Z]/.test(form.password)) errs.password = 'Must contain uppercase letter';
    if (!/[0-9]/.test(form.password)) errs.password = 'Must contain a number';
  }
  return errs;
}

export default function ProviderManagement() {
  const { user: currentUser } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Drawer state
  const [drawer, setDrawer] = useState(null); // null | 'edit' | 'add'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Filter/search
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const isAdmin = currentUser?.role === 'front_desk';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await usersApi.list();
      setProviders(data);
    } catch (e) {
      setError(e.message || 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (provider) => {
    setSelected(provider);
    setForm({
      firstName: provider.firstName || '',
      lastName: provider.lastName || '',
      username: provider.username || '',
      email: provider.email || '',
      password: '',
      role: provider.role || 'prescriber',
      credentials: provider.credentials || '',
      specialty: provider.specialty || '',
      npi: provider.npi || '',
      deaNumber: provider.deaNumber || '',
      twoFactorEnabled: provider.twoFactorEnabled !== false,
    });
    setFormErrors({});
    setDrawer('edit');
  };

  const openAdd = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setDrawer('add');
  };

  const closeDrawer = () => { setDrawer(null); setSelected(null); };

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setFormErrors(e => { const n = { ...e }; delete n[field]; return n; });
  };

  const handleSave = async () => {
    const isNew = drawer === 'add';
    const errs = validate(form, isNew);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }

    setSaving(true);
    setError('');
    try {
      if (isNew) {
        await usersApi.create({
          username: form.username.trim(),
          password: form.password,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          role: form.role,
          credentials: form.credentials.trim(),
          specialty: form.specialty.trim(),
          npi: form.npi.trim(),
          deaNumber: form.deaNumber.trim(),
          email: form.email.trim(),
          twoFactorEnabled: form.twoFactorEnabled,
        });
        setSuccess('Provider added successfully.');
      } else {
        await usersApi.update(selected.id, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          role: form.role,
          credentials: form.credentials.trim(),
          specialty: form.specialty.trim(),
          npi: form.npi.trim(),
          deaNumber: form.deaNumber.trim(),
          email: form.email.trim(),
          twoFactorEnabled: form.twoFactorEnabled,
        });
        setSuccess('Provider updated successfully.');
      }
      closeDrawer();
      await load();
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const filtered = providers.filter(p => {
    const matchRole = roleFilter === 'all' || p.role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q) ||
      (p.npi || '').includes(q) ||
      (p.deaNumber || '').toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const prescribers = filtered.filter(p => p.role === 'prescriber');
  const others = filtered.filter(p => p.role !== 'prescriber');

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e3a5f', margin: 0 }}>Provider Management</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Manage staff credentials including NPI and DEA numbers
          </p>
        </div>
        {isAdmin && (
          <button onClick={openAdd} style={{
            background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8,
            padding: '9px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            + Add Provider
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: 14 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#16a34a', fontSize: 14 }}>
          ✓ {success}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, username, NPI, DEA…"
          style={{ flex: 1, minWidth: 220, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' }}
        />
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', cursor: 'pointer' }}
        >
          <option value="all">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading providers…</div>
      ) : (
        <>
          {/* Prescribers section — shown prominently */}
          {(roleFilter === 'all' || roleFilter === 'prescriber') && prescribers.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                Prescribers
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                {prescribers.map(p => (
                  <ProviderCard key={p.id} provider={p} onEdit={isAdmin ? openEdit : null} />
                ))}
              </div>
            </section>
          )}

          {/* Other staff */}
          {(roleFilter === 'all' || roleFilter !== 'prescriber') && others.length > 0 && (
            <section>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                Other Staff
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                {others.map(p => (
                  <ProviderCard key={p.id} provider={p} onEdit={isAdmin ? openEdit : null} />
                ))}
              </div>
            </section>
          )}

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>No providers match your search.</div>
          )}
        </>
      )}

      {/* Edit / Add Drawer */}
      {drawer && (
        <DrawerOverlay onClose={closeDrawer}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e3a5f', margin: '0 0 20px' }}>
            {drawer === 'add' ? 'Add Provider' : `Edit — ${selected?.firstName} ${selected?.lastName}`}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
            <Field label="First Name *" error={formErrors.firstName}>
              <input value={form.firstName} onChange={e => handleChange('firstName', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Last Name" error={formErrors.lastName}>
              <input value={form.lastName} onChange={e => handleChange('lastName', e.target.value)} style={inputStyle} />
            </Field>

            {drawer === 'add' && (
              <>
                <Field label="Username *" error={formErrors.username}>
                  <input value={form.username} onChange={e => handleChange('username', e.target.value)} autoCapitalize="none" style={inputStyle} />
                </Field>
                <Field label="Password *" error={formErrors.password}>
                  <input type="password" value={form.password} onChange={e => handleChange('password', e.target.value)} style={inputStyle} />
                </Field>
              </>
            )}

            <Field label="Email *" error={formErrors.email}>
              <input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Role" error={formErrors.role}>
              <select value={form.role} onChange={e => handleChange('role', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </Field>

            <Field label="Credentials" error={formErrors.credentials}>
              <input value={form.credentials} onChange={e => handleChange('credentials', e.target.value)} placeholder="e.g. NP, MD, LCSW" style={inputStyle} />
            </Field>
            <Field label="Specialty" error={formErrors.specialty}>
              <input value={form.specialty} onChange={e => handleChange('specialty', e.target.value)} placeholder="e.g. Psychiatry" style={inputStyle} />
            </Field>
          </div>

          {/* NPI / DEA section — highlighted */}
          <div style={{ background: '#f0f4f8', borderRadius: 10, padding: '16px 18px', margin: '20px 0 16px' }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#1e3a5f' }}>Prescribing Credentials</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
              <Field label="NPI Number" hint="10 digits" error={formErrors.npi}>
                <input
                  value={form.npi}
                  onChange={e => handleChange('npi', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="1234567890"
                  maxLength={10}
                  style={inputStyle}
                />
              </Field>
              <Field label="DEA Number" hint="2 letters + 7 digits" error={formErrors.deaNumber}>
                <input
                  value={form.deaNumber}
                  onChange={e => handleChange('deaNumber', e.target.value.toUpperCase().slice(0, 9))}
                  placeholder="AB1234563"
                  maxLength={9}
                  style={inputStyle}
                />
              </Field>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <input
              type="checkbox"
              id="2fa-toggle"
              checked={form.twoFactorEnabled}
              onChange={e => handleChange('twoFactorEnabled', e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <label htmlFor="2fa-toggle" style={{ fontSize: 14, color: '#374151', cursor: 'pointer' }}>
              Require two-factor authentication at login
            </label>
          </div>

          {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={closeDrawer} disabled={saving} style={{ ...btnStyle, background: '#f1f5f9', color: '#374151' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{ ...btnStyle, background: '#1e3a5f', color: '#fff' }}>
              {saving ? 'Saving…' : drawer === 'add' ? 'Add Provider' : 'Save Changes'}
            </button>
          </div>
        </DrawerOverlay>
      )}
    </div>
  );
}

function ProviderCard({ provider, onEdit }) {
  const isPrescriber = provider.role === 'prescriber';
  const hasNpi = !!provider.npi;
  const hasDea = !!provider.deaNumber;
  const missingCreds = isPrescriber && (!hasNpi || !hasDea);

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${missingCreds ? '#fcd34d' : '#e2e8f0'}`,
      borderRadius: 12,
      padding: '16px 18px',
      position: 'relative',
    }}>
      {missingCreds && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: '#fef3c7', color: '#92400e',
          borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700,
        }}>
          ⚠ Credentials Incomplete
        </div>
      )}

      {/* Name + role */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#1e3a5f' }}>
          {provider.firstName} {provider.lastName}
          {provider.credentials && <span style={{ fontWeight: 500, color: '#64748b', marginLeft: 6 }}>{provider.credentials}</span>}
        </div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
          <span style={{
            display: 'inline-block', background: roleColor(provider.role).bg,
            color: roleColor(provider.role).text, borderRadius: 20,
            padding: '1px 9px', fontSize: 11, fontWeight: 700, marginRight: 8,
          }}>
            {ROLE_LABEL[provider.role] || provider.role}
          </span>
          {provider.specialty || '—'}
        </div>
      </div>

      {/* Credentials grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginBottom: 12 }}>
        <CredRow label="NPI" value={provider.npi} missing={isPrescriber && !hasNpi} />
        <CredRow label="DEA" value={provider.deaNumber} missing={isPrescriber && !hasDea} />
        <CredRow label="Username" value={provider.username} />
        <CredRow label="Email" value={provider.email} />
      </div>

      {onEdit && (
        <button
          onClick={() => onEdit(provider)}
          style={{
            background: 'transparent', border: '1px solid #e2e8f0',
            borderRadius: 7, padding: '5px 14px', fontSize: 13, fontWeight: 600,
            color: '#1e3a5f', cursor: 'pointer', width: '100%',
          }}
        >
          Edit
        </button>
      )}
    </div>
  );
}

function CredRow({ label, value, missing }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 13, color: missing ? '#f59e0b' : value ? '#1e293b' : '#94a3b8', fontWeight: missing ? 700 : 500 }}>
        {missing ? '⚠ Not set' : value || '—'}
      </div>
    </div>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 6 }}>({hint})</span>}
      </label>
      {children}
      {error && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 3 }}>{error}</div>}
    </div>
  );
}

function DrawerOverlay({ children, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.45)',
      display: 'flex', justifyContent: 'flex-end',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '100%', maxWidth: 520, background: '#fff',
        height: '100vh', overflowY: 'auto', padding: '32px 28px',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
      }}>
        {children}
      </div>
    </div>
  );
}

function roleColor(role) {
  const map = {
    prescriber: { bg: '#dbeafe', text: '#1d4ed8' },
    nurse: { bg: '#d1fae5', text: '#065f46' },
    front_desk: { bg: '#ede9fe', text: '#5b21b6' },
    therapist: { bg: '#fef3c7', text: '#92400e' },
  };
  return map[role] || { bg: '#f1f5f9', text: '#475569' };
}

const inputStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0',
  borderRadius: 7, fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

const btnStyle = {
  padding: '9px 20px', borderRadius: 8, border: 'none',
  fontWeight: 700, fontSize: 14, cursor: 'pointer',
};
