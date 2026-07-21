
-- Admin helper based on JWT email claim
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce((auth.jwt() ->> 'email'), '')) = ANY (ARRAY['hola@144reality.com']);
$$;

-- Admin read/update policies on order tables
CREATE POLICY "Admins can read custom orders" ON public.custom_orders
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can update custom orders" ON public.custom_orders
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can read shop orders" ON public.shop_orders
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can update shop orders" ON public.shop_orders
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Storage policies for private 'media' bucket: admins only
CREATE POLICY "Admins can read media" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'media' AND public.is_admin());
CREATE POLICY "Admins can upload media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND public.is_admin());
CREATE POLICY "Admins can update media" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'media' AND public.is_admin()) WITH CHECK (bucket_id = 'media' AND public.is_admin());
CREATE POLICY "Admins can delete media" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'media' AND public.is_admin());
