-- ============================================
-- 1. APPROVAL RULES (Multi-tier, multi-condition)
-- ============================================

CREATE TABLE IF NOT EXISTS public.approval_rules (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Human-readable + machine identifier
  rule_name       TEXT        NOT NULL,
  rule_key        TEXT        NOT NULL, -- e.g., 'spending_limit_default'
  
  -- Conditions (all must match for rule to trigger)
  min_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  max_amount      NUMERIC(12, 2), -- NULL = no upper bound
  category_id     UUID        REFERENCES public.product_categories(id) ON DELETE SET NULL,
  
  -- Approval configuration
  approver_role   TEXT        NOT NULL, -- references roles system
  sequence_order  INT         NOT NULL DEFAULT 1, -- 1 = first tier, 2 = second, etc.
  required_count  INT         NOT NULL DEFAULT 1, -- how many people with this role must approve
  
  -- Escalation
  auto_escalate_after_minutes INT, -- NULL = no auto-escalation
  escalate_to_role TEXT, -- role to escalate to if timeout
  
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT positive_min_amount CHECK (min_amount >= 0),
  CONSTRAINT positive_max_amount CHECK (max_amount IS NULL OR max_amount >= min_amount),
  CONSTRAINT positive_sequence CHECK (sequence_order > 0),
  CONSTRAINT positive_required_count CHECK (required_count > 0),
  CONSTRAINT unique_rule_key_per_org UNIQUE (organization_id, rule_key)
);

CREATE INDEX IF NOT EXISTS idx_approval_rules_org_active 
  ON public.approval_rules(organization_id, is_active, sequence_order);

-- ============================================
-- 2. ORDER APPROVALS (Tracks each approval instance)
-- ============================================

CREATE TABLE IF NOT EXISTS public.order_approvals (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  organization_id  UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Snapshot of what triggered this (defensive against order changes)
  rule_id          UUID        REFERENCES public.approval_rules(id) ON DELETE SET NULL,
  triggered_amount NUMERIC(12, 2) NOT NULL DEFAULT 0, -- order total at time of creation
  
  status           TEXT        NOT NULL DEFAULT 'pending',
  
  -- Who and when
  requested_by     UUID        NOT NULL REFERENCES public.users(id),
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  approved_by      UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  
  rejected_by      UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  rejected_at      TIMESTAMPTZ,
  rejection_reason TEXT        CHECK (length(rejection_reason) <= 1000),
  
  -- Expiration
  expires_at       TIMESTAMPTZ,
  
  -- Audit
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_approval_status 
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired', 'escalated'))
);

CREATE INDEX IF NOT EXISTS idx_order_approvals_order_status 
  ON public.order_approvals(order_id, status);
CREATE INDEX IF NOT EXISTS idx_order_approvals_org_pending 
  ON public.order_approvals(organization_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_order_approvals_expires 
  ON public.order_approvals(expires_at) WHERE status = 'pending';

-- ============================================
-- 3. APPROVAL ACTIONS (Audit trail — append-only)
-- ============================================

CREATE TABLE IF NOT EXISTS public.approval_actions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  approval_id     UUID        NOT NULL REFERENCES public.order_approvals(id) ON DELETE CASCADE,
  actor_id        UUID        NOT NULL REFERENCES public.users(id),
  action          TEXT        NOT NULL, -- 'submitted', 'approved', 'rejected', 'escalated', 'cancelled'
  notes           TEXT        CHECK (length(notes) <= 2000),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_actions_approval 
  ON public.approval_actions(approval_id, created_at DESC);

-- ============================================
-- 4. AUTO-UPDATE updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_approval_rules_updated_at ON public.approval_rules;
CREATE TRIGGER trg_approval_rules_updated_at
  BEFORE UPDATE ON public.approval_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_order_approvals_updated_at ON public.order_approvals;
CREATE TRIGGER trg_order_approvals_updated_at
  BEFORE UPDATE ON public.order_approvals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 5. RLS POLICIES
-- ============================================

ALTER TABLE public.approval_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;

-- Helper: is user member of org?
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Approval Rules: Read for org members
DROP POLICY IF EXISTS "Org members read approval rules" ON public.approval_rules;
CREATE POLICY "Org members read approval rules"
  ON public.approval_rules FOR SELECT
  USING (public.is_org_member(organization_id));

-- Approval Rules: Write only for org admins
DROP POLICY IF EXISTS "Org admins manage approval rules" ON public.approval_rules;
CREATE POLICY "Org admins manage approval rules"
  ON public.approval_rules FOR ALL
  USING (
    public.is_org_member(organization_id) 
    AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('org_admin', 'buyer_admin', 'super_admin')
    )
  );

-- Order Approvals: Read for org members
DROP POLICY IF EXISTS "Org members read order approvals" ON public.order_approvals;
CREATE POLICY "Org members read order approvals"
  ON public.order_approvals FOR SELECT
  USING (public.is_org_member(organization_id));

-- Order Approvals: Update only by assigned approvers or admins
DROP POLICY IF EXISTS "Approvers can update order approvals" ON public.order_approvals;
CREATE POLICY "Approvers can update order approvals"
  ON public.order_approvals FOR UPDATE
  USING (
    public.is_org_member(organization_id)
    AND (
      EXISTS (
        SELECT 1 FROM public.approval_rules ar
        WHERE ar.id = order_approvals.rule_id
        AND ar.approver_role = (SELECT role FROM public.users WHERE id = auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('org_admin', 'buyer_admin', 'super_admin')
      )
    )
  );

-- Approval Actions: Append-only by org members
DROP POLICY IF EXISTS "Org members create approval actions" ON public.approval_actions;
CREATE POLICY "Org members create approval actions"
  ON public.approval_actions FOR INSERT
  WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.order_approvals oa
      WHERE oa.id = approval_actions.approval_id
      AND public.is_org_member(oa.organization_id)
    )
  );

-- ============================================
-- 6. REALTIME
-- ============================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.order_approvals;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'order_approvals already in publication';
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_actions;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'approval_actions already in publication';
END $$;
