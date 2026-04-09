-- ForMe Secret Diary — Supabase Schema (v2)
-- ⚠️  이전 스키마를 실행한 적 있다면 아래 DROP 블록부터 실행하세요.
-- 처음 실행이라면 DROP 블록은 무시해도 됩니다 (오류 없이 넘어감).

-- ============================================================
-- CLEANUP (재실행 시)
-- ============================================================
DROP TABLE IF EXISTS public.diary_entries CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.get_or_create_user(TEXT);

-- ============================================================
-- USERS — Supabase Auth 없이 독립 테이블
-- ============================================================
CREATE TABLE public.users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username     TEXT NOT NULL UNIQUE,   -- 로그인 아이디 (소문자 저장)
  display_name TEXT NOT NULL,          -- 화면 표시 이름
  is_manager   BOOLEAN NOT NULL DEFAULT false,
  pet_exp      INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DIARY ENTRIES — 하루 1행, answers 배열에 Q&A 누적
-- ============================================================
CREATE TABLE public.diary_entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date_key   TEXT NOT NULL,               -- "4/8/2026" 형식
  weather    TEXT,
  emotion    TEXT,
  answers    JSONB NOT NULL DEFAULT '[]', -- [{question, answer, created_at}]
  image_url  TEXT,
  timeline   JSONB,
  summary    TEXT,
  tags       TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date_key)
);

CREATE INDEX idx_diary_user_date ON public.diary_entries(user_id, date_key);

-- ============================================================
-- QUESTIONS
-- ============================================================
CREATE TABLE public.questions (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'emotion','highlight','values','relation','preference','productivity','recovery','random'
  )),
  text     TEXT NOT NULL
);

-- ============================================================
-- RLS — anon key로 접근 허용 (앱 레벨에서 user_id로 접근 제어)
-- ============================================================
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_users"  ON public.users         USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_diary"  ON public.diary_entries USING (true) WITH CHECK (true);
CREATE POLICY "questions_read"   ON public.questions     FOR SELECT USING (true);

-- ============================================================
-- RPC — 아이디로 유저 가져오기 (없으면 자동 생성)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_user(p_username TEXT)
RETURNS public.users LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_clean TEXT;
BEGIN
  v_clean := lower(trim(p_username));

  INSERT INTO public.users (username, display_name)
  VALUES (v_clean, trim(p_username))
  ON CONFLICT (username) DO NOTHING;

  SELECT * INTO v_user FROM public.users WHERE username = v_clean;
  RETURN v_user;
END;
$$;

-- ============================================================
-- 관리자 계정 (username은 .env의 VITE_MANAGER_USERNAME과 동일하게)
-- ============================================================
INSERT INTO public.users (username, display_name, is_manager)
VALUES ('admin', '관리자', true)
ON CONFLICT (username) DO UPDATE SET is_manager = true;
