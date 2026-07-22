UPDATE public.custom_orders
SET status = 'completed'::public.custom_order_status,
    completed_at = COALESCE(completed_at, in_store_paid_at)
WHERE in_store_paid_at IS NOT NULL
  AND completed_at IS NULL;