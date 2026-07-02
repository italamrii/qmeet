/**
 * src/components/meeting/NetworkQualityBadge.tsx
 * ----------------------------------------------
 * Purpose: Non-intrusive LiveKit connection quality indicator.
 */
"use client";

import { useTranslations } from "next-intl";
import type { ConnectionQualityLevel } from "@/lib/media/types";
import { cn } from "@/lib/utils";

const STYLES: Record<ConnectionQualityLevel, string> = {
  excellent: "border-glow/30 bg-glow-faint text-accent-foreground",
  good: "border-border/60 bg-secondary/40 text-muted-foreground",
  poor: "border-amber-500/40 bg-amber-500/10 text-amber-200",
};

const DOT_STYLES: Record<ConnectionQualityLevel, string> = {
  excellent: "bg-glow",
  good: "bg-emerald-400",
  poor: "bg-amber-400 animate-pulse-live",
};

export function NetworkQualityBadge({
  quality,
}: {
  quality: ConnectionQualityLevel | null;
}) {
  const t = useTranslations("room.networkQuality");

  if (!quality) return null;

  return (
    <span
      role="status"
      className={cn(
        "hidden items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium sm:inline-flex",
        STYLES[quality]
      )}
      title={t(quality)}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", DOT_STYLES[quality])} />
      {t(quality)}
    </span>
  );
}
