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
  getRequirements,
  getTimeEntries,
  getUsers,
  updateBudget,
} from "@/data/repositories/server-db";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { formatCatalogLabel } from "@/lib/formatting/catalog-label";
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

export async function loadBudgetContractDetailData(contractId: string) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "budgets.read");

  const [contractsData, allocationsData, profilesData, entries, users, requirements, clientsData, referenceRates, timeCategories] = await Promise.all([
    getContractBudgets(),
    getContractProfileAllocations(),
    getProfiles(),
    getTimeEntries(),
    getUsers(),
    getRequirements(),
    getClients(),
    getFinancialReferenceRates(),
    getCatalogByKind("time_entry_category"),
  ]);

  const contract = contractsData.find((row) => row.id === contractId);
  if (!contract) {
    throw new Error("No se encontró el contrato solicitado.");
  }

  const allocations = allocationsData.filter((row) => row.contractId === contractId);
  const entriesForContract = entries.filter((row) => row.contractId === contractId);
  const consumption = calculateContractConsumptions({
    contracts: [contract],
    allocations,
    entries: entriesForContract,
    users,
    profiles: profilesData,
    referenceRates,
  });

  const quotedMinutes = consumption.totalQuotedMinutes;
  const usedMinutes = consumption.totalUsedMinutes;
  const availableMinutes = quotedMinutes - usedMinutes;
  const client = clientsData.find((row) => row.id === contract.clientId) ?? null;

  const profileById = new Map(profilesData.map((profile) => [profile.id, profile]));
  const userById = new Map(users.map((u) => [u.id, u]));
  const requirementById = new Map(requirements.map((req) => [req.id, req]));
  const allocationKeySet = new Set(allocations.map((row) => `${row.contractId}::${row.profileId}`));
  const canPickAnyOwner = user?.role === "Admin" || user?.role === "Project Manager";
  const currentDirectoryUserId = user ? resolveDirectoryUserIdForSession(user, users) : "";

  const correctionRows = entriesForContract
    .filter((entry) => {
      if (!entry.contractProfileId) return true;
      return !allocationKeySet.has(`${entry.contractId}::${entry.contractProfileId}`);
    })
    .sort((a, b) => {
      const d = b.date.localeCompare(a.date);
      if (d !== 0) return d;
      return b.startTime.localeCompare(a.startTime);
    })
    .map((entry) => {
      const entryUser = userById.get(entry.userId);
      const workerProfile = entryUser ? profileById.get(entryUser.profileId) : undefined;
      const assignedContractProfile = entry.contractProfileId ? profileById.get(entry.contractProfileId) : undefined;
      const linkedRequirement = entry.requirementId ? requirementById.get(entry.requirementId) : undefined;
      const status = !entry.contractProfileId ? "Sin asignación contractual" : "Perfil no cotizado en contrato";
      const canManageOwnEntryAndRequirement =
        entry.userId === currentDirectoryUserId &&
        (!linkedRequirement || linkedRequirement.ownerId === currentDirectoryUserId);
      return {
        id: entry.id,
        entry,
        canEdit: canPickAnyOwner || canManageOwnEntryAndRequirement,
        date: entry.date,
        userName: entryUser?.name ?? entry.userId,
        workerProfileName: workerProfile?.name ?? "—",
        assignedContractProfileName: entry.contractProfileId
          ? (assignedContractProfile?.name ?? entry.contractProfileId)
          : "—",
        durationMinutes: entry.durationMinutes,
        durationLabel: `${(entry.durationMinutes / 60).toFixed(1)} h`,
        requirementTitle: linkedRequirement?.title ?? "Sin requerimiento",
        status,
      };
    });

  const profileAllocationRows = allocations.map((allocation) => {
    const profile = profileById.get(allocation.profileId);
    const usage = consumption.byContractProfile.find((row) => row.contractId === allocation.contractId && row.profileId === allocation.profileId);
    const usedProfileMinutes = usage?.usedMinutes ?? 0;
    const quotedProfileMinutes = allocation.quotedMinutes;
    const availableProfileMinutes = quotedProfileMinutes - usedProfileMinutes;
    return {
      id: allocation.id,
      profileName: profile?.name ?? allocation.profileId,
      quotedLabel: `${(quotedProfileMinutes / 60).toFixed(1)} h`,
      usedLabel: `${(usedProfileMinutes / 60).toFixed(1)} h`,
      availableLabel: `${(availableProfileMinutes / 60).toFixed(1)} h`,
    };
  });

  return {
    contract,
    client,
    quotedMinutes,
    usedMinutes,
    availableMinutes,
    unallocatedCount: consumption.unallocatedCount,
    unallocatedMinutes: consumption.unallocatedMinutes,
    profileAllocationRows,
    correctionRows,
    users: users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.name })),
    requirements: requirements.map((r) => ({ id: r.id, title: r.title })),
    contracts: contractsData.filter((c) => c.active).map((c) => ({ id: c.id, label: `${c.code} · ${c.name}` })),
    contractProfiles: profilesData.map((p) => ({ id: p.id, label: p.name })),
    categories: timeCategories.filter((c) => c.active).map((c) => ({ code: c.code, label: formatCatalogLabel(c.code, c.label) })),
    canPickAnyOwner,
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
