/**
 * src/lib/media/types.ts
 * ----------------------
 * Purpose: THE media-layer contract. All meeting UI depends on these
 * interfaces only — never on livekit-client directly. In Step 5 a
 * `LiveKitMediaClient` will implement `MediaRoomClient` and the UI will not
 * change (this is the CityMind decoupling seam — ARCHITECTURE.md §3).
 * Depends on: nothing (pure types).
 * Security notes: host-only actions exist on the interface for UI purposes;
 * real enforcement happens server-side via LiveKit token grants (Step 5) —
 * the client is never the authority.
 */

/** Which media backend is active. Resolved server-side (see lib/media/provider). */
export type MediaProvider = "mock" | "livekit";

/** Role of a participant inside the media session (UI semantics).
 * Mapping to the DB `ParticipantRole` enum happens server-side in Step 5. */
export type MediaRole = "HOST" | "CO_HOST" | "PARTICIPANT" | "GUEST";

/** Connection lifecycle of the room session. */
export type ConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected";

/** Attach/detach hook for a provider video track (LiveKit in production). */
export interface VideoTrackAttachment {
  /** Stable id (track sid) so React effects do not thrash on snapshot rebuilds. */
  id: string;
  attach(element: HTMLVideoElement): void;
  detach(element: HTMLVideoElement): void;
}

/** Attach/detach hook for a remote microphone audio track (LiveKit in production). */
export interface AudioTrackAttachment {
  id: string;
  attach(element: HTMLAudioElement): void;
  detach(element: HTMLAudioElement): void;
}

/** One participant as the UI sees them. */
export interface MediaParticipant {
  id: string;
  name: string;
  role: MediaRole;
  isLocal: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  /** ISO timestamp of when the participant joined. */
  joinedAt: string;
  /** Camera video track — set in LiveKit mode when a video track is available. */
  cameraVideoTrack?: VideoTrackAttachment;
  /** Screen-share video track — set when screen share is active. */
  screenShareVideoTrack?: VideoTrackAttachment;
  /** Remote-only: subscribed microphone audio track for playback. */
  microphoneAudioTrack?: AudioTrackAttachment;
  /** True when a remote mic track is subscribed and not muted. */
  hasAudioTrack?: boolean;
  /** Local-only: whether the camera preview is mirrored. */
  mirrorPreview?: boolean;
}

/** One in-room chat message (LiveKit data channels in Step 5 — no DB persistence). */
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  /** ISO timestamp. */
  sentAt: string;
  isLocal: boolean;
}

export interface LocalMediaState {
  /** Mirror local camera preview (remote viewers unaffected). */
  mirrorCamera: boolean;
  /** Whether switch-camera is available on this device. */
  supportsCameraSwitch: boolean;
  /** Active camera facing when known. */
  cameraFacing: "user" | "environment" | "unknown";
}

/** Immutable snapshot of the whole room state, replaced on every change. */
export interface RoomSnapshot {
  connection: ConnectionState;
  /** ISO timestamp of session start (drives the meeting timer); null until connected. */
  startedAt: string | null;
  isRecording: boolean;
  participants: MediaParticipant[];
  messages: ChatMessage[];
  activeSpeakerId: string | null;
  /** True after the host ends the meeting for everyone. */
  hasEnded: boolean;
  /** Local device UI state (preview mirror, camera switch availability). */
  localMedia: LocalMediaState;
  /** True when browser audio playback is unlocked (LiveKit startAudio succeeded). */
  audioPlaybackReady: boolean;
}

/** Options the UI provides when joining a room. */
export interface JoinOptions {
  roomId: string;
  displayName: string;
  role: MediaRole;
  initialMicOn: boolean;
  initialCameraOn: boolean;
}

/**
 * The client contract the meeting UI programs against.
 * Step 4: implemented by MockMediaClient (timers, no real media).
 * Step 5: implemented by a LiveKit-backed client with server-minted tokens.
 */
export interface MediaRoomClient {
  /** Current immutable snapshot (stable reference between changes). */
  getSnapshot(): RoomSnapshot;
  /** Subscribes to snapshot changes; returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;

  /** Starts the session. Safe to call once from an effect. */
  connect(): void;
  /** Tears the session down (leave). Idempotent. */
  disconnect(): void;

  toggleMicrophone(): void;
  toggleCamera(): void;
  toggleScreenShare(): void;
  sendChatMessage(text: string): void;

  /** Switch front/back or next video input device. */
  switchCamera(): void;
  /** Toggle local preview mirror (does not affect remote stream). */
  setMirrorLocalCamera(mirror: boolean): void;

  /** Resume remote audio playback after a user gesture (browser autoplay policy). */
  unlockAudio(): void;

  // --- Host-only (UI-gated here; token-grant-enforced in Step 5) ---
  muteParticipant(participantId: string): void;
  removeParticipant(participantId: string): void;
  toggleRecording(): void;
  endMeeting(): void;
}
