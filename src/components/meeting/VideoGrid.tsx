/**
 * src/components/meeting/VideoGrid.tsx
 * ------------------------------------
 * Purpose: Adaptive layout engine for participant tiles (1–16 stable, 17+ overflow).
 */
"use client";

import { AnimatePresence } from "framer-motion";
import type { MediaParticipant } from "@/lib/media/types";
import { cn } from "@/lib/utils";
import {
  gridClassesForCount,
  selectGridParticipants,
  isCompactTileLayout,
} from "@/lib/media/grid-layout";
import { ParticipantTile } from "./ParticipantTile";
import { ScreenShareTile } from "./ScreenShareTile";
import { OverflowParticipantTile } from "./OverflowParticipantTile";

export function VideoGrid({
  participants,
  activeSpeakerId,
}: {
  participants: MediaParticipant[];
  activeSpeakerId: string | null;
}) {
  const sharer = participants.find((p) => p.isScreenSharing);

  if (sharer) {
    const stripParticipants = participants.filter((p) => p.id !== sharer.id);
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="min-h-0 flex-1">
          <ScreenShareTile sharer={sharer} />
        </div>
        <div
          className="flex shrink-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin]"
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

  const { visible, overflowCount } = selectGridParticipants(participants, activeSpeakerId);
  const tileCount = visible.length + (overflowCount > 0 ? 1 : 0);
  const compact = isCompactTileLayout(tileCount);

  return (
    <div
      className={cn(
        "grid h-full w-full auto-rows-fr content-center gap-2 sm:gap-3",
        gridClassesForCount(tileCount),
        tileCount === 1 && "mx-auto max-w-3xl"
      )}
      role="list"
      aria-label="participants"
    >
      <AnimatePresence initial={false}>
        {visible.map((participant) => (
          <ParticipantTile
            key={participant.id}
            participant={participant}
            variant={compact ? "compact" : "grid"}
          />
        ))}
        {overflowCount > 0 && (
          <OverflowParticipantTile key="overflow" count={overflowCount} />
        )}
      </AnimatePresence>
    </div>
  );
}
