/**
 * src/lib/media/use-mock-room.ts
 * ------------------------------
 * Purpose: React hook binding a MediaRoomClient to component state.
 * Step 4 constructs a MockMediaClient; in Step 5 only the construction line
 * changes to the LiveKit-backed client — consumers are contract-typed.
 * Depends on: ./types, ./mock-media-client, react.
 * Security notes: none (mock). The hook never persists anything.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import type { JoinOptions, MediaRoomClient, RoomSnapshot } from "./types";
import { MockMediaClient } from "./mock-media-client";

/**
 * Joins a (mock) room and re-renders on every room state change.
 * @param options - Join options (room, display name, role, initial devices).
 * @returns { room, client } — the live snapshot and the action interface.
 * Side effects: connects on mount, disconnects on unmount (timers cleaned up).
 */
export function useMockRoom(options: JoinOptions): {
  room: RoomSnapshot;
  client: MediaRoomClient;
} {
  // Client instance survives re-renders; constructor is side-effect-free.
  const clientRef = useRef<MediaRoomClient | null>(null);
  clientRef.current ??= new MockMediaClient(options);
  const client = clientRef.current;

  const [room, setRoom] = useState<RoomSnapshot>(() => client.getSnapshot());

  useEffect(() => {
    const unsubscribe = client.subscribe(() => setRoom(client.getSnapshot()));
    client.connect();
    return () => {
      unsubscribe();
      client.disconnect();
    };
  }, [client]);

  return { room, client };
}
