"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/notifications/data-actions";
import type { AppNotification } from "@/types/domain";

const NOTIFICATIONS_VIEW_MODE_KEY = "rms.notifications.viewMode";

export function NotificationsPageClient({ initialItems }: { initialItems: AppNotification[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [bulkPending, setBulkPending] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "unread">("all");

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    const saved = localStorage.getItem(NOTIFICATIONS_VIEW_MODE_KEY);
    if (saved === "all" || saved === "unread") {
      setViewMode(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(NOTIFICATIONS_VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  const unreadCount = useMemo(() => items.filter((item) => !item.readAt).length, [items]);
  const visibleItems = useMemo(
    () => (viewMode === "unread" ? items.filter((item) => !item.readAt) : items),
    [items, viewMode],
  );
  const groupedByDay = useMemo(() => {
    const map = new Map<string, AppNotification[]>();
    for (const item of visibleItems) {
      const key = new Date(item.createdAt).toISOString().slice(0, 10);
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [visibleItems]);

  const markRead = (id: string) => {
    void (async () => {
      try {
        await markNotificationReadAction(id);
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item)),
        );
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo actualizar.");
      }
    })();
  };

  const markAllRead = () => {
    void (async () => {
      if (unreadCount === 0) return;
      setBulkPending(true);
      try {
        const marked = await markAllNotificationsReadAction();
        if (marked > 0) {
          setItems((prev) =>
            prev.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() })),
          );
          toast.success(`${marked} aviso${marked === 1 ? "" : "s"} marcado${marked === 1 ? "" : "s"} como leído${marked === 1 ? "" : "s"}.`);
        }
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudieron actualizar los avisos.");
      } finally {
        setBulkPending(false);
      }
    })();
  };

  if (items.length === 0) {
    return (
      <div className="surface-card max-w-2xl p-[length:var(--density-inset-pad)] text-sm text-muted-foreground">
        No tienes avisos. Cuando cambie el estado de un requerimiento donde eres responsable, o te asignen uno nuevo, aparecerá aquí.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-[2px] border border-border bg-muted/20 px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`btn-secondary px-2.5 py-1 text-xs ${viewMode === "all" ? "border-accent bg-accent text-accent-foreground" : ""}`}
            onClick={() => setViewMode("all")}
            aria-pressed={viewMode === "all"}
          >
            Todas ({items.length})
          </button>
          <button
            type="button"
            className={`btn-secondary px-2.5 py-1 text-xs ${viewMode === "unread" ? "border-accent bg-accent text-accent-foreground" : ""}`}
            onClick={() => setViewMode("unread")}
            aria-pressed={viewMode === "unread"}
          >
            No leídas ({unreadCount})
          </button>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} aviso${unreadCount === 1 ? "" : "s"} sin leer` : "Todos los avisos están leídos"}
          </p>
          <button
            type="button"
            className="btn-secondary px-2.5 py-1 text-xs"
            onClick={markAllRead}
            disabled={bulkPending || unreadCount === 0}
          >
            {bulkPending ? "Marcando..." : "Marcar todo leído"}
          </button>
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <div className="surface-card max-w-2xl p-[length:var(--density-inset-pad)] text-sm text-muted-foreground">
          {viewMode === "unread"
            ? "No tienes avisos pendientes. Cambia a “Todas” para revisar el historial."
            : "No hay avisos para mostrar."}
        </div>
      ) : (
        groupedByDay.map(([day, list]) => (
          <section key={day} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {new Date(`${day}T00:00:00`).toLocaleDateString("es-CL", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </h2>
            <ul className="space-y-3">
              {list.map((n) => (
                <li
                  key={n.id}
                  className={`surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between ${n.readAt ? "opacity-70" : "border-primary/25"}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{n.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{n.body}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      <time dateTime={n.createdAt}>
                        {new Date(n.createdAt).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
                      </time>
                      {n.readAt ? (
                        <>
                          {" · "}
                          <span>Leído</span>
                        </>
                      ) : (
                        <span className="ml-2 rounded-[2px] border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                          Nuevo
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {n.href ? (
                      <Link href={n.href} className="btn-primary px-3 py-1.5 text-xs no-underline">
                        Ir al requerimiento
                      </Link>
                    ) : null}
                    {!n.readAt ? (
                      <button
                        type="button"
                        className="btn-secondary px-3 py-1.5 text-xs"
                        onClick={() => markRead(n.id)}
                      >
                        Marcar leído
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
