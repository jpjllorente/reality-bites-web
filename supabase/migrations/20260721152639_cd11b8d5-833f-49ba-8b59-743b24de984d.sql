
CREATE TYPE public.custom_order_status AS ENUM ('new','reviewing','confirmed','declined');

CREATE TABLE public.custom_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  order_type text NOT NULL,
  event_date date,
  servings integer,
  flavors text,
  allergens text,
  budget_range text,
  message text,
  status public.custom_order_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.custom_orders TO anon, authenticated;
GRANT ALL ON public.custom_orders TO service_role;

ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a custom order"
  ON public.custom_orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(name) between 1 and 120
    AND length(email) between 3 and 254
    AND length(order_type) between 1 and 60
    AND (message IS NULL OR length(message) <= 2000)
    AND (flavors IS NULL OR length(flavors) <= 500)
    AND (allergens IS NULL OR length(allergens) <= 500)
  );
