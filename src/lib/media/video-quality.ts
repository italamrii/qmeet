/**
 * src/lib/media/video-quality.ts
 * ------------------------------
 * Purpose: LiveKit capture/publish quality presets and user preference storage.
 * Client-only — used by livekit-media-client.
 */
"use client";

import {
  AudioPresets,
  ScreenSharePresets,
  VideoPresets,
  VideoPresets43,
  type RoomOptions,
  type ScreenShareCaptureOptions,
  type TrackPublishOptions,
  type VideoCaptureOptions,
} from "livekit-client";
import type { VideoQualityPreset } from "./types";

const STORAGE_KEY = "qm-video-quality";

/** Default room + publish configuration for professional meetings. */
export function buildLiveKitRoomOptions(): RoomOptions {
  return {
    adaptiveStream: true,
    dynacast: true,
    audioCaptureDefaults: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    videoCaptureDefaults: {
      resolution: { width: 1280, height: 720, frameRate: 30 },
    },
    publishDefaults: {
      simulcast: true,
      videoCodec: "vp8",
      videoEncoding: VideoPresets.h720.encoding,
      videoSimulcastLayers: [VideoPresets.h540, VideoPresets.h360],
      audioPreset: AudioPresets.music,
      dtx: true,
      degradationPreference: "balanced",
      screenShareEncoding: ScreenSharePresets.h1080fps15.encoding,
      screenShareSimulcastLayers: [ScreenSharePresets.h720fps15],
    },
  };
}

export function readVideoQualityPreference(): VideoQualityPreset | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "auto" || raw === "high" || raw === "medium" || raw === "low") return raw;
  return null;
}

export function writeVideoQualityPreference(preset: VideoQualityPreset): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, preset);
}

export function resolveVideoQualityPreference(): VideoQualityPreset {
  return readVideoQualityPreference() ?? "auto";
}

function presetCaptureResolution(preset: VideoQualityPreset): {
  width: number;
  height: number;
  frameRate: number;
} {
  switch (preset) {
    case "low":
      return { width: 640, height: 360, frameRate: 24 };
    case "medium":
      return { width: 640, height: 480, frameRate: 24 };
    case "high":
      return { width: 1280, height: 720, frameRate: 30 };
    case "auto":
    default:
      return { width: 1280, height: 720, frameRate: 30 };
  }
}

function presetVideoEncoding(preset: VideoQualityPreset) {
  switch (preset) {
    case "low":
      return VideoPresets.h360.encoding;
    case "medium":
      return VideoPresets43.h480.encoding;
    case "high":
      return VideoPresets.h720.encoding;
    case "auto":
    default:
      return VideoPresets.h720.encoding;
  }
}

function presetSimulcastLayers(preset: VideoQualityPreset) {
  switch (preset) {
    case "low":
      return [VideoPresets.h180];
    case "medium":
      return [VideoPresets.h360];
    case "high":
      return [VideoPresets.h540, VideoPresets.h360];
    case "auto":
    default:
      return [VideoPresets.h540, VideoPresets.h360];
  }
}

/** Capture constraints for local camera — facingMode preserved. */
export function getCameraCaptureOptions(
  preset: VideoQualityPreset,
  facingMode: "user" | "environment" | "unknown"
): VideoCaptureOptions {
  const { width, height, frameRate } = presetCaptureResolution(preset);
  const options: VideoCaptureOptions = {
    resolution: { width, height, frameRate },
  };
  if (facingMode !== "unknown") {
    options.facingMode = facingMode;
  }
  return options;
}

/** Publish encoding for local camera track. */
export function getCameraPublishOptions(preset: VideoQualityPreset): TrackPublishOptions {
  return {
    simulcast: true,
    videoEncoding: presetVideoEncoding(preset),
    videoSimulcastLayers: presetSimulcastLayers(preset),
    degradationPreference: preset === "low" ? "maintain-framerate" : "balanced",
  };
}

/** Screen share capture — text/detail hint, no mirror. */
export function getScreenShareCaptureOptions(): ScreenShareCaptureOptions {
  const preset = ScreenSharePresets.h1080fps15;
  return {
    resolution: {
      width: preset.width,
      height: preset.height,
      frameRate: preset.encoding.maxFramerate ?? 15,
    },
    contentHint: "detail",
    audio: false,
  };
}

/** Screen share publish — readable text at reasonable bitrate. */
export function getScreenSharePublishOptions(): TrackPublishOptions {
  return {
    simulcast: true,
    videoEncoding: ScreenSharePresets.h1080fps15.encoding,
    screenShareEncoding: ScreenSharePresets.h1080fps15.encoding,
    screenShareSimulcastLayers: [ScreenSharePresets.h720fps15],
    degradationPreference: "maintain-resolution",
  };
}
