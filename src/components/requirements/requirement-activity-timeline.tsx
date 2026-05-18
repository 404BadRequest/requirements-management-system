"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

type ActivityType = "all" | "status" | "comment" | "time";

export type RequirementActivityEvent = {
  id: string;
  type: Exclude<ActivityType, "all">;
  title: string;
  description: string;
  at: string;
  href: string;
};

const TYPE_LABEL: Record<ActivityType, string> = {
  all: "Todo",
  status: "Estado",
  comment: "Comentarios",
  time: "Horas",
};

const STORAGE_TYPE_KEY = "rms.requirementTimeline.type";
const STORAGE_ORDER_KEY = "rms.requirementTimeline.order";
const STORAGE_OPEN_KEY = "rms.requirementTimeline.open";

const TYPE_BADGE_CLASS: Record<Exclude<ActivityType, "all">, string> = {
  status: "border border-accent/40 bg-accent/10 text-accent",
  comment: "border border-primary/40 bg-primary/10 text-primary",
  time: "border border-emerald-600/35 bg-emerald-600/10 text-emerald-700",
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

function dayKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10) || value;
  return date.toISOString().slice(0, 10);
}

function formatDayTitle(day: string): string {
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export function RequirementActivityTimeline({ events }: { events: RequirementActivityEvent[] }) {
  const pathname = usePathname();
  const [activeType, setActiveType] = useState<ActivityType>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const savedType = localStorage.getItem(STORAGE_TYPE_KEY);
    if (savedType === "all" || savedType === "status" || savedType === "comment" || savedType === "time") {
      setActiveType(savedType);
    }
    const savedOrder = localStorage.getItem(STORAGE_ORDER_KEY);
    if (savedOrder === "asc" || savedOrder === "desc") {
      setSortOrder(savedOrder);
    }
    const savedOpen = localStorage.getItem(STORAGE_OPEN_KEY);
    if (savedOpen === "1") {
      setExpanded(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_TYPE_KEY, activeType);
  }, [activeType]);

  useEffect(() => {
    localStorage.setItem(STORAGE_ORDER_KEY, sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    localStorage.setItem(STORAGE_OPEN_KEY, expanded ? "1" : "0");
  }, [expanded]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = activeType === "all" ? [...events] : events.filter((event) => event.type === activeType);
    if (q) {
      list = list.filter((event) => {
        return `${event.title} ${event.description}`.toLowerCase().includes(q);
      });
    }
    list.sort((a, b) => {
      const ad = new Date(a.at).getTime();
      const bd = new Date(b.at).getTime();
      return sortOrder === "desc" ? bd - ad : ad - bd;
    });
    return list;
  }, [events, activeType, query, sortOrder]);

  const latestEventId = filtered[0]?.id ?? null;

  const grouped = useMemo(() => {
    const map = new Map<string, RequirementActivityEvent[]>();
    for (const event of filtered) {
      const key = dayKey(event.at);
      const bucket = map.get(key) ?? [];
      bucket.push(event);
      map.set(key, bucket);
    }
    return [...map.entries()];
  }, [filtered]);

  const copyEventLink = async (href: string) => {
    const absolute = new URL(`${pathname}${href}`, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(absolute);
      toast.success("Enlace del evento copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  return (
    <article className="surface-card p-[length:var(--density-inset-pad)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Actividad del requerimiento</h2>
          <p className="mt-1 text-xs text-muted-foreground">Timeline combinado de cambios de estado, comentarios e imputaciones.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-[2px] border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {filtered.length} evento{filtered.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            className="btn-secondary px-2.5 py-1 text-xs"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? (
              <span className="inline-flex items-center gap-1">
                <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                Contraer
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                Expandir
              </span>
            )}
          </button>
        </div>
      </div>

      {expanded ? (
        <>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(["all", "status", "comment", "time"] as ActivityType[]).map((type) => (
          <button
            key={type}
            type="button"
            className={`btn-secondary px-2.5 py-1 text-xs ${activeType === type ? "border-accent bg-accent text-accent-foreground" : ""}`}
            onClick={() => setActiveType(type)}
            aria-pressed={activeType === type}
          >
            {TYPE_LABEL[type]}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            className={`btn-secondary px-2 py-1 text-xs ${sortOrder === "desc" ? "border-accent bg-accent text-accent-foreground" : ""}`}
            onClick={() => setSortOrder("desc")}
            aria-pressed={sortOrder === "desc"}
          >
            Más recientes
          </button>
          <button
            type="button"
            className={`btn-secondary px-2 py-1 text-xs ${sortOrder === "asc" ? "border-accent bg-accent text-accent-foreground" : ""}`}
            onClick={() => setSortOrder("asc")}
            aria-pressed={sortOrder === "asc"}
          >
            Más antiguos
          </button>
        </div>
      </div>
      <div className="mt-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar en actividad…"
          className="field-control w-full max-w-sm py-2 text-sm"
          aria-label="Buscar eventos en la actividad"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-4 rounded-[2px] border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
          No hay eventos para este filtro.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {grouped.map(([day, dayEvents]) => (
            <section key={day} className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {formatDayTitle(day)}
              </h3>
              <ol className="relative ml-1 border-l border-border/70 pl-4">
                {dayEvents.map((event) => (
                  <li key={event.id} className="relative mb-4 last:mb-0">
                    <span
                      className="absolute -left-[1.15rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background"
                      aria-hidden
                    />
                    <div className="rounded-[2px] border border-border bg-muted/20 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{event.title}</p>
                        <div className="flex items-center gap-1.5">
                          {event.id === latestEventId ? (
                            <span className="rounded-[2px] border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              Más reciente
                            </span>
                          ) : null}
                          <span className={`rounded-[2px] px-2 py-0.5 text-[11px] font-medium ${TYPE_BADGE_CLASS[event.type]}`}>
                            {TYPE_LABEL[event.type]}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{event.description}</p>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <time dateTime={event.at}>{formatDateTime(event.at)}</time>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground hover:underline"
                            onClick={() => {
                              void copyEventLink(event.href);
                            }}
                          >
                            Copiar enlace
                          </button>
                          <a href={event.href} className="text-primary hover:underline">
                            Ir a sección
                          </a>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Actividad oculta para priorizar la vista principal. Pulsa <span className="font-medium text-foreground">Expandir</span> para revisar el historial.
        </p>
      )}
    </article>
  );
}

