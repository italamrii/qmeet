/**
 * POST /api/auth/login
 * --------------------
 * Purpose: Verify credentials (argon2id) and start a session
 * (15-min access cookie + new refresh-token family).
 * Auth requirement: none (public endpoint).
 * Input (JSON): { email: string, password: string } — validated by loginSchema.
 * Responses:
 *   200 { user: { id, email, name, role } } + session cookies set
 *   400 invalid input · 401 invalid credentials (generic) · 429 rate limited
 * Rate limit: 5 attempts / 15 min per IP and per email.
 * Security notes: identical 401 for unknown-email vs wrong-password
 * (enumeration resistance); a dummy argon2 verification runs on unknown
 * emails to reduce the timing side-channel.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/auth/passwords";
import { hashDeviceInfo } from "@/lib/auth/hashing";
import { loginSchema } from "@/lib/auth/schemas";
import { consumeAuthRateLimit } from "@/lib/auth/rate-limit";
import { signAccessToken, issueRefreshToken } from "@/lib/auth/tokens";
import { setAccessCookie, setRefreshCookie } from "@/lib/auth/cookies";
import { logAudit } from "@/lib/audit/log";
import { getClientIp, jsonError } from "@/lib/http";

// argon2 is a native module — force the Node.js runtime (not Edge).
export const runtime = "nodejs";

/** Precomputed hash of a random value — verified against on unknown emails so
 * both branches cost one argon2 verification (timing-side-channel reduction). */
let dummyHashPromise: Promise<string> | null = null;
function dummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword("dummy-timing-equalizer-password");
  return dummyHashPromise;
}

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(400, "Invalid login data.");
  }
  const { email, password } = parsed.data;

  const limit = consumeAuthRateLimit("login", getClientIp(request), email);
  if (!limit.allowed) {
    return jsonError(429, "Too many attempts. Try again later.", limit.retryAfterSeconds);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  let valid = false;
  if (user) {
    valid = await verifyPassword(user.passwordHash, password);
  } else {
    // Burn one argon2 verification anyway — keeps unknown-email and
    // wrong-password branches at similar wall time (timing side-channel).
    await verifyPassword(await dummyHash(), password);
  }

  if (!user || !valid) {
    return jsonError(401, "Invalid email or password.");
  }

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

  await logAudit("USER_LOGIN", user.id);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
