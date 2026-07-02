/**
 * src/components/meeting/DeviceToggle.tsx
 * ---------------------------------------
 * Purpose: Labeled camera/mic pre-join toggle (join page device check).
 * Accessible: real button with aria-pressed + visible on/off state.
 * Depends on: next-intl, lucide-react.
 * Security notes: none — this only records the user's PREFERENCE; actual
 * device access (getUserMedia) happens in Step 5 behind browser permissions.
 */
"use client";

import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One device preference toggle row.
 * @param label - Localized control label (e.g. "Camera on").
 * @param enabled - Current preference.
 * @param onChange - Preference setter.
 * @param OnIcon / OffIcon - Icons for each state.
 */
export function DeviceToggle({
  label,
  enabled,
  onChange,
  OnIcon,
  OffIcon,
}: {
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  OnIcon: LucideIcon;
  OffIcon: LucideIcon;
}) {
  const t = useTranslations("join");
  const Icon = enabled ? OnIcon : OffIcon;

  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label={label}
      onClick={() => onChange(!enabled)}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-sm transition-all",
        enabled
          ? "border-glow/40 bg-glow-faint text-foreground shadow-glow-sm"
          : "border-border/70 bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
      )}
    >
      <Icon aria-hidden className={cn("h-4 w-4", enabled ? "text-glow" : "text-red-400/70")} />
      <span className="flex-1 text-start">{label}</span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
          enabled ? "bg-glow/15 text-accent-foreground" : "bg-secondary text-muted-foreground"
        )}
      >
        {enabled ? t("on") : t("off")}
      </span>
    </button>
  );
}
