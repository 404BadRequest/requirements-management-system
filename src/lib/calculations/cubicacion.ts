import type { CubicacionItem } from "@/types/domain";

export interface CubicacionRowCalc {
  levantamiento: number;
  diseno: number;
  qaAjustes: number;
  puestaEnMarcha: number;
  totalHoras: number;
  /** seniorHoras = (totalHoras × seniorPct) − qaAjustes  (fórmula: =(H4*0.7)−F4) */
  seniorHoras: number;
  ingenieroHoras: number;
  /** juniorHoras = (totalHoras × juniorPct) − qaAjustes  (fórmula: =(H4*0.6)−F4) */
  juniorHoras: number;
}

export interface CubicacionTotals {
  construccionTotal: number;
  totalHoras: number;
  seniorHoras: number;
  ingenieroHoras: number;
  juniorHoras: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcCubicacionRow(item: Pick<
  CubicacionItem,
  | "construccionHours"
  | "levantamientoPct"
  | "disenoPct"
  | "qaAjustesPct"
  | "puestaEnMarchaPct"
  | "seniorPct"
  | "ingeneroPct"
  | "juniorPct"
>): CubicacionRowCalc {
  const { construccionHours: c, levantamientoPct, disenoPct, qaAjustesPct, puestaEnMarchaPct, seniorPct, ingeneroPct, juniorPct } = item;

  const levantamiento = round2(c * levantamientoPct);
  const diseno = round2(c * disenoPct);
  const qaAjustes = round2(c * qaAjustesPct);
  const puestaEnMarcha = round2(c * puestaEnMarchaPct);
  const totalHoras = round2(levantamiento + diseno + c + qaAjustes + puestaEnMarcha);

  const seniorHoras = round2(Math.max(0, totalHoras * seniorPct - qaAjustes));
  const ingenieroHoras = round2(totalHoras * ingeneroPct);
  const juniorHoras = round2(Math.max(0, totalHoras * juniorPct - qaAjustes));

  return { levantamiento, diseno, qaAjustes, puestaEnMarcha, totalHoras, seniorHoras, ingenieroHoras, juniorHoras };
}

export function calcCubicacionTotals(items: CubicacionItem[]): CubicacionTotals {
  let construccionTotal = 0;
  let totalHoras = 0;
  let seniorHoras = 0;
  let ingenieroHoras = 0;
  let juniorHoras = 0;

  for (const item of items) {
    const row = calcCubicacionRow(item);
    construccionTotal += item.construccionHours;
    totalHoras += row.totalHoras;
    seniorHoras += row.seniorHoras;
    ingenieroHoras += row.ingenieroHoras;
    juniorHoras += row.juniorHoras;
  }

  return {
    construccionTotal: round2(construccionTotal),
    totalHoras: round2(totalHoras),
    seniorHoras: round2(seniorHoras),
    ingenieroHoras: round2(ingenieroHoras),
    juniorHoras: round2(juniorHoras),
  };
}

/** Porcentajes por defecto del sistema (fracciones decimales, ej. 0.05 = 5%). */
export const CUBICACION_DEFAULTS = {
  levantamientoPct: 0.05,
  disenoPct: 0.2,
  qaAjustesPct: 0.15,
  puestaEnMarchaPct: 0.1,
  seniorPct: 0.7,
  ingeneroPct: 0.3,
  juniorPct: 0.6,
} as const;
