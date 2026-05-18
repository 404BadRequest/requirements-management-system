import type { BudgetAllocation } from "@/types/domain";
import type { BudgetInput } from "@/schemas/budget-schema";

export interface BudgetsRepository {
  getAll(): Promise<BudgetAllocation[]>;
  create(input: BudgetInput): Promise<BudgetAllocation>;
  update(id: string, input: Partial<BudgetInput>): Promise<BudgetAllocation | undefined>;
  delete(id: string): Promise<boolean>;
}
