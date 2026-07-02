/**
 * POST /api/leads
 * ---------------
 * Purpose: Capture contact-sales / plan inquiry submissions.
 * Auth: none (public). Rate limited per IP.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { leadSchema } from "@/lib/leads/schemas";
import { logAudit } from "@/lib/audit/log";
import { getClientIp, jsonError } from "@/lib/http";
import { consumeAuthRateLimit } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = leadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(400, "Invalid form data.");
  }

  const limit = consumeAuthRateLimit("signup", getClientIp(request), parsed.data.email);
  if (!limit.allowed) {
    return jsonError(429, "Too many attempts. Try again later.", limit.retryAfterSeconds);
  }

  const lead = await prisma.lead.create({ data: parsed.data });
  await logAudit("LEAD_CREATED", null, lead.id);

  return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
}
