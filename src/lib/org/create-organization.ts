/**
 * src/lib/org/create-organization.ts
 * ----------------------------------
 * Purpose: Create an organization with a collision-safe slug inside a transaction.
 */
import "server-only";
import type { BillingStatus, Prisma, SubscriptionPlan } from "@prisma/client";
import { uniqueOrgSlug } from "./slug";
import { isPrismaKnownError } from "@/lib/auth/signup-errors";

const MAX_SLUG_ATTEMPTS = 5;

/**
 * Creates an organization, retrying on slug unique-constraint conflicts.
 * @param tx - Prisma transaction client.
 * @param name - Display name (trimmed).
 * @param plan - Subscription tier.
 * @param billingStatus - Billing lifecycle state.
 */
export async function createOrganizationWithUniqueSlug(
  tx: Prisma.TransactionClient,
  name: string,
  plan: SubscriptionPlan,
  billingStatus: BillingStatus
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    try {
      return await tx.organization.create({
        data: {
          name,
          slug: uniqueOrgSlug(name),
          plan,
          billingStatus,
        },
      });
    } catch (error) {
      lastError = error;
      if (isPrismaKnownError(error) && error.code === "P2002") {
        const target = String(error.meta?.target ?? "");
        if (target.includes("slug")) continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("Organization slug generation failed.");
}
