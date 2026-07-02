/**
 * src/lib/auth/rate-limit.ts
 * --------------------------
 * Purpose: Fixed-window rate limiter for auth endpoints (login/signup/refresh).
 * Depends on: in-process Map (single-instance MVP).
 * Security notes:
 *   - Keyed on BOTH client IP and normalized email, so an attacker can't
 *     bypass an email lockout by rotating IPs, nor lock out a victim's IP pool.
 *   - SCALING NOTE (documented in SECURITY.md): this store is per-process.
 *     Before running multiple instances, swap `MemoryStore` for Redis
 *     (e.g. `rate-limiter-flexible` with ioredis) — the interface is 1 method.
 *   - Limits are deliberately conservative: 5 attempts / 15 min window.
 */
import "server-only";

interface WindowEntry {
  count: number;
  resetAt: number;
}

/** Per-process fixed-window counter store. Swap for Redis when scaling out. */
const store = new Map<string, WindowEntry>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/** Result of a rate-limit check. */
export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets — surface as Retry-After. */
  retryAfterSeconds: number;
}

/**
 * Consumes one attempt for a key; denies once the window budget is exhausted.
 * @param key - Namespaced key, e.g. "login:ip:1.2.3.4" or "login:email:a@b.c".
 * @returns Whether the attempt is allowed + retry hint.
 * Side effects: mutates the in-process counter store.
 */
export function consumeRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Convenience: checks IP-keyed and email-keyed budgets together.
 * @param scope - Endpoint scope ("login" | "signup" | "refresh").
 * @param ip - Client IP (from x-forwarded-for behind the TLS proxy).
 * @param email - Normalized (lowercased) email, optional.
 * @returns Denies if EITHER budget is exhausted.
 * Side effects: consumes one attempt from each applicable budget.
 */
export function consumeAuthRateLimit(
  scope: string,
  ip: string,
  email?: string
): RateLimitResult {
  const byIp = consumeRateLimit(`${scope}:ip:${ip}`);
  if (!byIp.allowed) return byIp;
  if (email) {
    const byEmail = consumeRateLimit(`${scope}:email:${email}`);
    if (!byEmail.allowed) return byEmail;
  }
  return { allowed: true, retryAfterSeconds: 0 };
}
