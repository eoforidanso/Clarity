/**
 * PDMPDrawer — Illinois Prescription Monitoring Program report panel.
 *
 * Opens when a controlled substance is typed in a medication order.
 * Displays risk score, alerts, 90-day stats, and full fill history.
 * Provider must click "Acknowledge & Proceed" before continuing.
 */
import React, { useState, useEffect } from 'react';

// ── Palette (matches EHR dark chrome) ────────────────────────────────────────
const BG      = '#1a1f2e';
const BG2     = '#232838';
const BG3     = '#2a3045';
const BORDER  = 'rgba(255,255,255,0.08)';
const T_PRI   = 'rgba(255,255,255,0.95)';
const T_SEC   = 'rgba(255,255,255,0.60)';
const T_MUT   = 'rgba(255,255,255,0.38)';
const ACCENT  = '#6366f1';

// ── Schedule badge colours ────────────────────────────────────────────────────
const SCHED_COLOR = {
  'CII':      { bg: '#dc2626', text: '#fff' },
  'CIII':     { bg: '#d97706', text: '#fff' },
  'CIII/CIV': { bg: '#d97706', text: '#fff' },
  'CIV':      { bg: '#7c3aed', text: '#fff' },
};

function SchedBadge({ schedule }) {
  const c = SCHED_COLOR[schedule] || { bg: '#6b7280', text: '#fff' };
  return (
    <span style={{
      background: c.bg, color: c.text,
      fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 5,
      letterSpacing: '0.4px', textTransform: 'uppercase', flexShrink: 0,
    }}>
      {schedule}
    </span>
  );
}

function StatChip({ label, value, highlight }) {
  return (
    <div style={{
      flex: 1, background: BG3, borderRadius: 10, padding: '10px 14px',
      border: `1px solid ${highlight ? 'rgba(251,191,36,0.35)' : BORDER}`,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 22, fontWeight: 800,
        color: highlight ? '#fbbf24' : T_PRI,
        lineHeight: 1.1,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: T_MUT, marginTop: 3, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

function AlertCard({ alert }) {
  const isDanger = alert.severity === 'danger';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: isDanger ? 'rgba(220,38,38,0.12)' : 'rgba(245,158,11,0.12)',
      border: `1px solid ${isDanger ? 'rgba(220,38,38,0.35)' : 'rgba(245,158,11,0.35)'}`,
      borderRadius: 8, padding: '9px 12px',
    }}>
      <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>
        {isDanger ? '🚨' : '⚠️'}
      </span>
      <span style={{ fontSize: 12.5, color: isDanger ? '#fca5a5' : '#fcd34d', lineHeight: 1.45 }}>
        {alert.text}
      </span>
    </div>
  );
}

function FillRow({ fill }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '82px 1fr 70px 52px 90px',
      gap: 10,
      alignItems: 'center',
      padding: '9px 14px',
      borderBottom: `1px solid ${BORDER}`,
    }}>
      {/* Date */}
      <div style={{ fontSize: 11.5, color: T_SEC, fontVariantNumeric: 'tabular-nums' }}>
        {fill.date}
      </div>

      {/* Drug + schedule */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: T_PRI, fontWeight: 600 }}>{fill.drug}</span>
          <SchedBadge schedule={fill.schedule} />
        </div>
        <div style={{ fontSize: 10.5, color: T_MUT, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {fill.prescriber}
        </div>
      </div>

      {/* Qty / Supply */}
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 12, color: T_PRI }}>{fill.qty}</div>
        <div style={{ fontSize: 10, color: T_MUT }}>{fill.daysSupply}d supply</div>
      </div>

      {/* Refill # */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 10.5, color: fill.refillNo === 0 ? '#4ade80' : T_SEC }}>
          {fill.refillNo === 0 ? 'New Rx' : `Ref #${fill.refillNo}`}
        </div>
      </div>

      {/* Pharmacy (truncated) */}
      <div style={{ fontSize: 10.5, color: T_MUT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fill.pharmacy}>
        {fill.pharmacy.split(' — ')[0]}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PDMPDrawer({
  isOpen,
  onClose,
  onAcknowledge,  // () => void — called when provider clicks Acknowledge
  report,         // object from generateILPmpReport()
  medName,        // string — drug being prescribed
  onRequery,      // () => void — trigger a fresh query
  isRequering,    // bool — show loading spinner
}) {
  const [showAllFills, setShowAllFills] = useState(false);

  useEffect(() => {
    if (isOpen) setShowAllFills(false);
  }, [isOpen]);

  if (!isOpen || !report) return null;

  const { risk, alerts, stats, fills, patient, queryId, queryDate, queryTime } = report;

  const visibleFills = showAllFills ? fills : fills.slice(0, 12);
  const hiddenCount  = fills.length - 12;

  // Risk level → description string
  const riskDesc = {
    'Low':           'No significant concerns detected.',
    'Low-Moderate':  'Minor concerns — review fill history.',
    'Moderate':      'Multiple risk indicators present.',
    'Moderate-High': 'Elevated risk — consider consultation.',
    'High':          'High-risk pattern — do not prescribe without review.',
  }[risk.level] || '';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1300 }}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-label="PDMP Report"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 740,
          background: BG, zIndex: 1301, display: 'flex', flexDirection: 'column',
          boxShadow: '-10px 0 50px rgba(0,0,0,0.55)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{
          padding: '14px 20px 12px', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          background: '#141824',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                background: '#1e3a5f', color: '#60a5fa', fontSize: 10, fontWeight: 800,
                padding: '3px 8px', borderRadius: 5, letterSpacing: '0.6px', textTransform: 'uppercase',
              }}>
                🏛 IL-PMP
              </span>
              <span style={{ color: T_PRI, fontWeight: 700, fontSize: 15 }}>
                Prescription Monitoring Program
              </span>
            </div>
            <div style={{ color: T_MUT, fontSize: 11, marginTop: 3, display: 'flex', gap: 12 }}>
              <span>Query ID: <span style={{ color: T_SEC, fontFamily: 'monospace' }}>{queryId}</span></span>
              <span>·</span>
              <span>{queryDate} at {queryTime}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={onRequery}
              disabled={isRequering}
              style={{
                background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`,
                color: isRequering ? T_MUT : T_SEC, fontSize: 11.5, padding: '5px 12px',
                borderRadius: 6, cursor: isRequering ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {isRequering
                ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span> Querying…</>
                : '↻ Re-query'}
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: T_MUT, fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Scrollable body ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* Patient info bar */}
          <div style={{
            padding: '10px 20px', background: BG2, borderBottom: `1px solid ${BORDER}`,
            display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center',
          }}>
            <div>
              <span style={{ fontSize: 10, color: T_MUT, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Patient</span>
              <div style={{ fontSize: 13, fontWeight: 700, color: T_PRI }}>{patient.name}</div>
            </div>
            <div>
              <span style={{ fontSize: 10, color: T_MUT, textTransform: 'uppercase', letterSpacing: '0.5px' }}>DOB</span>
              <div style={{ fontSize: 12.5, color: T_SEC }}>{patient.dob}</div>
            </div>
            <div>
              <span style={{ fontSize: 10, color: T_MUT, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Address</span>
              <div style={{ fontSize: 12.5, color: T_SEC }}>{patient.address}</div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <span style={{ fontSize: 10, color: T_MUT, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Queried Drug</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>{medName}</span>
              </div>
            </div>
          </div>

          {/* Risk banner */}
          <div style={{
            margin: '16px 20px 0',
            background: risk.bg,
            border: `1px solid ${risk.border}`,
            borderRadius: 12, padding: '14px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: risk.color, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
                Patient Risk Level
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: risk.color, letterSpacing: '-0.3px' }}>
                {risk.level}
              </div>
              <div style={{ fontSize: 12, color: risk.color, opacity: 0.85, marginTop: 3 }}>
                {riskDesc}
              </div>
            </div>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              border: `3px solid ${risk.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, flexShrink: 0,
            }}>
              {risk.level === 'Low'           ? '🟢' :
               risk.level === 'Low-Moderate'  ? '🟡' :
               risk.level === 'Moderate'      ? '🟠' :
               risk.level === 'Moderate-High' ? '🔴' : '🚨'}
            </div>
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div style={{ margin: '12px 20px 0', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {alerts.map((a, i) => <AlertCard key={a.type ?? i} alert={a} />)}
            </div>
          )}

          {/* Stats row */}
          <div style={{ margin: '14px 20px 0', display: 'flex', gap: 10 }}>
            <StatChip label="Rx (last 90 days)"    value={stats.fills90}       highlight={stats.fills90 > 4} />
            <StatChip label="Prescribers (90 days)" value={stats.prescribers90} highlight={stats.prescribers90 > 1} />
            <StatChip label="Pharmacies (90 days)"  value={stats.pharmacies90}  highlight={stats.pharmacies90 > 1} />
            <StatChip label="Rx (last 365 days)"   value={stats.fills365}      highlight={false} />
          </div>

          {/* Fill history */}
          <div style={{ margin: '18px 0 0' }}>
            {/* Table header */}
            <div style={{
              padding: '8px 14px 6px 14px', margin: '0 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: T_MUT, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Prescription History ({fills.length} fills)
              </span>
              <span style={{ fontSize: 10, color: T_MUT }}>Last 12 months · IL only</span>
            </div>

            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '82px 1fr 70px 52px 90px',
              gap: 10, padding: '5px 14px',
              margin: '0 20px',
              borderBottom: `1px solid ${BORDER}`,
              background: BG2,
              borderRadius: '8px 8px 0 0',
            }}>
              {['Date', 'Drug / Prescriber', 'Qty', 'Status', 'Pharmacy'].map(h => (
                <div key={h} style={{ fontSize: 9.5, color: T_MUT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Fill rows */}
            <div style={{
              margin: '0 20px',
              background: BG2,
              borderRadius: '0 0 8px 8px',
              border: `1px solid ${BORDER}`,
              borderTop: 'none',
              overflow: 'hidden',
            }}>
              {visibleFills.map((fill, i) => <FillRow key={fill.id ?? `${fill.drug}-${fill.fillDate}-${i}`} fill={fill} />)}

              {!showAllFills && hiddenCount > 0 && (
                <button
                  onClick={() => setShowAllFills(true)}
                  style={{
                    width: '100%', padding: '10px', background: 'none', border: 'none',
                    color: ACCENT, fontSize: 12, cursor: 'pointer', fontWeight: 600,
                    borderTop: `1px solid ${BORDER}`,
                  }}
                >
                  Show {hiddenCount} more fills ↓
                </button>
              )}

              {fills.length === 0 && (
                <div style={{ padding: '28px', textAlign: 'center', color: T_MUT, fontSize: 13 }}>
                  No controlled substance fills found in the last 12 months.
                </div>
              )}
            </div>
          </div>

          {/* Bottom spacer so content doesn't hide behind fixed footer */}
          <div style={{ height: 100 }} />
        </div>

        {/* ── Footer — sticky action buttons ─────────────────────────────────── */}
        <div style={{
          borderTop: `1px solid ${BORDER}`, background: '#141824',
          padding: '14px 20px', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, color: T_SEC, lineHeight: 1.4 }}>
              By clicking <strong style={{ color: T_PRI }}>Acknowledge &amp; Proceed</strong>, you confirm
              you have reviewed the IL-PMP data for this patient and are proceeding with this prescription.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.07)', border: `1px solid ${BORDER}`,
              color: T_SEC, fontSize: 13, fontWeight: 600, padding: '9px 20px',
              borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onAcknowledge(); onClose(); }}
            style={{
              background: '#16a34a', border: 'none',
              color: '#fff', fontSize: 13.5, fontWeight: 700, padding: '9px 22px',
              borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              boxShadow: '0 2px 12px rgba(22,163,74,0.4)',
            }}
          >
            ✓ Acknowledge &amp; Proceed
          </button>
        </div>
      </div>
    </>
  );
}
