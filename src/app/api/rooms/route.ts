/**
 * POST /api/rooms — create a meeting room (authenticated).
 * GET  /api/rooms — list rooms for the current user's organization.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { createRoomSchema } from "@/lib/rooms/schemas";
import { generateRoomCode } from "@/lib/rooms/code";
import { logAudit } from "@/lib/audit/log";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

const roomSelect = {
  id: true,
  livekitName: true,
  roomCode: true,
  title: true,
  createdAt: true,
} as const;

async function uniqueRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRoomCode();
    const taken = await prisma.room.findUnique({ where: { roomCode: code }, select: { id: true } });
    if (!taken) return code;
  }
  throw new Error("Room code generation failed.");
}

export async function GET(): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return jsonError(401, "Authentication required.");

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    include: {
      organization: {
        include: {
          rooms: {
            where: { isActive: true },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: roomSelect,
          },
        },
      },
    },
  });

  const rooms =
    membership?.organization.rooms ??
    (await prisma.room.findMany({
      where: { createdById: user.id, isActive: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: roomSelect,
    }));

  return NextResponse.json({ rooms });
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return jsonError(401, "Authentication required.");

  const parsed = createRoomSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Invalid room data.");

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  });

  const livekitName = `room-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const roomCode = await uniqueRoomCode();

  const room = await prisma.room.create({
    data: {
      title: parsed.data.title,
      livekitName,
      roomCode,
      createdById: user.id,
      organizationId: membership?.organizationId ?? null,
    },
    select: roomSelect,
  });

  await logAudit("ROOM_CREATED", user.id, room.id);

  return NextResponse.json({ room }, { status: 201 });
}
