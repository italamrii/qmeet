/**
 * POST /api/auth/signup
 * ---------------------
 * Purpose: Create an account (email + password, argon2id) and start a session.
 * Auth requirement: none (public endpoint).
 * Input (JSON): { email: string, name: string, password: string(12–128) } —
 *   validated by signupSchema before anything touches the DB.
 * Responses:
 *   201 { user: { id, email, name, role } } + session cookies set
 *   400 invalid input · 409 account cannot be created · 429 rate limited
 * Rate limit: 5 attempts / 15 min per IP and per email.
 * Security notes: new accounts always get the PARTICIPANT role — role
 * elevation is an explicit ADMIN action, never self-service. Duplicate email
 * returns a generic message (enumeration resistance).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/passwords";
import { hashDeviceInfo } from "@/lib/auth/hashing";
import { signupSchema } from "@/lib/auth/schemas";
import { consumeAuthRateLimit } from "@/lib/auth/rate-limit";
import { signAccessToken, issueRefreshToken } from "@/lib/auth/tokens";
import { setAccessCookie, setRefreshCookie } from "@/lib/auth/cookies";
import { logAudit } from "@/lib/audit/log";
import { getClientIp, jsonError } from "@/lib/http";

// argon2 is a native module — force the Node.js runtime (not Edge).
export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(400, "Invalid signup data.");
  }
  const { email, name, password } = parsed.data;

  const limit = consumeAuthRateLimit("signup", getClientIp(request), email);
  if (!limit.allowed) {
    return jsonError(429, "Too many attempts. Try again later.", limit.retryAfterSeconds);
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    // Generic message — do not confirm which emails are registered.
    return jsonError(409, "Account could not be created.");
  }

  const user = await prisma.user.create({
    data: { email, name, passwordHash: await hashPassword(password) },
    select: { id: true, email: true, name: true, role: true, tokenVersion: true },
  });

  const refresh = await issueRefreshToken(
    user.id,
    hashDeviceInfo(request.headers.get("user-agent"))
  );
  const access = await signAccessToken({
    sub: user.id,
    role: user.role,
    name: user.name,
    tv: user.tokenVersion,
  });
  setAccessCookie(access);
  setRefreshCookie(refresh.token, refresh.expiresAt);

  await logAudit("USER_SIGNUP", user.id);

  return NextResponse.json(
    { user: { id: user.id, email: user.email, name: user.name, role: user.role } },
    { status: 201 }
  );
}
