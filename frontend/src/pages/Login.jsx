import React, { useState } from 'react';
import { Sparkles, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../api';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('teacher');
  const [password, setPassword] = useState('admin123');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const data = await api.login(username, password);
      onLoginSuccess(data);
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setUsername('teacher');
    setPassword('admin123');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      background: 'radial-gradient(circle at 50% 30%, rgba(79, 70, 229, 0.2) 0%, #0a0f1d 70%)'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: 420,
        padding: '36px 32px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 20px 48px rgba(0,0,0,0.6)'
      }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 0 24px rgba(79, 70, 229, 0.5)'
          }}>
            <Sparkles size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            MANAS
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Multimodal Attendance & Engagement Agent
          </p>
        </div>

        {errorMsg && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            color: '#fca5a5',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 18
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="var(--text-dim)" style={{ position: 'absolute', left: 12, top: 12 }} />
              <input
                type="text"
                required
                className="form-input"
                style={{ paddingLeft: 36 }}
                placeholder="teacher"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-dim)" style={{ position: 'absolute', left: 12, top: 12 }} />
              <input
                type="password"
                required
                className="form-input"
                style={{ paddingLeft: 36 }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 6, padding: '12px' }}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Agent'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Demo Credentials Helper */}
        <div style={{
          marginTop: 22,
          padding: '12px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 6 }}>
            Default Instructor Credentials:
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#a5b4fc', marginBottom: 8 }}>
            teacher / admin123
          </div>
          <button
            type="button"
            onClick={handleDemoFill}
            style={{ fontSize: '0.75rem', color: '#38bdf8', textDecoration: 'underline' }}
          >
            Auto-fill credentials
          </button>
        </div>
      </div>
    </div>
  );
}

