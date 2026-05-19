"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { budgetSchema, type BudgetInput } from "@/schemas/budget-schema";
import { FormField } from "@/components/forms/form-field";

export const BudgetForm = ({
  clients,
  scopes,
  profiles,
  onSubmit,
}: {
  clients: { id: string; name: string }[];
  scopes: { code: string; label: string }[];
  profiles: { id: string; name: string }[];
  onSubmit: (values: BudgetInput) => Promise<void> | void;
}) => {
  const form = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      projectId: "proj-main",
      clientId: clients[0]?.id ?? "",
      scope: scopes[0]?.code ?? "Proyecto",
      code: "",
      name: "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 12)).toISOString().slice(0, 10),
      rateUfPerHour: 1,
      allocations: [{ profileId: profiles[0]?.id ?? "", quotedMinutes: 600, rateUfPerHour: null }],
    },
  });
  const allocations = useFieldArray({
    control: form.control,
    name: "allocations",
  });
  const isSubmitting = form.formState.isSubmitting;

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
      <input type="hidden" {...form.register("projectId")} />
      <FormField label="Cliente">
        <select className="field-control w-full" {...form.register("clientId")}>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Scope">
        <select className="field-control w-full" {...form.register("scope")}>
          {scopes.map((scope) => (
            <option key={scope.code} value={scope.code}>
              {scope.label}
            </option>
          ))}
        </select>
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Código contrato">
          <input type="text" className="field-control w-full" {...form.register("code")} />
        </FormField>
        <FormField label="Nombre contrato">
          <input type="text" className="field-control w-full" {...form.register("name")} />
        </FormField>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label="Inicio vigencia">
          <input type="date" className="field-control w-full" {...form.register("startDate")} />
        </FormField>
        <FormField label="Término vigencia">
          <input type="date" className="field-control w-full" {...form.register("endDate")} />
        </FormField>
        <FormField label="UF por hora">
          <input type="number" step="0.01" className="field-control w-full" {...form.register("rateUfPerHour", { valueAsNumber: true })} />
        </FormField>
      </div>
      <div className="rounded-[2px] border border-border/70 bg-muted/20 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bolsa por perfil</p>
          <button
            type="button"
            className="btn-secondary px-2 py-1 text-xs"
            onClick={() =>
              allocations.append({
                profileId: profiles[0]?.id ?? "",
                quotedMinutes: 60,
                rateUfPerHour: null,
              })
            }
          >
            Agregar perfil
          </button>
        </div>
        <div className="space-y-2">
          {allocations.fields.map((field, index) => (
            <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_8rem_8rem_auto]">
              <select className="field-control w-full" {...form.register(`allocations.${index}.profileId`)}>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="field-control w-full"
                placeholder="Min"
                {...form.register(`allocations.${index}.quotedMinutes`, { valueAsNumber: true })}
              />
              <input
                type="number"
                step="0.01"
                className="field-control w-full"
                placeholder="UF/h"
                value={form.watch(`allocations.${index}.rateUfPerHour`) ?? ""}
                onChange={(event) =>
                  form.setValue(
                    `allocations.${index}.rateUfPerHour`,
                    event.target.value === "" ? null : Number(event.target.value),
                  )
                }
              />
              <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => allocations.remove(index)}>
                Quitar
              </button>
            </div>
          ))}
        </div>
      </div>
      <button type="submit" className="btn-primary py-2 text-sm" disabled={isSubmitting}>
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" aria-hidden />
            Guardando...
          </span>
        ) : (
          "Guardar presupuesto"
        )}
      </button>
    </form>
  );
};
