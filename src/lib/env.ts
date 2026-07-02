/**
 * src/lib/env.ts
 * --------------
 * Purpose: Server-side environment variable access with fail-fast validation.
 * Depends on: process.env (documented in .env.example).
 * Security notes: server-only module — never import from client components.
 * Secrets are read lazily so `next build` succeeds without a populated .env.
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

/** True when running in production mode (drives cookie `secure` flag, etc.). */
export const isProduction = process.env.NODE_ENV === "production";
