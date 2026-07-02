/**
 * src/lib/media/use-media-room.ts
 * -------------------------------
 * Purpose: Provider-switching room hook. Selects the mock or LiveKit client
 * based on the server-resolved provider, fetches a server-minted token for
 * LiveKit, and exposes a uniform { room, client, phase } to the UI. Never
 * crashes: token/connection failures surface a clean error + mock fallback.
 * Depends on: ./types, ./mock-media-client, ./livekit-media-client.
 * Security notes:
 *   - No secrets here. The LiveKit token + URL come only from the server
 *     endpoint response over same-origin fetch.
 *   - Devices are only touched inside the client's connect() (post-Join).
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import type { MediaProvider, MediaRole, MediaRoomClient, RoomSnapshot } from "./types";
import { MockMediaClient } from "./mock-media-client";
import { LiveKitMediaClient } from "./livekit-media-client";

/** Lifecycle of the media connection as the UI cares about it. */
export type MediaRoomPhase = "connecting" | "ready" | "error";

/** Inputs to join a room. */
export interface UseMediaRoomOptions {
  provider: MediaProvider;
  roomId: string;
  displayName: string;
  role: MediaRole;
  initialMicOn: boolean;
  initialCameraOn: boolean;
}

/** Hook result. `room`/`client` are null until the client is ready. */
export interface UseMediaRoomResult {
  room: RoomSnapshot | null;
  client: MediaRoomClient | null;
  phase: MediaRoomPhase;
  error: string | null;
  /** Switches to the mock client (offered after a LiveKit failure). */
  fallbackToMock: () => void;
}

/**
 * Joins a room via the configured provider.
 * @param options - Provider + join options.
 * @returns Live snapshot, client action interface, and connection phase.
 * Side effects: fetches a token (LiveKit), connects on mount, disconnects on
 * unmount / provider change.
 */
export function useMediaRoom(options: UseMediaRoomOptions): UseMediaRoomResult {
  const { provider, roomId, displayName, role, initialMicOn, initialCameraOn } = options;

  const [client, setClient] = useState<MediaRoomClient | null>(null);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [phase, setPhase] = useState<MediaRoomPhase>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [forceMock, setForceMock] = useState(false);

  const effectiveProvider: MediaProvider = forceMock ? "mock" : provider;

  // Build the client (async for LiveKit: fetch token first).
  useEffect(() => {
    let cancelled = false;
    setPhase("connecting");
    setError(null);

    async function init() {
      if (effectiveProvider === "mock") {
        const mock = new MockMediaClient({
          roomId,
          displayName,
          role,
          initialMicOn,
          initialCameraOn,
        });
        if (cancelled) return;
        setClient(mock);
        setPhase("ready");
        return;
      }

      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, displayName }),
        });
        if (!res.ok) {
          throw new Error(`Token request failed (${res.status})`);
        }
        const data = (await res.json()) as {
          token: string;
          livekitUrl: string;
          identity: string;
          participantName: string;
          role: MediaRole;
        };
        if (cancelled) return;

        const lk = new LiveKitMediaClient({
          url: data.livekitUrl,
          token: data.token,
          identity: data.identity,
          displayName: data.participantName || displayName,
          role: data.role || role,
          initialMicOn,
          initialCameraOn,
          onFatalError: (message) => {
            if (!cancelled) {
              setPhase("error");
              setError(message);
            }
          },
        });
        setClient(lk);
        setPhase("ready");
      } catch (e) {
        if (cancelled) return;
        setPhase("error");
        setError(e instanceof Error ? e.message : "Failed to join the meeting.");
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
    // displayName/role/device flags are captured at join time; roomId + provider
    // are the meaningful re-init triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveProvider, roomId]);

  // Subscribe + connect whenever the active client changes.
  useEffect(() => {
    if (!client) return;
    setRoom(client.getSnapshot());
    const unsubscribe = client.subscribe(() => setRoom(client.getSnapshot()));
    client.connect();
    return () => {
      unsubscribe();
      client.disconnect();
    };
  }, [client]);

  const fallbackToMock = useCallback(() => setForceMock(true), []);

  return { room, client, phase, error, fallbackToMock };
}
