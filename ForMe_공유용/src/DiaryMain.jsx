import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './DiaryMain.css';
import {
  getDiaryEntry,
  upsertDiaryEntry,
  appendAnswer,
  getAllDiaryEntries,
  updatePetExp,
  getRandomQuestionByRandomCategory
} from './lib/db';

const initialTimeLine = {
  period1: { menu: '', place: '' },
  period2: { menu: '', place: '' },
  period3: { menu: '', place: '' }
};

const initialDiaryData = {
  weather: '',
  emotion: '',
  question1: '', answer1: '',
  question2: '', answer2: '',
  image: null,
  timeLine: initialTimeLine,
  summary: '',
  tags: []
};

// Map a DB row back to the shape DiaryMain uses
function dbRowToDiaryData(row) {
  return {
    weather:   row.weather || '',
    emotion:   row.emotion || '',
    question1: '', answer1: '',   // 새 세션의 답변 입력용 (빈 값으로 시작)
    question2: '', answer2: '',
    image:     row.image_url || null,
    timeLine:  (row.timeline?.period1) ? row.timeline : initialTimeLine,
    summary:   row.summary || '',
    tags:      row.tags || []
  };
}

const DiaryMain = ({ user, userProfile, onLogout }) => {
  const [date, setDate] = useState(new Date());
  const [step, setStep] = useState(0);

  const [petExp, setPetExp] = useState(userProfile.pet_exp ?? 0);
  const [diaryData, setDiaryData] = useState(initialDiaryData);
  const [currentEntry, setCurrentEntry] = useState(null); // DB row for selected date
  const [allEntries, setAllEntries] = useState([]);        // for report view
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isFirstSave, setIsFirstSave] = useState(false);

  const dateKey = date.toLocaleDateString();
  const userName = userProfile.display_name;

  // Load entry + new question whenever the selected date changes
  const loadDateData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [entry, q1, q2] = await Promise.all([
        getDiaryEntry(user.id, dateKey),
        getRandomQuestionByRandomCategory(),
        getRandomQuestionByRandomCategory()
      ]);

      setCurrentEntry(entry);

      if (entry) {
        const loaded = dbRowToDiaryData(entry);
        setDiaryData({ ...loaded, question1: q1?.text || '', question2: q2?.text || '' });
      } else {
        setDiaryData({ ...initialDiaryData, question1: q1?.text || '', question2: q2?.text || '' });
      }
    } catch (err) {
      console.error('Failed to load diary entry:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dateKey, user.id]);

  useEffect(() => {
    loadDateData();
  }, [loadDateData]);

  const handleSaveAll = async () => {
    setIsLoading(true);
    try {
      const isFirstEntry = !currentEntry;

      // 1. Upsert the main fields (weather, emotion, timeline, summary, tags)
      const saved = await upsertDiaryEntry(user.id, dateKey, diaryData);

      // 2. Q&A 답변 저장 (작성한 것만)
      if (diaryData.answer1.trim()) {
        await appendAnswer(user.id, dateKey, diaryData.question1, diaryData.answer1);
      }
      if (diaryData.answer2.trim()) {
        await appendAnswer(user.id, dateKey, diaryData.question2, diaryData.answer2);
      }

      // 3. Award exp for the very first entry on this date
      if (isFirstEntry) {
        const newExp = petExp + 20;
        setPetExp(newExp);
        await updatePetExp(user.id, newExp);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      }

      setIsFirstSave(isFirstEntry);
      setCurrentEntry(saved);
      setShowSuccessModal(true);
    } catch (err) {
      alert('저장 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowReport = async () => {
    setIsLoading(true);
    try {
      const entries = await getAllDiaryEntries(user.id);
      setAllEntries(entries);
      setStep(100);
    } catch (err) {
      alert('리포트를 불러오는 중 오류: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReRollQuestion = async (slot) => {
    const q = await getRandomQuestionByRandomCategory();
    if (!q) return;
    if (slot === 1) setDiaryData(prev => ({ ...prev, question1: q.text }));
    else            setDiaryData(prev => ({ ...prev, question2: q.text }));
  };

  const getPetInfo = () => {
    const level = Math.floor(petExp / 100);
    const currentExp = petExp % 100;
    let stage = '🐣';
    if (level === 1) stage = '🐥';
    if (level >= 2) stage = '🐓';
    return { level, currentExp, stage };
  };

  const getReportData = () => {
    const totalCount = allEntries.length;
    const emotions = allEntries.map(d => d.emotion).filter(Boolean);
    const mostCommonEmotion = emotions.sort((a, b) =>
      emotions.filter(v => v === a).length - emotions.filter(v => v === b).length
    ).pop() || '아직 없음';
    return { totalCount, mostCommonEmotion };
  };

  const handleTimelineChange = (period, field, value) => {
    setDiaryData({
      ...diaryData,
      timeLine: {
        ...diaryData.timeLine,
        [period]: { ...diaryData.timeLine[period], [field]: value }
      }
    });
  };

  const { level, currentExp, stage } = getPetInfo();
  const weatherIcons = ['☀️', '☁️', '☔', '❄️', '⚡'];
  const emotionIcons = ['😊', '🥰', '😭', '😡', '😴', '🤔'];

  return (
    <div className="main-container">
      {step === 0 ? (
        <>
          <div className="header">
            <div className="header-side-box"></div>
            <h2>{userName}님의 일기장</h2>
            <div className="header-side-box">
              <button className="logout-btn" onClick={onLogout}>로그아웃</button>
            </div>
          </div>

          <div className="pet-container">
            <div className="pet-visual">{stage}</div>
            <div className="pet-info">
              <span>Lv.{level}</span>
              <div className="exp-bar-container">
                <div className="exp-bar-fill" style={{ width: `${currentExp}%` }}></div>
              </div>
              <span>{currentExp}/100</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <button
              className="report-btn"
              onClick={handleShowReport}
              style={{ padding: '10px 20px', borderRadius: '20px', border: 'none', backgroundColor: '#6c5ce7', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
            >
              일기 분석 리포트 보기
            </button>
          </div>

          <div className="calendar-box">
            <Calendar
              onChange={setDate}
              value={date}
              formatDay={(locale, date) => date.toLocaleString('en', { day: 'numeric' })}
            />
          </div>

          <div className="info-box">
            <h3>{dateKey}</h3>
            {isLoading ? (
              <p style={{ textAlign: 'center', color: '#888' }}>불러오는 중...</p>
            ) : currentEntry ? (
              <div className="saved-preview">
                <div className="emoji-display">
                  <span>{currentEntry.weather}</span> <span>{currentEntry.emotion}</span>
                </div>
                <p className="preview">"{currentEntry.summary || '기록된 요약이 없습니다.'}"</p>
                {currentEntry.answers?.length > 0 && (
                  <p style={{ fontSize: '12px', color: '#888', margin: '4px 0' }}>
                    오늘의 답변: {currentEntry.answers.length}개
                  </p>
                )}
                <button className="write-button" onClick={() => setStep(1)}>일기 수정 / 답변 추가</button>
              </div>
            ) : (
              <button className="write-button" onClick={() => setStep(1)}>오늘의 일기 쓰기</button>
            )}
          </div>
        </>
      ) : step === 100 ? (
        <div className="step-container report-view">
          <div className="step-header">
            <h3>일기 분석 리포트</h3>
            <button className="close-btn" onClick={() => setStep(0)}>X</button>
          </div>
          <div className="step-content" style={{ textAlign: 'center' }}>
            <div className="report-card" style={{ background: '#fff', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <h4>"{userName}"님의 기록 요약</h4>
              <hr />
              <p>📅 총 작성한 일기: <strong>{getReportData().totalCount}개</strong></p>
              <p>최근 자주 느낀 감정: <span style={{ fontSize: '24px' }}>{getReportData().mostCommonEmotion}</span></p>
            </div>
            <button className="finish-btn" style={{ marginTop: '20px' }} onClick={() => setStep(0)}>메인으로 돌아가기</button>
          </div>
        </div>
      ) : (
        <div className="step-container">
          <div className="step-header">
            <span>{step} / 7 단계</span>
            <button className="close-btn" onClick={() => setStep(0)}>X</button>
          </div>

          {/* 1단계 — 날씨 & 감정 */}
          {step === 1 && (
            <div className="step-content">
              <h3>오늘의 날씨 & 감정</h3>
              <div className="emoji-group">
                {weatherIcons.map(icon => (
                  <button key={icon} className={`emoji-btn ${diaryData.weather === icon ? 'active' : ''}`}
                    onClick={() => setDiaryData({ ...diaryData, weather: icon })}>{icon}</button>
                ))}
              </div>
              <div className="emoji-group">
                {emotionIcons.map(icon => (
                  <button key={icon} className={`emoji-btn ${diaryData.emotion === icon ? 'active' : ''}`}
                    onClick={() => setDiaryData({ ...diaryData, emotion: icon })}>{icon}</button>
                ))}
              </div>
              <div className="nav-btns">
                <button onClick={() => setStep(2)} disabled={!diaryData.weather || !diaryData.emotion}>다음</button>
              </div>
            </div>
          )}

          {/* 2단계 — 오늘의 질문 1 */}
          {step === 2 && (
            <div className="step-content">
              <h3>오늘의 질문</h3>

              {/* 이전 답변 기록 */}
              {currentEntry?.answers?.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <p style={{ fontSize: '12px', color: '#888', margin: '0 0 6px 0' }}>이전 답변</p>
                  {currentEntry.answers.map((a, i) => (
                    <div key={i} style={{ background: '#f0f4ff', padding: '10px', borderRadius: '8px', marginBottom: '6px', fontSize: '13px' }}>
                      <p style={{ margin: '0 0 4px 0', color: '#6c5ce7', fontWeight: 'bold' }}>Q. {a.question}</p>
                      <p style={{ margin: 0, color: '#555' }}>{a.answer}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="question-display" style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', marginBottom: '6px', borderLeft: '5px solid #6c5ce7' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Q. {diaryData.question1}</p>
              </div>
              <button type="button" onClick={() => handleReRollQuestion(1)}
                style={{ fontSize: '12px', color: '#4facfe', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px 0' }}>
                다른 질문 ↺
              </button>
              <textarea
                placeholder="답변을 입력해 주세요!"
                value={diaryData.answer1}
                onChange={(e) => setDiaryData({ ...diaryData, answer1: e.target.value })}
              />
              <div className="nav-btns">
                <button onClick={() => setStep(1)}>이전</button>
                <button onClick={() => setStep(3)}>다음</button>
              </div>
            </div>
          )}

          {/* 3단계 — 오늘의 질문 2 */}
          {step === 3 && (
            <div className="step-content">
              <h3>오늘의 질문</h3>
              <div className="question-display" style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', marginBottom: '6px', borderLeft: '5px solid #6c5ce7' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Q. {diaryData.question2}</p>
              </div>
              <button type="button" onClick={() => handleReRollQuestion(2)}
                style={{ fontSize: '12px', color: '#4facfe', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px 0' }}>
                다른 질문 ↺
              </button>
              <textarea
                placeholder="답변을 입력해 주세요!"
                value={diaryData.answer2}
                onChange={(e) => setDiaryData({ ...diaryData, answer2: e.target.value })}
              />
              <div className="nav-btns">
                <button onClick={() => setStep(2)}>이전</button>
                <button onClick={() => setStep(4)}>다음</button>
              </div>
            </div>
          )}

          {/* 4단계 — 오늘의 사진 */}
          {step === 4 && (
            <div className="step-content">
              <h3>오늘의 사진</h3>
              <input type="file" accept="image/*" />
              <div className="nav-btns">
                <button onClick={() => setStep(3)}>이전</button>
                <button onClick={() => setStep(5)}>다음</button>
              </div>
            </div>
          )}

          {/* 5단계 — 시간 흐름 */}
          {step === 5 && (
            <div className="step-content">
              <h3>시간 흐름 기록</h3>
              <div className="timeline-container" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {[
                  { id: 'period1', label: '기상 후 6시간' },
                  { id: 'period2', label: '기상 후 12시간' },
                  { id: 'period3', label: '기상 후 18시간' }
                ].map((item) => (
                  <div key={item.id} style={{ backgroundColor: '#e0e0e0', padding: '15px', borderRadius: '10px', textAlign: 'left' }}>
                    <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '15px', color: '#333' }}>{item.label}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="먹은 메뉴"
                        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
                        value={diaryData.timeLine[item.id].menu}
                        onChange={(e) => handleTimelineChange(item.id, 'menu', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="머문 장소"
                        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
                        value={diaryData.timeLine[item.id].place}
                        onChange={(e) => handleTimelineChange(item.id, 'place', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="nav-btns" style={{ marginTop: '20px' }}>
                <button onClick={() => setStep(4)}>이전</button>
                <button onClick={() => setStep(6)}>다음</button>
              </div>
            </div>
          )}

          {/* 6단계 — 한 줄 요약 */}
          {step === 6 && (
            <div className="step-content">
              <h3>오늘의 한 줄 요약</h3>
              <div className="summary-box">
                <span>오늘은</span>
                <input
                  type="text"
                  placeholder="어떤 하루였나요?"
                  value={diaryData.summary}
                  onChange={(e) => setDiaryData({ ...diaryData, summary: e.target.value })}
                />
                <span>하루였다.</span>
              </div>
              <div className="nav-btns">
                <button onClick={() => setStep(5)}>이전</button>
                <button onClick={() => setStep(7)}>다음</button>
              </div>
            </div>
          )}

          {/* 7단계 — 키워드 태그 */}
          {step === 7 && (
            <div className="step-content">
              <h3>키워드 태그</h3>
              <input type="text" value={diaryData.tags.join(' ')} placeholder="#공부 #운동"
                onChange={(e) => setDiaryData({ ...diaryData, tags: e.target.value.split(' ') })} />
              <div className="nav-btns">
                <button onClick={() => setStep(6)}>이전</button>
                <button className="finish-btn" onClick={handleSaveAll} disabled={isLoading}>
                  {isLoading ? '저장 중...' : '저장 및 완성'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 완료 모달 */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content bounce-in">
            <div className="modal-pet-visual">{stage}</div>
            <h2>{isFirstSave ? '기록 성공!' : '수정 완료!'}</h2>
            <p className="modal-msg">
              {userName}님의 소중한 오늘이<br />
              다이어리에 안전하게 담겼어요.
            </p>
            {isFirstSave && (
              <div className="modal-exp-badge">+20 EXP ✨</div>
            )}
            <button
              className="modal-confirm-btn"
              onClick={() => { setShowSuccessModal(false); setStep(0); }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiaryMain;
