/**
 * src/middleware.ts
 * -----------------
 * Purpose: Global edge middleware. Two responsibilities:
 *   1. Locale negotiation/redirects via next-intl (Arabic default, RTL).
 *   2. Security headers on every response (CSP, HSTS, frame/content-type protections).
 * Depends on: next-intl/middleware, src/i18n/routing.ts.
 * Security notes:
 *   - CSP: `connect-src` is pinned to 'self' plus the exact configured
 *     LIVEKIT_URL origin (wss + https), NOT broad `wss:`/`https:` wildcards.
 *     In mock mode (no LIVEKIT_URL) it is 'self' only.
 *   - `media-src blob:` is required for local camera/mic preview streams.
 *   - HSTS assumes TLS-only deployment (no plaintext fallback) — see deployment notes.
 */
import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Builds the `connect-src` directive: 'self' plus the exact LiveKit origin
 * (both wss and https forms) when LIVEKIT_URL is configured. No wildcards.
 * @returns Space-separated source list. No side effects.
 */
function buildConnectSrc(): string {
  const sources = ["'self'"];
  const url = process.env.LIVEKIT_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      const secure = parsed.protocol === "wss:" || parsed.protocol === "https:";
      sources.push(`${secure ? "wss" : "ws"}://${parsed.host}`);
      sources.push(`${secure ? "https" : "http"}://${parsed.host}`);
    } catch {
      /* malformed LIVEKIT_URL → keep 'self' only */
    }
  }
  return sources.join(" ");
}

/**
 * Content-Security-Policy for the app.
 * `unsafe-inline`/`unsafe-eval` are limited to what Next.js dev + framer-motion
 * inline styles require; production should move to nonces (tracked in SECURITY.md).
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  // 'self' + the exact configured LiveKit origin (wss for SFU signaling,
  // https for region/TURN HTTP). Additional TURN hosts, if any, go here too.
  `connect-src ${buildConnectSrc()}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/**
 * Applies security headers and delegates locale handling to next-intl.
 * @param request - Incoming request.
 * @returns Response with locale routing applied and hardened headers set.
 * Side effects: may issue a locale redirect (from next-intl).
 */
export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  response.headers.set("Content-Security-Policy", CSP);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains"
  );
  response.headers.set(
    "Permissions-Policy",
    // Camera/mic/screen-capture allowed for same origin only (needed for calls).
    "camera=(self), microphone=(self), display-capture=(self), geolocation=()"
  );

  return response;
}

export const config = {
  // Run on all routes except static assets and Next internals.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
