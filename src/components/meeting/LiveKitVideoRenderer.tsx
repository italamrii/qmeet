/**
 * src/components/meeting/LiveKitVideoRenderer.tsx
 * ------------------------------------------------
 * Purpose: Attach a LiveKit-backed video track to a <video> element.
 * Client-only — never rendered during SSR.
 */
"use client";

import { useEffect, useRef } from "react";
import type { VideoTrackAttachment } from "@/lib/media/types";
import { cn } from "@/lib/utils";

/**
 * Renders a LiveKit video track in a <video> element.
 * @param track - Attachment surface from the media client snapshot.
 * @param muted - Mute element audio (required for local camera to avoid feedback).
 * @param fit - object-cover for camera tiles, object-contain for screen share.
 */
export function LiveKitVideoRenderer({
  track,
  muted = false,
  mirror = false,
  fit = "cover",
  className,
}: {
  track: VideoTrackAttachment;
  muted?: boolean;
  mirror?: boolean;
  fit?: "cover" | "contain";
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    track.attach(element);
    return () => track.detach(element);
  }, [track.id, track]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={cn(
        "h-full w-full bg-black",
        fit === "contain" ? "object-contain" : "object-cover",
        mirror && "scale-x-[-1]",
        className
      )}
    />
  );
}
