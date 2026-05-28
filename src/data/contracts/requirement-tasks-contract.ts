import type { RequirementTask, RequirementTaskStatus } from "@/types/domain";

export interface RequirementTaskCreateInput {
  requirementId: string;
  title: string;
  description: string;
  status: RequirementTaskStatus;
  estimatedHours: number | null;
  sortOrder: number;
}

export type RequirementTaskUpdateInput = Partial<Omit<RequirementTaskCreateInput, "requirementId">>;

export interface RequirementTasksRepository {
  getByRequirementId(requirementId: string): Promise<RequirementTask[]>;
  create(input: RequirementTaskCreateInput): Promise<RequirementTask>;
  update(id: string, input: RequirementTaskUpdateInput): Promise<RequirementTask | undefined>;
  delete(id: string): Promise<boolean>;
}
