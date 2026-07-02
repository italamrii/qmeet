/**
 * src/components/site/PricingSection.tsx
 * --------------------------------------
 * Purpose: Free-for-now pricing banner (landing + /plans).
 */
"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Check } from "lucide-react";

export function PricingSection({ id = "pricing" }: { id?: string }) {
  const t = useTranslations("pricing");
  const features = t.raw("freeFeatures") as string[];

  return (
    <section id={id} className="scroll-mt-20 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="card-sheen rounded-2xl border border-glow/30 p-8 text-center backdrop-blur-sm">
          <h2 className="text-3xl font-semibold tracking-header text-glow">{t("freeTitle")}</h2>
          <p className="mt-3 text-muted-foreground">{t("freeSubtitle")}</p>
          <ul className="mt-8 space-y-2 text-start text-sm">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-glow" aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow-sm"
            >
              {t("ctaSignup")}
            </Link>
            <Link
              href="/contact-sales"
              className="rounded-full border border-border/70 px-6 py-2.5 text-sm hover:bg-secondary"
            >
              {t("ctaEnterprise")}
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{t("enterpriseNote")}</p>
        </div>
      </div>
    </section>
  );
}
