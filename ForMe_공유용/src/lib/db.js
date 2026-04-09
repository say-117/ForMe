import { supabase } from './supabase'

const CATEGORIES = ['emotion', 'highlight', 'values', 'relation', 'preference', 'productivity', 'recovery', 'random']

// ============================================================
// AUTH — Supabase Auth 없이 username만으로 처리
// RPC get_or_create_user 가 없으면 자동 생성, 있으면 반환
// 세션은 App.jsx에서 localStorage에 저장
// ============================================================

export async function signInWithUsername(username) {
  const { data, error } = await supabase
    .rpc('get_or_create_user', { p_username: username.trim() })
  if (error) throw error
  return data  // { id, username, display_name, is_manager, pet_exp, created_at }
}

// 관리자 코드 확인 후 관리자 유저 객체 반환
export async function signInAsManager() {
  const managerUsername = import.meta.env.VITE_MANAGER_USERNAME || 'admin'
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', managerUsername.toLowerCase())
    .single()
  if (error) throw new Error('관리자 계정을 찾을 수 없습니다.')
  return data
}

// ============================================================
// USER PROFILE
// ============================================================

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updatePetExp(userId, newExp) {
  const { error } = await supabase
    .from('users')
    .update({ pet_exp: newExp })
    .eq('id', userId)
  if (error) throw error
}

// ============================================================
// DIARY ENTRIES — 하루 1행 upsert
// ============================================================

export async function getDiaryEntry(userId, dateKey) {
  const { data, error } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('date_key', dateKey)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertDiaryEntry(userId, dateKey, fields) {
  const { data, error } = await supabase
    .from('diary_entries')
    .upsert(
      {
        user_id:    userId,
        date_key:   dateKey,
        weather:    fields.weather,
        emotion:    fields.emotion,
        image_url:  fields.image ?? null,
        timeline:   fields.timeLine,
        summary:    fields.summary,
        tags:       fields.tags,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,date_key' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function appendAnswer(userId, dateKey, question, answer) {
  const entry = await getDiaryEntry(userId, dateKey)
  const existing = entry?.answers ?? []
  const newAnswer = { question, answer, created_at: new Date().toISOString() }

  const { data, error } = await supabase
    .from('diary_entries')
    .upsert(
      {
        user_id:    userId,
        date_key:   dateKey,
        answers:    [...existing, newAnswer],
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,date_key' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getAllDiaryEntries(userId) {
  const { data, error } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('user_id', userId)
    .order('date_key', { ascending: false })
  if (error) throw error
  return data
}

// ============================================================
// QUESTIONS
// ============================================================

let _questionsCache = null

async function loadAllQuestions() {
  if (_questionsCache) return _questionsCache
  const { data, error } = await supabase.from('questions').select('*')
  if (error) throw error
  _questionsCache = data
  return data
}

export async function getRandomQuestion(category = null) {
  const all = await loadAllQuestions()
  const pool = category ? all.filter(q => q.category === category) : all
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

export async function getRandomQuestionByRandomCategory() {
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
  return getRandomQuestion(category)
}

// ============================================================
// MANAGER
// ============================================================

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getEntriesForUser(userId) {
  return getAllDiaryEntries(userId)
}

// ============================================================
// WEEKLY INSIGHTS
// ============================================================

// 특정 유저의 특정 주 인사이트 가져오기
export async function getWeeklyInsight(userId, weekStart) {
  const { data, error } = await supabase
    .from('weekly_insights')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle()
  if (error) throw error
  return data
}

// 특정 유저의 모든 주간 인사이트 가져오기
export async function getAllWeeklyInsights(userId) {
  const { data, error } = await supabase
    .from('weekly_insights')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
  if (error) throw error
  return data
}

// 관리자가 주간 인사이트 저장/수정
export async function upsertWeeklyInsight(userId, weekStart, insight, managerId) {
  const { data, error } = await supabase
    .from('weekly_insights')
    .upsert(
      { user_id: userId, week_start: weekStart, insight, created_by: managerId },
      { onConflict: 'user_id,week_start' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}