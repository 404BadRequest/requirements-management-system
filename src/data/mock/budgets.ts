import { budgetScopeCodes } from "@/data/mock/settings-catalog-seed";
import type { BudgetAllocation, ContractBudget, ContractProfileAllocation } from "@/types/domain";
import type { ContractBudgetWithAllocations } from "@/data/contracts/budgets-contract";

const now = new Date().toISOString();

const profileIds = ["profile-director", "profile-senior", "profile-engineer", "profile-junior"];

export const contractBudgetsMock: ContractBudget[] = budgetScopeCodes.map((scope, scopeIndex) => ({
  id: `contract-${scopeIndex + 1}`,
  clientId: "client-74f8a2c1",
  projectId: "proj-main",
  scope,
  code: `CTR-${String(scopeIndex + 1).padStart(3, "0")}`,
  name: `Contrato ${scopeIndex + 1}`,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  rateUfPerHour: 1,
  markupPercentage: 40,
  opexPercentage: 10,
  active: true,
  createdAt: now,
  updatedAt: now,
}));

export const contractProfileAllocationsMock: ContractProfileAllocation[] = contractBudgetsMock.flatMap((contract, scopeIndex) =>
  profileIds.map((profileId, idx) => ({
    id: `alloc-${contract.id}-${profileId}`,
    contractId: contract.id,
    profileId,
    quotedMinutes: (idx + 2) * (scopeIndex + 1) * 600,
    rateUfPerHour: null,
    createdAt: now,
    updatedAt: now,
  })),
);

export const contractBudgetsWithAllocationsMock: ContractBudgetWithAllocations[] = contractBudgetsMock.map((contract) => ({
  ...contract,
  allocations: contractProfileAllocationsMock.filter((allocation) => allocation.contractId === contract.id),
}));

export const budgetsMock: BudgetAllocation[] = contractProfileAllocationsMock.map((allocation) => {
  const contract = contractBudgetsMock.find((row) => row.id === allocation.contractId)!;
  return {
    id: allocation.id,
    projectId: contract.projectId,
    scope: contract.scope,
    profileId: allocation.profileId,
    quotedMinutes: allocation.quotedMinutes,
    createdAt: allocation.createdAt,
    updatedAt: allocation.updatedAt,
  };
});
