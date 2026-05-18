import type { BudgetsRepository } from "@/data/contracts/budgets-contract";
import { budgetsMock } from "@/data/mock/budgets";
import type { BudgetAllocation } from "@/types/domain";
import type { BudgetInput } from "@/schemas/budget-schema";

const db: BudgetAllocation[] = [...budgetsMock];

export class MockBudgetsRepository implements BudgetsRepository {
  async getAll(): Promise<BudgetAllocation[]> {
    return [...db];
  }

  async create(input: BudgetInput): Promise<BudgetAllocation> {
    const now = new Date().toISOString();
    const created: BudgetAllocation = {
      id: `budget-${crypto.randomUUID().slice(0, 8)}`,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    db.push(created);
    return created;
  }

  async update(id: string, input: Partial<BudgetInput>): Promise<BudgetAllocation | undefined> {
    const index = db.findIndex((item) => item.id === id);
    if (index === -1) return undefined;
    const updated: BudgetAllocation = {
      ...db[index],
      ...input,
      updatedAt: new Date().toISOString(),
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
