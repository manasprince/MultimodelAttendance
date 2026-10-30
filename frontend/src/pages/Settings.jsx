import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Cpu, 
  Mic, 
  Database, 
  Check, 
  AlertCircle, 
  Save, 
  RefreshCw,
  Server
} from 'lucide-react';
import { api } from '../api';

export default function Settings() {
  const [settings, setSettings] = useState([]);
  const [sysStatus, setSysStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [blurPrivacy, setBlurPrivacy] = useState(false);
  const [retentionDays, setRetentionDays] = useState('90');
  const [audioEnabled, setAudioEnabled] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsRes, statusRes] = await Promise.all([
        api.getSettings(),
        api.getSystemStatus()
      ]);
      setSettings(settingsRes);
      setSysStatus(statusRes);

      // Map values
      const blurItem = settingsRes.find(s => s.key === 'privacy_blur_faces');
      if (blurItem) setBlurPrivacy(blurItem.value === 'true');

      const retItem = settingsRes.find(s => s.key === 'data_retention_days');
      if (retItem) setRetentionDays(retItem.value);

      const audioItem = settingsRes.find(s => s.key === 'audio_monitoring_enabled');
      if (audioItem) setAudioEnabled(audioItem.value === 'true');
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = [
        { key: 'privacy_blur_faces', value: blurPrivacy ? 'true' : 'false', description: 'Blur face regions for privacy' },
        { key: 'data_retention_days', value: retentionDays, description: 'Retention period in days for logs' },
        { key: 'audio_monitoring_enabled', value: audioEnabled ? 'true' : 'false', description: 'Enable audio activity telemetry' }
      ];
      await api.updateSettings(payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadData();
    } catch (err) {
      alert('Error updating settings: ' + err.message);
    }
  };

  const cvOperational = sysStatus?.cv_engine?.status === 'operational';
  const cvMode = sysStatus?.cv_engine?.mode;
  const audioOperational = sysStatus?.audio_engine?.status === 'operational';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 880 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>System Settings & Privacy Controls</h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Configure data retention policies, facial privacy blur, and inspect local hardware & AI dependency status
        </p>
      </div>

      {saveSuccess && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 8,
          color: '#6ee7b7',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          <Check size={18} />
          <span>System settings updated successfully!</span>
        </div>
      )}

      {/* AI & Computer Vision Diagnostics Card */}
      <div className="glass-panel" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Cpu size={18} color="var(--primary-light)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>AI & Hardware Dependency Health</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {/* CV Card */}
          <div style={{
            padding: 16,
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 8,
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f3f4f6' }}>
                OpenCV Face & Pose Engine
              </span>
              <span className={`badge ${cvOperational ? 'badge-present' : 'badge-absent'}`}>
                {cvOperational ? 'Active' : 'Unavailable'}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 6 }}>
              Mode: <strong style={{ color: '#67e8f9' }}>{cvMode || 'Checking...'}</strong>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {sysStatus?.cv_engine?.description || 'Detects human face boundaries, landmarks, and yaw/pitch gaze angles.'}
            </p>
          </div>

          {/* Audio Card */}
          <div style={{
            padding: 16,
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 8,
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f3f4f6' }}>
                Audio Activity Analyzer
              </span>
              <span className={`badge ${audioOperational ? 'badge-present' : 'badge-absent'}`}>
                {audioOperational ? 'Active' : 'Unavailable'}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 6 }}>
              Mode: <strong style={{ color: '#38bdf8' }}>{sysStatus?.audio_engine?.mode || 'Web Audio API'}</strong>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {sysStatus?.audio_engine?.description || 'Measures room volume RMS, sustained speech activity, and conversational pacing.'}
            </p>
          </div>
        </div>
      </div>

      {/* Privacy & Compliance Form */}
      <form onSubmit={handleSave} className="glass-panel" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Shield size={18} color="#06b6d4" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Data Protection & Student Privacy</h2>
        </div>

        {/* Blur faces toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 14,
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 8,
          border: '1px solid var(--border-color)'
        }}>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f3f4f6' }}>
              Facial Privacy Blurring
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Apply real-time Gaussian blur to all detected face regions in live camera monitors and logs.
            </div>
          </div>
          <input
            type="checkbox"
            checked={blurPrivacy}
            onChange={(e) => setBlurPrivacy(e.target.checked)}
            style={{ width: 20, height: 20, accentColor: 'var(--primary-light)', cursor: 'pointer' }}
          />
        </div>

        {/* Audio monitoring toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 14,
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 8,
          border: '1px solid var(--border-color)'
        }}>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f3f4f6' }}>
              Audio Activity Telemetry
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Compute volume energy and speech pacing. Audio is never recorded to disk—only energy levels are analyzed.
            </div>
          </div>
          <input
            type="checkbox"
            checked={audioEnabled}
            onChange={(e) => setAudioEnabled(e.target.checked)}
            style={{ width: 20, height: 20, accentColor: 'var(--primary-light)', cursor: 'pointer' }}
          />
        </div>

        {/* Data retention */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6 }}>
            Engagement Telemetry Retention (Days)
          </label>
          <input
            type="number"
            min="7"
            max="365"
            className="form-input"
            style={{ maxWidth: 200 }}
            value={retentionDays}
            onChange={(e) => setRetentionDays(e.target.value)}
          />
          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Detailed minute-by-minute engagement frames older than this threshold are purged automatically.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button type="submit" className="btn-primary">
            <Save size={16} />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}

