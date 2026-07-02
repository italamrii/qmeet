/**
 * src/lib/rooms/link.ts
 * ---------------------
 * Purpose: Build meeting join paths/URLs (no secrets).
 */

/** Locale-aware join path for a room's LiveKit name. */
export function meetingJoinPath(locale: string, livekitName: string): string {
  return `/${locale}/join/${encodeURIComponent(livekitName)}`;
}

/** Full meeting join URL for sharing. */
export function meetingJoinUrl(origin: string, locale: string, livekitName: string): string {
  return `${origin.replace(/\/$/, "")}${meetingJoinPath(locale, livekitName)}`;
}
