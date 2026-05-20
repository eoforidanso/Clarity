import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { locations as locationsApi } from '../services/api';

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
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'front_desk';

  const [locationData, setLocationData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState('');
  const [activeTab, setActiveTab] = useState('locations');
  const [selected, setSelected] = useState(null);

  const [modal, setModal] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

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
    try { setLocationData(await locationsApi.list()); }
    catch (e) { setFetchErr(e.message || 'Failed to load locations'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const closeModal = () => { setModal(null); setSelected(null); setFormError(''); };

  const handleAdd = async (form) => {
    setFormLoading(true); setFormError('');
    try { await locationsApi.create(form); await load(); closeModal(); showToast('Location added'); }
    catch (e) { setFormError(e.message); }
    finally { setFormLoading(false); }
  };

  const handleUpdate = async (form) => {
    setFormLoading(true); setFormError('');
    try { await locationsApi.update(selected.id, form); await load(); closeModal(); showToast('Location updated'); }
    catch (e) { setFormError(e.message); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    try { await locationsApi.remove(selected.id); await load(); closeModal(); showToast('Location deleted'); }
    catch (e) { setFormError(e.message); }
    finally { setFormLoading(false); }
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
                      <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setFormError(''); setModal('edit'); }}>Edit</button>
                      <button className="btn btn-danger" onClick={() => { setFormError(''); setModal('delete'); }}>Delete</button>
                    </div>
                  )}
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
