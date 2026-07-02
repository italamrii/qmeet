/**
 * src/components/meeting/MeetingControls.tsx
 * ------------------------------------------
 * Purpose: Bottom control bar — mic, camera, screen share, recording (host),
 * participants/chat panel toggles, leave, and end-meeting (host).
 * Every control has an aria-label; toggles expose aria-pressed.
 * Depends on: lib/media/types, next-intl, lucide-react.
 * Security notes: host controls are UI-gated here; real authority comes from
 * server-minted LiveKit grants in Step 5 (never trust the client).
 */
"use client";

import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  Users,
  MessageSquare,
  PhoneOff,
  Disc,
  Square,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { LocalMediaState, MediaParticipant } from "@/lib/media/types";
import { cn } from "@/lib/utils";
import { CameraOptionsMenu } from "./CameraOptionsMenu";

export type PanelKind = "participants" | "chat" | null;

/** Round control button with active/danger variants and required labeling. */
function ControlButton({
  label,
  onClick,
  pressed,
  variant = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  variant?: "default" | "danger" | "active";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full border transition-all sm:h-12 sm:w-12",
        variant === "default" &&
          "border-border/70 bg-secondary/60 text-foreground/85 hover:bg-secondary",
        variant === "active" &&
          "border-glow/50 bg-glow-faint text-accent-foreground shadow-glow-sm",
        variant === "danger" && "border-destructive/50 bg-destructive/20 text-red-300"
      )}
    >
      {children}
    </button>
  );
}

/**
 * The meeting control bar.
 * @param localParticipant - The local participant (device states).
 * @param isHost - Whether host-only controls render.
 * @param isRecording - Recording state (host toggle).
 * @param openPanel - Currently open side panel.
 * @param onToggleMic/-Camera/-Share/-Recording - Media actions.
 * @param onTogglePanel - Opens/closes a side panel.
 * @param onLeave - Local leave. @param onEndMeeting - Host: end for everyone.
 */
export function MeetingControls({
  localParticipant,
  isHost,
  isRecording,
  openPanel,
  participantCount,
  onToggleMic,
  onToggleCamera,
  onToggleShare,
  onToggleRecording,
  onTogglePanel,
  onLeave,
  onEndMeeting,
  localMedia,
  onSwitchCamera,
  onToggleMirror,
  onUnlockAudio,
}: {
  localParticipant: MediaParticipant;
  isHost: boolean;
  isRecording: boolean;
  openPanel: PanelKind;
  participantCount: number;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleShare: () => void;
  onToggleRecording: () => void;
  onTogglePanel: (panel: Exclude<PanelKind, null>) => void;
  onLeave: () => void;
  onEndMeeting: () => void;
  localMedia: LocalMediaState;
  onSwitchCamera: () => void;
  onToggleMirror: () => void;
  onUnlockAudio: () => void;
}) {
  const t = useTranslations("room");
  const { isMuted, isCameraOn, isScreenSharing } = localParticipant;

  return (
    <div
      className="card-sheen flex items-center justify-center gap-2 border-t border-border/60 bg-card/70 px-3 py-3 backdrop-blur-md sm:gap-3"
      onPointerDown={onUnlockAudio}
    >
      {/* Device controls */}
      <ControlButton
        label={isMuted ? t("unmuteMic") : t("muteMic")}
        pressed={!isMuted}
        variant={isMuted ? "danger" : "default"}
        onClick={onToggleMic}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </ControlButton>

      <ControlButton
        label={isCameraOn ? t("cameraOffAction") : t("cameraOnAction")}
        pressed={isCameraOn}
        variant={isCameraOn ? "default" : "danger"}
        onClick={onToggleCamera}
      >
        {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </ControlButton>

      {(localMedia.supportsCameraSwitch || isCameraOn) && (
        <CameraOptionsMenu
          localMedia={localMedia}
          cameraOn={isCameraOn}
          onSwitchCamera={onSwitchCamera}
          onToggleMirror={onToggleMirror}
        />
      )}

      <ControlButton
        label={isScreenSharing ? t("stopSharing") : t("shareScreen")}
        pressed={isScreenSharing}
        variant={isScreenSharing ? "active" : "default"}
        onClick={onToggleShare}
      >
        {isScreenSharing ? (
          <ScreenShareOff className="h-5 w-5" />
        ) : (
          <ScreenShare className="h-5 w-5" />
        )}
      </ControlButton>

      {isHost && (
        <ControlButton
          label={isRecording ? t("stopRecording") : t("startRecording")}
          pressed={isRecording}
          variant={isRecording ? "danger" : "default"}
          onClick={onToggleRecording}
        >
          {isRecording ? <Square className="h-5 w-5" /> : <Disc className="h-5 w-5" />}
        </ControlButton>
      )}

      <span aria-hidden className="mx-1 hidden h-8 w-px bg-border/70 sm:block" />

      {/* Panels */}
      <div className="relative">
        <ControlButton
          label={t("participantsWithCount", { count: participantCount })}
          pressed={openPanel === "participants"}
          variant={openPanel === "participants" ? "active" : "default"}
          onClick={() => onTogglePanel("participants")}
        >
          <Users className="h-5 w-5" />
        </ControlButton>
        <span
          aria-hidden
          className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-glow/40 bg-background px-1 text-[10px] font-semibold text-accent-foreground"
        >
          {participantCount}
        </span>
      </div>

      <ControlButton
        label={t("chat")}
        pressed={openPanel === "chat"}
        variant={openPanel === "chat" ? "active" : "default"}
        onClick={() => onTogglePanel("chat")}
      >
        <MessageSquare className="h-5 w-5" />
      </ControlButton>

      <span aria-hidden className="mx-1 hidden h-8 w-px bg-border/70 sm:block" />

      {/* Leave / end */}
      <button
        type="button"
        aria-label={t("leaveMeeting")}
        title={t("leaveMeeting")}
        onClick={onLeave}
        className="flex h-11 items-center gap-2 rounded-full bg-destructive px-4 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/85 sm:h-12 sm:px-5"
      >
        <PhoneOff className="h-5 w-5" />
        <span className="hidden sm:inline">{t("leaveMeeting")}</span>
      </button>

      {isHost && (
        <button
          type="button"
          aria-label={t("endMeeting")}
          title={t("endMeeting")}
          onClick={onEndMeeting}
          className="hidden h-11 items-center rounded-full border border-destructive/50 px-4 text-sm text-red-300 transition-colors hover:bg-destructive/15 sm:flex sm:h-12"
        >
          {t("endMeeting")}
        </button>
      )}
    </div>
  );
}
