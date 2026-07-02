/**
 * src/components/site/JoinByCodeForm.tsx
 */
"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";

export function JoinByCodeForm({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("joinCode");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/rooms/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        setError(t("invalidCode"));
        return;
      }
      const data = (await res.json()) as { livekitName: string };
      router.push(`/join/${data.livekitName}`);
    } catch {
      setError(t("invalidCode"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={compact ? "flex flex-col gap-3 sm:flex-row" : "flex flex-col gap-4"}
    >
      {!compact && (
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      )}
      <div className={compact ? "flex flex-1 flex-col gap-2 sm:flex-row" : "flex flex-col gap-2"}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          className="flex-1 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm uppercase tracking-wider"
          dir="ltr"
          required
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {t("submit")}
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
