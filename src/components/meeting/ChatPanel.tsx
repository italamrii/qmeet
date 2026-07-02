/**
 * src/components/meeting/ChatPanel.tsx
 * ------------------------------------
 * Purpose: In-room chat panel — message list + composer. Step 4 is local mock
 * state; Step 5 sends via LiveKit data channels (no DB persistence either way).
 * Depends on: lib/media/types, next-intl, lucide-react.
 * Security notes: message text is rendered as React text nodes (auto-escaped,
 * no injection surface). Timestamps render only after mount (hydration safety).
 */
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ChatMessage } from "@/lib/media/types";
import { cn } from "@/lib/utils";

/** Client-only time label (avoids SSR/client timezone hydration mismatch). */
function MessageTime({ sentAt }: { sentAt: string }) {
  const locale = useLocale();
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(
      new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(
        new Date(sentAt)
      )
    );
  }, [locale, sentAt]);
  return (
    <time dateTime={sentAt} className="text-[10px] text-muted-foreground/70">
      {label}
    </time>
  );
}

/**
 * Chat message list + composer.
 * @param messages - Ordered chat history from the room snapshot.
 * @param onSend - Sends a message (mock append in Step 4).
 */
export function ChatPanel({
  messages,
  onSend,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}) {
  const t = useTranslations("room");
  const [draft, setDraft] = useState("");
  const listEndRef = useRef<HTMLDivElement | null>(null);

  // Keep the newest message in view.
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Message list */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3" role="log" aria-label={t("chat")}>
        {messages.length === 0 && (
          <p className="pt-8 text-center text-xs text-muted-foreground">{t("noMessages")}</p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex flex-col gap-0.5", message.isLocal ? "items-end" : "items-start")}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-medium text-accent-foreground/90">
                {message.isLocal ? t("you") : message.senderName}
              </span>
              <MessageTime sentAt={message.sentAt} />
            </div>
            <p
              dir="auto"
              className={cn(
                "max-w-[85%] rounded-xl px-3 py-1.5 text-sm leading-relaxed",
                message.isLocal
                  ? "rounded-se-sm bg-glow-faint text-foreground"
                  : "rounded-ss-sm bg-secondary/70 text-foreground/90"
              )}
            >
              {message.text}
            </p>
          </div>
        ))}
        <div ref={listEndRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-border/60 p-3"
      >
        <input
          type="text"
          dir="auto"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("typeMessage")}
          aria-label={t("typeMessage")}
          maxLength={1000}
          className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-secondary/40 px-3 text-sm text-foreground placeholder:text-muted-foreground/60"
        />
        <button
          type="submit"
          aria-label={t("send")}
          title={t("send")}
          disabled={!draft.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
        >
          <Send className="h-4 w-4 rtl:-scale-x-100" />
        </button>
      </form>
    </div>
  );
}
