/**
 * src/lib/rooms/schemas.ts
 * ------------------------
 * Purpose: Zod schemas for room management API.
 */
import { z } from "zod";

export const createRoomSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
