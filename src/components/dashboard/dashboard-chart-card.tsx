"use client";

import { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { BarChart3 } from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { cn } from "@/lib/utils/cn";
import {
  buildBarChartOption,
  buildDonutChartOption,
  buildHorizontalBarChartOption,
  buildLineAreaChartOption,
  buildRoseChartOption,
} from "@/lib/charts/echarts-options";

export type DashboardChartMode = "bar" | "barHorizontal" | "lineArea" | "pie" | "rose";

export const DashboardChartCard = ({
  title,
  data,
  mode,
  barVariant = "default",
  tall = false,
  emptyHint = "Crea registros o ajusta los filtros para visualizar este gráfico.",
  className,
}: {
  title: string;
  data: { name: string; value: number }[];
  mode: DashboardChartMode;
  /** Solo aplica en modo `bar`. */
  barVariant?: "default" | "multiColor";
  /** Altura extra (p. ej. serie temporal). */
  tall?: boolean;
  /** Mensaje contextual cuando el gráfico no tiene valores > 0. */
  emptyHint?: string;
  className?: string;
}) => {
  const [mounted, setMounted] = useState(false);
  const density = useUiStore((s) => s.density);
  const compact = density === "compact";
  const baseH = compact ? 200 : 240;
  const chartH = tall ? (compact ? 228 : 300) : baseH;
  const dark = false;

  useEffect(() => setMounted(true), []);

  const hasData = data.some((d) => d.value > 0);

  const option = useMemo(() => {
    const names = data.map((d) => d.name);
    const vals = data.map((d) => d.value);
    if (mode === "bar") {
      return buildBarChartOption(names, vals, dark, { multiColor: barVariant === "multiColor" });
    }
    if (mode === "barHorizontal") {
      return buildHorizontalBarChartOption(names, vals, dark);
    }
    if (mode === "lineArea") {
      return buildLineAreaChartOption(names, vals, dark);
    }
    if (mode === "rose") {
      return buildRoseChartOption(data, dark);
    }
    return buildDonutChartOption(data, dark);
  }, [barVariant, dark, data, mode]);

  return (
    <article
      className={cn(
        "surface-card relative flex flex-col overflow-hidden rounded-[2px] border border-border bg-card shadow-sm",
        "before:pointer-events-none before:absolute before:inset-y-5 before:left-0 before:w-[2px] before:bg-primary",
        compact ? "min-h-[300px] p-5" : "min-h-[340px] p-6",
        className,
      )}
    >
      <div className={cn("flex items-start justify-between gap-2 pl-2.5", compact ? "mb-4" : "mb-5")}>
        <h3 className="text-sm font-semibold leading-snug tracking-tight text-foreground">{title}</h3>
        {!hasData ? (
          <span className="shrink-0 rounded-[2px] border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Sin datos
          </span>
        ) : null}
      </div>
      <div
        className={cn("relative min-h-0 w-full min-w-0 pl-1.5 pr-1")}
        style={{ height: chartH, minHeight: chartH }}
      >
        {mounted && hasData ? (
          <ReactECharts
            option={option}
            style={{ height: chartH, width: "100%" }}
            className="[&_*]:outline-none"
            opts={{ renderer: "svg" }}
            notMerge
            lazyUpdate
          />
        ) : mounted ? (
          <div
            className="flex h-full w-full items-center justify-center rounded-[2px] border border-dashed border-border bg-muted/15 px-4 text-center"
            role="status"
            aria-live="polite"
          >
            <div className="max-w-sm space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-[2px] border border-border bg-muted/50 text-muted-foreground">
                <BarChart3 className="h-5 w-5" aria-hidden />
              </div>
              <p className="text-sm font-medium text-foreground">Aun no hay informacion suficiente</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{emptyHint}</p>
            </div>
          </div>
        ) : (
          <div
            className={cn("skeleton-shimmer h-full w-full rounded-lg")}
            style={{ minHeight: chartH }}
            aria-hidden
          />
        )}
      </div>
    </article>
  );
};
