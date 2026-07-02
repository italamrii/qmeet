/**
 * src/lib/org/slug.ts
 * -------------------
 * Purpose: Generate URL-safe organization slugs from company names.
 */
import "server-only";

/** Converts a company name to a lowercase hyphenated slug. */
export function slugifyCompanyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "org";
}

/** Appends a short random suffix to avoid slug collisions. */
export function uniqueOrgSlug(name: string): string {
  const base = slugifyCompanyName(name);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
