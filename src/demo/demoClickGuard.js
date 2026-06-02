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

const ALLOWED_SELECTORS = [
  '[data-demo-allowed]',
  '.demo-bar',
  '.demo-bar *',
  '.demo-tour-card',
  '.demo-tour-card *',
  '[data-tour-nav]',
  'a[href]',              // all navigation links
  '.skip-link',
  '#demo-exit-btn',
  '#demo-tour-btn',
];

const BLOCKED_TAGS = ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];

let _installed = false;
let _toastTimeout = null;

function isAllowed(el) {
  if (!el || el === document.body) return false;
  for (const sel of ALLOWED_SELECTORS) {
    try { if (el.matches(sel)) return true; } catch { /* noop */ }
  }
  // Walk up the tree
  if (el.parentElement) return isAllowed(el.parentElement);
  return false;
}

function showBlockedToast() {
  // Debounce — don't spam toasts
  if (_toastTimeout) return;
  _toastTimeout = setTimeout(() => { _toastTimeout = null; }, 1500);

  const existing = document.getElementById('demo-click-toast');
  if (existing) return;

  const toast = document.createElement('div');
  toast.id = 'demo-click-toast';
  toast.setAttribute('role', 'status');
  toast.style.cssText = `
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    z-index: 99998; background: #1e293b; color: #f1f5f9;
    padding: 9px 18px; border-radius: 9px;
    font-size: 12px; font-weight: 600; font-family: system-ui, sans-serif;
    box-shadow: 0 6px 24px rgba(0,0,0,0.25);
    border: 1px solid rgba(99,102,241,0.35);
    display: flex; align-items: center; gap: 8px;
    pointer-events: none;
    animation: demo-click-toast-in 0.15s ease;
    white-space: nowrap;
  `;
  toast.innerHTML = `
    <span style="font-size:14px">👋</span>
    Follow the <strong style="color:#a5b4fc">Guided Tour</strong> to explore Clarity
  `;

  if (!document.getElementById('demo-click-toast-style')) {
    const style = document.createElement('style');
    style.id = 'demo-click-toast-style';
    style.textContent = `
      @keyframes demo-click-toast-in {
        from { opacity:0; transform:translateX(-50%) translateY(8px); }
        to   { opacity:1; transform:translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function handleClick(e) {
  if (!isDemoMode()) return;
  const target = e.target;
  if (!target) return;

  // Allow all links (navigation)
  if (target.closest('a[href]')) return;

  // Check if element or ancestor is allowed
  if (isAllowed(target)) return;

  // Block if it's an interactive element
  const tag = target.tagName;
  const closestInteractive = target.closest('button, input, select, textarea, [role="button"], [onclick]');
  if (!closestInteractive) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  showBlockedToast();
}

export function installClickGuard() {
  if (_installed) return;
  _installed = true;
  document.addEventListener('click', handleClick, true);   // capture phase
  document.addEventListener('mousedown', (e) => {
    if (!isDemoMode()) return;
    const el = e.target?.closest('button, input, select, textarea');
    if (el && !isAllowed(el)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
  console.info('[DemoClickGuard] installed — interactive elements blocked');
}

export function uninstallClickGuard() {
  _installed = false;
  // Note: full removal requires page reload — acceptable on demo exit
}
