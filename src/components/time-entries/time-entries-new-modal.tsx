"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SettingsModal } from "@/components/settings/settings-modal";
import { TimeEntryForm } from "@/components/forms/time-entry-form";
import { createTimeEntriesBatchAction, createTimeEntryAction, loadNewTimeEntryFormData } from "@/app/time-entries/new/data-actions";
import type { TimeEntryInput } from "@/schemas/time-entry-schema";

function NewTimeEntryModalForm({
  onCreated,
  defaultValues,
}: {
  onCreated: () => Promise<void> | void;
  defaultValues?: Partial<TimeEntryInput>;
}) {
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [requirements, setRequirements] = useState<{ id: string; title: string; clientId: string }[]>([]);
  const [contracts, setContracts] = useState<{ id: string; clientId: string; label: string }[]>([]);
  const [contractProfiles, setContractProfiles] = useState<{ id: string; label: string }[]>([]);
  const [categories, setCategories] = useState<{ code: string; label: string }[]>([]);
  const [defaultUserId, setDefaultUserId] = useState<string | undefined>();
  const [encargadoLocked, setEncargadoLocked] = useState(false);
  const [canOverrideContract, setCanOverrideContract] = useState(false);
  const [canOverrideContractProfile, setCanOverrideContractProfile] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadNewTimeEntryFormData()
      .then((data) => {
        if (cancelled) return;
        setUsers(data.users);
        setClients(data.clients);
        setRequirements(data.requirements);
        setContracts(data.contracts);
        setContractProfiles(data.contractProfiles);
        setCategories(data.categories);
        setDefaultUserId(data.defaultUserId);
        setEncargadoLocked(data.encargadoLocked);
        setCanOverrideContract(data.canOverrideContract);
        setCanOverrideContractProfile(data.canOverrideContractProfile);
        setLoadError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "No se pudo cargar el formulario.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>;
  }

  if (users.length === 0 || categories.length === 0) {
    return <p className="text-sm text-muted-foreground">Cargando formulario…</p>;
  }

  return (
    <TimeEntryForm
      users={users}
      clients={clients}
      categories={categories}
      requirements={requirements}
      contracts={contracts}
      contractProfiles={contractProfiles}
      canOverrideContract={canOverrideContract}
      canOverrideContractProfile={canOverrideContractProfile}
      defaultUserId={defaultUserId}
      encargadoLocked={encargadoLocked}
      enableMultiBlock
      defaultValues={defaultValues}
      onSubmit={async (values) => {
        try {
          await createTimeEntryAction(values);
          toast.success("Hora registrada");
          await onCreated();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
        }
      }}
      onSubmitBatch={async (values) => {
        try {
          const result = await createTimeEntriesBatchAction(values);
          if (result.failedCount > 0) {
            const failedRows = result.rowErrors.map((row) => `#${row.row}`).join(", ");
            const message = result.createdCount
              ? `Se registraron ${result.createdCount} bloque(s). Corrige ${result.failedCount} bloque(s): ${failedRows}.`
              : `No se pudo registrar ningún bloque. Revisa filas: ${failedRows}.`;
            toast.error(message);
            return;
          }
          toast.success(`Se registraron ${result.createdCount} bloque(s).`);
          await onCreated();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "No se pudieron registrar los bloques.");
        }
      }}
    />
  );
}

export function TimeEntriesNewModal({
  autoOpen,
  defaultValues,
}: {
  autoOpen: boolean;
  defaultValues?: Partial<TimeEntryInput>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen);
  const [formKey, setFormKey] = useState(0);
  const [prefillValues, setPrefillValues] = useState<Partial<TimeEntryInput> | undefined>(defaultValues);

  useEffect(() => {
    if (!autoOpen) return;
    setFormKey((k) => k + 1);
    setOpen(true);
  }, [autoOpen]);

  useEffect(() => {
    setPrefillValues(defaultValues);
  }, [defaultValues]);

  useEffect(() => {
    if (!autoOpen) return;
    router.replace("/time-entries", { scroll: false });
  }, [autoOpen, router]);

  const stripNuevaQuery = () => {
    if (typeof window !== "undefined" && window.location.search.includes("nueva=")) {
      router.replace("/time-entries", { scroll: false });
    }
  };

  const handleClose = () => {
    setOpen(false);
    stripNuevaQuery();
  };

  const openFresh = () => {
    setFormKey((k) => k + 1);
    setPrefillValues(undefined);
    setOpen(true);
  };

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => openFresh()}>
        Nueva hora
      </button>
      <SettingsModal
        open={open}
        onClose={handleClose}
        title="Nueva hora"
        description="Registra el bloque de horas; la duración se calcula según inicio y término."
        dialogClassName="max-w-3xl max-h-none overflow-visible"
        bodyClassName="px-4 py-4 sm:px-5 sm:py-4"
      >
        {open ? (
          <NewTimeEntryModalForm
            key={formKey}
            defaultValues={prefillValues}
            onCreated={async () => {
              router.refresh();
              handleClose();
            }}
          />
        ) : null}
      </SettingsModal>
    </>
  );
}
