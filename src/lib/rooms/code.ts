/**
 * src/lib/rooms/code.ts
 * ---------------------
 * Purpose: Generate and normalize human-readable meeting room codes.
 */
import "server-only";

/** Generates a code like Q-8472-1935. */
export function generateRoomCode(): string {
  const a = Math.floor(1000 + Math.random() * 9000);
  const b = Math.floor(1000 + Math.random() * 9000);
  return `Q-${a}-${b}`;
}

/**
 * Normalizes user input: uppercase, trim, optional dash stripping.
 * Q84721935 → Q-8472-1935 when pattern matches.
 */
export function normalizeRoomCode(input: string): string {
  const trimmed = input.trim().toUpperCase();
  const compact = trimmed.replace(/[\s-]/g, "");
  const match = compact.match(/^Q(\d{4})(\d{4})$/);
  if (match) return `Q-${match[1]}-${match[2]}`;
  return trimmed;
}

/** True when input looks like a valid room code format. */
export function isValidRoomCodeFormat(code: string): boolean {
  return /^Q-\d{4}-\d{4}$/.test(code);
}
