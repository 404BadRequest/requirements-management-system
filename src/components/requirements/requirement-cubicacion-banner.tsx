"use client";

import Link from "next/link";
import { BarChart2, AlertTriangle } from "lucide-react";

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
  return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
}

function pct(used: number, allocated: number): number {
  if (allocated <= 0) return 0;
  return Math.min(Math.round((used / allocated) * 100), 100);
}

function ProfileRow({ bucket }: { bucket: CubicacionProfileBucket }) {
  const p = pct(bucket.usedHoras, bucket.allocatedHoras);
  const over = bucket.usedHoras > bucket.allocatedHoras;
  const remaining = bucket.allocatedHoras - bucket.usedHoras;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground min-w-[90px]">{bucket.label}</span>
        <div className="flex items-center gap-3 text-xs tabular-nums">
          <span className="text-muted-foreground">{fmt(bucket.allocatedHoras)} presup.</span>
          <span className={over ? "font-semibold text-red-600 dark:text-red-400" : "font-semibold text-foreground"}>
            {fmt(bucket.usedHoras)} usadas
          </span>
          <span className={`text-[11px] ${over ? "text-red-500" : "text-muted-foreground"}`}>
            {over ? `+${fmt(Math.abs(remaining))} excedido` : `${fmt(remaining)} restantes`}
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            over ? "bg-red-500" : p >= 80 ? "bg-amber-500" : "bg-primary"
          }`}
          style={{ width: `${p}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>0h</span>
        <span className={`font-medium ${over ? "text-red-500" : p >= 80 ? "text-amber-500" : "text-primary"}`}>
          {p}%
        </span>
        <span>{fmt(bucket.allocatedHoras)}</span>
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
  const anyOver  = senior.usedHoras > senior.allocatedHoras
    || ingeniero.usedHoras > ingeniero.allocatedHoras
    || junior.usedHoras > junior.allocatedHoras;

  return (
    <section className="surface-card border border-primary/20 bg-primary/[0.02] p-5">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <BarChart2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Horas presupuestadas · Cubicación</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fmt(usedHorasTotal)} utilizadas de {fmt(totalHoras)} presupuestadas · {totalPct}% global
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {anyOver && (
            <div className="flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-1">
              <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />
              <span className="text-[11px] font-semibold text-red-700 dark:text-red-300">Excede presupuesto</span>
            </div>
          )}
          <Link
            href={`/budgets/${contractId}`}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            Ver cubicación →
          </Link>
        </div>
      </div>

      {/* Barra global */}
      <div className="mb-5 p-3 rounded-lg bg-muted/40 border border-border/50">
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="font-medium text-foreground">Total presupuestado</span>
          <span className="tabular-nums font-semibold">
            <span className={anyOver ? "text-red-600 dark:text-red-400" : "text-foreground"}>{fmt(usedHorasTotal)}</span>
            <span className="text-muted-foreground"> / {fmt(totalHoras)}</span>
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              totalPct >= 100 ? "bg-red-500" : totalPct >= 80 ? "bg-amber-500" : "bg-primary"
            }`}
            style={{ width: `${totalPct}%` }}
          />
        </div>
      </div>

      {/* Filas por perfil */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <ProfileRow bucket={senior} />
        <ProfileRow bucket={ingeniero} />
        <ProfileRow bucket={junior} />
      </div>
    </section>
  );
}
