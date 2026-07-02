/**
 * src/components/site/PricingSection.tsx
 * --------------------------------------
 * Purpose: Reusable pricing cards for landing and /plans.
 */
"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type PlanId = "free" | "team" | "business";

function PlanCard({ plan, highlighted }: { plan: PlanId; highlighted?: boolean }) {
  const t = useTranslations("pricing");
  const features = t.raw(`plans.${plan}.features`) as string[];

  const ctaHref =
    plan === "business" ? "/contact-sales" : plan === "free" ? "/signup" : "/signup?plan=team";

  return (
    <div
      className={cn(
        "card-sheen flex flex-col rounded-xl border p-6 backdrop-blur-sm",
        highlighted ? "border-glow/40 shadow-glow-sm" : "border-border/60"
      )}
    >
      <h3 className="text-lg font-semibold">{t(`plans.${plan}.name`)}</h3>
      <p className="mt-2 text-2xl font-bold text-glow">{t(`plans.${plan}.price`)}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t(`plans.${plan}.description`)}</p>
      <ul className="mt-6 flex flex-1 flex-col gap-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-glow" aria-hidden />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className={cn(
          "mt-6 rounded-full px-4 py-2.5 text-center text-sm font-medium transition-colors",
          highlighted
            ? "bg-primary text-primary-foreground shadow-glow-sm"
            : "border border-border/70 hover:bg-secondary"
        )}
      >
        {t(`plans.${plan}.cta`)}
      </Link>
    </div>
  );
}

export function PricingSection({ id = "pricing" }: { id?: string }) {
  const t = useTranslations("pricing");

  return (
    <section id={id} className="scroll-mt-20 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-header">{t("title")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <PlanCard plan="free" />
          <PlanCard plan="team" highlighted />
          <PlanCard plan="business" />
        </div>
      </div>
    </section>
  );
}
