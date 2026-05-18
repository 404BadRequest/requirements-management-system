import { z } from "zod";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual."),
    newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string().min(1, "Confirma la nueva contraseña."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas nuevas no coinciden.",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
