export type LineValuation = {
  revenueClp: number;
  opexAmountClp: number;
  marginClp: number;
  marginPercentage: number;
};

export function computeLineValuation(
  costClp: number,
  markupPercentage: number,
  opexPercentage: number,
): LineValuation {
  const revenueClp = costClp * (1 + markupPercentage / 100);
  const opexAmountClp = costClp * (opexPercentage / 100);
  const marginClp = revenueClp - costClp - opexAmountClp;
  const marginPercentage = revenueClp > 0 ? (marginClp / revenueClp) * 100 : 0;
  return { revenueClp, opexAmountClp, marginClp, marginPercentage };
}
