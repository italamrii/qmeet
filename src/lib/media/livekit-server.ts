/**
 * src/lib/media/livekit-server.ts
 * -------------------------------
 * Purpose: Server-side LiveKit AccessToken minting with LEAST-PRIVILEGE grants
 * derived from a server-resolved role. This is the only place the LiveKit API
 * secret is used. Never import this from client code.
 * Depends on: livekit-server-sdk, LIVEKIT_URL/API_KEY/API_SECRET.
 * Security notes:
 *   - Secret read from env at call time; never returned to the caller/client.
 *   - Grants are computed from the SERVER-RESOLVED role only — the client role
 *     is never trusted (see /api/livekit/token).
 *   - Token TTL capped at 4h (SECURITY.md §LiveKit tokens); re-minted on rejoin.
 */
import "server-only";
import { AccessToken } from "livekit-server-sdk";
import { requireEnv } from "@/lib/env";
import type { MediaRole } from "./types";

/** Max LiveKit token lifetime (seconds). */
export const LIVEKIT_TOKEN_TTL_SECONDS = 4 * 60 * 60;

/** A LiveKit video grant shape (kept local to avoid depending on an exported type). */
interface RoleGrant {
  roomJoin: true;
  room: string;
  canSubscribe: boolean;
  canPublish: boolean;
  canPublishData: boolean;
  roomAdmin?: boolean;
  canUpdateOwnMetadata?: boolean;
}

/**
 * Maps a media role to its least-privilege LiveKit grant set.
 * @param role - Server-resolved media role.
 * @param room - LiveKit room name to scope the grant to.
 * @returns Grant object. No side effects.
 */
function grantForRole(role: MediaRole, room: string): RoleGrant {
  // Baseline for every role: join, subscribe, publish media + data (chat).
  const base: RoleGrant = {
    roomJoin: true,
    room,
    canSubscribe: true,
    canPublish: true,
    canPublishData: true,
  };

  switch (role) {
    case "HOST":
    case "CO_HOST":
      // Moderation authority (mute/remove) + own-metadata updates.
      return { ...base, roomAdmin: true, canUpdateOwnMetadata: true };
    case "PARTICIPANT":
    case "GUEST":
    default:
      // No admin privileges — cannot moderate the room.
      return base;
  }
}

/** Deterministic LiveKit room name for a Q Meet room id.
 * Step 6 will resolve this from Room.livekitName in the DB instead. */
export function livekitRoomName(roomId: string): string {
  return `qm_${roomId}`;
}

/** Result of minting a LiveKit access token. */
export interface MintedToken {
  token: string;
  livekitUrl: string;
  identity: string;
  participantName: string;
  role: MediaRole;
}

/**
 * Mints a LiveKit access token for a resolved identity + role.
 * @param params.roomId - Q Meet room id (mapped to a LiveKit room name).
 * @param params.identity - Non-guessable participant identity (server-chosen).
 * @param params.participantName - Display name shown in the room.
 * @param params.role - SERVER-RESOLVED role (never from the client).
 * @returns Token bundle for the client to connect. Side effects: none
 *          (does not expose the API secret).
 */
export async function mintLiveKitToken(params: {
  roomId: string;
  identity: string;
  participantName: string;
  role: MediaRole;
}): Promise<MintedToken> {
  const apiKey = requireEnv("LIVEKIT_API_KEY");
  const apiSecret = requireEnv("LIVEKIT_API_SECRET");
  const livekitUrl = requireEnv("LIVEKIT_URL");
  const room = livekitRoomName(params.roomId);

  const at = new AccessToken(apiKey, apiSecret, {
    identity: params.identity,
    name: params.participantName,
    ttl: LIVEKIT_TOKEN_TTL_SECONDS,
    // Role is published as participant metadata so remote clients can render
    // role badges without a separate lookup. Not security-sensitive.
    metadata: JSON.stringify({ role: params.role }),
  });
  at.addGrant(grantForRole(params.role, room));

  const token = await at.toJwt();
  return {
    token,
    livekitUrl,
    identity: params.identity,
    participantName: params.participantName,
    role: params.role,
  };
}
