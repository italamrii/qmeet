/**
 * src/components/site/DashboardContent.tsx
 */
"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Loader2, Plus, Shield, Video, Copy, Check } from "lucide-react";
import { SiteHeader } from "./SiteHeader";
import { JoinByCodeForm } from "./JoinByCodeForm";
import { MeetingCreatedModal, type CreatedRoomInfo } from "./MeetingCreatedModal";
import { meetingJoinUrl } from "@/lib/rooms/link";

interface DashboardData {
  user: { id: string; name: string; role: string };
  organization: { id: string; name: string; slug: string; plan: string; billingStatus: string } | null;
  rooms: {
    id: string;
    livekitName: string;
    roomCode: string;
    title: string;
    createdAt: string;
  }[];
  recentMeetings: {
    id: string;
    startedAt: string;
    endedAt: string | null;
    room: { id: string; title: string; livekitName: string };
  }[];
}

function RoomRow({
  room,
  locale,
}: {
  room: DashboardData["rooms"][number];
  locale: string;
}) {
  const t = useTranslations("dashboard");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const link = meetingJoinUrl(window.location.origin, locale, room.livekitName);

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
    <li className="rounded-lg border border-border/40 px-3 py-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{room.title}</span>
        <Link href={`/join/${room.livekitName}`} className="shrink-0 text-glow hover:underline">
          {t("join")}
        </Link>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono tracking-wide" dir="ltr">
          {room.roomCode}
        </span>
        <button type="button" onClick={copyCode} className="inline-flex items-center gap-1 rounded border px-2 py-0.5 hover:bg-secondary">
          {copiedCode ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copiedCode ? t("copied") : t("copyCode")}
        </button>
        <button type="button" onClick={copyLink} className="inline-flex items-center gap-1 rounded border px-2 py-0.5 hover:bg-secondary">
          {copiedLink ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copiedLink ? t("copied") : t("copyLink")}
        </button>
      </div>
    </li>
  );
}

export function DashboardContent() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [roomTitle, setRoomTitle] = useState("");
  const [createdRoom, setCreatedRoom] = useState<CreatedRoomInfo | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) setData(d as DashboardData);
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function createMeeting() {
    if (!roomTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: roomTitle.trim() }),
      });
      if (!res.ok) return;
      const { room } = (await res.json()) as { room: CreatedRoomInfo };
      setCreatedRoom(room);
      setRoomTitle("");
      const dash = await fetch("/api/dashboard").then((r) => r.json());
      setData(dash as DashboardData);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-glow" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      {createdRoom && (
        <MeetingCreatedModal room={createdRoom} onClose={() => setCreatedRoom(null)} />
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-header">
          {t("welcome", { name: data.user.name })}
        </h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="card-sheen rounded-xl border p-5 lg:col-span-2">
            <h2 className="flex items-center gap-2 font-semibold">
              <Video className="h-5 w-5 text-glow" aria-hidden />
              {t("startMeeting")}
            </h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                placeholder={t("roomTitlePlaceholder")}
                className="flex-1 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={createMeeting}
                disabled={creating || !roomTitle.trim()}
                className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {t("startNow")}
              </button>
            </div>
          </section>

          <section className="card-sheen rounded-xl border p-5">
            <h2 className="font-semibold">{t("freeBannerTitle")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("freeBannerHint")}</p>
          </section>
        </div>

        <section className="mt-6 rounded-xl border border-border/60 p-5">
          <JoinByCodeForm compact />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-border/60 p-5">
            <h2 className="font-semibold">{t("myRooms")}</h2>
            {data.rooms.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">{t("noRooms")}</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {data.rooms.map((r) => (
                  <RoomRow key={r.id} room={r} locale={locale} />
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border/60 p-5">
            <h2 className="font-semibold">{t("recentMeetings")}</h2>
            {data.recentMeetings.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">{t("noMeetings")}</p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {data.recentMeetings.map((m) => (
                  <li key={m.id}>{m.room.title}</li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {data.organization && (
            <section className="rounded-xl border border-border/60 p-5">
              <h2 className="font-semibold">{t("organization")}</h2>
              <p className="mt-2">{data.organization.name}</p>
            </section>
          )}
          <section className="rounded-xl border border-border/60 p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Shield className="h-4 w-4 text-glow" aria-hidden />
              {t("securityStatus")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("securityOk")}</p>
            <Link href="/security" className="mt-2 inline-block text-sm text-glow underline">
              {t("securityDetails")}
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
