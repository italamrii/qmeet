/**
 * POST /api/rooms/resolve — resolve a meeting code to a joinable room id.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeRoomCode, isValidRoomCodeFormat } from "@/lib/rooms/code";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

const schema = z.object({
  code: z.string().trim().min(1).max(20),
});

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ code: "INVALID_CODE" }, { status: 400 });
  }

  const normalized = normalizeRoomCode(parsed.data.code);
  if (!isValidRoomCodeFormat(normalized)) {
    return NextResponse.json({ code: "INVALID_CODE" }, { status: 404 });
  }

  const room = await prisma.room.findFirst({
    where: { roomCode: normalized, isActive: true },
    select: { livekitName: true, title: true, roomCode: true },
  });

  if (!room) {
    return NextResponse.json({ code: "INVALID_CODE" }, { status: 404 });
  }

  return NextResponse.json({
    livekitName: room.livekitName,
    title: room.title,
    roomCode: room.roomCode,
  });
}
