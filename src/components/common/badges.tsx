import { cn } from "@/lib/utils/cn";
import { formatStatusLabel } from "@/lib/formatting/status-label";

// ── Helpers ────────────────────────────────────────────────────────────────

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Status: mapea sufijos/tokens del código al esquema de color semántico.
// Los estados de catálogo son libres (ej. BACKLOG, IN_PROGRESS, DONE_PROD, BLOCKED, REVIEW...)
// así que normalizamos y buscamos coincidencia parcial.
function statusVariant(status: string): {
  dot: string;
  bg: string;
  text: string;
} {
  const s = normalize(status);
  if (s.includes("done") || s.includes("prod") || s.includes("complete") || s.includes("cerrado"))
    return { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-800 dark:text-emerald-300" };
  if (s.includes("progress") || s.includes("doing") || s.includes("proceso") || s.includes("activo"))
    return { dot: "bg-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-800 dark:text-blue-300" };
  if (s.includes("review") || s.includes("revision") || s.includes("qa") || s.includes("testing") || s.includes("test"))
    return { dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-800 dark:text-amber-300" };
  if (s.includes("block") || s.includes("bloquea") || s.includes("stop") || s.includes("hold"))
    return { dot: "bg-red-500", bg: "bg-red-50 dark:bg-red-950/40", text: "text-red-800 dark:text-red-300" };
  if (s.includes("cancel") || s.includes("descart") || s.includes("reject"))
    return { dot: "bg-slate-400", bg: "bg-slate-100 dark:bg-slate-800/40", text: "text-slate-600 dark:text-slate-400" };
  // Backlog y cualquier estado indeterminado
  return { dot: "bg-slate-400", bg: "bg-slate-100 dark:bg-slate-800/40", text: "text-slate-600 dark:text-slate-400" };
}

// Priority: alta/high/critica → rojo, media/medium → naranja, baja/low → verde
function priorityVariant(priority: string): {
  dot: string;
  bg: string;
  text: string;
  label: string;
} {
  const p = normalize(priority);
  if (p.includes("high") || p.includes("alta") || p.includes("critica") || p.includes("critical") || p.includes("urgent"))
    return { dot: "bg-red-500", bg: "bg-red-50 dark:bg-red-950/40", text: "text-red-700 dark:text-red-300", label: priority };
  if (p.includes("medium") || p.includes("media") || p.includes("normal") || p.includes("mid"))
    return { dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", label: priority };
  if (p.includes("low") || p.includes("baja") || p.includes("minor") || p.includes("nice"))
    return { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", label: priority };
  return { dot: "bg-slate-400", bg: "bg-slate-100 dark:bg-slate-800/40", text: "text-slate-600 dark:text-slate-400", label: priority };
}

// ── Components ─────────────────────────────────────────────────────────────

export const StatusBadge = ({ status }: { status: string }) => {
  const v = statusVariant(status);
  return (
    <span className={cn("status-chip", v.bg, v.text)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", v.dot)} aria-hidden />
      {formatStatusLabel(status, status)}
    </span>
  );
};

export const PriorityBadge = ({ priority }: { priority: string }) => {
  const v = priorityVariant(priority);
  return (
    <span className={cn("status-chip", v.bg, v.text)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", v.dot)} aria-hidden />
      {v.label}
    </span>
  );
};

export const RiskBadge = ({ risk }: { risk: string }) => {
  const classes =
    risk === "rojo"
      ? "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300"
      : risk === "amarillo"
        ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        : risk === "verde"
          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-400";

  const dotClasses =
    risk === "rojo"
      ? "bg-red-500"
      : risk === "amarillo"
        ? "bg-amber-500"
        : risk === "verde"
          ? "bg-emerald-500"
          : "bg-slate-400";

  return (
    <span className={cn("status-chip", classes)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClasses)} aria-hidden />
      {risk}
    </span>
  );
};

/** Color semántico de estado como string CSS usable en `style={{ color }}` o `style={{ background }}` */
export function statusColor(statusCode: string): string {
  const v = statusVariant(statusCode);
  // Extraemos el color del punto (Tailwind class) y lo mapeamos a un valor real
  const map: Record<string, string> = {
    "bg-emerald-500": "#10b981",
    "bg-blue-500": "#3b82f6",
    "bg-amber-500": "#f59e0b",
    "bg-red-500": "#ef4444",
    "bg-slate-400": "#94a3b8",
  };
  return map[v.dot] ?? "#94a3b8";
}

/** Color semántico de prioridad como string CSS */
export function priorityColor(priorityCode: string): string {
  const v = priorityVariant(priorityCode);
  const map: Record<string, string> = {
    "bg-red-500": "#ef4444",
    "bg-amber-500": "#f59e0b",
    "bg-emerald-500": "#10b981",
    "bg-slate-400": "#94a3b8",
  };
  return map[v.dot] ?? "#94a3b8";
}
