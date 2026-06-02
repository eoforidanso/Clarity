import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSite, SITES_FALLBACK } from '../contexts/SiteContext';
import { admin } from '../services/api';


const ROLES = ['prescriber', 'nurse', 'front_desk', 'therapist', 'biller', 'admin'];
const ROLE_LABELS = {
  prescriber: 'Prescriber',
  nurse: 'Nurse / MA',
  front_desk: 'Front Desk',
  therapist: 'Therapist',
  biller: 'Biller',
  admin: 'Admin',
};
const ROLE_COLORS = {
  prescriber: '#3b82f6',
  nurse: '#10b981',
  front_desk: '#f59e0b',
  therapist: '#8b5cf6',
  biller: '#ec4899',
  admin: '#64748b',
};

const EMPTY_FORM = {
  firstName: '', lastName: '', username: '', email: '',
  password: '', role: 'front_desk', credentials: '',
  specialty: '', npi: '', deaNumber: '', twoFactorEnabled: true,
  mustChangePassword: false, locationId: '',
};

function RoleBadge({ role }) {
  return (
    <span style={{
      background: ROLE_COLORS[role] + '22',
      color: ROLE_COLORS[role],
      border: `1px solid ${ROLE_COLORS[role]}44`,
      borderRadius: 6,
      padding: '2px 8px',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 0.3,
      whiteSpace: 'nowrap',
    }}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function Modal({ title, onClose, children }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, backdropFilter: 'blur(2px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#ffffff', borderRadius: 12, width: '100%', maxWidth: 560,
        boxShadow: '0 24px 60px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column',
        maxHeight: '90vh',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', borderBottom: '1px solid #e2e8f0',
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
            color: '#94a3b8', lineHeight: 1, padding: '0 4px',
          }}>×</button>
        </div>
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 10px', borderRadius: 7, fontSize: 13,
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text-primary)', outline: 'none',
};

function UserForm({ initial, onSave, onCancel, loading, error, locationOptions }) {
  const [form, setForm] = useState(initial);
  const [showPwd, setShowPwd] = useState(false);
  const isEdit = !!initial.id;

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} autoComplete="off">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <Field label="First Name" required>
          <input style={inputStyle} value={form.firstName} onChange={e => set('firstName', e.target.value)} required />
        </Field>
        <Field label="Last Name">
          <input style={inputStyle} value={form.lastName} onChange={e => set('lastName', e.target.value)} />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <Field label="Username" required>
          <input
            style={inputStyle} value={form.username}
            onChange={e => set('username', e.target.value)}
            required disabled={isEdit}
            placeholder="e.g. dr.jane"
            autoComplete="off"
          />
        </Field>
        <Field label="Email" required>
          <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
        </Field>
      </div>

      {!isEdit && (
        <Field label="Password" required>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...inputStyle, paddingRight: 38 }}
              type={showPwd ? 'text' : 'password'}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
                color: 'var(--text-muted)',
              }}
            >{showPwd ? '🙈' : '👁️'}</button>
          </div>
        </Field>
      )}

      <Field label="Role" required>
        <select style={inputStyle} value={form.role} onChange={e => set('role', e.target.value)} required>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <Field label="Credentials">
          <input style={inputStyle} value={form.credentials} onChange={e => set('credentials', e.target.value)} placeholder="MD, LCSW, RN…" />
        </Field>
        <Field label="Specialty">
          <input style={inputStyle} value={form.specialty} onChange={e => set('specialty', e.target.value)} placeholder="Psychiatry, Therapy…" />
        </Field>
      </div>

      {form.role === 'prescriber' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
          <Field label="NPI *" required>
            <input style={inputStyle} value={form.npi} onChange={e => set('npi', e.target.value)} placeholder="10-digit NPI" maxLength={10} required />
          </Field>
          <Field label="DEA Number">
            <input style={inputStyle} value={form.deaNumber} onChange={e => set('deaNumber', e.target.value)} placeholder="e.g. AB1234563" />
          </Field>
        </div>
      )}

      <Field label="Primary Location">
        <select style={inputStyle} value={form.locationId} onChange={e => set('locationId', e.target.value)}>
          {(locationOptions || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </Field>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            id="2fa-toggle"
            type="checkbox"
            checked={form.twoFactorEnabled}
            onChange={e => set('twoFactorEnabled', e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          <label htmlFor="2fa-toggle" style={{ fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
            Require Two-Factor Authentication
          </label>
        </div>
        {!isEdit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              id="must-change-pwd"
              type="checkbox"
              checked={form.mustChangePassword}
              onChange={e => set('mustChangePassword', e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <label htmlFor="must-change-pwd" style={{ fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
              Require password change on first login {form.mustChangePassword && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(user must reset password before accessing system)</span>}
            </label>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7,
          padding: '9px 12px', color: '#dc2626', fontSize: 13, marginBottom: 14,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
        </button>
      </div>
    </form>
  );
}

function ResetPasswordModal({ user, onClose }) {
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await admin.users.resetPassword(user.id, pwd);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Reset Password — ${user.firstName} ${user.lastName}`} onClose={onClose}>
      {done ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <p style={{ fontWeight: 600 }}>Password reset successfully.</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>All active sessions for this user have been invalidated.</p>
          <button className="btn btn-primary" onClick={onClose} style={{ marginTop: 16 }}>Done</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <Field label="New Password" required>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputStyle, paddingRight: 38 }}
                type={showPwd ? 'text' : 'password'}
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
                  color: 'var(--text-muted)',
                }}
              >{showPwd ? '🙈' : '👁️'}</button>
            </div>
          </Field>
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7,
              padding: '9px 12px', color: '#dc2626', fontSize: 13, marginBottom: 14,
            }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={loading}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function UnlockModal({ user, onConfirm, onClose, loading }) {
  return (
    <Modal title={`Unlock Account — ${user.firstName} ${user.lastName}`} onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔓</div>
        <p style={{ fontWeight: 600, marginBottom: 12 }}>Unlock this account?</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          This will clear the forced password change requirement, allowing the user to log in normally.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={onConfirm} 
            disabled={loading}
            style={{ background: '#fbbf24', color: '#1f2937' }}
          >
            {loading ? 'Unlocking…' : 'Unlock Account'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DeleteConfirmModal({ user, onConfirm, onClose, loading }) {
  return (
    <Modal title="Delete User" onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>⚠️</div>
        <p style={{ fontWeight: 600, fontSize: 15 }}>
          Delete <strong>{user.firstName} {user.lastName}</strong>?
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 24px' }}>
          Username: <code>{user.username}</code> · Role: {ROLE_LABELS[user.role]}<br />
          This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Delete User'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function UserManagement() {
  const { currentUser } = useAuth();
  const { reloadSites } = useSite();
  const [locationOptions, setLocationOptions] = useState(SITES_FALLBACK.filter(l => l.id !== 'all'));

  const loadLocations = useCallback(async () => {
    const fallbackOnly = SITES_FALLBACK.filter(l => l.id !== 'all');
    try {
      const locs = await admin.locations.list();
      if (Array.isArray(locs) && locs.length > 0) {
        const active = locs.filter(l => l.status !== 'Inactive' && l.id !== 'all').map(l => ({
          id: l.id,
          name: l.name,
          shortName: l.shortName || l.name,
          type: l.type || 'Primary',
        }));
        // Merge: API first, then any SITES_FALLBACK entries not in DB
        const apiIds = new Set(active.map(l => l.id));
        const extra = fallbackOnly.filter(l => !apiIds.has(l.id));
        setLocationOptions([...active, ...extra]);
      } else {
        setLocationOptions(fallbackOnly);
      }
    } catch (err) {
      setLocationOptions(fallbackOnly);
    }
  }, []);

  useEffect(() => { loadLocations(); }, [loadLocations]);
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modals
  const [modal, setModal] = useState(null); // 'add' | 'edit' | 'delete' | 'reset'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Toast
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 3000);
  }, []);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const data = await admin.users.list();
      setUserList(data);
    } catch (err) {
      setFetchError(err?.message || 'Failed to load users. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // Reload locations whenever this page mounts so newly-added locations from
  // the Location Management page show up in the dropdown immediately.
  useEffect(() => { reloadSites && reloadSites(); }, [reloadSites]);
  useEffect(() => { loadLocations(); }, [loadLocations]);

  // Refresh when the tab regains focus so changes from other pages show up.
  useEffect(() => {
    const refresh = () => { loadUsers(); loadLocations(); reloadSites && reloadSites(); };
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadUsers, reloadSites]);

  // Only admins may manage users
  if (currentUser?.role !== 'admin') {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ marginBottom: 8 }}>Access Restricted</h2>
        <p>User Management is only available to administrators.</p>
      </div>
    );
  }

  const filtered = userList.filter(u => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q || [u.firstName, u.lastName, u.username, u.email, u.credentials, u.specialty]
      .some(field => (field || '').toLowerCase().includes(q));
    return matchesRole && matchesSearch;
  });

  // ── Handlers ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setSelectedUser(null);
    setFormError('');
    setModal('add');
  };

  const openEdit = (u) => {
    setSelectedUser(u);
    setFormError('');
    setModal('edit');
  };

  const openDelete = (u) => {
    setSelectedUser(u);
    setModal('delete');
  };

  const openReset = (u) => {
    setSelectedUser(u);
    setModal('reset');
  };

  const openUnlock = (u) => {
    setSelectedUser(u);
    setModal('unlock');
  };

  const closeModal = () => {
    setModal(null);
    setSelectedUser(null);
    setFormError('');
  };

  const handleCreate = async (form) => {
    setFormLoading(true);
    setFormError('');
    try {
      await admin.users.create(form);
    } catch (err) {
      setFormError(err?.message || 'Failed to create user. Please try again.');
      setFormLoading(false);
      return;
    }
    await loadUsers();
    closeModal();
    showToast(`✅ User "${form.username}" created successfully`);
    setFormLoading(false);
  };

  const handleUpdate = async (form) => {
    setFormLoading(true);
    setFormError('');
    try {
      await admin.users.update(selectedUser.id, form);
    } catch (err) {
      setFormError(err?.message || 'Failed to update user. Please try again.');
      setFormLoading(false);
      return;
    }
    await loadUsers();
    closeModal();
    showToast('✅ User updated successfully');
    setFormLoading(false);
  };

  const handleDelete = async () => {
    setFormLoading(true);
    try {
      await admin.users.remove(selectedUser.id);
    } catch (err) {
      closeModal();
      showToast(err?.message || 'Failed to delete user');
      setFormLoading(false);
      return;
    }
    await loadUsers();
    closeModal();
    showToast(`🗑️ User "${selectedUser.username}" deleted`);
    setFormLoading(false);
  };

  const handleUnlock = async () => {
    setFormLoading(true);
    try {
      await admin.users.unlock(selectedUser.id);
      await loadUsers();
      closeModal();
      showToast(`🔓 User "${selectedUser.username}" unlocked successfully`);
    } catch (err) {
      setFormError(err?.message || 'Failed to unlock user');
    } finally {
      setFormLoading(false);
    }
  };

  const roleCounts = ROLES.reduce((acc, r) => {
    acc[r] = userList.filter(u => u.role === r).length;
    return acc;
  }, {});

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>👥 User Management</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Manage staff accounts, roles, and access credentials
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>+</span> Add User
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[{ label: 'Total Staff', value: userList.length, color: '#6366f1' },
          ...ROLES.map(r => ({ label: ROLE_LABELS[r], value: roleCounts[r] || 0, color: ROLE_COLORS[r] })),
        ].map(stat => (
          <div key={stat.label} style={{
            background: stat.color + '14', border: `1px solid ${stat.color}33`,
            borderRadius: 10, padding: '10px 18px', minWidth: 100, flex: '1 0 auto',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ ...inputStyle, maxWidth: 260, flex: '1 1 200px' }}
          placeholder="Search name, username, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['all', 'All Roles'], ...ROLES.map(r => [r, ROLE_LABELS[r]])].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setRoleFilter(val)}
              style={{
                padding: '6px 13px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                border: `1px solid ${roleFilter === val ? (ROLE_COLORS[val] || 'var(--primary)') : 'var(--border)'}`,
                background: roleFilter === val ? (ROLE_COLORS[val] || 'var(--primary)') + '18' : 'transparent',
                color: roleFilter === val ? (ROLE_COLORS[val] || 'var(--primary)') : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading users…</div>
      ) : fetchError ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 20, color: '#dc2626' }}>
          {fetchError}
          <button className="btn btn-secondary" onClick={loadUsers} style={{ marginLeft: 12 }}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          {search || roleFilter !== 'all' ? 'No users match your filters.' : 'No staff users found.'}
        </div>
      ) : (
        <div style={{ background: 'var(--surface, #ffffff)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Username', 'Role', 'Credentials / Specialty', 'Email', '2FA', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', fontWeight: 700,
                    fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5,
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr
                  key={u.id}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: (ROLE_COLORS[u.role] || '#6366f1') + '22',
                        color: ROLE_COLORS[u.role] || '#6366f1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 12, flexShrink: 0,
                      }}>
                        {(u.firstName[0] || '?').toUpperCase()}{(u.lastName?.[0] || '').toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600 }}>
                        {u.firstName} {u.lastName}
                        {u.id === currentUser?.id && (
                          <span style={{ fontSize: 10, background: '#e0f2fe', color: '#0369a1', borderRadius: 4, padding: '1px 5px', marginLeft: 6, fontWeight: 600 }}>You</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 12 }}>
                    {u.username}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <RoleBadge role={u.role} />
                  </td>
                  <td style={{ padding: '11px 14px', color: 'var(--text-secondary)', fontSize: 12 }}>
                    {u.credentials && <span style={{ fontWeight: 600 }}>{u.credentials}</span>}
                    {u.credentials && u.specialty && <span style={{ opacity: 0.5 }}> · </span>}
                    {u.specialty && <span>{u.specialty}</span>}
                    {u.role === 'prescriber' && (
                      <div style={{ marginTop: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {u.npi && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>NPI: <span style={{ fontFamily: 'monospace' }}>{u.npi}</span></span>}
                        {u.deaNumber && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>DEA: <span style={{ fontFamily: 'monospace' }}>{u.deaNumber}</span></span>}
                      </div>
                    )}
                    {u.locationId && (
                      <div style={{ marginTop: 3 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📍 {locationOptions.find(l => l.id === u.locationId)?.shortName || u.locationId}</span>
                      </div>
                    )}
                    {!u.credentials && !u.specialty && u.role !== 'prescriber' && <span style={{ opacity: 0.35 }}>—</span>}
                  </td>
                  <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{u.email}</td>
                  <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                    {u.twoFactorEnabled
                      ? <span title="2FA enabled" style={{ color: '#10b981' }}>✅</span>
                      : <span title="2FA disabled" style={{ color: '#ef4444' }}>✗</span>}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => openEdit(u)}
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        title="Edit user"
                      >✏️</button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => openReset(u)}
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        title="Reset password"
                        disabled={u.id === currentUser?.id}
                      >🔑</button>
                      {u.mustChangePassword && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => openUnlock(u)}
                          style={{ padding: '4px 10px', fontSize: 12, background: '#fbbf24' }}
                          title="Unlock account (clear password change requirement)"
                        >🔓</button>
                      )}
                      <button
                        className="btn btn-danger"
                        onClick={() => openDelete(u)}
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        title="Delete user"
                        disabled={u.id === currentUser?.id}
                      >🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {modal === 'add' && (
        <Modal title="Add New User" onClose={closeModal}>
          <UserForm
            initial={{ ...EMPTY_FORM, locationId: locationOptions[0]?.id || EMPTY_FORM.locationId }}
            onSave={handleCreate}
            onCancel={closeModal}
            loading={formLoading}
            error={formError}
            locationOptions={locationOptions}
          />
        </Modal>
      )}

      {modal === 'edit' && selectedUser && (
        <Modal title={`Edit — ${selectedUser.firstName} ${selectedUser.lastName}`} onClose={closeModal}>
          <UserForm
            initial={{
              id: selectedUser.id,
              firstName: selectedUser.firstName,
              lastName: selectedUser.lastName || '',
              username: selectedUser.username,
              email: selectedUser.email,
              password: '',
              role: selectedUser.role,
              credentials: selectedUser.credentials || '',
              specialty: selectedUser.specialty || '',
              npi: selectedUser.npi || '',
              deaNumber: selectedUser.deaNumber || '',
              twoFactorEnabled: selectedUser.twoFactorEnabled,
              locationId: selectedUser.locationId || locationOptions[0]?.id || '',
            }}
            onSave={handleUpdate}
            onCancel={closeModal}
            loading={formLoading}
            error={formError}
            locationOptions={locationOptions}
          />
        </Modal>
      )}

      {modal === 'delete' && selectedUser && (
        <DeleteConfirmModal
          user={selectedUser}
          onConfirm={handleDelete}
          onClose={closeModal}
          loading={formLoading}
        />
      )}

      {modal === 'reset' && selectedUser && (
        <ResetPasswordModal user={selectedUser} onClose={closeModal} />
      )}

      {modal === 'unlock' && selectedUser && (
        <UnlockModal user={selectedUser} onConfirm={handleUnlock} onClose={closeModal} loading={formLoading} />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface, #ffffff)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 20px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          zIndex: 2000, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
