/**
 * src/components/meeting/CameraOptionsMenu.tsx
 * --------------------------------------------
 * Purpose: Switch camera + mirror toggle (desktop dropdown / mobile accessible).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { FlipHorizontal, SwitchCamera } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LocalMediaState } from "@/lib/media/types";
import { cn } from "@/lib/utils";

export function CameraOptionsMenu({
  localMedia,
  cameraOn,
  onSwitchCamera,
  onToggleMirror,
}: {
  localMedia: LocalMediaState;
  cameraOn: boolean;
  onSwitchCamera: () => void;
  onToggleMirror: () => void;
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

  if (!cameraOn && !localMedia.supportsCameraSwitch) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t("cameraOptions")}
        title={t("cameraOptions")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-secondary/60 text-foreground/85 transition-all hover:bg-secondary sm:h-12 sm:w-12",
          open && "border-glow/50 bg-glow-faint"
        )}
      >
        <SwitchCamera className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full end-0 z-50 mb-2 min-w-[200px] rounded-xl border border-border/70 bg-card/95 p-1 shadow-lg backdrop-blur-md"
        >
          {localMedia.supportsCameraSwitch && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onSwitchCamera();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-secondary"
            >
              <SwitchCamera className="h-4 w-4 shrink-0" aria-hidden />
              {t("switchCamera")}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onToggleMirror();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-secondary"
          >
            <FlipHorizontal className="h-4 w-4 shrink-0" aria-hidden />
            {t("mirrorCamera")}
            {localMedia.mirrorCamera && (
              <span className="ms-auto text-xs text-glow">✓</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
