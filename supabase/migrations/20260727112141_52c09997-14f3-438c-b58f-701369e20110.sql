
-- Products: wholesale fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS wholesale_price_cents integer,
  ADD COLUMN IF NOT EXISTS visible_pro boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_rate_percent smallint NOT NULL DEFAULT 21
    CHECK (tax_rate_percent IN (0, 4, 10, 21));

CREATE INDEX IF NOT EXISTS idx_products_visible_pro
  ON public.products (visible_pro) WHERE visible_pro = true;

-- is_pro() helper
CREATE OR REPLACE FUNCTION public.is_pro()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'pro'::public.app_role);
$$;

REVOKE EXECUTE ON FUNCTION public.is_pro() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_pro() TO authenticated;

-- pro_customers
CREATE TABLE IF NOT EXISTS public.pro_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text UNIQUE,
  legal_name text NOT NULL,
  trade_name text,
  tax_id text NOT NULL,
  billing_email text NOT NULL,
  contact_name text,
  phone text,
  address_line1 text NOT NULL,
  address_line2 text,
  postal_code text NOT NULL,
  city text NOT NULL,
  province text,
  country text NOT NULL DEFAULT 'ES',
  payment_terms_days smallint NOT NULL DEFAULT 0
    CHECK (payment_terms_days IN (0, 7, 15, 30, 60)),
  discount_percent smallint NOT NULL DEFAULT 0
    CHECK (discount_percent >= 0 AND discount_percent <= 100),
  default_payment_method_id text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pro_customers_user_id ON public.pro_customers (user_id);
CREATE INDEX IF NOT EXISTS idx_pro_customers_stripe ON public.pro_customers (stripe_customer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_customers TO authenticated;
GRANT ALL ON public.pro_customers TO service_role;

ALTER TABLE public.pro_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pro user reads own customer" ON public.pro_customers
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all pro customers" ON public.pro_customers
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins insert pro customers" ON public.pro_customers
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update pro customers" ON public.pro_customers
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Pro user updates own record" ON public.pro_customers
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins delete pro customers" ON public.pro_customers
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER trg_pro_customers_updated_at
  BEFORE UPDATE ON public.pro_customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- pro_order_status enum
DO $$ BEGIN
  CREATE TYPE public.pro_order_status AS ENUM (
    'nuevo','confirmado','facturado','pagado','entregado','cancelado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- pro_orders
CREATE TABLE IF NOT EXISTS public.pro_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_customer_id uuid NOT NULL REFERENCES public.pro_customers(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'eur',
  status public.pro_order_status NOT NULL DEFAULT 'nuevo',
  notes text,
  admin_notes text,
  requested_delivery_date date,
  stripe_invoice_id text UNIQUE,
  stripe_invoice_url text,
  stripe_invoice_pdf text,
  stripe_invoice_status text,
  stripe_payment_intent_id text,
  confirmed_at timestamptz,
  invoiced_at timestamptz,
  paid_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pro_orders_items_is_array CHECK (jsonb_typeof(items) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_pro_orders_user_id ON public.pro_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_pro_orders_customer_id ON public.pro_orders (pro_customer_id);
CREATE INDEX IF NOT EXISTS idx_pro_orders_status ON public.pro_orders (status);
CREATE INDEX IF NOT EXISTS idx_pro_orders_stripe_invoice ON public.pro_orders (stripe_invoice_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_orders TO authenticated;
GRANT ALL ON public.pro_orders TO service_role;

ALTER TABLE public.pro_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pro user reads own orders" ON public.pro_orders
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all pro orders" ON public.pro_orders
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Pro user creates own orders" ON public.pro_orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'nuevo' AND public.is_pro());
CREATE POLICY "Pro user updates own new orders" ON public.pro_orders
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'nuevo')
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins update all pro orders" ON public.pro_orders
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete pro orders" ON public.pro_orders
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER trg_pro_orders_updated_at
  BEFORE UPDATE ON public.pro_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Pro catalog visibility on products (parallel to existing public policy)
CREATE POLICY "Pro users and admins read pro catalog" ON public.products
  FOR SELECT TO authenticated
  USING (visible_pro = true AND (public.is_pro() OR public.is_admin()));
