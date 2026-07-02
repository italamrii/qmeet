/**
 * POST /api/livekit/guest
 * -----------------------
 * Purpose: Exchange a valid signed invite token for an httpOnly guest-grant
 * cookie. This lets the raw invite token stay OUT of the room URL and out of
 * client-readable storage — the token endpoint later reads the cookie instead.
 * Auth requirement: none, but the invite must verify (signature + expiry +
 *   room match) against INVITE_LINK_SECRET.
 * Input (JSON): { roomId: string, invite: string, displayName: string } — Zod.
 * Responses:
 *   200 { ok: true, role } + guest cookie set
 *   400 invalid input · 401 invalid/expired invite · 429 rate limited ·
 *   503 mock mode (guests only meaningful with LiveKit)
 * Rate limit: 10 attempts / 15 min per IP.
 * Security notes: the invite is verified server-side; the response never echoes
 * the invite token back. The grant cookie is httpOnly/Secure/SameSite=Strict.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { getClientIp, jsonError } from "@/lib/http";
import { getMediaProvider } from "@/lib/media/provider";
import { verifyInviteToken } from "@/lib/media/invite";
import { setGuestGrantCookie } from "@/lib/media/guest-session";

export const runtime = "nodejs";

const guestSchema = z.object({
  roomId: z.string().trim().min(1).max(100),
  invite: z.string().trim().min(1).max(2048),
  displayName: z.string().trim().min(1).max(100),
});

export async function POST(request: Request): Promise<NextResponse> {
  if (getMediaProvider() !== "livekit") {
    return jsonError(503, "LiveKit is not enabled.");
  }

  const limit = consumeRateLimit(`livekit-guest:ip:${getClientIp(request)}`);
  if (!limit.allowed) {
    return jsonError(429, "Too many requests. Try again later.", limit.retryAfterSeconds);
  }

  const parsed = guestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(400, "Invalid guest request.");
  }
  const { roomId, invite, displayName } = parsed.data;

  const payload = verifyInviteToken(invite, roomId);
  if (!payload) {
    return jsonError(401, "Invite link is invalid or expired.");
  }

  setGuestGrantCookie({
    roomId: payload.roomId,
    role: payload.role,
    name: displayName,
    gid: randomUUID(),
  });

  return NextResponse.json({ ok: true, role: payload.role });
}
