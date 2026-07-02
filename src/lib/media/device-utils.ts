/**
 * src/lib/media/device-utils.ts
 * -----------------------------
 * Purpose: Browser device helpers for camera switching UI.
 */
"use client";

/** True on common mobile user agents. */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** True when the browser exposes screen-capture (desktop + some mobile browsers). */
export function supportsScreenShareCapture(): boolean {
  if (typeof navigator === "undefined") return false;
  return typeof navigator.mediaDevices?.getDisplayMedia === "function";
}
