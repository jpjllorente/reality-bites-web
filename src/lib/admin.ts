// Whitelist of email addresses allowed into the internal dashboard.
// Add/remove addresses here — no database changes needed.
export const ADMIN_EMAILS = ["hola@144reality.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}
