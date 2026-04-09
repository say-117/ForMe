// DiaryQuestion.jsx
import React, { useState, useEffect } from 'react';
import { questionDB } from './questions'; // 질문 리스트가 담긴 파일

const DiaryQuestion = () => {
  const [todayQuestion, setTodayQuestion] = useState("");

  useEffect(() => {
    const allQuestions = Object.values(questionDB).flat();
    const savedData = JSON.parse(localStorage.getItem("today_question"));
    const today = new Date().toDateString();

    if (savedData && savedData.date === today) {
      setTodayQuestion(savedData.question);
    } else {
      const randomIndex = Math.floor(Math.random() * allQuestions.length);
      const newQuestion = allQuestions[randomIndex];
      localStorage.setItem("today_question", JSON.stringify({ date: today, question: newQuestion }));
      setTodayQuestion(newQuestion);
    }
  }, []);

  return (
    <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>💡 오늘의 질문</h4>
      <p style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>{todayQuestion}</p>
    </div>
  );
};

export default DiaryQuestion;