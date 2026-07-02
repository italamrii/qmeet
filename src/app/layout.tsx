/**
 * src/app/layout.tsx
 * ------------------
 * Purpose: Root layout — intentionally minimal. All rendering happens under the
 * `[locale]` segment so next-intl controls <html lang> and dir (RTL/LTR).
 * Depends on: src/app/[locale]/layout.tsx.
 * Security notes: none.
 */
import type { ReactNode } from "react";

/**
 * Pass-through root layout; the locale layout owns <html>/<body>.
 * @param children - Locale-segment subtree.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
