"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { addRequirementCommentAction } from "@/app/requirements/data-actions";

export type ObservationMessage = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorId: string;
  isOwn: boolean;
};

function formatChatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function RequirementObservationsChat({
  requirementId,
  messages,
  canPost,
  variant = "default",
  embedded = false,
}: {
  requirementId: string;
  messages: ObservationMessage[];
  canPost: boolean;
  variant?: "default" | "sidebar";
  embedded?: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const fd = new FormData();
    fd.set("body", trimmed);
    startTransition(async () => {
      try {
        await addRequirementCommentAction(requirementId, fd);
        setText("");
        toast.success("Mensaje publicado");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo enviar el mensaje.");
      }
    });
  };

  const isSidebar = variant === "sidebar";

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden",
        embedded ? "" : "surface-card p-[length:var(--density-inset-pad)]",
        !embedded && isSidebar ? "h-full min-h-[18rem] xl:min-h-0" : !embedded ? "min-h-[22rem]" : "min-h-[16rem]",
      )}
    >
      {!embedded ? (
        <div className={cn("border-b border-border/60 pb-3", isSidebar ? "mb-2" : "mb-3")}>
          <h2 className={cn("font-semibold tracking-tight text-foreground", isSidebar ? "text-sm" : "text-base")}>
            Observaciones y dudas
          </h2>
          {!isSidebar ? (
            <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted-foreground">
              Hilo tipo chat para coordinación, preguntas y notas. Los mensajes quedan asociados a este requerimiento.
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-muted-foreground">Coordinación y seguimiento del REQ.</p>
          )}
        </div>
      ) : (
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          Hilo de coordinación, preguntas y notas asociadas a este requerimiento.
        </p>
      )}

      <div
        className={cn(
          "flex flex-1 flex-col gap-3 overflow-y-auto rounded-lg border border-border/50 bg-muted/15 p-3 [scrollbar-width:thin]",
          isSidebar ? "min-h-[10rem]" : "min-h-[12rem]",
        )}
      >
        {messages.length === 0 ? (
          <p className="m-auto max-w-sm text-center text-sm text-muted-foreground">
            Aún no hay mensajes. {canPost ? "Sé el primero en escribir abajo." : "Solo lectura: necesitas permiso de edición en requerimientos."}
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn("flex w-full", m.isOwn ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[min(100%,28rem)] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                  m.isOwn
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md border border-border/70 bg-card text-foreground",
                )}
              >
                {!m.isOwn ? (
                  <p className="mb-1 text-xs font-semibold text-primary">{m.authorName}</p>
                ) : (
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-primary-foreground/80">Tú</p>
                )}
                <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                <p
                  className={cn(
                    "mt-1.5 text-[10px] tabular-nums",
                    m.isOwn ? "text-primary-foreground/75" : "text-muted-foreground",
                  )}
                >
                  <time dateTime={m.createdAt}>{formatChatTime(m.createdAt)}</time>
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} aria-hidden className="h-px w-full shrink-0" />
      </div>

      {canPost ? (
        <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
          <label htmlFor={`obs-chat-${requirementId}`} className="sr-only">
            Nuevo mensaje
          </label>
          <textarea
            id={`obs-chat-${requirementId}`}
            rows={3}
            maxLength={12000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={
              isSidebar
                ? "Escribe un mensaje… (⌘+Enter para enviar)"
                : "Escribe una observación, duda o seguimiento… (Ctrl+Enter o ⌘+Enter para enviar)"
            }
            className="field-control min-h-[5.5rem] w-full resize-y text-sm"
            disabled={pending}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">{text.length.toLocaleString("es-CL")} / 12.000</span>
            <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={pending || !text.trim()} onClick={() => submit()}>
              {pending ? "Enviando…" : "Enviar"}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          No puedes publicar mensajes con tu rol actual. Si necesitas participar, pide permiso de edición en requerimientos.
        </p>
      )}
    </article>
  );
}
