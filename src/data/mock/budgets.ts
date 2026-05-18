import { budgetScopeCodes } from "@/data/mock/settings-catalog-seed";
import type { BudgetAllocation } from "@/types/domain";

const now = new Date().toISOString();

const profileIds = ["profile-director", "profile-senior", "profile-engineer", "profile-junior"];

export const budgetsMock: BudgetAllocation[] = profileIds.flatMap((profileId, idx) =>
  budgetScopeCodes.map((scope, scopeIndex) => ({
    id: `budget-${profileId}-${scopeIndex}`,
    projectId: "proj-main",
    scope,
    profileId,
    quotedMinutes: (idx + 3) * (scopeIndex + 2) * 700,
    createdAt: now,
    updatedAt: now,
  })),
);
