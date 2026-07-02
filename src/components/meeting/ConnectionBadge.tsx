/**
 * src/components/meeting/ConnectionBadge.tsx
 * ------------------------------------------
 * Purpose: Connection status pill for the meeting header
 * (connecting / connected / reconnecting / disconnected).
 * Depends on: lib/media/types (ConnectionState), next-intl.
 * Security notes: none.
 */
"use client";

import { useTranslations } from "next-intl";
import type { ConnectionState } from "@/lib/media/types";
import { cn } from "@/lib/utils";

const DOT_STYLES: Record<ConnectionState, string> = {
  connecting: "bg-amber-400 animate-pulse-live",
  connected: "bg-glow",
  reconnecting: "bg-amber-400 animate-pulse-live",
  disconnected: "bg-destructive",
};

/**
 * Live connection state badge.
 * @param state - Current ConnectionState from the room snapshot.
 */
export function ConnectionBadge({ state }: { state: ConnectionState }) {
  const t = useTranslations("room.connection");
  return (
    <span
      role="status"
      className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/50 px-3 py-1 text-xs text-muted-foreground"
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", DOT_STYLES[state])} />
      {t(state)}
    </span>
  );
}
