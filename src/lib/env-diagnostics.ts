/**
 * src/lib/env-diagnostics.ts
 * ----------------------------
 * Purpose: Production-safe environment diagnostics (booleans only, never values).
 * Depends on: signup-errors, media/provider, env.
 * Security notes: never log or return secret values or connection strings.
 */
import "server-only";
import { isAuthConfigured, isDatabaseConfigured } from "@/lib/auth/signup-errors";
import { getAppEnv } from "@/lib/env";
import { hasLiveKitCredentials } from "@/lib/media/provider";

/** Snapshot returned by GET /api/health/env — booleans and env labels only. */
export interface EnvHealthSnapshot {
  ok: boolean;
  appEnv: string;
  nodeEnv: string;
  databaseConfigured: boolean;
  livekitConfigured: boolean;
  authSecretsConfigured: boolean;
  inviteSecretConfigured: boolean;
}

/** True when INVITE_LINK_SECRET is set (guest invite links). */
export function isInviteSecretConfigured(): boolean {
  return Boolean(process.env.INVITE_LINK_SECRET?.trim());
}

/**
 * Builds a safe env health snapshot for operators and health checks.
 * @returns Booleans only — never includes DATABASE_URL or other secrets.
 */
export function getEnvHealthSnapshot(): EnvHealthSnapshot {
  const databaseConfigured = isDatabaseConfigured();
  const authSecretsConfigured = isAuthConfigured();
  const livekitConfigured = hasLiveKitCredentials();
  const inviteSecretConfigured = isInviteSecretConfigured();

  return {
    ok:
      databaseConfigured &&
      authSecretsConfigured &&
      livekitConfigured &&
      inviteSecretConfigured,
    appEnv: getAppEnv(),
    nodeEnv: process.env.NODE_ENV ?? "development",
    databaseConfigured,
    livekitConfigured,
    authSecretsConfigured,
    inviteSecretConfigured,
  };
}

/** One-line startup diagnostic for Railway/deploy logs (no secret values). */
export function logEnvStartupDiagnostics(): void {
  const snapshot = getEnvHealthSnapshot();
  console.info("[env:startup]", {
    appEnv: snapshot.appEnv,
    nodeEnv: snapshot.nodeEnv,
    databaseConfigured: snapshot.databaseConfigured,
    livekitConfigured: snapshot.livekitConfigured,
    authSecretsConfigured: snapshot.authSecretsConfigured,
    inviteSecretConfigured: snapshot.inviteSecretConfigured,
  });
}
