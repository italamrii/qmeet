/**
 * src/components/site/ContactSalesForm.tsx
 */
"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle2 } from "lucide-react";

export function ContactSalesForm() {
  const t = useTranslations("contactSales");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const plan = String(fd.get("planInterest") || "");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(fd.get("name")),
          company: String(fd.get("company")),
          email: String(fd.get("email")),
          phone: String(fd.get("phone") || "") || undefined,
          companySize: String(fd.get("companySize") || "") || undefined,
          message: String(fd.get("message") || "") || undefined,
          planInterest: plan || undefined,
        }),
      });
      if (!res.ok) {
        setError(t("error"));
        return;
      }
      setDone(true);
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-glow" aria-hidden />
        <p className="font-medium">{t("successTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("successHint")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-sm font-medium">{t("name")}</label>
          <input id="name" name="name" required className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="company" className="text-sm font-medium">{t("company")}</label>
          <input id="company" name="company" required className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="text-sm font-medium">{t("email")}</label>
          <input id="email" name="email" type="email" required className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm" dir="ltr" />
        </div>
        <div>
          <label htmlFor="phone" className="text-sm font-medium">{t("phone")}</label>
          <input id="phone" name="phone" className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm" dir="ltr" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="companySize" className="text-sm font-medium">{t("companySize")}</label>
          <select id="companySize" name="companySize" className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm">
            <option value="">{t("selectSize")}</option>
            <option value="1-10">1–10</option>
            <option value="11-50">11–50</option>
            <option value="51-200">51–200</option>
            <option value="200+">200+</option>
          </select>
        </div>
        <div>
          <label htmlFor="planInterest" className="text-sm font-medium">{t("planInterest")}</label>
          <select id="planInterest" name="planInterest" className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm">
            <option value="">{t("selectPlan")}</option>
            <option value="TEAM">{t("planTeam")}</option>
            <option value="BUSINESS">{t("planBusiness")}</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="message" className="text-sm font-medium">{t("message")}</label>
        <textarea id="message" name="message" rows={4} className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm" />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground">
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {t("submit")}
      </button>
    </form>
  );
}
