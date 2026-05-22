import type { FinancialReferenceRatesUpdateInput } from "@/data/contracts/financial-reference-rates-contract";
import { financialReferenceRatesSeed } from "@/data/mock/financial-reference-rates-seed";
import type { FinancialReferenceRates } from "@/types/domain";

let row: FinancialReferenceRates = { ...financialReferenceRatesSeed };

export class MockFinancialReferenceRatesRepository {
  async get(): Promise<FinancialReferenceRates> {
    return { ...row };
  }

  async update(input: FinancialReferenceRatesUpdateInput): Promise<FinancialReferenceRates> {
    const now = new Date().toISOString();
    row = {
      ...row,
      ufToClp: input.ufToClp,
      usdToClp: input.usdToClp,
      weeklyCapacityHours: input.weeklyCapacityHours,
      updatedAt: now,
    };
    return { ...row };
  }
}
