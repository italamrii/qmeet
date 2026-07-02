/**
 * POST /api/auth/logout
 * ---------------------
 * Purpose: End the current session — revoke this device's refresh-token
 * family and clear both cookies. Other devices/sessions stay logged in.
 * Auth requirement: refresh cookie (best-effort: always clears cookies).
 * Input: none.
 * Responses: 200 { ok: true } always (idempotent — logging out twice is fine).
 * Rate limit: none (destructive only toward the caller's own session).
 * Security notes: family-scoped revocation means the access token remains
 * technically valid up to 15 min; UI treats logout as immediate. For a
 * global "log out everywhere", ADMIN increments User.tokenVersion.
 */
import { NextResponse } from "next/server";
import { getRefreshTokenFamily, revokeFamily } from "@/lib/auth/tokens";
import { readRefreshCookie, clearSessionCookies } from "@/lib/auth/cookies";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  const token = readRefreshCookie();
  if (token) {
    const familyId = await getRefreshTokenFamily(token);
    if (familyId) {
      await revokeFamily(familyId);
    }
  }
  clearSessionCookies();
  return NextResponse.json({ ok: true });
}
