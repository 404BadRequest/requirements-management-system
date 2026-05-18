import type { Project } from "@/types/domain";

const now = new Date().toISOString();

export const projectsMock: Project[] = [
  {
    id: "proj-main",
    name: "Requirements Management Modernization",
    code: "RMS-INT",
    clientName: "Operaciones Internas",
    description: "Sistema interno para gestionar requerimientos, horas y presupuesto.",
    active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "proj-legacy",
    name: "Integración CRM legado",
    code: "CRM-LEG",
    clientName: "Operaciones Internas",
    description: "Segundo proyecto de ejemplo para filtros multi-proyecto.",
    active: true,
    createdAt: now,
    updatedAt: now,
  },
];
