/**
 * POST /api/auth/signup
 * ---------------------
 * Purpose: Create account + organization and start a session.
 * Creates User, Organization, and OrganizationMember (OWNER) in one transaction.
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
import { getClientIp } from "@/lib/http";
import {
  isAuthConfigured,
  isDatabaseConfigured,
  logSignupFailure,
  signupCodeFromPrisma,
  signupCodeFromZod,
  signupJsonError,
} from "@/lib/auth/signup-errors";
import { createOrganizationWithUniqueSlug } from "@/lib/org/create-organization";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const databaseConfigured = isDatabaseConfigured();
  const authConfigured = isAuthConfigured();

  if (!databaseConfigured) {
    logSignupFailure({ code: "DATABASE_NOT_CONFIGURED", databaseConfigured: false });
    return signupJsonError(503, "DATABASE_NOT_CONFIGURED");
  }

  if (!authConfigured) {
    logSignupFailure({ code: "SERVICE_NOT_CONFIGURED", databaseConfigured: true });
    return signupJsonError(503, "SERVICE_NOT_CONFIGURED");
  }

  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    const code = signupCodeFromZod(parsed.error);
    logSignupFailure({ code, databaseConfigured: true });
    return signupJsonError(400, code);
  }

  const { email, name, password, companyName, plan } = parsed.data;

  const limit = consumeAuthRateLimit("signup", getClientIp(request), email);
  if (!limit.allowed) {
    logSignupFailure({ code: "RATE_LIMITED", databaseConfigured: true });
    return signupJsonError(429, "RATE_LIMITED", limit.retryAfterSeconds);
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      logSignupFailure({ code: "EMAIL_ALREADY_EXISTS", databaseConfigured: true, emailExists: true });
      return signupJsonError(409, "EMAIL_ALREADY_EXISTS");
    }

    const billingStatus = plan === "BUSINESS" ? "PENDING_CONTACT" : "ACTIVE";
    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, name, passwordHash },
        select: { id: true, email: true, name: true, role: true, tokenVersion: true },
      });

      const org = await createOrganizationWithUniqueSlug(tx, companyName, plan, billingStatus);

      await tx.organizationMember.create({
        data: { userId: created.id, organizationId: org.id, role: "OWNER" },
      });

      return created;
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
    await logAudit("ORG_CREATED", user.id);

    return NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name, role: user.role } },
      { status: 201 }
    );
  } catch (error) {
    const mapped = signupCodeFromPrisma(error);
    logSignupFailure({
      code: mapped.code,
      databaseConfigured: true,
      emailExists: mapped.emailExists,
      slugConflict: mapped.slugConflict,
      prismaCode: mapped.prismaCode,
    });
    const status =
      mapped.code === "EMAIL_ALREADY_EXISTS"
        ? 409
        : mapped.code === "DATABASE_UNAVAILABLE"
          ? 503
          : 500;
    return signupJsonError(status, mapped.code);
  }
}
