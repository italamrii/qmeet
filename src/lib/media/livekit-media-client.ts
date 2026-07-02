/**
 * src/lib/media/livekit-media-client.ts
 * -------------------------------------
 * Purpose: Real LiveKit implementation of the MediaRoomClient contract. This is
 * the ONLY client-side module that imports livekit-client — the UI depends on
 * the interface, so mock and LiveKit are interchangeable (CityMind seam).
 * Depends on: livekit-client, ./types.
 * Security notes:
 *   - Receives an already-minted, server-scoped token + URL; it never sees the
 *     API secret and cannot escalate its own grants.
 *   - Devices are only accessed AFTER connect() (which runs after the user
 *     clicked Join) — nothing touches the camera/mic on import or construction.
 *   - Host moderation (force-mute/remove others) and recording require
 *     server-side authority (RoomService/Egress) and are wired in Step 6; here
 *     they apply host-local optimistic UI only, and are clearly marked.
 */
"use client";

import {
  Room,
  RoomEvent,
  Track,
  ConnectionQuality as LKConnectionQuality,
  ConnectionState as LKConnectionState,
  type Participant,
  type RemoteParticipant,
  type TrackPublication,
  type RemoteTrack,
} from "livekit-client";
import type {
  ChatMessage,
  ConnectionQualityLevel,
  ConnectionState,
  MediaParticipant,
  MediaRole,
  MediaRoomClient,
  RoomSnapshot,
  VideoQualityPreset,
} from "./types";
import {
  getCameraVideoTrack,
  getScreenShareVideoTrack,
  getMicrophoneAudioTrack,
  lkDevLog,
  toVideoAttachment,
  toAudioAttachment,
} from "./livekit-tracks";
import { isMobileDevice } from "./device-utils";
import {
  defaultMirrorForFacing,
  readMirrorPreference,
  resolveMirrorPreference,
  writeMirrorPreference,
} from "./mirror-preference";
import type { LocalMediaState } from "./types";
import {
  buildLiveKitRoomOptions,
  getCameraCaptureOptions,
  getCameraPublishOptions,
  getScreenShareCaptureOptions,
  getScreenSharePublishOptions,
  resolveVideoQualityPreference,
  writeVideoQualityPreference,
} from "./video-quality";

/** Data-channel topic for in-room chat messages. */
const CHAT_TOPIC = "qm-chat";

/** Options to construct the client (produced from the token endpoint response). */
export interface LiveKitClientOptions {
  url: string;
  token: string;
  identity: string;
  displayName: string;
  role: MediaRole;
  initialMicOn: boolean;
  initialCameraOn: boolean;
  /** Called on a fatal connect failure so the hook can render an error state. */
  onFatalError?: (message: string) => void;
}

/** Maps LiveKit's connection state to our UI ConnectionState. */
function mapConnectionState(state: LKConnectionState): ConnectionState {
  switch (state) {
    case LKConnectionState.Connecting:
      return "connecting";
    case LKConnectionState.Connected:
      return "connected";
    case LKConnectionState.Reconnecting:
      return "reconnecting";
    default:
      return "disconnected";
  }
}

/** Extracts a role from a participant's metadata JSON, defaulting sensibly. */
function roleFromMetadata(metadata: string | undefined, fallback: MediaRole): MediaRole {
  if (!metadata) return fallback;
  try {
    const parsed = JSON.parse(metadata) as { role?: MediaRole };
    if (
      parsed.role === "HOST" ||
      parsed.role === "CO_HOST" ||
      parsed.role === "PARTICIPANT" ||
      parsed.role === "GUEST"
    ) {
      return parsed.role;
    }
  } catch {
    /* ignore malformed metadata */
  }
  return fallback;
}

/** Maps LiveKit connection quality to UI labels (excellent / good / poor). */
function mapConnectionQuality(quality: LKConnectionQuality): ConnectionQualityLevel | null {
  switch (quality) {
    case LKConnectionQuality.Excellent:
      return "excellent";
    case LKConnectionQuality.Good:
      return "good";
    case LKConnectionQuality.Poor:
    case LKConnectionQuality.Lost:
      return "poor";
    default:
      return null;
  }
}

export class LiveKitMediaClient implements MediaRoomClient {
  private room: Room;
  private listeners = new Set<() => void>();

  private connection: ConnectionState = "connecting";
  private startedAt: string | null = null;
  private isRecording = false;
  private hasEnded = false;
  private messages: ChatMessage[] = [];
  private activeSpeakerId: string | null = null;

  /** First-seen join timestamps, kept stable across snapshot rebuilds. */
  private joinedAt = new Map<string, string>();
  /** Host-local optimistic moderation (visual only until Step 6 server wiring). */
  private removedIds = new Set<string>();
  private locallyMuted = new Set<string>();

  private snapshot: RoomSnapshot;
  private started = false;

  private cameraFacing: LocalMediaState["cameraFacing"] = "unknown";
  private mirrorCamera = true;
  private supportsCameraSwitch = false;
  private videoDeviceIndex = 0;
  private audioPlaybackReady = false;
  private videoQuality: VideoQualityPreset = resolveVideoQualityPreference();
  private connectionQuality: ConnectionQualityLevel | null = null;

  constructor(private readonly options: LiveKitClientOptions) {
    this.room = new Room(buildLiveKitRoomOptions());
    this.mirrorCamera = resolveMirrorPreference("user");
    this.snapshot = {
      connection: "connecting",
      startedAt: null,
      isRecording: false,
      participants: [],
      messages: [],
      activeSpeakerId: null,
      hasEnded: false,
      localMedia: {
        mirrorCamera: this.mirrorCamera,
        supportsCameraSwitch: isMobileDevice(),
        cameraFacing: "unknown",
        videoQuality: this.videoQuality,
      },
      audioPlaybackReady: false,
      connectionQuality: null,
    };
  }

  getSnapshot(): RoomSnapshot {
    return this.snapshot;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  connect(): void {
    if (this.started) return;
    this.started = true;
    this.wireEvents();
    void this.doConnect();
  }

  private async doConnect(): Promise<void> {
    try {
      await this.room.connect(this.options.url, this.options.token);
      this.startedAt = new Date().toISOString();
      this.connectionQuality = mapConnectionQuality(this.room.localParticipant.connectionQuality);
      // Devices are enabled only now — AFTER the user clicked Join.
      if (this.options.initialMicOn) {
        await this.room.localParticipant.setMicrophoneEnabled(true).catch(() => undefined);
      }
      if (this.options.initialCameraOn) {
        await this.enableCameraWithQuality("user");
        await this.refreshDeviceCapabilities();
      }
      await this.ensureAudioPlayback();
      this.rebuild();
    } catch (error) {
      this.connection = "disconnected";
      this.rebuild();
      const message = error instanceof Error ? error.message : "Failed to connect";
      this.options.onFatalError?.(message);
    }
  }

  disconnect(): void {
    void this.room.disconnect().catch(() => undefined);
    this.connection = "disconnected";
    this.activeSpeakerId = null;
    this.rebuild();
  }

  async toggleMicrophone(): Promise<void> {
    const enabled = this.room.localParticipant.isMicrophoneEnabled;
    await this.room.localParticipant.setMicrophoneEnabled(!enabled).catch(() => undefined);
    await this.ensureAudioPlayback();
    this.rebuild();
  }

  async toggleCamera(): Promise<void> {
    const enabled = this.room.localParticipant.isCameraEnabled;
    if (enabled) {
      await this.room.localParticipant.setCameraEnabled(false).catch(() => undefined);
    } else {
      const facing = this.cameraFacing === "unknown" ? "user" : this.cameraFacing;
      await this.enableCameraWithQuality(facing);
      await this.refreshDeviceCapabilities();
    }
    this.rebuild();
  }

  switchCamera(): void {
    void this.doSwitchCamera();
  }

  setMirrorLocalCamera(mirror: boolean): void {
    this.mirrorCamera = mirror;
    writeMirrorPreference(mirror);
    this.rebuild();
  }

  unlockAudio(): void {
    void this.ensureAudioPlayback().then(() => this.rebuild());
  }

  setVideoQuality(preset: VideoQualityPreset): void {
    void this.applyVideoQuality(preset);
  }

  private async enableCameraWithQuality(
    facing: "user" | "environment" | "unknown"
  ): Promise<void> {
    const capture = getCameraCaptureOptions(this.videoQuality, facing);
    const publish = getCameraPublishOptions(this.videoQuality);
    await this.room.localParticipant.setCameraEnabled(true, capture, publish).catch(() => undefined);
    if (facing !== "unknown") {
      this.cameraFacing = facing;
    }
    lkDevLog("camera enabled", { quality: this.videoQuality, facing });
  }

  private async applyVideoQuality(preset: VideoQualityPreset): Promise<void> {
    this.videoQuality = preset;
    writeVideoQualityPreference(preset);
    const cameraOn = this.room.localParticipant.isCameraEnabled;
    if (cameraOn) {
      const facing = this.cameraFacing === "unknown" ? "user" : this.cameraFacing;
      await this.room.localParticipant.setCameraEnabled(false).catch(() => undefined);
      await this.enableCameraWithQuality(facing);
    }
    lkDevLog("video quality changed", { preset });
    this.rebuild();
  }

  private async doSwitchCamera(): Promise<void> {
    if (!this.snapshot.localMedia.supportsCameraSwitch) return;

    try {
      const devices = await Room.getLocalDevices("videoinput", true);
      if (devices.length >= 2) {
        this.videoDeviceIndex = (this.videoDeviceIndex + 1) % devices.length;
        const device = devices[this.videoDeviceIndex];
        if (device) {
          await this.room.switchActiveDevice("videoinput", device.deviceId);
          const label = device.label.toLowerCase();
          if (label.includes("back") || label.includes("rear") || label.includes("environment")) {
            this.cameraFacing = "environment";
          } else if (label.includes("front") || label.includes("user")) {
            this.cameraFacing = "user";
          }
        }
      } else if (this.room.localParticipant.isCameraEnabled) {
        const nextFacing = this.cameraFacing === "user" ? "environment" : "user";
        await this.enableCameraWithQuality(nextFacing);
      } else {
        this.cameraFacing = this.cameraFacing === "user" ? "environment" : "user";
      }

      if (readMirrorPreference() === null) {
        this.mirrorCamera = defaultMirrorForFacing(this.cameraFacing);
      }
      await this.refreshDeviceCapabilities();
      this.rebuild();
    } catch {
      lkDevLog("camera switch failed");
    }
  }

  private async refreshDeviceCapabilities(): Promise<void> {
    try {
      const devices = await Room.getLocalDevices("videoinput", true);
      this.supportsCameraSwitch = devices.length > 1 || isMobileDevice();
    } catch {
      this.supportsCameraSwitch = isMobileDevice();
    }
  }

  async toggleScreenShare(): Promise<void> {
    const enabled = this.room.localParticipant.isScreenShareEnabled;
    if (enabled) {
      await this.room.localParticipant.setScreenShareEnabled(false).catch(() => undefined);
      lkDevLog("screen share stopped");
    } else {
      await this.room.localParticipant
        .setScreenShareEnabled(
          true,
          getScreenShareCaptureOptions(),
          getScreenSharePublishOptions()
        )
        .catch(() => undefined);
      lkDevLog("screen share published");
    }
    this.rebuild();
  }

  sendChatMessage(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    const payload = new TextEncoder().encode(JSON.stringify({ text: trimmed }));
    void this.room.localParticipant
      .publishData(payload, { reliable: true, topic: CHAT_TOPIC })
      .catch(() => undefined);
    // Echo locally so the sender sees their message immediately.
    this.messages = [
      ...this.messages,
      {
        id: `local-${Date.now()}`,
        senderId: this.options.identity,
        senderName: this.options.displayName,
        text: trimmed,
        sentAt: new Date().toISOString(),
        isLocal: true,
      },
    ];
    this.rebuild();
  }

  // --- Host-only (optimistic UI here; server enforcement is Step 6) ----------

  muteParticipant(participantId: string): void {
    // TODO(step 6): call a server route using RoomServiceClient.mutePublishedTrack.
    this.locallyMuted.add(participantId);
    this.rebuild();
  }

  removeParticipant(participantId: string): void {
    // TODO(step 6): call a server route using RoomServiceClient.removeParticipant.
    this.removedIds.add(participantId);
    this.rebuild();
  }

  toggleRecording(): void {
    // TODO(step 6): trigger LiveKit Egress start/stop via a server route.
    this.isRecording = !this.isRecording;
    this.rebuild();
  }

  endMeeting(): void {
    // TODO(step 6): server RoomService.deleteRoom to end for everyone.
    this.hasEnded = true;
    this.disconnect();
  }

  private async ensureAudioPlayback(): Promise<void> {
    try {
      await this.room.startAudio();
      if (!this.audioPlaybackReady) {
        lkDevLog("audio playback started");
      }
      this.audioPlaybackReady = true;
    } catch {
      if (this.audioPlaybackReady) {
        lkDevLog("audio playback blocked");
      }
      this.audioPlaybackReady = false;
    }
  }

  // --- internals -------------------------------------------------------------

  private wireEvents(): void {
    const rebuild = () => this.rebuild();
    this.room
      .on(RoomEvent.ConnectionStateChanged, rebuild)
      .on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        if (participant.isLocal) {
          this.connectionQuality = mapConnectionQuality(quality);
          lkDevLog("connection quality", { level: this.connectionQuality });
          rebuild();
        }
      })
      .on(RoomEvent.ParticipantConnected, (participant) => {
        lkDevLog("participant connected", { identity: participant.identity });
        rebuild();
      })
      .on(RoomEvent.ParticipantDisconnected, rebuild)
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: TrackPublication, participant) => {
        if (track.kind === "audio" && publication.source === Track.Source.Microphone) {
          lkDevLog("audio track subscribed", { identity: participant?.identity });
          void this.ensureAudioPlayback();
        }
        lkDevLog("track subscribed", {
          kind: track.kind,
          source: publication.source,
          identity: participant?.identity,
        });
        rebuild();
      })
      .on(RoomEvent.TrackUnsubscribed, rebuild)
      .on(RoomEvent.TrackMuted, (publication: TrackPublication) => {
        if (publication.source === Track.Source.Microphone) {
          lkDevLog("audio track muted", { source: publication.source });
        } else {
          lkDevLog("track muted", { source: publication.source });
        }
        rebuild();
      })
      .on(RoomEvent.TrackUnmuted, (publication: TrackPublication) => {
        if (publication.source === Track.Source.Microphone) {
          lkDevLog("audio track unmuted", { source: publication.source });
          void this.ensureAudioPlayback();
        } else {
          lkDevLog("track unmuted", { source: publication.source });
        }
        rebuild();
      })
      .on(RoomEvent.LocalTrackPublished, (publication: TrackPublication) => {
        lkDevLog("local track published", { source: publication.source });
        rebuild();
      })
      .on(RoomEvent.LocalTrackUnpublished, rebuild)
      .on(RoomEvent.TrackPublished, rebuild)
      .on(RoomEvent.TrackUnpublished, rebuild)
      .on(RoomEvent.ParticipantMetadataChanged, rebuild)
      .on(RoomEvent.Disconnected, () => {
        this.connection = "disconnected";
        this.rebuild();
      })
      .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
        this.activeSpeakerId = speakers[0]?.identity ?? null;
        this.rebuild();
      })
      .on(
        RoomEvent.DataReceived,
        (payload: Uint8Array, participant: RemoteParticipant | undefined, _kind, topic) => {
          if (topic !== CHAT_TOPIC || !participant) return;
          try {
            const data = JSON.parse(new TextDecoder().decode(payload)) as { text?: string };
            if (!data.text) return;
            this.messages = [
              ...this.messages,
              {
                id: `${participant.identity}-${Date.now()}`,
                senderId: participant.identity,
                senderName: participant.name || participant.identity,
                text: String(data.text).slice(0, 1000),
                sentAt: new Date().toISOString(),
                isLocal: false,
              },
            ];
            this.rebuild();
          } catch {
            /* ignore malformed chat payloads */
          }
        }
      );
  }

  /** Builds a MediaParticipant from a LiveKit participant. */
  private toMediaParticipant(participant: Participant, isLocal: boolean): MediaParticipant {
    const id = participant.identity;
    if (!this.joinedAt.has(id)) {
      this.joinedAt.set(id, participant.joinedAt?.toISOString() ?? new Date().toISOString());
    }
    const fallbackRole: MediaRole = isLocal ? this.options.role : "PARTICIPANT";
    const cameraTrack = getCameraVideoTrack(participant);
    const screenTrack = getScreenShareVideoTrack(participant);
    const micTrack = getMicrophoneAudioTrack(participant, isLocal);

    return {
      id,
      name: participant.name || participant.identity,
      role: roleFromMetadata(participant.metadata, fallbackRole),
      isLocal,
      isMuted: this.locallyMuted.has(id) || !participant.isMicrophoneEnabled,
      isCameraOn: participant.isCameraEnabled,
      isSpeaking: participant.isSpeaking,
      isScreenSharing: participant.isScreenShareEnabled,
      joinedAt: this.joinedAt.get(id) ?? new Date().toISOString(),
      cameraVideoTrack: toVideoAttachment(cameraTrack),
      screenShareVideoTrack: toVideoAttachment(screenTrack),
      microphoneAudioTrack: toAudioAttachment(micTrack),
      hasAudioTrack: !isLocal && Boolean(micTrack),
      mirrorPreview: isLocal ? this.mirrorCamera : undefined,
    };
  }

  /** Recomputes the immutable snapshot from live room state and notifies. */
  private rebuild(): void {
    const local = this.room.localParticipant;
    const participants: MediaParticipant[] = [];

    if (local) {
      participants.push(this.toMediaParticipant(local, true));
    }
    for (const remote of Array.from(this.room.remoteParticipants.values())) {
      if (this.removedIds.has(remote.identity)) continue;
      participants.push(this.toMediaParticipant(remote, false));
    }

    // Prefer the live connection state unless we've forced disconnected/ended.
    const liveConnection = mapConnectionState(this.room.state);
    if (this.connection !== "disconnected" || liveConnection === "connected") {
      this.connection = liveConnection;
    }

    this.snapshot = {
      connection: this.hasEnded ? "disconnected" : this.connection,
      startedAt: this.startedAt,
      isRecording: this.isRecording,
      participants,
      messages: this.messages,
      activeSpeakerId: this.activeSpeakerId,
      hasEnded: this.hasEnded,
      localMedia: {
        mirrorCamera: this.mirrorCamera,
        supportsCameraSwitch: this.supportsCameraSwitch,
        cameraFacing: this.cameraFacing,
        videoQuality: this.videoQuality,
      },
      audioPlaybackReady: this.audioPlaybackReady,
      connectionQuality: this.connectionQuality,
    };
    this.listeners.forEach((listener) => listener());
  }
}
