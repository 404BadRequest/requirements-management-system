"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { changePasswordAction } from "@/app/account/actions";
import { FormField } from "@/components/forms/form-field";
import { changePasswordSchema, type ChangePasswordInput } from "@/schemas/change-password-schema";

export function ChangePasswordForm() {
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const isSubmitting = form.formState.isSubmitting;

  return (
    <form
      className="grid max-w-md gap-4"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          await changePasswordAction(values);
          form.reset();
          toast.success("Contraseña actualizada correctamente.");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "No se pudo actualizar la contraseña.");
        }
      })}
    >
      <FormField label="Contraseña actual" error={form.formState.errors.currentPassword?.message}>
        <input
          type="password"
          autoComplete="current-password"
          className="field-control w-full text-sm"
          {...form.register("currentPassword")}
        />
      </FormField>
      <FormField label="Nueva contraseña" error={form.formState.errors.newPassword?.message}>
        <input
          type="password"
          autoComplete="new-password"
          className="field-control w-full text-sm"
          {...form.register("newPassword")}
        />
      </FormField>
      <FormField label="Confirmar nueva contraseña" error={form.formState.errors.confirmPassword?.message}>
        <input
          type="password"
          autoComplete="new-password"
          className="field-control w-full text-sm"
          {...form.register("confirmPassword")}
        />
      </FormField>
      <p className="text-xs text-muted-foreground">Mínimo 8 caracteres. Tras guardar, usa la nueva contraseña en tu próximo inicio de sesión.</p>
      <button type="submit" className="btn-primary w-fit py-2 text-sm" disabled={isSubmitting}>
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground"
              aria-hidden
            />
            Guardando...
          </span>
        ) : (
          "Actualizar contraseña"
        )}
      </button>
    </form>
  );
}
