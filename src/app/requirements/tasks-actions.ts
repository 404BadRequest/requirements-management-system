"use server";

import {
  createRequirementTask,
  deleteRequirementTask,
  getRequirementById,
  getRequirementTasks,
  getUsers,
  updateRequirementTask,
} from "@/data/repositories/server-db";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { logServerActionEvent } from "@/lib/logging/server-action-log";
import { requirementDetailPath } from "@/lib/routes/requirements";
import { revalidatePath } from "next/cache";
import type { RequirementTaskStatus } from "@/types/domain";

const TASK_STATUSES: RequirementTaskStatus[] = ["pending", "in_progress", "done"];

async function assertRequirementTaskAccess(requirementId: string) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "requirements.read");
  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }
  const requirement = await getRequirementById(requirementId);
  if (!requirement) {
    throw new Error("No se encontró el requerimiento.");
  }
  if (user.role === "Contributor") {
    const users = await getUsers();
    const userId = resolveDirectoryUserIdForSession(user, users);
    if (requirement.ownerId !== userId) {
      throw new Error("No autorizado para gestionar tareas de este requerimiento.");
    }
  }
  return { user, requirement };
}

function parseTaskStatus(value: unknown): RequirementTaskStatus {
  const status = String(value ?? "").trim() as RequirementTaskStatus;
  if (!TASK_STATUSES.includes(status)) {
    throw new Error("Estado de tarea inválido.");
  }
  return status;
}

function parseEstimatedHours(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const hours = Number(raw.replace(",", "."));
  if (!Number.isFinite(hours) || hours < 0) {
    throw new Error("Las horas estimadas deben ser un número mayor o igual a 0.");
  }
  return Math.round(hours * 100) / 100;
}

export async function createRequirementTaskAction(requirementId: string, formData: FormData) {
  await assertRequirementTaskAccess(requirementId);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    throw new Error("El título de la tarea es obligatorio.");
  }
  if (title.length > 500) {
    throw new Error("El título supera el máximo permitido (500 caracteres).");
  }
  const description = String(formData.get("description") ?? "").trim();
  const status = parseTaskStatus(formData.get("status") ?? "pending");
  const estimatedHours = parseEstimatedHours(formData.get("estimatedHours"));
  const existing = await getRequirementTasks(requirementId);
  await createRequirementTask({
    requirementId,
    title,
    description,
    status,
    estimatedHours,
    sortOrder: existing.length,
  });
  revalidatePath(requirementDetailPath(requirementId));
  logServerActionEvent({
    action: "requirement.task.create",
    entityType: "requirement_task",
    entityId: requirementId,
    outcome: "ok",
  });
}

export async function updateRequirementTaskAction(
  id: string,
  requirementId: string,
  input: {
    title?: string;
    description?: string;
    status?: RequirementTaskStatus;
    estimatedHours?: number | null;
    sortOrder?: number;
  },
) {
  await assertRequirementTaskAccess(requirementId);
  const tasks = await getRequirementTasks(requirementId);
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    throw new Error("No se encontró la tarea.");
  }
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new Error("El título de la tarea es obligatorio.");
    if (title.length > 500) throw new Error("El título supera el máximo permitido (500 caracteres).");
  }
  if (input.status !== undefined && !TASK_STATUSES.includes(input.status)) {
    throw new Error("Estado de tarea inválido.");
  }
  if (input.estimatedHours !== undefined && input.estimatedHours !== null) {
    if (!Number.isFinite(input.estimatedHours) || input.estimatedHours < 0) {
      throw new Error("Las horas estimadas deben ser un número mayor o igual a 0.");
    }
  }
  await updateRequirementTask(id, input);
  revalidatePath(requirementDetailPath(requirementId));
  logServerActionEvent({
    action: "requirement.task.update",
    entityType: "requirement_task",
    entityId: id,
    outcome: "ok",
  });
}

export async function deleteRequirementTaskAction(id: string, requirementId: string) {
  await assertRequirementTaskAccess(requirementId);
  const tasks = await getRequirementTasks(requirementId);
  if (!tasks.some((t) => t.id === id)) {
    throw new Error("No se encontró la tarea.");
  }
  await deleteRequirementTask(id);
  revalidatePath(requirementDetailPath(requirementId));
  logServerActionEvent({
    action: "requirement.task.delete",
    entityType: "requirement_task",
    entityId: id,
    outcome: "ok",
  });
}

export async function reorderRequirementTasksAction(requirementId: string, orderedIds: string[]) {
  await assertRequirementTaskAccess(requirementId);
  const tasks = await getRequirementTasks(requirementId);
  const taskIds = new Set(tasks.map((t) => t.id));
  if (orderedIds.length !== tasks.length || orderedIds.some((id) => !taskIds.has(id))) {
    throw new Error("El orden de tareas no es válido.");
  }
  await Promise.all(orderedIds.map((id, index) => updateRequirementTask(id, { sortOrder: index })));
  revalidatePath(requirementDetailPath(requirementId));
  logServerActionEvent({
    action: "requirement.task.reorder",
    entityType: "requirement_task",
    entityId: requirementId,
    outcome: "ok",
  });
}

export async function cycleRequirementTaskStatusAction(id: string, requirementId: string) {
  await assertRequirementTaskAccess(requirementId);
  const tasks = await getRequirementTasks(requirementId);
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    throw new Error("No se encontró la tarea.");
  }
  const nextStatus: RequirementTaskStatus =
    task.status === "pending" ? "in_progress" : task.status === "in_progress" ? "done" : "pending";
  await updateRequirementTask(id, { status: nextStatus });
  revalidatePath(requirementDetailPath(requirementId));
}
