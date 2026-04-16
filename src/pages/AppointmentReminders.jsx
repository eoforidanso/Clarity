import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';

/* ─── athenaCommunicator — Automated Appointment Reminders & Outreach ─────── */

const REMINDER_TEMPLATES = [
  {
    id: 't1', name: 'Appointment Reminder — 48hr',
    channel: 'SMS + Email', trigger: '48 hours before', active: true,
    sms: 'Hi {{firstName}}, reminder: you have an appointment at Clarity on {{date}} at {{time}} with {{provider}}. Reply C to confirm or R to reschedule.',
    email: 'Dear {{firstName}},\n\nThis is a friendly reminder that you have an upcoming appointment:\n\n📅 Date: {{date}}\n⏰ Time: {{time}}\n👩‍⚕️ Provider: {{provider}}\n📍 Location: Clarity Outpatient Clinic\n\nPlease arrive 10 minutes early. If you need to reschedule, reply to this email or call (312) 555-0199.\n\nClarity Mental Health',
  },
  {
    id: 't2', name: 'Appointment Reminder — 24hr',
    channel: 'SMS', trigger: '24 hours before', active: true,
    sms: 'Hi {{firstName}}, your Clarity appointment is tomorrow at {{time}} with {{provider}}. Reply C to confirm.',
  },
  {
    id: 't3', name: 'Telehealth Link — 1hr',
    channel: 'SMS + Email', trigger: '1 hour before', active: true,
    sms: 'Hi {{firstName}}, your telehealth visit starts in 1 hour. Join here: {{telehealthLink}} — Test your camera & mic beforehand!',
  },
  {
    id: 't4', name: 'No-Show Follow-Up',
    channel: 'SMS + Phone', trigger: 'After missed appointment', active: true,
    sms: 'Hi {{firstName}}, we missed you at your appointment today. We care about your well-being — please call us at (312) 555-0199 to reschedule.',
  },
  {
    id: 't5', name: 'Assessment Due Reminder',
    channel: 'Email', trigger: '3 days before appointment', active: true,
    email: 'Dear {{firstName}},\n\nYou have assessments to complete before your upcoming visit on {{date}}. Please log into the Patient Portal to complete your PHQ-9 and GAD-7.\n\nThank you,\nClarity Mental Health',
  },
  {
    id: 't6', name: 'Prescription Refill Reminder',
    channel: 'SMS', trigger: '7 days before refill due', active: false,
    sms: 'Hi {{firstName}}, your prescription for {{medication}} may need a refill soon. Contact Clarity at (312) 555-0199 or request a refill via the Patient Portal.',
  },
  {
    id: 't7', name: 'Care Gap Outreach',
    channel: 'SMS + Email', trigger: 'When care gap detected', active: false,
    sms: 'Hi {{firstName}}, it\'s been a while since your last visit. Your care team at Clarity would like to check in. Call (312) 555-0199 to schedule.',
  },
];

const RECENT_MESSAGES = [
  { patient: 'James Anderson', template: 'Appointment Reminder — 48hr', channel: 'SMS', sentAt: '2026-04-13 08:00', status: 'Delivered', response: 'Confirmed (C)' },
  { patient: 'Maria Garcia', template: 'Appointment Reminder — 48hr', channel: 'Email', sentAt: '2026-04-13 08:00', status: 'Opened', response: '—' },
  { patient: 'David Thompson', template: 'Telehealth Link — 1hr', channel: 'SMS', sentAt: '2026-04-14 13:30', status: 'Delivered', response: '—' },
  { patient: 'Emily Chen', template: 'Assessment Due Reminder', channel: 'Email', sentAt: '2026-04-12 09:00', status: 'Opened', response: 'Completed PHQ-9' },
  { patient: 'Robert Wilson', template: 'No-Show Follow-Up', channel: 'SMS', sentAt: '2026-04-11 16:30', status: 'Delivered', response: 'Called back — rescheduled' },
  { patient: 'Aisha Patel', template: 'Appointment Reminder — 24hr', channel: 'SMS', sentAt: '2026-04-14 09:00', status: 'Delivered', response: 'Confirmed (C)' },
  { patient: 'James Anderson', template: 'Prescription Refill Reminder', channel: 'SMS', sentAt: '2026-04-10 10:00', status: 'Delivered', response: 'Refill requested' },
  { patient: 'Maria Garcia', template: 'Care Gap Outreach', channel: 'Email', sentAt: '2026-04-08 08:00', status: 'Bounced', response: '—' },
];

const STATS = {
  sent: 1247,
  delivered: 1198,
  opened: 843,
  confirmed: 612,
  noShows: 34,
  rescheduled: 89,
};

export default function AppointmentReminders() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [templates, setTemplates] = useState(REMINDER_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showNewCampaign, setShowNewCampaign] = useState(false);

  const toggleTemplate = (id) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t));
  };

  const card = {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  };

  const sectionLabel = {
    display: 'block', fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
    letterSpacing: '0.05em', color: '#64748b', marginBottom: 6,
  };

  const tabs = [
    { key: 'overview', icon: '📊', label: 'Overview' },
    { key: 'templates', icon: '📝', label: 'Templates' },
    { key: 'history', icon: '📜', label: 'Message History' },
    { key: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  const CHANNEL_ICONS = { SMS: '📱', Email: '📧', Phone: '📞', 'SMS + Email': '📱📧', 'SMS + Phone': '📱📞' };
  const STATUS_COLORS = { Delivered: '#16a34a', Opened: '#0891b2', Bounced: '#dc2626', Pending: '#f59e0b', Confirmed: '#4f46e5' };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            📣 Appointment Reminders & Outreach
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Automated patient communication — appointment reminders, no-show follow-up, care gap outreach
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              padding: '10px 20px', borderRadius: '10px 10px 0 0', border: 'none',
              background: activeTab === t.key ? '#fff' : 'transparent',
              color: activeTab === t.key ? '#4f46e5' : '#64748b',
              fontWeight: activeTab === t.key ? 800 : 600, fontSize: 13, cursor: 'pointer',
              borderBottom: activeTab === t.key ? '2px solid #4f46e5' : '2px solid transparent',
              marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ════ Overview ════ */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Messages Sent', value: STATS.sent.toLocaleString(), icon: '📤', color: '#4f46e5' },
              { label: 'Delivered', value: STATS.delivered.toLocaleString(), icon: '✅', color: '#16a34a' },
              { label: 'Opened/Read', value: STATS.opened.toLocaleString(), icon: '👁️', color: '#0891b2' },
              { label: 'Confirmed', value: STATS.confirmed.toLocaleString(), icon: '✔️', color: '#7c3aed' },
              { label: 'Rescheduled', value: STATS.rescheduled, icon: '🔄', color: '#d97706' },
              { label: 'No-Shows', value: STATS.noShows, icon: '❌', color: '#dc2626' },
            ].map(s => (
              <div key={s.label} style={{ ...card, textAlign: 'center', padding: 16 }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Delivery funnel */}
            <div style={card}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>📊 Communication Funnel</h3>
              {[
                { label: 'Sent', count: STATS.sent, pct: 100, color: '#4f46e5' },
                { label: 'Delivered', count: STATS.delivered, pct: Math.round((STATS.delivered / STATS.sent) * 100), color: '#16a34a' },
                { label: 'Opened / Read', count: STATS.opened, pct: Math.round((STATS.opened / STATS.sent) * 100), color: '#0891b2' },
                { label: 'Confirmed', count: STATS.confirmed, pct: Math.round((STATS.confirmed / STATS.sent) * 100), color: '#7c3aed' },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{f.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: f.color }}>{f.count.toLocaleString()} ({f.pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${f.pct}%`, background: f.color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Active templates */}
            <div style={card}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>📝 Active Reminder Templates</h3>
              {templates.filter(t => t.active).map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 18 }}>{CHANNEL_ICONS[t.channel] || '📱'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{t.channel} · Trigger: {t.trigger}</div>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════ Templates ════ */}
      {activeTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {templates.map(t => (
            <div key={t.id} style={{ ...card, borderColor: t.active ? '#bbf7d0' : '#fecaca' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{CHANNEL_ICONS[t.channel] || '📱'}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Channel: <strong>{t.channel}</strong> · Trigger: <strong>{t.trigger}</strong>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.active ? '#16a34a' : '#dc2626' }}>
                    {t.active ? '● Active' : '○ Inactive'}
                  </span>
                  <button onClick={() => toggleTemplate(t.id)}
                    style={{
                      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
                      background: t.active ? '#16a34a' : '#cbd5e1', transition: 'background 0.2s',
                    }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
                      left: t.active ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                </div>
              </div>
              {t.sms && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', marginBottom: 4 }}>SMS Preview</div>
                  <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{t.sms}</div>
                </div>
              )}
              {t.email && (
                <div style={{ marginTop: 8, padding: '10px 14px', background: '#fefce8', borderRadius: 8, border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#ca8a04', textTransform: 'uppercase', marginBottom: 4 }}>Email Preview</div>
                  <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{t.email}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ════ History ════ */}
      {activeTab === 'history' && (
        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>📜 Recent Message History</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['Patient', 'Template', 'Channel', 'Sent At', 'Status', 'Response'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECENT_MESSAGES.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e293b' }}>{m.patient}</td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>{m.template}</td>
                    <td style={{ padding: '10px 12px' }}>{CHANNEL_ICONS[m.channel] || ''} {m.channel}</td>
                    <td style={{ padding: '10px 12px', color: '#475569', fontSize: 12 }}>{m.sentAt}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: `${STATUS_COLORS[m.status] || '#6b7280'}15`,
                        color: STATUS_COLORS[m.status] || '#6b7280',
                      }}>{m.status}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: m.response === '—' ? '#94a3b8' : '#16a34a', fontWeight: m.response === '—' ? 400 : 600, fontSize: 12 }}>{m.response}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════ Settings ════ */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={card}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>📱 Channel Configuration</h3>
            {[
              { channel: 'SMS', enabled: true, desc: 'Send text message reminders to patient mobile phones', icon: '📱' },
              { channel: 'Email', enabled: true, desc: 'Send email reminders and detailed appointment info', icon: '📧' },
              { channel: 'Phone (Robocall)', enabled: false, desc: 'Automated phone call reminders for patients without mobile', icon: '📞' },
              { channel: 'Patient Portal Push', enabled: true, desc: 'In-app notifications within the patient portal', icon: '🔔' },
            ].map(c => (
              <div key={c.channel} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{c.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{c.channel}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{c.desc}</div>
                  </div>
                </div>
                <div style={{
                  padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: c.enabled ? '#f0fdf4' : '#f1f5f9', color: c.enabled ? '#16a34a' : '#94a3b8',
                }}>{c.enabled ? 'Enabled' : 'Disabled'}</div>
              </div>
            ))}
          </div>

          <div style={card}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>⏰ Timing Preferences</h3>
            {[
              { label: 'First Reminder', value: '48 hours before', desc: 'Primary appointment reminder' },
              { label: 'Second Reminder', value: '24 hours before', desc: 'Follow-up confirmation request' },
              { label: 'Telehealth Link', value: '1 hour before', desc: 'Video visit join link' },
              { label: 'No-Show Follow-Up', value: 'Same day, 4:30 PM', desc: 'After missed appointment' },
              { label: 'Assessment Reminder', value: '3 days before', desc: 'Pre-visit assessment completion' },
              { label: 'Quiet Hours', value: '9 PM – 8 AM', desc: 'No messages sent during quiet hours' },
            ].map(t => (
              <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{t.desc}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#4f46e5' }}>{t.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
