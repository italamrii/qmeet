/**
 * src/components/meeting/VideoGrid.tsx
 * ------------------------------------
 * Purpose: Adaptive layout engine for participant tiles:
 *   - screen share active → stage tile + thumbnail strip
 *   - 10+ participants   → speaker-focus (active speaker stage + strip)
 *   - 1 / 2 / 3–4 / 5–9  → responsive grids
 * Depends on: ParticipantTile, ScreenShareTile, lib/media/types.
 * Security notes: none.
 */
"use client";

import { AnimatePresence } from "framer-motion";
import type { MediaParticipant } from "@/lib/media/types";
import { cn } from "@/lib/utils";
import { ParticipantTile } from "./ParticipantTile";
import { ScreenShareTile } from "./ScreenShareTile";

/** Grid column classes per participant count (mobile-first, stacks cleanly). */
function gridColumns(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  return "grid-cols-2 md:grid-cols-3";
}

/**
 * Adaptive video grid.
 * @param participants - All participants (local included).
 * @param activeSpeakerId - Current active speaker (drives focus mode).
 */
export function VideoGrid({
  participants,
  activeSpeakerId,
}: {
  participants: MediaParticipant[];
  activeSpeakerId: string | null;
}) {
  const sharer = participants.find((p) => p.isScreenSharing);
  const speakerFocus = !sharer && participants.length >= 10;

  // --- Stage mode: screen share, or speaker focus for large meetings -------
  if (sharer || speakerFocus) {
    const stageParticipant = sharer
      ? sharer
      : participants.find((p) => p.id === activeSpeakerId) ?? participants[0];
    const stripParticipants = participants.filter((p) => p.id !== stageParticipant?.id || sharer);

    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="min-h-0 flex-1">
          {sharer ? (
            <ScreenShareTile sharer={sharer} />
          ) : (
            stageParticipant && (
              <div className="mx-auto h-full max-w-4xl">
                <ParticipantTile participant={stageParticipant} variant="focus" />
              </div>
            )
          )}
        </div>
        <div
          className="flex shrink-0 gap-2 overflow-x-auto pb-1"
          role="list"
          aria-label="participants"
        >
          <AnimatePresence initial={false}>
            {stripParticipants.map((participant) => (
              <ParticipantTile key={participant.id} participant={participant} variant="strip" />
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // --- Grid mode (1-on-1 up to 9) ------------------------------------------
  return (
    <div
      className={cn(
        "grid h-full w-full content-center gap-3",
        gridColumns(participants.length),
        participants.length === 1 && "mx-auto max-w-3xl"
      )}
      role="list"
      aria-label="participants"
    >
      <AnimatePresence initial={false}>
        {participants.map((participant) => (
          <ParticipantTile key={participant.id} participant={participant} />
        ))}
      </AnimatePresence>
    </div>
  );
}
