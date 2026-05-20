"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, MessageCircle, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { ChatMessage, User } from "@/types/domain";
import type { ChatBootstrapPayload, ChatThreadSummary } from "@/lib/chat/service";

type ChatDockAssistantProps = {
  enabled: boolean;
  unreadCount: number;
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ChatDockAssistant({ enabled, unreadCount }: ChatDockAssistantProps) {
  const [open, setOpen] = useState(false);
  const [bootstrap, setBootstrap] = useState<ChatBootstrapPayload | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const usersById = useMemo(() => new Map((bootstrap?.users ?? []).map((u) => [u.id, u])), [bootstrap?.users]);
  const selectedThread = bootstrap?.threads.find((thread) => thread.thread.id === selectedThreadId) ?? null;

  const refreshBootstrap = useCallback(async () => {
    if (!enabled) return;
    const res = await fetch("/api/chat/bootstrap", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as ChatBootstrapPayload;
    setBootstrap(payload);
    if (!selectedThreadId && payload.threads[0]) {
      setSelectedThreadId(payload.threads[0].thread.id);
    }
  }, [enabled, selectedThreadId]);

  useEffect(() => {
    if (!enabled) return;
    void refreshBootstrap();
    const id = window.setInterval(() => void refreshBootstrap(), 7000);
    return () => window.clearInterval(id);
  }, [enabled, refreshBootstrap]);

  useEffect(() => {
    if (!enabled || !open || !selectedThreadId) return;
    let cancelled = false;
    const loadMessages = async () => {
      const res = await fetch(`/api/chat/threads/${selectedThreadId}/messages`, { cache: "no-store" });
      if (!res.ok) return;
      const payload = (await res.json()) as { items: ChatMessage[] };
      if (cancelled) return;
      setMessages(payload.items);
      const last = payload.items[payload.items.length - 1];
      if (last) {
        void fetch(`/api/chat/threads/${selectedThreadId}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lastReadMessageId: last.id }),
        });
      }
    };
    void loadMessages();
    const id = window.setInterval(() => void loadMessages(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, open, selectedThreadId]);

  async function handleSend() {
    if (!selectedThreadId || !draft.trim()) return;
    const res = await fetch(`/api/chat/threads/${selectedThreadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft.trim() }),
    });
    if (!res.ok) {
      toast.error("No se pudo enviar el mensaje.");
      return;
    }
    setDraft("");
    await refreshBootstrap();
  }

  if (!enabled) return null;

  const visibleThreads = bootstrap?.threads ?? [];
  const previewMembers = visibleThreads
    .slice(0, 3)
    .map((thread) => thread.memberIds.find((id) => id !== bootstrap?.meUserId))
    .filter((id): id is string => Boolean(id))
    .map((id) => usersById.get(id))
    .filter((u): u is User => Boolean(u));

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[min(96vw,430px)] flex-col items-end gap-2">
      {open ? (
        <section className="pointer-events-auto surface-card flex h-[min(72vh,560px)] w-full overflow-hidden bg-card">
          <aside className="w-[44%] border-r border-border bg-card p-2">
            <p className="px-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Mensajes</p>
            <div className="max-h-full space-y-1 overflow-y-auto pr-1">
              {visibleThreads.map((thread) => (
                <button
                  key={thread.thread.id}
                  type="button"
                  className={`w-full rounded-[2px] border px-2 py-1.5 text-left transition-colors ${
                    thread.thread.id === selectedThreadId
                      ? "border-primary bg-primary/15 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]"
                      : "border-border bg-card hover:border-primary/45 hover:bg-accent/25"
                  }`}
                  onClick={() => setSelectedThreadId(thread.thread.id)}
                >
                  <p className="truncate text-xs font-semibold text-foreground">{thread.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{thread.lastMessage?.body ?? "Sin mensajes"}</p>
                  {thread.unreadCount > 0 ? (
                    <span className="mt-1 inline-flex rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                      {thread.unreadCount}
                    </span>
                  ) : null}
                </button>
              ))}
              {visibleThreads.length === 0 ? (
                <p className="rounded-[2px] border border-dashed border-border px-2 py-3 text-[11px] text-muted-foreground">
                  Sin conversaciones.
                </p>
              ) : null}
            </div>
          </aside>
          <div className="flex min-w-0 flex-1 flex-col bg-card">
            <header className="border-b border-border px-3 py-2">
              <p className="truncate text-sm font-semibold text-foreground">{selectedThread?.title ?? "Selecciona conversación"}</p>
            </header>
            <div className="flex-1 space-y-1.5 overflow-y-auto p-2.5">
              {messages.map((msg) => {
                const mine = msg.senderUserId === bootstrap?.meUserId;
                const sender = usersById.get(msg.senderUserId)?.name ?? msg.senderUserId;
                return (
                  <div
                    key={msg.id}
                    className={`max-w-[88%] rounded-[2px] border px-2 py-1.5 text-xs ${
                      mine ? "ml-auto border-primary/35 bg-primary/10" : "border-border bg-muted/30"
                    }`}
                  >
                    <p className="text-[10px] text-muted-foreground">{mine ? "Tú" : sender}</p>
                    <p className="text-foreground">{msg.body}</p>
                  </div>
                );
              })}
            </div>
            <footer className="border-t border-border p-2">
              <div className="mb-2 flex justify-end">
                <Link
                  href={selectedThreadId ? `/chat?thread=${encodeURIComponent(selectedThreadId)}` : "/chat"}
                  className="btn-secondary h-7 px-2.5 text-[11px]"
                >
                  Abrir chat completo
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="field-control h-8 flex-1 text-xs"
                  placeholder="Escribe un mensaje..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  disabled={!selectedThreadId}
                />
                <button
                  type="button"
                  className="btn-primary inline-flex h-8 w-8 items-center justify-center p-0"
                  onClick={() => void handleSend()}
                  disabled={!selectedThreadId || !draft.trim()}
                >
                  <SendHorizontal className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </footer>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm shadow-soft hover:bg-muted/40"
        onClick={() => setOpen((prev) => !prev)}
      >
        <MessageCircle className="h-4 w-4 text-primary" aria-hidden />
        <span className="font-semibold text-foreground">Mensajes</span>
        {previewMembers.map((user) => (
          <span
            key={user.id}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-[10px] font-bold text-primary"
            title={user.name}
          >
            {initials(user.name)}
          </span>
        ))}
        {unreadCount > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden /> : <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden />}
      </button>
    </div>
  );
}
