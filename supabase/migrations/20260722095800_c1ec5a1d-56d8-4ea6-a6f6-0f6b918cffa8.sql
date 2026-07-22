
ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS amount_refunded_cents integer,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_notified_at timestamptz;
