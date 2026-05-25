import { z } from "zod";

export const contractProfileAllocationSchema = z.object({
  profileId: z.string().min(1, "Perfil requerido"),
  quotedMinutes: z.number().int().positive("Horas cotizadas requeridas"),
  rateUfPerHour: z.number().positive().nullable(),
});

const budgetBaseObject = z.object({
  projectId: z.string().min(1, "Proyecto requerido"),
  clientId: z.string().min(1, "Cliente requerido"),
  scope: z.string().min(1, "Scope requerido"),
  code: z.string().min(2, "Código requerido"),
  name: z.string().min(3, "Nombre requerido"),
  startDate: z.string().min(1, "Fecha inicio requerida"),
  endDate: z.string().min(1, "Fecha término requerida"),
  rateUfPerHour: z.number().positive("Tarifa UF/hora requerida"),
  markupPercentage: z.number().min(0, "Markup no puede ser negativo"),
  opexPercentage: z.number().min(0, "OPEX no puede ser negativo"),
  allocations: z.array(contractProfileAllocationSchema).min(1, "Debes agregar al menos un perfil"),
});

// Refinement se aplica solo sobre el schema completo de creación.
// budgetPatchSchema usa el objeto base (sin refine) para que .partial() funcione.
export const budgetSchema = budgetBaseObject.refine(
  (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
  {
    message: "La fecha de término debe ser igual o posterior a la fecha de inicio",
    path: ["endDate"],
  },
);

export const budgetPatchSchema = budgetBaseObject.partial().extend({
  allocations: z.array(contractProfileAllocationSchema).optional(),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
export type BudgetPatchInput = z.infer<typeof budgetPatchSchema>;
export type ContractProfileAllocationInput = z.infer<typeof contractProfileAllocationSchema>;
