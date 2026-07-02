/**
 * src/components/meeting/ParticipantTile.tsx
 * ------------------------------------------
 * Purpose: One video tile — camera-on mock surface or initials avatar,
 * speaking glow ring, mute/camera-off state badges, name + role overlay.
 * Depends on: lib/media/types, ParticipantAvatar, framer-motion, lucide-react.
 * Security notes: none (mock visuals; renders display names only).
 */
"use client";

import { motion } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, ScreenShare, Crown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MediaParticipant } from "@/lib/media/types";
import { cn } from "@/lib/utils";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { LiveKitVideoRenderer } from "./LiveKitVideoRenderer";

/**
 * A single participant tile.
 * @param participant - Participant state from the room snapshot.
 * @param variant - "grid" (default), "focus" (large stage tile), "strip" (thumbnail).
 */
export function ParticipantTile({
  participant,
  variant = "grid",
}: {
  participant: MediaParticipant;
  variant?: "grid" | "focus" | "strip";
}) {
  const t = useTranslations("room");
  const { name, role, isLocal, isMuted, isCameraOn, isSpeaking, isScreenSharing } = participant;
  const isHostRole = role === "HOST" || role === "CO_HOST";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/60 bg-tile-sheen",
        variant === "strip" ? "aspect-video w-36 shrink-0 sm:w-44" : "aspect-video w-full",
        isSpeaking && "animate-speaking-ring border-glow/50"
      )}
      aria-label={`${name}${isLocal ? ` (${t("you")})` : ""}`}
    >
      {participant.cameraVideoTrack ? (
        <LiveKitVideoRenderer
          track={participant.cameraVideoTrack}
          muted={isLocal}
          mirror={participant.mirrorPreview}
          className="absolute inset-0"
        />
      ) : isCameraOn ? (
        /* Camera enabled but track not ready yet — show avatar until track publishes. */
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-background/40",
            participant.mirrorPreview && "scale-x-[-1]"
          )}
        >
          <ParticipantAvatar
            id={participant.id}
            name={name}
            className={variant === "strip" ? "h-10 w-10 text-sm" : "h-20 w-20 text-2xl"}
          />
        </div>
      ) : (
        /* Camera-off state: clearly dimmed surface + avatar + explicit label. */
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-background/70 to-background/90">
          <ParticipantAvatar
            id={participant.id}
            name={name}
            className={variant === "strip" ? "h-10 w-10 text-sm" : "h-16 w-16 text-xl"}
          />
          {variant !== "strip" && (
            <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white/70 backdrop-blur-sm">
              <VideoOff aria-hidden className="h-3 w-3" />
              {t("cameraIsOff")}
            </span>
          )}
        </div>
      )}

      {/* Bottom overlay: gradient scrim + high-contrast name chip + status cluster */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-2">
        {/* Name chip — solid backdrop guarantees readable contrast over any tile */}
        <span className="flex min-w-0 items-center gap-1 rounded-md bg-black/55 px-2 py-1 backdrop-blur-sm">
          {isHostRole && (
            <Crown aria-label={t(`roles.${role}`)} className="h-3 w-3 shrink-0 text-glow" />
          )}
          <span
            className={cn(
              "truncate font-semibold text-white",
              variant === "strip" ? "text-[11px]" : "text-xs"
            )}
          >
            {name}
            {isLocal && <span className="ms-1 font-normal text-white/70">({t("you")})</span>}
          </span>
        </span>

        {/* Status cluster: screen-share, mic, camera */}
        <span className="flex shrink-0 items-center gap-1 rounded-md bg-black/55 px-1.5 py-1 backdrop-blur-sm">
          {isScreenSharing && (
            <ScreenShare aria-label={t("screenShareLabel")} className="h-3.5 w-3.5 text-glow" />
          )}
          {isMuted ? (
            <MicOff aria-label={t("micMuted")} className="h-3.5 w-3.5 text-red-400" />
          ) : (
            <Mic
              aria-label={t("micOnStatus")}
              className={cn("h-3.5 w-3.5", isSpeaking ? "text-glow" : "text-white/80")}
            />
          )}
          {isCameraOn ? (
            <Video aria-label={t("cameraOnStatus")} className="h-3.5 w-3.5 text-white/80" />
          ) : (
            <VideoOff aria-label={t("cameraIsOff")} className="h-3.5 w-3.5 text-red-400" />
          )}
        </span>
      </div>

      {/* Speaking hint (focus/grid only) */}
      {isSpeaking && variant !== "strip" && (
        <span className="absolute start-2 top-2 rounded-full border border-glow/30 bg-glow-faint px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
          {t("speakingNow")}
        </span>
      )}
    </motion.div>
  );
}
