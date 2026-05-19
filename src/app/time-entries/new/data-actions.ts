"use server";

import { revalidatePath } from "next/cache";
import {
  createTimeEntry,
  deleteTimeEntry,
  getCatalogByKind,
  getContractBudgets,
  getContractProfileAllocations,
  getFinancialReferenceRates,
  getProfiles,
  getRequirements,
  getTimeEntryById,
  getUsers,
  updateTimeEntry,
} from "@/data/repositories/server-db";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { resolveContractIdForTimeEntry } from "@/lib/contracts/resolve-contract";
import { formatCatalogLabel } from "@/lib/formatting/catalog-label";
import type { Role } from "@/types/domain";
import type { TimeEntryInput } from "@/schemas/time-entry-schema";

function canPickEncargadoForOthers(role: Role | undefined): boolean {
  return role === "Admin" || role === "Project Manager";
}

export async function loadNewTimeEntryFormData() {
  const { user } = await getAppSession();
  assertPermission(user?.role, "time_entries.read");
  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }
  const [usersData, requirementsData, catRows, contracts] = await Promise.all([
    getUsers(),
    getRequirements(),
    getCatalogByKind("time_entry_category"),
    getContractBudgets(),
  ]);
  const activeUsers = usersData.filter((u) => u.active);
  const resolvedId = resolveDirectoryUserIdForSession(user, activeUsers);
  const pickAny = canPickEncargadoForOthers(user.role);
  const visibleRequirements = pickAny ? requirementsData : requirementsData.filter((r) => r.ownerId === resolvedId);
  const me = activeUsers.find((u) => u.id === resolvedId);
  const encargadoOptions = pickAny
    ? activeUsers.map((u) => ({ id: u.id, name: u.name }))
    : me
      ? [{ id: me.id, name: me.name }]
      : [{ id: resolvedId, name: user.name || user.email }];

  const profiles = await getProfiles();

  return {
    users: encargadoOptions,
    encargadoLocked: !pickAny,
    defaultUserId: resolvedId,
    requirements: visibleRequirements.map((r) => ({ id: r.id, title: r.title })),
    contracts: contracts
      .filter((contract) => contract.active)
      .map((contract) => ({ id: contract.id, label: `${contract.code} · ${contract.name}` })),
    contractProfiles: profiles.map((profile) => ({ id: profile.id, label: profile.name })),
    canOverrideContract: pickAny,
    canOverrideContractProfile: pickAny,
    categories: catRows.filter((r) => r.active).map((r) => ({ code: r.code, label: formatCatalogLabel(r.code, r.label) })),
  };
}

function profileHourlyRateInUf(input: {
  hourlyRate: number;
  rateCurrency: string;
  ufToClp: number;
  usdToClp: number;
}): number | null {
  const currency = input.rateCurrency.trim().toUpperCase();
  if (currency === "UF") return input.hourlyRate;
  if (currency === "CLP") return input.ufToClp > 0 ? input.hourlyRate / input.ufToClp : null;
  if (currency === "USD") return input.ufToClp > 0 ? (input.hourlyRate * input.usdToClp) / input.ufToClp : null;
  return null;
}

function resolveContractProfileForTimeEntry(input: {
  contractId: string | null;
  manualProfileId: string | null;
  canOverride: boolean;
  workerUserId: string;
  users: Awaited<ReturnType<typeof getUsers>>;
  profiles: Awaited<ReturnType<typeof getProfiles>>;
  allocations: Awaited<ReturnType<typeof getContractProfileAllocations>>;
  contracts: Awaited<ReturnType<typeof getContractBudgets>>;
  ufToClp: number;
  usdToClp: number;
}): string | null {
  if (!input.contractId) return null;
  const contract = input.contracts.find((row) => row.id === input.contractId);
  if (!contract) return null;
  const contractAllocations = input.allocations.filter((row) => row.contractId === input.contractId);
  if (contractAllocations.length === 0) return null;

  if (input.canOverride && input.manualProfileId) {
    const found = contractAllocations.some((row) => row.profileId === input.manualProfileId);
    if (!found) {
      throw new Error("El perfil contractual seleccionado no está cotizado en este contrato.");
    }
    return input.manualProfileId;
  }

  const worker = input.users.find((row) => row.id === input.workerUserId);
  if (!worker) return null;
  const direct = contractAllocations.find((row) => row.profileId === worker.profileId);
  if (direct) return direct.profileId;

  const workerProfile = input.profiles.find((row) => row.id === worker.profileId);
  if (!workerProfile) return null;
  const workerRateUf = profileHourlyRateInUf({
    hourlyRate: workerProfile.hourlyRate,
    rateCurrency: workerProfile.rateCurrency,
    ufToClp: input.ufToClp,
    usdToClp: input.usdToClp,
  });
  if (!workerRateUf || workerRateUf <= 0) return null;

  const nearest = contractAllocations
    .map((row) => {
      const targetUf = row.rateUfPerHour ?? contract.rateUfPerHour;
      if (!targetUf || targetUf <= 0) return null;
      return { profileId: row.profileId, distance: Math.abs(targetUf - workerRateUf) };
    })
    .filter((row): row is { profileId: string; distance: number } => Boolean(row))
    .sort((a, b) => a.distance - b.distance)[0];
  return nearest?.profileId ?? null;
}

export async function createTimeEntryAction(input: TimeEntryInput) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "time_entries.write");
  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }
  const users = await getUsers();
  const activeUsers = users.filter((u) => u.active);
  const resolvedId = resolveDirectoryUserIdForSession(user, activeUsers);
  const [requirements, contracts, allocations, profiles, referenceRates] = await Promise.all([
    getRequirements(),
    getContractBudgets(),
    getContractProfileAllocations(),
    getProfiles(),
    getFinancialReferenceRates(),
  ]);
  const payload = { ...input };
  if (!canPickEncargadoForOthers(user.role)) {
    payload.userId = resolvedId;
    payload.contractId = null;
    if (payload.requirementId) {
      const linkedRequirement = requirements.find((r) => r.id === payload.requirementId);
      if (!linkedRequirement || linkedRequirement.ownerId !== resolvedId) {
        throw new Error("Solo puedes asociar horas a requerimientos propios.");
      }
    }
  } else if (!activeUsers.some((u) => u.id === payload.userId)) {
    throw new Error("El encargado seleccionado no es válido o está inactivo.");
  }
  payload.contractId = resolveContractIdForTimeEntry({
    contractId: canPickEncargadoForOthers(user.role) ? payload.contractId : null,
    requirementId: payload.requirementId,
    projectId: payload.projectId,
    date: payload.date,
    requirements,
    contracts,
  });
  payload.contractProfileId = resolveContractProfileForTimeEntry({
    contractId: payload.contractId,
    manualProfileId: canPickEncargadoForOthers(user.role) ? payload.contractProfileId : null,
    canOverride: canPickEncargadoForOthers(user.role),
    workerUserId: payload.userId,
    users: activeUsers,
    profiles,
    allocations,
    contracts,
    ufToClp: referenceRates.ufToClp,
    usdToClp: referenceRates.usdToClp,
  });
  const created = await createTimeEntry(payload);
  revalidatePath("/time-entries");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/team");
  revalidatePath("/budgets");
  return created;
}

export async function updateTimeEntryAction(id: string, input: TimeEntryInput) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "time_entries.write");
  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }

  const current = await getTimeEntryById(id);
  if (!current) {
    throw new Error("No se encontró la hora a editar.");
  }

  const users = await getUsers();
  const activeUsers = users.filter((u) => u.active);
  const resolvedId = resolveDirectoryUserIdForSession(user, activeUsers);
  const [requirements, contracts, allocations, profiles, referenceRates] = await Promise.all([
    getRequirements(),
    getContractBudgets(),
    getContractProfileAllocations(),
    getProfiles(),
    getFinancialReferenceRates(),
  ]);
  const pickAny = canPickEncargadoForOthers(user.role);

  if (!pickAny && current.userId !== resolvedId) {
    throw new Error("Solo puedes editar horas registradas por ti.");
  }

  const payload: TimeEntryInput = { ...input };
  if (!pickAny) {
    payload.userId = current.userId;
    payload.contractId = null;
    if (payload.requirementId) {
      const linkedRequirement = requirements.find((r) => r.id === payload.requirementId);
      if (!linkedRequirement || linkedRequirement.ownerId !== resolvedId) {
        throw new Error("Solo puedes asociar horas a requerimientos propios.");
      }
    }
  } else if (!activeUsers.some((u) => u.id === payload.userId)) {
    throw new Error("El encargado seleccionado no es válido o está inactivo.");
  }
  payload.contractId = resolveContractIdForTimeEntry({
    contractId: pickAny ? payload.contractId : current.contractId,
    requirementId: payload.requirementId,
    projectId: payload.projectId,
    date: payload.date,
    requirements,
    contracts,
  });
  payload.contractProfileId = resolveContractProfileForTimeEntry({
    contractId: payload.contractId,
    manualProfileId: pickAny ? payload.contractProfileId : current.contractProfileId,
    canOverride: pickAny,
    workerUserId: payload.userId,
    users: activeUsers,
    profiles,
    allocations,
    contracts,
    ufToClp: referenceRates.ufToClp,
    usdToClp: referenceRates.usdToClp,
  });

  const updated = await updateTimeEntry(id, payload);
  if (!updated) {
    throw new Error("No se pudo actualizar la hora.");
  }

  revalidatePath("/time-entries");
  revalidatePath(`/time-entries/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/team");
  revalidatePath("/budgets");
  return updated;
}

export async function deleteTimeEntryAction(id: string) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "time_entries.write");
  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }

  const current = await getTimeEntryById(id);
  if (!current) {
    throw new Error("No se encontró la hora a eliminar.");
  }

  const users = await getUsers();
  const activeUsers = users.filter((u) => u.active);
  const resolvedId = resolveDirectoryUserIdForSession(user, activeUsers);
  const requirements = await getRequirements();
  const pickAny = canPickEncargadoForOthers(user.role);

  if (!pickAny) {
    if (current.userId !== resolvedId) {
      throw new Error("Solo puedes eliminar horas registradas por ti.");
    }
    if (current.requirementId) {
      const linkedRequirement = requirements.find((r) => r.id === current.requirementId);
      if (!linkedRequirement || linkedRequirement.ownerId !== resolvedId) {
        throw new Error("Solo puedes eliminar horas asociadas a requerimientos propios.");
      }
    }
  }

  const deleted = await deleteTimeEntry(id);
  if (!deleted) {
    throw new Error("No se pudo eliminar la hora.");
  }

  revalidatePath("/time-entries");
  revalidatePath(`/time-entries/${id}`);
  if (current.requirementId) {
    revalidatePath(`/requirements/id/${current.requirementId}`);
  }
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/team");
  revalidatePath("/budgets");
  return deleted;
}
