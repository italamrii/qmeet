/**
 * src/app/[locale]/page.tsx
 * -------------------------
 * Purpose: Placeholder landing page proving the scaffold, theme tokens, and
 * bilingual RTL/LTR setup work. The full cinematic landing/join UI is built in
 * Step 4 of the execution plan (after schema + auth approval).
 * Depends on: next-intl messages, design tokens in globals.css.
 * Security notes: static content only; no user input.
 */
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Minimal scaffold landing page.
 * @param params.locale - Active locale from the URL.
 */
export default function LandingPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  return <LandingContent locale={locale} />;
}

/**
 * Inner client-safe content (separated so useTranslations runs after locale is set).
 * @param locale - Active locale.
 */
function LandingContent({ locale }: { locale: string }) {
  const t = useTranslations();
  const otherLocale = locale === "ar" ? "en" : "ar";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <div className="card-sheen flex flex-col items-center gap-6 rounded-lg border bg-card/60 px-10 py-14 backdrop-blur-sm">
        <span className="inline-flex items-center gap-2 rounded-full border border-glow/20 bg-glow-faint px-3 py-1 text-xs tracking-wide2 text-accent-foreground uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-glow animate-pulse-live" aria-hidden />
          {t("landing.secureByDesign")}
        </span>

        <h1 className="text-center text-4xl font-semibold tracking-header text-glow sm:text-5xl">
          {t("common.appName")}
        </h1>

        <p className="max-w-md text-center text-muted-foreground">{t("common.tagline")}</p>

        <p className="max-w-md text-center text-sm text-muted-foreground/70">
          {t("landing.scaffoldNotice")}
        </p>

        <Link
          href="/join/demo-room"
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow-sm transition-shadow hover:shadow-glow"
        >
          {t("landing.tryDemo")}
        </Link>

        <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
          <span>{t("landing.poweredBy")}</span>
          <span aria-hidden>·</span>
          <Link
            href="/"
            locale={otherLocale}
            className="underline decoration-glow/40 underline-offset-4 hover:text-foreground"
          >
            {otherLocale === "ar" ? "العربية" : "English"}
          </Link>
        </div>
      </div>
    </main>
  );
}
