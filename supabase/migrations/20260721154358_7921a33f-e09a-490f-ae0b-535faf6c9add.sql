-- Shop orders table (WhatsApp cart submissions)
CREATE TYPE public.shop_order_status AS ENUM ('new', 'contacted', 'confirmed', 'completed', 'cancelled');

CREATE TABLE public.shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  notes text,
  items jsonb NOT NULL,
  total_cents integer NOT NULL,
  status public.shop_order_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.shop_orders TO anon, authenticated;
GRANT ALL ON public.shop_orders TO service_role;

ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a shop order"
  ON public.shop_orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(name) BETWEEN 1 AND 120
    AND length(phone) BETWEEN 3 AND 40
    AND (email IS NULL OR length(email) BETWEEN 3 AND 254)
    AND (notes IS NULL OR length(notes) <= 1000)
    AND total_cents >= 0
    AND jsonb_typeof(items) = 'array'
  );
-- No SELECT/UPDATE/DELETE policies: only service_role (server functions) can read/modify.
