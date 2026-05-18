"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { budgetSchema, type BudgetInput } from "@/schemas/budget-schema";
import { FormField } from "@/components/forms/form-field";

export const BudgetForm = ({
  scopes,
  profiles,
  onSubmit,
}: {
  scopes: { code: string; label: string }[];
  profiles: { id: string; name: string }[];
  onSubmit: (values: BudgetInput) => Promise<void> | void;
}) => {
  const form = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      projectId: "proj-main",
      scope: scopes[0]?.code ?? "Proyecto",
      profileId: profiles[0]?.id ?? "",
      quotedMinutes: 600,
    },
  });

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
      <input type="hidden" {...form.register("projectId")} />
      <FormField label="Scope">
        <select className="field-control w-full" {...form.register("scope")}>
          {scopes.map((scope) => (
            <option key={scope.code} value={scope.code}>
              {scope.label}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Perfil">
        <select className="field-control w-full" {...form.register("profileId")}>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Minutos cotizados">
        <input
          type="number"
          className="field-control w-full"
          {...form.register("quotedMinutes", { valueAsNumber: true })}
        />
      </FormField>
      <button type="submit" className="btn-primary py-2 text-sm">
        Guardar presupuesto
      </button>
    </form>
  );
};
