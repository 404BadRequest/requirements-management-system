"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { completeTimeEntryNowAction } from "@/app/time-entries/new/data-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

function currentLocalTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function TimeEntryCompleteNowButton({
  entryId,
  startTime,
  canEdit,
  isOpenEntry,
}: {
  entryId: string;
  startTime: string;
  canEdit: boolean;
  isOpenEntry: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  if (!canEdit || !isOpenEntry) return null;

  return (
    <ConfirmDialog
      label={saving ? "Cerrando..." : "Terminar ahora"}
      title="¿Confirmas cerrar esta hora con la hora actual?"
      disabled={saving}
      triggerClassName="btn-secondary px-2.5 py-1 text-xs"
      confirmLabel="Sí, terminar ahora"
      confirmLoadingLabel="Cerrando..."
      onConfirm={async () => {
        if (saving) return;
        const now = currentLocalTime();
        if (now <= startTime) {
          toast.error(`La hora actual (${now}) debe ser posterior al inicio (${startTime}).`);
          return;
        }
        setSaving(true);
        const loadingToastId = toast.loading("Cerrando hora...");
        try {
          await completeTimeEntryNowAction({ id: entryId, endTime: now });
          toast.success(`Hora cerrada a las ${now}.`, { id: loadingToastId });
          router.refresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "No se pudo cerrar la hora.", { id: loadingToastId });
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}
