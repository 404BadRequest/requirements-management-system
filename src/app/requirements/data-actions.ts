"use server";

import {
  createAppNotification,
  createRequirement,
  deleteRequirement,
  getCatalogByKind,
  getClients,
  getRequirementById,
  getRequirements,
  getUsers,
  updateRequirement,
  createRequirementComment,
} from "@/data/repositories/server-db";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { recordAuditSafely } from "@/lib/audit/record-audit";
import { logServerActionEvent } from "@/lib/logging/server-action-log";
import { requirementDetailPath } from "@/lib/routes/requirements";
import { revalidatePath } from "next/cache";
import type { Client, Requirement, SettingsCatalogEntry } from "@/types/domain";
import type { RequirementInput } from "@/schemas/requirement-schema";

export async function loadRequirementsPageData(): Promise<{
  requirements: Requirement[];
  users: { id: string; name: string }[];
  clients: Client[];
  statusCatalog: SettingsCatalogEntry[];
  priorityCatalog: SettingsCatalogEntry[];
}> {
  const { user } = await getAppSession();
  assertPermission(user?.role, "requirements.read");
  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }
  const [requirementsData, usersData, clientsData, statuses, priorities] = await Promise.all([
    getRequirements(),
    getUsers(),
    getClients(),
    getCatalogByKind("requirement_status"),
    getCatalogByKind("requirement_priority"),
  ]);
  const resolvedUserId = resolveDirectoryUserIdForSession(user, usersData);
  const ownScope = user.role === "Contributor";
  const filteredRequirements = ownScope ? requirementsData.filter((r) => r.ownerId === resolvedUserId) : requirementsData;
  const selectableUsers = ownScope ? usersData.filter((u) => u.id === resolvedUserId) : usersData;
  return {
    requirements: filteredRequirements,
    users: selectableUsers.map((u) => ({ id: u.id, name: u.name })),
    clients: clientsData,
    statusCatalog: statuses,
    priorityCatalog: priorities,
  };
}

export async function createRequirementAction(input: RequirementInput) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "requirements.write");
  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }
  const users = await getUsers();
  const resolvedUserId = resolveDirectoryUserIdForSession(user, users);
  const payload = user.role === "Contributor" ? { ...input, ownerId: resolvedUserId } : input;
  const created = await createRequirement(payload);
  if (user) {
    void recordAuditSafely({
      entityType: "requirement",
      entityId: created.id,
      action: "create",
      beforeJson: "{}",
      afterJson: JSON.stringify(created),
      userId: user.id,
    });
  }
  logServerActionEvent({
    action: "requirement.create",
    entityType: "requirement",
    entityId: created.id,
    outcome: "ok",
  });
  void createAppNotification({
    recipientUserId: created.ownerId,
    title: "Nuevo requerimiento",
    body: created.title,
    href: requirementDetailPath(created.id),
  }).catch(() => {});
  revalidatePath("/", "layout");
  return created;
}

export async function updateRequirementAction(id: string, input: Parameters<typeof updateRequirement>[1]) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "requirements.write");
  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }
  const prev = await getRequirementById(id);
  if (!prev) {
    return undefined;
  }
  if (user.role === "Contributor") {
    const users = await getUsers();
    const resolvedUserId = resolveDirectoryUserIdForSession(user, users);
    if (prev.ownerId !== resolvedUserId) {
      throw new Error("No autorizado para editar requerimientos de otros usuarios.");
    }
  }
  const next = await updateRequirement(id, input, { changedById: user.id });
  if (user && prev && next) {
    void recordAuditSafely({
      entityType: "requirement",
      entityId: id,
      action: "update",
      beforeJson: JSON.stringify(prev),
      afterJson: JSON.stringify(next),
      userId: user.id,
    });
  }
  logServerActionEvent({
    action: "requirement.update",
    entityType: "requirement",
    entityId: id,
    outcome: next ? "ok" : "error",
    detail: next ? undefined : "not_found",
  });
  if (prev && next && prev.status !== next.status) {
    void createAppNotification({
      recipientUserId: next.ownerId,
      title: "Cambio de estado",
      body: `«${next.title}»: ${prev.status} → ${next.status}`,
      href: requirementDetailPath(next.id),
    }).catch(() => {});
    revalidatePath("/", "layout");
  }
  return next;
}

export async function updateRequirementFullAction(id: string, input: RequirementInput) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "requirements.write");
  if (!user || (user.role !== "Admin" && user.role !== "Project Manager")) {
    throw new Error("Solo Admin o Project Manager pueden editar completamente un requerimiento.");
  }
  const prev = await getRequirementById(id);
  const next = await updateRequirement(id, input, { changedById: user.id });
  if (prev && next) {
    void recordAuditSafely({
      entityType: "requirement",
      entityId: id,
      action: "update_full",
      beforeJson: JSON.stringify(prev),
      afterJson: JSON.stringify(next),
      userId: user.id,
    });
  }
  logServerActionEvent({
    action: "requirement.update_full",
    entityType: "requirement",
    entityId: id,
    outcome: next ? "ok" : "error",
    detail: next ? undefined : "not_found",
  });
  revalidatePath("/", "layout");
  return next;
}

export async function deleteRequirementAction(id: string) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "requirements.delete");
  const prev = await getRequirementById(id);
  const ok = await deleteRequirement(id);
  if (user && prev && ok) {
    void recordAuditSafely({
      entityType: "requirement",
      entityId: id,
      action: "delete",
      beforeJson: JSON.stringify(prev),
      afterJson: "{}",
      userId: user.id,
    });
  }
  logServerActionEvent({
    action: "requirement.delete",
    entityType: "requirement",
    entityId: id,
    outcome: ok ? "ok" : "error",
    detail: ok ? undefined : "not_found",
  });
  return ok;
}

export async function addRequirementCommentAction(requirementId: string, formData: FormData) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "requirements.write");
  if (!user) {
    throw new Error("Debes iniciar sesión para publicar.");
  }
  const body = String(formData.get("body") ?? "").trim();
  if (!body) {
    throw new Error("Escribe un mensaje antes de enviar.");
  }
  if (body.length > 12000) {
    throw new Error("El mensaje supera el máximo permitido (12.000 caracteres).");
  }
  const users = await getUsers();
  const userId = resolveDirectoryUserIdForSession(user, users);
  const requirement = await getRequirementById(requirementId);
  if (!requirement) {
    throw new Error("No se encontró el requerimiento.");
  }
  if (user.role === "Contributor" && requirement.ownerId !== userId) {
    throw new Error("No autorizado para comentar requerimientos de otros usuarios.");
  }
  await createRequirementComment({ requirementId, userId, body });
  revalidatePath(requirementDetailPath(requirementId));
  void recordAuditSafely({
    entityType: "requirement_comment",
    entityId: requirementId,
    action: "create",
    beforeJson: "{}",
    afterJson: JSON.stringify({ requirementId, userId, length: body.length }),
    userId: user.id,
  });
  logServerActionEvent({
    action: "requirement.comment.create",
    entityType: "requirement",
    entityId: requirementId,
    outcome: "ok",
  });
}
