/**
 * src/middleware.ts
 * -----------------
 * Purpose: Global edge middleware. Two responsibilities:
 *   1. Locale negotiation/redirects via next-intl (Arabic default, RTL).
 *   2. Security headers on every response (CSP, HSTS, frame/content-type protections).
 * Depends on: next-intl/middleware, src/i18n/routing.ts.
 * Security notes:
 *   - CSP: `connect-src` includes wss:/https: because the LiveKit client opens a
 *     secure WebSocket to the self-hosted SFU. Once LIVEKIT_URL is known, tighten
 *     this to the exact origin (see SECURITY.md §Headers).
 *   - `media-src blob:` is required for local camera/mic preview streams.
 *   - HSTS assumes TLS-only deployment (no plaintext fallback) — see deployment notes.
 *   - Auth-endpoint rate limiting will be added in Step 3 (documented in SECURITY.md).
 */
import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

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
  // wss: for LiveKit SFU signaling; https: for TURN/egress endpoints.
  // TODO(step 5): replace with the exact LIVEKIT_URL origin.
  "connect-src 'self' wss: https:",
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
