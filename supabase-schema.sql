-- ============================================================
-- خنساء Editorial Intelligence — Supabase Schema
-- Run this SQL in your Supabase Dashboard → SQL Editor
-- Project: gnavcnhwsvbrwttivxfh
-- ============================================================

-- 1. Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name            TEXT,
  email           TEXT,
  plan            TEXT NOT NULL DEFAULT 'free'      CHECK (plan IN ('free','pro','elite')),
  billing_cycle   TEXT NOT NULL DEFAULT 'monthly'   CHECK (billing_cycle IN ('monthly','yearly')),
  trial_ends_at   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  subscribed_at   TIMESTAMPTZ DEFAULT NOW(),
  rewrites_today  INT  NOT NULL DEFAULT 0,
  rewrites_date   DATE DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role has full access"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');

-- 4. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- 5. Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Optional: payments log table (for Ziina webhooks)
CREATE TABLE IF NOT EXISTS public.payments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id),
  ziina_id        TEXT,
  plan            TEXT,
  billing_cycle   TEXT,
  amount_fils     INT,
  currency        TEXT DEFAULT 'AED',
  status          TEXT DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
