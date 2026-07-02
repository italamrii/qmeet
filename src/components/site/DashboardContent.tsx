/**
 * src/components/site/DashboardContent.tsx
 */
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Loader2, Plus, Shield, Video } from "lucide-react";
import { SiteHeader } from "./SiteHeader";

interface DashboardData {
  user: { id: string; name: string; role: string };
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    billingStatus: string;
  } | null;
  rooms: { id: string; livekitName: string; title: string; createdAt: string }[];
  recentMeetings: {
    id: string;
    startedAt: string;
    endedAt: string | null;
    room: { id: string; title: string; livekitName: string };
  }[];
}

export function DashboardContent() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [roomTitle, setRoomTitle] = useState("");

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

  async function startMeeting() {
    if (!roomTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: roomTitle.trim() }),
      });
      if (!res.ok) return;
      const { room } = (await res.json()) as { room: { livekitName: string } };
      router.push(`/join/${room.livekitName}`);
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-header">
          {t("welcome", { name: data.user.name })}
        </h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Start meeting */}
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
                onClick={startMeeting}
                disabled={creating || !roomTitle.trim()}
                className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {t("startNow")}
              </button>
            </div>
          </section>

          {/* Plan card */}
          <section className="card-sheen rounded-xl border p-5">
            <h2 className="font-semibold">{t("currentPlan")}</h2>
            <p className="mt-2 text-xl text-glow">{data.organization?.plan ?? "FREE"}</p>
            {data.organization?.billingStatus === "PENDING_CONTACT" && (
              <p className="mt-2 text-xs text-muted-foreground">{t("pendingActivation")}</p>
            )}
            <Link href="/plans" className="mt-4 inline-block text-sm text-glow underline underline-offset-4">
              {t("viewPlans")}
            </Link>
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* My rooms */}
          <section className="rounded-xl border border-border/60 p-5">
            <h2 className="font-semibold">{t("myRooms")}</h2>
            {data.rooms.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">{t("noRooms")}</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {data.rooms.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-sm">
                    <span>{r.title}</span>
                    <Link href={`/join/${r.livekitName}`} className="text-glow hover:underline">
                      {t("join")}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent meetings */}
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
