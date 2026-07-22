ALTER TABLE public.custom_orders
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS ready_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS in_store_paid_at timestamptz;