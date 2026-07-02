/**
 * next.config.mjs
 * ---------------
 * Purpose: Next.js configuration for QIMAM Meet.
 * Depends on: next-intl plugin (locale routing, Arabic default).
 * Security notes:
 *   - `reactStrictMode` enabled to surface unsafe lifecycles early.
 *   - `poweredByHeader: false` removes the `X-Powered-By: Next.js` fingerprint header.
 *   - Security headers (CSP, HSTS, etc.) are applied in `src/middleware.ts` so they
 *     cover every route, including API Route Handlers.
 */
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    instrumentationHook: true,
  },
};

export default withNextIntl(nextConfig);
