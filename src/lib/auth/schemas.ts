/**
 * src/lib/auth/schemas.ts
 * -----------------------
 * Purpose: Zod input schemas for auth endpoints — the ONLY path by which
 * client input reaches auth logic (SECURITY.md §Input validation).
 * Depends on: zod.
 * Security notes:
 *   - Password policy: 12–128 chars (government-adjacent baseline; length over
 *     composition rules, per NIST SP 800-63B).
 *   - Email is normalized to lowercase to prevent duplicate-account tricks.
 */
import { z } from "zod";

/** POST /api/auth/signup body. */
export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(12).max(128),
});
export type SignupInput = z.infer<typeof signupSchema>;

/** POST /api/auth/login body. */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;
