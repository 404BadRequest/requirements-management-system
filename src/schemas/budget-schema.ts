import { z } from "zod";

export const budgetSchema = z.object({
  projectId: z.string().min(1),
  scope: z.string().min(1, "Scope requerido"),
  profileId: z.string().min(1),
  quotedMinutes: z.number().positive(),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
