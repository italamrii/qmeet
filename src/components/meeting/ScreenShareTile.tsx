/**
 * src/components/meeting/ScreenShareTile.tsx
 * ------------------------------------------
 * Purpose: Large stage tile shown while someone shares their screen.
 * Step 4: placeholder surface; Step 5 renders the real screen-share track here.
 * Depends on: lib/media/types, framer-motion, lucide-react.
 * Security notes: none.
 */
"use client";

import { motion } from "framer-motion";
import { MonitorPlay } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MediaParticipant } from "@/lib/media/types";

/**
 * Screen-share stage placeholder.
 * @param sharer - The participant currently sharing.
 */
export function ScreenShareTile({ sharer }: { sharer: MediaParticipant }) {
  const t = useTranslations("room");
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex h-full min-h-[240px] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-glow/25 bg-tile-sheen shadow-glow-sm"
      aria-label={t("screenShareBy", { name: sharer.name })}
    >
      {/* Subtle grid backdrop suggesting a shared desktop */}
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
      <p className="text-xs text-muted-foreground">{t("screenSharePlaceholder")}</p>
    </motion.div>
  );
}
