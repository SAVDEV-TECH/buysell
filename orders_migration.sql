-- ──────────────────────────────────────────────────────────────────────────────
-- B2B Orders & Order Items Schema Migration
-- Paste into Supabase → SQL Editor → New Query → Run
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Orders Table — create with base columns if missing
CREATE TABLE IF NOT EXISTS public.orders (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_organization_id    UUID        REFERENCES public.organizations(id) ON DELETE SET NULL,
  supplier_organization_id UUID        REFERENCES public.organizations(id) ON DELETE SET NULL,
  total_amount             NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency                 TEXT        NOT NULL DEFAULT 'USD',
  status                   TEXT        NOT NULL DEFAULT 'pending',
  payment_status           TEXT        NOT NULL DEFAULT 'pending',
  payment_reference        TEXT,
  payment_method           TEXT        DEFAULT 'bank_transfer',
  shipping_address         JSONB       DEFAULT '{}'::jsonb,
  tracking_number          TEXT,
  courier_name             TEXT,
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Separate ADD COLUMN statements to safely extend existing table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS supplier_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS escrow_status TEXT DEFAULT 'funded';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'bank_transfer';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';

-- Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_orders_buyer_org ON public.orders(buyer_organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_org ON public.orders(supplier_organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);

-- 2. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id   UUID        REFERENCES public.products(id) ON DELETE SET NULL,
  quantity     INT         NOT NULL DEFAULT 1,
  unit_price   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_price  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Separate ADD COLUMN statements
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS total_price NUMERIC(12, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- 3. Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view orders" ON public.orders;
CREATE POLICY "Participants can view orders"
  ON public.orders FOR SELECT
  USING (
    buyer_organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR supplier_organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
CREATE POLICY "Authenticated users can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Participants can update orders" ON public.orders;
CREATE POLICY "Participants can update orders"
  ON public.orders FOR UPDATE
  USING (
    buyer_organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR supplier_organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Participants can view order items" ON public.order_items;
CREATE POLICY "Participants can view order items"
  ON public.order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE buyer_organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
         OR supplier_organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
         OR auth.role() = 'authenticated'
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert order items" ON public.order_items;
CREATE POLICY "Authenticated users can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 4. Enable Supabase Realtime for Orders
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Table public.orders already in publication';
END $$;
