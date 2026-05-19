import type { ContractBudget, ContractProfileAllocation } from "@/types/domain";
import type { BudgetInput, BudgetPatchInput } from "@/schemas/budget-schema";

export type ContractBudgetWithAllocations = ContractBudget & {
  allocations: ContractProfileAllocation[];
};

export interface BudgetsRepository {
  getAll(): Promise<ContractBudgetWithAllocations[]>;
  create(input: BudgetInput): Promise<ContractBudgetWithAllocations>;
  update(id: string, input: BudgetPatchInput): Promise<ContractBudgetWithAllocations | undefined>;
  delete(id: string): Promise<boolean>;
}
