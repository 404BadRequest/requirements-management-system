"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateRequirementAction } from "@/app/requirements/data-actions";
import { SettingsModal } from "@/components/settings/settings-modal";

export function RequirementOwnerReassign({
  requirementId,
  requirementTitle,
  currentOwnerId,
  owners,
  canWrite,
}: {
  requirementId: string;
  requirementTitle: string;
  currentOwnerId: string;
  owners: { id: string; name: string }[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ownerId, setOwnerId] = useState(currentOwnerId);
  const [saving, setSaving] = useState(false);

  if (!canWrite) {
    const current = owners.find((o) => o.id === currentOwnerId);
    return (
      <p className="text-sm font-medium text-foreground">{current?.name ?? currentOwnerId}</p>
    );
  }

  return (
    <>
      <div className="mt-2 flex items-center gap-2">
        <p className="text-sm font-medium text-foreground">{owners.find((o) => o.id === currentOwnerId)?.name ?? currentOwnerId}</p>
        <button
          type="button"
          className="btn-secondary px-2.5 py-1 text-xs"
          onClick={() => {
            setOwnerId(currentOwnerId);
            setOpen(true);
          }}
        >
          Reasignar
        </button>
      </div>
      <SettingsModal
        open={open}
        onClose={() => {
          if (!saving) setOpen(false);
        }}
        title="Reasignar requerimiento"
        description={`Selecciona quién quedará como responsable de «${requirementTitle}».`}
      >
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!ownerId || ownerId === currentOwnerId) {
              setOpen(false);
              return;
            }
            void (async () => {
              setSaving(true);
              try {
                await updateRequirementAction(requirementId, { ownerId });
                toast.success("Responsable actualizado");
                setOpen(false);
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "No se pudo reasignar.");
              } finally {
                setSaving(false);
              }
            })();
          }}
        >
          <label className="grid gap-1.5">
            <span className="field-label">Nuevo responsable</span>
            <select
              className="field-control w-full"
              value={ownerId}
              onChange={(event) => setOwnerId(event.target.value)}
              disabled={saving}
              required
            >
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="submit" className="btn-primary py-2 text-sm" disabled={saving}>
              {saving ? "Guardando..." : "Guardar reasignación"}
            </button>
            <button type="button" className="btn-secondary py-2 text-sm" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </button>
          </div>
        </form>
      </SettingsModal>
    </>
  );
}
