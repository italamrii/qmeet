/**
 * src/components/meeting/LiveKitAudioRenderer.tsx
 * -------------------------------------------------
 * Purpose: Attach a remote LiveKit microphone track to a hidden <audio> element.
 * Never used for local participant audio (prevents echo).
 */
"use client";

import { useEffect, useRef } from "react";
import type { AudioTrackAttachment } from "@/lib/media/types";

/**
 * Plays a remote microphone track through a hidden audio element.
 * @param track - Remote audio attachment from the media client snapshot.
 */
export function LiveKitAudioRenderer({ track }: { track: AudioTrackAttachment }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const element = audioRef.current;
    if (!element) return;
    track.attach(element);
    return () => track.detach(element);
  }, [track.id, track]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      className="sr-only"
      aria-hidden
    />
  );
}
