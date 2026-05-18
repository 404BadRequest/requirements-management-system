import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const timeEntrySchema = z
  .object({
    projectId: z.string().min(1),
    requirementId: z.string().nullable(),
    category: z.string().min(1, "Categoría requerida"),
    taskDescription: z.string().min(3, "Tarea requerida"),
    date: z.string().min(1, "Fecha obligatoria"),
    startTime: z.string().regex(timeRegex, "Hora inicio invalida"),
    endTime: z.string().regex(timeRegex, "Hora termino invalida"),
    userId: z.string().min(1, "Encargado obligatorio"),
    observations: z.string(),
  })
  .refine((value) => value.endTime > value.startTime, {
    path: ["endTime"],
    message: "Hora termino debe ser posterior a hora inicio",
  });

export type TimeEntryInput = z.infer<typeof timeEntrySchema>;
