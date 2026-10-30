import React from 'react';
import { Eye, EyeOff, UserCheck, AlertTriangle, Activity } from 'lucide-react';

export default function EngagementHUD({
  detectedCount = 0,
  attentiveCount = 0,
  distractedCount = 0,
  averageAttention = 0,
  persons = []
}) {
  // Compute orientation breakdown
  const orientations = { frontal: 0, looking_away: 0, looking_down: 0 };
  persons.forEach(p => {
    if (orientations[p.orientation] !== undefined) {
      orientations[p.orientation]++;
    }
  });

  const getMeterColor = (score) => {
    if (score >= 75) return '#10b981'; // Green
    if (score >= 50) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const meterColor = getMeterColor(averageAttention);

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={18} color="var(--primary-light)" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Real-time Engagement Analytics</h3>
        </div>
        <span style={{
          fontSize: '0.72rem',
          padding: '2px 8px',
          borderRadius: 6,
          background: 'rgba(255,255,255,0.06)',
          color: 'var(--text-dim)',
          fontFamily: 'var(--font-mono)'
        }}>
          OPENCV YUNET
        </span>
      </div>

      {/* Main Attention Gauge Metric */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{
          padding: '14px',
          background: 'rgba(0,0,0,0.25)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            Visual Attention Level
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: meterColor, letterSpacing: '-0.02em' }}>
            {averageAttention}%
          </div>
          <div style={{
            height: 6,
            width: '100%',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 3,
            overflow: 'hidden',
            marginTop: 8
          }}>
            <div style={{
              height: '100%',
              width: `${averageAttention}%`,
              background: meterColor,
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>

        <div style={{
          padding: '14px',
          background: 'rgba(0,0,0,0.25)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserCheck size={14} color="#34d399" /> Detected
            </span>
            <span style={{ fontWeight: 700 }}>{detectedCount}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Eye size={14} color="#10b981" /> Attentive
            </span>
            <span style={{ fontWeight: 700, color: '#34d399' }}>{attentiveCount}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <EyeOff size={14} color="#f87171" /> Distracted
            </span>
            <span style={{ fontWeight: 700, color: '#f87171' }}>{distractedCount}</span>
          </div>
        </div>
      </div>

      {/* Head Pose / Gaze Distribution */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: 8, textTransform: 'uppercase' }}>
          Head Orientation Distribution
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <div style={{
            padding: '8px 10px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 6,
            border: '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Frontal Gaze</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#34d399', marginTop: 2 }}>
              {orientations.frontal}
            </div>
          </div>
          <div style={{
            padding: '8px 10px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 6,
            border: '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Looking Away</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fbbf24', marginTop: 2 }}>
              {orientations.looking_away}
            </div>
          </div>
          <div style={{
            padding: '8px 10px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 6,
            border: '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Looking Down</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f87171', marginTop: 2 }}>
              {orientations.looking_down}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

