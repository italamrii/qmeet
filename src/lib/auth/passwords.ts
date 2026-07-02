/**
 * src/lib/auth/passwords.ts
 * -------------------------
 * Purpose: Password hashing/verification with argon2id.
 * Depends on: argon2 (native module — Node.js runtime only, not Edge).
 * Security notes:
 *   - argon2id chosen over bcrypt: memory-hard + side-channel-hardened,
 *     no 72-byte truncation (rationale: SECURITY.md §Password hashing).
 *   - Parameters follow the OWASP Password Storage Cheat Sheet baseline:
 *     19 MiB memory, timeCost 2, parallelism 1.
 *   - Never log plaintext passwords or hashes.
 */
import "server-only";
import argon2 from "argon2";

/** OWASP baseline parameters for argon2id. Tune upward if latency budget allows. */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // KiB = 19 MiB
  timeCost: 2,
  parallelism: 1,
};

/**
 * Hashes a plaintext password with argon2id.
 * @param password - Plaintext password (already length-validated by Zod).
 * @returns Encoded argon2id hash string (includes salt + parameters).
 * Side effects: none.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verifies a plaintext password against a stored argon2id hash.
 * @param hash - Stored encoded hash.
 * @param password - Plaintext candidate.
 * @returns true if the password matches; false otherwise (never throws on mismatch).
 * Side effects: none.
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    // Malformed hash — treat as verification failure, never leak details.
    return false;
  }
}
