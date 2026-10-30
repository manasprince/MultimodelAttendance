import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Video, 
  History, 
  CheckSquare, 
  Settings as SettingsIcon, 
  LogOut, 
  Sparkles, 
  Cpu, 
  Mic
} from 'lucide-react';
import { api } from '../api';

export default function Navbar({ activeTab, setActiveTab, user, onLogout }) {
  const [sysStatus, setSysStatus] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.getSystemStatus();
        setSysStatus(res);
      } catch (e) {
        // quiet error
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'classes', label: 'Classes & Students', icon: Users },
    { id: 'live', label: 'Live Session Agent', icon: Video, highlight: true },
    { id: 'history', label: 'Attendance History', icon: History },
    { id: 'review', label: 'Human Review', icon: CheckSquare },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const cvStatus = sysStatus?.cv_engine?.status === 'operational';
  const cvMode = sysStatus?.cv_engine?.mode || 'checking';

  return (
    <header style={{
      borderBottom: '1px solid var(--border-color)',
      background: 'rgba(11, 15, 29, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{
        maxWidth: 1440,
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(79, 70, 229, 0.4)'
          }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                MANAS
              </span>
              <span style={{
                fontSize: '0.65rem',
                padding: '2px 6px',
                borderRadius: 4,
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc',
                fontWeight: 700,
                border: '1px solid rgba(99, 102, 241, 0.3)'
              }}>
                MVP v1.0
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: -2 }}>
              Multimodal Attendance & Engagement Agent
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  background: isActive 
                    ? (item.highlight ? 'linear-gradient(135deg, rgba(79,70,229,0.3), rgba(6,182,212,0.2))' : 'rgba(255, 255, 255, 0.08)')
                    : 'transparent',
                  border: isActive ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} color={isActive ? (item.highlight ? '#06b6d4' : '#818cf8') : 'currentColor'} />
                <span>{item.label}</span>
                {item.highlight && (
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 8px #10b981'
                  }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Engine Status & User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* CV & Audio Indicators */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 10px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            fontSize: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} title={cvMode}>
              <Cpu size={14} color={cvStatus ? '#34d399' : '#f87171'} />
              <span style={{ color: cvStatus ? '#34d399' : '#f87171', fontWeight: 600 }}>
                {cvMode === 'opencv_yunet' ? 'YuNet' : (cvMode === 'opencv_contour_motion' ? 'CV Fallback' : 'CV Off')}
              </span>
            </div>
            <span style={{ color: 'var(--border-color)' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} title="Audio Telemetry">
              <Mic size={14} color="#38bdf8" />
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>Audio Live</span>
            </div>
          </div>

          {/* User profile & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f3f4f6' }}>
                {user?.full_name || 'Teacher'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'capitalize' }}>
                {user?.role || 'Instructor'}
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f87171'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

