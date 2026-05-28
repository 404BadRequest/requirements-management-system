"use server";

import {
  createAppNotification,
  createRequirement,
  deleteRequirement,
  getCatalogByKind,
  getClients,
  getContractBudgets,
  getRequirementById,
  getRequirements,
  getUsers,
  updateRequirement,
  createRequirementComment,
} from "@/data/repositories/server-db";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { resolveContractIdByContext } from "@/lib/contracts/resolve-contract";
import { recordAuditSafely } from "@/lib/audit/record-audit";
import { logServerActionEvent } from "@/lib/logging/server-action-log";
import { requirementDetailPath } from "@/lib/routes/requirements";
import { revalidatePath } from "next/cache";
import type { Client, Requirement, SettingsCatalogEntry } from "@/types/domain";
import type { RequirementInput } from "@/schemas/requirement-schema";
import { requirementSchema } from "@/schemas/requirement-schema";

export async function loadRequirementsPageData(): Promise<{
  requirements: Requirement[];
  users: { id: string; name: string }[];
  clients: Client[];
  contracts: { id: string; clientId: string; label: string }[];
  statusCatalog: SettingsCatalogEntry[];
  priorityCatalog: SettingsCatalogEntry[];
}> {
  const { user } = await getAppSession();
  assertPermission(user?.role, "requirements.read");
  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }
  const [requirementsData, usersData, clientsData, statuses, priorities, contractsData] = await Promise.all([
    getRequirements(),
    getUsers(),
    getClients(),
    getCatalogByKind("requirement_status"),
    getCatalogByKind("requirement_priority"),
    getContractBudgets(),
  ]);
  const resolvedUserId = resolveDirectoryUserIdForSession(user, usersData);
  const ownScope = user.role === "Contributor";
  const filteredRequirements = ownScope ? requirementsData.filter((r) => r.ownerId === resolvedUserId) : requirementsData;
  const selectableUsers = ownScope ? usersData.filter((u) => u.id === resolvedUserId) : usersData;
  return {
    requirements: filteredRequirements,
    users: selectableUsers.map((u) => ({ id: u.id, name: u.name })),
    clients: clientsData,
    contracts: contractsData
      .filter((contract) => contract.active)
      .map((contract) => ({ id: contract.id, clientId: contract.clientId, label: `${contract.code} · ${contract.name}` })),
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
  const contracts = await getContractBudgets();
  const nowDate = new Date().toISOString().slice(0, 10);
  const payload = user.role === "Contributor" ? { ...input, ownerId: resolvedUserId } : input;
  payload.contractId = resolveContractIdByContext({
    contractId: payload.contractId,
    clientId: payload.clientId,
    projectId: payload.projectId,
    atDate: nowDate,
    contracts,
  });
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
  const contracts = await getContractBudgets();
  const nowDate = new Date().toISOString().slice(0, 10);
  const nextInput = {
    ...input,
    contractId: resolveContractIdByContext({
      contractId: input.contractId,
      clientId: input.clientId ?? prev.clientId,
      projectId: input.projectId ?? prev.projectId,
      atDate: nowDate,
      contracts,
    }),
  };
  const next = await updateRequirement(id, nextInput, { changedById: user.id });
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
  if (prev && next) {
    const ownerChanged = prev.ownerId !== next.ownerId;
    const statusChanged = prev.status !== next.status;
    if (ownerChanged) {
      void createAppNotification({
        recipientUserId: next.ownerId,
        title: "Requerimiento asignado",
        body: `Se te asignó «${next.title}»`,
        href: requirementDetailPath(next.id),
      }).catch(() => {});
    }
    if (statusChanged) {
      void createAppNotification({
        recipientUserId: next.ownerId,
        title: "Cambio de estado",
        body: `«${next.title}»: ${prev.status} → ${next.status}`,
        href: requirementDetailPath(next.id),
      }).catch(() => {});
    }
    if (ownerChanged || statusChanged) {
      revalidatePath("/", "layout");
    }
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
  const contracts = await getContractBudgets();
  const nowDate = new Date().toISOString().slice(0, 10);
  const nextInput = {
    ...input,
    contractId: resolveContractIdByContext({
      contractId: input.contractId,
      clientId: input.clientId,
      projectId: input.projectId,
      atDate: nowDate,
      contracts,
    }),
  };
  const next = await updateRequirement(id, nextInput, { changedById: user.id });
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
  if (prev && next) {
    if (prev.ownerId !== next.ownerId) {
      void createAppNotification({
        recipientUserId: next.ownerId,
        title: "Requerimiento asignado",
        body: `Se te asignó «${next.title}»`,
        href: requirementDetailPath(next.id),
      }).catch(() => {});
    }
    if (prev.status !== next.status) {
      void createAppNotification({
        recipientUserId: next.ownerId,
        title: "Cambio de estado",
        body: `«${next.title}»: ${prev.status} → ${next.status}`,
        href: requirementDetailPath(next.id),
      }).catch(() => {});
    }
  }
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

export async function deleteRequirementsBatchAction(ids: string[]) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "requirements.delete");
  if (!user) throw new Error("Debes iniciar sesión.");
  if (ids.length === 0) return 0;

  let deletedCount = 0;
  for (const id of ids) {
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
      deletedCount++;
    }
  }

  logServerActionEvent({
    action: "requirement.delete.batch",
    entityType: "requirement",
    entityId: ids.join(","),
    outcome: deletedCount > 0 ? "ok" : "error",
    detail: deletedCount > 0 ? `${deletedCount} deleted` : "none_deleted",
  });
  revalidatePath("/", "layout");
  return deletedCount;
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

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  const normalized = input.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  for (const rawLine of lines) {
    if (!rawLine.trim()) continue;
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < rawLine.length; i += 1) {
      const char = rawLine[i];
      if (char === '"') {
        if (inQuotes && rawLine[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (char === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }
    cells.push(current.trim());
    rows.push(cells);
  }
  return rows;
}

function normalizeNullable(value: string | undefined): string | null {
  const text = (value ?? "").trim();
  if (!text) return null;
  const normalized = text.toLowerCase();
  if (normalized === "null" || normalized === "n/a" || normalized === "na") return null;
  return text;
}

export async function importRequirementsCsvAction(input: { csvText: string }) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "requirements.write");
  if (!user) throw new Error("Debes iniciar sesión.");
  if (user.role !== "Admin" && user.role !== "Project Manager") {
    throw new Error("Solo Admin y Project Manager pueden realizar cargas masivas de requerimientos.");
  }

  const rows = parseCsvRows(input.csvText ?? "");
  if (rows.length < 2) {
    throw new Error("El archivo está vacío o no contiene filas de datos.");
  }

  const header = rows[0].map((cell) => cell.trim());
  const requiredHeaders = [
    "projectId",
    "clientId",
    "contractId",
    "origin",
    "title",
    "description",
    "priority",
    "ownerId",
    "status",
    "notes",
  ];
  const missingHeaders = requiredHeaders.filter((field) => !header.includes(field));
  if (missingHeaders.length > 0) {
    throw new Error(`Faltan columnas en la plantilla: ${missingHeaders.join(", ")}.`);
  }

  const headerIndex = new Map(header.map((name, idx) => [name, idx]));
  const rowErrors: Array<{ row: number; message: string }> = [];
  let createdCount = 0;

  for (let i = 1; i < rows.length; i += 1) {
    const rowNumber = i + 1;
    const row = rows[i];
    const cell = (name: string) => row[headerIndex.get(name) ?? -1] ?? "";
    const payload: RequirementInput = {
      projectId: cell("projectId").trim(),
      clientId: cell("clientId").trim(),
      contractId: normalizeNullable(cell("contractId")),
      origin: cell("origin").trim(),
      title: cell("title").trim(),
      description: cell("description").trim(),
      priority: cell("priority").trim(),
      ownerId: cell("ownerId").trim(),
      status: cell("status").trim(),
      notes: cell("notes").trim(),
    };

    const validation = requirementSchema.safeParse(payload);
    if (!validation.success) {
      rowErrors.push({
        row: rowNumber,
        message: validation.error.issues[0]?.message ?? "Fila inválida.",
      });
      continue;
    }

    try {
      await createRequirementAction(validation.data);
      createdCount += 1;
    } catch (error) {
      rowErrors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : "No se pudo registrar la fila.",
      });
    }
  }

  return {
    createdCount,
    failedCount: rowErrors.length,
    rowErrors,
    totalRows: rows.length - 1,
  };
}

// ─── Carga masiva (Excel/CSV) ─────────────────────────────────────────────────

export interface BulkRequirementRowInput {
  title: string;
  description: string;
  origin: string;
  priority: string;
  status: string;
  notes: string;
}

export interface BulkRequirementResult {
  created: number;
  failed: number;
  errors: Array<{ title: string; error: string }>;
  newRequirements: Requirement[];
}

/**
 * Crea múltiples Requerimientos en lote para un cliente/contrato.
 * ownerId = usuario autenticado, projectId = "proj-main" (valor por defecto del sistema).
 */
export async function bulkCreateRequirementsAction(
  clientId: string,
  contractId: string | null,
  rows: BulkRequirementRowInput[],
): Promise<BulkRequirementResult> {
  const { user } = await getAppSession();
  assertPermission(user?.role, "requirements.write");

  const [users, contracts] = await Promise.all([getUsers(), getContractBudgets()]);

  const ownerId = user ? resolveDirectoryUserIdForSession(user, users) : "";
  const contract = contractId ? contracts.find((c) => c.id === contractId) : null;
  const projectId = contract?.projectId ?? "proj-main";
  const nowDate = new Date().toISOString().slice(0, 10);

  const newRequirements: Requirement[] = [];
  const errors: BulkRequirementResult["errors"] = [];

  for (const row of rows) {
    try {
      const payload: RequirementInput = {
        projectId,
        clientId,
        contractId: contractId ?? null,
        origin: row.origin,
        title: row.title,
        description: row.description || row.title,
        priority: row.priority,
        ownerId,
        status: row.status,
        notes: row.notes,
      };

      const resolvedContractId = resolveContractIdByContext({
        contractId: payload.contractId,
        clientId: payload.clientId,
        projectId: payload.projectId,
        atDate: nowDate,
        contracts,
      });

      const created = await createRequirement({ ...payload, contractId: resolvedContractId });
      newRequirements.push(created);
    } catch (err) {
      errors.push({
        title: row.title,
        error: err instanceof Error ? err.message : "Error desconocido.",
      });
    }
  }

  revalidatePath("/requirements");

  return {
    created: newRequirements.length,
    failed:  errors.length,
    errors,
    newRequirements,
  };
}
