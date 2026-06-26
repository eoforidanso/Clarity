import React from 'react';

const shimmer = {
  background: 'linear-gradient(90deg, var(--border-color, #e2e8f0) 25%, rgba(255,255,255,0.6) 50%, var(--border-color, #e2e8f0) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.4s infinite',
  borderRadius: 6,
  display: 'block',
};

export default function Skeleton({ width = '100%', height = 16, borderRadius = 6, style = {} }) {
  return (
    <span
      aria-hidden="true"
      style={{ ...shimmer, width, height, borderRadius, ...style }}
    />
  );
}

export function SkeletonCard({ lines = 3, style = {} }) {
  const lineWidths = ['75%', '100%', '60%', '85%', '40%'];
  return (
    <div style={{ padding: '16px', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 12, background: '#fff', ...style }}>
      <Skeleton width="45%" height={14} style={{ marginBottom: 14 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={lineWidths[i % lineWidths.length]} height={12} style={{ marginBottom: 10 }} />
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 5, style = {} }) {
  return (
    <div style={style}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
          <Skeleton width={36} height={36} borderRadius="50%" />
          <div style={{ flex: 1 }}>
            <Skeleton width="55%" height={12} style={{ marginBottom: 6 }} />
            <Skeleton width="35%" height={10} />
          </div>
          <Skeleton width={60} height={22} borderRadius={12} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="fade-in" style={{ padding: '0' }}>
      <style>{`
        @keyframes skeleton-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      {/* Greeting bar */}
      <div style={{ marginBottom: 16, padding: '18px 22px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
        <Skeleton width="30%" height={28} style={{ marginBottom: 10 }} />
        <Skeleton width="20%" height={13} style={{ marginBottom: 6 }} />
        <Skeleton width="40%" height={11} />
      </div>
      {/* Hero cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ background: '#f1f5f9', borderRadius: 12, padding: '20px 22px' }}>
          <Skeleton width="50%" height={10} style={{ marginBottom: 14 }} />
          <Skeleton width="70%" height={22} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={14} />
        </div>
        <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '20px 22px' }}>
          <Skeleton width="50%" height={10} style={{ marginBottom: 14 }} />
          <Skeleton width="70%" height={22} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={14} />
        </div>
      </div>
      {/* Metric strip */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ flex: 1, padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, borderRight: i < 6 ? '1px solid #e2e8f0' : 'none' }}>
            <Skeleton width={28} height={22} />
            <Skeleton width={48} height={9} />
          </div>
        ))}
      </div>
      {/* Grid */}
      <div className="dashboard-main-grid">
        <SkeletonCard lines={5} style={{ gridColumn: '1 / 2' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SkeletonCard lines={4} />
          <SkeletonCard lines={2} />
        </div>
      </div>
    </div>
  );
}
