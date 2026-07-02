/**
 * src/components/site/LandingPageContent.tsx
 * ------------------------------------------
 * Purpose: Full commercial landing page sections.
 */
"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Building2,
  GraduationCap,
  Lock,
  Mic,
  Monitor,
  Shield,
  Users,
  Video,
} from "lucide-react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { PricingSection } from "./PricingSection";

const fade = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.4 },
};

export function LandingPageContent() {
  const t = useTranslations("landing");
  const trust = t.raw("trustBadges") as string[];
  const features = t.raw("features") as { title: string; description: string }[];
  const why = t.raw("whyItems") as string[];
  const useCases = t.raw("useCases") as { title: string; description: string }[];
  const securityItems = t.raw("securityItems") as string[];

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-glow/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl text-center">
          <motion.span
            {...fade}
            className="inline-flex items-center gap-2 rounded-full border border-glow/20 bg-glow-faint px-3 py-1 text-xs tracking-wide2 text-accent-foreground"
          >
            <Shield className="h-3.5 w-3.5 text-glow" aria-hidden />
            {t("hero.badge")}
          </motion.span>
          <motion.h1 {...fade} className="mt-6 text-4xl font-bold tracking-header sm:text-5xl lg:text-6xl">
            {t("hero.headline")}
          </motion.h1>
          <motion.p {...fade} className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            {t("hero.subheadline")}
          </motion.p>
          <motion.div {...fade} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow-sm"
            >
              {t("hero.ctaPrimary")}
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-border/70 px-6 py-3 text-sm font-medium hover:bg-secondary"
            >
              {t("hero.ctaMeeting")}
            </Link>
            <Link
              href="/contact-sales"
              className="rounded-full border border-glow/30 px-6 py-3 text-sm text-accent-foreground hover:bg-glow-faint"
            >
              {t("hero.ctaSales")}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-border/40 bg-card/20 px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3">
          {trust.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-border/50 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground"
            >
              {badge}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-semibold tracking-header">{t("featuresTitle")}</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const icons = [Video, Monitor, Lock, Users, Mic, Shield, Building2, GraduationCap, Users] as const;
              const Icon = icons[i % icons.length]!;
              return (
                <motion.div
                  key={f.title}
                  {...fade}
                  className="card-sheen rounded-xl border border-border/60 p-5 backdrop-blur-sm"
                >
                  <Icon className="h-5 w-5 text-glow" aria-hidden />
                  <h3 className="mt-3 font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Q Meet */}
      <section className="bg-card/20 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-header">{t("whyTitle")}</h2>
          <ul className="mt-8 space-y-3 text-start">
            {why.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-lg border border-border/40 bg-background/40 px-4 py-3 text-sm">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-glow" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Use cases */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-semibold tracking-header">{t("useCasesTitle")}</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((uc) => (
              <div key={uc.title} className="rounded-xl border border-border/60 p-5">
                <h3 className="font-semibold">{uc.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{uc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PricingSection />

      {/* Security */}
      <section className="bg-card/20 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-semibold tracking-header">{t("securityTitle")}</h2>
          <p className="mt-4 text-center text-muted-foreground">{t("securityIntro")}</p>
          <ul className="mt-8 grid gap-2 sm:grid-cols-2">
            {securityItems.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 shrink-0 text-glow" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center">
            <Link href="/security" className="text-sm text-glow underline underline-offset-4">
              {t("securityLink")}
            </Link>
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-16 sm:px-6">
        <div className="card-sheen mx-auto max-w-3xl rounded-2xl border border-glow/30 px-8 py-12 text-center backdrop-blur-sm">
          <h2 className="text-2xl font-semibold tracking-header sm:text-3xl">{t("finalCta.title")}</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              {t("finalCta.primary")}
            </Link>
            <Link href="/contact-sales" className="rounded-full border px-6 py-3 text-sm hover:bg-secondary">
              {t("finalCta.secondary")}
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
