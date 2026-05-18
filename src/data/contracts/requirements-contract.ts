import type { Requirement, RequirementComment, RequirementStatusHistory } from "@/types/domain";
import type { RequirementInput } from "@/schemas/requirement-schema";

export interface RequirementsRepository {
  getAll(): Promise<Requirement[]>;
  getById(id: string): Promise<Requirement | undefined>;
  create(input: RequirementInput): Promise<Requirement>;
  update(id: string, input: Partial<RequirementInput>): Promise<Requirement | undefined>;
  delete(id: string): Promise<boolean>;
  getComments(requirementId: string): Promise<RequirementComment[]>;
  createComment(input: { requirementId: string; userId: string; body: string }): Promise<RequirementComment>;
  getStatusHistory(requirementId: string): Promise<RequirementStatusHistory[]>;
}
