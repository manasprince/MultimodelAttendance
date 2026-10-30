import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, 
  Square, 
  Sliders, 
  Video, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Shield, 
  Plus, 
  RefreshCw,
  Sparkles,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import VideoFeed from '../components/VideoFeed';
import AudioVisualizer from '../components/AudioVisualizer';
import EngagementHUD from '../components/EngagementHUD';
import SuggestionBox from '../components/SuggestionBox';
import ThresholdModal from '../components/ThresholdModal';
import HumanReviewModal from '../components/HumanReviewModal';
import { api } from '../api';

export default function LiveSession({ preselectedSessionId }) {
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(preselectedSessionId || null);
  const [sessionData, setSessionData] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [reviewModalRecord, setReviewModalRecord] = useState(null);

  // New Session Form
  const [newTitle, setNewTitle] = useState('');
  const [newClassId, setNewClassId] = useState('');

  // Live Agent Telemetry State
  const [blurPrivacy, setBlurPrivacy] = useState(false);
  const [audioTelemetry, setAudioTelemetry] = useState({ energy_level: 0, speech_active: false, peak_volume: 0 });
  const [detectedPersons, setDetectedPersons] = useState([]);
  const [detectedCount, setDetectedCount] = useState(0);
  const [attentiveCount, setAttentiveCount] = useState(0);
  const [distractedCount, setDistractedCount] = useState(0);
  const [averageAttention, setAverageAttention] = useState(0);
  const [teachingSuggestion, setTeachingSuggestion] = useState('');
  const [suggestionRuleId, setSuggestionRuleId] = useState('');

  // Load Sessions and Classes
  const loadInitialData = async () => {
    try {
      const [sessList, clsList] = await Promise.all([
        api.getSessions(),
        api.getClasses()
      ]);
      setSessions(sessList);
      setClasses(clsList);

      if (clsList.length > 0 && !newClassId) {
        setNewClassId(clsList[0].id);
      }

      if (sessList.length > 0) {
        const targetId = preselectedSessionId || sessList[0].id;
        setSelectedSessionId(targetId);
      }
    } catch (e) {
      console.error('Failed to load sessions:', e);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [preselectedSessionId]);

  // Load Selected Session Details
  const loadSessionDetails = useCallback(async (id) => {
    if (!id) return;
    try {
      const data = await api.getSessionDetails(id);
      setSessionData(data.session);
      setRoster(data.roster);
    } catch (e) {
      console.error('Failed to load session details:', e);
    }
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      loadSessionDetails(selectedSessionId);
    }
  }, [selectedSessionId, loadSessionDetails]);

  // Polling roster periodically when session is active
  useEffect(() => {
    let interval = null;
    if (sessionData && sessionData.status === 'active') {
      interval = setInterval(() => {
        loadSessionDetails(selectedSessionId);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionData?.status, selectedSessionId, loadSessionDetails]);

  // Start Session
  const handleStartSession = async () => {
    if (!selectedSessionId) return;
    try {
      await api.startSession(selectedSessionId);
      await loadSessionDetails(selectedSessionId);
      // Refresh list
      const sessList = await api.getSessions();
      setSessions(sessList);
    } catch (err) {
      alert('Error starting session: ' + err.message);
    }
  };

  // End Session
  const handleEndSession = async () => {
    if (!selectedSessionId) return;
    try {
      await api.endSession(selectedSessionId);
      await loadSessionDetails(selectedSessionId);
      const sessList = await api.getSessions();
      setSessions(sessList);
    } catch (err) {
      alert('Error ending session: ' + err.message);
    }
  };

  // Create New Session
  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      const created = await api.createSession({
        title: newTitle,
        class_id: parseInt(newClassId, 10),
        min_confidence_threshold: 0.60,
        min_presence_seconds: 15,
        auto_confirm: false
      });
      setShowNewSessionModal(false);
      setNewTitle('');
      const sessList = await api.getSessions();
      setSessions(sessList);
      setSelectedSessionId(created.id);
    } catch (err) {
      alert('Error creating session: ' + err.message);
    }
  };

  // Process Live Frame from VideoFeed
  const handleFrameProcessed = async (payload) => {
    try {
      const res = await api.processLiveFrame(selectedSessionId, payload);
      setDetectedPersons(res.persons || []);
      setDetectedCount(res.detected_count || 0);
      setAttentiveCount(res.attentive_count || 0);
      setDistractedCount(res.distracted_count || 0);
      setAverageAttention(res.average_attention || 0);
      setTeachingSuggestion(res.teaching_suggestion || '');
      setSuggestionRuleId(res.suggestion_rule_id || '');
      return res;
    } catch (err) {
      console.error('Frame process API call error:', err);
      return null;
    }
  };

  // Save Human Review
  const handleSaveReview = async (recordId, updatePayload) => {
    await api.updateReviewRecord(recordId, updatePayload);
    await loadSessionDetails(selectedSessionId);
  };

  const isSessionActive = sessionData?.status === 'active';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Session Top Bar */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        {/* Session selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <select
            className="form-input"
            style={{ width: 'auto', minWidth: 260, fontWeight: 600, background: 'rgba(0,0,0,0.5)' }}
            value={selectedSessionId || ''}
            onChange={(e) => setSelectedSessionId(parseInt(e.target.value, 10))}
          >
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                [{s.class_code}] {s.title} ({s.status.toUpperCase()})
              </option>
            ))}
          </select>

          <button onClick={() => setShowNewSessionModal(true)} className="btn-secondary" style={{ padding: '8px 12px' }}>
            <Plus size={16} />
            <span>New Session</span>
          </button>
        </div>

        {/* Status Badge & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {sessionData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`badge badge-${sessionData.status}`}>
                {sessionData.status === 'active' && <span className="live-indicator live-indicator-recording" />}
                {sessionData.status}
              </span>

              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                Present: {sessionData.total_present} / {sessionData.total_enrolled} ({sessionData.attendance_rate}%)
              </span>
            </div>
          )}

          {/* Thresholds modal opener */}
          <button
            onClick={() => setShowThresholdModal(true)}
            className="btn-secondary"
            style={{ padding: '8px 12px', fontSize: '0.8rem' }}
            title="Configure Thresholds"
          >
            <Sliders size={15} />
            <span>Thresholds</span>
          </button>

          {/* Start/Stop Session Button */}
          {!isSessionActive ? (
            <button
              onClick={handleStartSession}
              disabled={!sessionData}
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              <Play size={16} fill="white" />
              <span>Start Session</span>
            </button>
          ) : (
            <button
              onClick={handleEndSession}
              className="btn-danger"
              style={{ padding: '9px 16px', fontSize: '0.85rem' }}
            >
              <Square size={15} fill="currentColor" />
              <span>End & Finalize</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Column (Vision & Audio Telemetry) / Right Column (Analytics & Roster) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1.15fr) 1fr', gap: 20 }}>
        {/* Left Column: Live Video + Web Audio Analyzer + Teaching Suggestions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Video Feed */}
          <VideoFeed
            isActive={isSessionActive}
            sessionId={selectedSessionId}
            blurPrivacy={blurPrivacy}
            onBlurToggle={() => setBlurPrivacy(!blurPrivacy)}
            onFrameProcessed={handleFrameProcessed}
            audioData={audioTelemetry}
          />

          {/* Web Audio Analyzer */}
          <AudioVisualizer
            isActive={isSessionActive}
            onAudioTelemetry={(data) => setAudioTelemetry(data)}
          />

          {/* Explainable Teaching Suggestion Card */}
          <SuggestionBox
            suggestionText={teachingSuggestion}
            ruleId={suggestionRuleId}
          />
        </div>

        {/* Right Column: Real-time Engagement HUD + Live Attendance Roster */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Engagement Analytics HUD */}
          <EngagementHUD
            detectedCount={detectedCount}
            attentiveCount={attentiveCount}
            distractedCount={distractedCount}
            averageAttention={averageAttention}
            persons={detectedPersons}
          />

          {/* Live Student Attendance Roster */}
          <div className="glass-panel" style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                  Real-time Attendance Tracker
                </h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Threshold req: {sessionData?.min_presence_seconds || 15}s presence | {Math.round((sessionData?.min_confidence_threshold || 0.6) * 100)}% conf
                </p>
              </div>

              <button
                onClick={() => loadSessionDetails(selectedSessionId)}
                className="btn-secondary"
                style={{ padding: '4px 8px' }}
                title="Refresh Roster"
              >
                <RefreshCw size={13} />
              </button>
            </div>

            {roster.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                No students enrolled in this session's class.
              </div>
            ) : (
              <div style={{ overflowY: 'auto', maxHeight: 360 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Presence</th>
                      <th>Confidence</th>
                      <th>Status</th>
                      <th>Audit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map(r => (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#f3f4f6', fontSize: '0.85rem' }}>
                            {r.student_name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                            {r.student_code}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {r.total_presence_seconds}s
                          </span>
                        </td>
                        <td>
                          <span style={{
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: r.confidence_score >= (sessionData?.min_confidence_threshold || 0.6) ? '#34d399' : '#fbbf24'
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
                          <button
                            onClick={() => setReviewModalRecord(r)}
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            title="Verify or Override Status"
                          >
                            <UserCheck size={13} color="#38bdf8" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Threshold Modal */}
      {showThresholdModal && (
        <ThresholdModal
          currentSession={sessionData}
          onClose={() => setShowThresholdModal(false)}
          onSave={(newThresholds) => {
            // Apply locally to session
            setSessionData(prev => ({ ...prev, ...newThresholds }));
          }}
        />
      )}

      {/* Human Review Modal */}
      {reviewModalRecord && (
        <HumanReviewModal
          record={reviewModalRecord}
          onClose={() => setReviewModalRecord(null)}
          onSave={handleSaveReview}
        />
      )}

      {/* New Session Modal */}
      {showNewSessionModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 440, padding: 24, background: '#111827' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Create Attendance Session</h3>
            <form onSubmit={handleCreateSession} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Select Class</label>
                <select
                  required
                  className="form-input"
                  value={newClassId}
                  onChange={(e) => setNewClassId(e.target.value)}
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Session Title</label>
                <input
                  required
                  className="form-input"
                  placeholder="e.g. Lecture 4: Real-time Video Analytics"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => setShowNewSessionModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

