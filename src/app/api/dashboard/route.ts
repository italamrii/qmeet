/**
 * GET /api/dashboard — authenticated dashboard summary.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return jsonError(401, "Authentication required.");

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          billingStatus: true,
        },
      },
    },
  });

  const rooms = await prisma.room.findMany({
    where: {
      isActive: true,
      OR: [
        { createdById: user.id },
        ...(membership ? [{ organizationId: membership.organizationId }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, livekitName: true, roomCode: true, title: true, createdAt: true },
  });

  const recentMeetings = await prisma.meeting.findMany({
    where: {
      room: {
        OR: [
          { createdById: user.id },
          ...(membership ? [{ organizationId: membership.organizationId }] : []),
        ],
      },
    },
    orderBy: { startedAt: "desc" },
    take: 5,
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      room: { select: { id: true, title: true, livekitName: true } },
    },
  });

  return NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role },
    organization: membership?.organization ?? null,
    rooms,
    recentMeetings,
  });
}
