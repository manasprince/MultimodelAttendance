import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Calendar, 
  Search, 
  Filter, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { api } from '../api';

export default function AttendanceHistory() {
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [historyRecords, setHistoryRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Load classes and sessions
  const loadFilters = async () => {
    try {
      const [clsList, sessList] = await Promise.all([
        api.getClasses(),
        api.getSessions()
      ]);
      setClasses(clsList);
      setSessions(sessList);
    } catch (e) {
      console.error('Failed to load filters:', e);
    }
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedClassId) params.class_id = selectedClassId;
      if (selectedSessionId) params.session_id = selectedSessionId;
      const res = await api.getAttendanceHistory(params);
      setHistoryRecords(res);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadHistory();
  }, [selectedClassId, selectedSessionId]);

  const handleExportCSV = () => {
    if (!selectedSessionId) {
      // Pick the first available session from records if any
      if (historyRecords.length > 0) {
        const sId = historyRecords[0].session_id;
        window.open(api.getExportCSVUrl(sId), '_blank');
      } else {
        alert('Please select a specific session to export.');
      }
      return;
    }
    window.open(api.getExportCSVUrl(selectedSessionId), '_blank');
  };

  const filtered = historyRecords.filter(r => 
    r.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.student_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.session_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Attendance Audit History & Export</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Search historical attendance records, verify human confirmations, and export compliance CSV reports
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="btn-primary"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
        >
          <Download size={16} />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {/* Class Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Class:</span>
          <select
            className="form-input"
            style={{ width: 'auto', minWidth: 180, fontSize: '0.82rem' }}
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>

        {/* Session Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Session:</span>
          <select
            className="form-input"
            style={{ width: 'auto', minWidth: 200, fontSize: '0.82rem' }}
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
          >
            <option value="">All Sessions</option>
            {sessions
              .filter(s => !selectedClassId || s.class_id === parseInt(selectedClassId, 10))
              .map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
          </select>
        </div>

        {/* Search Filter */}
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: 10, top: 11 }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 32, fontSize: '0.82rem' }}
            placeholder="Search student, roll number, or session..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Attendance Records Log</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Showing {filtered.length} entries
          </span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-dim)' }}>
            No attendance history matches the active filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Session</th>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Presence Time</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Verification Audit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.record_id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f3f4f6', fontSize: '0.85rem' }}>
                        {r.session_title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {r.date}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.student_name}</div>
                      <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                        {r.student_code}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#a5b4fc', fontFamily: 'var(--font-mono)' }}>
                        {r.class_code}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
                        {r.presence_seconds}s
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.82rem',
                        fontWeight: 600,
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
                    <td>
                      {r.is_confirmed ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399', fontSize: '0.78rem' }}>
                          <CheckCircle size={14} />
                          <span>Confirmed ({r.confirmed_by || 'system'})</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fbbf24', fontSize: '0.78rem' }}>
                          <AlertCircle size={14} />
                          <span>Pending Review</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

