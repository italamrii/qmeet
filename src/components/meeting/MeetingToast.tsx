/**
 * src/components/meeting/MeetingToast.tsx
 * ---------------------------------------
 * Purpose: Non-blocking meeting notifications (chat, media alerts).
 */
"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function MeetingToast({
  message,
  onDismiss,
  className,
}: {
  message: string | null;
  onDismiss: () => void;
  className?: string;
}) {
  const t = useTranslations("room");

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 4500);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className={cn(
            "pointer-events-auto fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-start gap-2 rounded-xl border border-border/70 bg-card/95 px-4 py-3 text-sm shadow-lg backdrop-blur-md sm:bottom-28",
            className
          )}
        >
          <span className="min-w-0 flex-1 leading-snug">{message}</span>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label={t("closePanel")}
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
