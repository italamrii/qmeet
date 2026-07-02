/**
 * src/components/meeting/OverflowParticipantTile.tsx
 * --------------------------------------------------
 * Purpose: "+N more" overflow indicator when the grid caps visible participants.
 */
"use client";

import { useTranslations } from "next-intl";
import { Users } from "lucide-react";

export function OverflowParticipantTile({ count }: { count: number }) {
  const t = useTranslations("room");

  if (count <= 0) return null;

  return (
    <div
      className="flex aspect-video w-full flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-secondary/30"
      aria-label={t("participantsOverflow", { count })}
    >
      <Users className="mb-2 h-8 w-8 text-muted-foreground" aria-hidden />
      <span className="text-sm font-semibold text-muted-foreground">
        {t("participantsOverflow", { count })}
      </span>
    </div>
  );
}
