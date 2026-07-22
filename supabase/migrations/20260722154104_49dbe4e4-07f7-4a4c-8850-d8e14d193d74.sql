
-- Extend custom_orders with quote + payment fields for the admin-generated
-- payment link flow.
ALTER TABLE public.custom_orders
  ADD COLUMN IF NOT EXISTS quote_total_cents integer,
  ADD COLUMN IF NOT EXISTS deposit_percent integer,
  ADD COLUMN IF NOT EXISTS quote_notes text,
  ADD COLUMN IF NOT EXISTS quote_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_token uuid UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_mode text,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS amount_paid_cents integer,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz;

ALTER TABLE public.custom_orders
  ADD CONSTRAINT custom_orders_deposit_percent_ck
  CHECK (deposit_percent IS NULL OR (deposit_percent BETWEEN 1 AND 100));

ALTER TABLE public.custom_orders
  ADD CONSTRAINT custom_orders_payment_status_ck
  CHECK (payment_status IN ('unpaid','deposit_paid','paid','refunded','failed'));

-- Backfill: ensure existing rows have a token
UPDATE public.custom_orders
   SET payment_token = gen_random_uuid()
 WHERE payment_token IS NULL;
