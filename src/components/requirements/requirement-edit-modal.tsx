"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RequirementForm } from "@/components/forms/requirement-form";
import { SettingsModal } from "@/components/settings/settings-modal";
import { updateRequirementFullAction } from "@/app/requirements/data-actions";
import type { Requirement } from "@/types/domain";

export function RequirementEditModal({
  requirement,
  clients,
  statusOptions,
  priorityOptions,
  owners,
  canManageRequirement,
  onUpdated,
  triggerLabel = "Editar",
  triggerClassName = "btn-secondary px-2.5 py-1 text-xs",
}: {
  requirement: Requirement;
  clients: { id: string; name: string }[];
  statusOptions: { code: string; label: string }[];
  priorityOptions: { code: string; label: string }[];
  owners: { id: string; name: string }[];
  canManageRequirement: boolean;
  onUpdated?: () => void | Promise<void>;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!canManageRequirement) return null;

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>
      <SettingsModal
        open={open}
        onClose={() => setOpen(false)}
        title="Editar requerimiento"
        description={`Actualiza la información de «${requirement.title}».`}
        dialogClassName="max-w-3xl max-h-[94vh] lg:max-h-none lg:overflow-visible"
        bodyClassName="px-4 py-4 sm:px-5 sm:py-4"
      >
        <RequirementForm
          clients={clients}
          statusOptions={statusOptions}
          priorityOptions={priorityOptions}
          owners={owners}
          submitLabel="Guardar cambios"
          compact
          defaultValues={{
            projectId: requirement.projectId,
            clientId: requirement.clientId,
            origin: requirement.origin,
            title: requirement.title,
            description: requirement.description,
            priority: requirement.priority,
            ownerId: requirement.ownerId,
            status: requirement.status,
            notes: requirement.notes,
          }}
          onSubmit={async (values) => {
            try {
              await updateRequirementFullAction(requirement.id, values);
              await onUpdated?.();
              toast.success("Requerimiento actualizado");
              setOpen(false);
              router.refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "No se pudo actualizar el requerimiento.");
            }
          }}
        />
      </SettingsModal>
    </>
  );
}
