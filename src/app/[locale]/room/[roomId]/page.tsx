/**
 * src/app/[locale]/room/[roomId]/page.tsx
 * ---------------------------------------
 * Purpose: The meeting room route (/ar/room/[roomId], /en/room/[roomId]).
 * Reads join preferences from the query string and mounts the MeetingRoom
 * shell on the resolved media provider (mock or LiveKit).
 * Depends on: MeetingRoom, resolveMediaProvider, next-intl.
 * Security notes: in LiveKit mode the authoritative role is set SERVER-SIDE in
 * the token (via /api/livekit/token) and reflected by the connected client —
 * the `role` prop here is only a mock-mode fallback (HOST default; `?guest=1`
 * previews the participant view), never a security boundary.
 */
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MeetingRoom } from "@/components/meeting/MeetingRoom";
import { getMediaProvider, resolveMediaProvider } from "@/lib/media/provider";
import type { MediaRole } from "@/lib/media/types";

/**
 * Room page.
 * @param params.locale / params.roomId - Locale + room from the URL.
 * @param searchParams.name - Display name chosen on the join page.
 * @param searchParams.cam / searchParams.mic - Initial device preferences.
 * @param searchParams.guest - Mock: preview the guest (non-host) experience.
 */
export default async function RoomPage({
  params: { locale, roomId },
  searchParams,
}: {
  params: { locale: string; roomId: string };
  searchParams: { name?: string; cam?: string; mic?: string; guest?: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("room");

  const displayName = searchParams.name?.trim().slice(0, 100) || t("guestFallback");
  const role: MediaRole = searchParams.guest === "1" ? "GUEST" : "HOST";
  const { provider, configurationError } = resolveMediaProvider();

  if (configurationError) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
        <div className="card-sheen max-w-md rounded-xl border bg-card/60 px-8 py-10 text-center backdrop-blur-sm">
          <h1 className="text-xl font-semibold tracking-header">{t("configErrorTitle")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{t("configErrorHint")}</p>
        </div>
      </main>
    );
  }

  return (
    <MeetingRoom
      provider={provider}
      roomId={roomId}
      roomTitle={roomId}
      displayName={displayName}
      role={role}
      initialMicOn={searchParams.mic === "1"}
      initialCameraOn={searchParams.cam === "1"}
    />
  );
}
