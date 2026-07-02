/**
 * src/lib/http.ts
 * ---------------
 * Purpose: Small shared helpers for Route Handlers (client IP, uniform errors).
 * Depends on: next/server.
 * Security notes: error responses are deliberately generic — no stack traces,
 * no "email exists / wrong password" distinction (enumeration resistance).
 */
import "server-only";
import { NextResponse } from "next/server";

/**
 * Extracts the client IP for rate-limiting.
 * @param request - Incoming request.
 * @returns First x-forwarded-for hop (set by our TLS-terminating proxy) or
 *          "unknown". No side effects.
 * Security note: only trustworthy when the app is ONLY reachable through the
 * reverse proxy — document proxy config in deployment notes.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/**
 * Uniform JSON error response.
 * @param status - HTTP status code.
 * @param message - Safe, generic, user-facing message.
 * @param retryAfterSeconds - When set, adds a Retry-After header (429s).
 * @returns NextResponse. No side effects.
 */
export function jsonError(
  status: number,
  message: string,
  retryAfterSeconds?: number
): NextResponse {
  const headers = new Headers();
  if (retryAfterSeconds && retryAfterSeconds > 0) {
    headers.set("Retry-After", String(retryAfterSeconds));
  }
  return NextResponse.json({ error: message }, { status, headers });
}
