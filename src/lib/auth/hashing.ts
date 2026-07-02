/**
 * src/lib/auth/hashing.ts
 * -----------------------
 * Purpose: Non-password hashing helpers for data minimization — we store
 * SHA-256 digests of device identifiers (user-agent, fingerprint material),
 * never the raw values and never raw IPs.
 * Depends on: node:crypto.
 * Security notes: SHA-256 (not argon2) is appropriate here — these are
 * correlation identifiers, not secrets requiring brute-force resistance.
 */
import "server-only";
import { createHash } from "node:crypto";

/**
 * SHA-256 hex digest of an arbitrary string.
 * @param input - Raw value (e.g. user-agent string).
 * @returns 64-char hex digest. No side effects.
 */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Hashes a user-agent string for RefreshToken.deviceInfo storage.
 * @param userAgent - Raw User-Agent header value (may be null).
 * @returns Hex digest, or null when no UA was provided. No side effects.
 */
export function hashDeviceInfo(userAgent: string | null): string | null {
  return userAgent ? sha256Hex(userAgent) : null;
}
