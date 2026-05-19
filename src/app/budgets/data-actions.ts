"use server";

import {
  createBudget,
  deleteBudget,
  getClients,
  getContractBudgets,
  getContractProfileAllocations,
  getFinancialReferenceRates,
  getCatalogByKind,
  getProfiles,
  getTimeEntries,
  getUsers,
  updateBudget,
} from "@/data/repositories/server-db";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import type { SettingsCatalogEntry } from "@/types/domain";
import type { BudgetInput } from "@/schemas/budget-schema";
import { calculateContractConsumptions } from "@/lib/calculations/contract-budget";

export async function loadBudgetsPageData(projectId?: string) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "budgets.read");
  const [contractsData, allocationsData, profilesData, entries, users, clientsData, scopeRows, referenceRates] = await Promise.all([
    getContractBudgets(),
    getContractProfileAllocations(),
    getProfiles(),
    getTimeEntries(),
    getUsers(),
    getClients(),
    getCatalogByKind("budget_scope"),
    getFinancialReferenceRates(),
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
    profiles: profilesData,
    referenceRates,
  });
  return {
    contracts: contractsFiltered,
    allocations: allocationsFiltered,
    profiles: profilesData,
    clients: clientsData,
    scopes: scopeRows as SettingsCatalogEntry[],
    usedMinutes: consumption.totalUsedMinutes,
    quotedMinutes: consumption.totalQuotedMinutes,
    unallocatedMinutes: consumption.unallocatedMinutes,
    unallocatedCount: consumption.unallocatedCount,
    consumptionByContract: consumption.byContract,
    consumptionByContractProfile: consumption.byContractProfile,
  };
}

export async function createBudgetAction(values: BudgetInput) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "budgets.write");
  const contracts = await getContractBudgets();
  const nextNumber =
    contracts
      .map((contract) => {
        const match = contract.code.match(/(\d+)$/);
        return match ? Number(match[1]) : 0;
      })
      .reduce((acc, curr) => Math.max(acc, curr), 0) + 1;
  const generatedCode = `CTR-${String(nextNumber).padStart(3, "0")}`;
  return createBudget({
    ...values,
    code: generatedCode,
    rateUfPerHour: 1,
  });
}

export async function updateBudgetAction(id: string, values: BudgetInput) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "budgets.write");
  const contracts = await getContractBudgets();
  const current = contracts.find((contract) => contract.id === id);
  if (!current) {
    throw new Error("No se encontró el contrato a actualizar.");
  }
  return updateBudget(id, {
    ...values,
    code: current.code,
    rateUfPerHour: current.rateUfPerHour,
  });
}

export async function deleteBudgetAction(id: string) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "budgets.write");
  const ok = await deleteBudget(id);
  if (!ok) {
    throw new Error("No se pudo eliminar el contrato.");
  }
  return ok;
}
