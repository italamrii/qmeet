/**
 * src/lib/auth/signup-errors.ts
 * -----------------------------
 * Purpose: Signup error codes, safe diagnostics logging, and Zod → code mapping.
 * Security notes: never log passwords, hashes, secrets, or raw tokens.
 */
import "server-only";
import { Prisma } from "@prisma/client";
import type { ZodError } from "zod";
import { NextResponse } from "next/server";

/** Machine-readable signup error codes returned to the client. */
export type SignupErrorCode =
  | "DATABASE_NOT_CONFIGURED"
  | "DATABASE_UNAVAILABLE"
  | "EMAIL_ALREADY_EXISTS"
  | "PASSWORD_TOO_SHORT"
  | "COMPANY_NAME_REQUIRED"
  | "INVALID_EMAIL"
  | "INVALID_INPUT"
  | "RATE_LIMITED"
  | "SERVICE_NOT_CONFIGURED"
  | "UNEXPECTED_ERROR";

/** Safe diagnostics written to server logs only. */
export interface SignupFailureLog {
  code: SignupErrorCode;
  databaseConfigured: boolean;
  emailExists?: boolean;
  slugConflict?: boolean;
  prismaCode?: string;
}

/**
 * Logs signup failure with safe fields only.
 * @param diag - Non-sensitive diagnostic snapshot.
 */
export function logSignupFailure(diag: SignupFailureLog): void {
  console.error("[signup:failure]", JSON.stringify(diag));
}

/** True when DATABASE_URL is set and non-empty. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** True when JWT signing secrets are configured. */
export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.AUTH_ACCESS_TOKEN_SECRET?.trim() &&
      process.env.AUTH_REFRESH_TOKEN_SECRET?.trim()
  );
}

/**
 * Maps a Zod validation failure to a signup error code.
 * @param error - Zod safeParse error.
 */
export function signupCodeFromZod(error: ZodError): SignupErrorCode {
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (field === "password") return "PASSWORD_TOO_SHORT";
    if (field === "companyName") return "COMPANY_NAME_REQUIRED";
    if (field === "email") return "INVALID_EMAIL";
  }
  return "INVALID_INPUT";
}

/** True for Prisma known request errors. */
export function isPrismaKnownError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

/**
 * Maps Prisma errors to signup codes + safe log fields.
 * @param error - Caught Prisma error.
 */
export function signupCodeFromPrisma(error: unknown): {
  code: SignupErrorCode;
  prismaCode?: string;
  emailExists?: boolean;
  slugConflict?: boolean;
} {
  if (!isPrismaKnownError(error)) {
    return { code: "UNEXPECTED_ERROR" };
  }

  if (error.code === "P1001" || error.code === "P1000" || error.code === "P1017") {
    return { code: "DATABASE_UNAVAILABLE", prismaCode: error.code };
  }

  if (error.code === "P2002") {
    const target = String(error.meta?.target ?? "");
    if (target.includes("email")) {
      return { code: "EMAIL_ALREADY_EXISTS", prismaCode: error.code, emailExists: true };
    }
    if (target.includes("slug")) {
      return { code: "UNEXPECTED_ERROR", prismaCode: error.code, slugConflict: true };
    }
    return { code: "UNEXPECTED_ERROR", prismaCode: error.code };
  }

  if (error.code === "P2021" || error.code === "P2010") {
    return { code: "DATABASE_UNAVAILABLE", prismaCode: error.code };
  }

  return { code: "UNEXPECTED_ERROR", prismaCode: error.code };
}

/**
 * JSON error response with a machine-readable code for client i18n.
 * @param status - HTTP status.
 * @param code - SignupErrorCode.
 * @param retryAfterSeconds - Optional Retry-After header.
 */
export function signupJsonError(
  status: number,
  code: SignupErrorCode,
  retryAfterSeconds?: number
): NextResponse {
  const headers = new Headers();
  if (retryAfterSeconds && retryAfterSeconds > 0) {
    headers.set("Retry-After", String(retryAfterSeconds));
  }
  return NextResponse.json({ code, error: code }, { status, headers });
}
