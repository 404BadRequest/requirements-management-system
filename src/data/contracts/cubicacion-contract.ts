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
  sortOrder: number;
};

export type CubicacionItemUpdateInput = Partial<Omit<CubicacionItemCreateInput, "contractId">>;
