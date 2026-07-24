-- ──────────────────────────────────────────────────────────────────────────────
-- B2B Merchant Wallet & Payout Requests Schema Migration
-- Paste into Supabase → SQL Editor → New Query → Run
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Payout Settings Table (Merchant Bank / Wire Accounts)
CREATE TABLE IF NOT EXISTS public.payout_settings (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID        UNIQUE NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bank_name                TEXT        NOT NULL,
  account_name             TEXT        NOT NULL,
  account_number           TEXT        NOT NULL,
  routing_code             TEXT,
  swift_code               TEXT,
  currency                 TEXT        NOT NULL DEFAULT 'USD',
  payout_method            TEXT        NOT NULL DEFAULT 'bank_transfer',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Separate ADD COLUMN statements to safely extend existing table
ALTER TABLE public.payout_settings ADD COLUMN IF NOT EXISTS bank_name TEXT NOT NULL DEFAULT 'Commercial Bank';
ALTER TABLE public.payout_settings ADD COLUMN IF NOT EXISTS account_name TEXT NOT NULL DEFAULT 'Business Account';
ALTER TABLE public.payout_settings ADD COLUMN IF NOT EXISTS account_number TEXT NOT NULL DEFAULT '0000000000';
ALTER TABLE public.payout_settings ADD COLUMN IF NOT EXISTS routing_code TEXT;
ALTER TABLE public.payout_settings ADD COLUMN IF NOT EXISTS swift_code TEXT;
ALTER TABLE public.payout_settings ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE public.payout_settings ADD COLUMN IF NOT EXISTS payout_method TEXT NOT NULL DEFAULT 'bank_transfer';
ALTER TABLE public.payout_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_payout_settings_org ON public.payout_settings(organization_id);

-- 2. Payout Requests Table (Withdrawal Ledger)
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id                  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount                   NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  fee                      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  net_amount               NUMERIC(12, 2) NOT NULL,
  currency                 TEXT        NOT NULL DEFAULT 'USD',
  payout_method            TEXT        NOT NULL DEFAULT 'bank_transfer',
  bank_details             JSONB       NOT NULL DEFAULT '{}'::jsonb,
  status                   TEXT        NOT NULL DEFAULT 'pending',
  processed_at             TIMESTAMPTZ,
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Separate ADD COLUMN statements
ALTER TABLE public.payout_requests ADD COLUMN IF NOT EXISTS fee NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.payout_requests ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.payout_requests ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE public.payout_requests ADD COLUMN IF NOT EXISTS payout_method TEXT NOT NULL DEFAULT 'bank_transfer';
ALTER TABLE public.payout_requests ADD COLUMN IF NOT EXISTS bank_details JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.payout_requests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.payout_requests ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE public.payout_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.payout_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_payout_requests_org ON public.payout_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_created ON public.payout_requests(created_at DESC);

-- 3. Row Level Security
ALTER TABLE public.payout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view payout settings" ON public.payout_settings;
CREATE POLICY "Org members can view payout settings"
  ON public.payout_settings FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Org members can manage payout settings" ON public.payout_settings;
CREATE POLICY "Org members can manage payout settings"
  ON public.payout_settings FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Org members can view payout requests" ON public.payout_requests;
CREATE POLICY "Org members can view payout requests"
  ON public.payout_requests FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR user_id = auth.uid()
    OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Org members can insert payout requests" ON public.payout_requests;
CREATE POLICY "Org members can insert payout requests"
  ON public.payout_requests FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 4. Enable Supabase Realtime for Payout Requests
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.payout_requests;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Table public.payout_requests already in publication';
END $$;
