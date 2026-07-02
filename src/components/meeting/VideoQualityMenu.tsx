/**
 * src/components/meeting/VideoQualityMenu.tsx
 * -------------------------------------------
 * Purpose: In-meeting local camera quality selector.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import type { VideoQualityPreset } from "@/lib/media/types";
import { cn } from "@/lib/utils";

const PRESETS: VideoQualityPreset[] = ["auto", "high", "medium", "low"];

const LABEL_KEYS: Record<VideoQualityPreset, string> = {
  auto: "qualityAuto",
  high: "qualityHigh",
  medium: "qualityMedium",
  low: "qualityLow",
};

export function VideoQualityMenu({
  current,
  onChange,
}: {
  current: VideoQualityPreset;
  onChange: (preset: VideoQualityPreset) => void;
}) {
  const t = useTranslations("room");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t("videoQuality")}
        title={t("videoQuality")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-secondary/60 text-foreground/85 transition-all hover:bg-secondary sm:h-12 sm:w-12",
          open && "border-glow/50 bg-glow-faint"
        )}
      >
        <SlidersHorizontal className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("videoQuality")}
          className="absolute bottom-full end-0 z-50 mb-2 min-w-[200px] rounded-xl border border-border/70 bg-card/95 p-1 shadow-lg backdrop-blur-md"
        >
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              role="menuitemradio"
              aria-checked={current === preset}
              onClick={() => {
                onChange(preset);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-secondary",
                current === preset && "text-glow"
              )}
            >
              {t(LABEL_KEYS[preset])}
              {current === preset && <span className="ms-auto text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
