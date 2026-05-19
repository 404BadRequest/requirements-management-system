import { z } from "zod";

export const contractProfileAllocationSchema = z.object({
  profileId: z.string().min(1, "Perfil requerido"),
  quotedMinutes: z.number().int().positive("Horas cotizadas requeridas"),
  rateUfPerHour: z.number().positive().nullable(),
});

export const budgetSchema = z.object({
  projectId: z.string().min(1, "Proyecto requerido"),
  clientId: z.string().min(1, "Cliente requerido"),
  scope: z.string().min(1, "Scope requerido"),
  code: z.string().min(2, "Código requerido"),
  name: z.string().min(3, "Nombre requerido"),
  startDate: z.string().min(1, "Fecha inicio requerida"),
  endDate: z.string().min(1, "Fecha término requerida"),
  rateUfPerHour: z.number().positive("Tarifa UF/hora requerida"),
  allocations: z.array(contractProfileAllocationSchema).min(1, "Debes agregar al menos un perfil"),
});

export const budgetPatchSchema = budgetSchema.partial().extend({
  allocations: z.array(contractProfileAllocationSchema).optional(),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
export type BudgetPatchInput = z.infer<typeof budgetPatchSchema>;
export type ContractProfileAllocationInput = z.infer<typeof contractProfileAllocationSchema>;
