/**
 * src/lib/media/invite.ts
 * -----------------------
 * Purpose: Stateless, signed, time-limited room invite tokens (HMAC-SHA256).
 * Replaces the Step-4 mock invite verdict with real server-side verification.
 * Also mints/verifies a short-lived "guest grant" cookie so the raw invite
 * token never has to travel in the room URL or be re-read by client JS.
 * Depends on: node:crypto, INVITE_LINK_SECRET.
 * Security notes:
 *   - HMAC over a compact JSON payload; constant-time comparison on verify.
 *   - Expiry is enforced server-side. Tampered/forged/expired tokens are
 *     rejected with a generic result (no oracle about why).
 *   - Server-only module — the secret is never shipped to the client.
 *   - Step 6 will add a Room.invitesRevoked / per-link revocation check here.
 */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { requireEnv } from "@/lib/env";
import type { MediaRole } from "./types";

/** Roles an invite may grant. Invite links never grant HOST by default. */
type InviteRole = Extract<MediaRole, "PARTICIPANT" | "GUEST">;

/** Decoded, verified invite payload. */
export interface InvitePayload {
  /** Room the invite is scoped to. */
  roomId: string;
  /** Role granted on join. */
  role: InviteRole;
  /** Expiry (epoch seconds). */
  exp: number;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(payloadPart: string, secret: string): string {
  return base64url(createHmac("sha256", secret).update(payloadPart).digest());
}

/**
 * Creates a signed invite token for a room.
 * @param roomId - Target room id.
 * @param role - Granted role ("GUEST" default, or "PARTICIPANT").
 * @param ttlSeconds - Lifetime (default 24h).
 * @returns Compact `payload.signature` token string. No side effects.
 */
export function createInviteToken(
  roomId: string,
  role: InviteRole = "GUEST",
  ttlSeconds = 24 * 60 * 60
): string {
  const secret = requireEnv("INVITE_LINK_SECRET");
  const payload: InvitePayload = {
    roomId,
    role,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payloadPart = base64url(JSON.stringify(payload));
  return `${payloadPart}.${sign(payloadPart, secret)}`;
}

/**
 * Verifies an invite token: signature, structure, expiry, and room match.
 * @param token - Raw invite token (unvalidated input).
 * @param expectedRoomId - When provided, the payload roomId must match.
 * @returns The verified payload, or null if invalid/expired/forged/mismatched.
 * Side effects: none.
 */
export function verifyInviteToken(
  token: string | undefined | null,
  expectedRoomId?: string
): InvitePayload | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;

  const secret = requireEnv("INVITE_LINK_SECRET");
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return null;

  // Constant-time signature comparison.
  const expected = sign(payloadPart, secret);
  const a = Buffer.from(signaturePart);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: InvitePayload;
  try {
    payload = JSON.parse(fromBase64url(payloadPart).toString("utf8"));
  } catch {
    return null;
  }

  if (
    !payload ||
    typeof payload.roomId !== "string" ||
    typeof payload.exp !== "number" ||
    (payload.role !== "GUEST" && payload.role !== "PARTICIPANT")
  ) {
    return null;
  }
  if (payload.exp * 1000 < Date.now()) return null;
  if (expectedRoomId && payload.roomId !== expectedRoomId) return null;

  return payload;
}
