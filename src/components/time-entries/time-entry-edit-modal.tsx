"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SettingsModal } from "@/components/settings/settings-modal";
import { TimeEntryForm } from "@/components/forms/time-entry-form";
import { updateTimeEntryAction } from "@/app/time-entries/new/data-actions";
import type { TimeEntry } from "@/types/domain";

export function TimeEntryEditModal({
  entry,
  users,
  requirements,
  categories,
  canEdit,
  canPickAnyOwner,
  triggerLabel = "Editar hora",
  triggerClassName = "btn-secondary py-2 text-sm",
}: {
  entry: TimeEntry;
  users: { id: string; name: string }[];
  requirements: { id: string; title: string }[];
  categories: { code: string; label: string }[];
  canEdit: boolean;
  canPickAnyOwner: boolean;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!canEdit) return null;

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>
      <SettingsModal
        open={open}
        onClose={() => setOpen(false)}
        title="Editar hora"
        description="Corrige horas, tarea, observaciones y relación con requerimiento."
        dialogClassName="max-w-3xl max-h-[94vh] lg:max-h-none lg:overflow-visible"
        bodyClassName="px-4 py-4 sm:px-5 sm:py-4"
      >
        <TimeEntryForm
          users={users}
          requirements={requirements}
          categories={categories}
          defaultUserId={entry.userId}
          encargadoLocked={!canPickAnyOwner}
          submitLabel="Guardar cambios"
          defaultValues={{
            projectId: entry.projectId,
            requirementId: entry.requirementId,
            category: entry.category,
            taskDescription: entry.taskDescription,
            date: entry.date,
            startTime: entry.startTime,
            endTime: entry.endTime,
            userId: entry.userId,
            observations: entry.observations,
          }}
          onSubmit={async (values) => {
            try {
              await updateTimeEntryAction(entry.id, values);
              toast.success("Hora actualizada");
              setOpen(false);
              router.refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "No se pudo actualizar la hora.");
            }
          }}
        />
      </SettingsModal>
    </>
  );
}
