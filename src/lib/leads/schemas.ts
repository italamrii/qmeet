/**
 * src/lib/leads/schemas.ts
 * ------------------------
 * Purpose: Zod schemas for sales lead capture.
 */
import { z } from "zod";

const planInterest = z.enum(["FREE", "TEAM", "BUSINESS"]).optional();

export const leadSchema = z.object({
  name: z.string().trim().min(1).max(100),
  company: z.string().trim().min(1).max(150),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().max(30).optional(),
  companySize: z.string().trim().max(50).optional(),
  message: z.string().trim().max(2000).optional(),
  planInterest,
});

export type LeadInput = z.infer<typeof leadSchema>;
