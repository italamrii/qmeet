/**
 * src/lib/media/mirror-preference.ts
 * -----------------------------------
 * Purpose: Persist local camera mirror preference in localStorage.
 */
"use client";

const STORAGE_KEY = "qmeet-mirror-camera";

/** Reads stored mirror preference; null = use default for facing mode. */
export function readMirrorPreference(): boolean | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

export function writeMirrorPreference(mirror: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, mirror ? "true" : "false");
}

/** Default mirror: on for front camera, off for back. */
export function defaultMirrorForFacing(facing: "user" | "environment" | "unknown"): boolean {
  if (facing === "environment") return false;
  if (facing === "user") return true;
  return true;
}

export function resolveMirrorPreference(facing: "user" | "environment" | "unknown"): boolean {
  return readMirrorPreference() ?? defaultMirrorForFacing(facing);
}
