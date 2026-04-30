import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';

const MOCK_VITALS_HISTORY = [
  { date: '2026-01-06', systolic: 128, diastolic: 82, hr: 76, temp: 98.4, rr: 16, spo2: 97, weight: 172, height: 68, bmi: 26.2 },
  { date: '2025-12-16', systolic: 132, diastolic: 85, hr: 78, temp: 98.6, rr: 18, spo2: 98, weight: 174, height: 68, bmi: 26.5 },
  { date: '2025-12-02', systolic: 125, diastolic: 80, hr: 72, temp: 98.2, rr: 16, spo2: 99, weight: 171, height: 68, bmi: 26.0 },
  { date: '2025-11-18', systolic: 138, diastolic: 88, hr: 82, temp: 98.7, rr: 17, spo2: 96, weight: 176, height: 68, bmi: 26.8 },
  { date: '2025-11-04', systolic: 142, diastolic: 92, hr: 85, temp: 99.0, rr: 18, spo2: 97, weight: 178, height: 68, bmi: 27.1 },
  { date: '2025-10-21', systolic: 135, diastolic: 86, hr: 80, temp: 98.5, rr: 16, spo2: 98, weight: 175, height: 68, bmi: 26.6 },
  { date: '2025-10-07', systolic: 130, diastolic: 84, hr: 74, temp: 98.3, rr: 15, spo2: 98, weight: 173, height: 68, bmi: 26.3 },
  { date: '2025-09-22', systolic: 145, diastolic: 94, hr: 88, temp: 98.9, rr: 19, spo2: 96, weight: 180, height: 68, bmi: 27.4 },
  { date: '2025-09-08', systolic: 140, diastolic: 90, hr: 84, temp: 98.6, rr: 17, spo2: 97, weight: 179, height: 68, bmi: 27.2 },
  { date: '2025-08-25', systolic: 136, diastolic: 87, hr: 79, temp: 98.4, rr: 16, spo2: 98, weight: 177, height: 68, bmi: 26.9 },
];

/* Parse "128/82" → { systolic: 128, diastolic: 82 } */
function parseBP(bp) {
  if (!bp) return { systolic: 0, diastolic: 0 };
  const parts = String(bp).split('/');
  return { systolic: parseInt(parts[0], 10) || 0, diastolic: parseInt(parts[1], 10) || 0 };
}

/* Transform PatientContext vitals (newest-first) to the chart shape (oldest-first) */
function transformVitals(raw) {
  return [...raw]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((v) => {
      const { systolic, diastolic } = parseBP(v.bp);
      return {
        date: v.date,
        systolic,
        diastolic,
        hr: v.hr || 0,
        temp: v.temp || 0,
        rr: v.rr || 0,
        spo2: v.spo2 || 0,
        weight: v.weight || 0,
        height: v.height || 0,
        bmi: v.bmi || 0,
      };
    });
}

const VITAL_CONFIGS = {
  systolic: { label: 'Systolic BP', unit: 'mmHg', color: '#ef4444', low: 90, high: 140, icon: '❤️' },
  diastolic: { label: 'Diastolic BP', unit: 'mmHg', color: '#f97316', low: 60, high: 90, icon: '🩸' },
  hr: { label: 'Heart Rate', unit: 'bpm', color: '#ec4899', low: 60, high: 100, icon: '💓' },
  temp: { label: 'Temperature', unit: '°F', color: '#f59e0b', low: 97.0, high: 99.5, icon: '🌡️' },
  rr: { label: 'Resp. Rate', unit: '/min', color: '#06b6d4', low: 12, high: 20, icon: '🫁' },
  spo2: { label: 'SpO₂', unit: '%', color: '#3b82f6', low: 95, high: 100, icon: '💧' },
  weight: { label: 'Weight', unit: 'lbs', color: '#8b5cf6', low: 100, high: 300, icon: '⚖️' },
  bmi: { label: 'BMI', unit: 'kg/m²', color: '#10b981', low: 18.5, high: 30, icon: '📊' },
};

function Sparkline({ data, config, width = 200, height = 50 }) {
  if (!data || data.length < 2) return null;

  const values = data.map(d => d.value);
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const range = max - min || 1;

  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - ((v - min) / range) * height,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = pathD + ` L ${width} ${height} L 0 ${height} Z`;

  // Normal range zone
  const normalLow = height - ((config.low - min) / range) * height;
  const normalHigh = height - ((config.high - min) / range) * height;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      {/* Normal range band */}
      <rect x={0} y={Math.min(normalHigh, normalLow)} width={width} height={Math.abs(normalLow - normalHigh)} fill={config.color} opacity={0.06} rx={3} />
      {/* Area fill */}
      <path d={areaD} fill={config.color} opacity={0.1} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={config.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {points.map((p, i) => {
        const val = values[i];
        const outOfRange = val < config.low || val > config.high;
        return (
          <circle key={i} cx={p.x} cy={p.y} r={outOfRange ? 4 : 3} fill={outOfRange ? '#ef4444' : config.color} stroke="#fff" strokeWidth={1.5}>
            <title>{data[i].date}: {val} {config.unit}</title>
          </circle>
        );
      })}
    </svg>
  );
}

export default function VitalsTrending() {
  const { currentUser } = useAuth();
  const { selectedPatient, vitalSigns } = usePatient();

  /* Use the selected patient's vitals; fall back to demo data */
  const rawVitals = selectedPatient ? (vitalSigns[selectedPatient.id] || []) : [];
  const baseVitals = rawVitals.length > 0 ? transformVitals(rawVitals) : MOCK_VITALS_HISTORY;

  const [vitals] = useState(baseVitals);
  const [selectedMetric, setSelectedMetric] = useState('systolic');
  const [timeRange, setTimeRange] = useState('6m');

  const filteredVitals = useMemo(() => {
    const now = new Date();
    const months = timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12;
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - months);
    const source = selectedPatient ? transformVitals(vitalSigns[selectedPatient.id] || []) : MOCK_VITALS_HISTORY;
    return source.filter(v => new Date(v.date) >= cutoff);
  }, [selectedPatient, vitalSigns, timeRange]);

  const latestVitals = vitals[0];
  const prevVitals = vitals[1];

  const getTrend = (key) => {
    if (!latestVitals || !prevVitals) return null;
    const diff = latestVitals[key] - prevVitals[key];
    if (Math.abs(diff) < 0.1) return { dir: '→', color: '#64748b', text: 'Stable' };
    if (diff > 0) return { dir: '↑', color: '#ef4444', text: `+${diff.toFixed(1)}` };
    return { dir: '↓', color: '#059669', text: diff.toFixed(1) };
  };

  const config = VITAL_CONFIGS[selectedMetric];

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>📈 Vitals Trending</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            {selectedPatient
              ? `${selectedPatient.firstName} ${selectedPatient.lastName} · ${rawVitals.length} recorded entries`
              : 'Select a patient from the chart to view their vitals · Showing demo data'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['3m', '6m', '12m'].map(r => (
            <button key={r} className={`btn btn-sm ${timeRange === r ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTimeRange(r)}>{r}</button>
          ))}
        </div>
      </div>

      {/* Latest Vitals Overview with Sparklines */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {Object.entries(VITAL_CONFIGS).map(([key, cfg]) => {
          const val = latestVitals?.[key];
          const trend = getTrend(key);
          const outOfRange = val < cfg.low || val > cfg.high;
          const sparkData = filteredVitals.map(v => ({ date: v.date, value: v[key] }));
          const isSelected = selectedMetric === key;

          return (
            <div key={key} onClick={() => setSelectedMetric(key)}
              style={{
                background: '#fff', borderRadius: 12,
                border: `2px solid ${isSelected ? cfg.color : 'var(--border)'}`,
                padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: isSelected ? `0 0 0 3px ${cfg.color}22` : 'none',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{cfg.icon} {cfg.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: outOfRange ? '#ef4444' : cfg.color, marginTop: 2 }}>
                    {val}
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', marginLeft: 3 }}>{cfg.unit}</span>
                  </div>
                </div>
                {trend && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 8, background: trend.color + '15', color: trend.color, fontSize: 10, fontWeight: 700 }}>
                    {trend.dir} {trend.text}
                  </div>
                )}
              </div>
              <Sparkline data={sparkData} config={cfg} width={140} height={30} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 8, color: '#94a3b8' }}>Normal: {cfg.low}–{cfg.high}</span>
                <span style={{ fontSize: 8, color: outOfRange ? '#ef4444' : '#059669', fontWeight: 700 }}>{outOfRange ? '⚠️ Out of range' : '✅ Normal'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Chart */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{config.icon} {config.label} Trend</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Normal range: {config.low}–{config.high} {config.unit}</div>
          </div>
        </div>

        {/* Large sparkline chart */}
        <div style={{ padding: '10px 0' }}>
          <Sparkline
            data={filteredVitals.map(v => ({ date: v.date, value: v[selectedMetric] }))}
            config={config}
            width={700}
            height={150}
          />
        </div>

        {/* Date labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
          {filteredVitals.map(v => (
            <span key={v.date} style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600 }}>
              {new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          ))}
        </div>
      </div>

      {/* History Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>📋 Vitals History</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
              {['Date', 'Systolic', 'Diastolic', 'HR', 'Temp', 'RR', 'SpO₂', 'Weight', 'BMI'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredVitals.map((v, idx) => (
              <tr key={v.date} style={{ borderBottom: '1px solid var(--border)', background: idx === filteredVitals.length - 1 ? `${config.color}08` : 'transparent' }}>
                <td style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>{new Date(v.date).toLocaleDateString()}</td>
                {['systolic', 'diastolic', 'hr', 'temp', 'rr', 'spo2', 'weight', 'bmi'].map(key => {
                  const c = VITAL_CONFIGS[key];
                  const val = v[key];
                  const outOfRange = val < c.low || val > c.high;
                  return (
                    <td key={key} style={{
                      padding: '10px 12px', textAlign: 'center', fontWeight: 700,
                      color: outOfRange ? '#ef4444' : 'inherit',
                      background: outOfRange ? '#fee2e215' : 'transparent',
                    }}>
                      {val}
                      {outOfRange && <span style={{ fontSize: 8, marginLeft: 2 }}>⚠️</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
