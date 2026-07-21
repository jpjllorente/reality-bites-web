// Only these specific accounts can access the internal dashboard.
// Server-side enforcement lives in the `user_roles` table + `is_admin()` (Supabase).
export const ADMIN_EMAILS = ["hola@144reality.com", "webmaster@144reality.com"] as const;

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (ADMIN_EMAILS as readonly string[]).includes(email.toLowerCase().trim());
}
