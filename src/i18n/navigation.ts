/**
 * src/i18n/navigation.ts
 * ----------------------
 * Purpose: Locale-aware navigation primitives (Link, redirect, usePathname,
 * useRouter) bound to the app's routing config.
 * Depends on: src/i18n/routing.ts, next-intl/navigation.
 * Security notes: none.
 */
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
