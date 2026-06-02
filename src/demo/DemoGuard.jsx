/**
 * Clarity EHR — Demo Guard
 *
 * Wraps any content that should be hidden or restricted in demo mode.
 * Usage:
 *   <DemoGuard reason="clearinghouse">  → shows locked card
 *   <DemoGuard reason="admin">
 *   <DemoGuard reason="phi">
 *   <DemoGuard reason="api">
 *   <DemoGuard reason="ai">
 *   <DemoGuard inline />                → inline "🔒 Hidden in demo" badge
 */

import React from 'react';
import { useDemo } from './DemoContext';

const REASONS = {
  clearinghouse: {
    icon: '⚡',
    title: 'Live Clearinghouse Engine',
    desc: 'Real-time 837P/I compilation, payer routing, 835 ERA auto-posting, and 999 ACK handling are hidden in the demo to protect the proprietary transmission layer.',
    cta: 'See it with your data',
  },
  phi: {
    icon: '🔒',
    title: 'Clinical & Patient Data',
    desc: 'This section contains real patient health information (PHI). In the guided demo you are viewing anonymized sample data. A full walkthrough uses your practice\'s own records.',
    cta: 'Schedule a HIPAA-safe walkthrough',
  },
  admin: {
    icon: '⚙️',
    title: 'Admin & System Controls',
    desc: 'User management, role permissions, audit trail, and system configuration are restricted in demo mode to prevent accidental changes to the demo environment.',
    cta: 'Request an admin demo',
  },
  architecture: {
    icon: '🏗️',
    title: 'System Architecture',
    desc: 'API documentation, server configuration, database schema, and infrastructure details are not exposed in the public demo.',
    cta: 'Talk to our engineering team',
  },
  ai: {
    icon: '🧠',
    title: 'AI & RCM Intelligence',
    desc: 'Denial prediction scoring, RCM optimization algorithms, and AI clinical decision support are proprietary and shown only in a supervised demonstration.',
    cta: 'See the AI engine live',
  },
  api: {
    icon: '🔑',
    title: 'API Access',
    desc: 'API keys, webhook endpoints, EDI transport configuration, and developer credentials are hidden in the demo environment.',
    cta: 'Request API access',
  },
  destructive: {
    icon: '🛡️',
    title: 'Action Restricted',
    desc: 'This action is disabled in demo mode to protect the demo environment.',
    cta: null,
  },
};

export default function DemoGuard({ reason = 'admin', children, inline = false, fallback = null }) {
  const { isDemo } = useDemo();

  if (!isDemo) return children;

  // Inline badge — for small UI elements
  if (inline) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
        background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a',
        cursor: 'default',
      }} title="Hidden in demo mode">
        🔒 Demo
      </span>
    );
  }

  // Custom fallback
  if (fallback) return fallback;

  const cfg = REASONS[reason] || REASONS.admin;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 320, padding: '48px 32px', textAlign: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      border: '1.5px dashed #cbd5e1', borderRadius: 14,
    }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>{cfg.icon}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
        {cfg.title}
      </div>
      <div style={{ fontSize: 13, color: '#64748b', maxWidth: 380, lineHeight: 1.65, marginBottom: 20 }}>
        {cfg.desc}
      </div>
      {cfg.cta && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a
            href="mailto:info@clarity-ehr.com?subject=Clarity EHR Demo Request"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', borderRadius: 9,
              background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
              color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(15,23,42,0.18)',
            }}
          >
            {cfg.cta} →
          </a>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '9px 16px', borderRadius: 9, border: '1px solid #e2e8f0',
            background: '#fff', color: '#64748b', fontSize: 11, fontWeight: 600,
          }}>
            🔒 Restricted in demo
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * DemoSafe — renders children with PHI masked as ████ in demo mode
 * Use for patient names, MRNs, DOBs, insurance IDs etc.
 */
export function DemoSafe({ children, mask = '████', show = false }) {
  const { isDemo } = useDemo();
  if (!isDemo || show) return children;
  return (
    <span style={{
      background: '#e2e8f0', color: 'transparent', borderRadius: 3,
      userSelect: 'none', cursor: 'default',
    }} title="Hidden in demo" aria-label="Hidden">
      {mask}
    </span>
  );
}

/**
 * DemoDisabled — wraps a button/input and disables it in demo mode
 */
export function DemoDisabled({ children, reason = 'Demo mode — action disabled' }) {
  const { isDemo } = useDemo();
  if (!isDemo) return children;
  return (
    <span
      style={{ position: 'relative', display: 'inline-block', cursor: 'not-allowed' }}
      title={reason}
    >
      <span style={{ pointerEvents: 'none', opacity: 0.4 }}>{children}</span>
    </span>
  );
}
