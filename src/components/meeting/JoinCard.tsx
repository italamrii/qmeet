/**
 * src/components/meeting/JoinCard.tsx
 * -----------------------------------
 * Purpose: Pre-join card — branding, room title, display-name (+ optional guest
 * email), camera/mic preference toggles, an optional real device preview
 * (LiveKit mode only), and the join action. Handles the invalid/expired invite
 * state and the guest-grant exchange.
 * Depends on: DeviceToggle, ParticipantAvatar, useDevicePreview, i18n nav.
 * Security notes:
 *   - Session probe via GET /api/auth/me (httpOnly cookie); nothing session-
 *     related touches localStorage.
 *   - The raw invite token is never rendered; for a guest it is POSTed once to
 *     /api/livekit/guest, which sets an httpOnly grant cookie — so it does not
 *     travel onward in the room URL.
 *   - Real camera/mic are only accessed on an explicit click (Test button) or
 *     after Join. Mock mode is fully permission-free.
 */
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ShieldCheck,
  LinkIcon,
  ArrowLeft,
  Camera,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { MediaProvider } from "@/lib/media/types";
import { useDevicePreview } from "@/lib/media/use-device-preview";
import { DeviceToggle } from "./DeviceToggle";
import { ParticipantAvatar } from "./ParticipantAvatar";

/** Invite verdict computed server-side by the page (raw token never rendered). */
export type InviteStatus = "member" | "guest" | "invalid";

/**
 * The join page card.
 * @param roomId - Room identifier from the URL.
 * @param inviteStatus - "guest" (valid invite), "member" (account join), or
 *   "invalid" (expired/forged → error state).
 * @param provider - Active media provider ("mock" | "livekit").
 * @param inviteToken - Raw invite token, present only for a valid guest; used
 *   solely to exchange for a guest-grant cookie on join.
 */
export function JoinCard({
  roomId,
  inviteStatus,
  provider,
  inviteToken,
}: {
  roomId: string;
  inviteStatus: InviteStatus;
  provider: MediaProvider;
  inviteToken?: string;
}) {
  const t = useTranslations("join");
  const tBrand = useTranslations("common");
  const router = useRouter();
  const preview = useDevicePreview();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const isLiveKit = provider === "livekit";

  // Best-effort session probe: prefill the display name for signed-in members.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: { name?: string } } | null) => {
        if (!cancelled && data?.user?.name) {
          setSessionName(data.user.name);
          setName((current) => current || data.user?.name || "");
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Invalid / expired invite state --------------------------------------
  if (inviteStatus === "invalid") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-sheen flex w-full max-w-md flex-col items-center gap-4 rounded-xl border bg-card/60 px-8 py-12 text-center backdrop-blur-sm"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10">
          <LinkIcon aria-hidden className="h-5 w-5 text-red-400" />
        </span>
        <h1 className="text-xl font-semibold tracking-header">{t("invalidInvite")}</h1>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          {t("invalidInviteHint")}
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex items-center gap-2 rounded-full border border-border/70 px-5 py-2 text-sm text-foreground/85 transition-colors hover:bg-secondary"
        >
          <ArrowLeft aria-hidden className="h-4 w-4 rtl:-scale-x-100" />
          {t("backHome")}
        </Link>
      </motion.div>
    );
  }

  // ---- Normal join flow -----------------------------------------------------
  const isGuest = inviteStatus === "guest" && !sessionName;

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(true);
      return;
    }
    setJoinError(null);
    setJoining(true);

    // Release any local preview device before entering the room (the room
    // re-acquires devices itself based on the toggles below).
    preview.stop();

    try {
      // Guest + LiveKit: exchange the invite for an httpOnly grant cookie so
      // the raw token does not travel in the room URL.
      if (isLiveKit && isGuest && inviteToken) {
        const res = await fetch("/api/livekit/guest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, invite: inviteToken, displayName: trimmed }),
        });
        if (!res.ok) {
          setJoining(false);
          setJoinError(t("joinFailed"));
          return;
        }
      }

      const params = new URLSearchParams({
        name: trimmed,
        cam: cameraOn ? "1" : "0",
        mic: micOn ? "1" : "0",
      });
      if (isGuest) params.set("guest", "1");
      router.push(`/room/${roomId}?${params.toString()}`);
    } catch {
      setJoining(false);
      setJoinError(t("joinFailed"));
    }
  }

  const showRealPreview = isLiveKit && preview.status === "active";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="card-sheen grid w-full max-w-3xl gap-8 rounded-xl border bg-card/60 p-6 backdrop-blur-sm sm:p-8 lg:grid-cols-[1fr_320px]"
    >
      {/* ---- Preview column ---- */}
      <div className="flex flex-col gap-3">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/60 bg-tile-sheen">
          {showRealPreview ? (
            <>
              <video
                ref={preview.videoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />
              <span className="absolute start-2 top-2 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-glow animate-pulse-live" />
                {t("previewLive")}
              </span>
            </>
          ) : cameraOn ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_35%,hsl(var(--glow)/0.08),transparent)]" />
              <ParticipantAvatar id={`preview-${roomId}`} name={name || "؟"} className="h-20 w-20 text-2xl" />
              <span className="text-xs text-muted-foreground">{t("cameraPreview")}</span>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-background/40">
              <VideoOff aria-hidden className="h-8 w-8 text-muted-foreground/60" />
              <span className="text-xs text-muted-foreground">{t("previewOff")}</span>
            </div>
          )}
        </div>

        {/* Real device preview control — LiveKit mode only, permission on click */}
        {isLiveKit && (
          <div className="flex flex-col gap-1.5">
            {preview.status === "active" ? (
              <button
                type="button"
                onClick={preview.stop}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-xs text-foreground/85 transition-colors hover:bg-secondary"
              >
                <VideoOff aria-hidden className="h-3.5 w-3.5" />
                {t("stopTest")}
              </button>
            ) : (
              <button
                type="button"
                onClick={preview.start}
                disabled={preview.status === "requesting"}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-glow/30 bg-glow-faint px-3 py-2 text-xs text-accent-foreground transition-colors hover:bg-glow/15 disabled:opacity-60"
              >
                {preview.status === "requesting" ? (
                  <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera aria-hidden className="h-3.5 w-3.5" />
                )}
                {t("testDevices")}
              </button>
            )}
            {preview.status === "denied" && (
              <p className="text-xs text-red-400">{t("permissionDenied")}</p>
            )}
          </div>
        )}

        {/* Browser-permissions security note */}
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground/80">
          <ShieldCheck aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-glow/70" />
          {t("permissionsNote")}
        </p>
      </div>

      {/* ---- Form column ---- */}
      <form onSubmit={handleJoin} className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide2 text-glow/90">
            {tBrand("appName")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-header">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("roomLabel")}: {roomId}
          </p>
        </div>

        {/* Join context chip */}
        <span
          className={cn(
            "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[11px]",
            "border-glow/25 bg-glow-faint text-accent-foreground"
          )}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-glow" />
          {sessionName ? t("joinAsMemberNote", { name: sessionName }) : t("joinAsGuestNote")}
        </span>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-foreground/85">{t("displayName")}</span>
          <input
            type="text"
            dir="auto"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameError(false);
            }}
            placeholder={t("displayNamePlaceholder")}
            maxLength={100}
            aria-invalid={nameError}
            className={cn(
              "h-11 rounded-lg border bg-secondary/40 px-3 text-sm text-foreground placeholder:text-muted-foreground/60",
              nameError ? "border-destructive/60" : "border-input"
            )}
          />
          {nameError && <span className="text-xs text-red-400">{t("nameRequired")}</span>}
        </label>

        {isGuest && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-foreground/85">{t("guestEmail")}</span>
            <input
              type="email"
              dir="ltr"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("guestEmailPlaceholder")}
              maxLength={254}
              className="h-11 rounded-lg border border-input bg-secondary/40 px-3 text-sm text-foreground placeholder:text-muted-foreground/60"
            />
          </label>
        )}

        <div className="flex flex-col gap-2">
          <DeviceToggle
            label={t("cameraOn")}
            enabled={cameraOn}
            onChange={setCameraOn}
            OnIcon={Video}
            OffIcon={VideoOff}
          />
          <DeviceToggle
            label={t("micOn")}
            enabled={micOn}
            onChange={setMicOn}
            OnIcon={Mic}
            OffIcon={MicOff}
          />
        </div>

        {joinError && <p className="text-xs text-red-400">{joinError}</p>}

        <button
          type="submit"
          disabled={joining}
          className="mt-1 flex h-12 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-glow-sm transition-all hover:shadow-glow disabled:opacity-70"
        >
          {joining && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
          {t("joinNow")}
        </button>
      </form>
    </motion.div>
  );
}
