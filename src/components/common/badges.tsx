import { cn } from "@/lib/utils/cn";
import { formatStatusLabel } from "@/lib/formatting/status-label";
import { catalogColorClasses, catalogColorHex } from "@/lib/catalog-colors";

// ── Helpers ────────────────────────────────────────────────────────────────

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Fallback heurístico cuando no hay color de catálogo configurado.
function statusVariant(status: string): { dot: string; bg: string; text: string } {
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
  return { dot: "bg-slate-400", bg: "bg-slate-100 dark:bg-slate-800/40", text: "text-slate-600 dark:text-slate-400" };
}

function priorityVariant(priority: string): { dot: string; bg: string; text: string } {
  const p = normalize(priority);
  if (p.includes("high") || p.includes("alta") || p.includes("critica") || p.includes("critical") || p.includes("urgent"))
    return { dot: "bg-red-500", bg: "bg-red-50 dark:bg-red-950/40", text: "text-red-700 dark:text-red-300" };
  if (p.includes("medium") || p.includes("media") || p.includes("normal") || p.includes("mid"))
    return { dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300" };
  if (p.includes("low") || p.includes("baja") || p.includes("minor") || p.includes("nice"))
    return { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300" };
  return { dot: "bg-slate-400", bg: "bg-slate-100 dark:bg-slate-800/40", text: "text-slate-600 dark:text-slate-400" };
}

// ── Components ─────────────────────────────────────────────────────────────

export const StatusBadge = ({
  status,
  label,
  color,
}: {
  status: string;
  label?: string;
  color?: string | null;
}) => {
  const v = catalogColorClasses(color) ?? statusVariant(status);
  return (
    <span className={cn("status-chip", v.bg, v.text)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", v.dot)} aria-hidden />
      {label ?? formatStatusLabel(status, status)}
    </span>
  );
};

export const PriorityBadge = ({
  priority,
  label,
  color,
}: {
  priority: string;
  label?: string;
  color?: string | null;
}) => {
  const v = catalogColorClasses(color) ?? priorityVariant(priority);
  return (
    <span className={cn("status-chip", v.bg, v.text)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", v.dot)} aria-hidden />
      {label ?? priority}
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

/**
 * Color semántico de estado como hex CSS.
 * Usa el color de catálogo si se provee; si no, heurística por token.
 */
export function statusColor(statusCode: string, catalogColor?: string | null): string {
  const fromCatalog = catalogColorHex(catalogColor);
  if (fromCatalog) return fromCatalog;
  const v = statusVariant(statusCode);
  const map: Record<string, string> = {
    "bg-emerald-500": "#10b981",
    "bg-blue-500": "#3b82f6",
    "bg-amber-500": "#f59e0b",
    "bg-red-500": "#ef4444",
    "bg-slate-400": "#94a3b8",
  };
  return map[v.dot] ?? "#94a3b8";
}

/** Color semántico de prioridad como hex CSS. */
export function priorityColor(priorityCode: string, catalogColor?: string | null): string {
  const fromCatalog = catalogColorHex(catalogColor);
  if (fromCatalog) return fromCatalog;
  const v = priorityVariant(priorityCode);
  const map: Record<string, string> = {
    "bg-red-500": "#ef4444",
    "bg-amber-500": "#f59e0b",
    "bg-emerald-500": "#10b981",
    "bg-slate-400": "#94a3b8",
  };
  return map[v.dot] ?? "#94a3b8";
}
