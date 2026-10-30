import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import StudentsAndClasses from './pages/StudentsAndClasses';
import LiveSession from './pages/LiveSession';
import AttendanceHistory from './pages/AttendanceHistory';
import HumanReview from './pages/HumanReview';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { getStoredUser, removeToken } from './api';

export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [preselectedSessionId, setPreselectedSessionId] = useState(null);

  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
    };
    window.addEventListener('auth-logout', handleLogout);
    return () => window.removeEventListener('auth-logout', handleLogout);
  }, []);

  const handleLogout = () => {
    removeToken();
    setUser(null);
  };

  const handleSelectSession = (sessionId) => {
    setPreselectedSessionId(sessionId);
    setActiveTab('live');
  };

  if (!user) {
    return <Login onLoginSuccess={(authData) => setUser(authData)} />;
  }

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard
            setActiveTab={setActiveTab}
            onSelectSession={handleSelectSession}
          />
        )}
        {activeTab === 'classes' && <StudentsAndClasses />}
        {activeTab === 'live' && (
          <LiveSession
            preselectedSessionId={preselectedSessionId}
          />
        )}
        {activeTab === 'history' && <AttendanceHistory />}
        {activeTab === 'review' && <HumanReview />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  );
}

