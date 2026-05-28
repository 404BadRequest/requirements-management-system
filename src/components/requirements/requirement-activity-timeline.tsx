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

export function RequirementActivityTimeline({
  events,
  defaultExpanded = false,
}: {
  events: RequirementActivityEvent[];
  defaultExpanded?: boolean;
}) {
  const pathname = usePathname();
  const [activeType, setActiveType] = useState<ActivityType>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    const savedType = localStorage.getItem(STORAGE_TYPE_KEY);
    if (savedType === "all" || savedType === "status" || savedType === "comment" || savedType === "time") {
      setActiveType(savedType);
    }
    const savedOrder = localStorage.getItem(STORAGE_ORDER_KEY);
    if (savedOrder === "asc" || savedOrder === "desc") {
      setSortOrder(savedOrder);
    }
    if (defaultExpanded) return;
    const savedOpen = localStorage.getItem(STORAGE_OPEN_KEY);
    if (savedOpen === "1") {
      setExpanded(true);
    }
  }, [defaultExpanded]);

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
    <article className="surface-card flex h-full flex-col p-[length:var(--density-inset-pad)]">
      {/* Header compacto */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Actividad</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {events.length} evento{events.length === 1 ? "" : "s"} · estados, comentarios, horas
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary shrink-0 px-2.5 py-1 text-xs"
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

      {expanded ? (
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
          {/* Filtros tipo */}
          <div className="flex flex-wrap gap-1.5">
            {(["all", "status", "comment", "time"] as ActivityType[]).map((type) => (
              <button
                key={type}
                type="button"
                className={`btn-secondary px-2 py-0.5 text-[11px] ${activeType === type ? "border-accent bg-accent text-accent-foreground" : ""}`}
                onClick={() => setActiveType(type)}
                aria-pressed={activeType === type}
              >
                {TYPE_LABEL[type]}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                className={`btn-secondary px-2 py-0.5 text-[11px] ${sortOrder === "desc" ? "border-accent bg-accent text-accent-foreground" : ""}`}
                onClick={() => setSortOrder("desc")}
                aria-pressed={sortOrder === "desc"}
                title="Más recientes primero"
              >
                ↓
              </button>
              <button
                type="button"
                className={`btn-secondary px-2 py-0.5 text-[11px] ${sortOrder === "asc" ? "border-accent bg-accent text-accent-foreground" : ""}`}
                onClick={() => setSortOrder("asc")}
                aria-pressed={sortOrder === "asc"}
                title="Más antiguos primero"
              >
                ↑
              </button>
            </div>
          </div>

          {/* Búsqueda */}
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar en actividad…"
            className="field-control w-full py-1.5 text-xs"
            aria-label="Buscar eventos en la actividad"
          />

          {/* Lista de eventos */}
          {filtered.length === 0 ? (
            <p className="rounded-[2px] border border-dashed border-border bg-muted/20 px-3 py-4 text-xs text-muted-foreground">
              No hay eventos para este filtro.
            </p>
          ) : (
            <div className="overflow-y-auto space-y-3 pr-0.5 [scrollbar-width:thin]">
              {grouped.map(([day, dayEvents]) => (
                <section key={day} className="space-y-1.5">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {formatDayTitle(day)}
                  </h3>
                  <ol className="relative ml-1 border-l border-border/70 pl-3">
                    {dayEvents.map((event) => (
                      <li key={event.id} className="relative mb-3 last:mb-0">
                        <span
                          className="absolute -left-[1.05rem] top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background"
                          aria-hidden
                        />
                        <div className="rounded-[2px] border border-border bg-muted/20 p-2.5">
                          <div className="flex items-start justify-between gap-1.5">
                            <p className="text-xs font-medium leading-snug text-foreground">{event.title}</p>
                            <span className={`shrink-0 rounded-[2px] px-1.5 py-0.5 text-[10px] font-medium ${TYPE_BADGE_CLASS[event.type]}`}>
                              {TYPE_LABEL[event.type]}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{event.description}</p>
                          <div className="mt-1.5 flex items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
                            <time dateTime={event.at}>{formatDateTime(event.at)}</time>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                className="hover:text-foreground hover:underline"
                                onClick={() => { void copyEventLink(event.href); }}
                                title="Copiar enlace"
                              >
                                Enlace
                              </button>
                              <a href={event.href} className="text-primary hover:underline">
                                Ver
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
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Pulsa <span className="font-medium text-foreground">Expandir</span> para revisar el historial completo.
        </p>
      )}
    </article>
  );
}

