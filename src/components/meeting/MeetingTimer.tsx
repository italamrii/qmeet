/**
 * src/components/meeting/MeetingTimer.tsx
 * ---------------------------------------
 * Purpose: Elapsed-time display for the meeting header.
 * Depends on: react (interval effect).
 * Security notes: none.
 * Hydration note: renders a placeholder until mounted so SSR output and the
 * first client render match (elapsed time is client-clock-dependent).
 */
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/** Formats milliseconds as mm:ss or h:mm:ss. */
function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Ticking meeting duration.
 * @param startedAt - ISO start timestamp; null while connecting.
 */
export function MeetingTimer({ startedAt }: { startedAt: string | null }) {
  const t = useTranslations("room");
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    if (!startedAt) {
      setElapsed(null);
      return;
    }
    const start = Date.parse(startedAt);
    setElapsed(Date.now() - start);
    const interval = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span
      aria-label={t("elapsed")}
      className="rounded-md bg-secondary/50 px-2.5 py-1 font-mono text-xs tabular-nums text-muted-foreground"
      dir="ltr"
    >
      {elapsed === null ? "--:--" : formatElapsed(elapsed)}
    </span>
  );
}
