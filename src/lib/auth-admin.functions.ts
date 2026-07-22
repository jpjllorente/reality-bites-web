import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server-side admin authorization. Uses the caller's own authenticated
 * supabase client + the has_role RPC (SECURITY DEFINER, RLS-safe). This
 * removes the parallel hardcoded ADMIN_EMAILS allowlist — the `user_roles`
 * table is now the single source of truth.
 */
export async function assertAdmin(
  supabase: Awaited<
    ReturnType<Parameters<typeof requireSupabaseAuth["server"]>[0]>
  > extends { context: infer C }
    ? C extends { supabase: infer S }
      ? S
      : never
    : never,
  userId: string,
): Promise<void> {
  const { data, error } = await (supabase as any).rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error("No se pudo comprobar el rol.");
  if (!data) throw new Error("Forbidden");
}

/**
 * Convenience: server fn that returns whether the caller is an admin.
 * Used by client UI to gate the dashboard shell without another round trip.
 */
export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any).rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: Boolean(data) };
  });
