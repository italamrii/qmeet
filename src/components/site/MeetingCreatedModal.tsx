/**
 * src/components/site/MeetingCreatedModal.tsx
 */
"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Copy, Check, X } from "lucide-react";
import { meetingJoinUrl } from "@/lib/rooms/link";

export interface CreatedRoomInfo {
  livekitName: string;
  roomCode: string;
  title: string;
}

export function MeetingCreatedModal({
  room,
  onClose,
}: {
  room: CreatedRoomInfo;
  onClose: () => void;
}) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const link =
    typeof window !== "undefined"
      ? meetingJoinUrl(window.location.origin, locale, room.livekitName)
      : "";

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  async function copyCode() {
    await navigator.clipboard.writeText(room.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="card-sheen w-full max-w-md rounded-xl border p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{t("meetingCreated")}</h2>
          <button type="button" onClick={onClose} aria-label={t("close")} className="rounded-md p-1 hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{room.title}</p>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t("meetingLink")}</p>
            <div className="mt-1 flex gap-2">
              <input readOnly value={link} className="flex-1 truncate rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs" dir="ltr" />
              <button type="button" onClick={copyLink} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-xs hover:bg-secondary">
                {copiedLink ? <Check className="h-3.5 w-3.5 text-glow" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedLink ? t("copied") : t("copyLink")}
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t("meetingCode")}</p>
            <div className="mt-1 flex gap-2">
              <input readOnly value={room.roomCode} className="flex-1 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm font-mono tracking-wider" dir="ltr" />
              <button type="button" onClick={copyCode} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-xs hover:bg-secondary">
                {copiedCode ? <Check className="h-3.5 w-3.5 text-glow" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedCode ? t("copied") : t("copyCode")}
              </button>
            </div>
          </div>
        </div>

        <Link
          href={`/join/${room.livekitName}`}
          className="mt-6 flex w-full items-center justify-center rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground"
        >
          {t("startMeetingBtn")}
        </Link>
      </div>
    </div>
  );
}
