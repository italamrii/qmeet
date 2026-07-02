/**
 * src/lib/media/grid-layout.ts
 * -----------------------------
 * Purpose: Stable participant grid layout rules (pure functions, no UI).
 */
import type { MediaParticipant } from "./types";

const GRID_VISIBLE_MAX = 15;

export interface GridLayoutSelection {
  visible: MediaParticipant[];
  overflowCount: number;
}

/** Tailwind grid classes for a participant count (non–screen-share mode). */
export function gridClassesForCount(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  if (count <= 6) return "grid-cols-2 sm:grid-cols-3";
  if (count <= 9) return "grid-cols-2 sm:grid-cols-3";
  return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
}

/** True when tiles should use compact sizing (10+ visible). */
export function isCompactTileLayout(count: number): boolean {
  return count >= 10;
}

/**
 * Selects participants to show in the main grid (17+ → first 15 + overflow).
 * Prioritizes local, active speaker, then join order.
 */
export function selectGridParticipants(
  participants: MediaParticipant[],
  activeSpeakerId: string | null
): GridLayoutSelection {
  if (participants.length <= 16) {
    return { visible: participants, overflowCount: 0 };
  }

  const byId = new Map(participants.map((p) => [p.id, p]));
  const picked = new Set<string>();
  const visible: MediaParticipant[] = [];

  function add(id: string | undefined) {
    if (!id || picked.has(id)) return;
    const p = byId.get(id);
    if (!p) return;
    picked.add(id);
    visible.push(p);
  }

  const local = participants.find((p) => p.isLocal);
  add(local?.id);
  add(activeSpeakerId ?? undefined);

  for (const p of participants) {
    if (visible.length >= GRID_VISIBLE_MAX) break;
    add(p.id);
  }

  return {
    visible,
    overflowCount: participants.length - visible.length,
  };
}
