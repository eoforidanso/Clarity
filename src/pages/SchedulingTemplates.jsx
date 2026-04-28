import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const h = Math.floor(i / 2) + 7;
  const m = i % 2 === 0 ? '00' : '30';
  if (h > 18) return null;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h > 12 ? h - 12 : h;
  return `${hh}:${m} ${ampm}`;
}).filter(Boolean);

const BLOCK_TYPES = [
  { id: 'patient', label: 'Patient Appointments', color: '#3b82f6', icon: '👤' },
  { id: 'therapy', label: 'Therapy Sessions', color: '#8b5cf6', icon: '🧠' },
  { id: 'telehealth', label: 'Telehealth Only', color: '#06b6d4', icon: '📹' },
  { id: 'admin', label: 'Admin Time', color: '#f59e0b', icon: '📋' },
  { id: 'meeting', label: 'Meetings/Huddles', color: '#ef4444', icon: '👥' },
  { id: 'lunch', label: 'Lunch Break', color: '#10b981', icon: '🍽️' },
  { id: 'blocked', label: 'Blocked/Off', color: '#94a3b8', icon: '🚫' },
];

const MOCK_TEMPLATES = [
  {
    id: 'tpl1', name: 'Dr. Chris — Standard Week', provider: 'Dr. Christopher Adams',
    effectiveFrom: '2026-01-06', effectiveTo: '2026-06-30', status: 'Active', isDefault: true,
    blocks: [
      { day: 'Monday', start: '8:00 AM', end: '12:00 PM', type: 'patient', label: 'Morning Clinic' },
      { day: 'Monday', start: '12:00 PM', end: '1:00 PM', type: 'lunch', label: 'Lunch' },
      { day: 'Monday', start: '1:00 PM', end: '3:00 PM', type: 'therapy', label: 'Therapy Block' },
      { day: 'Monday', start: '3:00 PM', end: '5:00 PM', type: 'telehealth', label: 'Telehealth' },
      { day: 'Tuesday', start: '8:00 AM', end: '12:00 PM', type: 'patient', label: 'Morning Clinic' },
      { day: 'Tuesday', start: '12:00 PM', end: '1:00 PM', type: 'lunch', label: 'Lunch' },
      { day: 'Tuesday', start: '1:00 PM', end: '5:00 PM', type: 'patient', label: 'Afternoon Clinic' },
      { day: 'Wednesday', start: '8:00 AM', end: '9:00 AM', type: 'meeting', label: 'Team Huddle' },
      { day: 'Wednesday', start: '9:00 AM', end: '12:00 PM', type: 'patient', label: 'Morning Clinic' },
      { day: 'Wednesday', start: '12:00 PM', end: '1:00 PM', type: 'lunch', label: 'Lunch' },
      { day: 'Wednesday', start: '1:00 PM', end: '4:00 PM', type: 'therapy', label: 'Therapy Afternoon' },
      { day: 'Wednesday', start: '4:00 PM', end: '5:00 PM', type: 'admin', label: 'Chart Review' },
      { day: 'Thursday', start: '8:00 AM', end: '12:00 PM', type: 'telehealth', label: 'Virtual Clinic' },
      { day: 'Thursday', start: '12:00 PM', end: '1:00 PM', type: 'lunch', label: 'Lunch' },
      { day: 'Thursday', start: '1:00 PM', end: '5:00 PM', type: 'patient', label: 'Afternoon Clinic' },
      { day: 'Friday', start: '8:00 AM', end: '12:00 PM', type: 'patient', label: 'Morning Clinic' },
      { day: 'Friday', start: '12:00 PM', end: '1:00 PM', type: 'lunch', label: 'Lunch' },
      { day: 'Friday', start: '1:00 PM', end: '3:00 PM', type: 'admin', label: 'Admin / Notes' },
    ],
  },
  {
    id: 'tpl2', name: 'April Taylor — Therapy Week', provider: 'April Taylor, LCSW',
    effectiveFrom: '2026-01-06', effectiveTo: '2026-12-31', status: 'Active', isDefault: true,
    blocks: [
      { day: 'Monday', start: '9:00 AM', end: '12:00 PM', type: 'therapy', label: 'Morning Sessions' },
      { day: 'Monday', start: '12:00 PM', end: '1:00 PM', type: 'lunch', label: 'Lunch' },
      { day: 'Monday', start: '1:00 PM', end: '5:00 PM', type: 'therapy', label: 'Afternoon Sessions' },
      { day: 'Tuesday', start: '9:00 AM', end: '12:00 PM', type: 'telehealth', label: 'Virtual Sessions' },
      { day: 'Tuesday', start: '1:00 PM', end: '4:00 PM', type: 'therapy', label: 'In-Person' },
      { day: 'Wednesday', start: '9:00 AM', end: '12:00 PM', type: 'therapy', label: 'Group Therapy' },
      { day: 'Wednesday', start: '1:00 PM', end: '3:00 PM', type: 'admin', label: 'Treatment Plans' },
      { day: 'Thursday', start: '9:00 AM', end: '5:00 PM', type: 'therapy', label: 'Full Day Sessions' },
      { day: 'Friday', start: '9:00 AM', end: '12:00 PM', type: 'therapy', label: 'Morning Sessions' },
      { day: 'Friday', start: '1:00 PM', end: '3:00 PM', type: 'admin', label: 'Documentation' },
    ],
  },
];

function getTimeIndex(timeStr) {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const p = match[3].toUpperCase();
  if (p === 'PM' && h !== 12) h += 12;
  if (p === 'AM' && h === 12) h = 0;
  return (h - 7) * 2 + (m >= 30 ? 1 : 0);
}

function getBlockSpan(block) {
  const s = getTimeIndex(block.start);
  const e = getTimeIndex(block.end);
  return { start: s, span: e - s };
}

export default function SchedulingTemplates() {
  const { currentUser } = useAuth();
  const [templates, setTemplates] = useState(MOCK_TEMPLATES);
  const [selectedTpl, setSelectedTpl] = useState(templates[0]);
  const [viewMode, setViewMode] = useState('grid'); // grid | list

  const blockTypeMap = Object.fromEntries(BLOCK_TYPES.map(b => [b.id, b]));

  const totalHours = useMemo(() => {
    if (!selectedTpl) return {};
    const result = {};
    BLOCK_TYPES.forEach(bt => { result[bt.id] = 0; });
    selectedTpl.blocks.forEach(b => {
      const { span } = getBlockSpan(b);
      result[b.type] = (result[b.type] || 0) + span * 0.5;
    });
    return result;
  }, [selectedTpl]);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>📅 Scheduling Templates</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Configure recurring provider schedule blocks and availability</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => alert('📋 Clone template...')}>📋 Clone</button>
          <button className="btn btn-primary" onClick={() => alert('➕ Create new template...')}>➕ New Template</button>
        </div>
      </div>

      {/* Template Selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {templates.map(tpl => (
          <div key={tpl.id} onClick={() => setSelectedTpl(tpl)}
            style={{
              background: selectedTpl?.id === tpl.id ? 'var(--primary)' : '#fff',
              color: selectedTpl?.id === tpl.id ? '#fff' : 'inherit',
              border: '1px solid var(--border)', borderRadius: 12, padding: '12px 18px',
              cursor: 'pointer', minWidth: 200, transition: 'all 0.2s',
            }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{tpl.name}</div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{tpl.provider}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700, background: tpl.status === 'Active' ? (selectedTpl?.id === tpl.id ? 'rgba(255,255,255,0.2)' : '#dcfce7') : '#fee2e2', color: tpl.status === 'Active' ? (selectedTpl?.id === tpl.id ? '#fff' : '#166534') : '#991b1b' }}>
                {tpl.status}
              </span>
              {tpl.isDefault && <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700, background: selectedTpl?.id === tpl.id ? 'rgba(255,255,255,0.2)' : '#eff6ff', color: selectedTpl?.id === tpl.id ? '#fff' : '#1e40af' }}>Default</span>}
            </div>
          </div>
        ))}
      </div>

      {selectedTpl && (
        <>
          {/* Hours Summary */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 18px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>WEEKLY HOURS BY TYPE</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {BLOCK_TYPES.filter(bt => totalHours[bt.id] > 0).map(bt => (
                <div key={bt.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: bt.color }} />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{bt.icon} {bt.label}: <strong>{totalHours[bt.id]}h</strong></span>
                </div>
              ))}
            </div>
          </div>

          {/* Grid View */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(5, 1fr)', minWidth: 700 }}>
              {/* Header Row */}
              <div style={{ padding: 10, background: 'var(--bg)', borderBottom: '2px solid var(--border)', fontWeight: 700, fontSize: 10, color: 'var(--text-secondary)' }}>TIME</div>
              {DAYS.slice(0, 5).map(d => (
                <div key={d} style={{ padding: 10, background: 'var(--bg)', borderBottom: '2px solid var(--border)', fontWeight: 700, fontSize: 11, textAlign: 'center', borderLeft: '1px solid var(--border)' }}>{d}</div>
              ))}

              {/* Time rows */}
              {TIME_SLOTS.map((time, rowIdx) => (
                <React.Fragment key={time}>
                  <div style={{ padding: '6px 8px', fontSize: 9, color: 'var(--text-secondary)', borderBottom: '1px solid #f1f5f9', fontWeight: 600, display: 'flex', alignItems: 'flex-start' }}>{time}</div>
                  {DAYS.slice(0, 5).map(day => {
                    const block = selectedTpl.blocks.find(b => b.day === day && getTimeIndex(b.start) === rowIdx);
                    const isOccupied = selectedTpl.blocks.some(b => {
                      if (b.day !== day) return false;
                      const { start, span } = getBlockSpan(b);
                      return rowIdx > start && rowIdx < start + span;
                    });

                    if (isOccupied) return null;

                    if (block) {
                      const { span } = getBlockSpan(block);
                      const bt = blockTypeMap[block.type];
                      return (
                        <div key={day} style={{
                          gridRow: `span ${span}`,
                          padding: '6px 8px',
                          background: bt.color + '15',
                          borderLeft: `3px solid ${bt.color}`,
                          borderBottom: '1px solid #f1f5f9',
                          borderRight: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          position: 'relative',
                        }} title={`${block.label} (${block.start} - ${block.end})`}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: bt.color }}>{bt.icon} {block.label}</div>
                          <div style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>{block.start} – {block.end}</div>
                        </div>
                      );
                    }

                    return (
                      <div key={day} style={{ borderBottom: '1px solid #f1f5f9', borderLeft: '1px solid #f1f5f9', minHeight: 24 }} />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Block Legend */}
          <div style={{ marginTop: 16, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {BLOCK_TYPES.map(bt => (
              <div key={bt.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: bt.color }} />
                <span style={{ fontSize: 11, fontWeight: 600 }}>{bt.icon} {bt.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
