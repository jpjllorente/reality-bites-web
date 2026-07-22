-- Payment reconciliation columns.
ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS notification_sent_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS shop_orders_payment_intent_uidx
  ON public.shop_orders(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Ensure authenticated users can call has_role for their own uid via RPC (used
-- for client-side "am I admin?" checks and by policies). Already granted in a
-- prior migration but re-granting is idempotent and self-documenting here.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;