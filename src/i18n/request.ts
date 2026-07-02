/**
 * src/i18n/request.ts
 * -------------------
 * Purpose: Server-side request configuration for next-intl — resolves the active
 * locale and loads its message catalog.
 * Depends on: src/i18n/routing.ts, src/messages/{ar,en}.json.
 * Security notes: locale value is validated against the routing allowlist before
 * being used in the dynamic import path (prevents path traversal via locale).
 */
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate against allowlist — never interpolate unvalidated input into imports.
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
