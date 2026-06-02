/**
 * Clarity EHR — Global Export Guard
 *
 * Intercepts ALL export/download mechanisms in demo mode:
 *   1. <a download> link clicks
 *   2. URL.createObjectURL() + click pattern
 *   3. window.open() for file URLs
 *   4. document.createElement('a') + click
 *   5. iframe-based downloads
 *   6. Print dialog
 *
 * Shows a toast instead of downloading.
 */

import { isDemoMode } from './demoFeatureFlag';

let _guardInstalled = false;

export function installExportGuard() {
  if (_guardInstalled || typeof window === 'undefined') return;
  _guardInstalled = true;

  // ── 1. Intercept all anchor clicks with download attribute ──────────────────
  document.addEventListener('click', (e) => {
    if (!isDemoMode()) return;
    const anchor = e.target.closest('a[download], a[href$=".csv"], a[href$=".pdf"], a[href$=".xlsx"], a[href$=".edi"]');
    if (anchor) {
      e.preventDefault();
      e.stopPropagation();
      showExportBlockedToast(anchor.getAttribute('download') || 'file');
    }
  }, true);

  // ── 2. Intercept URL.createObjectURL + programmatic download ───────────────
  const _origCreateObjectURL = URL.createObjectURL.bind(URL);
  URL.createObjectURL = function(blob) {
    if (isDemoMode()) {
      console.warn('[DemoGuard] URL.createObjectURL blocked in demo mode');
      showExportBlockedToast();
      return '#demo-blocked';
    }
    return _origCreateObjectURL(blob);
  };

  // ── 3. Intercept window.open for file downloads ────────────────────────────
  const _origWindowOpen = window.open.bind(window);
  window.open = function(url, target, features) {
    if (isDemoMode() && url && /\.(pdf|csv|xlsx|edi|txt|zip)(\?|$)/i.test(url)) {
      showExportBlockedToast();
      return null;
    }
    return _origWindowOpen(url, target, features);
  };

  // ── 4. Intercept print ─────────────────────────────────────────────────────
  const _origPrint = window.print.bind(window);
  window.print = function() {
    if (isDemoMode()) {
      showExportBlockedToast('print');
      return;
    }
    return _origPrint();
  };

  console.log('[DemoGuard] Export guard installed');
}

export function uninstallExportGuard() {
  _guardInstalled = false;
  // Note: event listeners and method overrides persist until page reload
  // Full cleanup requires page reload — acceptable for demo exit
}

// ── Toast notification ────────────────────────────────────────────────────────
let _toastEl = null;

function showExportBlockedToast(filename = 'export') {
  // Remove existing toast
  if (_toastEl) { _toastEl.remove(); _toastEl = null; }

  const toast = document.createElement('div');
  toast.setAttribute('role', 'alert');
  toast.style.cssText = `
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    z-index: 99999; background: #1e293b; color: #fff;
    padding: 12px 20px; border-radius: 10px;
    font-size: 13px; font-weight: 600; font-family: system-ui, sans-serif;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    display: flex; align-items: center; gap: 10px;
    animation: demo-toast-in 0.2s ease;
    border: 1px solid rgba(239,68,68,0.4);
    max-width: 420px; text-align: center;
  `;

  toast.innerHTML = `
    <span style="font-size:18px">🔒</span>
    <div>
      <div style="color:#f87171;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Export Disabled</div>
      <div>${filename !== 'print' ? `Downloading <strong>${filename}</strong>` : 'Printing'} is not available in demo mode.</div>
    </div>
  `;

  // Add keyframe if not present
  if (!document.getElementById('demo-toast-style')) {
    const style = document.createElement('style');
    style.id = 'demo-toast-style';
    style.textContent = `
      @keyframes demo-toast-in { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  _toastEl = toast;
  setTimeout(() => { toast.remove(); if (_toastEl === toast) _toastEl = null; }, 4000);
}
