/**
 * src/i18n/routing.ts
 * -------------------
 * Purpose: Locale routing definition for next-intl. Arabic (RTL) is the default
 * locale per product requirements; English (LTR) is secondary.
 * Depends on: next-intl/routing.
 * Security notes: none.
 */
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
});

export type AppLocale = (typeof routing.locales)[number];

/**
 * Returns the text direction for a locale.
 * @param locale - App locale ("ar" | "en").
 * @returns "rtl" for Arabic, "ltr" otherwise. No side effects.
 */
export function getDirection(locale: string): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
