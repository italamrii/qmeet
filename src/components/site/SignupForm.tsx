/**
 * src/components/site/SignupForm.tsx
 */
"use client";

import { FormEvent, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";

type Plan = "FREE" | "TEAM" | "BUSINESS";

export function SignupForm({ defaultPlan = "FREE" }: { defaultPlan?: Plan }) {
  const t = useTranslations("signup");
  const locale = useLocale();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>(defaultPlan);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      companyName: String(fd.get("companyName")),
      email: String(fd.get("email")),
      name: String(fd.get("name")),
      password: String(fd.get("password")),
      plan,
      preferredLocale: locale,
    };
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? t("errorGeneric"));
        return;
      }
      router.push("/dashboard");
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="companyName" className="text-sm font-medium">
          {t("companyName")}
        </label>
        <input
          id="companyName"
          name="companyName"
          required
          className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="name" className="text-sm font-medium">
          {t("fullName")}
        </label>
        <input
          id="name"
          name="name"
          required
          className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="email" className="text-sm font-medium">
          {t("workEmail")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm"
          dir="ltr"
        />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium">
          {t("password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={12}
          className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm"
          dir="ltr"
        />
        <p className="mt-1 text-xs text-muted-foreground">{t("passwordHint")}</p>
      </div>
      <fieldset>
        <legend className="text-sm font-medium">{t("plan")}</legend>
        <div className="mt-2 flex flex-col gap-2">
          {(["FREE", "TEAM", "BUSINESS"] as const).map((p) => (
            <label key={p} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="planRadio"
                checked={plan === p}
                onChange={() => setPlan(p)}
              />
              {t(`plans.${p}`)}
            </label>
          ))}
        </div>
        {plan === "BUSINESS" && (
          <p className="mt-2 text-xs text-muted-foreground">{t("businessNote")}</p>
        )}
      </fieldset>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {t("submit")}
      </button>
    </form>
  );
}
