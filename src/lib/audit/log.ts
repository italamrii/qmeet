/**
 * src/lib/audit/log.ts
 * --------------------
 * Purpose: Append-only audit trail writer (SECURITY.md §Audit logging).
 * Depends on: prisma (AuditLog table).
 * Security notes: records event + actor + target + timestamp ONLY — never
 * payloads, message content, or raw device data (data minimization).
 * Audit writes must never take the primary operation down: failures are
 * logged to stderr and swallowed.
 */
import "server-only";
import type { AuditEventType } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Writes one audit event.
 * @param eventType - One of the AuditEventType enum values.
 * @param actorId - Acting user ID; null for system/guest-originated events.
 * @param targetId - Affected entity ID (roomId/meetingId/recordingId); optional.
 * Side effects: one DB insert; stderr log on failure (never throws).
 */
export async function logAudit(
  eventType: AuditEventType,
  actorId: string | null,
  targetId?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { eventType, actorId, targetId: targetId ?? null },
    });
  } catch (error) {
    console.error(`[audit] failed to record ${eventType}`, error);
  }
}
