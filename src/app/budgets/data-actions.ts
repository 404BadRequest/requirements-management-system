"use server";

import {
  createBudget,
  createCubicacionItem,
  createRequirement,
  deleteBudget,
  deleteCubicacionItem,
  getClients,
  getContractBudgets,
  getContractProfileAllocations,
  getCubicacionItems,
  getFinancialReferenceRates,
  getCatalogByKind,
  getOperationalProfiles,
  getOperationalUsers,
  getProfiles,
  getRequirements,
  getTimeEntries,
  updateBudget,
  updateCubicacionItem,
  updateRequirement,
} from "@/data/repositories/server-db";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { formatCatalogLabel } from "@/lib/formatting/catalog-label";
import type { SettingsCatalogEntry } from "@/types/domain";
import type { BudgetInput } from "@/schemas/budget-schema";
import type { CubicacionItemCreateInput, CubicacionItemUpdateInput } from "@/data/contracts/cubicacion-contract";
import { calculateContractConsumptions } from "@/lib/calculations/contract-budget";
import {
  assertOperationalProfileIds,
  filterOperationalProfiles,
  filterOperationalTimeEntries,
  filterOperationalUsers,
  isAdministrativeProfile,
  resolveOperationalActorUserId,
} from "@/lib/profiles/operational-scope";
import {
  type TrafficRisk,
  calculateContractHealthScore,
  calculateCoverageRisk,
  calculateDeviationMetrics,
  calculateElapsedContractPct,
  calculateMisallocationMetrics,
  estimateDepletionDate,
} from "@/lib/calculations/contract-health";

function profileHourlyRateInUf(input: {
  hourlyRate: number;
  rateCurrency: string;
  ufToClp: number;
  usdToClp: number;
}): number | null {
  const currency = input.rateCurrency.trim().toUpperCase();
  if (currency === "UF") return input.hourlyRate;
  if (currency === "CLP") {
    return input.ufToClp > 0 ? input.hourlyRate / input.ufToClp : null;
  }
  if (currency === "USD") {
    if (input.ufToClp <= 0) return null;
    return (input.hourlyRate * input.usdToClp) / input.ufToClp;
  }
  return null;
}

export async function loadBudgetsPageData(projectId?: string) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "budgets.read");
  const [contractsData, allocationsData, profilesData, entries, users, clientsData, scopeRows, referenceRates] = await Promise.all([
    getContractBudgets(),
    getContractProfileAllocations(),
    getOperationalProfiles(),
    getTimeEntries(),
    getOperationalUsers(),
    getClients(),
    getCatalogByKind("budget_scope"),
    getFinancialReferenceRates(),
  ]);
  const pid = projectId?.trim() || undefined;
  const contractsFiltered = pid ? contractsData.filter((contract) => contract.projectId === pid) : contractsData;
  const contractIds = new Set(contractsFiltered.map((contract) => contract.id));
  const allocationsFiltered = allocationsData
    .filter((allocation) => contractIds.has(allocation.contractId))
    .filter((allocation) => profilesData.some((profile) => profile.id === allocation.profileId));
  const entriesFiltered = pid ? entries.filter((e) => e.projectId === pid) : entries;
  const operationalEntries = filterOperationalTimeEntries(entriesFiltered, users, profilesData);
  const consumption = calculateContractConsumptions({
    contracts: contractsFiltered,
    allocations: allocationsFiltered,
    entries: operationalEntries,
    users,
    profiles: profilesData,
    referenceRates,
  });
  const today = new Date().toISOString().slice(0, 10);
  const allocationKeySet = new Set(allocationsFiltered.map((row) => `${row.contractId}::${row.profileId}`));
  const userById = new Map(users.map((u) => [u.id, u]));
  const profileById = new Map(profilesData.map((p) => [p.id, p]));
  const contractById = new Map(contractsFiltered.map((c) => [c.id, c]));
  const clientById = new Map(clientsData.map((c) => [c.id, c.name]));
  const allocationByKey = new Map(allocationsFiltered.map((row) => [`${row.contractId}::${row.profileId}`, row]));
  const consumptionByContract = new Map(consumption.byContract.map((row) => [row.contractId, row]));
  const consumptionByContractProfile = new Map(
    consumption.byContractProfile.map((row) => [`${row.contractId}::${row.profileId}`, row]),
  );

  const equivalentEntryRows = operationalEntries
    .map((entry) => {
      if (!entry.contractId) return null;
      const contract = contractById.get(entry.contractId);
      if (!contract) return null;
      const worker = userById.get(entry.userId);
      if (!worker) return null;
      const workerProfile = profileById.get(worker.profileId);
      if (!workerProfile) return null;
      const workerUfRate = profileHourlyRateInUf({
        hourlyRate: workerProfile.hourlyRate,
        rateCurrency: workerProfile.rateCurrency,
        ufToClp: referenceRates.ufToClp,
        usdToClp: referenceRates.usdToClp,
      });
      if (!workerUfRate || workerUfRate <= 0) return null;
      const targetProfileId = entry.contractProfileId ?? worker.profileId;
      const allocation = allocationByKey.get(`${entry.contractId}::${targetProfileId}`);
      if (!allocation) return null;
      const targetUfRate = allocation.rateUfPerHour ?? contract.rateUfPerHour;
      if (!targetUfRate || targetUfRate <= 0) return null;
      const equivalentMinutes = entry.durationMinutes * (workerUfRate / targetUfRate);
      const ufConsumed = (equivalentMinutes / 60) * targetUfRate;
      return { contractId: entry.contractId, date: entry.date, equivalentMinutes, ufConsumed };
    })
    .filter((row): row is { contractId: string; date: string; equivalentMinutes: number; ufConsumed: number } => Boolean(row));

  const windowStart = new Date(`${today}T12:00:00.000Z`);
  windowStart.setDate(windowStart.getDate() - 28);
  const windowStartDate = windowStart.toISOString().slice(0, 10);
  const burnRateMinutesPerWeekGlobal =
    equivalentEntryRows
      .filter((row) => row.date >= windowStartDate && row.date <= today)
      .reduce((acc, row) => acc + row.equivalentMinutes, 0) / 4;

  let expectedMinutesByDateGlobal = 0;
  let contractsAtRiskCount = 0;
  const topContractsByRisk = contractsFiltered
    .map((contract) => {
      const contractConsumption = consumptionByContract.get(contract.id);
      const quotedContractMinutes = allocationsFiltered
        .filter((row) => row.contractId === contract.id)
        .reduce((acc, row) => acc + row.quotedMinutes, 0);
      const usedContractMinutes = contractConsumption?.usedMinutes ?? 0;
      const availableContractMinutes = quotedContractMinutes - usedContractMinutes;
      const elapsedContractPct = calculateElapsedContractPct({
        startDate: contract.startDate,
        endDate: contract.endDate,
        nowDate: today,
      });
      const deviation = calculateDeviationMetrics({
        quotedMinutes: quotedContractMinutes,
        usedMinutes: usedContractMinutes,
        elapsedPct: elapsedContractPct,
      });
      expectedMinutesByDateGlobal += deviation.expectedMinutesByDate;

      const contractUnallocatedMinutes = operationalEntries
        .filter((entry) => entry.contractId === contract.id)
        .filter((entry) => !entry.contractProfileId || !allocationKeySet.has(`${entry.contractId}::${entry.contractProfileId}`))
        .reduce((acc, entry) => acc + entry.durationMinutes, 0);
      const misallocation = calculateMisallocationMetrics({
        unallocatedMinutes: contractUnallocatedMinutes,
        usedMinutes: usedContractMinutes,
      });
      const worstProfileCoveragePct = consumption.byContractProfile
        .filter((row) => row.contractId === contract.id)
        .reduce((acc, row) => Math.max(acc, row.consumptionPct), 0);
      const health = calculateContractHealthScore({
        deviationPct: deviation.deviationPct,
        misallocationPct: misallocation.misallocationPct,
        worstProfileCoveragePct,
      });
      const contractBurnRateMinutesPerWeek =
        equivalentEntryRows
          .filter((row) => row.contractId === contract.id && row.date >= windowStartDate && row.date <= today)
          .reduce((acc, row) => acc + row.equivalentMinutes, 0) / 4;
      const depletion = estimateDepletionDate({
        availableMinutes: availableContractMinutes,
        burnRateMinutesPerWeek: contractBurnRateMinutesPerWeek,
        nowDate: today,
      });
      const atRisk =
        health.score < 80 ||
        worstProfileCoveragePct > 90 ||
        (depletion.daysToDepletion !== null && depletion.daysToDepletion <= 30);
      if (atRisk) contractsAtRiskCount += 1;
      return {
        contractId: contract.id,
        code: contract.code,
        name: contract.name,
        clientName: clientById.get(contract.clientId) ?? contract.clientId,
        healthScore: health.score,
        healthRisk: health.risk,
        healthFormulaLabel: "Score = 40% desviación + 30% mala asignación + 30% cobertura por perfil",
        usedHoursLabel: `${(usedContractMinutes / 60).toFixed(2)} h`,
        quotedHoursLabel: `${(quotedContractMinutes / 60).toFixed(2)} h`,
        daysToDepletion: depletion.daysToDepletion,
      };
    })
    .sort((a, b) => {
      if (a.healthScore !== b.healthScore) return a.healthScore - b.healthScore;
      const aDays = a.daysToDepletion ?? Number.MAX_SAFE_INTEGER;
      const bDays = b.daysToDepletion ?? Number.MAX_SAFE_INTEGER;
      return aDays - bDays;
    })
    .slice(0, 5);

  const deviationMinutesGlobal = consumption.totalUsedMinutes - expectedMinutesByDateGlobal;
  const globalDeviationUseQuotedBasis = expectedMinutesByDateGlobal < 1;
  const globalDeviationDenominator = Math.max(
    globalDeviationUseQuotedBasis ? consumption.totalQuotedMinutes : expectedMinutesByDateGlobal,
    1,
  );
  const deviationPctGlobal = Math.abs(deviationMinutesGlobal / globalDeviationDenominator) * 100;
  const deviationRiskGlobal: TrafficRisk =
    deviationPctGlobal <= 10 ? "verde" : deviationPctGlobal <= 20 ? "amarillo" : "rojo";
  const misallocation = calculateMisallocationMetrics({
    unallocatedMinutes: consumption.unallocatedMinutes,
    usedMinutes: consumption.totalUsedMinutes,
  });
  const contractsAtRiskPct = contractsFiltered.length > 0 ? (contractsAtRiskCount / contractsFiltered.length) * 100 : 0;

  const quotedUfTotal = allocationsFiltered.reduce((acc, allocation) => {
    const contract = contractById.get(allocation.contractId);
    if (!contract) return acc;
    const targetUfRate = allocation.rateUfPerHour ?? contract.rateUfPerHour;
    return acc + (allocation.quotedMinutes / 60) * targetUfRate;
  }, 0);
  const usedUfTotal = allocationsFiltered.reduce((acc, allocation) => {
    const contract = contractById.get(allocation.contractId);
    if (!contract) return acc;
    const targetUfRate = allocation.rateUfPerHour ?? contract.rateUfPerHour;
    const usedProfileMinutes = consumptionByContractProfile.get(`${allocation.contractId}::${allocation.profileId}`)?.usedMinutes ?? 0;
    return acc + (usedProfileMinutes / 60) * targetUfRate;
  }, 0);
  const availableUfTotal = quotedUfTotal - usedUfTotal;

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
    globalDecisionMetrics: {
      contractsAtRiskCount,
      contractsAtRiskPct,
      misallocationMinutes: consumption.unallocatedMinutes,
      misallocationCount: consumption.unallocatedCount,
      misallocationPct: misallocation.misallocationPct,
      misallocationRisk: misallocation.risk,
      expectedMinutesByDateGlobal,
      deviationMinutesGlobal,
      deviationPctGlobal,
      deviationRiskGlobal,
      burnRateMinutesPerWeekGlobal,
      topContractsByRisk,
      usedUfTotal,
      quotedUfTotal,
      availableUfTotal,
    },
  };
}

export async function loadBudgetContractDetailData(contractId: string) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "budgets.read");

  const [contractsData, allocationsData, profilesData, entries, users, requirements, clientsData, referenceRates, timeCategories, cubicacionItems] = await Promise.all([
    getContractBudgets(),
    getContractProfileAllocations(),
    getOperationalProfiles(),
    getTimeEntries(),
    getOperationalUsers(),
    getRequirements(),
    getClients(),
    getFinancialReferenceRates(),
    getCatalogByKind("time_entry_category"),
    getCubicacionItems(contractId),
  ]);

  const contract = contractsData.find((row) => row.id === contractId);
  if (!contract) {
    throw new Error("No se encontró el contrato solicitado.");
  }

  const allocations = allocationsData
    .filter((row) => row.contractId === contractId)
    .filter((row) => profilesData.some((profile) => profile.id === row.profileId));
  const entriesForContract = filterOperationalTimeEntries(
    entries.filter((row) => row.contractId === contractId),
    users,
    profilesData,
  );
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
  const today = new Date().toISOString().slice(0, 10);

  const toUfHourlyRate = (params: { hourlyRate: number; rateCurrency: string }): number | null => {
    const currency = params.rateCurrency.trim().toUpperCase();
    if (currency === "UF") return params.hourlyRate;
    if (currency === "CLP") {
      return referenceRates.ufToClp > 0 ? params.hourlyRate / referenceRates.ufToClp : null;
    }
    if (currency === "USD") {
      if (referenceRates.ufToClp <= 0) return null;
      return (params.hourlyRate * referenceRates.usdToClp) / referenceRates.ufToClp;
    }
    return null;
  };

  const equivalentEntryRows = entriesForContract
    .map((entry) => {
      const worker = userById.get(entry.userId);
      if (!worker) return null;
      const workerProfile = profileById.get(worker.profileId);
      if (!workerProfile) return null;
      const workerUfRate = toUfHourlyRate({
        hourlyRate: workerProfile.hourlyRate,
        rateCurrency: workerProfile.rateCurrency,
      });
      if (!workerUfRate || workerUfRate <= 0) return null;
      const targetProfileId = entry.contractProfileId ?? worker.profileId;
      const allocation = allocations.find((row) => row.profileId === targetProfileId);
      if (!allocation) return null;
      const targetUfRate = allocation.rateUfPerHour ?? contract.rateUfPerHour;
      if (!targetUfRate || targetUfRate <= 0) return null;
      const equivalentMinutes = entry.durationMinutes * (workerUfRate / targetUfRate);
      return {
        entry,
        equivalentMinutes,
      };
    })
    .filter((row): row is { entry: (typeof entriesForContract)[number]; equivalentMinutes: number } => Boolean(row));

  const windowStart = new Date(`${today}T12:00:00.000Z`);
  windowStart.setDate(windowStart.getDate() - 28);
  const windowStartDate = windowStart.toISOString().slice(0, 10);
  const burnWindowMinutes = equivalentEntryRows
    .filter((row) => row.entry.date >= windowStartDate && row.entry.date <= today)
    .reduce((acc, row) => acc + row.equivalentMinutes, 0);
  const burnRateMinutesPerWeek = burnWindowMinutes / 4;

  const elapsedContractPct = calculateElapsedContractPct({
    startDate: contract.startDate,
    endDate: contract.endDate,
    nowDate: today,
  });
  const deviation = calculateDeviationMetrics({
    quotedMinutes,
    usedMinutes,
    elapsedPct: elapsedContractPct,
  });
  const misallocation = calculateMisallocationMetrics({
    unallocatedMinutes: consumption.unallocatedMinutes,
    usedMinutes,
  });
  const depletionProjection = estimateDepletionDate({
    availableMinutes,
    burnRateMinutesPerWeek,
    nowDate: today,
  });

  const topRiskProfiles = consumption.byContractProfile
    .map((row) => ({
      profileId: row.profileId,
      profileName: profileById.get(row.profileId)?.name ?? row.profileId,
      consumptionPct: row.consumptionPct,
      usedMinutes: row.usedMinutes,
      risk: calculateCoverageRisk(row.consumptionPct),
    }))
    .sort((a, b) => b.consumptionPct - a.consumptionPct)
    .slice(0, 3);

  const worstProfileCoveragePct = topRiskProfiles[0]?.consumptionPct ?? 0;
  const health = calculateContractHealthScore({
    deviationPct: deviation.deviationPct,
    misallocationPct: misallocation.misallocationPct,
    worstProfileCoveragePct,
  });

  const topRequirementsMap = new Map<string, number>();
  for (const row of equivalentEntryRows) {
    const key = row.entry.requirementId ?? "__none__";
    topRequirementsMap.set(key, (topRequirementsMap.get(key) ?? 0) + row.equivalentMinutes);
  }
  const topRequirementRows = [...topRequirementsMap.entries()]
    .map(([requirementId, equivalentMinutesUsed]) => {
      const linkedRequirement = requirementId !== "__none__" ? requirementById.get(requirementId) : undefined;
      const pctOfContractUsed = usedMinutes > 0 ? (equivalentMinutesUsed / usedMinutes) * 100 : 0;
      return {
        requirementId: requirementId === "__none__" ? null : requirementId,
        requirementTitle: linkedRequirement?.title ?? "Sin requerimiento",
        equivalentMinutesUsed,
        equivalentHoursLabel: `${(equivalentMinutesUsed / 60).toFixed(2)} h`,
        pctOfContractUsed,
      };
    })
    .sort((a, b) => b.equivalentMinutesUsed - a.equivalentMinutesUsed)
    .slice(0, 5);

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
        durationLabel: `${(entry.durationMinutes / 60).toFixed(2)} h`,
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
      quotedLabel: `${(quotedProfileMinutes / 60).toFixed(2)} h`,
      usedLabel: `${(usedProfileMinutes / 60).toFixed(2)} h`,
      availableLabel: `${(availableProfileMinutes / 60).toFixed(2)} h`,
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
    elapsedContractPct,
    expectedMinutesByDate: deviation.expectedMinutesByDate,
    deviationMinutes: deviation.deviationMinutes,
    deviationPct: deviation.deviationPct,
    deviationPctBasis: deviation.deviationPctBasis,
    deviationRisk: deviation.risk,
    misallocationPct: misallocation.misallocationPct,
    misallocationRisk: misallocation.risk,
    burnRateMinutesPerWeek,
    estimatedDepletionDate: depletionProjection.estimatedDepletionDate,
    daysToDepletion: depletionProjection.daysToDepletion,
    topRiskProfiles,
    topRequirementRows,
    contractHealthScore: health.score,
    contractHealthRisk: health.risk,
    healthFormula: {
      deviationPenalty: health.deviationPenalty,
      misallocationPenalty: health.misallocationPenalty,
      profilePenalty: health.profilePenalty,
      description: "Score = 40% desviación + 30% mala asignación + 30% cobertura por perfil",
    },
    users: users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.name })),
    clients: clientsData.filter((c) => c.active).map((c) => ({ id: c.id, name: c.name })),
    requirements: requirements.map((r) => ({ id: r.id, title: r.title, clientId: r.clientId })),
    contracts: contractsData
      .filter((c) => c.active)
      .map((c) => ({ id: c.id, clientId: c.clientId, label: `${c.code} · ${c.name}` })),
    contractProfiles: profilesData.map((p) => ({ id: p.id, label: p.name })),
    categories: timeCategories.filter((c) => c.active).map((c) => ({ code: c.code, label: formatCatalogLabel(c.code, c.label) })),
    canPickAnyOwner,
    cubicacionItems,
    requirementsForContract: requirements.filter((r) => r.contractId === contractId).map((r) => ({ id: r.id, title: r.title })),
  };
}

export async function createBudgetAction(values: BudgetInput) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "budgets.write");
  const allProfiles = await getProfiles();
  assertOperationalProfileIds(
    values.allocations.map((allocation) => allocation.profileId),
    allProfiles,
  );
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
  const allProfiles = await getProfiles();
  assertOperationalProfileIds(
    values.allocations.map((allocation) => allocation.profileId),
    allProfiles,
  );
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
  try {
    const ok = await deleteBudget(id);
    if (!ok) {
      throw new Error("No se pudo eliminar el contrato.");
    }
    return ok;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const normalized = message.toLowerCase();
    if (normalized.includes("rms_requirements_contract_id_fkey")) {
      throw new Error(
        "No se puede eliminar el contrato porque está asociado a uno o más requerimientos. Desvincula esos requerimientos o asígnalos a otro contrato antes de eliminar.",
      );
    }
    if (normalized.includes("rms_time_entries_contract_id_fkey")) {
      throw new Error(
        "No se puede eliminar el contrato porque tiene horas registradas asociadas. Reasigna o elimina esas horas antes de intentar nuevamente.",
      );
    }
    if (normalized.includes("foreign key") || normalized.includes("violates")) {
      throw new Error(
        "No se puede eliminar el contrato porque está siendo usado por otros registros del sistema (requerimientos u horas). Debes desvincularlos primero.",
      );
    }
    throw error instanceof Error ? error : new Error("No se pudo eliminar el contrato.");
  }
}

/**
 * Crea una actividad de cubicación.
 * Si no se proporciona `requirementId`, se crea automáticamente un Requirement
 * en el sistema con el título de la actividad, vinculado al contrato.
 */
export async function createCubicacionItemAction(input: CubicacionItemCreateInput) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "budgets.write");

  let requirementId = input.requirementId;

  if (!requirementId) {
    const [contracts, users, statuses, priorities] = await Promise.all([
      getContractBudgets(),
      getOperationalUsers(),
      getCatalogByKind("requirement_status"),
      getCatalogByKind("requirement_priority"),
    ]);
    const contract = contracts.find((c) => c.id === input.contractId);
    if (!contract) throw new Error("No se encontró el contrato.");

    const defaultStatus = statuses.find((s) => s.active)?.code ?? "BACKLOG";
    const defaultPriority = priorities.find((p) => p.active)?.code ?? "P2";
    const ownerId = user ? resolveOperationalActorUserId(user, users) : "";

    const newReq = await createRequirement({
      projectId: contract.projectId,
      clientId: contract.clientId,
      contractId: contract.id,
      origin: "Cubicación",
      title: input.activityName,
      description: input.activityName,
      priority: defaultPriority,
      ownerId,
      status: defaultStatus,
      notes: "",
    });
    requirementId = newReq.id;
  }

  return createCubicacionItem({ ...input, requirementId });
}

/**
 * Actualiza una actividad de cubicación.
 * Si cambia el nombre y la actividad tiene un requerimiento vinculado,
 * también actualiza el título del requerimiento.
 */
export async function updateCubicacionItemAction(
  id: string,
  input: CubicacionItemUpdateInput & { currentRequirementId?: string | null },
) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "budgets.write");

  const { currentRequirementId, ...updateInput } = input;

  if (input.activityName && currentRequirementId) {
    await updateRequirement(currentRequirementId, { title: input.activityName });
  }

  const updated = await updateCubicacionItem(id, updateInput);
  if (!updated) throw new Error("No se encontró la actividad a actualizar.");
  return updated;
}

export async function deleteCubicacionItemAction(id: string) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "budgets.write");
  const ok = await deleteCubicacionItem(id);
  if (!ok) throw new Error("No se pudo eliminar la actividad.");
  return ok;
}

export async function deleteCubicacionItemsBatchAction(ids: string[]) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "budgets.write");
  if (ids.length === 0) return 0;

  let deletedCount = 0;
  for (const id of ids) {
    const ok = await deleteCubicacionItem(id);
    if (ok) deletedCount++;
  }
  if (deletedCount === 0) throw new Error("No se pudo eliminar ninguna actividad.");
  return deletedCount;
}

// ─── Carga masiva de cubicación ───────────────────────────────────────────────

export interface BulkCubicacionRowInput {
  activityName: string;
  construccionHours: number;
  levantamientoPct: number;
  disenoPct: number;
  qaAjustesPct: number;
  puestaEnMarchaPct: number;
  seniorPct: number;
  ingeneroPct: number;
  juniorPct: number;
  directorHours: number;
  disenadorHours: number;
}

export interface BulkCubicacionResult {
  created: number;
  failed: number;
  errors: Array<{ activityName: string; error: string }>;
  newItems: import("@/types/domain").CubicacionItem[];
}

/**
 * Crea múltiples ítems de cubicación en lote para un contrato.
 * Por cada ítem, crea automáticamente un Requirement en el sistema
 * (a menos que ya exista un requerimiento con el mismo título en el contrato).
 */
export async function bulkCreateCubicacionItemsAction(
  contractId: string,
  rows: BulkCubicacionRowInput[],
): Promise<BulkCubicacionResult> {
  const { user } = await getAppSession();
  assertPermission(user?.role, "budgets.write");

  const [contracts, users, statuses, priorities, existingReqs, existingCubi] = await Promise.all([
    getContractBudgets(),
    getOperationalUsers(),
    getCatalogByKind("requirement_status"),
    getCatalogByKind("requirement_priority"),
    getRequirements(),
    getCubicacionItems(contractId),
  ]);

  const contract = contracts.find((c) => c.id === contractId);
  if (!contract) throw new Error("No se encontró el contrato.");

  const defaultStatus   = statuses.find((s) => s.active)?.code ?? "BACKLOG";
  const defaultPriority = priorities.find((p) => p.active)?.code ?? "P2";
  const ownerId = user ? resolveOperationalActorUserId(user, users) : "";

  // Mapa de requerimientos ya existentes para este contrato (título normalizado → id)
  const existingReqsByTitle = new Map(
    existingReqs
      .filter((r) => r.contractId === contractId)
      .map((r) => [r.title.toLowerCase().trim(), r.id]),
  );

  // Siguiente sortOrder
  let nextSortOrder = existingCubi.length + 1;

  const newItems: import("@/types/domain").CubicacionItem[] = [];
  const errors: BulkCubicacionResult["errors"] = [];

  for (const row of rows) {
    try {
      // Reusar requerimiento existente si coincide por título (evitar duplicados)
      let requirementId = existingReqsByTitle.get(row.activityName.toLowerCase().trim()) ?? null;

      if (!requirementId) {
        const newReq = await createRequirement({
          projectId: contract.projectId,
          clientId:  contract.clientId,
          contractId: contract.id,
          origin: "Cubicación",
          title: row.activityName,
          description: row.activityName,
          priority: defaultPriority,
          ownerId,
          status: defaultStatus,
          notes: "",
        });
        requirementId = newReq.id;
        existingReqsByTitle.set(row.activityName.toLowerCase().trim(), requirementId);
      } else {
        const existingReq = existingReqs.find((r) => r.id === requirementId);
        if (existingReq && !existingReq.contractId) {
          await updateRequirement(requirementId, { contractId: contract.id });
        }
      }

      const item = await createCubicacionItem({
        contractId,
        requirementId,
        activityName:      row.activityName,
        construccionHours: row.construccionHours,
        levantamientoPct:  row.levantamientoPct,
        disenoPct:         row.disenoPct,
        qaAjustesPct:      row.qaAjustesPct,
        puestaEnMarchaPct: row.puestaEnMarchaPct,
        seniorPct:         row.seniorPct,
        ingeneroPct:       row.ingeneroPct,
        juniorPct:         row.juniorPct,
        directorHours:     row.directorHours,
        disenadorHours:    row.disenadorHours,
        sortOrder:         nextSortOrder++,
      });

      newItems.push(item);
    } catch (err) {
      errors.push({
        activityName: row.activityName,
        error: err instanceof Error ? err.message : "Error desconocido.",
      });
    }
  }

  return {
    created: newItems.length,
    failed:  errors.length,
    errors,
    newItems,
  };
}
