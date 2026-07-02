/**
 * src/components/meeting/RecordingBadge.tsx
 * -----------------------------------------
 * Purpose: Pulsing "recording" indicator shown to ALL participants whenever
 * recording is active (transparency requirement — nobody is recorded
 * without a visible indicator).
 * Depends on: next-intl, framer-motion.
 * Security notes: none.
 */
"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

/** Recording-active pill with a pulsing red dot. */
export function RecordingBadge() {
  const t = useTranslations("room");
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      role="status"
      className="inline-flex items-center gap-2 rounded-full border border-live/40 bg-live/10 px-3 py-1 text-xs font-medium text-red-300 shadow-live"
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-live animate-pulse-live" />
      {t("recording")}
    </motion.span>
  );
}
