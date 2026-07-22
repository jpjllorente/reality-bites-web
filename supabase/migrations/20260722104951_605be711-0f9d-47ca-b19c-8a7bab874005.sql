ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS portion_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS stripe_portion_price_id TEXT,
  ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'::jsonb;