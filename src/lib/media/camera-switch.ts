/**
 * src/lib/media/camera-switch.ts
 * --------------------------------
 * Purpose: Camera facing/device helpers for reliable multi-switch cycling.
 */
"use client";

import type { LocalMediaState } from "./types";

/** Infers front/back from a device label (best-effort). */
export function inferFacingFromLabel(label: string): LocalMediaState["cameraFacing"] {
  const lower = label.toLowerCase();
  if (
    lower.includes("back") ||
    lower.includes("rear") ||
    lower.includes("environment") ||
    lower.includes("خلفية")
  ) {
    return "environment";
  }
  if (lower.includes("front") || lower.includes("user") || lower.includes("facetime")) {
    return "user";
  }
  return "unknown";
}

/** Toggles between front and back facing modes. */
export function nextFacingMode(
  current: LocalMediaState["cameraFacing"]
): "user" | "environment" {
  if (current === "user") return "environment";
  if (current === "environment") return "user";
  return "environment";
}

/** Finds device index by id, or -1. */
export function findDeviceIndex(
  devices: MediaDeviceInfo[],
  deviceId: string | undefined
): number {
  if (!deviceId) return -1;
  return devices.findIndex((d) => d.deviceId === deviceId);
}
