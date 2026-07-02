/**
 * src/lib/media/chat-sound.ts
 * ---------------------------
 * Purpose: Optional subtle chat notification sound (best-effort, no throw).
 */
"use client";

let audioCtx: AudioContext | null = null;

/** Short soft beep when a remote chat message arrives. Fails silently if blocked. */
export function playChatNotificationSound(): void {
  if (typeof window === "undefined") return;
  try {
    audioCtx ??= new AudioContext();
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    void ctx.resume();
  } catch {
    /* autoplay or Web Audio unavailable */
  }
}
