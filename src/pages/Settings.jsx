import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTraining } from '../contexts/TrainingContext';
import { useAuth } from '../contexts/AuthContext';

/* ─── Theme Presets ──────────────────────────────────────── */
const THEMES = [
  {
    id: 'default',
    label: 'Clinical Blue',
    colors: {
      '--primary': '#0066cc', '--primary-dark': '#004999', '--primary-light': '#e8f2ff',
      '--primary-hover': '#005ab5', '--bg-sidebar': '#0f1729',
    },
  },
  {
    id: 'teal',
    label: 'Teal Calm',
    colors: {
      '--primary': '#0d9488', '--primary-dark': '#0f766e', '--primary-light': '#f0fdfa',
      '--primary-hover': '#0f766e', '--bg-sidebar': '#0c1a1a',
    },
  },
  {
    id: 'purple',
    label: 'Royal Purple',
    colors: {
      '--primary': '#7c3aed', '--primary-dark': '#6d28d9', '--primary-light': '#f5f3ff',
      '--primary-hover': '#6d28d9', '--bg-sidebar': '#1a1025',
    },
  },
  {
    id: 'forest',
    label: 'Forest Green',
    colors: {
      '--primary': '#15803d', '--primary-dark': '#166534', '--primary-light': '#f0fdf4',
      '--primary-hover': '#166534', '--bg-sidebar': '#0d1a12',
    },
  },
  {
    id: 'rose',
    label: 'Warm Rose',
    colors: {
      '--primary': '#be123c', '--primary-dark': '#9f1239', '--primary-light': '#fff1f2',
      '--primary-hover': '#9f1239', '--bg-sidebar': '#1a0f12',
    },
  },
  {
    id: 'slate',
    label: 'Dark Slate',
    colors: {
      '--primary': '#475569', '--primary-dark': '#334155', '--primary-light': '#f1f5f9',
      '--primary-hover': '#334155', '--bg-sidebar': '#111318',
    },
  },
  {
    id: 'amber',
    label: 'Amber Warm',
    colors: {
      '--primary': '#d97706', '--primary-dark': '#b45309', '--primary-light': '#fffbeb',
      '--primary-hover': '#b45309', '--bg-sidebar': '#1a1408',
    },
  },
  {
    id: 'ocean',
    label: 'Deep Ocean',
    colors: {
      '--primary': '#0284c7', '--primary-dark': '#0369a1', '--primary-light': '#f0f9ff',
      '--primary-hover': '#0369a1', '--bg-sidebar': '#0a1628',
    },
  },
  {
    id: 'dark',
    label: '🌙 Dark Mode',
    colors: {
      '--primary': '#60a5fa', '--primary-dark': '#3b82f6', '--primary-light': '#1e293b',
      '--primary-hover': '#3b82f6', '--bg-sidebar': '#020617',
      '--bg': '#0f172a', '--bg-hover': '#1e293b', '--bg-white': '#1e293b',
      '--bg-secondary': '#0f172a', '--surface': '#1e293b',
      '--text-primary': '#f1f5f9', '--text-secondary': '#94a3b8', '--text-muted': '#64748b',
      '--border': '#334155', '--border-light': '#1e293b',
      '--shadow-sm': '0 1px 3px rgba(0,0,0,0.3)', '--shadow': '0 4px 6px rgba(0,0,0,0.4)',
    },
  },
];

const STORAGE_KEY_THEME    = 'clarity_theme';
const STORAGE_KEY_SIG     = 'clarity_signature';
export const STORAGE_KEY_NAV_PREFS = 'clarity_nav_prefs';

export const DEFAULT_NAV_PREFS = {
  showApptReminders: true,
};

export function getNavPrefs() {
  try { return { ...DEFAULT_NAV_PREFS, ...JSON.parse(localStorage.getItem(STORAGE_KEY_NAV_PREFS)) }; } catch { return DEFAULT_NAV_PREFS; }
}

export const AI_FEATURES_KEY = 'clarity_ai_features';
export const DEFAULT_AI_FEATURES = {
  ambientSoap: true, voiceAssistant: true, aiTriage: true, aiClinicalAssistant: true,
  aiWaitlistMatch: true, cdsAlerts: true, aiCodingSuggestions: true, aiDocExtraction: true,
  aiPortalAssistant: true, aiDeduplicate: true,
};
export function getAIFeatures() {
  try { return { ...DEFAULT_AI_FEATURES, ...JSON.parse(localStorage.getItem(AI_FEATURES_KEY)) }; } catch { return DEFAULT_AI_FEATURES; }
}

function getStoredTheme() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_THEME)) || null; } catch { return null; }
}

function getStoredSignature(userId) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY_SIG)) || {};
    return all[userId] || null;
  } catch { return null; }
}

function saveSignature(userId, dataUrl) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY_SIG)) || {};
    if (dataUrl) { all[userId] = dataUrl; } else { delete all[userId]; }
    localStorage.setItem(STORAGE_KEY_SIG, JSON.stringify(all));
  } catch { /* noop */ }
}

export function applyTheme(themeId) {
  const preset = THEMES.find((t) => t.id === themeId);
  if (!preset) return;
  const root = document.documentElement;
  Object.entries(preset.colors).forEach(([k, v]) => root.style.setProperty(k, v));
  // derived tokens
  root.style.setProperty('--primary-mid', hexToMid(preset.colors['--primary'], 0.06));
  root.style.setProperty('--primary-ring', hexToMid(preset.colors['--primary'], 0.12));
  root.style.setProperty('--primary-glow', hexToMid(preset.colors['--primary'], 0.08));
  root.style.setProperty('--border-focus', preset.colors['--primary']);
  root.style.setProperty('--bg-sidebar-active', hexToMid(preset.colors['--primary'], 0.15));
  localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify({ id: themeId }));
}

function hexToMid(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ─── Component ──────────────────────────────────────────── */
export default function Settings() {
  const { currentUser } = useAuth();
  const { isTraining, enableTraining, disableTraining, resetTrainingData } = useTraining();
  const [activeSection, setActiveSection] = useState('theme');
  const [trainingConfirmReset, setTrainingConfirmReset] = useState(false);
  const [tourReset, setTourReset] = useState(false);

  /* Theme state */
  const stored = getStoredTheme();
  const [selectedTheme, setSelectedTheme] = useState(stored?.id || 'default');

  /* Signature state */
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [sigMode, setSigMode] = useState('draw'); // draw | type
  const [typedSig, setTypedSig] = useState('');
  const [savedSig, setSavedSig] = useState(null);
  const lastPoint = useRef(null);

  /* Navigation prefs state */
  const [navPrefs, setNavPrefs] = useState(() => getNavPrefs());
  const toggleNavPref = (key) => {
    setNavPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(STORAGE_KEY_NAV_PREFS, JSON.stringify(next));
      return next;
    });
  };

  /* AI Features state */
  const [aiFeatures, setAiFeatures] = useState(() => {
    try { return { ...DEFAULT_AI_FEATURES, ...JSON.parse(localStorage.getItem(AI_FEATURES_KEY)) }; } catch { return DEFAULT_AI_FEATURES; }
  });
  const toggleAI = (key) => {
    setAiFeatures(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(AI_FEATURES_KEY, JSON.stringify(next)); // exported key
      return next;
    });
  };

  useEffect(() => {
    if (currentUser?.id) {
      setSavedSig(getStoredSignature(currentUser.id));
    }
  }, [currentUser?.id]);

  /* ── Theme handlers ────────────────── */
  const handleThemeSelect = (id) => {
    setSelectedTheme(id);
    applyTheme(id);
  };

  /* ── Canvas drawing ────────────────── */
  const getCtx = useCallback(() => canvasRef.current?.getContext('2d'), []);

  const clearCanvas = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, [getCtx]);

  const startDraw = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    setIsDrawing(true);
    lastPoint.current = { x, y };
  }, []);

  const draw = useCallback((e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPoint.current = { x, y };
  }, [isDrawing, getCtx]);

  const stopDraw = useCallback(() => { setIsDrawing(false); lastPoint.current = null; }, []);

  /* Save signature */
  const handleSaveSignature = () => {
    let dataUrl = null;
    if (sigMode === 'draw' && canvasRef.current) {
      dataUrl = canvasRef.current.toDataURL('image/png');
    } else if (sigMode === 'type' && typedSig.trim()) {
      // Render typed text to a hidden canvas
      const offscreen = document.createElement('canvas');
      offscreen.width = 400;
      offscreen.height = 120;
      const ctx = offscreen.getContext('2d');
      ctx.clearRect(0, 0, 400, 120);
      ctx.font = '32px "Brush Script MT", "Segoe Script", cursive';
      ctx.fillStyle = '#1e293b';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedSig.trim(), 16, 60);
      dataUrl = offscreen.toDataURL('image/png');
    }
    if (dataUrl) {
      saveSignature(currentUser.id, dataUrl);
      setSavedSig(dataUrl);
    }
  };

  const handleDeleteSignature = () => {
    saveSignature(currentUser.id, null);
    setSavedSig(null);
    clearCanvas();
    setTypedSig('');
  };

  /* ── Render helpers ────────────────── */
  const sections = [
    { id: 'theme', icon: '🎨', label: 'Color Theme' },
    { id: 'signature', icon: '✍️', label: 'Electronic Signature' },
    { id: 'notifications', icon: '🔔', label: 'Notifications' },
    { id: 'shortcuts', icon: '⌨️', label: 'Keyboard Shortcuts' },
    { id: 'accessibility', icon: '♿', label: 'Accessibility' },
    { id: 'ai-features', icon: '🤖', label: 'AI Features' },
    { id: 'navigation', icon: '🧭', label: 'Navigation' },
    { id: 'training', icon: '🎓', label: 'Training Mode' },
    { id: 'about', icon: 'ℹ️', label: 'About' },
  ];

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%', overflow: 'hidden' }}>
      {/* Settings sidebar */}
      <div style={{
        width: 220, flexShrink: 0, borderRight: '1px solid var(--border)',
        background: 'var(--bg-white)', padding: '20px 0', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '0 20px 16px', fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
          Settings
        </div>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 20px', border: 'none', cursor: 'pointer',
              background: activeSection === s.id ? 'var(--primary-light)' : 'transparent',
              color: activeSection === s.id ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeSection === s.id ? 700 : 500,
              fontSize: 13, textAlign: 'left', width: '100%',
              borderRight: activeSection === s.id ? '3px solid var(--primary)' : '3px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 16 }}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Settings content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 32, background: 'var(--bg)' }}>
        {/* ─── Color Theme ─── */}
        {activeSection === 'theme' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' }}>
              Color Theme
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Choose a color scheme for the application. Changes apply immediately.
            </p>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 16,
            }}>
              {THEMES.map((t) => {
                const active = selectedTheme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleThemeSelect(t.id)}
                    style={{
                      border: active ? `2px solid ${t.colors['--primary']}` : '2px solid var(--border)',
                      borderRadius: 12, padding: 16, cursor: 'pointer',
                      background: active ? t.colors['--primary-light'] : 'var(--bg-white)',
                      textAlign: 'left', transition: 'all 0.15s',
                      boxShadow: active ? `0 0 0 3px ${hexToMid(t.colors['--primary'], 0.15)}` : 'var(--shadow-xs)',
                    }}
                  >
                    {/* Color preview strip */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: t.colors['--primary'],
                      }} />
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: t.colors['--primary-dark'],
                      }} />
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: t.colors['--bg-sidebar'],
                        border: '1px solid var(--border)',
                      }} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                      {t.label}
                    </div>
                    {active && (
                      <div style={{
                        marginTop: 6, fontSize: 11, fontWeight: 600,
                        color: t.colors['--primary'], display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        ✓ Active
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Reset button */}
            <div style={{ marginTop: 24 }}>
              <button
                onClick={() => handleThemeSelect('default')}
                style={{
                  padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-white)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', color: 'var(--text-secondary)',
                }}
              >
                Reset to Default
              </button>
            </div>
          </div>
        )}

        {/* ─── Electronic Signature ─── */}
        {activeSection === 'signature' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' }}>
              Electronic Signature
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Create and manage your electronic signature for signing clinical documents.
            </p>

            {/* Current saved signature */}
            {savedSig && (
              <div style={{
                background: 'var(--bg-white)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 20, marginBottom: 24,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Current Signature
                </div>
                <div style={{
                  background: '#fafbfc', borderRadius: 8, padding: 16,
                  border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <img src={savedSig} alt="Your signature" style={{ maxWidth: '100%', maxHeight: 100 }} />
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                  {currentUser?.firstName} {currentUser?.lastName}, {currentUser?.credentials}
                </div>
                <button
                  onClick={handleDeleteSignature}
                  style={{
                    marginTop: 12, padding: '6px 14px', borderRadius: 6,
                    border: '1px solid var(--danger)', background: 'var(--danger-light)',
                    color: 'var(--danger)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Delete Signature
                </button>
              </div>
            )}

            {/* Signature creation */}
            <div style={{
              background: 'var(--bg-white)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 20,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {savedSig ? 'Update Signature' : 'Create Signature'}
              </div>

              {/* Mode toggle */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
                <button
                  onClick={() => setSigMode('draw')}
                  style={{
                    padding: '8px 20px', border: '1px solid var(--border)',
                    borderRadius: '8px 0 0 8px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: sigMode === 'draw' ? 'var(--primary)' : 'var(--bg-white)',
                    color: sigMode === 'draw' ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  ✏️ Draw
                </button>
                <button
                  onClick={() => setSigMode('type')}
                  style={{
                    padding: '8px 20px', border: '1px solid var(--border)', borderLeft: 'none',
                    borderRadius: '0 8px 8px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: sigMode === 'type' ? 'var(--primary)' : 'var(--bg-white)',
                    color: sigMode === 'type' ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  ⌨️ Type
                </button>
              </div>

              {/* Draw mode */}
              {sigMode === 'draw' && (
                <div>
                  <div style={{
                    border: '2px dashed var(--border)', borderRadius: 10,
                    background: '#fff', overflow: 'hidden', position: 'relative',
                    touchAction: 'none',
                  }}>
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={150}
                      style={{ width: '100%', height: 150, cursor: 'crosshair', display: 'block' }}
                      onMouseDown={startDraw}
                      onMouseMove={draw}
                      onMouseUp={stopDraw}
                      onMouseLeave={stopDraw}
                      onTouchStart={startDraw}
                      onTouchMove={draw}
                      onTouchEnd={stopDraw}
                    />
                    <div style={{
                      position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                      fontSize: 11, color: 'var(--text-muted)', pointerEvents: 'none',
                    }}>
                      Sign above
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      onClick={clearCanvas}
                      style={{
                        padding: '7px 16px', borderRadius: 6, border: '1px solid var(--border)',
                        background: 'var(--bg-white)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleSaveSignature}
                      style={{
                        padding: '7px 16px', borderRadius: 6, border: 'none',
                        background: 'var(--primary)', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Save Signature
                    </button>
                  </div>
                </div>
              )}

              {/* Type mode */}
              {sigMode === 'type' && (
                <div>
                  <input
                    type="text"
                    value={typedSig}
                    onChange={(e) => setTypedSig(e.target.value)}
                    placeholder="Type your full name..."
                    maxLength={60}
                    style={{
                      width: '100%', padding: '14px 18px', fontSize: 14,
                      border: '2px solid var(--border)', borderRadius: 10,
                      fontFamily: '"Brush Script MT", "Segoe Script", cursive',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                  {/* Preview */}
                  {typedSig.trim() && (
                    <div style={{
                      marginTop: 12, background: '#fafbfc', borderRadius: 10,
                      border: '1px dashed var(--border)', padding: '20px 24px', textAlign: 'center',
                    }}>
                      <div style={{
                        fontFamily: '"Brush Script MT", "Segoe Script", cursive',
                        fontSize: 32, color: '#1e293b',
                      }}>
                        {typedSig}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>Preview</div>
                    </div>
                  )}
                  <div style={{ marginTop: 12 }}>
                    <button
                      onClick={handleSaveSignature}
                      disabled={!typedSig.trim()}
                      style={{
                        padding: '7px 16px', borderRadius: 6, border: 'none',
                        background: typedSig.trim() ? 'var(--primary)' : 'var(--border)',
                        color: typedSig.trim() ? 'white' : 'var(--text-muted)',
                        fontSize: 12, fontWeight: 600, cursor: typedSig.trim() ? 'pointer' : 'default',
                      }}
                    >
                      Save Signature
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Signature usage info */}
            <div style={{
              marginTop: 20, padding: 16, background: 'var(--info-light)',
              borderRadius: 10, border: '1px solid #bae6fd',
              fontSize: 12, color: 'var(--info)', lineHeight: 1.6,
            }}>
              <strong>ℹ️ About Electronic Signatures</strong><br />
              Your electronic signature is stored locally on this device and will be used when
              signing clinical notes, orders, and prescriptions. It is associated with your
              user credential: <strong>{currentUser?.firstName} {currentUser?.lastName}, {currentUser?.credentials}</strong>
            </div>
          </div>
        )}

        {/* ─── Notifications ─── */}
        {activeSection === 'notifications' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Notifications</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Configure how and when you receive notifications.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Lab Results', desc: 'Get notified when new lab results are available', default: true },
                { label: 'New Messages', desc: 'Inbox and staff messaging notifications', default: true },
                { label: 'Appointment Changes', desc: 'Check-ins, cancellations, and reschedules', default: true },
                { label: 'Order Updates', desc: 'Order completion and signature requests', default: true },
                { label: 'Prior Auth Alerts', desc: 'Prior authorization requirements and status changes', default: true },
                { label: 'Care Gap Reminders', desc: 'Alerts when patients have open care gaps', default: false },
                { label: 'System Maintenance', desc: 'Downtime and update notifications', default: false },
              ].map(n => (
                <label key={n.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', borderRadius: 10, background: 'var(--bg-white)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{n.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{n.desc}</div>
                  </div>
                  <input type="checkbox" defaultChecked={n.default} style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ─── Keyboard Shortcuts ─── */}
        {activeSection === 'shortcuts' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Keyboard Shortcuts</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Use these shortcuts for faster navigation. Press <kbd style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 11, fontWeight: 600 }}>Alt</kbd>+<kbd style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 11, fontWeight: 600 }}>/</kbd> to see shortcuts anytime.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { keys: 'Ctrl/⌘ + K', desc: 'Open Command Palette' },
                { keys: 'Alt + P', desc: 'Find Patient' },
                { keys: 'Alt + S', desc: 'Open Schedule' },
                { keys: 'Alt + I', desc: 'Open Inbox' },
                { keys: 'Alt + D', desc: 'Go to Dashboard' },
                { keys: 'Alt + N', desc: 'New Progress Note' },
                { keys: 'Alt + T', desc: 'Open Telehealth' },
                { keys: 'Alt + M', desc: 'Staff Messaging' },
                { keys: 'Alt + /', desc: 'Show Shortcuts Overlay' },
                { keys: 'Escape', desc: 'Close Modal/Panel' },
              ].map(s => (
                <div key={s.keys} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', borderRadius: 8, background: 'var(--bg-white)',
                  border: '1px solid var(--border-light)',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.desc}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {s.keys.split(' + ').map((k, i) => (
                      <React.Fragment key={i}>
                        <kbd style={{
                          padding: '3px 8px', borderRadius: 4, background: 'var(--bg)', fontSize: 12,
                          fontWeight: 700, border: '1px solid var(--border)', fontFamily: 'var(--font-mono)',
                        }}>{k.trim()}</kbd>
                        {i < s.keys.split(' + ').length - 1 && <span style={{ color: 'var(--text-muted)' }}>+</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Accessibility ─── */}
        {activeSection === 'accessibility' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Accessibility</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Adjust settings for better accessibility and usability.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', borderRadius: 10, background: 'var(--bg-white)', border: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Reduce Animations</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Minimize motion and transitions for motion-sensitive users</div>
                </div>
                <input type="checkbox" style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
              </label>
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', borderRadius: 10, background: 'var(--bg-white)', border: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>High Contrast Mode</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Increase contrast between text and backgrounds</div>
                </div>
                <input type="checkbox" style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
              </label>
              <div style={{
                padding: '14px 18px', borderRadius: 10, background: 'var(--bg-white)', border: '1px solid var(--border)',
              }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Font Size</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12 }}>A</span>
                  <input type="range" min="12" max="18" defaultValue="14" style={{ flex: 1, accentColor: 'var(--primary)' }}
                    onChange={e => document.documentElement.style.fontSize = e.target.value + 'px'} />
                  <span style={{ fontSize: 18, fontWeight: 700 }}>A</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── AI Features ─── */}
        {activeSection === 'ai-features' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>AI Features</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Enable or disable individual AI-powered capabilities across Clarity. Changes take effect immediately.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'ambientSoap', label: 'Ambient SOAP Generation', desc: 'Auto-generate SOAP notes from encounter conversation using AI', icon: '🎙️' },
                { key: 'voiceAssistant', label: 'Voice Assistant', desc: 'Voice command navigation and chart control (Ctrl+Shift+V)', icon: '🗣️' },
                { key: 'aiTriage', label: 'AI Patient Triage Chat', desc: 'AI-powered symptom assessment and urgency classification', icon: '🤖' },
                { key: 'aiClinicalAssistant', label: 'AI Clinical Assistant', desc: 'Floating AI assistant for clinical decision support and drug interactions', icon: '🧠' },
                { key: 'aiWaitlistMatch', label: 'AI Waitlist Auto-Match', desc: 'Automatically match waitlist patients to open appointment slots', icon: '📋' },
                { key: 'cdsAlerts', label: 'CDS Alerts (Clinical Decision Support)', desc: 'Real-time alerts for drug interactions, care gaps, and best practices', icon: '⚠️' },
                { key: 'aiCodingSuggestions', label: 'AI Code Suggestions', desc: 'Auto-suggest ICD-10 and CPT codes from clinical note text', icon: '💡' },
                { key: 'aiDocExtraction', label: 'AI Document Data Extraction', desc: 'OCR and NLP extraction of discrete data from uploaded faxes and documents', icon: '📄' },
                { key: 'aiPortalAssistant', label: 'Patient Portal AI Assistant', desc: 'AI chatbot inside the patient portal for self-service and FAQs', icon: '💬' },
                { key: 'aiDeduplicate', label: 'AI Record Deduplication', desc: 'Automatically detect and merge duplicate patient records across networks', icon: '🔗' },
              ].map(f => (
                <label key={f.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', borderRadius: 10, background: 'var(--bg-white)', border: '1px solid var(--border)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <span style={{ fontSize: 22, width: 36, textAlign: 'center' }}>{f.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{f.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{f.desc}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: aiFeatures[f.key] ? '#dcfce7' : '#fef2f2',
                      color: aiFeatures[f.key] ? '#16a34a' : '#dc2626',
                    }}>
                      {aiFeatures[f.key] ? 'ON' : 'OFF'}
                    </span>
                    <input type="checkbox" checked={aiFeatures[f.key]} onChange={() => toggleAI(f.key)}
                      style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }} />
                  </div>
                </label>
              ))}
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-primary" onClick={() => {
                const all = {};
                Object.keys(DEFAULT_AI_FEATURES).forEach(k => all[k] = true);
                setAiFeatures(all);
                localStorage.setItem(AI_FEATURES_KEY, JSON.stringify(all));
              }}>✅ Enable All</button>
              <button className="btn btn-sm btn-secondary" onClick={() => {
                const none = {};
                Object.keys(DEFAULT_AI_FEATURES).forEach(k => none[k] = false);
                setAiFeatures(none);
                localStorage.setItem(AI_FEATURES_KEY, JSON.stringify(none));
              }}>🚫 Disable All</button>
            </div>
          </div>
        )}

        {/* ─── Navigation ─── */}
        {activeSection === 'navigation' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Navigation</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Choose which items appear in the sidebar navigation. Toggle individual pages on or off to tailor your workspace.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'showApptReminders', icon: '📣', label: 'Appointment Reminders', desc: 'Show the Appointment Reminders page in the Administration section of the sidebar' },
              ].map(item => (
                <label key={item.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', borderRadius: 10, background: 'var(--bg-white)', border: '1px solid var(--border)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <span style={{ fontSize: 22, width: 36, textAlign: 'center' }}>{item.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.desc}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: navPrefs[item.key] ? '#dcfce7' : '#fef2f2',
                      color: navPrefs[item.key] ? '#16a34a' : '#dc2626',
                    }}>
                      {navPrefs[item.key] ? 'Shown' : 'Hidden'}
                    </span>
                    <input type="checkbox" checked={navPrefs[item.key]} onChange={() => toggleNavPref(item.key)}
                      style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }} />
                  </div>
                </label>
              ))}
            </div>
            <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
              ⓘ Changes take effect immediately and are saved to this browser. The Appointment Reminders page remains accessible via its direct URL regardless of this setting.
            </p>
          </div>
        )}

        {/* ─── About ─── */}
        {activeSection === 'training' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>🎓 Training Mode</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Enable Training Mode for onboarding staff or running demos. All actions use mock data — no real patient data is affected.
            </p>

            {/* Status card */}
            <div style={{
              background: isTraining ? 'linear-gradient(135deg,#7c2d12,#c2410c)' : 'var(--bg-white)',
              border: isTraining ? '2px solid #ea580c' : '1px solid var(--border)',
              borderRadius: 12, padding: '20px 24px', marginBottom: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: isTraining ? '#fff' : 'var(--text-primary)', marginBottom: 4 }}>
                  {isTraining ? '🟠 Training Mode is ON' : '⚪ Training Mode is OFF'}
                </div>
                <div style={{ fontSize: 12, color: isTraining ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)' }}>
                  {isTraining
                    ? 'A banner is shown on every screen reminding users this is a training environment.'
                    : 'Enable to create a safe sandbox for training new staff or running demos.'}
                </div>
              </div>
              <button
                onClick={() => isTraining ? disableTraining() : enableTraining()}
                style={{
                  background: isTraining ? '#fff' : 'var(--primary)',
                  color: isTraining ? '#c2410c' : '#fff',
                  border: 'none', borderRadius: 8,
                  padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {isTraining ? 'Disable Training Mode' : 'Enable Training Mode'}
              </button>
            </div>

            {/* What training mode does */}
            <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>What Training Mode does</h3>
              {[
                { icon: '🟠', text: 'Shows a persistent orange banner on every screen so no one confuses training data with real data' },
                { icon: '👥', text: 'All demo patients, appointments, and records are pre-loaded mock data — safe to edit or delete' },
                { icon: '🚫', text: 'No real API calls are made — prescriptions, lab orders, and messages stay local' },
                { icon: '🔄', text: 'Reset Training Data button wipes any saved changes and restores the original demo dataset' },
                { icon: '✅', text: 'All features are fully functional so trainees can practice every workflow end-to-end' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 13 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.text}</span>
                </div>
              ))}
            </div>

            {/* Reset button */}
            {isTraining && (
              <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Reset Training Data</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                  This clears all locally saved changes and reloads the original demo dataset. Your theme and settings preferences are preserved.
                </p>
                {!trainingConfirmReset ? (
                  <button
                    className="btn btn-sm"
                    style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                    onClick={() => setTrainingConfirmReset(true)}
                  >
                    🔄 Reset Training Data
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Are you sure? All unsaved training changes will be lost.</span>
                    <button className="btn btn-sm" style={{ background: '#ef4444', color: '#fff', border: 'none' }} onClick={() => { setTrainingConfirmReset(false); resetTrainingData(); }}>Yes, Reset</button>
                    <button className="btn btn-sm btn-outline" onClick={() => setTrainingConfirmReset(false)}>Cancel</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeSection === 'about' && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>About Clarity EHR</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              System information and version details.
            </p>
            <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: 20, textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🧠</div>
                <h3 style={{ fontSize: 18, fontWeight: 800 }}>Clarity EHR</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Outpatient Behavioral Health</p>
              </div>
              {[
                { label: 'Version', value: '2.0.0' },
                { label: 'Build', value: '2026.04.15-prod' },
                { label: 'HIPAA Compliant', value: '✅ Yes' },
                { label: 'FHIR R4', value: '✅ Supported' },
                { label: 'ONC Certified', value: '✅ 2015 Cures Edition' },
                { label: 'EPCS Enabled', value: '✅ DEA Compliant' },
                { label: '42 CFR Part 2', value: '✅ SUD Privacy' },
              ].map(r => (
                <div key={r.label} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '10px 20px',
                  borderBottom: '1px solid var(--border-light)', fontSize: 13,
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
                  <span style={{ fontWeight: 600 }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { localStorage.removeItem('clarity_tour_completed'); setTourReset(true); setTimeout(() => setTourReset(false), 4000); }}>
                🎬 Restart Onboarding Tour
              </button>
              {tourReset && <span style={{ marginLeft: 12, fontSize: 12, color: '#166534', fontWeight: 700 }}>✅ Tour will restart on next page load</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
