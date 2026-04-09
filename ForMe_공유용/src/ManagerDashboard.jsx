//ManagerDashboardjsx 코드
import React, { useState, useEffect } from 'react';
// 기존 import 줄 수정
import { getAllUsers, getEntriesForUser, getAllWeeklyInsights, upsertWeeklyInsight } from './lib/db';

const card = {
  background: '#fff',
  padding: '16px',
  borderRadius: '15px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.07)',
  marginBottom: '12px'
};

const ManagerDashboard = ({ userProfile, onLogout }) => {
  const [view, setView] = useState('list');          // 'list' | 'diary' | 'detail'
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [insights, setInsights] = useState([]);         // 기존 주간 인사이트 목록
  const [newInsightWeek, setNewInsightWeek] = useState('');  // 입력할 주 선택
  const [newInsightText, setNewInsightText] = useState('');  // 입력할 인사이트 텍스트
  const [insightSaving, setInsightSaving] = useState(false);

  useEffect(() => {
    getAllUsers()
      .then(data => setUsers(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const openUserDiary = async (u) => {
    setLoading(true);
    try {
      const [data, insightData] = await Promise.all([
        getEntriesForUser(u.id),
        getAllWeeklyInsights(u.id)
      ]);
      setSelectedUser(u);
      setEntries(data);
      setInsights(insightData);
      setView('diary');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInsight = async () => {
  if (!newInsightWeek || !newInsightText.trim()) return;
  setInsightSaving(true);
  try {
    const saved = await upsertWeeklyInsight(
      selectedUser.id,
      newInsightWeek,
      newInsightText.trim(),
      userProfile.id
    );
    setInsights(prev => {
      const filtered = prev.filter(i => i.week_start !== saved.week_start);
      return [saved, ...filtered].sort((a, b) => b.week_start.localeCompare(a.week_start));
    });
    setNewInsightText('');
    setNewInsightWeek('');
  } catch (err) {
    alert('저장 오류: ' + err.message);
  } finally {
    setInsightSaving(false);
  }
};

  const openEntry = (entry) => {
    setSelectedEntry(entry);
    setView('detail');
  };

  const getPetLevel = (exp) => Math.floor((exp || 0) / 100);
  const getMostCommonEmotion = (ents) => {
    const emotions = ents.map(e => e.emotion).filter(Boolean);
    if (!emotions.length) return '없음';
    return emotions.sort((a, b) =>
      emotions.filter(v => v === a).length - emotions.filter(v => v === b).length
    ).pop();
  };

  const containerStyle = {
    maxWidth: '360px',
    margin: '0 auto',
    padding: '20px 16px',
    fontFamily: 'inherit'
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px'
  };

  const badgeStyle = {
    background: '#6c5ce7',
    color: '#fff',
    borderRadius: '12px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 'bold'
  };

  const btnStyle = (color = '#4facfe') => ({
    background: color,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer'
  });

  const backBtn = (label, onClick) => (
    <button onClick={onClick} style={{ ...btnStyle('#aaa'), marginRight: '8px' }}>
      ← {label}
    </button>
  );

  if (loading) {
    return <div style={{ textAlign: 'center', paddingTop: '40vh', fontSize: '24px' }}>🐣</div>;
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <p style={{ color: '#e74c3c' }}>오류: {error}</p>
        <button style={btnStyle()} onClick={onLogout}>로그아웃</button>
      </div>
    );
  }

  // ============================================================
  // VIEW: ENTRY DETAIL
  // ============================================================
  if (view === 'detail' && selectedEntry) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div>
            {backBtn('목록', () => setView('diary'))}
          </div>
          <span style={badgeStyle}>관리자</span>
        </div>

        <div style={card}>
          <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#888' }}>{selectedEntry.date_key}</p>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>
            {selectedEntry.weather} {selectedEntry.emotion}
          </div>

          {selectedEntry.answers?.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontWeight: 'bold', fontSize: '13px', color: '#6c5ce7', margin: '0 0 6px 0' }}>질문 & 답변</p>
              {selectedEntry.answers.map((a, i) => (
                <div key={i} style={{ background: '#f0f4ff', padding: '10px', borderRadius: '8px', marginBottom: '6px', fontSize: '13px' }}>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#6c5ce7' }}>Q. {a.question}</p>
                  <p style={{ margin: 0, color: '#444' }}>{a.answer}</p>
                </div>
              ))}
            </div>
          )}

          {selectedEntry.timeline && (
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontWeight: 'bold', fontSize: '13px', color: '#6c5ce7', margin: '0 0 6px 0' }}>시간 흐름</p>
              {[
                { id: 'period1', label: '기상 후 6시간' },
                { id: 'period2', label: '기상 후 12시간' },
                { id: 'period3', label: '기상 후 18시간' }
              ].map(p => (
                <div key={p.id} style={{ fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ color: '#888' }}>{p.label}:</span>{' '}
                  {selectedEntry.timeline[p.id]?.menu || '-'} / {selectedEntry.timeline[p.id]?.place || '-'}
                </div>
              ))}
            </div>
          )}

          {selectedEntry.summary && (
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontWeight: 'bold', fontSize: '13px', color: '#6c5ce7', margin: '0 0 4px 0' }}>한 줄 요약</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#444' }}>"{selectedEntry.summary}"</p>
            </div>
          )}

          {selectedEntry.tags?.filter(Boolean).length > 0 && (
            <div>
              <p style={{ fontWeight: 'bold', fontSize: '13px', color: '#6c5ce7', margin: '0 0 4px 0' }}>태그</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selectedEntry.tags.filter(Boolean).map((t, i) => (
                  <span key={i} style={{ background: '#e8f4fd', color: '#4facfe', borderRadius: '20px', padding: '2px 10px', fontSize: '12px' }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // VIEW: USER'S DIARY LIST
  // ============================================================
  if (view === 'diary' && selectedUser) {
    const petLevel = getPetLevel(selectedUser.pet_exp);
    const petStage = petLevel === 0 ? '🐣' : petLevel === 1 ? '🐥' : '🐓';
    const mostEmotion = getMostCommonEmotion(entries);

    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div>{backBtn('유저 목록', () => setView('list'))}</div>
          <span style={badgeStyle}>관리자</span>
        </div>

        {/* User stats card */}
        <div style={card}>
          <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '15px' }}>{selectedUser.display_name}</p>
          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#888' }}>{selectedUser.email}</p>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px' }}>
            <span>{petStage} Lv.{petLevel}</span>
            <span>📝 {entries.length}개</span>
            <span>자주 느낀 감정: {mostEmotion}</span>
          </div>
        </div>

        {/* 주간 인사이트 입력 */}
        <div style={{ ...card, background: '#f0f4ff' }}>
          <p style={{ fontWeight: 'bold', fontSize: '14px', color: '#6c5ce7', marginBottom: '10px' }}>
            📝 주간 인사이트 관리
          </p>

          {/* 기존 인사이트 목록 */}
          {insights.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              {insights.map(i => (
                <div key={i.id} style={{ background: '#fff', padding: '10px', borderRadius: '8px', marginBottom: '6px', fontSize: '13px' }}>
                  <span style={{ color: '#888', fontSize: '11px' }}>
                    {i.week_start} 주
                  </span>
                  <p style={{ margin: '2px 0 0 0', color: '#333' }}>{i.insight}</p>
                </div>
              ))}
            </div>
          )}

          {/* 새 인사이트 입력 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="date"
              value={newInsightWeek}
              onChange={e => setNewInsightWeek(e.target.value)}
              style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }}
            />
            <textarea
              placeholder="이번 주 인사이트를 입력하세요 (예: 이번 주는 감정 기복이 많았지만 꾸준히 기록한 주였어요)"
              value={newInsightText}
              onChange={e => setNewInsightText(e.target.value)}
              style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', resize: 'none', height: '80px' }}
            />
            <button
              onClick={handleSaveInsight}
              disabled={insightSaving || !newInsightWeek || !newInsightText.trim()}
              style={btnStyle(insightSaving ? '#aaa' : '#6c5ce7')}
            >
              {insightSaving ? '저장 중...' : '인사이트 저장'}
            </button>
          </div>
        </div>

        

        {/* Diary entries */}
        {entries.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#aaa', fontSize: '14px' }}>아직 작성된 일기가 없습니다.</p>
        ) : (
          entries.map(entry => (
            <div key={entry.id} style={{ ...card, cursor: 'pointer' }} onClick={() => openEntry(entry)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '14px' }}>{entry.date_key}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                    {entry.weather} {entry.emotion}
                    {entry.answers?.length > 0 && <span style={{ marginLeft: '8px', color: '#4facfe' }}>답변 {entry.answers.length}개</span>}
                  </p>
                  {entry.summary && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#888' }}>"{entry.summary}"</p>
                  )}
                </div>
                <span style={{ color: '#ccc', fontSize: '18px' }}>›</span>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  // ============================================================
  // VIEW: USER LIST
  // ============================================================
  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
          <span style={badgeStyle}>관리자 모드</span>
        </span>
        <button className="logout-btn" onClick={onLogout}>로그아웃</button>
      </div>

      <p style={{ fontSize: '13px', color: '#888', margin: '0 0 16px 0' }}>
        총 {users.length}명 가입
      </p>

      {users.map(u => (
        <div key={u.id} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', fontSize: '14px' }}>
                {u.display_name}
                {u.is_manager && <span style={{ marginLeft: '6px', fontSize: '11px', color: '#6c5ce7' }}>[관리자]</span>}
              </p>
              <p style={{ margin: '0 0 2px 0', fontSize: '12px', color: '#888' }}>{u.email}</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#aaa' }}>
                {getPetLevel(u.pet_exp) === 0 ? '🐣' : getPetLevel(u.pet_exp) === 1 ? '🐥' : '🐓'} Lv.{getPetLevel(u.pet_exp)} · 가입일 {new Date(u.created_at).toLocaleDateString()}
              </p>
            </div>
            <button style={btnStyle()} onClick={() => openUserDiary(u)}>
              일기 보기
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ManagerDashboard;
