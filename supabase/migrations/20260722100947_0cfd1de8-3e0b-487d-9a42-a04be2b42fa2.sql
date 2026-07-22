
-- Products: stock + Stripe mirror
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS in_stock boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Public policy: only in-stock + active
DROP POLICY IF EXISTS "Public can read active products" ON public.products;
CREATE POLICY "Public can read active in-stock products" ON public.products
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND in_stock = true);

-- Admin read/write policies (needed since public policy now filters out-of-stock rows)
DROP POLICY IF EXISTS "Admins manage all products" ON public.products;
CREATE POLICY "Admins manage all products" ON public.products
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Shop orders: lifecycle columns
ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS payment_failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_failure_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS failure_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS in_store_paid_at timestamptz;
