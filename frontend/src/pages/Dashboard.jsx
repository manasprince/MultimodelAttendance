import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Activity, 
  Play, 
  Plus, 
  ArrowRight,
  ShieldCheck,
  Video
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import { api } from '../api';

export default function Dashboard({ setActiveTab, onSelectSession }) {
  const [stats, setStats] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, sessionsRes] = await Promise.all([
        api.getDashboardStats(),
        api.getSessions()
      ]);
      setStats(statsRes);
      setRecentSessions(sessionsRes.slice(0, 5));
    } catch (e) {
      console.error('Failed to load dashboard stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, rgba(79,70,229,0.18) 0%, rgba(6,182,212,0.1) 100%)',
        border: '1px solid rgba(99,102,241,0.25)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="live-indicator" />
            <span style={{ fontSize: '0.8rem', color: '#67e8f9', fontWeight: 700, letterSpacing: '0.05em' }}>
              MULTIMODAL AGENT READY
            </span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Classroom Intelligence Dashboard
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Real-time biometric attendance, visual attention analytics, and explainable teaching suggestions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setActiveTab('live')}
            className="btn-primary"
            style={{ padding: '12px 20px', fontSize: '0.95rem' }}
          >
            <Video size={18} />
            <span>Launch Live Agent</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <MetricCard
          title="Active Students"
          value={stats?.total_students ?? '—'}
          subvalue="Enrolled across all classes"
          icon={Users}
          color="#38bdf8"
        />
        <MetricCard
          title="Classrooms"
          value={stats?.total_classes ?? '—'}
          subvalue="Managed subjects"
          icon={GraduationCap}
          color="#818cf8"
        />
        <MetricCard
          title="Attendance Rate"
          value={stats ? `${stats.overall_attendance_rate}%` : '—'}
          subvalue="Historical verified rate"
          icon={CheckCircle}
          color="#34d399"
          trend="+3.2%"
        />
        <MetricCard
          title="Avg Visual Engagement"
          value={stats ? `${stats.average_engagement_score}%` : '—'}
          subvalue="Calculated from eye & head pose"
          icon={Activity}
          color="#06b6d4"
        />
        <MetricCard
          title="Pending Reviews"
          value={stats?.pending_reviews_count ?? '—'}
          subvalue="Low-confidence or unconfirmed"
          icon={AlertCircle}
          color="#f59e0b"
        />
      </div>

      {/* Main Split: Active / Recent Sessions & Quick Access */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Recent Sessions Table */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Recent Attendance Sessions</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Overview of conducted and active classroom sessions
              </p>
            </div>
            <button
              onClick={() => setActiveTab('history')}
              className="btn-secondary"
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {recentSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}>
              No sessions created yet. Start a new session from the Live Session Agent!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Session Title</th>
                    <th>Class</th>
                    <th>Status</th>
                    <th>Attendance</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map(sess => (
                    <tr key={sess.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#f3f4f6' }}>{sess.title}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          {sess.start_time ? new Date(sess.start_time).toLocaleDateString() : 'Scheduled'}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#a5b4fc' }}>
                          {sess.class_code}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${sess.status}`}>
                          {sess.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{sess.attendance_rate}%</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            ({sess.total_present}/{sess.total_enrolled})
                          </span>
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            if (onSelectSession) onSelectSession(sess.id);
                            setActiveTab('live');
                          }}
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          Open Agent
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Agent Actions & System Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick Start Card */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>
              Quick Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => setActiveTab('classes')}
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px' }}
              >
                <Users size={16} color="#818cf8" />
                <span>Manage Students & Classes</span>
              </button>

              <button
                onClick={() => setActiveTab('review')}
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px' }}
              >
                <AlertCircle size={16} color="#fbbf24" />
                <span>Review Pending Attendance</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px' }}
              >
                <ShieldCheck size={16} color="#34d399" />
                <span>Privacy & Detection Thresholds</span>
              </button>
            </div>
          </div>

          {/* Engine Integrity Card */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>
              Agent Architecture Status
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Computer Vision</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>{stats?.cv_status || 'Operational'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Audio Telemetry</span>
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>{stats?.audio_status || 'Web Audio API'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Rules Engine</span>
                <span style={{ color: '#a5b4fc', fontWeight: 600 }}>Deterministic Local</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Storage & Audit</span>
                <span style={{ color: '#f3f4f6', fontWeight: 600 }}>SQLite Persistent</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

