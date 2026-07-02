/**
 * src/components/site/ContactEmail.tsx
 * ------------------------------------
 * Purpose: Reusable contact email display with mailto link.
 */
"use client";

import { useTranslations } from "next-intl";
import { CONTACT_EMAIL } from "@/lib/contact";

export function ContactEmail({ className }: { className?: string }) {
  const t = useTranslations("contact");

  return (
    <p className={className}>
      {t("label")}{" "}
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="text-glow underline underline-offset-4 hover:text-foreground"
        dir="ltr"
      >
        {CONTACT_EMAIL}
      </a>
    </p>
  );
}
