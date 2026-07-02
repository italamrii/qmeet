/**
 * src/app/[locale]/layout.tsx
 * ---------------------------
 * Purpose: Locale-aware layout. Sets <html lang/dir> (Arabic ⇒ RTL by default),
 * loads Inter (Latin) + IBM Plex Sans Arabic, and provides the next-intl context.
 * Depends on: src/i18n/routing.ts, next-intl, next/font.
 * Security notes: locale param is validated against the routing allowlist;
 * unknown locales 404 via notFound().
 */
import type { Metadata } from "next";
import { Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { routing, getDirection } from "@/i18n/routing";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Q Meet",
  description: "A premium video meeting experience for modern teams.",
};

/**
 * Pre-renders both locales at build time.
 * @returns Static params for "ar" and "en".
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Locale layout: validates the locale, sets document direction, wires i18n context.
 * @param children - Page subtree.
 * @param params.locale - URL locale segment.
 * Side effects: calls notFound() for unknown locales.
 */
export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
  setRequestLocale(locale);

  const messages = await getMessages();
  const dir = getDirection(locale);

  return (
    <html lang={locale} dir={dir} className={`${inter.variable} ${plexArabic.variable} dark`}>
      <body className={dir === "rtl" ? "font-arabic" : "font-sans"}>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
