"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteTimeEntryAction } from "@/app/time-entries/new/data-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { scheduleUndoableAction } from "@/components/common/undoable-action";

export function TimeEntryDeleteButton({
  entryId,
  canDelete,
  label = "Eliminar",
}: {
  entryId: string;
  canDelete: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  if (!canDelete) return null;

  return (
    <ConfirmDialog
      label={deleting ? "Eliminando..." : label}
      title="¿Eliminar hora?"
      onConfirm={() => {
        if (deleting) return;
        void (async () => {
          setDeleting(true);
          try {
            scheduleUndoableAction({
              pendingMessage: "Hora marcada para eliminar.",
              successMessage: "Hora eliminada.",
              errorMessage: "No se pudo eliminar la hora.",
              onCommit: async () => {
                await deleteTimeEntryAction(entryId);
                router.refresh();
              },
            });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo eliminar la hora.");
          } finally {
            setDeleting(false);
          }
        })();
      }}
    />
  );
}
