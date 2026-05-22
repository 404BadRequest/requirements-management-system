"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { TimeEntryEditModal } from "@/components/time-entries/time-entry-edit-modal";
import { TimeEntriesNewModal } from "@/components/time-entries/time-entries-new-modal";
import type { TimeEntry } from "@/types/domain";

// ─── Layout constants ─────────────────────────────────────────────────────────
const BASE_HOUR = 7;
const END_HOUR = 22;
const PX_PER_HOUR = 64;
const TOTAL_HOURS = END_HOUR - BASE_HOUR;
const TIMELINE_PX = TOTAL_HOURS * PX_PER_HOUR; // 960px

// ─── Category color palette ───────────────────────────────────────────────────
const BLOCK_PALETTE = [
  { bg: "bg-primary/10", border: "border-l-primary", text: "text-primary" },
  { bg: "bg-amber-500/10", border: "border-l-amber-500", text: "text-amber-700" },
  { bg: "bg-emerald-500/10", border: "border-l-emerald-500", text: "text-emerald-700" },
  { bg: "bg-violet-500/10", border: "border-l-violet-500", text: "text-violet-700" },
  { bg: "bg-rose-500/10", border: "border-l-rose-500", text: "text-rose-700" },
  { bg: "bg-sky-500/10", border: "border-l-sky-500", text: "text-sky-700" },
];

// ─── Date helpers ─────────────────────────────────────────────────────────────
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function addDays(date: Date, days: number): Date {
  const r = new Date(date);
  r.setDate(r.getDate() + days);
  return r;
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Timeline positioning ─────────────────────────────────────────────────────
function topPx(startTime: string): number {
  const [h, m] = startTime.split(":").map(Number);
  return Math.max(0, ((h - BASE_HOUR) * 60 + m) * (PX_PER_HOUR / 60));
}

function heightPx(entry: TimeEntry): number {
  if (!entry.endTime) return PX_PER_HOUR;
  return Math.max(20, entry.durationMinutes * (PX_PER_HOUR / 60));
}

function getNowPx(): number {
  const now = new Date();
  return Math.max(0, ((now.getHours() - BASE_HOUR) * 60 + now.getMinutes()) * (PX_PER_HOUR / 60));
}

// ─── Overlap layout ───────────────────────────────────────────────────────────
// Returns { left, width } as fractions (0–1) for each entry so overlapping
// entries are rendered side-by-side instead of hidden behind each other.
function layoutDay(entries: TimeEntry[]): { left: number; width: number }[] {
  const n = entries.length;
  if (n === 0) return [];

  const tops = entries.map((e) => topPx(e.startTime));
  const bottoms = entries.map((e) => topPx(e.startTime) + heightPx(e));

  // Detect overlapping pairs
  const overlaps: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (tops[i] < bottoms[j] - 2 && tops[j] < bottoms[i] - 2) {
        overlaps[i][j] = true;
        overlaps[j][i] = true;
      }
    }
  }

  // Greedy column assignment
  const col = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const used = new Set<number>();
    for (let j = 0; j < i; j++) {
      if (overlaps[i][j]) used.add(col[j]);
    }
    let c = 0;
    while (used.has(c)) c++;
    col[i] = c;
  }

  // Max column per overlap group determines how wide each entry is
  const maxCol = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    maxCol[i] = col[i];
    for (let j = 0; j < n; j++) {
      if (overlaps[i][j]) maxCol[i] = Math.max(maxCol[i], col[j]);
    }
  }

  return entries.map((_, i) => ({
    left: col[i] / (maxCol[i] + 1),
    width: 1 / (maxCol[i] + 1),
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────
export function WeeklyTimesheetClient({
  entries,
  users,
  clients,
  requirements,
  contracts,
  contractProfiles,
  categories,
  targetUserId,
  canPickAnyOwner,
  initialWeekStart,
}: {
  entries: TimeEntry[];
  users: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  requirements: { id: string; title: string; clientId: string }[];
  contracts: { id: string; clientId: string; label: string }[];
  contractProfiles: { id: string; label: string }[];
  categories: { code: string; label: string }[];
  targetUserId: string;
  canPickAnyOwner: boolean;
  initialWeekStart?: string;
}) {
  const router = useRouter();

  // ── Week navigation ──────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState<Date>(() => {
    if (initialWeekStart) {
      const d = new Date(initialWeekStart + "T12:00:00");
      if (!isNaN(d.getTime())) return getMonday(d);
    }
    return getMonday(new Date());
  });

  // ── Weekend visibility (default: Mon–Fri only) ───────────────────────────
  const [showWeekend, setShowWeekend] = useState(false);

  // ── Modal state ──────────────────────────────────────────────────────────
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [newEntryDate, setNewEntryDate] = useState<string | null>(null);
  const [newEntryStartTime, setNewEntryStartTime] = useState<string | undefined>(undefined);
  const [newModalOpen, setNewModalOpen] = useState(false);

  // ── Current-time indicator ───────────────────────────────────────────────
  const [nowPx, setNowPx] = useState(getNowPx);
  const todayStr = toDateStr(new Date());
  useEffect(() => {
    const id = setInterval(() => setNowPx(getNowPx()), 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Auto-scroll to ~08:00 on mount ──────────────────────────────────────
  const timelineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = (8 - BASE_HOUR) * PX_PER_HOUR;
    }
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────
  // All 7 days — needed to compute weekend totals even when hidden
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const weekDatesStr = useMemo(() => weekDays.map(toDateStr), [weekDays]);

  // Days actually rendered in the grid (Mon–Fri or Mon–Sun)
  const visibleDays = useMemo(
    () => (showWeekend ? weekDays : weekDays.slice(0, 5)),
    [weekDays, showWeekend],
  );
  const visibleDatesStr = useMemo(() => visibleDays.map(toDateStr), [visibleDays]);

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const requirementById = useMemo(
    () => new Map(requirements.map((r) => [r.id, r.title])),
    [requirements],
  );

  const categoryColorIdx = useMemo(() => {
    const m = new Map<string, number>();
    categories.forEach((cat, i) => m.set(cat.code, i % BLOCK_PALETTE.length));
    return m;
  }, [categories]);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    weekDatesStr.forEach((d) => map.set(d, []));
    entries.forEach((e) => {
      if (map.has(e.date)) map.get(e.date)!.push(e);
    });
    map.forEach((dayEntries) =>
      dayEntries.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    );
    return map;
  }, [entries, weekDatesStr]);

  // Totals only for visible days (used in headers)
  const dailyTotals = useMemo(
    () =>
      visibleDatesStr.map((d) =>
        (entriesByDay.get(d) ?? []).reduce((s, e) => s + e.durationMinutes, 0),
      ),
    [entriesByDay, visibleDatesStr],
  );

  // Full weekly total (all 7 days, regardless of visibility)
  const weeklyTotal = useMemo(
    () =>
      weekDatesStr.reduce(
        (sum, d) => sum + (entriesByDay.get(d) ?? []).reduce((s, e) => s + e.durationMinutes, 0),
        0,
      ),
    [entriesByDay, weekDatesStr],
  );

  // Weekend-entry total — shown as a badge when weekend is hidden
  const weekendTotal = useMemo(() => {
    if (showWeekend) return 0;
    return weekDatesStr.slice(5).reduce(
      (sum, d) => sum + (entriesByDay.get(d) ?? []).reduce((s, e) => s + e.durationMinutes, 0),
      0,
    );
  }, [entriesByDay, weekDatesStr, showWeekend]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const navigate = useCallback(
    (newStart: Date) => {
      setWeekStart(newStart);
      const params = new URLSearchParams(window.location.search);
      params.set("weekStart", toDateStr(newStart));
      router.replace(`/time-entries/weekly?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  const openNewEntry = useCallback((date: string, startTime?: string) => {
    setNewEntryDate(date);
    setNewEntryStartTime(startTime);
    setNewModalOpen(true);
  }, []);

  const handleTimelineClick = useCallback(
    (dateStr: string, e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("[data-entry-block]")) return;
      const rect = e.currentTarget.getBoundingClientRect();
      // getBoundingClientRect().top already accounts for scroll (it's viewport-relative)
      const y = e.clientY - rect.top;
      const minutesFromBase = Math.round((y / (PX_PER_HOUR / 60)) / 15) * 15;
      const totalMin = BASE_HOUR * 60 + minutesFromBase;
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      if (h >= BASE_HOUR && h < END_HOUR) {
        openNewEntry(
          dateStr,
          `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        );
      }
    },
    [openNewEntry],
  );

  // ─── Hour label array ─────────────────────────────────────────────────────
  const hourLabels = Array.from({ length: TOTAL_HOURS }, (_, i) => BASE_HOUR + i);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* ── Week nav + summary header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-border bg-card px-4 py-3 shadow-soft">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(addDays(weekStart, -7))}
            className="btn-secondary p-1.5"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate(getMonday(new Date()))}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => navigate(addDays(weekStart, 7))}
            className="btn-secondary p-1.5"
            aria-label="Semana siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-2 text-sm font-medium">
            {weekDays[0].toLocaleDateString("es-CL", { day: "2-digit", month: "long" })}
            {" – "}
            {weekDays[6].toLocaleDateString("es-CL", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {canPickAnyOwner && (
            <div className="flex items-center gap-2">
              <label htmlFor="user-select" className="text-xs text-muted-foreground">
                Usuario:
              </label>
              <select
                id="user-select"
                className="field-control text-sm"
                value={targetUserId}
                onChange={(e) => {
                  const params = new URLSearchParams(window.location.search);
                  params.set("userId", e.target.value);
                  params.set("weekStart", toDateStr(weekStart));
                  router.push(`/time-entries/weekly?${params.toString()}`);
                }}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Weekend toggle */}
          <button
            type="button"
            onClick={() => setShowWeekend((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-[2px] border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              showWeekend
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-border hover:text-foreground"
            }`}
            title={showWeekend ? "Ocultar fin de semana" : "Mostrar fin de semana"}
          >
            {showWeekend ? "Ocultar fds" : "Ver fin de semana"}
            {!showWeekend && weekendTotal > 0 && (
              <span className="ml-0.5 rounded-[2px] bg-amber-500/20 px-1 py-px text-[10px] font-semibold text-amber-700">
                {formatMinutes(weekendTotal)}
              </span>
            )}
          </button>

          <div className="flex items-center gap-1.5 rounded-[2px] border border-primary/30 bg-primary/5 px-3 py-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-primary/70" aria-hidden />
            <span className="text-xs font-semibold text-primary">
              {weeklyTotal > 0 ? formatMinutes(weeklyTotal) : "Sin horas"} esta semana
            </span>
          </div>
        </div>
      </div>

      {/* ── Calendar grid ─────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-[2px] border border-border bg-card shadow-soft">
        {/* Day headers row */}
        <div
          className="grid border-b border-border"
          style={{ gridTemplateColumns: `3.5rem repeat(${visibleDays.length}, minmax(7rem, 1fr))` }}
        >
          {/* Gutter header */}
          <div className="border-r border-border/50 bg-muted/20 py-3" />

          {visibleDays.map((day, i) => {
            const dateStr = visibleDatesStr[i];
            const isToday = dateStr === todayStr;
            const dayTotal = dailyTotals[i];
            return (
              <div
                key={dateStr}
                className={`border-l border-border/50 px-2 py-2 text-center ${isToday ? "bg-primary/5" : ""}`}
              >
                <p
                  className={`text-[10px] font-semibold uppercase tracking-widest ${isToday ? "text-primary" : "text-muted-foreground"}`}
                >
                  {day.toLocaleDateString("es-CL", { weekday: "short" })}
                </p>
                <p
                  className={`text-xl font-bold leading-tight ${isToday ? "text-primary" : "text-foreground"}`}
                >
                  {day.getDate()}
                </p>
                <p
                  className={`mt-0.5 text-[10px] tabular-nums ${dayTotal > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                >
                  {dayTotal > 0 ? formatMinutes(dayTotal) : "—"}
                </p>
                <button
                  type="button"
                  onClick={() => openNewEntry(dateStr)}
                  className="mt-1 inline-flex items-center gap-0.5 rounded-[2px] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  title={`Registrar hora el ${day.toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" })}`}
                >
                  <svg
                    className="h-2.5 w-2.5"
                    viewBox="0 0 10 10"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M5 2v3H2v1h3v3h1V6h3V5H6V2H5z" />
                  </svg>
                  Nueva
                </button>
              </div>
            );
          })}
        </div>

        {/* Empty-week guidance */}
        {weeklyTotal === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 border-b border-border/50 bg-muted/10 px-6 py-8 text-center">
            <p className="text-sm font-medium text-foreground">Sin horas registradas esta semana</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Haz clic en cualquier área del calendario para agregar una hora, o usa el botón "Nueva" en cada columna.
            </p>
            <button
              type="button"
              onClick={() => openNewEntry(toDateStr(visibleDays[0] ?? weekDays[0]))}
              className="btn-primary mt-1 text-xs"
            >
              + Registrar primera hora
            </button>
          </div>
        )}

        {/* Timeline scroll area */}
        <div ref={timelineRef} className="overflow-y-auto" style={{ maxHeight: "640px" }}>
          <div
            className="grid"
            style={{
              gridTemplateColumns: `3.5rem repeat(${visibleDays.length}, minmax(7rem, 1fr))`,
              height: `${TIMELINE_PX}px`,
            }}
          >
            {/* Hour gutter */}
            <div className="relative border-r border-border/50 bg-muted/10">
              {hourLabels.map((hour, i) => (
                <div
                  key={hour}
                  className="pointer-events-none absolute right-2 select-none text-[10px] tabular-nums text-muted-foreground/60"
                  style={{ top: i * PX_PER_HOUR - 8 }}
                >
                  {String(hour).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Day columns (5 or 7 depending on showWeekend) */}
            {visibleDays.map((day, colIdx) => {
              const dateStr = visibleDatesStr[colIdx];
              const isToday = dateStr === todayStr;
              const dayEntries = entriesByDay.get(dateStr) ?? [];
              const layout = layoutDay(dayEntries);

              return (
                <div
                  key={dateStr}
                  className={`relative border-l border-border/50 ${isToday ? "bg-primary/[0.015]" : ""}`}
                  style={{ cursor: "crosshair" }}
                  onClick={(e) => handleTimelineClick(dateStr, e)}
                  role="button"
                  tabIndex={-1}
                  aria-label={`Añadir hora el ${day.toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" })}`}
                >
                  {/* Horizontal hour lines */}
                  {hourLabels.map((_, i) => (
                    <div
                      key={i}
                      className={`pointer-events-none absolute inset-x-0 border-t ${i === 0 ? "border-border/60" : "border-border/25"}`}
                      style={{ top: i * PX_PER_HOUR }}
                    />
                  ))}

                  {/* Half-hour dashes */}
                  {hourLabels.map((_, i) => (
                    <div
                      key={`half-${i}`}
                      className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/15"
                      style={{ top: i * PX_PER_HOUR + PX_PER_HOUR / 2 }}
                    />
                  ))}

                  {/* Current-time indicator (today only) */}
                  {isToday && nowPx >= 0 && nowPx <= TIMELINE_PX && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-20 border-t-[1.5px] border-destructive/60"
                      style={{ top: nowPx }}
                    >
                      <span className="absolute -left-[3px] -top-[4px] h-2 w-2 rounded-full bg-destructive/70" />
                    </div>
                  )}

                  {/* Entry blocks */}
                  {dayEntries.map((entry, entryIdx) => {
                    const { left, width } = layout[entryIdx];
                    const colorIdx = categoryColorIdx.get(entry.category) ?? 0;
                    const color = BLOCK_PALETTE[colorIdx];
                    const top = topPx(entry.startTime);
                    const h = heightPx(entry);
                    const isOpen = !entry.endTime;
                    const clientName = entry.clientId ? clientById.get(entry.clientId) : null;
                    const reqTitle = entry.requirementId
                      ? requirementById.get(entry.requirementId)
                      : null;

                    return (
                      <button
                        key={entry.id}
                        data-entry-block
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditEntry(entry);
                        }}
                        title={[
                          `${entry.startTime}–${entry.endTime ?? "en curso"}`,
                          entry.taskDescription,
                          clientName,
                        ]
                          .filter(Boolean)
                          .join("\n")}
                        className={[
                          "absolute z-10 overflow-hidden rounded-[2px] border-l-[3px] px-1.5 py-1 text-left text-[10px] shadow-sm transition-all",
                          "hover:z-30 hover:shadow-md hover:brightness-[0.97]",
                          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                          color.bg,
                          color.border,
                          isOpen ? "border border-dashed border-r border-t border-b border-amber-400/60" : "border border-border/30",
                        ].join(" ")}
                        style={{
                          top: top + 2,
                          height: Math.max(18, h - 4),
                          left: `calc(${left * 100}% + 2px)`,
                          width: `calc(${width * 100}% - 4px)`,
                        }}
                      >
                        {/* Time range */}
                        <span className="block font-mono font-semibold leading-none text-foreground/80">
                          {entry.startTime}
                          {entry.endTime ? `–${entry.endTime}` : ""}
                          {isOpen && (
                            <span className="ml-1 rounded-[1px] bg-amber-500/25 px-1 text-[9px] font-bold text-amber-700">
                              ●
                            </span>
                          )}
                        </span>

                        {/* Task description — only if tall enough */}
                        {h > 30 && (
                          <p className="mt-px truncate leading-tight text-foreground/70">
                            {entry.taskDescription || "Sin descripción"}
                          </p>
                        )}

                        {/* Client / requirement — only if tall enough */}
                        {h > 50 && (clientName ?? reqTitle) && (
                          <p className="mt-px truncate leading-tight text-muted-foreground/80">
                            {[clientName, reqTitle].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Bottom legend: category colors ──────────────────────────────── */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/50 bg-muted/10 px-4 py-2">
            {categories.map((cat, i) => {
              const color = BLOCK_PALETTE[i % BLOCK_PALETTE.length];
              return (
                <span key={cat.code} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-[1px] border-l-2 ${color.bg} ${color.border}`}
                  />
                  {cat.label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Hint */}
      <p className="text-[11px] text-muted-foreground">
        Haz clic en un bloque para editarlo · Haz clic en el área del día para registrar una hora en ese momento
      </p>

      {/* ── Edit modal (controlled) ───────────────────────────────────────── */}
      {editEntry ? (
        <TimeEntryEditModal
          key={editEntry.id}
          entry={editEntry}
          users={users}
          clients={clients}
          requirements={requirements}
          contracts={contracts}
          contractProfiles={contractProfiles}
          categories={categories}
          canEdit
          canPickAnyOwner={canPickAnyOwner}
          open
          onOpenChange={(v) => {
            if (!v) setEditEntry(null);
          }}
        />
      ) : null}

      {/* ── New entry modal (controlled) ──────────────────────────────────── */}
      {newEntryDate ? (
        <TimeEntriesNewModal
          key={`${newEntryDate}-${newEntryStartTime ?? "no-time"}`}
          autoOpen={false}
          defaultValues={{ date: newEntryDate, startTime: newEntryStartTime }}
          open={newModalOpen}
          onOpenChange={(v) => {
            setNewModalOpen(v);
            if (!v) {
              setNewEntryDate(null);
              setNewEntryStartTime(undefined);
            }
          }}
        />
      ) : null}
    </div>
  );
}
