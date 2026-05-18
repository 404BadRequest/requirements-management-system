"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { requirementSchema, type RequirementInput } from "@/schemas/requirement-schema";
import { FormField } from "@/components/forms/form-field";
import { formatStatusLabel } from "@/lib/formatting/status-label";

export const RequirementForm = ({
  clients,
  statusOptions,
  priorityOptions,
  defaultValues,
  owners,
  submitLabel = "Guardar requerimiento",
  compact = false,
  onSubmit,
}: {
  clients: { id: string; name: string }[];
  statusOptions: { code: string; label: string }[];
  priorityOptions: { code: string; label: string }[];
  defaultValues?: Partial<RequirementInput>;
  owners: { id: string; name: string }[];
  submitLabel?: string;
  compact?: boolean;
  onSubmit: (values: RequirementInput) => Promise<void> | void;
}) => {
  const form = useForm<RequirementInput>({
    resolver: zodResolver(requirementSchema),
    defaultValues: {
      projectId: "proj-main",
      clientId: clients[0]?.id ?? "",
      origin: "Cliente",
      title: "",
      description: "",
      priority: priorityOptions[0]?.code ?? "P2",
      ownerId: owners[0]?.id ?? "",
      status: statusOptions[0]?.code ?? "BACKLOG",
      notes: "",
      ...defaultValues,
    },
  });

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
      <FormField label="Título" error={form.formState.errors.title?.message}>
        <input className="field-control w-full" {...form.register("title")} />
      </FormField>
      <FormField label="Descripción" error={form.formState.errors.description?.message}>
        <textarea className={compact ? "field-control min-h-[4.25rem] w-full" : "field-control min-h-[6rem] w-full"} {...form.register("description")} />
      </FormField>
      <FormField label="Origen" error={form.formState.errors.origin?.message}>
        <input className="field-control w-full" {...form.register("origin")} />
      </FormField>
      <FormField label="Cliente" error={form.formState.errors.clientId?.message}>
        <select className="field-control w-full" {...form.register("clientId")}>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Prioridad">
          <select className="field-control w-full" {...form.register("priority")}>
            {priorityOptions.map((p) => (
              <option key={p.code} value={p.code}>
                {p.label} ({p.code})
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Estado">
          <select className="field-control w-full" {...form.register("status")}>
            {statusOptions.map((s) => (
              <option key={s.code} value={s.code}>
                {formatStatusLabel(s.code, s.label)}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField label="Responsable">
        <select className="field-control w-full" {...form.register("ownerId")}>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Notas internas">
        <textarea className={compact ? "field-control min-h-[3.5rem] w-full" : "field-control min-h-[5rem] w-full"} {...form.register("notes")} />
      </FormField>
      <button type="submit" className="btn-primary py-2 text-sm">
        {submitLabel}
      </button>
    </form>
  );
};
