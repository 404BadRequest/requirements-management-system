"use server";

import { revalidatePath } from "next/cache";
import { createTimeEntry, getCatalogByKind, getRequirements, getTimeEntryById, getUsers, updateTimeEntry } from "@/data/repositories/server-db";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
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
  const [usersData, requirementsData, catRows] = await Promise.all([
    getUsers(),
    getRequirements(),
    getCatalogByKind("time_entry_category"),
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

  return {
    users: encargadoOptions,
    encargadoLocked: !pickAny,
    defaultUserId: resolvedId,
    requirements: visibleRequirements.map((r) => ({ id: r.id, title: r.title })),
    categories: catRows.filter((r) => r.active).map((r) => ({ code: r.code, label: formatCatalogLabel(r.code, r.label) })),
  };
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
  const requirements = await getRequirements();
  const payload = { ...input };
  if (!canPickEncargadoForOthers(user.role)) {
    payload.userId = resolvedId;
    if (payload.requirementId) {
      const linkedRequirement = requirements.find((r) => r.id === payload.requirementId);
      if (!linkedRequirement || linkedRequirement.ownerId !== resolvedId) {
        throw new Error("Solo puedes asociar horas a requerimientos propios.");
      }
    }
  } else if (!activeUsers.some((u) => u.id === payload.userId)) {
    throw new Error("El encargado seleccionado no es válido o está inactivo.");
  }
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
  const requirements = await getRequirements();
  const pickAny = canPickEncargadoForOthers(user.role);

  if (!pickAny && current.userId !== resolvedId) {
    throw new Error("Solo puedes editar horas registradas por ti.");
  }

  const payload: TimeEntryInput = { ...input };
  if (!pickAny) {
    payload.userId = current.userId;
    if (payload.requirementId) {
      const linkedRequirement = requirements.find((r) => r.id === payload.requirementId);
      if (!linkedRequirement || linkedRequirement.ownerId !== resolvedId) {
        throw new Error("Solo puedes asociar horas a requerimientos propios.");
      }
    }
  } else if (!activeUsers.some((u) => u.id === payload.userId)) {
    throw new Error("El encargado seleccionado no es válido o está inactivo.");
  }

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
