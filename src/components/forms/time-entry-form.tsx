"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { timeEntrySchema, type TimeEntryInput } from "@/schemas/time-entry-schema";
import { FormField } from "@/components/forms/form-field";

export const TimeEntryForm = ({
  users,
  clients,
  categories,
  requirements,
  contracts = [],
  contractProfiles = [],
  canOverrideContract = false,
  canOverrideContractProfile = false,
  defaultUserId,
  encargadoLocked = false,
  defaultValues,
  submitLabel = "Guardar hora",
  onSubmit,
}: {
  users: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  categories: { code: string; label: string }[];
  requirements: { id: string; title: string; clientId: string }[];
  contracts?: { id: string; clientId: string; label: string }[];
  contractProfiles?: { id: string; label: string }[];
  canOverrideContract?: boolean;
  canOverrideContractProfile?: boolean;
  /** Usuario del directorio asociado a la sesión (inicial en el selector). */
  defaultUserId?: string;
  /** Si es true, solo se muestra el encargado vinculado a la sesión (roles sin selector global). */
  encargadoLocked?: boolean;
  defaultValues?: Partial<TimeEntryInput>;
  submitLabel?: string;
  onSubmit: (values: TimeEntryInput) => Promise<void> | void;
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const initialUserId =
    defaultUserId && users.some((u) => u.id === defaultUserId) ? defaultUserId : (users[0]?.id ?? "");
  const form = useForm<TimeEntryInput>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      projectId: "proj-main",
      requirementId: null,
      contractId: null,
      contractProfileId: null,
      category: categories[0]?.code ?? "Proyecto",
      taskDescription: "",
      date: today,
      startTime: "09:00",
      endTime: "10:00",
      userId: initialUserId,
      observations: "",
      ...defaultValues,
    },
  });
  const isSubmitting = form.formState.isSubmitting;
  const selectedRequirementId = form.watch("requirementId");
  const selectedContractId = form.watch("contractId");
  const selectedRequirement = useMemo(
    () => requirements.find((requirement) => requirement.id === selectedRequirementId) ?? null,
    [requirements, selectedRequirementId],
  );
  const initialClientId = selectedRequirement?.clientId ?? contracts.find((contract) => contract.id === selectedContractId)?.clientId ?? clients[0]?.id ?? "";
  const [selectedClientId, setSelectedClientId] = useState(initialClientId);
  const filteredRequirements = useMemo(
    () => requirements.filter((requirement) => requirement.clientId === selectedClientId),
    [requirements, selectedClientId],
  );
  const filteredContracts = useMemo(
    () => contracts.filter((contract) => contract.clientId === selectedClientId),
    [contracts, selectedClientId],
  );

  useEffect(() => {
    if (!selectedRequirement) return;
    if (selectedRequirement.clientId !== selectedClientId) {
      setSelectedClientId(selectedRequirement.clientId);
    }
  }, [selectedClientId, selectedRequirement]);

  useEffect(() => {
    if (!selectedRequirementId) return;
    const stillVisible = filteredRequirements.some((requirement) => requirement.id === selectedRequirementId);
    if (!stillVisible) {
      form.setValue("requirementId", null);
    }
  }, [filteredRequirements, form, selectedRequirementId]);

  useEffect(() => {
    if (!selectedContractId) return;
    const stillVisible = filteredContracts.some((contract) => contract.id === selectedContractId);
    if (!stillVisible) {
      form.setValue("contractId", null);
      form.setValue("contractProfileId", null);
    }
  }, [filteredContracts, form, selectedContractId]);

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
      <FormField label="Fecha" error={form.formState.errors.date?.message}>
        <input type="date" className="field-control w-full" {...form.register("date")} />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Hora inicio">
          <input type="time" className="field-control w-full" {...form.register("startTime")} />
        </FormField>
        <FormField label="Hora termino" error={form.formState.errors.endTime?.message}>
          <input type="time" className="field-control w-full" {...form.register("endTime")} />
        </FormField>
      </div>
      <FormField label="Encargado">
        {encargadoLocked ? (
          <div className="space-y-1">
            <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm font-medium text-foreground">
              {users[0]?.name ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              Las horas se registran a tu nombre. Un administrador o project manager puede registrar horas por otras personas.
            </p>
            <input type="hidden" {...form.register("userId")} />
          </div>
        ) : (
          <select className="field-control w-full" {...form.register("userId")}>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        )}
      </FormField>
      <FormField label="Categoria">
        <select className="field-control w-full" {...form.register("category")}>
          {categories.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Cliente">
        <select
          className="field-control w-full"
          value={selectedClientId}
          onChange={(event) => setSelectedClientId(event.target.value)}
        >
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Requerimiento (opcional)">
        <select
          className="field-control w-full"
          value={form.watch("requirementId") ?? ""}
          onChange={(event) => {
            const nextRequirementId = event.target.value || null;
            form.setValue("requirementId", nextRequirementId);
            if (!nextRequirementId) return;
            const nextRequirement = requirements.find((requirement) => requirement.id === nextRequirementId);
            if (nextRequirement) {
              setSelectedClientId(nextRequirement.clientId);
            }
          }}
        >
          <option value="">Sin requerimiento</option>
          {filteredRequirements.map((requirement) => (
            <option key={requirement.id} value={requirement.id}>
              {requirement.title}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Contrato (opcional)">
        <select
          className="field-control w-full"
          value={form.watch("contractId") ?? ""}
          onChange={(event) => form.setValue("contractId", event.target.value || null)}
          disabled={!canOverrideContract}
        >
          <option value="">Asignación automática</option>
          {filteredContracts.map((contract) => (
            <option key={contract.id} value={contract.id}>
              {contract.label}
            </option>
          ))}
        </select>
        {!canOverrideContract ? (
          <p className="text-xs text-muted-foreground">
            El contrato se asigna automáticamente según requerimiento, proyecto y vigencia.
          </p>
        ) : null}
      </FormField>
      <FormField label="Perfil contractual (opcional)">
        <select
          className="field-control w-full"
          value={form.watch("contractProfileId") ?? ""}
          onChange={(event) => form.setValue("contractProfileId", event.target.value || null)}
          disabled={!canOverrideContractProfile}
        >
          <option value="">Asignación automática por perfil real</option>
          {contractProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.label}
            </option>
          ))}
        </select>
        {!canOverrideContractProfile ? (
          <p className="text-xs text-muted-foreground">
            El perfil contractual se resuelve automáticamente según el perfil de quien registra la hora.
          </p>
        ) : null}
      </FormField>
      <FormField label="Tarea" error={form.formState.errors.taskDescription?.message}>
        <input className="field-control w-full" {...form.register("taskDescription")} />
      </FormField>
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
