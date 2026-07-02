/**
 * src/components/meeting/RemoteAudioTracks.tsx
 * --------------------------------------------
 * Purpose: Render hidden audio elements for all remote participants with mic tracks.
 */
"use client";

import type { MediaParticipant } from "@/lib/media/types";
import { LiveKitAudioRenderer } from "./LiveKitAudioRenderer";

export function RemoteAudioTracks({ participants }: { participants: MediaParticipant[] }) {
  return (
    <>
      {participants
        .filter((p) => !p.isLocal && p.microphoneAudioTrack)
        .map((p) => (
          <LiveKitAudioRenderer key={p.id} track={p.microphoneAudioTrack!} />
        ))}
    </>
  );
}
