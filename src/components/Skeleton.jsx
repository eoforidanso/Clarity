import React from 'react';

export function SkeletonLine({ width = '100%', height = 14, style }) {
  return (
    <div
      className="skeleton-line"
      style={{ width, height, borderRadius: 6, ...style }}
    />
  );
}

export function SkeletonCircle({ size = 36 }) {
  return (
    <div
      className="skeleton-line"
      style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0 }}
    />
  );
}

export function SkeletonCard({ lines = 3, hasAvatar = false }) {
  return (
    <div className="skeleton-card">
      {hasAvatar && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
          <SkeletonCircle size={40} />
          <div style={{ flex: 1 }}>
            <SkeletonLine width="60%" height={14} />
            <SkeletonLine width="40%" height={10} style={{ marginTop: 6 }} />
          </div>
        </div>
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          width={`${60 + Math.random() * 40}%`}
          height={12}
          style={{ marginTop: i > 0 ? 8 : 0 }}
        />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} width={`${50 + Math.random() * 50}%`} height={12} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeleton-table-row">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} width={`${40 + Math.random() * 60}%`} height={11} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="skeleton-dashboard fade-in">
      {/* Greeting */}
      <div style={{ marginBottom: 22 }}>
        <SkeletonLine width={280} height={24} />
        <SkeletonLine width={200} height={13} style={{ marginTop: 6 }} />
      </div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 24 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton-card" style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
            <SkeletonCircle size={42} />
            <div style={{ flex: 1 }}>
              <SkeletonLine width={40} height={22} />
              <SkeletonLine width={80} height={10} style={{ marginTop: 4 }} />
            </div>
          </div>
        ))}
      </div>
      {/* Schedule */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 18 }}>
        <div className="skeleton-card" style={{ padding: 0 }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--border-light)' }}>
            <SkeletonLine width={160} height={15} />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 12, alignItems: 'center' }}>
              <SkeletonLine width={50} height={12} />
              <SkeletonCircle size={32} />
              <div style={{ flex: 1 }}>
                <SkeletonLine width="50%" height={12} />
                <SkeletonLine width="30%" height={10} style={{ marginTop: 4 }} />
              </div>
              <SkeletonLine width={70} height={24} style={{ borderRadius: 12 }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
        </div>
      </div>
    </div>
  );
}
