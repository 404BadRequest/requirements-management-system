import type { BudgetsRepository } from "@/data/contracts/budgets-contract";
import { contractBudgetsWithAllocationsMock } from "@/data/mock/budgets";
import type { ContractBudgetWithAllocations } from "@/data/contracts/budgets-contract";
import type { BudgetInput, BudgetPatchInput } from "@/schemas/budget-schema";

const db: ContractBudgetWithAllocations[] = [...contractBudgetsWithAllocationsMock];

export class MockBudgetsRepository implements BudgetsRepository {
  async getAll(): Promise<ContractBudgetWithAllocations[]> {
    return db.map((item) => ({ ...item, allocations: [...item.allocations] }));
  }

  async create(input: BudgetInput): Promise<ContractBudgetWithAllocations> {
    const now = new Date().toISOString();
    const contractId = `contract-${crypto.randomUUID().slice(0, 8)}`;
    const created: ContractBudgetWithAllocations = {
      id: contractId,
      projectId: input.projectId,
      clientId: input.clientId,
      scope: input.scope,
      code: input.code,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      rateUfPerHour: input.rateUfPerHour,
      active: true,
      allocations: input.allocations.map((allocation) => ({
        id: `alloc-${crypto.randomUUID().slice(0, 10)}`,
        contractId,
        profileId: allocation.profileId,
        quotedMinutes: allocation.quotedMinutes,
        rateUfPerHour: allocation.rateUfPerHour,
        createdAt: now,
        updatedAt: now,
      })),
      createdAt: now,
      updatedAt: now,
    };
    db.push(created);
    return created;
  }

  async update(id: string, input: BudgetPatchInput): Promise<ContractBudgetWithAllocations | undefined> {
    const index = db.findIndex((item) => item.id === id);
    if (index === -1) return undefined;
    const now = new Date().toISOString();
    const updated: ContractBudgetWithAllocations = {
      ...db[index],
      ...input,
      allocations:
        input.allocations?.map((allocation) => ({
          id: `alloc-${crypto.randomUUID().slice(0, 10)}`,
          contractId: id,
          profileId: allocation.profileId,
          quotedMinutes: allocation.quotedMinutes,
          rateUfPerHour: allocation.rateUfPerHour,
          createdAt: now,
          updatedAt: now,
        })) ?? db[index].allocations,
      updatedAt: now,
    };
    db[index] = updated;
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const index = db.findIndex((item) => item.id === id);
    if (index === -1) return false;
    db.splice(index, 1);
    return true;
  }
}
