import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSite } from '../contexts/SiteContext';
import { admin } from '../services/api';
import { SITES_FALLBACK } from '../contexts/SiteContext';

const TYPES = ['Primary', 'Satellite', 'Virtual'];
const STATUSES = ['Active', 'Inactive'];
const TYPE_COLORS = { Primary: '#4f46e5', Satellite: '#16a34a', Virtual: '#7c3aed' };
const TYPE_BG    = { Primary: '#eff6ff', Satellite: '#f0fdf4', Virtual: '#f5f3ff' };
const TYPE_ICON  = { Primary: '🏥', Satellite: '🏢', Virtual: '🌐' };

const EMPTY_FORM = {
  name: '', shortName: '', address: '', phone: '', fax: '',
  hours: '', type: 'Satellite', status: 'Active', npi: '',
  taxId: '', placeOfService: '11 — Office', rooms: 0,
  telehealth: true, sortOrder: 0,
};

const card = {
  background: 'var(--bg-card)', borderRadius: 14,
  border: '1px solid var(--border)', padding: 20,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 10px', borderRadius: 7, fontSize: 13,
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text-primary)', outline: 'none',
};

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, width: '100%', maxWidth: 640, boxShadow: '0 24px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)', padding: '0 4px' }}>x</button>
        </div>
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

function LocationForm({ initial, onSave, onCancel, loading, error }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <div style={{ gridColumn: 'span 1' }}>
          <Field label="Full Name" required>
            <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Clarity - Main Office" />
          </Field>
        </div>
        <div style={{ gridColumn: 'span 1' }}>
          <Field label="Short Name (header dropdown)" required>
            <input style={inputStyle} value={form.shortName} onChange={e => set('shortName', e.target.value)} placeholder="Main Office" required />
          </Field>
        </div>
      </div>

      <Field label="Address">
        <input style={inputStyle} value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St, Suite 100, City, ST 00000" />
      </Field>
      <Field label="Hours">
        <input style={inputStyle} value={form.hours} onChange={e => set('hours', e.target.value)} placeholder="Mon-Fri 8:00 AM - 6:00 PM" />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <div><Field label="Phone"><input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(000) 000-0000" /></Field></div>
        <div><Field label="Fax"><input style={inputStyle} value={form.fax} onChange={e => set('fax', e.target.value)} placeholder="(000) 000-0000" /></Field></div>
        <div>
          <Field label="Type">
            <select style={inputStyle} value={form.type} onChange={e => set('type', e.target.value)}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <div>
          <Field label="Status">
            <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div><Field label="NPI"><input style={inputStyle} value={form.npi} onChange={e => set('npi', e.target.value)} placeholder="10-digit NPI" maxLength={10} /></Field></div>
        <div><Field label="Tax ID"><input style={inputStyle} value={form.taxId} onChange={e => set('taxId', e.target.value)} placeholder="XX-XXXXXXX" /></Field></div>
        <div><Field label="Place of Service Code"><input style={inputStyle} value={form.placeOfService} onChange={e => set('placeOfService', e.target.value)} placeholder="11 - Office" /></Field></div>
        <div><Field label="Exam Rooms"><input style={inputStyle} type="number" min={0} value={form.rooms} onChange={e => set('rooms', Number(e.target.value))} /></Field></div>
        <div><Field label="Sort Order (lower = first in dropdown)"><input style={inputStyle} type="number" min={0} value={form.sortOrder} onChange={e => set('sortOrder', Number(e.target.value))} /></Field></div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 16px' }}>
        <input id="tele" type="checkbox" checked={form.telehealth} onChange={e => set('telehealth', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
        <label htmlFor="tele" style={{ fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>Telehealth Enabled</label>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '9px 12px', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving...' : initial.id ? 'Save Changes' : 'Add Location'}
        </button>
      </div>
    </form>
  );
}

// ─── Provider helpers ────────────────────────────────────────────────────────
const ROLES_PROVIDER = ['prescriber', 'therapist', 'nurse'];
const EMPTY_PROVIDER = { firstName: '', lastName: '', role: 'prescriber', credentials: '', specialty: '', npi: '', deaNumber: '', email: '' };

function ProviderForm({ initial, onSave, onCancel, loading, error }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const isPrescriber = form.role === 'prescriber';
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <div><Field label="First Name" required><input style={inputStyle} value={form.firstName} onChange={e => set('firstName', e.target.value)} required placeholder="Jane" /></Field></div>
        <div><Field label="Last Name" required><input style={inputStyle} value={form.lastName} onChange={e => set('lastName', e.target.value)} required placeholder="Smith" /></Field></div>
        <div>
          <Field label="Role" required>
            <select style={inputStyle} value={form.role} onChange={e => set('role', e.target.value)}>
              {ROLES_PROVIDER.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </Field>
        </div>
        <div><Field label="Credentials"><input style={inputStyle} value={form.credentials} onChange={e => set('credentials', e.target.value)} placeholder="DNP, NP, LCSW, MD…" /></Field></div>
        <div style={{ gridColumn: 'span 2' }}><Field label="Specialty"><input style={inputStyle} value={form.specialty} onChange={e => set('specialty', e.target.value)} placeholder="Psychiatry, Psychotherapy…" /></Field></div>
        <div><Field label="NPI"><input style={inputStyle} value={form.npi} onChange={e => set('npi', e.target.value)} placeholder="10-digit NPI" maxLength={10} /></Field></div>
        {isPrescriber && <div><Field label="DEA Number"><input style={inputStyle} value={form.deaNumber} onChange={e => set('deaNumber', e.target.value)} placeholder="e.g. MO7223857" /></Field></div>}
        <div style={{ gridColumn: isPrescriber ? 'span 1' : 'span 2' }}>
          <Field label="Email"><input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="provider@clinic.com" /></Field>
        </div>
      </div>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '9px 12px', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Save Provider'}</button>
      </div>
    </form>
  );
}

function EditProviderForm({ initial, onSave, onCancel, loading, error }) {
  const [form, setForm] = useState({
    credentials: initial.credentials || '',
    specialty:   initial.specialty   || '',
    npi:         initial.npi         || '',
    deaNumber:   initial.deaNumber   || '',
  });
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const isPrescriber = initial.role === 'prescriber';
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <div><Field label="Credentials"><input style={inputStyle} value={form.credentials} onChange={e => set('credentials', e.target.value)} placeholder="DNP, NP, LCSW…" /></Field></div>
        <div><Field label="Specialty"><input style={inputStyle} value={form.specialty} onChange={e => set('specialty', e.target.value)} /></Field></div>
        <div><Field label="NPI"><input style={inputStyle} value={form.npi} onChange={e => set('npi', e.target.value)} placeholder="10-digit NPI" maxLength={10} /></Field></div>
        {isPrescriber && <div><Field label="DEA Number"><input style={inputStyle} value={form.deaNumber} onChange={e => set('deaNumber', e.target.value)} placeholder="e.g. MO7223857" /></Field></div>}
      </div>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '9px 12px', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</button>
      </div>
    </form>
  );
}

function DeleteConfirm({ loc, onConfirm, onClose, loading }) {
  return (
    <Modal title="Delete Location" onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>warning</div>
        <p style={{ fontWeight: 600, fontSize: 15 }}>Delete <strong>{loc.name}</strong>?</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 24px' }}>This cannot be undone. Existing appointments are not affected.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>{loading ? 'Deleting...' : 'Delete'}</button>
        </div>
      </div>
    </Modal>
  );
}

export default function MultiLocationManagement() {
  const { currentUser } = useAuth();
  const { reloadSites } = useSite();
  const isAdmin = currentUser?.role === 'admin';

  const [locationData, setLocationData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState('');
  const [activeTab, setActiveTab] = useState('locations');
  const [selected, setSelected] = useState(null);

  const [modal, setModal] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // ─ Provider state ────────────────────────────────────────────────
  const [allUsers, setAllUsers] = useState([]);
  const [providerModal, setProviderModal] = useState(null); // null | 'add-new' | 'assign' | 'edit-provider' | 'remove-provider'
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [providerLoading, setProviderLoading] = useState(false);
  const [providerError, setProviderError] = useState('');
  const [providerForm, setProviderForm] = useState({});
  const [assignId, setAssignId] = useState('');

  const [toast, setToast] = useState('');
  const toastRef = useRef(null);
  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 3000);
  }, []);
  useEffect(() => () => clearTimeout(toastRef.current), []);

  const load = useCallback(async () => {
    setLoading(true); setFetchErr('');
    try {
      const data = await admin.locations.list();
      if (Array.isArray(data) && data.length > 0) {
        setLocationData(data);
      } else {
        setLocationData(SITES_FALLBACK.filter(s => s.id !== 'all').map(s => ({ ...s, status: 'Active', address: '', phone: '', fax: '', hours: '', npi: '', taxId: '', placeOfService: '11 — Office', rooms: 0, telehealth: true, sortOrder: 0 })));
      }
    } catch (err) {
      setFetchErr(err?.message || 'Failed to load locations. Check your connection.');
    } finally { setLoading(false); }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const data = await admin.users.list();
      if (Array.isArray(data)) setAllUsers(data.filter(u => u.role !== 'patient' && u.role !== 'admin'));
    } catch { /* users are supplementary here; silently ignore */ }
  }, []);

  useEffect(() => { load(); loadUsers(); }, [load, loadUsers]);

  const closeModal = () => { setModal(null); setSelected(null); setFormError(''); };

  const handleAdd = async (form) => {
    setFormLoading(true); setFormError('');
    try { await admin.locations.create(form); await load(); reloadSites(); closeModal(); showToast('✅ Location added'); }
    catch (err) { setFormError(err?.message || 'Failed to add location. Please try again.'); }
    finally { setFormLoading(false); }
  };

  const handleUpdate = async (form) => {
    setFormLoading(true); setFormError('');
    try { await admin.locations.update(selected.id, form); await load(); reloadSites(); closeModal(); showToast('✅ Location updated'); }
    catch (err) { setFormError(err?.message || 'Failed to update location. Please try again.'); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    try { await admin.locations.remove(selected.id); await load(); reloadSites(); closeModal(); showToast('Location deleted'); }
    catch (err) { closeModal(); showToast(err?.message || 'Failed to delete location'); }
    finally { setFormLoading(false); }
  };

  // ─ Provider handlers ───────────────────────────────────────────────
  const locationProviders = selected ? allUsers.filter(u => u.locationId === selected.id) : [];
  const unassignedProviders = selected
    ? allUsers.filter(u => u.locationId !== selected.id && ['prescriber', 'therapist', 'nurse'].includes(u.role))
    : [];

  const closeProviderModal = () => {
    setProviderModal(null); setSelectedProvider(null);
    setProviderError(''); setProviderForm({}); setAssignId('');
  };

  const handleAssignProvider = async () => {
    if (!assignId || !selected) return;
    setProviderLoading(true); setProviderError('');
    try {
      await admin.users.update(assignId, { locationId: selected.id });
    } catch (err) {
      setProviderError(err?.message || 'Failed to assign provider. Please try again.');
      setProviderLoading(false); return;
    }
    await loadUsers(); closeProviderModal(); showToast('✅ Provider assigned to location');
    setProviderLoading(false);
  };

  const handleAddNewProvider = async (form) => {
    if (!selected) return;
    setProviderLoading(true); setProviderError('');
    try {
      const base = (form.firstName + '.' + form.lastName).toLowerCase().replace(/[^a-z0-9._-]/g, '');
      await admin.users.create({ ...form, username: base || 'provider', password: 'ChangeMe1!', mustChangePassword: true, locationId: selected.id });
    } catch (err) {
      setProviderError(err?.message || 'Failed to add provider. Please try again.');
      setProviderLoading(false); return;
    }
    await loadUsers(); closeProviderModal(); showToast('✅ Provider added');
    setProviderLoading(false);
  };

  const handleEditProvider = async (form) => {
    if (!selectedProvider) return;
    setProviderLoading(true); setProviderError('');
    try {
      await admin.users.update(selectedProvider.id, form);
    } catch (err) {
      setProviderError(err?.message || 'Failed to update provider. Please try again.');
      setProviderLoading(false); return;
    }
    await loadUsers(); closeProviderModal(); showToast('✅ Provider updated');
    setProviderLoading(false);
  };

  const handleRemoveProvider = async () => {
    if (!selectedProvider) return;
    setProviderLoading(true);
    try {
      await admin.users.update(selectedProvider.id, { locationId: '' });
    } catch (err) {
      closeProviderModal(); showToast(err?.message || 'Failed to remove provider');
      setProviderLoading(false); return;
    }
    await loadUsers(); closeProviderModal(); showToast('Provider removed from location');
    setProviderLoading(false);
  };

  const byType = (t) => locationData.filter(l => l.type === t).length;

  const tabs = [
    { key: 'locations', icon: 'location', label: 'Locations' },
    { key: 'settings',  icon: 'settings', label: 'Configuration' },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Multi-Location Management</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Manage clinic locations — changes appear live in the header dropdown across the EHR
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setSelected(null); setFormError(''); setModal('add'); }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            + Add Location
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        {[
          { label: 'Total',     value: locationData.length,                              color: '#6366f1' },
          { label: 'Active',    value: locationData.filter(l => l.status === 'Active').length,   color: '#10b981' },
          { label: 'Inactive',  value: locationData.filter(l => l.status === 'Inactive').length, color: '#94a3b8' },
          { label: 'Primary',   value: byType('Primary'),   color: '#4f46e5' },
          { label: 'Satellite', value: byType('Satellite'), color: '#16a34a' },
          { label: 'Virtual',   value: byType('Virtual'),   color: '#7c3aed' },
        ].map(s => (
          <div key={s.label} style={{ background: s.color + '12', border: '1px solid ' + s.color + '30', borderRadius: 10, padding: '10px 18px', flex: '1 0 80px', minWidth: 80 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '10px 20px', borderRadius: '10px 10px 0 0', border: 'none',
            background: activeTab === t.key ? 'var(--bg-card)' : 'transparent',
            color: activeTab === t.key ? '#4f46e5' : 'var(--text-muted)',
            fontWeight: activeTab === t.key ? 800 : 600, fontSize: 13, cursor: 'pointer',
            borderBottom: activeTab === t.key ? '2px solid #4f46e5' : '2px solid transparent',
            marginBottom: -2,
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'locations' && (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading locations...</div>
          ) : fetchErr ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 20, color: '#dc2626' }}>
              {fetchErr} <button className="btn btn-secondary" onClick={load} style={{ marginLeft: 12 }}>Retry</button>
            </div>
          ) : locationData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>No locations yet.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: selected ? '360px 1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {locationData.map(loc => (
                  <div
                    key={loc.id}
                    onClick={() => setSelected(prev => prev && prev.id === loc.id ? null : loc)}
                    style={{
                      ...card, cursor: 'pointer',
                      borderColor: selected && selected.id === loc.id ? '#4f46e5' : 'var(--border)',
                      borderWidth: selected && selected.id === loc.id ? 2 : 1,
                      opacity: loc.status === 'Inactive' ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{TYPE_ICON[loc.type]} {loc.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{loc.address}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, background: TYPE_BG[loc.type], color: TYPE_COLORS[loc.type] }}>{loc.type}</span>
                        {loc.status === 'Inactive' && <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, background: '#f1f5f9', color: '#94a3b8' }}>Inactive</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {loc.phone && <span>{loc.phone}</span>}
                      {loc.rooms > 0 && <span>{loc.rooms} rooms</span>}
                      {loc.telehealth && <span>Telehealth</span>}
                    </div>
                    {loc.hours && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{loc.hours}</div>}
                  </div>
                ))}
              </div>

              {selected && (
                <div style={{ ...card, position: 'sticky', top: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>{selected.name}</h2>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{selected.address}</div>
                    </div>
                    <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>x</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {[
                      ['Phone', selected.phone || '-'],
                      ['Fax', selected.fax || '-'],
                      ['Hours', selected.hours || '-'],
                      ['Place of Service', selected.placeOfService || '-'],
                      ['NPI', selected.npi || '-'],
                      ['Tax ID', selected.taxId || '-'],
                      ['Exam Rooms', selected.rooms],
                      ['Telehealth', selected.telehealth ? 'Enabled' : 'Disabled'],
                      ['Status', selected.status],
                      ['Sort Order', selected.sortOrder],
                    ].map(([label, value]) => (
                      <div key={label} style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setFormError(''); setModal('edit'); }}>Edit Location</button>
                      <button className="btn btn-danger" onClick={() => { setFormError(''); setModal('delete'); }}>Delete</button>
                    </div>
                  )}

                  {/* ─── Providers ─── */}
                  <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>👩‍⚕️ Providers</div>
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 11 }}
                            onClick={() => { setProviderError(''); setAssignId(''); setProviderModal('assign'); }}>
                            Assign Existing
                          </button>
                          <button className="btn btn-primary" style={{ padding: '3px 10px', fontSize: 11 }}
                            onClick={() => { setProviderError(''); setProviderForm({ ...EMPTY_PROVIDER }); setProviderModal('add-new'); }}>
                            + New Provider
                          </button>
                        </div>
                      )}
                    </div>

                    {locationProviders.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '14px 0' }}>No providers assigned to this location</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {locationProviders.map(p => (
                          <div key={p.id} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>
                                  {p.credentials ? p.credentials + ' ' : ''}{p.firstName} {p.lastName}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                  {p.role.charAt(0).toUpperCase() + p.role.slice(1)}{p.specialty ? ' · ' + p.specialty : ''}
                                </div>
                              </div>
                              {isAdmin && (
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button
                                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 8px', fontSize: 11, cursor: 'pointer', color: 'var(--text-primary)' }}
                                    onClick={() => { setSelectedProvider(p); setProviderError(''); setProviderModal('edit-provider'); }}>
                                    Edit
                                  </button>
                                  <button
                                    style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 5, padding: '2px 8px', fontSize: 11, cursor: 'pointer', color: '#dc2626' }}
                                    onClick={() => { setSelectedProvider(p); setProviderError(''); setProviderModal('remove-provider'); }}>
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                              {p.npi ? (
                                <div style={{ background: '#eff6ff', borderRadius: 5, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#3b82f6' }}>NPI</span>
                                  <span style={{ fontSize: 12, fontWeight: 600 }}>{p.npi}</span>
                                </div>
                              ) : null}
                              {p.deaNumber && p.role === 'prescriber' ? (
                                <div style={{ background: '#fef3c7', borderRadius: 5, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706' }}>DEA</span>
                                  <span style={{ fontSize: 12, fontWeight: 600 }}>{p.deaNumber}</span>
                                </div>
                              ) : null}
                              {!p.npi && !(p.deaNumber && p.role === 'prescriber') && (
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No credentials on file</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={card}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 16px' }}>Cross-Location Settings</h3>
            {[
              { label: 'Cross-location scheduling',    desc: 'Allow patients to be scheduled at any location',            enabled: true },
              { label: 'Shared patient records',        desc: 'Access patient charts from any location',                   enabled: true },
              { label: 'Unified inbox',                 desc: 'Single clinical inbox across all locations',                enabled: true },
              { label: 'Location-based fee schedules', desc: 'Different fee schedules per location',                      enabled: false },
              { label: 'Auto POS assignment',          desc: 'Set Place of Service automatically based on visit location', enabled: true },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.desc}</div>
                </div>
                <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: s.enabled ? '#f0fdf4' : '#f1f5f9', color: s.enabled ? '#16a34a' : '#94a3b8' }}>
                  {s.enabled ? 'On' : 'Off'}
                </span>
              </div>
            ))}
          </div>
          <div style={card}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 16px' }}>Location Type Guide</h3>
            {[
              { type: 'Primary',   desc: 'Main clinic location — default for new patients and billing', icon: '🏥' },
              { type: 'Satellite', desc: 'Branch offices with regular operating hours',                 icon: '🏢' },
              { type: 'Virtual',   desc: 'Telehealth-only — no physical address required',             icon: '🌐' },
            ].map(t => (
              <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 24 }}>{t.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{t.type}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.desc}</div>
                </div>
                <span style={{ fontWeight: 800, fontSize: 14, color: TYPE_COLORS[t.type] }}>{byType(t.type)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal === 'add' && (
        <Modal title="Add New Location" onClose={closeModal}>
          <LocationForm initial={{ ...EMPTY_FORM }} onSave={handleAdd} onCancel={closeModal} loading={formLoading} error={formError} />
        </Modal>
      )}
      {modal === 'edit' && selected && (
        <Modal title={'Edit - ' + selected.name} onClose={closeModal}>
          <LocationForm
            initial={{
              id: selected.id, name: selected.name, shortName: selected.shortName || '',
              address: selected.address || '', phone: selected.phone || '', fax: selected.fax || '',
              hours: selected.hours || '', type: selected.type, status: selected.status,
              npi: selected.npi || '', taxId: selected.taxId || '',
              placeOfService: selected.placeOfService || '11 - Office',
              rooms: selected.rooms || 0, telehealth: !!selected.telehealth, sortOrder: selected.sortOrder || 0,
            }}
            onSave={handleUpdate} onCancel={closeModal} loading={formLoading} error={formError}
          />
        </Modal>
      )}
      {modal === 'delete' && selected && (
        <DeleteConfirm loc={selected} onConfirm={handleDelete} onClose={closeModal} loading={formLoading} />
      )}

      {/* ─── Provider modals ─── */}
      {providerModal === 'add-new' && selected && (
        <Modal title={`Add New Provider — ${selected.name}`} onClose={closeProviderModal}>
          <ProviderForm initial={providerForm} onSave={handleAddNewProvider} onCancel={closeProviderModal} loading={providerLoading} error={providerError} />
        </Modal>
      )}
      {providerModal === 'assign' && selected && (
        <Modal title={`Assign Existing Provider — ${selected.name}`} onClose={closeProviderModal}>
          <Field label="Select Staff Member">
            <select style={inputStyle} value={assignId} onChange={e => setAssignId(e.target.value)}>
              <option value="">— choose a staff member —</option>
              {unassignedProviders.map(u => (
                <option key={u.id} value={u.id}>
                  {u.credentials ? u.credentials + ' ' : ''}{u.firstName} {u.lastName} ({u.role})
                  {u.locationId ? ' — currently at another location' : ''}
                </option>
              ))}
            </select>
          </Field>
          {providerError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '9px 12px', color: '#dc2626', fontSize: 13, margin: '8px 0' }}>{providerError}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn btn-secondary" onClick={closeProviderModal} disabled={providerLoading}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAssignProvider} disabled={providerLoading || !assignId}>
              {providerLoading ? 'Assigning…' : 'Assign to Location'}
            </button>
          </div>
        </Modal>
      )}
      {providerModal === 'edit-provider' && selectedProvider && (
        <Modal title={`Edit — ${selectedProvider.credentials ? selectedProvider.credentials + ' ' : ''}${selectedProvider.firstName} ${selectedProvider.lastName}`} onClose={closeProviderModal}>
          <EditProviderForm initial={selectedProvider} onSave={handleEditProvider} onCancel={closeProviderModal} loading={providerLoading} error={providerError} />
        </Modal>
      )}
      {providerModal === 'remove-provider' && selectedProvider && selected && (
        <Modal title="Remove Provider from Location" onClose={closeProviderModal}>
          <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>⚠️</div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>
              Remove <strong>{selectedProvider.credentials ? selectedProvider.credentials + ' ' : ''}{selectedProvider.firstName} {selectedProvider.lastName}</strong> from <strong>{selected.name}</strong>?
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 24px' }}>
              Their account remains active but will no longer be assigned to this location.
            </p>
            {providerError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '9px 12px', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>{providerError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={closeProviderModal} disabled={providerLoading}>Cancel</button>
              <button className="btn btn-danger" onClick={handleRemoveProvider} disabled={providerLoading}>
                {providerLoading ? 'Removing…' : 'Remove from Location'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '10px 20px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          zIndex: 2000, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
