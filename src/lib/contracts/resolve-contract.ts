import type { ContractBudget, Requirement } from "@/types/domain";

type ResolveContractInput = {
  contractId: string | null | undefined;
  clientId: string;
  projectId: string;
  atDate: string;
  contracts: ContractBudget[];
};

export function resolveContractIdByContext(input: ResolveContractInput): string | null {
  const explicit = (input.contractId ?? "").trim();
  if (explicit) {
    const selected = input.contracts.find((contract) => contract.id === explicit);
    if (selected?.active) return selected.id;
  }

  const candidates = input.contracts.filter((contract) => {
    if (!contract.active) return false;
    if (contract.clientId !== input.clientId) return false;
    if (contract.projectId !== input.projectId) return false;
    return contract.startDate <= input.atDate && contract.endDate >= input.atDate;
  });
  if (candidates.length === 1) return candidates[0].id;
  return null;
}

export function resolveContractIdForTimeEntry(input: {
  contractId: string | null | undefined;
  requirementId: string | null;
  projectId: string;
  date: string;
  requirements: Requirement[];
  contracts: ContractBudget[];
}): string | null {
  const requirement = input.requirementId ? input.requirements.find((row) => row.id === input.requirementId) : undefined;
  return resolveContractIdByContext({
    contractId: input.contractId ?? requirement?.contractId,
    clientId: requirement?.clientId ?? "",
    projectId: input.projectId,
    atDate: input.date,
    contracts: input.contracts,
  });
}
