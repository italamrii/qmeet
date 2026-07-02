/**
 * src/components/site/SiteFooter.tsx
 * ----------------------------------
 * Purpose: Public site footer with brand and legal links.
 */
"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-border/40 bg-card/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold tracking-header">{t("tagline")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("builtIn")}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/security" className="hover:text-foreground">
            {t("security")}
          </Link>
          <Link href="/contact-sales" className="hover:text-foreground">
            {t("contact")}
          </Link>
          <Link href="/plans" className="hover:text-foreground">
            {t("plans")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
