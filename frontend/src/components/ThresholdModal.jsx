import React, { useState } from 'react';
import { X, Sliders, Check } from 'lucide-react';

export default function ThresholdModal({ currentSession, onClose, onSave }) {
  const [minConfidence, setMinConfidence] = useState(
    currentSession?.min_confidence_threshold || 0.60
  );
  const [minPresence, setMinPresence] = useState(
    currentSession?.min_presence_seconds || 15
  );
  const [autoConfirm, setAutoConfirm] = useState(
    currentSession?.auto_confirm || false
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      min_confidence_threshold: parseFloat(minConfidence),
      min_presence_seconds: parseInt(minPresence, 10),
      auto_confirm: autoConfirm
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: 16
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: 460,
        padding: 24,
        background: '#111827',
        border: '1px solid rgba(255,255,255,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sliders size={18} color="var(--primary-light)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Attendance Thresholds</h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-dim)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                Confidence Threshold
              </label>
              <span style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 700 }}>
                {Math.round(minConfidence * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.30"
              max="0.95"
              step="0.05"
              value={minConfidence}
              onChange={(e) => setMinConfidence(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--primary-light)' }}
            />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>
              Minimum facial recognition confidence required to qualify detection.
            </p>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                Minimum Presence Duration
              </label>
              <span style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 700 }}>
                {minPresence} seconds
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="120"
              step="5"
              value={minPresence}
              onChange={(e) => setMinPresence(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>
              Cumulative detection time needed before student is marked Present.
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 8,
            border: '1px solid var(--border-color)'
          }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Auto-Confirm Validated Attendance</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                Automatically verify students who meet both thresholds when session ends.
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoConfirm}
              onChange={(e) => setAutoConfirm(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--primary-light)', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Apply Thresholds
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

