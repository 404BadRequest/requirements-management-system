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
  label: string;
  scope: string;
  scopeLabel: string;
};

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
        label: `${contract.code} · ${contract.name}`,
        scope: contract.scope,
        scopeLabel: formatCatalogLabel(contract.scope, scopeEntry?.label),
      };
    });
}
