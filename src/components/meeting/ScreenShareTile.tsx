/**
 * src/components/meeting/ScreenShareTile.tsx
 * ------------------------------------------
 * Purpose: Large stage tile for an active screen share.
 * Renders the real LiveKit screen-share track when available.
 */
"use client";

import { motion } from "framer-motion";
import { MonitorPlay } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MediaParticipant } from "@/lib/media/types";
import { LiveKitVideoRenderer } from "./LiveKitVideoRenderer";

/**
 * Screen-share stage — real video when track is present, label overlay otherwise.
 * @param sharer - The participant currently sharing.
 */
export function ScreenShareTile({ sharer }: { sharer: MediaParticipant }) {
  const t = useTranslations("room");
  const hasVideo = Boolean(sharer.screenShareVideoTrack);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex h-full min-h-[240px] w-full flex-col overflow-hidden rounded-xl border border-glow/25 bg-black shadow-glow-sm"
      aria-label={t("screenShareBy", { name: sharer.name })}
    >
      {hasVideo ? (
        <LiveKitVideoRenderer
          track={sharer.screenShareVideoTrack!}
          fit="contain"
          className="absolute inset-0"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--glow)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--glow)) 1px, transparent 1px)",
              backgroundSize: "36px 36px",
            }}
          />
          <MonitorPlay aria-hidden className="h-10 w-10 text-glow/80" />
          <p className="text-sm font-medium text-foreground/90">
            {t("screenShareBy", { name: sharer.name })}
          </p>
        </div>
      )}

      {/* Sharer name chip */}
      <div className="pointer-events-none absolute start-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
        {t("screenShareBy", { name: sharer.name })}
      </div>
    </motion.div>
  );
}
