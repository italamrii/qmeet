/**
 * POST /api/auth/refresh
 * ----------------------
 * Purpose: Rotate the refresh token and mint a fresh 15-min access token.
 * Auth requirement: valid refresh cookie (path-scoped to /api/auth).
 * Input: none (token read from the httpOnly cookie — never from the body).
 * Responses:
 *   200 { ok: true } + rotated cookies
 *   401 invalid/expired/replayed token (cookies cleared) · 429 rate limited
 * Rate limit: 5 attempts / 15 min per IP (defends the rotation endpoint itself).
 * Security notes: replay of a used token revokes the WHOLE FAMILY inside
 * rotateRefreshToken — the response is still a generic 401 (no oracle).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rotateRefreshToken, signAccessToken } from "@/lib/auth/tokens";
import {
  readRefreshCookie,
  setAccessCookie,
  setRefreshCookie,
  clearSessionCookies,
} from "@/lib/auth/cookies";
import { consumeAuthRateLimit } from "@/lib/auth/rate-limit";
import { getClientIp, jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const limit = consumeAuthRateLimit("refresh", getClientIp(request));
  if (!limit.allowed) {
    return jsonError(429, "Too many attempts. Try again later.", limit.retryAfterSeconds);
  }

  const token = readRefreshCookie();
  if (!token) {
    return jsonError(401, "Not authenticated.");
  }

  const rotated = await rotateRefreshToken(token);
  if (!rotated) {
    clearSessionCookies();
    return jsonError(401, "Not authenticated.");
  }

  const user = await prisma.user.findUnique({
    where: { id: rotated.userId },
    select: { id: true, role: true, name: true, tokenVersion: true },
  });
  if (!user) {
    clearSessionCookies();
    return jsonError(401, "Not authenticated.");
  }

  const access = await signAccessToken({
    sub: user.id,
    role: user.role,
    name: user.name,
    tv: user.tokenVersion,
  });
  setAccessCookie(access);
  setRefreshCookie(rotated.refreshed.token, rotated.refreshed.expiresAt);

  return NextResponse.json({ ok: true });
}
