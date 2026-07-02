/**
 * src/lib/auth/cookies.ts
 * -----------------------
 * Purpose: Centralized cookie policy for session tokens.
 * Depends on: next/headers cookies().
 * Security notes:
 *   - Both tokens live in httpOnly cookies → never readable by JavaScript (XSS
 *     containment; nothing session-related in localStorage).
 *   - `SameSite=Strict` → cookies never ride cross-site requests (CSRF containment).
 *   - `Secure` in production (TLS-only deployment assumption).
 *   - Refresh cookie is PATH-SCOPED to /api/auth so it is only transmitted to
 *     auth endpoints, minimizing exposure.
 */
import "server-only";
import { cookies } from "next/headers";
import { isProduction } from "@/lib/env";
import { ACCESS_TOKEN_TTL_SECONDS } from "./tokens";

export const ACCESS_COOKIE = "qm_access";
export const REFRESH_COOKIE = "qm_refresh";

const baseFlags = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict" as const,
};

/**
 * Sets the access-token cookie (15 min, app-wide path for SSR auth checks).
 * @param token - Signed access JWT.
 * Side effects: mutates the response cookie jar.
 */
export function setAccessCookie(token: string): void {
  cookies().set(ACCESS_COOKIE, token, {
    ...baseFlags,
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });
}

/**
 * Sets the refresh-token cookie, path-scoped to auth endpoints only.
 * @param token - Signed refresh JWT.
 * @param expiresAt - Absolute expiry (mirrors the DB row).
 * Side effects: mutates the response cookie jar.
 */
export function setRefreshCookie(token: string, expiresAt: Date): void {
  cookies().set(REFRESH_COOKIE, token, {
    ...baseFlags,
    path: "/api/auth",
    expires: expiresAt,
  });
}

/**
 * Clears both session cookies (logout / revocation).
 * Side effects: mutates the response cookie jar.
 */
export function clearSessionCookies(): void {
  cookies().set(ACCESS_COOKIE, "", { ...baseFlags, path: "/", maxAge: 0 });
  cookies().set(REFRESH_COOKIE, "", { ...baseFlags, path: "/api/auth", maxAge: 0 });
}

/**
 * Reads the access token from the request cookies.
 * @returns Token string or null. No side effects.
 */
export function readAccessCookie(): string | null {
  return cookies().get(ACCESS_COOKIE)?.value ?? null;
}

/**
 * Reads the refresh token from the request cookies.
 * @returns Token string or null. No side effects.
 */
export function readRefreshCookie(): string | null {
  return cookies().get(REFRESH_COOKIE)?.value ?? null;
}
