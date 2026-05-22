import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const timeEntrySchema = z
  .object({
    projectId: z.string().min(1),
    clientId: z.string().nullable(),
    requirementId: z.string().nullable(),
    contractId: z.string().nullable(),
    contractProfileId: z.string().nullable(),
    category: z.string().min(1, "Categoría requerida"),
    taskDescription: z.string().min(3, "Tarea requerida"),
    date: z.string().min(1, "Fecha obligatoria"),
    startTime: z.string().regex(timeRegex, "Hora inicio inválida"),
    endTime: z.string().regex(timeRegex, "Hora término inválida").or(z.literal("")).nullable(),
    userId: z.string().min(1, "Encargado obligatorio"),
    observations: z.string(),
  })
  .refine((value) => !value.endTime || value.endTime > value.startTime, {
    path: ["endTime"],
    message: "Hora término debe ser posterior a hora inicio",
  });

export type TimeEntryInput = z.infer<typeof timeEntrySchema>;

export const timeEntryBatchBlockSchema = z
  .object({
    date: z.string().min(1, "Fecha obligatoria"),
    startTime: z.string().regex(timeRegex, "Hora inicio inválida"),
    endTime: z.string().regex(timeRegex, "Hora término inválida"),
  })
  .refine((value) => value.endTime > value.startTime, {
    path: ["endTime"],
    message: "Hora término debe ser posterior a hora inicio",
  });

export const timeEntryBatchSchema = z.object({
  projectId: z.string().min(1),
  clientId: z.string().nullable(),
  requirementId: z.string().nullable(),
  contractId: z.string().nullable(),
  contractProfileId: z.string().nullable(),
  category: z.string().min(1, "Categoría requerida"),
  taskDescription: z.string().min(3, "Tarea requerida"),
  userId: z.string().min(1, "Encargado obligatorio"),
  observations: z.string(),
  blocks: z.array(timeEntryBatchBlockSchema).min(1, "Debes agregar al menos un bloque horario."),
});

export type TimeEntryBatchInput = z.infer<typeof timeEntryBatchSchema>;
