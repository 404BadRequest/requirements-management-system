import type {
  RequirementTaskCreateInput,
  RequirementTaskUpdateInput,
  RequirementTasksRepository,
} from "@/data/contracts/requirement-tasks-contract";
import type { RequirementTask } from "@/types/domain";

const db: RequirementTask[] = [];

export class MockRequirementTasksRepository implements RequirementTasksRepository {
  async getByRequirementId(requirementId: string): Promise<RequirementTask[]> {
    return db
      .filter((t) => t.requirementId === requirementId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  }

  async create(input: RequirementTaskCreateInput): Promise<RequirementTask> {
    const now = new Date().toISOString();
    const created: RequirementTask = {
      id: `task-${crypto.randomUUID().slice(0, 10)}`,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    db.push(created);
    return created;
  }

  async update(id: string, input: RequirementTaskUpdateInput): Promise<RequirementTask | undefined> {
    const index = db.findIndex((t) => t.id === id);
    if (index === -1) return undefined;
    const next: RequirementTask = { ...db[index], ...input, updatedAt: new Date().toISOString() };
    db[index] = next;
    return next;
  }

  async delete(id: string): Promise<boolean> {
    const index = db.findIndex((t) => t.id === id);
    if (index === -1) return false;
    db.splice(index, 1);
    return true;
  }
}
