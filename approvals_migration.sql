-- ──────────────────────────────────────────────────────────────────────────────
-- B2B Procurement Approval Engine Migration
-- Paste into Supabase → SQL Editor → New Query → Run
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Approval Rules Table (Defined by Buyer Admins per Organization)
CREATE TABLE IF NOT EXISTS public.approval_rules (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_name       TEXT        NOT NULL DEFAULT 'Default Spending Limit Rule',
  min_amount      NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
  approver_role   TEXT        NOT NULL DEFAULT 'procurement_manager',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT positive_min_amount CHECK (min_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_approval_rules_org ON public.approval_rules(organization_id);

-- 2. Order Approvals Table (Audit Trail for Pending/Approved/Rejected Orders)
CREATE TABLE IF NOT EXISTS public.order_approvals (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  organization_id  UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_id          UUID        REFERENCES public.approval_rules(id) ON DELETE SET NULL,
  status           TEXT        NOT NULL DEFAULT 'pending',
  requested_by     UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  approved_by      UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_approval_status CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_order_approvals_order ON public.order_approvals(order_id);
CREATE INDEX IF NOT EXISTS idx_order_approvals_org ON public.order_approvals(organization_id);
CREATE INDEX IF NOT EXISTS idx_order_approvals_status ON public.order_approvals(status);

-- 3. Row Level Security
ALTER TABLE public.approval_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can read approval rules" ON public.approval_rules;
CREATE POLICY "Org members can read approval rules"
  ON public.approval_rules FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Org members can read order approvals" ON public.order_approvals;
CREATE POLICY "Org members can read order approvals"
  ON public.order_approvals FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Org members can update order approvals" ON public.order_approvals;
CREATE POLICY "Org members can update order approvals"
  ON public.order_approvals FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));

-- 4. Supabase Realtime Publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.order_approvals;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Table public.order_approvals already in publication';
END $$;
