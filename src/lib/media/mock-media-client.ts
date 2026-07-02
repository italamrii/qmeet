/**
 * src/lib/media/mock-media-client.ts
 * ----------------------------------
 * Purpose: Step 4 mock implementation of MediaRoomClient. Simulates a live
 * room with timers: connection handshake, a rotating active speaker, a
 * late joiner, and incoming chat — NO real devices, network, or LiveKit.
 * Depends on: ./types only. Client-side only (constructed in a React ref,
 * timers start in connect()).
 * Security notes: none (no real media, no secrets). Deterministic initial
 * state so SSR and hydration render identically; all randomness/timers run
 * only after connect() is called from an effect.
 */
import type {
  ChatMessage,
  JoinOptions,
  MediaParticipant,
  MediaRoomClient,
  RoomSnapshot,
} from "./types";

/** Fixed timestamps keep the initial snapshot deterministic across SSR/hydration. */
const SEED_TIME = "2026-07-02T17:00:00.000Z";

const LOCAL_ID = "local";

/** Mock remote roster — realistic bilingual (Arabic + Latin) team names. */
const REMOTE_SEED: Array<Pick<MediaParticipant, "id" | "name" | "role">> = [
  { id: "p-noura", name: "نورة القحطاني", role: "CO_HOST" },
  { id: "p-khalid", name: "خالد العتيبي", role: "PARTICIPANT" },
  { id: "p-sarah", name: "Sarah Mitchell", role: "PARTICIPANT" },
  { id: "p-mohammed", name: "محمد الشهري", role: "PARTICIPANT" },
  { id: "p-lina", name: "لينا الحربي", role: "GUEST" },
];

const LATE_JOINER: Pick<MediaParticipant, "id" | "name" | "role"> = {
  id: "p-abdullah",
  name: "عبدالله الدوسري",
  role: "PARTICIPANT",
};

const SEED_MESSAGES: ChatMessage[] = [
  {
    id: "m-1",
    senderId: "p-noura",
    senderName: "نورة القحطاني",
    text: "أهلًا بالجميع، سنبدأ خلال دقيقة",
    sentAt: SEED_TIME,
    isLocal: false,
  },
  {
    id: "m-2",
    senderId: "p-sarah",
    senderName: "Sarah Mitchell",
    text: "Agenda link is in the calendar invite 👍",
    sentAt: SEED_TIME,
    isLocal: false,
  },
];

/** In-room chat line pushed by the simulator a few seconds after connect. */
const INCOMING_MESSAGE = {
  senderId: "p-khalid",
  senderName: "خالد العتيبي",
  text: "الصوت واضح عندي، جاهزين",
};

export class MockMediaClient implements MediaRoomClient {
  private snapshot: RoomSnapshot;
  private listeners = new Set<() => void>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private speakingTimer: ReturnType<typeof setInterval> | null = null;
  private speakerCursor = 0;
  private connected = false;

  constructor(private readonly options: JoinOptions) {
    const local: MediaParticipant = {
      id: LOCAL_ID,
      name: options.displayName,
      role: options.role,
      isLocal: true,
      isMuted: !options.initialMicOn,
      isCameraOn: options.initialCameraOn,
      isSpeaking: false,
      isScreenSharing: false,
      joinedAt: SEED_TIME,
    };
    const remotes: MediaParticipant[] = REMOTE_SEED.map((seed, index) => ({
      ...seed,
      isLocal: false,
      // Deterministic variety: some start muted / camera-off.
      isMuted: index % 3 === 1,
      isCameraOn: index % 4 !== 2,
      isSpeaking: false,
      isScreenSharing: false,
      joinedAt: SEED_TIME,
    }));

    this.snapshot = {
      connection: "connecting",
      startedAt: null,
      isRecording: false,
      participants: [local, ...remotes],
      messages: [...SEED_MESSAGES],
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
    if (this.connected) return;
    this.connected = true;

    // Simulated signaling handshake.
    this.after(1200, () => {
      this.patch({ connection: "connected", startedAt: new Date().toISOString() });
      this.startSpeakingSimulation();
    });

    // A colleague joins late.
    this.after(6000, () => {
      this.patch({
        participants: [
          ...this.snapshot.participants,
          {
            ...LATE_JOINER,
            isLocal: false,
            isMuted: true,
            isCameraOn: true,
            isSpeaking: false,
            isScreenSharing: false,
            joinedAt: new Date().toISOString(),
          },
        ],
      });
    });

    // An incoming chat message.
    this.after(8000, () => {
      this.patch({
        messages: [
          ...this.snapshot.messages,
          {
            id: `m-${Date.now()}`,
            ...INCOMING_MESSAGE,
            sentAt: new Date().toISOString(),
            isLocal: false,
          },
        ],
      });
    });
  }

  disconnect(): void {
    this.clearTimers();
    this.connected = false;
    this.patch({ connection: "disconnected", activeSpeakerId: null });
  }

  toggleMicrophone(): void {
    this.updateParticipant(LOCAL_ID, (p) => ({
      ...p,
      isMuted: !p.isMuted,
      isSpeaking: p.isMuted ? p.isSpeaking : false,
    }));
  }

  toggleCamera(): void {
    this.updateParticipant(LOCAL_ID, (p) => ({ ...p, isCameraOn: !p.isCameraOn }));
  }

  toggleScreenShare(): void {
    const local = this.find(LOCAL_ID);
    const turningOn = !local?.isScreenSharing;
    this.patch({
      participants: this.snapshot.participants.map((p) => ({
        ...p,
        // Only one active share at a time (mirrors real SFU policy).
        isScreenSharing: p.id === LOCAL_ID ? turningOn : false,
      })),
    });
  }

  sendChatMessage(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.patch({
      messages: [
        ...this.snapshot.messages,
        {
          id: `m-${Date.now()}-local`,
          senderId: LOCAL_ID,
          senderName: this.options.displayName,
          text: trimmed,
          sentAt: new Date().toISOString(),
          isLocal: true,
        },
      ],
    });
  }

  muteParticipant(participantId: string): void {
    this.updateParticipant(participantId, (p) => ({ ...p, isMuted: true, isSpeaking: false }));
  }

  removeParticipant(participantId: string): void {
    if (participantId === LOCAL_ID) return;
    this.patch({
      participants: this.snapshot.participants.filter((p) => p.id !== participantId),
      activeSpeakerId:
        this.snapshot.activeSpeakerId === participantId ? null : this.snapshot.activeSpeakerId,
    });
  }

  toggleRecording(): void {
    this.patch({ isRecording: !this.snapshot.isRecording });
  }

  endMeeting(): void {
    this.clearTimers();
    this.connected = false;
    this.patch({ connection: "disconnected", hasEnded: true, activeSpeakerId: null });
  }

  // --- internals -------------------------------------------------------------

  /** Rotates the active speaker among unmuted participants every ~3s. */
  private startSpeakingSimulation(): void {
    this.speakingTimer = setInterval(() => {
      const candidates = this.snapshot.participants.filter((p) => !p.isMuted);
      if (candidates.length === 0) {
        this.patch({
          activeSpeakerId: null,
          participants: this.snapshot.participants.map((p) => ({ ...p, isSpeaking: false })),
        });
        return;
      }
      this.speakerCursor = (this.speakerCursor + 1) % candidates.length;
      const speaker = candidates[this.speakerCursor];
      if (!speaker) return;
      this.patch({
        activeSpeakerId: speaker.id,
        participants: this.snapshot.participants.map((p) => ({
          ...p,
          isSpeaking: p.id === speaker.id,
        })),
      });
    }, 3000);
  }

  private find(id: string): MediaParticipant | undefined {
    return this.snapshot.participants.find((p) => p.id === id);
  }

  private updateParticipant(
    id: string,
    update: (p: MediaParticipant) => MediaParticipant
  ): void {
    this.patch({
      participants: this.snapshot.participants.map((p) => (p.id === id ? update(p) : p)),
    });
  }

  /** Replaces the snapshot immutably and notifies subscribers. */
  private patch(partial: Partial<RoomSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...partial };
    this.listeners.forEach((listener) => listener());
  }

  private after(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    if (this.speakingTimer) {
      clearInterval(this.speakingTimer);
      this.speakingTimer = null;
    }
  }
}
