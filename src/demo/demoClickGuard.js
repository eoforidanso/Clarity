/**
 * Clarity EHR — Demo Click Guard
 *
 * In demo mode, all button/input/form interactions are blocked
 * EXCEPT elements explicitly marked with data-demo-allowed
 * or inside the demo bar / tour card.
 *
 * Allowed:
 *   - [data-demo-allowed]        explicit opt-in
 *   - .demo-bar *                top banner controls
 *   - .demo-tour-card *          tour overlay buttons
 *   - NavLink / <a href>         sidebar + header navigation
 *   - [data-tour-nav]            tour prev/next/skip
 *
 * Blocked:
 *   - <button> (unless allowed)
 *   - <input> (unless allowed)
 *   - <select> (unless allowed)
 *   - <textarea> (unless allowed)
 *   - <form> submit
 */

import { isDemoMode } from './demoFeatureFlag';

// Only elements inside the tour card or explicitly marked are allowed
const TOUR_SELECTORS = [
  '.demo-tour-card',
  '.demo-tour-card *',
  '#demo-tour-btn',
  '#demo-exit-btn',
  '[data-demo-allowed]',
];

let _installed = false;
let _toastTimeout = null;

function isInsideTour(el) {
  if (!el || el === document.body) return false;
  for (const sel of TOUR_SELECTORS) {
    try { if (el.matches(sel)) return true; } catch { /* noop */ }
  }
  return el.parentElement ? isInsideTour(el.parentElement) : false;
}

function showBlockedToast() {
  if (_toastTimeout) return;
  _toastTimeout = setTimeout(() => { _toastTimeout = null; }, 1800);

  const existing = document.getElementById('demo-click-toast');
  if (existing) return;

  const toast = document.createElement('div');
  toast.id = 'demo-click-toast';
  toast.setAttribute('role', 'status');
  toast.style.cssText = `
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    z-index: 99998; background: #1e293b; color: #f1f5f9;
    padding: 10px 20px; border-radius: 10px;
    font-size: 13px; font-weight: 600; font-family: system-ui, sans-serif;
    box-shadow: 0 8px 28px rgba(0,0,0,0.3);
    border: 1px solid rgba(99,102,241,0.4);
    display: flex; align-items: center; gap: 10px;
    pointer-events: none;
    animation: demo-click-toast-in 0.15s ease;
    white-space: nowrap;
  `;
  toast.innerHTML = `
    <span style="font-size:16px">👋</span>
    Use the <strong style="color:#a5b4fc">Guided Tour</strong> to explore Clarity
  `;

  if (!document.getElementById('demo-click-toast-style')) {
    const style = document.createElement('style');
    style.id = 'demo-click-toast-style';
    style.textContent = `
      @keyframes demo-click-toast-in {
        from { opacity:0; transform:translateX(-50%) translateY(10px); }
        to   { opacity:1; transform:translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function blockEvent(e) {
  if (!isDemoMode()) return;
  if (isInsideTour(e.target)) return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  showBlockedToast();
}

export function installClickGuard() {
  if (_installed) return;
  _installed = true;
  // Block clicks on everything except the tour
  document.addEventListener('click',     blockEvent, true);
  document.addEventListener('mousedown', blockEvent, true);
  document.addEventListener('mouseup',   blockEvent, true);
  document.addEventListener('keydown', (e) => {
    if (!isDemoMode()) return;
    // Allow Escape and tour keyboard nav; block Enter/Space on non-tour elements
    if (e.key === 'Escape') return;
    if (isInsideTour(e.target)) return;
    if (['Enter', ' '].includes(e.key)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
  console.info('[DemoClickGuard] installed — only tour interactions allowed');
}

export function uninstallClickGuard() {
  _installed = false;
}
