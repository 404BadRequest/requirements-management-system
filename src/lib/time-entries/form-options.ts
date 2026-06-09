import { resolveContractIdByContext } from "@/lib/contracts/resolve-contract";
import { formatCatalogLabel } from "@/lib/formatting/catalog-label";
import type { ContractBudget, Requirement, SettingsCatalogEntry } from "@/types/domain";

export type TimeEntryFormRequirement = {
  id: string;
  title: string;
  clientId: string;
  contractId: string | null;
};

export type TimeEntryFormContract = {
  id: string;
  clientId: string;
  projectId: string;
  label: string;
  scope: string;
  scopeLabel: string;
  startDate: string;
  endDate: string;
  active: boolean;
};

export function defaultTimeEntryCategoryCode(categories: Array<{ code: string }>): string {
  const proyecto = categories.find((entry) => entry.code === "PR");
  if (proyecto) return proyecto.code;
  const nonGds = categories.find((entry) => entry.code !== "GDS");
  return nonGds?.code ?? categories[0]?.code ?? "";
}

export function resolveTimeEntryFormContractId(input: {
  contractId: string | null | undefined;
  requirement: TimeEntryFormRequirement | null;
  clientId: string;
  projectId: string;
  date: string;
  contracts: TimeEntryFormContract[];
}): string | null {
  return resolveContractIdByContext({
    contractId: input.contractId ?? input.requirement?.contractId,
    clientId: input.requirement?.clientId ?? input.clientId,
    projectId: input.projectId,
    atDate: input.date,
    contracts: input.contracts,
  });
}

export function mapRequirementsForTimeEntryForm(requirements: Requirement[]): TimeEntryFormRequirement[] {
  return requirements.map((requirement) => ({
    id: requirement.id,
    title: requirement.title,
    clientId: requirement.clientId,
    contractId: requirement.contractId,
  }));
}

export function mapContractsForTimeEntryForm(
  contracts: ContractBudget[],
  budgetScopes: SettingsCatalogEntry[] = [],
): TimeEntryFormContract[] {
  return contracts
    .filter((contract) => contract.active)
    .map((contract) => {
      const scopeEntry = budgetScopes.find((entry) => entry.code === contract.scope);
      return {
        id: contract.id,
        clientId: contract.clientId,
        projectId: contract.projectId,
        label: `${contract.code} · ${contract.name}`,
        scope: contract.scope,
        scopeLabel: formatCatalogLabel(contract.scope, scopeEntry?.label),
        startDate: contract.startDate,
        endDate: contract.endDate,
        active: contract.active,
      };
    });
}
