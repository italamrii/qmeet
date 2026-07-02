/**
 * src/lib/media/livekit-tracks.ts
 * --------------------------------
 * Purpose: Map LiveKit participant publications to UI-safe video attachments.
 * This is the only place (besides livekit-media-client) that reads track objects.
 */
"use client";

import {
  Track,
  type Participant,
  type LocalVideoTrack,
  type RemoteVideoTrack,
  type RemoteAudioTrack,
} from "livekit-client";
import type { AudioTrackAttachment, VideoTrackAttachment } from "./types";

const isDev = process.env.NODE_ENV === "development";

/** Safe dev-only log — never log tokens or URLs with secrets. */
export function lkDevLog(event: string, detail?: Record<string, unknown>): void {
  if (!isDev) return;
  console.log(`[livekit] ${event}`, detail ?? "");
}

type AttachableVideoTrack = LocalVideoTrack | RemoteVideoTrack;

/** Wraps a LiveKit video track for attach/detach in React video elements. */
export function toVideoAttachment(
  track: AttachableVideoTrack | undefined
): VideoTrackAttachment | undefined {
  if (!track) return undefined;
  const id = track.sid ?? track.mediaStreamTrack?.id ?? `track-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    attach: (element) => {
      track.attach(element);
    },
    detach: (element) => {
      track.detach(element);
    },
  };
}

/** Returns the camera video track for a participant, if subscribed/published. */
export function getCameraVideoTrack(participant: Participant): AttachableVideoTrack | undefined {
  const pub = participant.getTrackPublication(Track.Source.Camera);
  if (!pub?.videoTrack || pub.isMuted) return undefined;
  return pub.videoTrack;
}

/** Returns the screen-share video track for a participant. */
export function getScreenShareVideoTrack(participant: Participant): AttachableVideoTrack | undefined {
  const pub = participant.getTrackPublication(Track.Source.ScreenShare);
  if (!pub?.videoTrack || pub.isMuted) return undefined;
  return pub.videoTrack;
}

/** Returns the remote microphone audio track — never for local (avoids echo). */
export function getMicrophoneAudioTrack(
  participant: Participant,
  isLocal: boolean
): RemoteAudioTrack | undefined {
  if (isLocal) return undefined;
  const pub = participant.getTrackPublication(Track.Source.Microphone);
  if (!pub?.audioTrack || pub.isMuted) return undefined;
  return pub.audioTrack as RemoteAudioTrack;
}

/** Wraps a LiveKit remote audio track for attach/detach in React audio elements. */
export function toAudioAttachment(
  track: RemoteAudioTrack | undefined
): AudioTrackAttachment | undefined {
  if (!track) return undefined;
  const id = track.sid ?? track.mediaStreamTrack?.id ?? `audio-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    attach: (element) => {
      track.attach(element);
      lkDevLog("audio renderer attached", { trackId: id });
    },
    detach: (element) => {
      track.detach(element);
    },
  };
}
