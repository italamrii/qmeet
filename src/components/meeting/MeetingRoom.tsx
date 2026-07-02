/**
 * src/components/meeting/MeetingRoom.tsx
 * --------------------------------------
 * Purpose: The full meeting experience — header (title, timer, connection,
 * recording), adaptive video grid, side panels (participants/chat), and the
 * control bar. Panels render inline on desktop and as a bottom drawer on
 * mobile. Depends ONLY on the media interfaces (lib/media) — never on LiveKit.
 * Depends on: use-mock-room hook, all meeting components, framer-motion.
 * Security notes: role comes in as a prop for the mock; Step 5 derives it
 * server-side from the session/invite and the LiveKit token grants.
 */
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useMockRoom } from "@/lib/media/use-mock-room";
import type { MediaRole } from "@/lib/media/types";
import { cn } from "@/lib/utils";
import { ChatPanel } from "./ChatPanel";
import { ConnectionBadge } from "./ConnectionBadge";
import { MeetingControls, type PanelKind } from "./MeetingControls";
import { MeetingTimer } from "./MeetingTimer";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { RecordingBadge } from "./RecordingBadge";
import { VideoGrid } from "./VideoGrid";

/**
 * The meeting room shell.
 * @param roomId - Room identifier from the URL.
 * @param displayName - Local user's display name.
 * @param role - Local user's media role (mock; server-derived in Step 5).
 * @param initialMicOn / initialCameraOn - Device choices from the join page.
 */
export function MeetingRoom({
  roomId,
  displayName,
  role,
  initialMicOn,
  initialCameraOn,
}: {
  roomId: string;
  displayName: string;
  role: MediaRole;
  initialMicOn: boolean;
  initialCameraOn: boolean;
}) {
  const t = useTranslations("room");
  const tBrand = useTranslations("common");
  const router = useRouter();
  const { room, client } = useMockRoom({
    roomId,
    displayName,
    role,
    initialMicOn,
    initialCameraOn,
  });
  const [openPanel, setOpenPanel] = useState<PanelKind>(null);

  const localParticipant = room.participants.find((p) => p.isLocal);
  const isHost = role === "HOST" || role === "CO_HOST";

  function togglePanel(panel: Exclude<PanelKind, null>) {
    setOpenPanel((current) => (current === panel ? null : panel));
  }

  function leave() {
    client.disconnect();
    router.push("/");
  }

  // --- Ended state ----------------------------------------------------------
  if (room.hasEnded) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-sheen flex flex-col items-center gap-4 rounded-xl border bg-card/60 px-10 py-12 text-center backdrop-blur-sm"
        >
          <h1 className="text-2xl font-semibold tracking-header">{t("meetingEnded")}</h1>
          <p className="max-w-sm text-sm text-muted-foreground">{t("meetingEndedHint")}</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
          >
            {t("backHome")}
          </button>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      {/* ---- Header ---- */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-card/40 px-3 backdrop-blur-md sm:px-5">
        <span className="hidden items-center gap-1.5 sm:flex">
          <span
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded-md bg-glow/15 text-xs font-bold text-glow"
          >
            Q
          </span>
          <span className="text-sm font-semibold tracking-wide text-foreground/95">
            {tBrand("appName")}
          </span>
        </span>
        <span aria-hidden className="hidden h-5 w-px bg-border/70 sm:block" />
        <h1 className="min-w-0 truncate text-sm font-semibold text-foreground">
          {t("mockTitle")}
        </h1>
        <div className="ms-auto flex items-center gap-2">
          {room.isRecording && <RecordingBadge />}
          <MeetingTimer startedAt={room.startedAt} />
          <ConnectionBadge state={room.connection} />
        </div>
      </header>

      {/* ---- Body: grid + side panel ---- */}
      <div className="flex min-h-0 flex-1">
        <section className="min-w-0 flex-1 p-3 sm:p-4">
          <VideoGrid participants={room.participants} activeSpeakerId={room.activeSpeakerId} />
        </section>

        {/* Side panel: inline column on lg+, bottom drawer on smaller screens */}
        <AnimatePresence>
          {openPanel && (
            <>
              {/* Mobile backdrop */}
              <motion.button
                type="button"
                aria-label={t("closePanel")}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpenPanel(null)}
                className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm lg:hidden"
              />
              <motion.aside
                key={openPanel}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={cn(
                  "z-40 flex flex-col bg-card/95 backdrop-blur-md",
                  // Mobile: bottom drawer
                  "fixed inset-x-0 bottom-0 h-[65dvh] rounded-t-2xl border-t border-border/70",
                  // Desktop: inline side column
                  "lg:static lg:h-auto lg:w-80 lg:shrink-0 lg:rounded-none lg:border-t-0 lg:border-s"
                )}
              >
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                  <h2 className="text-sm font-semibold tracking-wide">
                    {openPanel === "participants"
                      ? t("participantsWithCount", { count: room.participants.length })
                      : t("chat")}
                  </h2>
                  <button
                    type="button"
                    aria-label={t("closePanel")}
                    onClick={() => setOpenPanel(null)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-h-0 flex-1">
                  {openPanel === "participants" ? (
                    <ParticipantsPanel
                      participants={room.participants}
                      isHost={isHost}
                      onMuteParticipant={(id) => client.muteParticipant(id)}
                      onRemoveParticipant={(id) => client.removeParticipant(id)}
                    />
                  ) : (
                    <ChatPanel messages={room.messages} onSend={(text) => client.sendChatMessage(text)} />
                  )}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ---- Controls ---- */}
      {localParticipant && (
        <MeetingControls
          localParticipant={localParticipant}
          isHost={isHost}
          isRecording={room.isRecording}
          openPanel={openPanel}
          participantCount={room.participants.length}
          onToggleMic={() => client.toggleMicrophone()}
          onToggleCamera={() => client.toggleCamera()}
          onToggleShare={() => client.toggleScreenShare()}
          onToggleRecording={() => client.toggleRecording()}
          onTogglePanel={togglePanel}
          onLeave={leave}
          onEndMeeting={() => client.endMeeting()}
        />
      )}
    </main>
  );
}
