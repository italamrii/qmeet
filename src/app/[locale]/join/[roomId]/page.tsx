/**
 * src/app/[locale]/join/[roomId]/page.tsx
 * ---------------------------------------
 * Purpose: Pre-join route (/ar/join/[roomId], /en/join/[roomId]) — device
 * check + name entry before entering the room.
 * Depends on: JoinCard, next-intl.
 * Security notes:
 *   - The invite token is verified HERE on the server; only a verdict
 *     ("guest" | "member" | "invalid") reaches the client — the raw token is
 *     never rendered into the page or stored client-side.
 *   - Step 4 uses a mock verdict; Step 5/6 replaces `mockInviteVerdict` with
 *     real HMAC signature + expiry verification (INVITE_LINK_SECRET) and a
 *     Room.invitesRevoked check.
 */
import { setRequestLocale } from "next-intl/server";
import { JoinCard, type InviteStatus } from "@/components/meeting/JoinCard";

/**
 * MOCK invite verification (Step 4 only).
 * Contract mirrors the real verifier: token in, verdict out.
 * - no token → "member" (authenticated account join)
 * - token "expired" / "invalid" → "invalid" (renders the error state)
 * - any other token → "guest" (valid signed invite)
 * @param inviteToken - Raw `invite` query param (unvalidated input).
 * @returns Verdict only — never the token. No side effects.
 */
function mockInviteVerdict(inviteToken: string | undefined): InviteStatus {
  if (!inviteToken) return "member";
  if (inviteToken === "expired" || inviteToken === "invalid") return "invalid";
  return "guest";
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
  const inviteStatus = mockInviteVerdict(searchParams.invite);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <JoinCard roomId={roomId} inviteStatus={inviteStatus} />
    </main>
  );
}
