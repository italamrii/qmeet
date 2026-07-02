/**
 * src/app/[locale]/room/[roomId]/page.tsx
 * ---------------------------------------
 * Purpose: The meeting room route (/ar/room/[roomId], /en/room/[roomId]).
 * Reads join preferences from the query string and mounts the MeetingRoom
 * shell on the mock media layer.
 * Depends on: MeetingRoom, next-intl.
 * Security notes: the local role is mocked here (HOST by default so host
 * controls are reviewable; `?guest=1` previews the participant view). In
 * Step 5 the role is derived SERVER-SIDE from the session or verified invite
 * and enforced through LiveKit token grants — never from a query param.
 */
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MeetingRoom } from "@/components/meeting/MeetingRoom";
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

  return (
    <MeetingRoom
      roomId={roomId}
      displayName={displayName}
      role={role}
      initialMicOn={searchParams.mic !== "0"}
      initialCameraOn={searchParams.cam !== "0"}
    />
  );
}
