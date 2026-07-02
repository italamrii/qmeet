/**
 * src/lib/media/provider.ts
 * -------------------------
 * Purpose: SERVER-SIDE resolution of the active media provider.
 * Production requires LiveKit; mock is a development-only fallback unless
 * explicitly enabled via ENABLE_MOCK_MEDIA=true in production.
 * Depends on: lib/env, LIVEKIT_* env vars.
 * Security notes: server-only. Secrets never leave this layer.
 */
import "server-only";
import { getAppEnv, isMockMediaEnabled } from "@/lib/env";
import type { MediaProvider } from "./types";

export type { MediaProvider };

/** Result of provider resolution including configuration errors. */
export interface ProviderResolution {
  provider: MediaProvider;
  /** Set when production requires LiveKit but credentials are missing. */
  configurationError: string | null;
}

/**
 * True when every LiveKit credential required to mint tokens is present.
 * @returns boolean. No side effects.
 */
export function hasLiveKitCredentials(): boolean {
  return Boolean(
    process.env.LIVEKIT_URL &&
      process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET
  );
}

/**
 * Resolves the effective media provider with production rules.
 * @returns Provider + optional configuration error for admin UI.
 */
export function resolveMediaProvider(): ProviderResolution {
  const appEnv = getAppEnv();
  const mockAllowed = isMockMediaEnabled();
  const hasCreds = hasLiveKitCredentials();
  const requested = process.env.MEDIA_PROVIDER?.toLowerCase();

  // Production: LiveKit required unless mock explicitly enabled.
  if (appEnv === "production" && !mockAllowed) {
    if (!hasCreds) {
      return {
        provider: "livekit",
        configurationError:
          "LiveKit is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.",
      };
    }
    return { provider: "livekit", configurationError: null };
  }

  // Development or mock explicitly enabled in production.
  if (requested === "livekit" && hasCreds) {
    return { provider: "livekit", configurationError: null };
  }

  if (mockAllowed) {
    return { provider: "mock", configurationError: null };
  }

  if (!hasCreds) {
    return {
      provider: "mock",
      configurationError: null,
    };
  }

  return { provider: "livekit", configurationError: null };
}

/** Convenience: returns just the provider id. */
export function getMediaProvider(): MediaProvider {
  return resolveMediaProvider().provider;
}
