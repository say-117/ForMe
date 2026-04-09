import React, { useState, useEffect } from 'react';
import Login from './Login';
import DiaryMain from './DiaryMain';
import ManagerDashboard from './ManagerDashboard';

const SESSION_KEY = 'forme_user';

function App() {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 페이지 새로고침 시 localStorage에서 세션 복원
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) setUserProfile(JSON.parse(stored));
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
    setLoading(false);
  }, []);

  const handleLogin = (profile) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
    setUserProfile(profile);
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUserProfile(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '24px' }}>
        🐣
      </div>
    );
  }

  return (
    <div className="App">
      {!userProfile ? (
        <Login onLogin={handleLogin} />
      ) : userProfile.is_manager ? (
        <ManagerDashboard userProfile={userProfile} onLogout={handleLogout} />
      ) : (
        <DiaryMain user={{ id: userProfile.id }} userProfile={userProfile} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
