import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Filter, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';
import HumanReviewModal from '../components/HumanReviewModal';
import { api } from '../api';

export default function HumanReview() {
  const [pendingRecords, setPendingRecords] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeModalRecord, setActiveModalRecord] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessList, records] = await Promise.all([
        api.getSessions(),
        api.getPendingReviews(selectedSessionId ? parseInt(selectedSessionId, 10) : null)
      ]);
      setSessions(sessList);
      setPendingRecords(records);
    } catch (e) {
      console.error('Failed to load pending reviews:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSessionId]);

  const handleBatchConfirm = async () => {
    if (!selectedSessionId) {
      alert('Please select a specific session to batch-confirm.');
      return;
    }
    if (!window.confirm('Confirm all pending records with confidence >= 60% for this session?')) return;
    try {
      const res = await api.batchConfirmRecords(selectedSessionId, 0.60);
      alert(res.message);
      loadData();
    } catch (err) {
      alert('Batch confirm failed: ' + err.message);
    }
  };

  const handleSaveReview = async (recordId, updatePayload) => {
    await api.updateReviewRecord(recordId, updatePayload);
    loadData();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Human Review & Verification Queue</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Supervise automated attendance decisions, review low-confidence detections, and prevent duplicate or false entries
          </p>
        </div>

        {selectedSessionId && pendingRecords.length > 0 && (
          <button
            onClick={handleBatchConfirm}
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
          >
            <ShieldCheck size={16} />
            <span>Batch-Verify High Confidence (&gt;= 60%)</span>
          </button>
        )}
      </div>

      {/* Session Filter Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Filter by Session:</span>
        <select
          className="form-input"
          style={{ width: 'auto', minWidth: 260, fontSize: '0.85rem' }}
          value={selectedSessionId}
          onChange={(e) => setSelectedSessionId(e.target.value)}
        >
          <option value="">All Sessions (All Pending)</option>
          {sessions.map(s => (
            <option key={s.id} value={s.id}>{s.title} ({s.class_code})</option>
          ))}
        </select>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>
          {pendingRecords.length} records awaiting instructor verification
        </span>
      </div>

      {/* Pending Reviews Table */}
      <div className="glass-panel" style={{ padding: 20 }}>
        {pendingRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-dim)' }}>
            <CheckCircle size={40} color="#34d399" style={{ margin: '0 auto 12px', opacity: 0.8 }} />
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f3f4f6' }}>All Attendance Records Verified</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 4 }}>
              There are no pending, flagged, or unconfirmed records in this queue.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Presence Duration</th>
                  <th>Detections</th>
                  <th>Confidence Score</th>
                  <th>Current Flag</th>
                  <th>Review Note</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingRecords.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f3f4f6' }}>{r.student_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                        {r.student_code}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                        {Math.round(r.total_presence_seconds)}s
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>{r.detection_count}</span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: r.confidence_score >= 0.6 ? '#34d399' : '#fbbf24'
                      }}>
                        {Math.round(r.confidence_score * 100)}%
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${r.status}`}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)', maxWidth: 220 }}>
                      {r.manual_review_note || 'Awaiting instructor verification'}
                    </td>
                    <td>
                      <button
                        onClick={() => setActiveModalRecord(r)}
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      >
                        Verify & Audit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeModalRecord && (
        <HumanReviewModal
          record={activeModalRecord}
          onClose={() => setActiveModalRecord(null)}
          onSave={handleSaveReview}
        />
      )}
    </div>
  );
}

