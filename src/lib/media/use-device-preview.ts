/**
 * src/lib/media/use-device-preview.ts
 * -----------------------------------
 * Purpose: Optional local camera/mic preview for the join page in LiveKit mode.
 * Permission is requested ONLY when start() is called (user clicks a button) —
 * never on mount/import. Tracks are always stopped on stop() and on unmount so
 * the camera light never lingers.
 * Depends on: react, navigator.mediaDevices (browser).
 * Security notes:
 *   - No permission prompt without explicit user action.
 *   - The preview stream stays local (attached to a <video>); it is never
 *     uploaded and is not the published track (publishing happens after Join,
 *     inside the LiveKit client).
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Preview lifecycle. */
export type PreviewStatus = "idle" | "requesting" | "active" | "denied" | "error";

/** Preview controls + the video element ref to attach. */
export interface DevicePreview {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: PreviewStatus;
  start: () => Promise<void>;
  stop: () => void;
}

/**
 * Local device preview controller.
 * @returns { videoRef, status, start, stop }. Side effects: getUserMedia on
 * start(); all tracks stopped on stop()/unmount.
 */
export function useDevicePreview(): DevicePreview {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<PreviewStatus>("idle");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      return;
    }
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus("active");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
    }
  }, []);

  // Guarantee cleanup: stop any live tracks when the component unmounts.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  return { videoRef, status, start, stop };
}
