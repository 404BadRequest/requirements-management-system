"use client";

import Link from "next/link";
import { BarChart2, AlertTriangle, TrendingUp } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CubicacionProfileBucket {
  label: string;
  allocatedHoras: number;
  usedHoras: number;
}

export interface RequirementCubicacionBannerProps {
  contractId: string;
  totalHoras: number;
  usedHorasTotal: number;
  senior: CubicacionProfileBucket;
  ingeniero: CubicacionProfileBucket;
  junior: CubicacionProfileBucket;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(h: number): string {
  if (h === 0) return "0h";
  return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
}

function pct(used: number, allocated: number): number {
  if (allocated <= 0) return 0;
  return Math.min(Math.round((used / allocated) * 100), 100);
}

function barColor(p: number, over: boolean): string {
  if (over) return "bg-red-500";
  if (p >= 80) return "bg-amber-500";
  return "bg-primary";
}

function textColor(p: number, over: boolean): string {
  if (over) return "text-red-600 dark:text-red-400";
  if (p >= 80) return "text-amber-600 dark:text-amber-400";
  return "text-primary";
}

// ─── Tarjeta de perfil ────────────────────────────────────────────────────────

function ProfileCard({ bucket }: { bucket: CubicacionProfileBucket }) {
  const p    = pct(bucket.usedHoras, bucket.allocatedHoras);
  const over = bucket.usedHoras > bucket.allocatedHoras;
  const remaining = Math.abs(bucket.allocatedHoras - bucket.usedHoras);

  return (
    <div className={`rounded-lg border p-4 flex flex-col gap-3 ${
      over
        ? "border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-950/20"
        : "border-border bg-background"
    }`}>
      {/* Cabecera del perfil */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {bucket.label}
        </span>
        {over && (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-red-600 dark:text-red-400">
            <AlertTriangle className="w-3 h-3" />
            Excedido
          </span>
        )}
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Presup.</span>
          <span className="text-base font-bold tabular-nums text-foreground">{fmt(bucket.allocatedHoras)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Usadas</span>
          <span className={`text-base font-bold tabular-nums ${over ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
            {fmt(bucket.usedHoras)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {over ? "Exceso" : "Restantes"}
          </span>
          <span className={`text-base font-bold tabular-nums ${over ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
            {over ? `+${fmt(remaining)}` : fmt(remaining)}
          </span>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="flex flex-col gap-1">
        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor(p, over)}`}
            style={{ width: `${p}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">0h</span>
          <span className={`font-bold ${textColor(p, over)}`}>{p}%</span>
          <span className="text-muted-foreground">{fmt(bucket.allocatedHoras)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function RequirementCubicacionBanner({
  contractId,
  totalHoras,
  usedHorasTotal,
  senior,
  ingeniero,
  junior,
}: RequirementCubicacionBannerProps) {
  const totalPct = pct(usedHorasTotal, totalHoras);
  const totalOver = usedHorasTotal > totalHoras;
  const anyOver   = totalOver
    || senior.usedHoras > senior.allocatedHoras
    || ingeniero.usedHoras > ingeniero.allocatedHoras
    || junior.usedHoras > junior.allocatedHoras;

  return (
    <section className="surface-card p-5 flex flex-col gap-5">

      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <BarChart2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Horas presupuestadas · Cubicación</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Distribución estimada por perfil según la cubicación del contrato
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {anyOver && (
            <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-2.5 py-1 text-[11px] font-semibold text-red-700 dark:text-red-300">
              <AlertTriangle className="h-3 w-3" />
              Excede presupuesto
            </span>
          )}
          <Link
            href={`/budgets/${contractId}`}
            className="text-xs font-medium text-primary hover:underline whitespace-nowrap"
          >
            Ver cubicación →
          </Link>
        </div>
      </div>

      {/* ── Resumen global ──────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Total presupuestado</span>
          </div>
          <div className="flex items-center gap-2 tabular-nums text-sm">
            <span className={`font-bold ${totalOver ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
              {fmt(usedHorasTotal)}
            </span>
            <span className="text-muted-foreground">de</span>
            <span className="font-semibold text-foreground">{fmt(totalHoras)}</span>
            <span className={`ml-1 text-xs font-bold ${textColor(totalPct, totalOver)}`}>
              ({totalPct}%)
            </span>
          </div>
        </div>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor(totalPct, totalOver)}`}
            style={{ width: `${totalPct}%` }}
          />
        </div>
      </div>

      {/* ── Divisor con etiqueta ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
          Desglose por perfil
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ── Cards por perfil ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ProfileCard bucket={senior} />
        <ProfileCard bucket={ingeniero} />
        <ProfileCard bucket={junior} />
      </div>
    </section>
  );
}
