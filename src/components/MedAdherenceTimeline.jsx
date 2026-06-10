/**
 * MedAdherenceTimeline — Medication Refill & Adherence Visualization
 * Shows each active medication as a timeline bar with refill events,
 * gap detection, and days-supply-remaining indicator.
 */
import React, { useMemo } from 'react';

const BG2   = '#232838';
const BG3   = '#2a3045';
const BORDER = 'rgba(255,255,255,0.08)';
const T_PRI = 'rgba(255,255,255,0.95)';
const T_SEC = 'rgba(255,255,255,0.60)';
const T_MUT = 'rgba(255,255,255,0.38)';

const WINDOW_DAYS = 180; // show 6 months

function daysBetween(d1, d2) {
  return Math.round((new Date(d2) - new Date(d1)) / 86400000);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function MedRow({ med, fills, today }) {
  const windowStart = addDays(today, -WINDOW_DAYS);

  const segments = useMemo(() => {
    // Convert fills to {start, end} segments within window
    const relevant = fills
      .filter(f => f.drug.toLowerCase().includes(med.name.toLowerCase()) ||
                   med.name.toLowerCase().includes(f.drug.toLowerCase().split(' ')[0]))
      .sort((a, b) => a.date.localeCompare(b.date));

    return relevant.map(f => ({
      start: f.date,
      end: addDays(f.date, f.daysSupply || 30),
      qty: f.qty,
      daysSupply: f.daysSupply || 30,
      refillNo: f.refillNo,
    }));
  }, [med, fills]);

  // Compute days supply remaining from last fill
  const lastFill = segments.length ? segments[segments.length - 1] : null;
  const daysRemaining = lastFill ? daysBetween(today, lastFill.end) : null;
  const isCurrent = daysRemaining !== null && daysRemaining > 0;
  const isLow     = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 10;
  const isExpired = daysRemaining !== null && daysRemaining <= 0;

  // Convert date to x% in window
  const toX = (d) => {
    const days = daysBetween(windowStart, d);
    return Math.min(100, Math.max(0, (days / WINDOW_DAYS) * 100));
  };

  // Detect gaps: where refill came after previous supply ended
  const gaps = useMemo(() => {
    const result = [];
    for (let i = 1; i < segments.length; i++) {
      const prevEnd = segments[i-1].end;
      const nextStart = segments[i].start;
      if (nextStart > prevEnd) {
        result.push({ start: prevEnd, end: nextStart, days: daysBetween(prevEnd, nextStart) });
      }
    }
    return result;
  }, [segments]);

  const todayX = toX(today);

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Med name + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: T_PRI }}>{med.name}</span>
          {med.dose && <span style={{ fontSize: 11, color: T_MUT, marginLeft: 6 }}>{med.dose}</span>}
        </div>
        <div>
          {isCurrent && !isLow && (
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#4ade80', background: 'rgba(74,222,128,0.12)', padding: '2px 8px', borderRadius: 10 }}>
              {daysRemaining}d remaining
            </span>
          )}
          {isLow && (
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.12)', padding: '2px 8px', borderRadius: 10 }}>
              ⚠ {daysRemaining}d — refill soon
            </span>
          )}
          {isExpired && (
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#f87171', background: 'rgba(248,113,113,0.12)', padding: '2px 8px', borderRadius: 10 }}>
              ✗ Supply expired {Math.abs(daysRemaining)}d ago
            </span>
          )}
          {segments.length === 0 && (
            <span style={{ fontSize: 10.5, color: T_MUT }}>No fills found in last 6 months</span>
          )}
        </div>
      </div>

      {/* Timeline bar */}
      <div style={{ position: 'relative', height: 22, background: BG3, borderRadius: 6, overflow: 'hidden' }}>
        {/* Fill segments */}
        {segments.map((seg, i) => {
          const x1 = toX(seg.start);
          const x2 = toX(seg.end);
          const w  = Math.max(0.4, x2 - x1);
          return (
            <div key={i}
              title={`Dispensed: ${seg.start} · ${seg.qty} pills · ${seg.daysSupply}d supply`}
              style={{
                position: 'absolute', left: `${x1}%`, width: `${w}%`, top: 2, height: 18,
                background: 'rgba(99,102,241,0.70)', borderRadius: 4, cursor: 'default',
              }}
            />
          );
        })}

        {/* Gap markers */}
        {gaps.map((g, i) => {
          const x1 = toX(g.start);
          const x2 = toX(g.end);
          const w  = Math.max(0.2, x2 - x1);
          return (
            <div key={`gap-${i}`}
              title={`Gap in fills: ${g.days} days (${g.start} – ${g.end})`}
              style={{
                position: 'absolute', left: `${x1}%`, width: `${w}%`, top: 0, height: '100%',
                background: 'repeating-linear-gradient(135deg, rgba(239,68,68,0.25) 0, rgba(239,68,68,0.25) 3px, transparent 3px, transparent 8px)',
                cursor: 'default',
              }}
            />
          );
        })}

        {/* Today line */}
        <div style={{
          position: 'absolute', left: `${todayX}%`, top: 0, width: 2, height: '100%',
          background: '#fbbf24', borderRadius: 1,
        }} />
      </div>

      {/* Timeline labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 9.5, color: T_MUT }}>{windowStart}</span>
        <span style={{ fontSize: 9.5, color: '#fbbf24', fontWeight: 600 }}>Today</span>
        <span style={{ fontSize: 9.5, color: T_MUT }}>{today}</span>
      </div>

      {/* Gap legend if gaps exist */}
      {gaps.length > 0 && (
        <div style={{ fontSize: 10.5, color: '#f87171', marginTop: 2 }}>
          ⚠ {gaps.length} fill gap{gaps.length > 1 ? 's' : ''} detected — longest: {Math.max(...gaps.map(g => g.days))} days
        </div>
      )}
    </div>
  );
}

export default function MedAdherenceTimeline({ meds, pdmpFills, today = new Date().toISOString().split('T')[0], onClose }) {
  const activeMeds = (meds || []).filter(m => m.status !== 'discontinued');

  return (
    <div style={{
      background: BG2, border: `1px solid ${BORDER}`, borderRadius: 14,
      overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 18px', background: '#141824',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: T_PRI, fontWeight: 700, fontSize: 14 }}>💊 Medication Adherence Timeline</div>
          <div style={{ color: T_MUT, fontSize: 11, marginTop: 2 }}>
            Last 6 months · purple = filled · red stripes = gap · yellow line = today
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background:'none', border:'none', color:T_MUT, fontSize:18, cursor:'pointer' }}>✕</button>
        )}
      </div>

      <div style={{ padding: '16px 18px', overflowY: 'auto', maxHeight: 440 }}>
        {activeMeds.length === 0 ? (
          <div style={{ color: T_MUT, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
            No active medications on file.
          </div>
        ) : (
          activeMeds.map(med => (
            <MedRow
              key={med.id || med.name}
              med={med}
              fills={pdmpFills || []}
              today={today}
            />
          ))
        )}
      </div>

      {/* Legend */}
      <div style={{
        padding: '10px 18px', background: '#141824', borderTop: `1px solid ${BORDER}`,
        display: 'flex', gap: 18, flexWrap: 'wrap',
      }}>
        {[
          { color: 'rgba(99,102,241,0.7)', label: 'Filled / on supply' },
          { color: 'rgba(239,68,68,0.4)',  label: 'Fill gap' },
          { color: '#fbbf24',              label: 'Today' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 10, background: l.color, borderRadius: 3 }} />
            <span style={{ fontSize: 10.5, color: T_MUT }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
