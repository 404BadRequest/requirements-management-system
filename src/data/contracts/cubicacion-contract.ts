export type CubicacionItemCreateInput = {
  contractId: string;
  requirementId: string | null;
  activityName: string;
  construccionHours: number;
  levantamientoPct: number;
  disenoPct: number;
  qaAjustesPct: number;
  puestaEnMarchaPct: number;
  seniorPct: number;
  ingeneroPct: number;
  juniorPct: number;
  /** Horas directas del Director (sin cálculo de porcentajes). */
  directorHours: number;
  /** Horas directas del Diseñador (sin cálculo de porcentajes). */
  disenadorHours: number;
  sortOrder: number;
};

export type CubicacionItemUpdateInput = Partial<Omit<CubicacionItemCreateInput, "contractId">>;
