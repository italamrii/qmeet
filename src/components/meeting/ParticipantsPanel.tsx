/**
 * src/components/meeting/ParticipantsPanel.tsx
 * --------------------------------------------
 * Purpose: Roster side panel — role indicators, device states, and host
 * actions (mute / remove) per participant.
 * Depends on: lib/media/types, ParticipantAvatar, next-intl, lucide-react.
 * Security notes: host actions are UI-gated; server-side enforcement via
 * LiveKit roomAdmin grants lands in Step 5.
 */
"use client";

import { Mic, MicOff, VideoOff, MicOff as MuteIcon, UserX, Crown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MediaParticipant } from "@/lib/media/types";
import { cn } from "@/lib/utils";
import { ParticipantAvatar } from "./ParticipantAvatar";

/**
 * Participants roster with host controls.
 * @param participants - All participants.
 * @param isHost - Whether the local user may mute/remove others.
 * @param onMuteParticipant / onRemoveParticipant - Host actions.
 */
export function ParticipantsPanel({
  participants,
  isHost,
  onMuteParticipant,
  onRemoveParticipant,
}: {
  participants: MediaParticipant[];
  isHost: boolean;
  onMuteParticipant: (id: string) => void;
  onRemoveParticipant: (id: string) => void;
}) {
  const t = useTranslations("room");

  return (
    <ul className="flex flex-col gap-1 overflow-y-auto p-3" aria-label={t("participants")}>
      {participants.map((participant) => {
        const isHostRole = participant.role === "HOST" || participant.role === "CO_HOST";
        const canModerate = isHost && !participant.isLocal && !isHostRole;

        return (
          <li
            key={participant.id}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors",
              participant.isSpeaking && "bg-glow-faint"
            )}
          >
            <ParticipantAvatar
              id={participant.id}
              name={participant.name}
              className="h-9 w-9 text-xs"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground/90">
                {participant.name}
                {participant.isLocal && (
                  <span className="ms-1 text-xs text-muted-foreground">({t("you")})</span>
                )}
              </p>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                {isHostRole && <Crown aria-hidden className="h-3 w-3 text-glow/80" />}
                {t(`roles.${participant.role}`)}
              </p>
            </div>

            {/* Device state icons */}
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {participant.isMuted ? (
                <MicOff aria-label={t("micMuted")} className="h-4 w-4 text-red-400/80" />
              ) : (
                <Mic
                  aria-hidden
                  className={cn("h-4 w-4", participant.isSpeaking && "text-glow")}
                />
              )}
              {!participant.isCameraOn && (
                <VideoOff aria-label={t("cameraIsOff")} className="h-4 w-4" />
              )}
            </span>

            {/* Host moderation actions */}
            {canModerate && (
              <span className="flex items-center gap-1">
                {!participant.isMuted && (
                  <button
                    type="button"
                    aria-label={t("muteParticipant", { name: participant.name })}
                    title={t("muteParticipant", { name: participant.name })}
                    onClick={() => onMuteParticipant(participant.id)}
                    className="rounded-md border border-border/60 p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <MuteIcon className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={t("removeParticipant", { name: participant.name })}
                  title={t("removeParticipant", { name: participant.name })}
                  onClick={() => onRemoveParticipant(participant.id)}
                  className="rounded-md border border-destructive/40 p-1.5 text-red-400/80 transition-colors hover:bg-destructive/15"
                >
                  <UserX className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
