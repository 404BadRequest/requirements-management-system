import { clientsSeed } from "@/data/mock/clients";
import {
  requirementPriorityCodes,
  requirementStatusCodes,
} from "@/data/mock/settings-catalog-seed";
import type { Requirement, RequirementComment, RequirementStatusHistory } from "@/types/domain";

const now = new Date();
const owners = ["user-julio", "user-luis", "user-veronica", "user-jacklin", "user-joaquin"];
const origins = ["Cliente", "Operación", "Soporte", "Comercial", "Estrategia"];
const clientIds = clientsSeed.map((c) => c.id);

export const requirementsMock: Requirement[] = Array.from({ length: 60 }, (_, index) => {
  const created = new Date(now);
  created.setDate(now.getDate() - (index * 3 + 2));

  const status = requirementStatusCodes[index % requirementStatusCodes.length];
  const isDone = status === "DONE_PROD";
  const updated = new Date(created);
  updated.setDate(created.getDate() + (index % 7));
  const completed = isDone ? new Date(updated) : null;

  return {
    id: `req-${String(index + 1).padStart(3, "0")}`,
    projectId: "proj-main",
    clientId: clientIds[index % clientIds.length],
    contractId: null,
    origin: origins[index % origins.length],
    title: `Requerimiento ${index + 1}: mejora operativa`,
    description: `Descripción detallada del requerimiento ${index + 1} para mejorar trazabilidad del equipo.`,
    priority: requirementPriorityCodes[index % requirementPriorityCodes.length],
    ownerId: owners[index % owners.length],
    status,
    notes: index % 4 === 0 ? "Se requiere coordinación con QA." : "",
    createdAt: created.toISOString(),
    updatedAt: updated.toISOString(),
    completedAt: completed ? completed.toISOString() : null,
  };
});

export const requirementCommentsMock: RequirementComment[] = requirementsMock
  .filter((_, index) => index % 3 === 0)
  .flatMap((requirement, idx) => [
    {
      id: `comment-${idx + 1}-a`,
      requirementId: requirement.id,
      userId: owners[idx % owners.length],
      body: "Se actualizó el alcance funcional para la siguiente iteración.",
      createdAt: requirement.updatedAt,
    },
    {
      id: `comment-${idx + 1}-b`,
      requirementId: requirement.id,
      userId: owners[(idx + 1) % owners.length],
      body: "Pendiente validación con equipo de negocio.",
      createdAt: requirement.updatedAt,
    },
  ]);

export const requirementStatusHistoryMock: RequirementStatusHistory[] = requirementsMock
  .filter((_, index) => index % 2 === 0)
  .map((requirement, idx) => ({
    id: `history-${idx + 1}`,
    requirementId: requirement.id,
    fromStatus: "BACKLOG",
    toStatus: requirement.status,
    changedById: owners[idx % owners.length],
    changedAt: requirement.updatedAt,
  }));
