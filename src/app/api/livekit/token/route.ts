/**
 * POST /api/livekit/token
 * -----------------------
 * Purpose: Mint a short-lived LiveKit access token for the caller, with grants
 * derived from a SERVER-RESOLVED role (never trusting the client).
 * Auth requirement: EITHER a valid authenticated session (access cookie) OR a
 *   valid guest-grant cookie (set by /api/livekit/guest after invite verify).
 * Input (JSON): { roomId: string, displayName?: string } — Zod-validated.
 *   displayName is only used as a fallback label; identity + role come from the
 *   server (session or guest grant), never from the body.
 * Responses:
 *   200 { token, livekitUrl, identity, participantName, role }
 *   400 invalid input · 401 no valid session/invite · 429 rate limited ·
 *   503 media provider is not LiveKit (mock mode)
 * Rate limit: 10 attempts / 15 min per IP (token endpoint hardening).
 * Security notes: LIVEKIT_API_SECRET never leaves the server; the response
 * contains only a scoped, TTL-bounded token + the public SFU URL.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { getSessionUser } from "@/lib/auth/session";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { getClientIp, jsonError } from "@/lib/http";
import { getMediaProvider } from "@/lib/media/provider";
import { readGuestGrant } from "@/lib/media/guest-session";
import { mintLiveKitToken } from "@/lib/media/livekit-server";
import { logAudit } from "@/lib/audit/log";
import type { MediaRole } from "@/lib/media/types";

// livekit-server-sdk + node:crypto require the Node.js runtime (not Edge).
export const runtime = "nodejs";

const tokenSchema = z.object({
  roomId: z.string().trim().min(1).max(100),
  displayName: z.string().trim().min(1).max(100).optional(),
});

/** Maps the global account role to a media role (least privilege). */
function mediaRoleForAccount(role: Role): MediaRole {
  // ADMIN/HOST accounts host meetings; everyone else joins as a participant.
  // A subscribe-only OBSERVER media role is deferred to Step 6.
  return role === "ADMIN" || role === "HOST" ? "HOST" : "PARTICIPANT";
}

export async function POST(request: Request): Promise<NextResponse> {
  // Mock mode has no server tokens — the client should never call this, but
  // fail clearly if it does.
  if (getMediaProvider() !== "livekit") {
    return jsonError(503, "LiveKit is not enabled.");
  }

  const limit = consumeRateLimit(`livekit-token:ip:${getClientIp(request)}`);
  if (!limit.allowed) {
    return jsonError(429, "Too many requests. Try again later.", limit.retryAfterSeconds);
  }

  const parsed = tokenSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(400, "Invalid token request.");
  }
  const { roomId, displayName } = parsed.data;

  // 1) Authenticated member.
  const session = await getSessionUser();
  if (session) {
    const minted = await mintLiveKitToken({
      roomId,
      identity: `user_${session.id}`,
      participantName: session.name || displayName || "Member",
      role: mediaRoleForAccount(session.role),
    });
    await logAudit("ROOM_JOINED", session.id, roomId);
    return NextResponse.json(minted);
  }

  // 2) Guest with a verified invite grant (scoped to this room).
  const guest = readGuestGrant();
  if (guest && guest.roomId === roomId) {
    const minted = await mintLiveKitToken({
      roomId,
      identity: `guest_${guest.gid}`,
      participantName: guest.name || displayName || "Guest",
      role: guest.role,
    });
    await logAudit("ROOM_JOINED", null, roomId);
    return NextResponse.json(minted);
  }

  // 3) Neither → unauthorized. Generic message (no oracle).
  return jsonError(401, "Not authorized to join this room.");
}
