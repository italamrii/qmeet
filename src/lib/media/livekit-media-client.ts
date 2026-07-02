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
  ConnectionState as LKConnectionState,
  type Participant,
  type RemoteParticipant,
} from "livekit-client";
import type {
  ChatMessage,
  ConnectionState,
  MediaParticipant,
  MediaRole,
  MediaRoomClient,
  RoomSnapshot,
} from "./types";

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

  constructor(private readonly options: LiveKitClientOptions) {
    this.room = new Room({ adaptiveStream: true, dynacast: true });
    // Deterministic initial snapshot (nothing connected yet).
    this.snapshot = {
      connection: "connecting",
      startedAt: null,
      isRecording: false,
      participants: [],
      messages: [],
      activeSpeakerId: null,
      hasEnded: false,
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
      // Devices are enabled only now — AFTER the user clicked Join.
      if (this.options.initialMicOn) {
        await this.room.localParticipant.setMicrophoneEnabled(true).catch(() => undefined);
      }
      if (this.options.initialCameraOn) {
        await this.room.localParticipant.setCameraEnabled(true).catch(() => undefined);
      }
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
    this.rebuild();
  }

  async toggleCamera(): Promise<void> {
    const enabled = this.room.localParticipant.isCameraEnabled;
    await this.room.localParticipant.setCameraEnabled(!enabled).catch(() => undefined);
    this.rebuild();
  }

  async toggleScreenShare(): Promise<void> {
    const enabled = this.room.localParticipant.isScreenShareEnabled;
    await this.room.localParticipant.setScreenShareEnabled(!enabled).catch(() => undefined);
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

  // --- internals -------------------------------------------------------------

  private wireEvents(): void {
    const rebuild = () => this.rebuild();
    this.room
      .on(RoomEvent.ConnectionStateChanged, rebuild)
      .on(RoomEvent.ParticipantConnected, rebuild)
      .on(RoomEvent.ParticipantDisconnected, rebuild)
      .on(RoomEvent.TrackSubscribed, rebuild)
      .on(RoomEvent.TrackUnsubscribed, rebuild)
      .on(RoomEvent.TrackMuted, rebuild)
      .on(RoomEvent.TrackUnmuted, rebuild)
      .on(RoomEvent.LocalTrackPublished, rebuild)
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
    };
    this.listeners.forEach((listener) => listener());
  }
}
