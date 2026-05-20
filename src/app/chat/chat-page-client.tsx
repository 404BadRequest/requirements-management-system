"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ChatMessage, ChatPresencePreference, ChatPresenceStatus, User } from "@/types/domain";
import type { ChatBootstrapPayload, ChatThreadSummary } from "@/lib/chat/service";

type ChatPageClientProps = {
  initialData: ChatBootstrapPayload;
  initialThreadId?: string;
};

function statusLabel(status: ChatPresenceStatus): string {
  if (status === "online") return "En línea";
  if (status === "away") return "Ausente";
  if (status === "dnd") return "No molestar";
  return "Desconectado";
}

function statusClass(status: ChatPresenceStatus): string {
  if (status === "online") return "bg-emerald-500";
  if (status === "away") return "bg-amber-500";
  if (status === "dnd") return "bg-rose-600";
  return "bg-slate-400";
}

export function ChatPageClient({ initialData, initialThreadId = "" }: ChatPageClientProps) {
  const [bootstrap, setBootstrap] = useState(initialData);
  const [selectedThreadId, setSelectedThreadId] = useState(
    initialThreadId && initialData.threads.some((row) => row.thread.id === initialThreadId)
      ? initialThreadId
      : (initialData.threads[0]?.thread.id ?? ""),
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [directUserId, setDirectUserId] = useState("");
  const [channelName, setChannelName] = useState("");
  const [channelMembers, setChannelMembers] = useState<string[]>([]);
  const [presenceStatus, setPresenceStatus] = useState<ChatPresenceStatus>("online");
  const [presenceText, setPresenceText] = useState("");

  const usersById = useMemo(() => new Map(bootstrap.users.map((u) => [u.id, u])), [bootstrap.users]);
  const presenceByUser = useMemo(
    () => new Map(bootstrap.presence.map((row) => [row.userId, row])),
    [bootstrap.presence],
  );
  const selectedThread = bootstrap.threads.find((row) => row.thread.id === selectedThreadId) ?? null;
  useEffect(() => {
    if (!initialThreadId) return;
    const exists = bootstrap.threads.some((row) => row.thread.id === initialThreadId);
    if (exists) {
      setSelectedThreadId(initialThreadId);
    }
  }, [bootstrap.threads, initialThreadId]);

  const nonMeUsers = bootstrap.users.filter((row) => row.id !== bootstrap.meUserId);

  useEffect(() => {
    const mePresence = presenceByUser.get(bootstrap.meUserId);
    if (mePresence) {
      setPresenceStatus(mePresence.status);
      setPresenceText(mePresence.customStatus ?? "");
    }
  }, [bootstrap.meUserId, presenceByUser]);

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return;
    }
    let canceled = false;
    const load = async () => {
      const res = await fetch(`/api/chat/threads/${selectedThreadId}/messages`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: ChatMessage[] };
      if (canceled) return;
      setMessages(data.items);
    };
    void load();
    const id = window.setInterval(() => void load(), 3500);
    return () => {
      canceled = true;
      window.clearInterval(id);
    };
  }, [selectedThreadId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void fetch("/api/chat/heartbeat", { method: "POST" });
    }, 25000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(async () => {
      const res = await fetch("/api/chat/bootstrap", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as ChatBootstrapPayload;
      setBootstrap(data);
    }, 7000);
    return () => window.clearInterval(id);
  }, []);

  async function refreshBootstrap() {
    const res = await fetch("/api/chat/bootstrap", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as ChatBootstrapPayload;
    setBootstrap(data);
    if (!selectedThreadId && data.threads[0]) setSelectedThreadId(data.threads[0].thread.id);
  }

  async function handleSendMessage() {
    if (!selectedThreadId || !messageDraft.trim()) return;
    const res = await fetch(`/api/chat/threads/${selectedThreadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: messageDraft.trim() }),
    });
    if (!res.ok) {
      toast.error("No se pudo enviar el mensaje.");
      return;
    }
    setMessageDraft("");
    const created = (await res.json()) as ChatMessage;
    setMessages((prev) => [...prev, created]);
    void fetch(`/api/chat/threads/${selectedThreadId}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastReadMessageId: created.id }),
    });
    await refreshBootstrap();
  }

  async function handleCreateDirect() {
    if (!directUserId) return;
    const res = await fetch("/api/chat/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "direct", peerUserId: directUserId }),
    });
    if (!res.ok) {
      toast.error("No se pudo crear chat directo.");
      return;
    }
    const data = (await res.json()) as ChatBootstrapPayload;
    setBootstrap(data);
    const thread = data.threads.find((row) => row.memberIds.includes(directUserId));
    if (thread) setSelectedThreadId(thread.thread.id);
    setDirectUserId("");
  }

  async function handleCreateChannel() {
    if (!channelName.trim()) return;
    const res = await fetch("/api/chat/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "channel", name: channelName.trim(), memberUserIds: channelMembers }),
    });
    if (!res.ok) {
      toast.error("No se pudo crear canal.");
      return;
    }
    const data = (await res.json()) as ChatBootstrapPayload;
    setBootstrap(data);
    const thread = data.threads.find((row) => row.thread.name === channelName.trim());
    if (thread) setSelectedThreadId(thread.thread.id);
    setChannelName("");
    setChannelMembers([]);
  }

  async function handleUpdatePresence() {
    const res = await fetch("/api/chat/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: presenceStatus, customStatus: presenceText || null, dndUntil: null }),
    });
    if (!res.ok) {
      toast.error("No se pudo actualizar estado.");
      return;
    }
    await refreshBootstrap();
  }

  const selectedThreadUsers: User[] = selectedThread
    ? selectedThread.memberIds.map((id) => usersById.get(id)).filter((u): u is User => Boolean(u))
    : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[310px,minmax(0,1fr)]">
      <aside className="surface-card space-y-3 p-3">
        <div className="space-y-2 rounded-[2px] border border-border bg-muted/20 p-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mi estado</p>
          <div className="grid gap-2">
            <select className="field-control w-full" value={presenceStatus} onChange={(e) => setPresenceStatus(e.target.value as ChatPresenceStatus)}>
              <option value="online">En línea</option>
              <option value="away">Ausente</option>
              <option value="dnd">No molestar</option>
              <option value="offline">Desconectado</option>
            </select>
            <input
              className="field-control w-full"
              placeholder="Estado personalizado (opcional)"
              value={presenceText}
              onChange={(e) => setPresenceText(e.target.value)}
            />
            <button className="btn-secondary w-full text-xs" type="button" onClick={handleUpdatePresence}>
              Guardar estado
            </button>
          </div>
        </div>

        <div className="space-y-2 rounded-[2px] border border-border bg-muted/20 p-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nuevo chat directo</p>
          <select className="field-control w-full" value={directUserId} onChange={(e) => setDirectUserId(e.target.value)}>
            <option value="">Seleccionar usuario</option>
            {nonMeUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <button className="btn-secondary w-full text-xs" type="button" onClick={handleCreateDirect}>
            Crear directo
          </button>
        </div>

        <div className="space-y-2 rounded-[2px] border border-border bg-muted/20 p-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nuevo canal</p>
          <input
            className="field-control w-full"
            placeholder="Nombre del canal"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
          />
          <select
            multiple
            className="field-control min-h-24 w-full"
            value={channelMembers}
            onChange={(e) => setChannelMembers(Array.from(e.target.selectedOptions).map((opt) => opt.value))}
          >
            {nonMeUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <button className="btn-secondary w-full text-xs" type="button" onClick={handleCreateChannel}>
            Crear canal
          </button>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conversaciones</p>
          <div className="max-h-[46vh] space-y-1 overflow-y-auto pr-1">
            {bootstrap.threads.map((row) => (
              <button
                key={row.thread.id}
                type="button"
                className={`w-full rounded-[2px] border px-2.5 py-2 text-left transition ${
                  selectedThreadId === row.thread.id ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/40"
                }`}
                onClick={() => setSelectedThreadId(row.thread.id)}
              >
                <p className="truncate text-sm font-semibold text-foreground">{row.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{row.lastMessage?.body ?? "Sin mensajes aún"}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {row.unreadCount > 0 ? `${row.unreadCount} sin leer` : "Al día"}
                </p>
              </button>
            ))}
            {bootstrap.threads.length === 0 ? (
              <p className="rounded-[2px] border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                No tienes conversaciones todavía.
              </p>
            ) : null}
          </div>
        </div>
      </aside>

      <section className="surface-card flex min-h-[70vh] flex-col">
        <header className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{selectedThread?.title ?? "Selecciona una conversación"}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {selectedThreadUsers.map((user) => {
              const presence = presenceByUser.get(user.id);
              const status = presence?.status ?? "offline";
              return (
                <span key={user.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2 py-0.5">
                  <span className={`h-2 w-2 rounded-full ${statusClass(status)}`} aria-hidden />
                  {user.name} · {statusLabel(status)}
                </span>
              );
            })}
          </div>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {messages.map((message) => {
            const mine = message.senderUserId === bootstrap.meUserId;
            const sender = usersById.get(message.senderUserId)?.name ?? message.senderUserId;
            return (
              <div key={message.id} className={`max-w-[78%] rounded-[2px] border px-3 py-2 ${mine ? "ml-auto border-primary/35 bg-primary/10" : "border-border bg-muted/30"}`}>
                <p className="text-[11px] text-muted-foreground">{mine ? "Tú" : sender}</p>
                <p className="text-sm text-foreground">{message.body}</p>
              </div>
            );
          })}
          {selectedThreadId && messages.length === 0 ? (
            <p className="rounded-[2px] border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              Aún no hay mensajes en esta conversación.
            </p>
          ) : null}
          {!selectedThreadId ? (
            <p className="rounded-[2px] border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              Selecciona una conversación para empezar.
            </p>
          ) : null}
        </div>

        <footer className="border-t border-border p-3">
          <div className="flex gap-2">
            <input
              className="field-control flex-1"
              placeholder="Escribe un mensaje…"
              value={messageDraft}
              onChange={(e) => setMessageDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSendMessage();
                }
              }}
              disabled={!selectedThreadId}
            />
            <button className="btn-primary px-4" type="button" onClick={handleSendMessage} disabled={!selectedThreadId || !messageDraft.trim()}>
              Enviar
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
