/**
 * src/lib/auth/session.ts
 * -----------------------
 * Purpose: Request-scoped session resolution — "who is calling?"
 * Depends on: cookies.ts (access cookie), tokens.ts (verification).
 * Security notes: verification includes the tokenVersion kill-switch check;
 * a null return must always be treated as unauthenticated (401).
 */
import "server-only";
import type { Role } from "@prisma/client";
import { readAccessCookie } from "./cookies";
import { verifyAccessToken } from "./tokens";

/** Authenticated caller identity, resolved from the access cookie. */
export interface SessionUser {
  id: string;
  role: Role;
  name: string;
}

/**
 * Resolves the current session from the access cookie.
 * @returns SessionUser or null when unauthenticated/expired/revoked.
 * Side effects: one DB read (tokenVersion check inside verifyAccessToken).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = readAccessCookie();
  if (!token) return null;
  const payload = await verifyAccessToken(token);
  if (!payload) return null;
  return { id: payload.sub, role: payload.role, name: payload.name };
}

/**
 * Role gate helper: true if the session role is one of `allowed`.
 * @param user - Session user (nullable).
 * @param allowed - Roles permitted for the operation.
 * @returns boolean. No side effects.
 */
export function hasRole(user: SessionUser | null, allowed: readonly Role[]): boolean {
  return !!user && allowed.includes(user.role);
}
