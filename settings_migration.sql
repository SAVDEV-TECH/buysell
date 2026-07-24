-- ──────────────────────────────────────────────────────────────────────────────
-- Users & Organizations Settings Update RLS Migration
-- Paste into Supabase → SQL Editor → New Query → Run
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 1. Users table RLS policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own user profile" ON public.users;
CREATE POLICY "Users can update own user profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- 2. Organizations table RLS policies
DROP POLICY IF EXISTS "Users can read organizations" ON public.organizations;
CREATE POLICY "Users can read organizations"
  ON public.organizations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Org members can update own organization" ON public.organizations;
CREATE POLICY "Org members can update own organization"
  ON public.organizations FOR UPDATE
  USING (
    id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  );
