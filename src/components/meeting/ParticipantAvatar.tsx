/**
 * src/components/meeting/ParticipantAvatar.tsx
 * --------------------------------------------
 * Purpose: Initials avatar for camera-off tiles and roster rows. Deterministic
 * gradient per participant id (stable across SSR/hydration).
 * Depends on: lib/utils (cn).
 * Security notes: none (renders display names only).
 */
"use client";

import { cn } from "@/lib/utils";

/** Gradient palette cycled by a stable hash of the participant id. */
const GRADIENTS = [
  "from-cyan-500/30 to-blue-600/20",
  "from-teal-500/30 to-emerald-600/20",
  "from-indigo-500/30 to-violet-600/20",
  "from-sky-500/30 to-cyan-600/20",
  "from-blue-500/30 to-indigo-600/20",
] as const;

/**
 * Extracts up to two initials from a display name (works for Arabic + Latin).
 * @param name - Display name.
 * @returns 1–2 character string. No side effects.
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.charAt(0) ?? "؟";
  const second = words.length > 1 ? words[words.length - 1]?.charAt(0) ?? "" : "";
  return `${first}${second}`;
}

/** Stable non-negative hash for gradient selection. */
function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Circular initials avatar.
 * @param id - Participant id (drives the gradient).
 * @param name - Display name (drives the initials).
 * @param className - Extra classes (size overrides).
 */
export function ParticipantAvatar({
  id,
  name,
  className,
}: {
  id: string;
  name: string;
  className?: string;
}) {
  const gradient = GRADIENTS[hashId(id) % GRADIENTS.length];
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-16 w-16 select-none items-center justify-center rounded-full border border-white/10",
        "bg-gradient-to-br text-lg font-semibold text-foreground/90",
        gradient,
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
