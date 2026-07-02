/**
 * src/components/site/SiteHeader.tsx
 * ----------------------------------
 * Purpose: Public marketing / app header with nav and locale switch.
 */
"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const otherLocale = locale === "ar" ? "en" : "ar";
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/#features", label: t("features") },
    { href: "/#pricing", label: t("pricing") },
    { href: "/security", label: t("security") },
    { href: "/contact-sales", label: t("contactSales") },
  ] as const;

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-header">
          <span className="text-glow">{t("brand")}</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/" locale={otherLocale} className="text-xs text-muted-foreground hover:text-foreground">
            {otherLocale === "ar" ? "العربية" : "English"}
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            {t("login")}
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow-sm"
          >
            {t("getStarted")}
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? t("closeMenu") : t("openMenu")}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/40 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)}>
              {t("login")}
            </Link>
            <Link
              href="/signup"
              className={cn("rounded-full bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground")}
              onClick={() => setOpen(false)}
            >
              {t("getStarted")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
