/**
 * src/lib/env.ts
 * --------------
 * Purpose: Server-side environment variable access and app-environment helpers.
 * Depends on: process.env (documented in .env.example).
 * Security notes: server-only module — never import from client components.
 */
import "server-only";

/**
 * Returns a required environment variable or throws with a clear message.
 * @param name - Variable name as documented in .env.example.
 * @returns The value.
 * @throws Error if unset/empty — fail fast rather than run half-configured.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name} (see .env.example)`);
  }
  return value;
}

/** True when NODE_ENV is production (drives cookie `secure` flag, etc.). */
export const isProduction = process.env.NODE_ENV === "production";

/** Application environment: development | production (APP_ENV). */
export function getAppEnv(): "development" | "production" {
  return process.env.APP_ENV === "production" ? "production" : "development";
}

/** True when mock media is explicitly allowed (dev default, prod only via flag). */
export function isMockMediaEnabled(): boolean {
  if (getAppEnv() === "development") {
    return process.env.ENABLE_MOCK_MEDIA !== "false";
  }
  return process.env.ENABLE_MOCK_MEDIA === "true";
}
