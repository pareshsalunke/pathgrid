import { env } from "./env";

/**
 * Admin gate for /admin/ai (item 7). No `users.role` column exists — for a solo /
 * self-host BYOK tool the operator is identified by an env allowlist (`ADMIN_EMAILS`),
 * which needs no migration and no promotion path. Match is case-insensitive + trimmed
 * to mirror how the allowlist is parsed in `env.ts`.
 */
export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return env.adminEmails.includes(email.trim().toLowerCase());
}
