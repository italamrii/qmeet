/**
 * src/components/site/SecurityPageContent.tsx
 */
"use client";

import { useTranslations } from "next-intl";
import { Shield } from "lucide-react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function SecurityPageContent() {
  const t = useTranslations("securityPage");
  const items = t.raw("items") as { title: string; description: string }[];

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-glow" aria-hidden />
          <h1 className="text-3xl font-semibold tracking-header">{t("title")}</h1>
        </div>
        <p className="mt-4 text-muted-foreground">{t("intro")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("disclaimer")}</p>
        <div className="mt-10 space-y-6">
          {items.map((item) => (
            <div key={item.title} className="rounded-xl border border-border/60 p-5">
              <h2 className="font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
