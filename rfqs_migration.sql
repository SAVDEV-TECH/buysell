-- ──────────────────────────────────────────────────────────────────────────────
-- B2B RFQs & Supplier Quotes Schema Migration
-- Paste into Supabase → SQL Editor → New Query → Run
-- ──────────────────────────────────────────────────────────────────────────────

-- 0. Ensure realtime publication exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 1. RFQs Table — create with minimal columns, then add the rest
CREATE TABLE IF NOT EXISTS public.rfqs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS buyer_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS buyer_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL;
ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 100;
ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS unit_of_measure TEXT NOT NULL DEFAULT 'pcs';
ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS target_price NUMERIC(12, 2);
ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS destination_country TEXT NOT NULL DEFAULT 'Nigeria';
ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS incoterms TEXT DEFAULT 'FOB';
ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS requirements_spec JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ DEFAULT (now() + interval '30 days');
ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_rfqs_buyer_org ON public.rfqs(buyer_organization_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON public.rfqs(status);
CREATE INDEX IF NOT EXISTS idx_rfqs_created ON public.rfqs(created_at DESC);

-- 2. Supplier Quotes Table
CREATE TABLE IF NOT EXISTS public.supplier_quotes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id      UUID        NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_quotes ADD COLUMN IF NOT EXISTS supplier_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.supplier_quotes ADD COLUMN IF NOT EXISTS supplier_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.supplier_quotes ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.supplier_quotes ADD COLUMN IF NOT EXISTS total_quantity INT NOT NULL DEFAULT 100;
ALTER TABLE public.supplier_quotes ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.supplier_quotes ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE public.supplier_quotes ADD COLUMN IF NOT EXISTS lead_time_days INT NOT NULL DEFAULT 14;
ALTER TABLE public.supplier_quotes ADD COLUMN IF NOT EXISTS incoterms TEXT NOT NULL DEFAULT 'FOB';
ALTER TABLE public.supplier_quotes ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.supplier_quotes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'submitted';
ALTER TABLE public.supplier_quotes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_supplier_quotes_rfq ON public.supplier_quotes(rfq_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_supplier ON public.supplier_quotes(supplier_organization_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_status ON public.supplier_quotes(status);

-- 3. Row Level Security
ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published RFQs" ON public.rfqs;
CREATE POLICY "Anyone can view published RFQs"
  ON public.rfqs FOR SELECT
  USING (status = 'published' OR buyer_user_id = auth.uid() OR buyer_organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Authenticated users can create RFQs" ON public.rfqs;
CREATE POLICY "Authenticated users can create RFQs"
  ON public.rfqs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Buyers can update own RFQs" ON public.rfqs;
CREATE POLICY "Buyers can update own RFQs"
  ON public.rfqs FOR UPDATE
  USING (buyer_user_id = auth.uid() OR buyer_organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Participants can view quotes" ON public.supplier_quotes;
CREATE POLICY "Participants can view quotes"
  ON public.supplier_quotes FOR SELECT
  USING (
    supplier_user_id = auth.uid()
    OR supplier_organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR rfq_id IN (
      SELECT id FROM public.rfqs WHERE buyer_user_id = auth.uid() OR buyer_organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Suppliers can submit quotes" ON public.supplier_quotes;
CREATE POLICY "Suppliers can submit quotes"
  ON public.supplier_quotes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Suppliers or buyers can update quote status" ON public.supplier_quotes;
CREATE POLICY "Suppliers or buyers can update quote status"
  ON public.supplier_quotes FOR UPDATE
  USING (
    supplier_user_id = auth.uid()
    OR supplier_organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR rfq_id IN (
      SELECT id FROM public.rfqs WHERE buyer_user_id = auth.uid() OR buyer_organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

-- 4. Enable Supabase Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.rfqs;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Table public.rfqs already in publication';
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.supplier_quotes;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Table public.supplier_quotes already in publication';
END $$;
