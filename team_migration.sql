-- ──────────────────────────────────────────────────────────────────────────────
-- B2B Team Invitations & Role Permissions Schema Migration
-- Paste into Supabase → SQL Editor → New Query → Run
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Team Invitations Table
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL,
  role            TEXT        NOT NULL DEFAULT 'procurement_manager',
  token           TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  status          TEXT        NOT NULL DEFAULT 'pending',
  invited_by      UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  CONSTRAINT unique_org_email_invite UNIQUE (organization_id, email)
);

-- Separate ADD COLUMN statements to safely handle existing tables
ALTER TABLE public.team_invitations ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'procurement_manager';
ALTER TABLE public.team_invitations ADD COLUMN IF NOT EXISTS token TEXT NOT NULL DEFAULT gen_random_uuid()::text;
ALTER TABLE public.team_invitations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.team_invitations ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.team_invitations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_invitations_org ON public.team_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON public.team_invitations(token);

-- 2. Row Level Security
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view team invitations" ON public.team_invitations;
CREATE POLICY "Org members can view team invitations"
  ON public.team_invitations FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Org members can manage team invitations" ON public.team_invitations;
CREATE POLICY "Org members can manage team invitations"
  ON public.team_invitations FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  );

-- 3. Enable Supabase Realtime for Team Invitations
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.team_invitations;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Table public.team_invitations already in publication';
END $$;
