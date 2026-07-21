// Only accounts on this domain can access the internal dashboard.
export const ADMIN_DOMAIN = "144reality.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = email.toLowerCase().trim().split("@")[1];
  return domain === ADMIN_DOMAIN;
}
