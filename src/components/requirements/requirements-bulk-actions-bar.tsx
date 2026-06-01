"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { SettingsModal } from "@/components/settings/settings-modal";
import { updateRequirementsBatchAction } from "@/app/requirements/data-actions";

type BulkAction = "status" | "owner" | "priority" | "contract";

const NO_CONTRACT_VALUE = "__none__";

export function RequirementsBulkActionsBar({
  selectedIds,
  selectedCount,
  owners,
  contracts,
  selectedRequirements,
  statusOptions,
  priorityOptions,
  canDelete,
  canReassignOwner,
  canChangeStatus,
  canManageRequirement,
  isBulkDeleting,
  onBulkDelete,
  onUpdated,
  onClearSelection,
}: {
  selectedIds: string[];
  selectedCount: number;
  owners: { id: string; name: string }[];
  contracts: { id: string; clientId: string; label: string }[];
  selectedRequirements: Array<{ id: string; clientId: string; title: string }>;
  statusOptions: { code: string; label: string }[];
  priorityOptions: { code: string; label: string }[];
  canDelete: boolean;
  canReassignOwner: boolean;
  canChangeStatus: boolean;
  canManageRequirement: boolean;
  isBulkDeleting: boolean;
  onBulkDelete: () => void | Promise<void>;
  onUpdated: () => void | Promise<void>;
  onClearSelection: () => void;
}) {
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [bulkValue, setBulkValue] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const selectedClientIds = useMemo(
    () => new Set(selectedRequirements.map((requirement) => requirement.clientId)),
    [selectedRequirements],
  );

  const compatibleContracts = useMemo(
    () => contracts.filter((contract) => selectedClientIds.has(contract.clientId)),
    [contracts, selectedClientIds],
  );

  const openBulkAction = (action: BulkAction) => {
    setBulkAction(action);
    if (action === "status") {
      setBulkValue(statusOptions[0]?.code ?? "");
    } else if (action === "owner") {
      setBulkValue(owners[0]?.id ?? "");
    } else if (action === "priority") {
      setBulkValue(priorityOptions[0]?.code ?? "");
    } else {
      setBulkValue(compatibleContracts[0]?.id ?? NO_CONTRACT_VALUE);
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
    if (!bulkAction || bulkValue === "" || isUpdating) return;

    setIsUpdating(true);
    try {
      const payload =
        bulkAction === "status"
          ? { ids: selectedIds, status: bulkValue }
          : bulkAction === "owner"
            ? { ids: selectedIds, ownerId: bulkValue }
            : bulkAction === "priority"
              ? { ids: selectedIds, priority: bulkValue }
              : {
                  ids: selectedIds,
                  contractId: bulkValue === NO_CONTRACT_VALUE ? null : bulkValue,
                };

      const result = await updateRequirementsBatchAction(payload);
      if (result.updatedCount === 0) {
        toast.error(result.errors[0]?.message ?? "No se pudo actualizar ningún requerimiento.");
        return;
      }

      const label =
        bulkAction === "status"
          ? "estado"
          : bulkAction === "owner"
            ? "responsable"
            : bulkAction === "priority"
              ? "prioridad"
              : "contrato";
      if (result.failedCount > 0) {
        toast.warning(
          `${result.updatedCount} requerimiento(s) actualizado(s); ${result.failedCount} no se pudieron cambiar de ${label}.`,
        );
      } else {
        toast.success(`${result.updatedCount} requerimiento(s) actualizado(s) (${label}).`);
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
    bulkAction === "status"
      ? "Cambiar estado por lote"
      : bulkAction === "owner"
        ? "Reasignar responsable por lote"
        : bulkAction === "priority"
          ? "Cambiar prioridad por lote"
          : bulkAction === "contract"
            ? "Asignar contrato por lote"
            : "";

  const modalDescription =
    bulkAction === "status"
      ? `Aplica un nuevo estado a ${selectedCount} requerimiento${selectedCount !== 1 ? "s" : ""} seleccionado${selectedCount !== 1 ? "s" : ""}.`
      : bulkAction === "owner"
        ? `Asigna un nuevo responsable a ${selectedCount} requerimiento${selectedCount !== 1 ? "s" : ""} seleccionado${selectedCount !== 1 ? "s" : ""}.`
        : bulkAction === "priority"
          ? `Aplica una nueva prioridad a ${selectedCount} requerimiento${selectedCount !== 1 ? "s" : ""} seleccionado${selectedCount !== 1 ? "s" : ""}.`
          : bulkAction === "contract"
            ? `Asigna un contrato compatible al cliente de cada requerimiento seleccionado (${selectedCount}).`
            : "";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-border bg-muted/30 px-4 py-2">
        <span className="text-sm font-medium text-muted-foreground">
          {selectedCount} requerimiento{selectedCount !== 1 ? "s" : ""} seleccionado{selectedCount !== 1 ? "s" : ""}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {canChangeStatus ? (
            <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => openBulkAction("status")}>
              Cambiar estado
            </button>
          ) : null}
          {canReassignOwner ? (
            <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => openBulkAction("owner")}>
              Reasignar responsable
            </button>
          ) : null}
          {canManageRequirement ? (
            <>
              <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => openBulkAction("contract")}>
                Asignar contrato
              </button>
              <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => openBulkAction("priority")}>
                Cambiar prioridad
              </button>
            </>
          ) : null}
          {canDelete ? (
            <ConfirmDialog
              label="Eliminar seleccionados"
              title={`¿Eliminar ${selectedCount} requerimiento${selectedCount !== 1 ? "s" : ""}?`}
              description="Esta acción no se puede deshacer."
              triggerClassName="rounded-[2px] border border-danger px-3 py-1.5 text-xs text-danger"
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
            <label className="grid gap-1.5">
              <span className="field-label">
                {bulkAction === "status"
                  ? "Nuevo estado"
                  : bulkAction === "owner"
                    ? "Nuevo responsable"
                    : bulkAction === "priority"
                      ? "Nueva prioridad"
                      : "Contrato"}
              </span>
              <select
                className="field-control w-full"
                value={bulkValue}
                onChange={(event) => setBulkValue(event.target.value)}
                required
                disabled={isUpdating}
              >
                {bulkAction === "status"
                  ? statusOptions.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.label}
                      </option>
                    ))
                  : bulkAction === "owner"
                    ? owners.map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.name}
                        </option>
                      ))
                    : bulkAction === "priority"
                      ? priorityOptions.map((opt) => (
                          <option key={opt.code} value={opt.code}>
                            {opt.label}
                          </option>
                        ))
                      : (
                          <>
                            <option value={NO_CONTRACT_VALUE}>Sin contrato específico</option>
                            {compatibleContracts.map((contract) => (
                              <option key={contract.id} value={contract.id}>
                                {contract.label}
                              </option>
                            ))}
                          </>
                        )}
              </select>
            </label>
            {bulkAction === "contract" && selectedClientIds.size > 1 ? (
              <p className="text-xs text-muted-foreground">
                Hay requerimientos de varios clientes; solo se listan contratos compatibles con cada uno. Los que no
                coincidan se omitirán con un aviso.
              </p>
            ) : null}
            {bulkAction === "contract" && compatibleContracts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No hay contratos activos para el cliente de los requerimientos seleccionados.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                className="btn-primary py-2 text-sm"
                disabled={isUpdating || bulkValue === "" || (bulkAction === "contract" && compatibleContracts.length === 0 && bulkValue !== NO_CONTRACT_VALUE)}
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
                  `Aplicar a ${selectedCount} requerimiento${selectedCount !== 1 ? "s" : ""}`
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
