/**
 * src/lib/utils.ts
 * ----------------
 * Purpose: Shared UI utilities (shadcn/ui convention).
 * Depends on: clsx, tailwind-merge.
 * Security notes: none.
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class names, resolving conflicts (shadcn/ui `cn` helper).
 * @param inputs - Class values (strings, arrays, conditionals).
 * @returns Merged class string. No side effects.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
