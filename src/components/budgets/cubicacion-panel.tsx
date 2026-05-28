"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { RowActionMenu } from "@/components/common/row-action-menu";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { CubicacionFormModal } from "@/components/budgets/cubicacion-form-modal";
import { CubicacionBulkUploadModal } from "@/components/budgets/cubicacion-bulk-upload-modal";
import { calcCubicacionRow, calcCubicacionTotals, CUBICACION_DEFAULTS } from "@/lib/calculations/cubicacion";
import {
  createCubicacionItemAction,
  deleteCubicacionItemAction,
  deleteCubicacionItemsBatchAction,
  updateCubicacionItemAction,
} from "@/app/budgets/data-actions";
import type { CubicacionItem } from "@/types/domain";

interface RequirementOption {
  id: string;
  title: string;
}

interface CubicacionPanelProps {
  contractId: string;
  initialItems: CubicacionItem[];
  requirements: RequirementOption[];
  canWrite: boolean;
}

export function CubicacionPanel({ contractId, initialItems, requirements, canWrite }: CubicacionPanelProps) {
  const [items, setItems] = useState<CubicacionItem[]>(initialItems);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editItem, setEditItem] = useState<CubicacionItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CubicacionItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const selectedCount = selectedIds.size;

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (items.length === 0) return prev;
      if (prev.size === items.length) return new Set();
      return new Set(items.map((item) => item.id));
    });
  };

  const handleCreate = async (values: {
    activityName: string;
    requirementId: string | null;
    construccionHours: number;
    levantamientoPct: number;
    disenoPct: number;
    qaAjustesPct: number;
    puestaEnMarchaPct: number;
    seniorPct: number;
    ingeneroPct: number;
    juniorPct: number;
    directorHours: number;
    disenadorHours: number;
  }) => {
    const created = await createCubicacionItemAction({
      contractId,
      sortOrder: items.length + 1,
      ...values,
    });
    setItems((prev) => [...prev, created]);
    toast.success("Actividad agregada a la cubicación.");
  };

  const handleUpdate = async (values: typeof handleCreate extends (v: infer V) => unknown ? V : never) => {
    if (!editItem) return;
    const updated = await updateCubicacionItemAction(editItem.id, {
      ...values,
      currentRequirementId: editItem.requirementId,
    });
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    toast.success("Actividad actualizada.");
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    startTransition(async () => {
      try {
        await deleteCubicacionItemAction(targetId);
        setItems((prev) => prev.filter((item) => item.id !== targetId));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
        toast.success("Actividad eliminada.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al eliminar.");
      } finally {
        setDeleteTarget(null);
      }
    });
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    setIsBulkDeleting(true);
    try {
      const deletedCount = await deleteCubicacionItemsBatchAction(ids);
      setItems((prev) => prev.filter((item) => !selectedIds.has(item.id)));
      setSelectedIds(new Set());
      toast.success(`${deletedCount} actividad${deletedCount !== 1 ? "es" : ""} eliminada${deletedCount !== 1 ? "s" : ""}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar actividades.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const totals = calcCubicacionTotals(items);

  const colClass = "px-3 py-2.5 text-right tabular-nums text-sm text-foreground";
  const headClass = "px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

  const deleteDescription = useMemo(() => {
    if (!deleteTarget) return undefined;
    return `¿Estás seguro de eliminar «${deleteTarget.activityName}»? Esta acción no se puede deshacer.`;
  }, [deleteTarget]);

  return (
    <>
      <section className="surface-card p-[length:var(--density-inset-pad)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Cubicación</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Estimación de horas por actividad y distribución por perfil a partir de las horas de construcción.
            </p>
          </div>
          {canWrite && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setBulkOpen(true)} className="btn-secondary flex items-center gap-1.5 text-xs">
                <Upload className="h-3.5 w-3.5" aria-hidden />
                Carga masiva
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditItem(null);
                  setModalOpen(true);
                }}
                className="btn-primary flex items-center gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Agregar actividad
              </button>
            </div>
          )}
        </div>

        {canWrite && selectedCount > 0 ? (
          <div className="mb-4 flex items-center justify-between rounded-[2px] border border-border bg-muted/30 px-4 py-2">
            <span className="text-sm font-medium text-muted-foreground">
              {selectedCount} actividad{selectedCount !== 1 ? "es" : ""} seleccionada{selectedCount !== 1 ? "s" : ""}
            </span>
            <ConfirmDialog
              label="Eliminar seleccionadas"
              title={`¿Eliminar ${selectedCount} actividad${selectedCount !== 1 ? "es" : ""}?`}
              description="Esta acción no se puede deshacer."
              triggerClassName="rounded-[2px] border border-danger px-3 py-1.5 text-xs text-danger"
              confirmLabel="Eliminar"
              confirmLoadingLabel="Eliminando..."
              disabled={isBulkDeleting}
              onConfirm={handleBulkDelete}
            />
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[4px] border border-dashed border-border py-12 text-center">
            <p className="text-sm font-medium text-muted-foreground">Sin actividades cubicadas</p>
            <p className="text-xs text-muted-foreground/70">
              Agrega actividades para estimar las horas del contrato por fase y perfil.
            </p>
            {canWrite && (
              <button
                type="button"
                onClick={() => {
                  setEditItem(null);
                  setModalOpen(true);
                }}
                className="btn-secondary mt-2 text-xs"
              >
                + Agregar primera actividad
              </button>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1060px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {canWrite ? (
                    <th className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        className="rounded border-border text-primary focus:ring-primary"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Seleccionar todas las actividades"
                      />
                    </th>
                  ) : null}
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Actividad
                  </th>
                  <th className={headClass}>Constr.</th>
                  <th className={headClass}>Levant.</th>
                  <th className={headClass}>Diseño</th>
                  <th className={headClass}>QA</th>
                  <th className={headClass}>Puesta</th>
                  <th className={`${headClass} font-bold text-foreground`}>Total h</th>
                  <th className={headClass}>Senior</th>
                  <th className={headClass}>Ing.</th>
                  <th className={headClass}>Junior</th>
                  <th className={headClass}>Director</th>
                  <th className={headClass}>Diseñador</th>
                  {canWrite ? <th className="px-3 py-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const row = calcCubicacionRow(item);
                  const isDefault =
                    item.levantamientoPct === CUBICACION_DEFAULTS.levantamientoPct &&
                    item.disenoPct === CUBICACION_DEFAULTS.disenoPct &&
                    item.qaAjustesPct === CUBICACION_DEFAULTS.qaAjustesPct &&
                    item.puestaEnMarchaPct === CUBICACION_DEFAULTS.puestaEnMarchaPct;
                  return (
                    <tr key={item.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                      {canWrite ? (
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            className="rounded border-border text-primary focus:ring-primary"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleOne(item.id)}
                            aria-label={`Seleccionar ${item.activityName}`}
                          />
                        </td>
                      ) : null}
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          {item.requirementId ? (
                            <Link
                              href={`/requirements/id/${item.requirementId}`}
                              className="text-sm font-medium leading-snug text-primary hover:underline"
                            >
                              {item.activityName}
                            </Link>
                          ) : (
                            <span className="text-sm font-medium leading-snug text-foreground">{item.activityName}</span>
                          )}
                          {!isDefault ? (
                            <span className="text-[10px] font-medium text-amber-500">% personalizados</span>
                          ) : null}
                        </div>
                      </td>
                      <td className={colClass}>{item.construccionHours.toFixed(2)} h</td>
                      <td className={colClass}>{row.levantamiento.toFixed(2)}</td>
                      <td className={colClass}>{row.diseno.toFixed(2)}</td>
                      <td className={colClass}>{row.qaAjustes.toFixed(2)}</td>
                      <td className={colClass}>{row.puestaEnMarcha.toFixed(2)}</td>
                      <td className={`${colClass} font-semibold`}>{row.totalHoras.toFixed(2)} h</td>
                      <td className={colClass}>{row.seniorHoras.toFixed(2)}</td>
                      <td className={colClass}>{row.ingenieroHoras.toFixed(2)}</td>
                      <td className={colClass}>{row.juniorHoras.toFixed(2)}</td>
                      <td className={colClass}>{row.directorHoras.toFixed(2)}</td>
                      <td className={colClass}>{row.disenadorHoras.toFixed(2)}</td>
                      {canWrite ? (
                        <td className="px-3 py-2.5">
                          <RowActionMenu
                            items={[
                              {
                                label: "Editar",
                                onClick: () => {
                                  setEditItem(item);
                                  setModalOpen(true);
                                },
                              },
                              {
                                label: "Eliminar",
                                danger: true,
                                onClick: () => setDeleteTarget(item),
                              },
                            ]}
                          />
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/20">
                  {canWrite ? <td /> : null}
                  <td className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">TOTALES</td>
                  <td className={`${colClass} font-semibold`}>{totals.construccionTotal.toFixed(2)} h</td>
                  <td className={colClass} />
                  <td className={colClass} />
                  <td className={colClass} />
                  <td className={colClass} />
                  <td className={`${colClass} font-bold text-foreground`}>{totals.totalHoras.toFixed(2)} h</td>
                  <td className={`${colClass} font-semibold`}>{totals.seniorHoras.toFixed(2)}</td>
                  <td className={`${colClass} font-semibold`}>{totals.ingenieroHoras.toFixed(2)}</td>
                  <td className={`${colClass} font-semibold`}>{totals.juniorHoras.toFixed(2)}</td>
                  <td className={`${colClass} font-semibold`}>{totals.directorHoras.toFixed(2)}</td>
                  <td className={`${colClass} font-semibold`}>{totals.disenadorHoras.toFixed(2)}</td>
                  {canWrite ? <td /> : null}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <CubicacionFormModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditItem(null);
          }}
          onSave={editItem ? handleUpdate : handleCreate}
          initialValues={editItem ?? undefined}
          requirements={requirements}
          title={editItem ? "Editar actividad" : "Nueva actividad"}
        />

        {bulkOpen ? (
          <CubicacionBulkUploadModal
            contractId={contractId}
            onClose={() => setBulkOpen(false)}
            onImported={(newItems) => {
              setItems((prev) => [...prev, ...newItems]);
              setBulkOpen(false);
            }}
          />
        ) : null}
      </section>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        label="Eliminar"
        title="Eliminar actividad"
        description={deleteDescription}
        confirmLabel="Eliminar"
        confirmLoadingLabel="Eliminando..."
        disabled={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
