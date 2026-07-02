/**
 * src/app/[locale]/join/[roomId]/page.tsx
 * ---------------------------------------
 * Purpose: Pre-join route (/ar/join/[roomId], /en/join/[roomId]) — device
 * check + name entry before entering the room.
 * Depends on: JoinCard, resolveMediaProvider, verifyInviteToken, next-intl.
 * Security notes:
 *   - The invite token is verified HERE on the server (HMAC signature + expiry
 *     + room match). Only a verdict ("guest" | "member" | "invalid") is used
 *     for rendering; the raw token is passed to JoinCard solely so it can be
 *     exchanged (once, over POST) for an httpOnly guest-grant cookie — it is
 *     never rendered into the DOM or written to client storage.
 *   - In mock mode any non-empty invite is treated as a valid guest link so the
 *     demo guest flow is reviewable without configuring INVITE_LINK_SECRET.
 */
import { setRequestLocale } from "next-intl/server";
import { JoinCard, type InviteStatus } from "@/components/meeting/JoinCard";
import { getMediaProvider, resolveMediaProvider } from "@/lib/media/provider";
import { verifyInviteToken } from "@/lib/media/invite";

/**
 * Computes the invite verdict for the requested room.
 * @param invite - Raw `invite` query param (unvalidated).
 * @param roomId - Room the invite must match.
 * @param provider - Active media provider.
 * @returns "member" (no invite), "guest" (valid), or "invalid". No side effects.
 */
function inviteVerdict(
  invite: string | undefined,
  roomId: string,
  provider: "mock" | "livekit"
): InviteStatus {
  if (!invite) return "member";
  if (provider === "mock") {
    // Mock: keep the reviewable demo behaviour (explicit sentinels are invalid).
    return invite === "expired" || invite === "invalid" ? "invalid" : "guest";
  }
  // LiveKit: real HMAC verification, scoped to this room.
  return verifyInviteToken(invite, roomId) ? "guest" : "invalid";
}

/**
 * Join page.
 * @param params.locale - Active locale. @param params.roomId - Target room.
 * @param searchParams.invite - Optional invite token (verified server-side).
 */
export default function JoinPage({
  params: { locale, roomId },
  searchParams,
}: {
  params: { locale: string; roomId: string };
  searchParams: { invite?: string };
}) {
  setRequestLocale(locale);
  const provider = getMediaProvider();
  const inviteStatus = inviteVerdict(searchParams.invite, roomId, provider);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <JoinCard
        roomId={roomId}
        inviteStatus={inviteStatus}
        provider={provider}
        inviteToken={inviteStatus === "guest" ? searchParams.invite : undefined}
      />
    </main>
  );
}
