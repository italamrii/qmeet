/**
 * src/lib/media/guest-session.ts
 * ------------------------------
 * Purpose: Short-lived, signed "guest grant" cookie. When a guest opens a valid
 * invite link and clicks Join, we verify the invite once, then store a signed
 * grant (roomId + role + display name) in an httpOnly cookie. The token
 * endpoint reads this cookie instead of the raw invite — so the invite token
 * never travels in the room URL or gets re-read by client JS.
 * Depends on: node:crypto, next/headers, INVITE_LINK_SECRET.
 * Security notes:
 *   - httpOnly + Secure(prod) + SameSite=Strict; JS can never read it.
 *   - HMAC-signed with constant-time verification; expiry enforced server-side.
 *   - Server-only module.
 */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { requireEnv, isProduction } from "@/lib/env";
import type { MediaRole } from "./types";

export const GUEST_COOKIE = "qm_guest";

/** Grant carried by the guest cookie. */
export interface GuestGrant {
  roomId: string;
  role: Extract<MediaRole, "PARTICIPANT" | "GUEST">;
  name: string;
  /** Stable, non-guessable guest id → stable LiveKit identity across rejoins. */
  gid: string;
  exp: number;
}

/** Lifetime of a guest grant (matches a reasonable meeting session bound). */
const GUEST_GRANT_TTL_SECONDS = 4 * 60 * 60;

function b64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(part: string, secret: string): string {
  return createHmac("sha256", secret).update(part).digest("base64url");
}

/**
 * Signs a guest grant into a compact `payload.signature` string.
 * @param grant - Grant fields (exp is filled if omitted).
 * @returns Signed token. No side effects.
 */
function serializeGrant(grant: Omit<GuestGrant, "exp"> & { exp?: number }): string {
  const secret = requireEnv("INVITE_LINK_SECRET");
  const full: GuestGrant = {
    ...grant,
    exp: grant.exp ?? Math.floor(Date.now() / 1000) + GUEST_GRANT_TTL_SECONDS,
  };
  const part = b64url(JSON.stringify(full));
  return `${part}.${sign(part, secret)}`;
}

/**
 * Sets the guest-grant cookie.
 * @param grant - Verified roomId/role/name for this guest.
 * Side effects: mutates the response cookie jar.
 */
export function setGuestGrantCookie(grant: Omit<GuestGrant, "exp">): void {
  cookies().set(GUEST_COOKIE, serializeGrant(grant), {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: GUEST_GRANT_TTL_SECONDS,
  });
}

/**
 * Reads and verifies the guest-grant cookie.
 * @returns The grant, or null when absent/forged/expired. No side effects.
 */
export function readGuestGrant(): GuestGrant | null {
  const raw = cookies().get(GUEST_COOKIE)?.value;
  if (!raw || !raw.includes(".")) return null;

  const secret = requireEnv("INVITE_LINK_SECRET");
  const [part, signature] = raw.split(".");
  if (!part || !signature) return null;

  const expected = sign(part, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const grant = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as GuestGrant;
    if (grant.exp * 1000 < Date.now()) return null;
    if (grant.role !== "GUEST" && grant.role !== "PARTICIPANT") return null;
    if (typeof grant.gid !== "string" || !grant.gid) return null;
    return grant;
  } catch {
    return null;
  }
}

/** Clears the guest-grant cookie. Side effects: mutates the cookie jar. */
export function clearGuestGrantCookie(): void {
  cookies().set(GUEST_COOKIE, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
