import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTraining } from '../contexts/TrainingContext';
import { useAuth } from '../contexts/AuthContext';
import DemoGuard, { DemoDisabled } from '../demo/DemoGuard';
import { useDemo } from '../demo/DemoContext';

/* ─── Theme Presets ──────────────────────────────────────── */
const THEMES = [
  {
    id: 'default', label: 'Clinical Blue', mood: 'Calm',
    gradient: 'linear-gradient(135deg, #0066cc 0%, #004999 100%)',
    accent: '#0066cc', cardBg: '#e8f2ff',
    colors: {
      '--primary': '#0066cc', '--primary-dark': '#004999', '--primary-light': '#e8f2ff',
      '--primary-hover': '#005ab5', '--bg-sidebar': '#0f1729',
    },
  },
  {
    id: 'teal', label: 'Teal Calm', mood: 'Calm',
    gradient: 'linear-gradient(135deg, #0d9488 0%, #0c7a6e 100%)',
    accent: '#0d9488', cardBg: '#f0fdfa',
    colors: {
      '--primary': '#0d9488', '--primary-dark': '#0f766e', '--primary-light': '#f0fdfa',
      '--primary-hover': '#0f766e', '--bg-sidebar': '#0c1a1a',
    },
  },
  {
    id: 'ocean', label: 'Deep Ocean', mood: 'Calm',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #075985 100%)',
    accent: '#0284c7', cardBg: '#f0f9ff',
    colors: {
      '--primary': '#0284c7', '--primary-dark': '#0369a1', '--primary-light': '#f0f9ff',
      '--primary-hover': '#0369a1', '--bg-sidebar': '#0a1628',
    },
  },
  {
    id: 'purple', label: 'Royal Purple', mood: 'Bold',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
    accent: '#7c3aed', cardBg: '#f5f3ff',
    colors: {
      '--primary': '#7c3aed', '--primary-dark': '#6d28d9', '--primary-light': '#f5f3ff',
      '--primary-hover': '#6d28d9', '--bg-sidebar': '#1a1025',
    },
  },
  {
    id: 'forest', label: 'Forest Green', mood: 'Bold',
    gradient: 'linear-gradient(135deg, #15803d 0%, #0f5f2e 100%)',
    accent: '#15803d', cardBg: '#f0fdf4',
    colors: {
      '--primary': '#15803d', '--primary-dark': '#166534', '--primary-light': '#f0fdf4',
      '--primary-hover': '#166534', '--bg-sidebar': '#0d1a12',
    },
  },
  {
    id: 'amber', label: 'Amber Warm', mood: 'Bold',
    gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    accent: '#d97706', cardBg: '#fffbeb',
    colors: {
      '--primary': '#d97706', '--primary-dark': '#b45309', '--primary-light': '#fffbeb',
      '--primary-hover': '#b45309', '--bg-sidebar': '#1a1408',
    },
  },
  {
    id: 'slate', label: 'Dark Slate', mood: 'Dark',
    gradient: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
    accent: '#475569', cardBg: '#f1f5f9',
    colors: {
      '--primary': '#475569', '--primary-dark': '#334155', '--primary-light': '#f1f5f9',
      '--primary-hover': '#334155', '--bg-sidebar': '#111318',
    },
  },
  {
    id: 'dark', label: 'Dark Mode', mood: 'Dark',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #020617 100%)',
    accent: '#60a5fa', cardBg: '#1e293b',
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

/* ─── Theme mood groups ───────────────────────────────────── */
const THEME_GROUPS = [
  { mood: 'Calm',  icon: '🌊', desc: 'Focused, clinical, and easy on the eyes' },
  { mood: 'Bold',  icon: '⚡', desc: 'Vibrant and energetic for long sessions'   },
  { mood: 'Dark',  icon: '🌙', desc: 'Low-light environments and night shifts'   },
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
  const { currentUser, updateUserSignature } = useAuth();
  const { isTraining, enableTraining, disableTraining, resetTrainingData } = useTraining();
  const [activeSection, setActiveSection] = useState('theme');
  const [trainingConfirmReset, setTrainingConfirmReset] = useState(false);
  const [tourReset, setTourReset] = useState(false);

  /* Theme state */
  const stored = getStoredTheme();
  const [selectedTheme, setSelectedTheme] = useState(stored?.id || 'default');
  const [hoveredTheme, setHoveredTheme] = useState(null);
  const [themeToast, setThemeToast] = useState(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [justApplied, setJustApplied] = useState(null);
  const toastTimerRef = useRef(null);
  const swatchGridRef = useRef(null);

  /* Signature state */
  const canvasRef = useRef(null);
  const uploadInputRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [sigMode, setSigMode] = useState('draw'); // draw | type | upload
  const [typedSig, setTypedSig] = useState('');
  const [savedSig, setSavedSig] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [sigSaving, setSigSaving] = useState(false);
  const [sigSaveStatus, setSigSaveStatus] = useState(null); // 'saved' | 'error' | null
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

  useEffect(() => {
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, []);

  /* ── Theme handlers ────────────────── */
  const handleThemeSelect = (id) => {
    setSelectedTheme(id);
    applyTheme(id);
    setPreviewKey(k => k + 1);
    setJustApplied(id);
    setTimeout(() => setJustApplied(null), 1200);
    const preset = THEMES.find((t) => t.id === id);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setThemeToast(preset?.label || id);
    toastTimerRef.current = setTimeout(() => setThemeToast(null), 3000);
  };

  const handleSwatchKeyDown = (e, idx) => {
    const count = THEMES.length;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleThemeSelect(THEMES[idx].id);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      swatchGridRef.current?.children[(idx + 1) % count]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      swatchGridRef.current?.children[(idx - 1 + count) % count]?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      swatchGridRef.current?.children[Math.min(idx + 3, count - 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      swatchGridRef.current?.children[Math.max(idx - 3, 0)]?.focus();
    } else if (e.key === 'Escape') {
      swatchGridRef.current?.children[idx]?.blur();
    }
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

  /* Upload signature image */
  const handleUploadFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUploadPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  /* Save signature */
  const handleSaveSignature = async () => {
    let dataUrl = null;
    if (sigMode === 'upload' && uploadPreview) {
      dataUrl = uploadPreview;
    } else if (sigMode === 'draw' && canvasRef.current) {
      dataUrl = canvasRef.current.toDataURL('image/png');
    } else if (sigMode === 'type' && typedSig.trim()) {
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
    if (!dataUrl) return;
    setSigSaving(true);
    setSigSaveStatus(null);
    try {
      await updateUserSignature(dataUrl);
      setSavedSig(dataUrl);
      setSigSaveStatus('saved');
      setTimeout(() => setSigSaveStatus(null), 3000);
    } catch {
      setSigSaveStatus('error');
    } finally {
      setSigSaving(false);
    }
  };

  const handleDeleteSignature = async () => {
    setSigSaving(true);
    setSigSaveStatus(null);
    try {
      await updateUserSignature(null);
      setSavedSig(null);
      clearCanvas();
      setTypedSig('');
      setUploadPreview(null);
      setSigSaveStatus('deleted');
      setTimeout(() => setSigSaveStatus(null), 2000);
    } catch {
      setSigSaveStatus('error');
    } finally {
      setSigSaving(false);
    }
  };

  const { isDemo } = useDemo();

  /* ── Render helpers ────────────────── */
  const allSections = [
    { id: 'theme', icon: '🎨', label: 'Color Theme', demoAllowed: true },
    { id: 'signature', icon: '✍️', label: 'Electronic Signature', demoAllowed: false },
    { id: 'notifications', icon: '🔔', label: 'Notifications', demoAllowed: true },
    { id: 'shortcuts', icon: '⌨️', label: 'Keyboard Shortcuts', demoAllowed: true },
    { id: 'accessibility', icon: '♿', label: 'Accessibility', demoAllowed: true },
    { id: 'ai-features', icon: '🤖', label: 'AI Features', demoAllowed: false },
    { id: 'navigation', icon: '🧭', label: 'Navigation', demoAllowed: true },
    { id: 'training', icon: '🎓', label: 'Training Mode', demoAllowed: false },
    { id: 'about', icon: 'ℹ️', label: 'About', demoAllowed: true },
  ];
  const sections = isDemo ? allSections.filter(s => s.demoAllowed) : allSections;

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
            {/* Section header */}
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: 0 }}>
                🎨 Color Theme
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6, marginBottom: 0 }}>
                Personalize your workspace — changes apply instantly across the entire app
              </p>
              <div style={{ marginTop: 16, height: 1, background: 'linear-gradient(90deg, var(--border) 0%, transparent 100%)' }} />
            </div>

            {/* Theme groups */}
            {THEME_GROUPS.map(group => {
              const groupThemes = THEMES.filter(t => t.mood === group.mood);
              return (
                <div key={group.mood} style={{ marginBottom: 36 }}>
                  {/* Group label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 16 }}>{group.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.2px' }}>{group.mood}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{group.desc}</div>
                    </div>
                  </div>

                  {/* Cards grid */}
                  <div
                    ref={group.mood === 'Calm' ? swatchGridRef : null}
                    role="radiogroup"
                    aria-label={`${group.mood} themes`}
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}
                  >
                    {groupThemes.map((t) => {
                      const active = selectedTheme === t.id;
                      const hovered = hoveredTheme === t.id;
                      const applied = justApplied === t.id;
                      const isDark = t.id === 'dark';
                      const globalIdx = THEMES.findIndex(th => th.id === t.id);
                      return (
                        <button
                          key={t.id}
                          role="radio"
                          aria-checked={active}
                          aria-label={`${t.label} theme`}
                          tabIndex={active ? 0 : -1}
                          onClick={() => handleThemeSelect(t.id)}
                          onMouseEnter={() => setHoveredTheme(t.id)}
                          onMouseLeave={() => setHoveredTheme(null)}
                          onKeyDown={(e) => handleSwatchKeyDown(e, globalIdx)}
                          style={{
                            position: 'relative',
                            border: active
                              ? `2px solid ${t.accent}`
                              : `1.5px solid ${hovered ? t.accent + '55' : 'var(--border)'}`,
                            borderRadius: 14, padding: 0, cursor: 'pointer',
                            background: 'var(--bg-white)',
                            textAlign: 'left', overflow: 'hidden',
                            transition: 'all 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                            transform: hovered && !active ? 'translateY(-3px)' : active ? 'translateY(-1px)' : 'translateY(0)',
                            boxShadow: active
                              ? `0 0 0 4px ${hexToMid(t.accent, 0.18)}, 0 8px 24px ${hexToMid(t.accent, 0.22)}`
                              : hovered
                                ? `0 8px 28px ${hexToMid(t.accent, 0.20)}, 0 2px 8px rgba(0,0,0,0.08)`
                                : '0 1px 4px rgba(0,0,0,0.06)',
                          }}
                        >
                          {/* Gradient header — mini app preview */}
                          <div style={{
                            background: t.gradient, padding: '14px 14px 10px',
                            position: 'relative', overflow: 'hidden',
                          }}>
                            {/* Glow orb */}
                            <div style={{
                              position: 'absolute', width: 80, height: 80, borderRadius: '50%',
                              background: 'rgba(255,255,255,0.08)', top: -20, right: -20,
                              pointerEvents: 'none',
                            }} />
                            {/* Mini sidebar + content mockup */}
                            <div style={{ display: 'flex', gap: 6, height: 52 }}>
                              {/* Mini sidebar */}
                              <div style={{
                                width: 28, background: t.colors['--bg-sidebar'],
                                borderRadius: 5, padding: '4px 3px', flexShrink: 0,
                              }}>
                                {[1,0.4,0.4].map((op, i) => (
                                  <div key={i} style={{
                                    height: 4, borderRadius: 2, marginBottom: 3,
                                    background: i === 0
                                      ? hexToMid(t.accent, 0.7)
                                      : 'rgba(255,255,255,0.18)',
                                    width: i === 0 ? '100%' : `${70 + i * 10}%`,
                                  }} />
                                ))}
                              </div>
                              {/* Mini content */}
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {/* Header bar */}
                                <div style={{
                                  height: 10, borderRadius: 3,
                                  background: 'rgba(255,255,255,0.25)',
                                }} />
                                {/* Two cards */}
                                <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                                  {[1, 0.7].map((op, i) => (
                                    <div key={i} style={{
                                      flex: 1, borderRadius: 3,
                                      background: `rgba(255,255,255,${op * 0.18})`,
                                    }} />
                                  ))}
                                </div>
                                {/* Button row */}
                                <div style={{ display: 'flex', gap: 3 }}>
                                  <div style={{ width: 24, height: 5, borderRadius: 2, background: 'rgba(255,255,255,0.85)' }} />
                                  <div style={{ width: 18, height: 5, borderRadius: 2, background: 'rgba(255,255,255,0.3)' }} />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Card body */}
                          <div style={{ padding: '12px 14px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                                {t.label}
                              </div>
                              {/* Animated checkmark */}
                              {active && (
                                <div style={{
                                  width: 20, height: 20, borderRadius: '50%',
                                  background: t.accent, display: 'flex', alignItems: 'center',
                                  justifyContent: 'center', flexShrink: 0,
                                  animation: applied ? 'theme-check-pop 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
                                }}>
                                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                              )}
                            </div>
                            {/* Colour swatches row */}
                            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                              <div style={{ width: 14, height: 14, borderRadius: 3, background: t.accent, border: '1px solid rgba(0,0,0,0.1)' }} />
                              <div style={{ width: 14, height: 14, borderRadius: 3, background: t.colors['--primary-dark'], border: '1px solid rgba(0,0,0,0.1)' }} />
                              <div style={{ width: 14, height: 14, borderRadius: 3, background: t.colors['--bg-sidebar'], border: '1px solid rgba(0,0,0,0.15)' }} />
                              <div style={{ width: 14, height: 14, borderRadius: 3, background: t.cardBg, border: '1px solid rgba(0,0,0,0.08)' }} />
                            </div>
                          </div>

                          {/* Active glow overlay */}
                          {active && (
                            <div style={{
                              position: 'absolute', inset: 0, borderRadius: 14, pointerEvents: 'none',
                              boxShadow: `inset 0 0 0 2px ${t.accent}`,
                            }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, marginBottom: 24 }}>
              ← → ↑ ↓ navigate · Enter / Space to apply · Esc to dismiss focus
            </p>

            {/* Live Preview Panel */}
            {(() => {
              const activeT = THEMES.find(t => t.id === selectedTheme);
              if (!activeT) return null;
              return (
                <div
                  key={previewKey}
                  style={{
                    borderRadius: 16, border: `1px solid var(--border)`,
                    overflow: 'hidden', background: 'var(--bg-white)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
                    animation: 'theme-preview-fade 0.2s ease',
                  }}
                >
                  {/* Preview header */}
                  <div style={{
                    padding: '14px 20px', borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Live Preview
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: activeT.accent, marginTop: 1 }}>
                        {activeT.label}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        document.documentElement.requestFullscreen?.();
                      }}
                      style={{
                        padding: '5px 12px', borderRadius: 7, border: `1.5px solid ${activeT.accent}40`,
                        background: `${activeT.accent}10`, color: activeT.accent, fontSize: 11, fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ⛶ Full Screen Preview
                    </button>
                  </div>

                  {/* Preview body */}
                  <div style={{ display: 'flex', height: 200 }}>
                    {/* Mock sidebar */}
                    <div style={{ width: 130, background: activeT.colors['--bg-sidebar'], padding: '14px 10px', flexShrink: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, paddingLeft: 6 }}>
                        Navigation
                      </div>
                      {[
                        { label: '📊 Dashboard', active: true },
                        { label: '📅 Schedule',  active: false },
                        { label: '🔍 Patients',  active: false },
                        { label: '📬 Inbox',     active: false },
                      ].map(item => (
                        <div key={item.label} style={{
                          padding: '6px 8px', borderRadius: 6, marginBottom: 2, fontSize: 10, fontWeight: item.active ? 700 : 400,
                          background: item.active ? hexToMid(activeT.accent, 0.2) : 'transparent',
                          color: item.active ? activeT.accent : 'rgba(255,255,255,0.45)',
                          borderLeft: item.active ? `3px solid ${activeT.accent}` : '3px solid transparent',
                        }}>
                          {item.label}
                        </div>
                      ))}
                    </div>

                    {/* Mock content */}
                    <div style={{ flex: 1, padding: '14px 20px', background: 'var(--bg)', overflow: 'hidden' }}>
                      {/* Mock header bar */}
                      <div style={{
                        height: 32, borderRadius: 8, background: 'var(--bg-white)',
                        border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                        padding: '0 12px', gap: 8, marginBottom: 12,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}>
                        <div style={{ width: 60, height: 7, borderRadius: 3, background: activeT.accent, opacity: 0.8 }} />
                        <div style={{ flex: 1 }} />
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: activeT.gradient }} />
                      </div>

                      {/* Mock cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        {[
                          { label: "Today's Appts", value: '8', color: activeT.accent },
                          { label: 'Checked In',    value: '3', color: activeT.colors['--primary-dark'] },
                          { label: 'Unread',        value: '2', color: activeT.accent },
                        ].map(card => (
                          <div key={card.label} style={{
                            borderRadius: 8, padding: '10px 10px 8px',
                            background: 'var(--bg-white)', border: '1px solid var(--border)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          }}>
                            <div style={{ fontSize: 18, fontWeight: 900, color: card.color, lineHeight: 1 }}>{card.value}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3, fontWeight: 600 }}>{card.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Mock button row */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <div style={{
                          padding: '5px 14px', borderRadius: 6,
                          background: activeT.accent, color: '#fff', fontSize: 10, fontWeight: 700,
                        }}>
                          + New Encounter
                        </div>
                        <div style={{
                          padding: '5px 12px', borderRadius: 6,
                          border: `1.5px solid ${activeT.accent}`, color: activeT.accent, fontSize: 10, fontWeight: 600,
                        }}>
                          View Schedule
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Reset */}
            <div style={{ marginTop: 24 }}>
              <button
                onClick={() => handleThemeSelect('default')}
                style={{
                  padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-white)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', color: 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                ↺ Reset to Clinical Blue
              </button>
            </div>

            {/* Keyframe styles */}
            <style>{`
              @keyframes theme-check-pop {
                0%   { transform: scale(0); opacity: 0; }
                60%  { transform: scale(1.3); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
              }
              @keyframes theme-preview-fade {
                from { opacity: 0; transform: translateY(6px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>
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
                    borderRadius: '0 0 0 0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: sigMode === 'type' ? 'var(--primary)' : 'var(--bg-white)',
                    color: sigMode === 'type' ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  ⌨️ Type
                </button>
                <button
                  onClick={() => setSigMode('upload')}
                  style={{
                    padding: '8px 20px', border: '1px solid var(--border)', borderLeft: 'none',
                    borderRadius: '0 8px 8px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: sigMode === 'upload' ? 'var(--primary)' : 'var(--bg-white)',
                    color: sigMode === 'upload' ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  📤 Upload
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
                      disabled={sigSaving}
                      style={{
                        padding: '7px 16px', borderRadius: 6, border: 'none',
                        background: sigSaveStatus === 'saved' ? '#16a34a' : 'var(--primary)',
                        color: 'white', fontSize: 12, fontWeight: 600,
                        cursor: sigSaving ? 'not-allowed' : 'pointer',
                        opacity: sigSaving ? 0.7 : 1,
                        transition: 'background 0.2s',
                      }}
                    >
                      {sigSaving ? 'Saving…' : sigSaveStatus === 'saved' ? '✓ Saved' : 'Save Signature'}
                    </button>
                    {sigSaveStatus === 'error' && (
                      <span style={{ fontSize: 11, color: 'var(--danger)', alignSelf: 'center' }}>Save failed — try again</span>
                    )}
                  </div>
                </div>
              )}

              {/* Upload mode */}
              {sigMode === 'upload' && (
                <div>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleUploadFile}
                  />
                  {!uploadPreview ? (
                    <div
                      onClick={() => uploadInputRef.current?.click()}
                      style={{
                        border: '2px dashed var(--border)', borderRadius: 10,
                        background: '#fafbfc', padding: '32px 24px', textAlign: 'center',
                        cursor: 'pointer', transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📤</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Click to upload signature image</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>PNG, JPG, GIF, or WebP — transparent background recommended</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{
                        background: '#fafbfc', borderRadius: 10, padding: '20px 24px',
                        border: '1px dashed var(--border)', textAlign: 'center',
                      }}>
                        <img src={uploadPreview} alt="Signature preview" style={{ maxHeight: 100, maxWidth: '100%' }} />
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>Preview</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button
                          onClick={() => { setUploadPreview(null); uploadInputRef.current && (uploadInputRef.current.value = ''); }}
                          style={{
                            padding: '7px 16px', borderRadius: 6, border: '1px solid var(--border)',
                            background: 'var(--bg-white)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => uploadInputRef.current?.click()}
                          style={{
                            padding: '7px 16px', borderRadius: 6, border: '1px solid var(--border)',
                            background: 'var(--bg-white)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          Change Image
                        </button>
                        <button
                          onClick={handleSaveSignature}
                          disabled={sigSaving}
                          style={{
                            padding: '7px 16px', borderRadius: 6, border: 'none',
                            background: sigSaveStatus === 'saved' ? '#16a34a' : 'var(--primary)',
                            color: 'white', fontSize: 12, fontWeight: 600,
                            cursor: sigSaving ? 'not-allowed' : 'pointer',
                            opacity: sigSaving ? 0.7 : 1,
                          }}
                        >
                          {sigSaving ? 'Saving…' : sigSaveStatus === 'saved' ? '✓ Saved' : 'Save Signature'}
                        </button>
                      </div>
                    </div>
                  )}
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
                      disabled={!typedSig.trim() || sigSaving}
                      style={{
                        padding: '7px 16px', borderRadius: 6, border: 'none',
                        background: sigSaveStatus === 'saved' ? '#16a34a' : typedSig.trim() ? 'var(--primary)' : 'var(--border)',
                        color: typedSig.trim() ? 'white' : 'var(--text-muted)',
                        fontSize: 12, fontWeight: 600,
                        cursor: typedSig.trim() && !sigSaving ? 'pointer' : 'default',
                        opacity: sigSaving ? 0.7 : 1,
                      }}
                    >
                      {sigSaving ? 'Saving…' : sigSaveStatus === 'saved' ? '✓ Saved' : 'Save Signature'}
                    </button>
                    {sigSaveStatus === 'error' && (
                      <span style={{ fontSize: 11, color: 'var(--danger)', marginLeft: 8 }}>Save failed — try again</span>
                    )}
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

      {/* ── Theme selection toast ── */}
      {themeToast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#1e293b', color: '#f1f5f9',
          padding: '12px 18px 12px 16px', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', gap: 12,
          animation: 'fadeInUp 0.22s ease both',
          minWidth: 260,
        }}>
          <span style={{ fontSize: 22 }}>🎨</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Theme updated</div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>
              Your interface now uses {themeToast}
            </div>
          </div>
          <button
            onClick={() => setThemeToast(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20, padding: '0 2px', lineHeight: 1, marginLeft: 4 }}
            aria-label="Dismiss notification"
          >×</button>
        </div>
      )}
    </div>
  );
}
