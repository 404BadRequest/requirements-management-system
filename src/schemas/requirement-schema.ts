import { z } from "zod";

export const requirementSchema = z.object({
  projectId: z.string().min(1),
  clientId: z.string().min(1, "Cliente requerido"),
  contractId: z.string().nullable(),
  origin: z.string().min(1, "Origen requerido"),
  title: z.string().min(3, "Título muy corto"),
  description: z.string().min(3, "Descripción requerida"),
  priority: z.string().min(1, "Prioridad requerida"),
  ownerId: z.string().min(1, "Responsable requerido"),
  status: z.string().min(1, "Estado requerido"),
  notes: z.string(),
});

export type RequirementInput = z.infer<typeof requirementSchema>;
