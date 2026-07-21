
-- Update admin check: anyone with a @144reality.com email is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(split_part(coalesce((auth.jwt() ->> 'email'), ''), '@', 2)) = '144reality.com';
$$;

-- Block signup of accounts outside the allowed domain
CREATE OR REPLACE FUNCTION public.enforce_admin_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(split_part(coalesce(NEW.email, ''), '@', 2)) <> '144reality.com' THEN
    RAISE EXCEPTION 'Only @144reality.com accounts are allowed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_domain_on_auth_users ON auth.users;
CREATE TRIGGER enforce_admin_domain_on_auth_users
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_domain();
