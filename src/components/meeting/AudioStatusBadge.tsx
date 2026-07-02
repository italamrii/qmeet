/**
 * src/components/meeting/AudioStatusBadge.tsx
 * -------------------------------------------
 * Purpose: Subtle indicator for remote audio playback readiness.
 */
"use client";

import { Headphones } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MediaParticipant } from "@/lib/media/types";
import { cn } from "@/lib/utils";

export function AudioStatusBadge({
  audioPlaybackReady,
  participants,
}: {
  audioPlaybackReady: boolean;
  participants: MediaParticipant[];
}) {
  const t = useTranslations("room.audioStatus");

  const remoteWithAudio = participants.some((p) => !p.isLocal && p.hasAudioTrack);
  if (!remoteWithAudio) return null;

  const connected = audioPlaybackReady;

  return (
    <span
      className={cn(
        "hidden items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium sm:inline-flex",
        connected
          ? "border-glow/30 bg-glow-faint text-accent-foreground"
          : "border-border/60 bg-secondary/40 text-muted-foreground"
      )}
      title={connected ? t("connected") : t("unavailable")}
    >
      <Headphones className="h-3 w-3" aria-hidden />
      {connected ? t("connected") : t("unavailable")}
    </span>
  );
}
