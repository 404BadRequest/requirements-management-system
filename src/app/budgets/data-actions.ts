"use server";

import { createBudget, getClients, getContractBudgets, getContractProfileAllocations, getCatalogByKind, getProfiles, getTimeEntries, getUsers } from "@/data/repositories/server-db";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import type { SettingsCatalogEntry } from "@/types/domain";
import type { BudgetInput } from "@/schemas/budget-schema";
import { calculateContractConsumptions } from "@/lib/calculations/contract-budget";

export async function loadBudgetsPageData(projectId?: string) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "budgets.read");
  const [contractsData, allocationsData, profilesData, entries, users, clientsData, scopeRows] = await Promise.all([
    getContractBudgets(),
    getContractProfileAllocations(),
    getProfiles(),
    getTimeEntries(),
    getUsers(),
    getClients(),
    getCatalogByKind("budget_scope"),
  ]);
  const pid = projectId?.trim() || undefined;
  const contractsFiltered = pid ? contractsData.filter((contract) => contract.projectId === pid) : contractsData;
  const contractIds = new Set(contractsFiltered.map((contract) => contract.id));
  const allocationsFiltered = allocationsData.filter((allocation) => contractIds.has(allocation.contractId));
  const entriesFiltered = pid ? entries.filter((e) => e.projectId === pid) : entries;
  const consumption = calculateContractConsumptions({
    contracts: contractsFiltered,
    allocations: allocationsFiltered,
    entries: entriesFiltered,
    users,
  });
  return {
    contracts: contractsFiltered,
    allocations: allocationsFiltered,
    profiles: profilesData,
    clients: clientsData,
    scopes: scopeRows as SettingsCatalogEntry[],
    usedMinutes: consumption.totalUsedMinutes,
    quotedMinutes: consumption.totalQuotedMinutes,
    consumptionByContract: consumption.byContract,
    consumptionByContractProfile: consumption.byContractProfile,
  };
}

export async function createBudgetAction(values: BudgetInput) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "budgets.write");
  return createBudget(values);
}
