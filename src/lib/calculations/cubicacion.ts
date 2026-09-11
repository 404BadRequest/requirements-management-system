import type { CubicacionItem } from "@/types/domain";
import { sumDirectProfileHours } from "@/lib/cubicacion/direct-profile-hours";

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
  /** Suma de horas directas de todos los perfiles. */
  directHorasTotal: number;
  /** Horas directas por profileId. */
  directProfileHours: Record<string, number>;
  /** @deprecated Compatibilidad — horas del perfil Director si está en el mapa o columna legacy. */
  directorHoras: number;
  /** @deprecated Compatibilidad — horas del perfil Diseñador si está en el mapa o columna legacy. */
  disenadorHoras: number;
}

export interface CubicacionTotals {
  construccionTotal: number;
  totalHoras: number;
  seniorHoras: number;
  ingenieroHoras: number;
  juniorHoras: number;
  directHorasTotal: number;
  directProfileHours: Record<string, number>;
  directorHoras: number;
  disenadorHoras: number;
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
  | "directProfileHours"
  | "directorHours"
  | "disenadorHours"
>): CubicacionRowCalc {
  const {
    construccionHours: c,
    levantamientoPct, disenoPct, qaAjustesPct, puestaEnMarchaPct,
    seniorPct, ingeneroPct, juniorPct,
    directorHours, disenadorHours,
  } = item;

  const levantamiento = round2(c * levantamientoPct);
  const diseno = round2(c * disenoPct);
  const qaAjustes = round2(c * qaAjustesPct);
  const puestaEnMarcha = round2(c * puestaEnMarchaPct);

  // fasesHoras: base para los cálculos de porcentajes por perfil (Senior/Ing./Junior).
  // No incluye horas directas, ya que esas son pass-through.
  const fasesHoras = round2(levantamiento + diseno + c + qaAjustes + puestaEnMarcha);

  const directProfileHours = { ...(item.directProfileHours ?? {}) };
  let directHorasTotal = sumDirectProfileHours(directProfileHours);
  // Fallback legacy si el mapa aún no fue rellenado.
  if (directHorasTotal === 0 && Object.keys(directProfileHours).length === 0) {
    directHorasTotal = round2((directorHours ?? 0) + (disenadorHours ?? 0));
  }

  const totalHoras = round2(fasesHoras + directHorasTotal);

  const seniorHoras = round2(Math.max(0, fasesHoras * seniorPct - qaAjustes));
  const ingenieroHoras = round2(fasesHoras * ingeneroPct);
  const juniorHoras = round2(Math.max(0, fasesHoras * juniorPct - qaAjustes));

  return {
    levantamiento, diseno, qaAjustes, puestaEnMarcha, totalHoras,
    seniorHoras, ingenieroHoras, juniorHoras,
    directHorasTotal,
    directProfileHours,
    directorHoras: directorHours ?? 0,
    disenadorHoras: disenadorHours ?? 0,
  };
}

export function calcCubicacionTotals(items: CubicacionItem[]): CubicacionTotals {
  let construccionTotal = 0;
  let totalHoras = 0;
  let seniorHoras = 0;
  let ingenieroHoras = 0;
  let juniorHoras = 0;
  let directHorasTotal = 0;
  let directorHoras = 0;
  let disenadorHoras = 0;
  const directProfileHours: Record<string, number> = {};

  for (const item of items) {
    const row = calcCubicacionRow(item);
    construccionTotal += item.construccionHours;
    totalHoras += row.totalHoras;
    seniorHoras += row.seniorHoras;
    ingenieroHoras += row.ingenieroHoras;
    juniorHoras += row.juniorHoras;
    directHorasTotal += row.directHorasTotal;
    directorHoras += row.directorHoras;
    disenadorHoras += row.disenadorHoras;
    for (const [profileId, hours] of Object.entries(row.directProfileHours)) {
      directProfileHours[profileId] = round2((directProfileHours[profileId] ?? 0) + hours);
    }
  }

  return {
    construccionTotal: round2(construccionTotal),
    totalHoras: round2(totalHoras),
    seniorHoras: round2(seniorHoras),
    ingenieroHoras: round2(ingenieroHoras),
    juniorHoras: round2(juniorHoras),
    directHorasTotal: round2(directHorasTotal),
    directProfileHours,
    directorHoras: round2(directorHoras),
    disenadorHoras: round2(disenadorHoras),
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
