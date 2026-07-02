/**
 * src/lib/db.ts
 * -------------
 * Purpose: Prisma client singleton (avoids connection exhaustion from Next.js
 * dev-mode hot reloads).
 * Depends on: @prisma/client, DATABASE_URL.
 * Security notes: ALL database access goes through this client — parameterized
 * queries only. `$queryRawUnsafe` is banned project-wide (SECURITY.md §Database).
 */
import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
