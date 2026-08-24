"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { SettingsModal } from "@/components/settings/settings-modal";
import { updateTimeEntriesBatchAction } from "@/app/time-entries/new/data-actions";

type BulkAction = "observations" | "category" | "owner";

export function TimeEntriesBulkActionsBar({
  selectedIds,
  selectedCount,
  owners,
  categories,
  canReassignOwner,
  canDelete,
  isBulkDeleting,
  onBulkDelete,
  onUpdated,
  onClearSelection,
}: {
  selectedIds: string[];
  selectedCount: number;
  owners: { id: string; name: string }[];
  categories: { code: string; label: string }[];
  canReassignOwner: boolean;
  canDelete: boolean;
  isBulkDeleting: boolean;
  onBulkDelete: () => void | Promise<void>;
  onUpdated: () => void | Promise<void>;
  onClearSelection: () => void;
}) {
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [bulkValue, setBulkValue] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const openBulkAction = (action: BulkAction) => {
    setBulkAction(action);
    if (action === "category") {
      setBulkValue(categories[0]?.code ?? "");
    } else if (action === "owner") {
      setBulkValue(owners[0]?.id ?? "");
    } else {
      setBulkValue("");
    }
  };

  const resetBulkModal = () => {
    setBulkAction(null);
    setBulkValue("");
  };

  const closeBulkAction = () => {
    if (isUpdating) return;
    resetBulkModal();
  };

  const handleBulkUpdate = async () => {
    if (!bulkAction || isUpdating) return;
    if (bulkAction !== "observations" && bulkValue === "") return;

    setIsUpdating(true);
    try {
      const payload =
        bulkAction === "observations"
          ? { ids: selectedIds, observations: bulkValue }
          : bulkAction === "category"
            ? { ids: selectedIds, category: bulkValue }
            : { ids: selectedIds, userId: bulkValue };

      const result = await updateTimeEntriesBatchAction(payload);
      if (result.updatedCount === 0) {
        toast.error(result.errors[0]?.message ?? "No se pudo actualizar ninguna hora.");
        return;
      }

      const label =
        bulkAction === "observations" ? "observaciones" : bulkAction === "category" ? "categoría" : "encargado";
      if (result.failedCount > 0) {
        toast.warning(
          `${result.updatedCount} hora(s) actualizada(s); ${result.failedCount} no se pudieron cambiar de ${label}.`,
        );
      } else {
        toast.success(`${result.updatedCount} hora(s) actualizada(s) (${label}).`);
      }

      resetBulkModal();
      onClearSelection();
      await onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo completar la acción por lote.");
    } finally {
      setIsUpdating(false);
    }
  };

  const modalTitle =
    bulkAction === "observations"
      ? "Observaciones por lote"
      : bulkAction === "category"
        ? "Cambiar categoría por lote"
        : bulkAction === "owner"
          ? "Reasignar encargado por lote"
          : "";

  const modalDescription =
    bulkAction === "observations"
      ? `Reemplaza las observaciones de ${selectedCount} hora${selectedCount !== 1 ? "s" : ""} seleccionada${selectedCount !== 1 ? "s" : ""}.`
      : bulkAction === "category"
        ? `Aplica una nueva categoría a ${selectedCount} hora${selectedCount !== 1 ? "s" : ""} seleccionada${selectedCount !== 1 ? "s" : ""}.`
        : bulkAction === "owner"
          ? `Asigna un nuevo encargado a ${selectedCount} hora${selectedCount !== 1 ? "s" : ""} seleccionada${selectedCount !== 1 ? "s" : ""}.`
          : "";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-border bg-muted/30 px-4 py-2">
        <span className="text-sm font-medium text-muted-foreground">
          {selectedCount} hora{selectedCount !== 1 ? "s" : ""} seleccionada{selectedCount !== 1 ? "s" : ""}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => openBulkAction("observations")}>
            Observaciones
          </button>
          {categories.length > 0 ? (
            <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => openBulkAction("category")}>
              Categoría
            </button>
          ) : null}
          {canReassignOwner && owners.length > 0 ? (
            <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => openBulkAction("owner")}>
              Encargado
            </button>
          ) : null}
          {canDelete ? (
            <ConfirmDialog
              label="Eliminar seleccionados"
              title={`¿Estás seguro de que deseas eliminar las ${selectedCount} horas seleccionadas?`}
              triggerClassName="btn-danger inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
              confirmLabel="Eliminar"
              confirmLoadingLabel="Eliminando..."
              disabled={isBulkDeleting}
              onConfirm={onBulkDelete}
            />
          ) : null}
          <button type="button" className="btn-secondary py-1.5 text-xs" onClick={onClearSelection}>
            Limpiar selección
          </button>
        </div>
      </div>

      {bulkAction ? (
        <SettingsModal open={true} onClose={closeBulkAction} title={modalTitle} description={modalDescription}>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleBulkUpdate();
            }}
          >
            {bulkAction === "observations" ? (
              <label className="grid gap-1.5">
                <span className="field-label">Observaciones</span>
                <textarea
                  className="field-control min-h-[120px] w-full"
                  value={bulkValue}
                  onChange={(event) => setBulkValue(event.target.value)}
                  placeholder="Texto que reemplazará las observaciones de las horas seleccionadas"
                  disabled={isUpdating}
                />
                <span className="text-xs text-muted-foreground">
                  Se reemplaza el texto completo en todas las filas seleccionadas. Déjalo vacío para limpiar.
                </span>
              </label>
            ) : (
              <label className="grid gap-1.5">
                <span className="field-label">{bulkAction === "category" ? "Nueva categoría" : "Nuevo encargado"}</span>
                <select
                  className="field-control w-full"
                  value={bulkValue}
                  onChange={(event) => setBulkValue(event.target.value)}
                  required
                  disabled={isUpdating}
                >
                  {bulkAction === "category"
                    ? categories.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.label}
                        </option>
                      ))
                    : owners.map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.name}
                        </option>
                      ))}
                </select>
              </label>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                className="btn-primary py-2 text-sm"
                disabled={isUpdating || (bulkAction !== "observations" && bulkValue === "")}
              >
                {isUpdating ? (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground"
                      aria-hidden
                    />
                    Aplicando...
                  </span>
                ) : (
                  `Aplicar a ${selectedCount} hora${selectedCount !== 1 ? "s" : ""}`
                )}
              </button>
              <button type="button" className="btn-secondary py-2 text-sm" onClick={closeBulkAction} disabled={isUpdating}>
                Cancelar
              </button>
            </div>
          </form>
        </SettingsModal>
      ) : null}
    </>
  );
}
