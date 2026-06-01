import type { ContractBudget, Requirement, SettingsCatalogEntry } from "@/types/domain";

type CatalogLike = { code: string };

export function resolveTimeEntryCategoryFromContractScope(
  contractScope: string | null | undefined,
  timeEntryCategories: CatalogLike[],
): string | null {
  const scope = (contractScope ?? "").trim();
  if (!scope) return null;
  if (timeEntryCategories.some((entry) => entry.code === scope)) return scope;
  return scope;
}

export function resolveTimeEntryCategoryForContract(
  contractId: string | null | undefined,
  contracts: ContractBudget[],
  timeEntryCategories: CatalogLike[],
): string | null {
  if (!contractId) return null;
  const contract = contracts.find((row) => row.id === contractId);
  if (!contract) return null;
  return resolveTimeEntryCategoryFromContractScope(contract.scope, timeEntryCategories);
}

export function resolveTimeEntryCategoryForRequirement(input: {
  requirementId: string | null | undefined;
  contractId: string | null | undefined;
  requirements: Requirement[];
  contracts: ContractBudget[];
  timeEntryCategories: CatalogLike[];
}): string | null {
  const requirement = input.requirementId
    ? input.requirements.find((row) => row.id === input.requirementId)
    : undefined;
  const contractId = (input.contractId ?? requirement?.contractId ?? "").trim() || null;
  return resolveTimeEntryCategoryForContract(contractId, input.contracts, input.timeEntryCategories);
}

export function timeEntryCategoryDisplayLabel(
  code: string,
  timeEntryCategories: Array<{ code: string; label?: string | null }>,
  budgetScopes: Array<{ code: string; label?: string | null }> = [],
): string {
  const fromCategory = timeEntryCategories.find((entry) => entry.code === code);
  if (fromCategory?.label) return fromCategory.label;
  const fromScope = budgetScopes.find((entry) => entry.code === code);
  if (fromScope?.label) return fromScope.label;
  return code;
}
