/**
 * GET /api/auth/me
 * ----------------
 * Purpose: Return the authenticated caller's identity (session probe for the UI).
 * Auth requirement: valid access cookie.
 * Input: none.
 * Responses:
 *   200 { user: { id, name, role } }
 *   401 unauthenticated (generic)
 * Rate limit: none (read-only, cheap).
 * Security notes: returns only what the UI needs — no email unless required.
 */
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return jsonError(401, "Not authenticated.");
  }
  return NextResponse.json({ user });
}
