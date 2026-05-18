import type { FinancialReferenceRates } from "@/types/domain";
import { seedNow } from "@/data/mock/seed/timestamps";

export const financialReferenceRatesSeed: FinancialReferenceRates = {
  id: "default",
  ufToClp: 39500,
  usdToClp: 950,
  updatedAt: seedNow,
};
