"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { budgetSchema, type BudgetInput } from "@/schemas/budget-schema";
import { FormField } from "@/components/forms/form-field";

export const BudgetForm = ({
  clients,
  scopes,
  profiles,
  defaultValues,
  submitLabel = "Guardar contrato",
  onSubmit,
}: {
  clients: { id: string; name: string }[];
  scopes: { code: string; label: string }[];
  profiles: { id: string; name: string }[];
  defaultValues?: Partial<BudgetInput>;
  submitLabel?: string;
  onSubmit: (values: BudgetInput) => Promise<void> | void;
}) => {
  const normalizeDate = (value: string): string => {
    if (!value?.trim()) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().slice(0, 10);
  };

  const toDateInputValue = (value: string | undefined): string => {
    if (!value?.trim()) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().slice(0, 10);
  };

  const parseHoursInput = (raw: string): number => {
    const normalized = raw.replace(",", ".").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatHoursInput = (minutes: number | undefined): string => {
    const hours = (minutes ?? 0) / 60;
    if (!Number.isFinite(hours) || hours <= 0) return "";
    return hours.toFixed(2).replace(/\.?0+$/, "");
  };

  const form = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      projectId: "proj-main",
      clientId: clients[0]?.id ?? "",
      scope: scopes[0]?.code ?? "Proyecto",
      code: "__AUTO__",
      name: "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 12)).toISOString().slice(0, 10),
      rateUfPerHour: 1,
      markupPercentage: 40,
      opexPercentage: 10,
      allocations: [{ profileId: profiles[0]?.id ?? "", quotedMinutes: 600, rateUfPerHour: null }],
      ...defaultValues,
    },
  });
  const allocations = useFieldArray({
    control: form.control,
    name: "allocations",
  });
  const [hoursDraftByFieldId, setHoursDraftByFieldId] = useState<Record<string, string>>({});
  const errors = form.formState.errors;
  const isSubmitting = form.formState.isSubmitting;

  return (
    <form
      className="grid gap-3"
      onSubmit={form.handleSubmit(
        async (values) => {
          await onSubmit({
            ...values,
            startDate: normalizeDate(values.startDate),
            endDate: normalizeDate(values.endDate),
            allocations: values.allocations.map((allocation) => ({
              ...allocation,
              quotedMinutes: Math.max(1, Math.round(allocation.quotedMinutes)),
            })),
          });
        },
        (validationErrors) => {
          const messages = Object.values(validationErrors)
            .map((e) => (Array.isArray(e) ? e.map((item) => Object.values(item ?? {}).map((f) => (f as { message?: string })?.message)).flat() : [(e as { message?: string })?.message]))
            .flat()
            .filter(Boolean);
          const summary = messages.length > 0 ? messages[0] : "Revisa los campos del formulario antes de guardar.";
          toast.error(summary as string);
        },
      )}
    >
      <input type="hidden" {...form.register("projectId")} />
      <input type="hidden" {...form.register("code")} />
      <input type="hidden" {...form.register("rateUfPerHour", { valueAsNumber: true })} />
      <FormField label="Cliente" error={errors.clientId?.message}>
        <select className="field-control w-full" {...form.register("clientId")}>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Ámbito" error={errors.scope?.message}>
        <select className="field-control w-full" {...form.register("scope")}>
          {scopes.map((scope) => (
            <option key={scope.code} value={scope.code}>
              {scope.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Clasifica el tipo de trabajo que cubre el contrato (p. ej. proyecto, operación o soporte).
        </p>
      </FormField>
      <div className="grid gap-3 sm:grid-cols-1">
        <FormField label="Nombre contrato" error={errors.name?.message}>
          <input type="text" className="field-control w-full" {...form.register("name")} />
        </FormField>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Inicio vigencia" error={errors.startDate?.message}>
          <input
            type="date"
            className="field-control w-full"
            value={toDateInputValue(form.watch("startDate"))}
            onChange={(event) => form.setValue("startDate", event.target.value, { shouldValidate: true })}
          />
        </FormField>
        <FormField label="Término vigencia" error={errors.endDate?.message}>
          <input
            type="date"
            className="field-control w-full"
            value={toDateInputValue(form.watch("endDate"))}
            onChange={(event) => form.setValue("endDate", event.target.value, { shouldValidate: true })}
          />
        </FormField>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Markup (Margen %) para estimar Venta" error={errors.markupPercentage?.message}>
          <input
            type="number"
            step="0.1"
            min="0"
            className="field-control w-full"
            {...form.register("markupPercentage", { valueAsNumber: true })}
          />
        </FormField>
        <FormField label="OPEX (%)" error={errors.opexPercentage?.message}>
          <input
            type="number"
            step="0.1"
            min="0"
            className="field-control w-full"
            {...form.register("opexPercentage", { valueAsNumber: true })}
          />
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
        {errors.allocations?.root?.message || errors.allocations?.message ? (
          <p className="mb-2 text-xs text-danger">{errors.allocations.root?.message ?? errors.allocations.message}</p>
        ) : null}
        <div className="space-y-2">
          {allocations.fields.map((field, index) => (
            <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
              <select className="field-control w-full" {...form.register(`allocations.${index}.profileId`)}>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                inputMode="decimal"
                className="field-control w-full"
                placeholder="Horas"
                aria-label="Horas cotizadas"
                value={hoursDraftByFieldId[field.id] ?? formatHoursInput(form.watch(`allocations.${index}.quotedMinutes`))}
                onChange={(event) => {
                  const raw = event.target.value;
                  setHoursDraftByFieldId((prev) => ({ ...prev, [field.id]: raw }));
                  const hours = parseHoursInput(event.target.value);
                  const minutes = Number.isFinite(hours) ? Math.round(hours * 60) : 0;
                  form.setValue(`allocations.${index}.quotedMinutes`, minutes, { shouldValidate: true });
                }}
                onBlur={() => {
                  setHoursDraftByFieldId((prev) => {
                    const next = { ...prev };
                    delete next[field.id];
                    return next;
                  });
                }}
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
          submitLabel
        )}
      </button>
    </form>
  );
};
