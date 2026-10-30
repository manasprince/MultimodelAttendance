import React from 'react';

export default function MetricCard({ title, value, subvalue, icon: Icon, color = '#6366f1', trend }) {
  return (
    <div className="glass-panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
      {/* Background glow accent */}
      <div style={{
        position: 'absolute',
        top: -15,
        right: -15,
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: color,
        opacity: 0.1,
        filter: 'blur(20px)'
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </span>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: `rgba(${parseInt(color.slice(1,3),16)}, ${parseInt(color.slice(3,5),16)}, ${parseInt(color.slice(5,7),16)}, 0.12)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${color}33`
        }}>
          {Icon && <Icon size={18} color={color} />}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
          {value}
        </span>
        {trend && (
          <span style={{ fontSize: '0.78rem', color: trend.startsWith('+') ? '#34d399' : '#f87171', fontWeight: 600 }}>
            {trend}
          </span>
        )}
      </div>

      {subvalue && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>
          {subvalue}
        </p>
      )}
    </div>
  );
}

