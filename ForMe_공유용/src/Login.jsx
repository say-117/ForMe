import React, { useState } from 'react';
import './Login.css';
import { signInWithUsername, signInAsManager } from './lib/db';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [managerCode, setManagerCode] = useState('');
  const [isDevMode, setIsDevMode] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ── 일반 로그인 ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('아이디를 입력해주세요!');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const data = await signInWithUsername(username.trim());
      onLogin(data);
    } catch (err) {
      setError(err.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── 관리자 코드 확인 ──
  const handleManagerSubmit = async (e) => {
    e.preventDefault();
    const correctCode = import.meta.env.VITE_MANAGER_CODE;
    if (managerCode !== correctCode) {
      setError('코드가 올바르지 않습니다.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const data = await signInAsManager();
      onLogin(data);
    } catch (err) {
      setError(err.message || '관리자 로그인 오류.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── 관리자 모드 화면 ──
  if (isDevMode) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>For Me</h1>
          <p>관리자 코드를 입력하세요.</p>
          <form onSubmit={handleManagerSubmit}>
            <input
              type="password"
              placeholder="관리자 코드"
              value={managerCode}
              onChange={(e) => setManagerCode(e.target.value)}
              autoFocus
            />
            {error && (
              <p style={{ color: '#e74c3c', fontSize: '13px', margin: '4px 0' }}>{error}</p>
            )}
            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? '확인 중...' : '입장'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px' }}>
            <span
              style={{ color: '#4facfe', cursor: 'pointer' }}
              onClick={() => { setIsDevMode(false); setManagerCode(''); setError(''); }}
            >
              ← 돌아가기
            </span>
          </p>
        </div>
      </div>
    );
  }

  // ── 일반 로그인 화면 ──
  return (
    <div className="login-container">
      <div className="login-box">
        <h1>For Me</h1>
        <p>당신의 이름을 알려주세요.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="아이디 입력"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
          {error && (
            <p style={{ color: '#e74c3c', fontSize: '13px', margin: '4px 0' }}>{error}</p>
          )}
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? '입장 중...' : '일기장 입장하기'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '16px' }}>
          <span
            style={{ fontSize: '11px', color: '#ddd', cursor: 'pointer' }}
            onClick={() => { setIsDevMode(true); setError(''); setUsername(''); }}
          >
            관리자
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
