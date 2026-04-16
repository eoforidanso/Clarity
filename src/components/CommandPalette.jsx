import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../contexts/PatientContext';

/* ── Page Commands ─────────────────────────────────────── */
const PAGE_COMMANDS = [
  { id: 'dashboard', icon: '🏠', label: 'Dashboard', path: '/dashboard', category: 'Pages' },
  { id: 'schedule', icon: '📅', label: 'Schedule', path: '/schedule', category: 'Pages' },
  { id: 'inbox', icon: '📬', label: 'Clinical Inbox', path: '/inbox', category: 'Pages' },
  { id: 'patients', icon: '🔍', label: 'Patient Search', path: '/patients', category: 'Pages' },
  { id: 'staff-messaging', icon: '💬', label: 'Staff Messaging', path: '/staff-messaging', category: 'Pages' },
  { id: 'telehealth', icon: '📹', label: 'Telehealth', path: '/telehealth', category: 'Pages' },
  { id: 'prescribe', icon: '💊', label: 'E-Prescribe', path: '/prescribe', category: 'Clinical Tools' },
  { id: 'smart-phrases', icon: '⚡', label: 'Smart Phrases', path: '/smart-phrases', category: 'Clinical Tools' },
  { id: 'patient-chat', icon: '💬', label: 'Patient Chat', path: '/patient-chat', category: 'Clinical Tools' },
  { id: 'analytics', icon: '📈', label: 'Analytics', path: '/analytics', category: 'Reporting' },
  { id: 'care-gaps', icon: '🎯', label: 'Care Gaps', path: '/care-gaps', category: 'Reporting' },
  { id: 'billing', icon: '💰', label: 'Billing Dashboard', path: '/billing-dashboard', category: 'Billing' },
  { id: 'claims', icon: '📋', label: 'Claims Management', path: '/claims-management', category: 'Billing' },
  { id: 'denials', icon: '⚠️', label: 'Denials & Appeals', path: '/denial-management', category: 'Billing' },
  { id: 'settings', icon: '⚙️', label: 'Settings', path: '/settings', category: 'System' },
  { id: 'admin-toolkit', icon: '🗂️', label: 'Admin Toolkit', path: '/admin-toolkit', category: 'System' },
  { id: 'btg-audit', icon: '🔓', label: 'BTG Audit Log', path: '/btg-audit', category: 'System' },
];

const KEYBOARD_SHORTCUTS = [
  { id: 'ks-new-note', icon: '📝', label: 'New Progress Note (Alt+N)', category: 'Shortcuts' },
  { id: 'ks-patient-search', icon: '🔍', label: 'Find Patient (Alt+P)', category: 'Shortcuts' },
  { id: 'ks-schedule', icon: '📅', label: 'View Schedule (Alt+S)', category: 'Shortcuts' },
  { id: 'ks-inbox', icon: '📬', label: 'Open Inbox (Alt+I)', category: 'Shortcuts' },
  { id: 'ks-help', icon: '⌨️', label: 'Keyboard Shortcuts (Alt+/)', category: 'Shortcuts' },
];

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();
  const { patients, openChart } = usePatient();

  // Open/close with Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  // Build results
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const items = [];

    // Search patients
    if (q.length > 0) {
      const matchedPatients = patients.filter(p =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
      ).slice(0, 5).map(p => ({
        id: `patient-${p.id}`,
        icon: '👤',
        label: `${p.lastName}, ${p.firstName}`,
        subtitle: `MRN ${p.mrn} · ${p.dob}`,
        category: 'Patients',
        action: () => { openChart(p.id); navigate(`/chart/${p.id}/summary`); },
      }));
      items.push(...matchedPatients);
    }

    // Search pages
    const matchedPages = PAGE_COMMANDS.filter(c =>
      q.length === 0 || c.label.toLowerCase().includes(q)
    ).map(c => ({
      ...c,
      action: () => navigate(c.path),
    }));
    items.push(...matchedPages);

    // Search shortcuts
    if (q.length === 0 || 'shortcut'.includes(q) || 'keyboard'.includes(q)) {
      items.push(...KEYBOARD_SHORTCUTS.slice(0, q.length === 0 ? 2 : 5));
    }

    return items;
  }, [query, patients, navigate, openChart]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleNav = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        const item = results[selectedIndex];
        if (item.action) item.action();
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleNav);
    return () => document.removeEventListener('keydown', handleNav);
  }, [isOpen, results, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const active = listRef.current.querySelector('.cmd-item.active');
      if (active) active.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Reset selection when query changes
  useEffect(() => { setSelectedIndex(0); }, [query]);

  if (!isOpen) return null;

  // Group results by category
  const grouped = {};
  results.forEach(r => {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push(r);
  });

  return (
    <div className="cmd-overlay" onClick={() => setIsOpen(false)}>
      <div className="cmd-palette" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-wrapper">
          <span className="cmd-search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="cmd-input"
            placeholder="Search patients, pages, commands..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <kbd className="cmd-kbd">ESC</kbd>
        </div>
        <div className="cmd-results" ref={listRef}>
          {results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
              <p style={{ fontSize: 13 }}>No results for "{query}"</p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="cmd-category">{category}</div>
                {items.map((item) => {
                  const globalIdx = results.indexOf(item);
                  return (
                    <div
                      key={item.id}
                      className={`cmd-item ${globalIdx === selectedIndex ? 'active' : ''}`}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      onClick={() => { if (item.action) item.action(); setIsOpen(false); }}
                    >
                      <span className="cmd-item-icon">{item.icon}</span>
                      <div className="cmd-item-text">
                        <span className="cmd-item-label">{item.label}</span>
                        {item.subtitle && <span className="cmd-item-subtitle">{item.subtitle}</span>}
                      </div>
                      {item.path && <span className="cmd-item-hint">Go →</span>}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="cmd-footer">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>⎋ Close</span>
        </div>
      </div>
    </div>
  );
}
