-- ──────────────────────────────────────────────────────────────────────────────
-- BuySell Global B2B Infrastructure Migration
-- Run in Supabase → SQL Editor → New Query → Run
--
-- This migration adds:
--   1. KYB documents table (for Smile ID verification artifacts)
--   2. Pre-shipment inspections table (SGS / Bureau Veritas)
--   3. Live FX rate cache table (updated by cron every 4 hours)
--   4. Extended columns on organizations (language, region, reliability score)
--   5. Indexes for quote expiry enforcement
-- ──────────────────────────────────────────────────────────────────────────────

-- ─── 1. KYB Documents Table ──────────────────────────────────────────────────
-- Stores uploaded business verification documents per organization.
-- Files are stored in Supabase Storage bucket: kyb-documents/
-- Linked to Smile ID job IDs for automatic verification status.

CREATE TABLE IF NOT EXISTS public.kyb_documents (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_type     TEXT        NOT NULL,
    -- Allowed values: 'cac_certificate', 'rccm_certificate', 'tax_clearance',
    --                 'factory_photo', 'director_id', 'export_license', 'iso_certificate'
  file_url          TEXT        NOT NULL,
  verified          BOOLEAN     DEFAULT false,
  verified_by       UUID        REFERENCES public.users(id),
  verified_at       TIMESTAMPTZ,
  smile_id_job_id   TEXT,       -- Smile ID async job reference
  rejection_reason  TEXT,       -- Set by admin if document is rejected
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kyb_docs_org      ON public.kyb_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_kyb_docs_verified ON public.kyb_documents(verified);
CREATE INDEX IF NOT EXISTS idx_kyb_docs_type     ON public.kyb_documents(document_type);

ALTER TABLE public.kyb_documents ENABLE ROW LEVEL SECURITY;

-- Suppliers can view their own documents
DROP POLICY IF EXISTS "Suppliers can view own KYB docs" ON public.kyb_documents;
CREATE POLICY "Suppliers can view own KYB docs"
  ON public.kyb_documents FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Suppliers can upload their own documents
DROP POLICY IF EXISTS "Suppliers can upload KYB docs" ON public.kyb_documents;
CREATE POLICY "Suppliers can upload KYB docs"
  ON public.kyb_documents FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- ─── 2. Pre-Shipment Inspections Table ───────────────────────────────────────
-- Tracks inspection requests (SGS, Bureau Veritas) per order.
-- Currently manual: admin receives email → contacts inspector → uploads certificate.
-- Future: Webhook integration with SGS API.

CREATE TABLE IF NOT EXISTS public.inspections (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  requested_by      UUID        REFERENCES public.users(id),
  inspection_agency TEXT        NOT NULL DEFAULT 'SGS',
    -- Allowed values: 'SGS', 'Bureau Veritas', 'Intertek', 'TÜV', 'QIMA'
  status            TEXT        NOT NULL DEFAULT 'requested',
    -- Flow: requested → scheduled → in_progress → completed | failed
  fee_usd           NUMERIC(10, 2) DEFAULT 350.00,
  warehouse_address TEXT,       -- Physical location for inspector
  inspection_date   TIMESTAMPTZ,
  inspector_name    TEXT,
  certificate_url   TEXT,       -- Supabase Storage URL for the certificate PDF
  report_data       JSONB       DEFAULT '{}',
  admin_notes       TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspections_order  ON public.inspections(order_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON public.inspections(status);

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- Participants of the related order can view inspections
DROP POLICY IF EXISTS "Order participants can view inspections" ON public.inspections;
CREATE POLICY "Order participants can view inspections"
  ON public.inspections FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE buyer_organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
         OR supplier_organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

-- Buyers can request inspections
DROP POLICY IF EXISTS "Buyers can request inspections" ON public.inspections;
CREATE POLICY "Buyers can request inspections"
  ON public.inspections FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ─── 3. Live FX Rate Cache Table ─────────────────────────────────────────────
-- Updated every 4 hours by the /api/cron/fx-rates cron job.
-- All platform instances read from this table for consistent rates.

CREATE TABLE IF NOT EXISTS public.fx_rates (
  currency_pair TEXT        PRIMARY KEY,  -- Format: 'USD_NGN', 'EUR_USD', 'CNY_USD'
  rate          NUMERIC(15, 8) NOT NULL,
  source        TEXT        DEFAULT 'open_exchange_rates',
  fetched_at    TIMESTAMPTZ DEFAULT now()
);

-- Seed with approximate fallback rates (will be overwritten by first cron run)
INSERT INTO public.fx_rates (currency_pair, rate, source) VALUES
  ('USD_NGN', 1630.00,  'initial_seed'),
  ('USD_XOF', 613.00,   'initial_seed'),
  ('USD_KES', 129.00,   'initial_seed'),
  ('USD_GHS', 15.30,    'initial_seed'),
  ('USD_ZAR', 18.20,    'initial_seed'),
  ('USD_XAF', 613.00,   'initial_seed'),
  ('EUR_USD', 1.09,     'initial_seed'),
  ('GBP_USD', 1.27,     'initial_seed'),
  ('CNY_USD', 0.13800,  'initial_seed'),
  ('INR_USD', 0.01200,  'initial_seed'),
  ('SGD_USD', 0.74000,  'initial_seed'),
  ('CAD_USD', 0.73000,  'initial_seed')
ON CONFLICT (currency_pair) DO NOTHING;

-- Allow all authenticated users to read FX rates (needed for buyer-facing conversion display)
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read FX rates" ON public.fx_rates;
CREATE POLICY "Anyone can read FX rates"
  ON public.fx_rates FOR SELECT
  USING (true);

-- ─── 4. Extended Organization Columns ────────────────────────────────────────

-- Language preference (for UI auto-detection)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
    -- Allowed: 'en', 'fr', 'pt', 'zh', 'ar', 'pidgin'

-- Global buyer region classification
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS buyer_region TEXT;
    -- Allowed: 'africa', 'europe', 'asia', 'americas', 'middle_east'

-- Default incoterms preference per organization
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS default_incoterms TEXT DEFAULT 'FOB';
    -- Allowed: 'FOB', 'CIF', 'EXW', 'DDP'

-- Order reliability tracking (used to compute real "Verified Supplier" score)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS completed_orders INT DEFAULT 0;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS cancelled_orders INT DEFAULT 0;

-- Computed reliability score: (completed / total) * 100
-- Stored as GENERATED ALWAYS AS for automatic recalculation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='organizations' AND column_name='reliability_score'
  ) THEN
    ALTER TABLE public.organizations
      ADD COLUMN reliability_score NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE
          WHEN (completed_orders + cancelled_orders) = 0 THEN NULL
          ELSE ROUND(
            (completed_orders::NUMERIC / (completed_orders + cancelled_orders)) * 100,
            2
          )
        END
      ) STORED;
  END IF;
END $$;

-- ─── 5. Performance Indexes ───────────────────────────────────────────────────

-- Index for cron job to find and expire stale published RFQs
CREATE INDEX IF NOT EXISTS idx_rfqs_expiry
  ON public.rfqs(expiry_date)
  WHERE status = 'published';

-- Index for supplier quote expiry enforcement
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_created
  ON public.supplier_quotes(created_at)
  WHERE status = 'submitted';

-- Index on organizations for language-based queries (e.g., show French suppliers)
CREATE INDEX IF NOT EXISTS idx_orgs_language
  ON public.organizations(preferred_language);

-- Index on organizations for buyer region filtering
CREATE INDEX IF NOT EXISTS idx_orgs_region
  ON public.organizations(buyer_region);

-- ─── 6. Enable Realtime for new tables ───────────────────────────────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.inspections;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Table public.inspections already in publication';
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.fx_rates;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Table public.fx_rates already in publication';
END $$;
