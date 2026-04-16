import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const STORAGE_KEY = 'clarity_favorites';

const ALL_PAGES = [
  { path: '/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/schedule', icon: '📅', label: 'Schedule' },
  { path: '/patients', icon: '🔍', label: 'Patient Search' },
  { path: '/inbox', icon: '📬', label: 'Inbox' },
  { path: '/prescribe', icon: '💊', label: 'E-Prescribe' },
  { path: '/telehealth', icon: '📹', label: 'Telehealth' },
  { path: '/smart-phrases', icon: '⚡', label: 'Smart Phrases' },
  { path: '/analytics', icon: '📈', label: 'Analytics' },
  { path: '/care-gaps', icon: '🎯', label: 'Care Gaps' },
  { path: '/staff-messaging', icon: '💬', label: 'Staff Messaging' },
  { path: '/billing-dashboard', icon: '💰', label: 'Billing' },
  { path: '/claims-management', icon: '📋', label: 'Claims' },
  { path: '/tasks', icon: '✅', label: 'Tasks' },
  { path: '/referrals', icon: '🔄', label: 'Referrals' },
  { path: '/documents', icon: '📂', label: 'Documents' },
  { path: '/treatment-plans', icon: '📋', label: 'Treatment Plans' },
  { path: '/report-builder', icon: '📊', label: 'Report Builder' },
  { path: '/lab-tracking', icon: '🔬', label: 'Lab Tracking' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
];

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || ['/schedule', '/inbox', '/patients'];
  } catch { return ['/schedule', '/inbox', '/patients']; }
}

function saveFavorites(favs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

export default function FavoritesBar() {
  const [favorites, setFavorites] = useState(getFavorites);
  const [showPicker, setShowPicker] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleFavorite = (path) => {
    const next = favorites.includes(path)
      ? favorites.filter(f => f !== path)
      : [...favorites, path];
    setFavorites(next);
    saveFavorites(next);
  };

  const isFavorite = (path) => favorites.includes(path);

  const favPages = ALL_PAGES.filter(p => favorites.includes(p.path));

  return (
    <div className="favorites-bar">
      <div className="favorites-items">
        <span className="favorites-label">⭐</span>
        {favPages.map(p => (
          <button
            key={p.path}
            className={`favorites-chip ${location.pathname === p.path ? 'active' : ''}`}
            onClick={() => navigate(p.path)}
            title={p.label}
          >
            <span>{p.icon}</span>
            <span className="favorites-chip-text">{p.label}</span>
          </button>
        ))}
        <div style={{ position: 'relative' }} ref={pickerRef}>
          <button
            className="favorites-add-btn"
            onClick={() => setShowPicker(!showPicker)}
            title="Edit favorites"
          >
            {showPicker ? '✕' : '+'}
          </button>
          {showPicker && (
            <div className="favorites-picker">
              <div className="favorites-picker-title">Pin your favorite pages</div>
              {ALL_PAGES.map(p => (
                <label key={p.path} className="favorites-picker-item">
                  <input
                    type="checkbox"
                    checked={isFavorite(p.path)}
                    onChange={() => toggleFavorite(p.path)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function useFavoriteToggle() {
  const location = useLocation();
  const [favorites, setFavorites] = useState(getFavorites);

  const isFavorite = favorites.includes(location.pathname);

  const toggleCurrent = () => {
    const next = isFavorite
      ? favorites.filter(f => f !== location.pathname)
      : [...favorites, location.pathname];
    setFavorites(next);
    saveFavorites(next);
  };

  return { isFavorite, toggleCurrent };
}
