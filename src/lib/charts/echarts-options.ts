import type { EChartsOption } from "echarts";

/** Paleta alineada al estilo actual: neutro + rojo/azul de acento. */
const CORP_RED = "#c51822";
const CORP_BLUE = "#4d8fc1";
const CORP_GRAY = "#7a7a7a";
const CORP_GREEN = "#2f7d4b";
const CORP_ORANGE = "#9a6a2a";
const SERIES_LIGHT = [CORP_RED, CORP_BLUE, CORP_GRAY, CORP_GREEN, CORP_ORANGE];
const SERIES_DARK = SERIES_LIGHT;

function axisColors(dark: boolean) {
  return {
    text: dark ? "hsl(0 0% 14%)" : "hsl(0 0% 24%)",
    line: dark ? "hsl(0 0% 66%)" : "hsl(0 0% 70%)",
    split: dark ? "hsl(0 0% 75% / 0.7)" : "hsl(0 0% 78% / 0.85)",
    tooltipBg: dark ? "hsl(0 0% 96%)" : "hsl(0 0% 96%)",
    tooltipBorder: dark ? "hsl(0 0% 66%)" : "hsl(0 0% 66%)",
  };
}

export function buildBarChartOption(
  categories: string[],
  values: number[],
  dark: boolean,
  options?: { multiColor?: boolean },
): EChartsOption {
  const c = axisColors(dark);
  const palette = dark ? SERIES_DARK : SERIES_LIGHT;
  const multiColor = options?.multiColor ?? false;

  return {
    color: multiColor ? [CORP_BLUE, CORP_RED, CORP_GRAY, CORP_GREEN, CORP_ORANGE] : [CORP_BLUE],
    animationDuration: 420,
    animationEasing: "cubicOut",
    grid: { left: 8, right: 12, top: 18, bottom: categories.length > 5 ? 52 : 28, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { opacity: 0.12 } },
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: c.text, fontSize: 12 },
    },
    xAxis: {
      type: "category",
      data: categories,
      axisLine: { lineStyle: { color: c.line } },
      axisTick: { show: false },
      axisLabel: {
        color: c.text,
        fontSize: 11,
        rotate: categories.length > 5 ? -22 : 0,
        interval: 0,
      },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: c.split, type: "dashed" } },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: c.text, fontSize: 11 },
    },
    series: [
      {
        type: "bar",
        data: values.map((v, i) =>
          multiColor
            ? {
                value: v,
                itemStyle: {
                  borderRadius: [2, 2, 0, 0],
                  color: [CORP_BLUE, CORP_RED, CORP_GRAY, CORP_GREEN, CORP_ORANGE][i % 5],
                },
              }
            : v,
        ),
        barMaxWidth: 44,
        ...(multiColor
          ? {}
          : {
              itemStyle: {
                borderRadius: [2, 2, 0, 0],
                color: CORP_BLUE,
              },
            }),
      },
    ],
  };
}

export function buildDonutChartOption(
  items: { name: string; value: number; color?: string }[],
  dark: boolean,
): EChartsOption {
  const c = axisColors(dark);
  const palette = [CORP_RED, CORP_BLUE, CORP_GRAY, CORP_GREEN, CORP_ORANGE];
  const hasCustomColors = items.some((d) => !!d.color);

  return {
    color: palette,
    animationDuration: 420,
    tooltip: {
      trigger: "item",
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: c.text, fontSize: 12 },
    },
    legend: {
      bottom: 4,
      left: "center",
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: c.text, fontSize: 11 },
    },
    series: [
      {
        type: "pie",
        radius: ["42%", "70%"],
        center: ["50%", "46%"],
        padAngle: 2,
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 2, borderColor: "hsl(0 0% 96%)", borderWidth: 2 },
        label: { color: c.text, fontSize: 11 },
        labelLine: { lineStyle: { color: c.line } },
        data: items.map((d, i) => ({
          name: d.name,
          value: d.value,
          ...(hasCustomColors
            ? { itemStyle: { borderRadius: 2, borderColor: "hsl(0 0% 96%)", borderWidth: 2, color: d.color ?? palette[i % palette.length] } }
            : {}),
        })),
      },
    ],
  };
}

/** Barras horizontales; ordena de mayor a menor (la barra más larga arriba). */
export function buildHorizontalBarChartOption(
  categories: string[],
  values: number[],
  dark: boolean,
): EChartsOption {
  const c = axisColors(dark);
  const palette = [CORP_BLUE];
  const pairs = categories.map((name, i) => ({ name, value: values[i] ?? 0 }));
  pairs.sort((a, b) => b.value - a.value);
  const sortedNames = pairs.map((p) => p.name);
  const sortedValues = pairs.map((p) => p.value);

  return {
    color: palette,
    animationDuration: 420,
    animationEasing: "cubicOut",
    grid: { left: 4, right: 16, top: 12, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { opacity: 0.12 } },
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: c.text, fontSize: 12 },
    },
    xAxis: {
      type: "value",
      splitLine: { lineStyle: { color: c.split, type: "dashed" } },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: c.text, fontSize: 11 },
    },
    yAxis: {
      type: "category",
      data: sortedNames,
      inverse: true,
      axisLine: { lineStyle: { color: c.line } },
      axisTick: { show: false },
      axisLabel: {
        color: c.text,
        fontSize: 11,
        width: 108,
        overflow: "truncate",
      },
    },
    series: [
      {
        type: "bar",
        data: sortedValues.map((v, i) => ({
          value: v,
          itemStyle: {
            borderRadius: [0, 2, 2, 0],
            color: palette[i % palette.length],
          },
        })),
        barMaxWidth: 26,
      },
    ],
  };
}

/** Serie temporal suave con área sombreada (p. ej. horas por mes). */
export function buildLineAreaChartOption(categories: string[], values: number[], dark: boolean): EChartsOption {
  const c = axisColors(dark);
  const top = CORP_RED;
  const bottom = dark ? "rgba(197, 24, 34, 0.05)" : "rgba(197, 24, 34, 0.08)";

  return {
    animationDuration: 520,
    animationEasing: "cubicOut",
    grid: { left: 8, right: 12, top: 24, bottom: categories.length > 8 ? 40 : 28, containLabel: true },
    tooltip: {
      trigger: "axis",
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: c.text, fontSize: 12 },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: categories,
      axisLine: { lineStyle: { color: c.line } },
      axisTick: { show: false },
      axisLabel: { color: c.text, fontSize: 11, rotate: categories.length > 10 ? -30 : 0 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: c.split, type: "dashed" } },
      axisLine: { show: false },
      axisLabel: { color: c.text, fontSize: 11 },
    },
    series: [
      {
        type: "line",
        smooth: 0.35,
        symbol: "circle",
        symbolSize: 6,
        showSymbol: categories.length <= 14,
        lineStyle: { width: 2.2, color: top },
        itemStyle: { color: top, borderColor: "#f5f5f5", borderWidth: 1 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: dark ? "rgba(197, 24, 34, 0.22)" : "rgba(197, 24, 34, 0.2)" },
              { offset: 1, color: bottom },
            ],
          },
        },
        data: values,
      },
    ],
  };
}

/**
 * Barras verticales por día de la semana.
 * Recibe los 7 días con etiquetas cortas (Lun, Mar…) y marca el día actual.
 * Opcionalmente dibuja una línea de referencia (target diario de horas).
 */
export function buildWeekBarOption(
  days: { label: string; value: number; isToday: boolean }[],
  dark: boolean,
  targetHours?: number,
): EChartsOption {
  const c = axisColors(dark);
  const baseColor = CORP_BLUE;
  const todayColor = CORP_RED;

  const markLine =
    targetHours && targetHours > 0
      ? {
          markLine: {
            silent: true,
            symbol: "none",
            label: {
              show: true,
              position: "end" as const,
              formatter: `${targetHours}h`,
              color: c.text,
              fontSize: 10,
            },
            lineStyle: { color: CORP_GRAY, type: "dashed" as const, width: 1.5 },
            data: [{ yAxis: targetHours }],
          },
        }
      : {};

  return {
    animationDuration: 420,
    animationEasing: "cubicOut",
    grid: { left: 8, right: 16, top: 18, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { opacity: 0.12 } },
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: c.text, fontSize: 12 },
      formatter: (params: unknown) => {
        const p = (params as { name: string; value: number }[])[0];
        return `<strong>${p.name}</strong><br/>${p.value.toFixed(2)} h`;
      },
    },
    xAxis: {
      type: "category",
      data: days.map((d) => d.label),
      axisLine: { lineStyle: { color: c.line } },
      axisTick: { show: false },
      axisLabel: { color: c.text, fontSize: 12, fontWeight: "normal" },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: c.split, type: "dashed" } },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: c.text, fontSize: 11, formatter: (v: number) => `${v}h` },
    },
    series: [
      {
        type: "bar",
        barMaxWidth: 48,
        data: days.map((d) => ({
          value: d.value,
          itemStyle: {
            borderRadius: [3, 3, 0, 0],
            color: d.isToday ? todayColor : baseColor,
            opacity: d.value === 0 ? 0.25 : 1,
          },
        })),
        ...markLine,
      },
    ],
  };
}

/** Roseta (área): buena para prioridades y pocas categorías. */
export function buildRoseChartOption(items: { name: string; value: number }[], dark: boolean): EChartsOption {
  const c = axisColors(dark);
  const palette = [CORP_RED, CORP_BLUE, CORP_GRAY, CORP_GREEN, CORP_ORANGE];

  return {
    color: palette,
    animationDuration: 480,
    tooltip: {
      trigger: "item",
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: c.text, fontSize: 12 },
    },
    legend: {
      bottom: 2,
      left: "center",
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: c.text, fontSize: 10 },
    },
    series: [
      {
        type: "pie",
        radius: ["18%", "72%"],
        center: ["50%", "46%"],
        roseType: "area",
        itemStyle: { borderRadius: 2, borderColor: "hsl(0 0% 96%)", borderWidth: 1.5 },
        label: { color: c.text, fontSize: 10 },
        labelLine: { lineStyle: { color: c.line } },
        data: items.map((d) => ({ name: d.name, value: d.value })),
      },
    ],
  };
}
