/**
 * src/lib/auth/tokens.ts
 * ----------------------
 * Purpose: JWT access tokens (15 min) + refresh tokens with rotation and
 * FAMILY-scoped reuse detection (RefreshToken table).
 * Depends on: jose (HS256 signing), prisma (RefreshToken persistence),
 * AUTH_ACCESS_TOKEN_SECRET / AUTH_REFRESH_TOKEN_SECRET.
 * Security notes:
 *   - Access and refresh tokens use SEPARATE secrets → independent rotation.
 *   - Refresh rotation: every use marks the row `used` and mints a successor
 *     in the same family. Replay of a used token revokes ONLY that family —
 *     other devices/sessions of the user stay logged in (SECURITY.md
 *     §Application tokens). User.tokenVersion remains the global kill-switch.
 *   - jti is crypto-random (UUID v4); tokens are never logged.
 */
import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireEnv } from "@/lib/env";

/** Access token lifetime — short by design (SECURITY.md). */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
/** Refresh token lifetime — bounded session length before full re-login. */
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Claims carried by an access token. Kept minimal — no PII beyond name. */
export interface AccessTokenPayload {
  /** User ID. */
  sub: string;
  /** Platform-wide role, used for coarse authorization checks. */
  role: Role;
  /** Display name (avoids a DB read for pure-UI needs). */
  name: string;
  /** Mirror of User.tokenVersion — mismatch means globally revoked. */
  tv: number;
}

/** Result of issuing/rotating a refresh token. */
export interface IssuedRefreshToken {
  token: string;
  familyId: string;
  expiresAt: Date;
}

const encoder = new TextEncoder();

function accessSecret(): Uint8Array {
  return encoder.encode(requireEnv("AUTH_ACCESS_TOKEN_SECRET"));
}

function refreshSecret(): Uint8Array {
  return encoder.encode(requireEnv("AUTH_REFRESH_TOKEN_SECRET"));
}

/**
 * Signs a 15-minute access token.
 * @param payload - Access claims (sub, role, name, tv).
 * @returns Signed compact JWT. Side effects: none.
 */
export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ role: payload.role, name: payload.name, tv: payload.tv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(accessSecret());
}

/**
 * Verifies an access token signature + expiry AND the tokenVersion kill-switch.
 * @param token - Compact JWT from the access cookie.
 * @returns Payload if valid and not globally revoked; null otherwise.
 * Side effects: one DB read (tokenVersion check).
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret());
    const sub = payload.sub;
    if (!sub || typeof payload.tv !== "number") return null;

    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: { tokenVersion: true },
    });
    if (!user || user.tokenVersion !== payload.tv) return null;

    return {
      sub,
      role: payload.role as Role,
      name: String(payload.name ?? ""),
      tv: payload.tv,
    };
  } catch {
    return null;
  }
}

/**
 * Issues a brand-new refresh token, starting a new rotation family
 * (called at login/signup — one family per device/session).
 * @param userId - Owner.
 * @param deviceInfoHash - SHA-256 of the user-agent (nullable, never raw).
 * @returns Signed refresh JWT + family metadata.
 * Side effects: inserts a RefreshToken row.
 */
export async function issueRefreshToken(
  userId: string,
  deviceInfoHash: string | null
): Promise<IssuedRefreshToken> {
  return mintRefreshToken(userId, randomUUID(), deviceInfoHash);
}

/**
 * Rotates a refresh token: validates it, marks it used, mints a successor in
 * the same family. Detects replay of already-used tokens.
 * @param token - Refresh JWT presented by the client cookie.
 * @returns New refresh token + the userId, or null if the token is invalid,
 *          expired, revoked — or replayed (in which case the family is revoked).
 * Side effects: DB writes (mark used / revoke family / insert successor).
 */
export async function rotateRefreshToken(
  token: string
): Promise<{ refreshed: IssuedRefreshToken; userId: string } | null> {
  let jti: string;
  try {
    const { payload } = await jwtVerify(token, refreshSecret());
    if (!payload.jti || !payload.sub) return null;
    jti = payload.jti;
  } catch {
    return null;
  }

  const row = await prisma.refreshToken.findUnique({ where: { id: jti } });
  if (!row) return null;
  if (row.revokedAt || row.expiresAt < new Date()) return null;

  if (row.used) {
    // REPLAY DETECTED: a rotated-out token was presented again. Revoke the
    // whole family (this device/session lineage) — other sessions survive.
    await revokeFamily(row.familyId);
    return null;
  }

  const [, refreshed] = await prisma.$transaction([
    prisma.refreshToken.update({ where: { id: row.id }, data: { used: true } }),
    // Successor keeps the family + device hash so lineage stays traceable.
    prisma.refreshToken.create({
      data: {
        id: randomUUID(),
        userId: row.userId,
        familyId: row.familyId,
        deviceInfo: row.deviceInfo,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      },
    }),
  ]);

  const signed = await signRefreshJwt(refreshed.id, row.userId, refreshed.expiresAt);
  return {
    refreshed: { token: signed, familyId: row.familyId, expiresAt: refreshed.expiresAt },
    userId: row.userId,
  };
}

/**
 * Revokes every non-revoked token in a rotation family (logout, replay detection).
 * @param familyId - Family to revoke.
 * Side effects: bulk DB update.
 */
export async function revokeFamily(familyId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Extracts the family of a refresh token WITHOUT rotating it (used by logout).
 * @param token - Refresh JWT.
 * @returns familyId or null if the token can't be verified.
 * Side effects: one DB read.
 */
export async function getRefreshTokenFamily(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, refreshSecret());
    if (!payload.jti) return null;
    const row = await prisma.refreshToken.findUnique({
      where: { id: payload.jti },
      select: { familyId: true },
    });
    return row?.familyId ?? null;
  } catch {
    return null;
  }
}

/** Persists a new RefreshToken row and signs the matching JWT. */
async function mintRefreshToken(
  userId: string,
  familyId: string,
  deviceInfoHash: string | null
): Promise<IssuedRefreshToken> {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  const row = await prisma.refreshToken.create({
    data: {
      id: randomUUID(),
      userId,
      familyId,
      deviceInfo: deviceInfoHash,
      expiresAt,
    },
  });
  const token = await signRefreshJwt(row.id, userId, expiresAt);
  return { token, familyId, expiresAt };
}

/** Signs the refresh JWT for a persisted row (jti = row id). */
async function signRefreshJwt(jti: string, userId: string, expiresAt: Date): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(refreshSecret());
}
