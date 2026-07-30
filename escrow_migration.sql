-- ──────────────────────────────────────────────────────────────────────────────
-- BuySell B2B Escrow Ledger & Milestone Release Migration
-- Paste into Supabase → SQL Editor → New Query → Run
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Escrow Accounts Table (Virtual balances for organizations and traders)
CREATE TABLE IF NOT EXISTS public.escrow_accounts (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID           REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id             UUID           REFERENCES auth.users(id) ON DELETE CASCADE,
  balance             NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  currency            TEXT           NOT NULL DEFAULT 'USD',
  held_balance        NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  available_balance   NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- Separate ADD COLUMN statements for safety
ALTER TABLE public.escrow_accounts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.escrow_accounts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.escrow_accounts ADD COLUMN IF NOT EXISTS balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.escrow_accounts ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE public.escrow_accounts ADD COLUMN IF NOT EXISTS held_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.escrow_accounts ADD COLUMN IF NOT EXISTS available_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.escrow_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_escrow_acc_org ON public.escrow_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_escrow_acc_user ON public.escrow_accounts(user_id);

-- 2. Escrow Transactions Table (Immutable Financial Ledger)
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID           REFERENCES public.orders(id) ON DELETE SET NULL,
  from_account_id  UUID           REFERENCES public.escrow_accounts(id) ON DELETE SET NULL,
  to_account_id    UUID           REFERENCES public.escrow_accounts(id) ON DELETE SET NULL,
  amount           NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  currency         TEXT           NOT NULL DEFAULT 'USD',
  type             TEXT           NOT NULL CHECK (type IN (
    'deposit', 'hold', 'release', 'refund', 'partial_release', 'fee', 'dispute_hold'
  )),
  status           TEXT           NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'completed', 'failed', 'reversed'
  )),
  metadata         JSONB          DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  processed_at     TIMESTAMPTZ
);

ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS from_account_id UUID REFERENCES public.escrow_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS to_account_id UUID REFERENCES public.escrow_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'hold';
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_escrow_tx_order ON public.escrow_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_tx_type ON public.escrow_transactions(type);
CREATE INDEX IF NOT EXISTS idx_escrow_tx_status ON public.escrow_transactions(status);

-- 3. Escrow Milestones Table (Partial Release Terms for B2B)
CREATE TABLE IF NOT EXISTS public.escrow_milestones (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID           NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  title          TEXT           NOT NULL,
  percentage     NUMERIC(5, 2)  NOT NULL DEFAULT 100.00,
  amount         NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  status         TEXT           NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'funded', 'released', 'disputed'
  )),
  trigger_event  TEXT           DEFAULT 'delivery_confirmed',
  released_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);

ALTER TABLE public.escrow_milestones ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public.escrow_milestones ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Final Delivery';
ALTER TABLE public.escrow_milestones ADD COLUMN IF NOT EXISTS percentage NUMERIC(5, 2) NOT NULL DEFAULT 100.00;
ALTER TABLE public.escrow_milestones ADD COLUMN IF NOT EXISTS amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.escrow_milestones ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.escrow_milestones ADD COLUMN IF NOT EXISTS trigger_event TEXT DEFAULT 'delivery_confirmed';
ALTER TABLE public.escrow_milestones ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_escrow_milestone_order ON public.escrow_milestones(order_id);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS escrow_status TEXT DEFAULT 'not_funded';

-- Add CHECK constraint for valid state machine values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_escrow_status_check'
  ) THEN
    ALTER TABLE public.orders 
    ADD CONSTRAINT orders_escrow_status_check 
    CHECK (escrow_status IN (
      'not_funded',
      'funding_pending',
      'funded',
      'partially_released',
      'released',
      'refunded',
      'disputed',
      'cancelled'
    ));
  END IF;
END $$;

-- Update existing orders based on real payment status
UPDATE public.orders SET escrow_status = 'funded' WHERE payment_status IN ('paid', 'escrow_held');
UPDATE public.orders SET escrow_status = 'released' WHERE payment_status = 'escrow_released';
UPDATE public.orders SET escrow_status = 'cancelled' WHERE status = 'cancelled';

-- Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';

-- Enable RLS & set default public policies
ALTER TABLE public.escrow_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_milestones ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own transactions/accounts
CREATE POLICY "Users view own escrow accounts" ON public.escrow_accounts
  FOR SELECT USING (user_id = auth.uid() OR organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users view own escrow transactions" ON public.escrow_transactions
  FOR SELECT USING (
    from_account_id IN (SELECT id FROM public.escrow_accounts WHERE user_id = auth.uid()) OR
    to_account_id IN (SELECT id FROM public.escrow_accounts WHERE user_id = auth.uid()) OR
    order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid() OR buyer_organization_id IN (SELECT id FROM public.organizations WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users view own escrow milestones" ON public.escrow_milestones
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid() OR buyer_organization_id IN (SELECT id FROM public.organizations WHERE user_id = auth.uid()))
  );

-- Service role & Admin bypass policy
CREATE POLICY "Admins full escrow access" ON public.escrow_transactions FOR ALL USING (true);
CREATE POLICY "Admins full account access" ON public.escrow_accounts FOR ALL USING (true);
CREATE POLICY "Admins full milestone access" ON public.escrow_milestones FOR ALL USING (true);
