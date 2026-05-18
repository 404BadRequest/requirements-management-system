import { requirementCommentsMock, requirementsMock, requirementStatusHistoryMock } from "@/data/mock/requirements";
import type { RequirementsRepository } from "@/data/contracts/requirements-contract";
import type { Requirement, RequirementComment, RequirementStatusHistory } from "@/types/domain";
import type { RequirementInput } from "@/schemas/requirement-schema";

const db: Requirement[] = [...requirementsMock];
const statusHistory: RequirementStatusHistory[] = [...requirementStatusHistoryMock];
const commentsStore: RequirementComment[] = requirementCommentsMock.map((c) => ({ ...c }));

export class MockRequirementsRepository implements RequirementsRepository {
  async getAll(): Promise<Requirement[]> {
    return [...db];
  }

  async getById(id: string): Promise<Requirement | undefined> {
    return db.find((item) => item.id === id);
  }

  async create(input: RequirementInput): Promise<Requirement> {
    const now = new Date().toISOString();
    const created: Requirement = {
      id: `req-${crypto.randomUUID().slice(0, 8)}`,
      ...input,
      notes: input.notes ?? "",
      createdAt: now,
      updatedAt: now,
      completedAt: input.status === "DONE_PROD" ? now : null,
    };
    db.unshift(created);
    return created;
  }

  async update(id: string, input: Partial<RequirementInput>): Promise<Requirement | undefined> {
    const index = db.findIndex((item) => item.id === id);
    if (index === -1) return undefined;
    const current = db[index];
    const updated: Requirement = {
      ...current,
      ...input,
      updatedAt: new Date().toISOString(),
      completedAt: input.status === "DONE_PROD" ? new Date().toISOString() : current.completedAt,
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

  async getComments(requirementId: string) {
    return commentsStore
      .filter((item) => item.requirementId === requirementId)
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async createComment(input: { requirementId: string; userId: string; body: string }): Promise<RequirementComment> {
    const now = new Date().toISOString();
    const created: RequirementComment = {
      id: `comment-${crypto.randomUUID().slice(0, 10)}`,
      requirementId: input.requirementId,
      userId: input.userId,
      body: input.body,
      createdAt: now,
    };
    commentsStore.push(created);
    return created;
  }

  async getStatusHistory(requirementId: string) {
    return statusHistory
      .filter((item) => item.requirementId === requirementId)
      .slice()
      .sort((a, b) => (a.changedAt < b.changedAt ? 1 : -1));
  }

  appendStatusHistory(entry: RequirementStatusHistory): void {
    statusHistory.unshift(entry);
  }
}
