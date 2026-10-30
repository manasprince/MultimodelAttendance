import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export default function HumanReviewModal({ record, onClose, onSave }) {
  if (!record) return null;

  const [status, setStatus] = useState(record.status || 'present');
  const [note, setNote] = useState(record.manual_review_note || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave(record.id, {
        status,
        is_confirmed: true,
        manual_review_note: note.trim() || 'Verified by instructor'
      });
      onClose();
    } catch (err) {
      alert('Error updating attendance record: ' + err.message);
    } finally {
      setSubmitting(false);
    }
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
        maxWidth: 480,
        padding: 24,
        background: '#111827',
        border: '1px solid rgba(255,255,255,0.15)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Human Review & Verification</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Verify student identity and finalize attendance record
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-dim)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Student details summary */}
        <div style={{
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Student</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>{record.student_name} ({record.student_code})</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Accumulated Presence</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{record.total_presence_seconds || record.presence_seconds || 0}s</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Detection Score</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: (record.confidence_score >= 0.6) ? '#34d399' : '#fbbf24' }}>
              {Math.round((record.confidence_score || 0) * 100)}%
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Status</span>
            <span className={`badge badge-${record.status}`}>{record.status}</span>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
              Determine Final Status
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { val: 'present', label: 'Present', icon: CheckCircle, color: '#34d399' },
                { val: 'late', label: 'Late', icon: Clock, color: '#fbbf24' },
                { val: 'absent', label: 'Absent', icon: XCircle, color: '#f87171' },
              ].map(opt => {
                const isSelected = status === opt.val;
                const Icon = opt.icon;
                return (
                  <button
                    type="button"
                    key={opt.val}
                    onClick={() => setStatus(opt.val)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? opt.color : 'var(--border-color)'}`,
                      background: isSelected ? `${opt.color}22` : 'rgba(255,255,255,0.03)',
                      color: isSelected ? opt.color : 'var(--text-muted)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      fontWeight: 600,
                      fontSize: '0.8rem'
                    }}
                  >
                    <Icon size={16} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
              Review Note / Verification Reason
            </label>
            <textarea
              className="form-input"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Verified visually in back row, confirmed by student id card."
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving...' : 'Confirm & Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

