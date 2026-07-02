/**
 * GET /api/health/env
 * -------------------
 * Purpose: Production-safe environment configuration check (booleans only).
 * Use after Railway deploy to verify runtime env injection without exposing secrets.
 */
import { NextResponse } from "next/server";
import { getEnvHealthSnapshot } from "@/lib/env-diagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(getEnvHealthSnapshot());
}
