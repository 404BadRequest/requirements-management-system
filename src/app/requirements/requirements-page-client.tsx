"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { SyncStatusBanner } from "@/components/common/sync-status-banner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { RowActionMenu } from "@/components/common/row-action-menu";
import { scheduleUndoableAction } from "@/components/common/undoable-action";
import { PriorityBadge, StatusBadge } from "@/components/common/badges";
import { RequirementForm } from "@/components/forms/requirement-form";
import { RequirementEditModal } from "@/components/requirements/requirement-edit-modal";
import { RequirementsBulkUploadModal } from "@/components/requirements/requirements-bulk-upload-modal";
import { SettingsModal } from "@/components/settings/settings-modal";
import {
  createRequirementAction,
  deleteRequirementAction,
  loadRequirementsPageData,
  updateRequirementAction,
} from "@/app/requirements/data-actions";
import { requirementDetailPath } from "@/lib/routes/requirements";
import { formatStatusLabel } from "@/lib/formatting/status-label";
import type { Client, Requirement, SettingsCatalogEntry } from "@/types/domain";

export type RequirementsPageClientProps = {
  canWrite: boolean;
  canDelete: boolean;
  canExport: boolean;
  canReassignOwner: boolean;
  canManageRequirement: boolean;
  canChangeStatus?: boolean;
  canViewSettings?: boolean;
  /** Abre el modal de alta al cargar (p. ej. `?nueva=1`). */
  autoOpenNewModal?: boolean;
  /** Filtro por cliente (query `clientId`). */
  clientId?: string;
  /** ID del usuario del directorio de la sesión activa (para filtrar acciones propias). */
  currentDirectoryUserId?: string;
};

function NewRequirementModalBody({
  formKey,
  canShowForm,
  activeClients,
  statusOpts,
  priorityOpts,
  owners,
  contracts,
  onCreated,
}: {
  formKey: number;
  canShowForm: boolean;
  activeClients: Client[];
  statusOpts: { code: string; label: string }[];
  priorityOpts: { code: string; label: string }[];
  owners: { id: string; name: string }[];
  contracts: { id: string; clientId: string; label: string }[];
  onCreated: () => void;
}) {
  if (!canShowForm) {
    return (
      <EmptyState
        title="Faltan datos de configuración"
        description="Define al menos un cliente activo y entradas en catálogo de estado y prioridad."
      />
    );
  }
  return (
    <RequirementForm
      key={formKey}
      clients={activeClients.map((c) => ({ id: c.id, name: c.name }))}
      statusOptions={statusOpts}
      priorityOptions={priorityOpts}
      owners={owners}
      contracts={contracts}
      compact
      onSubmit={async (values) => {
        try {
          await createRequirementAction(values);
          toast.success("Requerimiento creado");
          onCreated();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "No se pudo crear el requerimiento.");
        }
      }}
    />
  );
}

export function RequirementsPageClient({
  canWrite,
  canDelete,
  canExport,
  canReassignOwner,
  canManageRequirement,
  canChangeStatus = false,
  canViewSettings = false,
  autoOpenNewModal = false,
  clientId = "",
  currentDirectoryUserId = "",
}: RequirementsPageClientProps) {
  const router = useRouter();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [owners, setOwners] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [statusCatalog, setStatusCatalog] = useState<SettingsCatalogEntry[]>([]);
  const [priorityCatalog, setPriorityCatalog] = useState<SettingsCatalogEntry[]>([]);
  const [contracts, setContracts] = useState<{ id: string; clientId: string; label: string }[]>([]);
  const [newModalOpen, setNewModalOpen]   = useState(Boolean(autoOpenNewModal && canWrite));
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [newFormKey, setNewFormKey] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState<Requirement | null>(null);
  const [reassignOwnerId, setReassignOwnerId] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [editTarget, setEditTarget] = useState<Requirement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Requirement | null>(null);
  const [statusTarget, setStatusTarget] = useState<Requirement | null>(null);
  const [statusValue, setStatusValue] = useState("");
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  const reload = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await loadRequirementsPageData();
      setRequirements(data.requirements);
      setOwners(data.users);
      setClients(data.clients);
      setStatusCatalog(data.statusCatalog);
      setPriorityCatalog(data.priorityCatalog);
      setContracts(data.contracts);
      setLastSyncedAt(new Date().toISOString());
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudieron cargar los requerimientos.";
      setListError(message);
      toast.error(message);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!autoOpenNewModal || !canWrite) return;
    router.replace("/requirements", { scroll: false });
  }, [autoOpenNewModal, canWrite, router]);

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const ownerById = useMemo(() => new Map(owners.map((o) => [o.id, o.name])), [owners]);

  const clientIdTrim = clientId.trim();
  const filteredRequirements = useMemo(() => {
    if (!clientIdTrim) return requirements;
    return requirements.filter((r) => r.clientId === clientIdTrim);
  }, [requirements, clientIdTrim]);

  const exportRequirementsHref =
    clientIdTrim !== ""
      ? `/api/export/requirements?clientId=${encodeURIComponent(clientIdTrim)}`
      : "/api/export/requirements";
  const kanbanHref =
    clientIdTrim !== ""
      ? `/requirements/kanban?clientId=${encodeURIComponent(clientIdTrim)}`
      : "/requirements/kanban";

  const statusOpts = useMemo(
    () =>
      statusCatalog
        .filter((s) => s.active)
        .map((s) => ({ code: s.code, label: formatStatusLabel(s.code, s.label), color: s.color })),
    [statusCatalog],
  );
  const priorityOpts = useMemo(
    () => priorityCatalog.filter((p) => p.active).map((p) => ({ code: p.code, label: p.label, color: p.color })),
    [priorityCatalog],
  );
  const activeClients = useMemo(() => clients.filter((c) => c.active), [clients]);
  const canShowForm = statusOpts.length > 0 && priorityOpts.length > 0 && activeClients.length > 0;

  const columns = useMemo<ColumnDef<Requirement>[]>(() => {
    const base: ColumnDef<Requirement>[] = [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <Link href={requirementDetailPath(row.original.id)} className="font-medium text-primary hover:underline">
            {row.original.id}
          </Link>
        ),
      },
      {
        accessorKey: "clientId",
        header: "Cliente",
        cell: ({ row }) => clientById.get(row.original.clientId)?.name ?? row.original.clientId,
      },
      {
        accessorKey: "ownerId",
        header: "Responsable",
        cell: ({ row }) => (
          <span className="inline-flex rounded-[2px] border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
            {ownerById.get(row.original.ownerId) ?? row.original.ownerId}
          </span>
        ),
      },
      {
        accessorKey: "title",
        header: "Título",
        cell: ({ row }) => row.original.title,
      },
      {
        accessorKey: "priority",
        header: "Prioridad",
        cell: ({ row }) => {
          const opt = priorityOpts.find((p) => p.code === row.original.priority);
          return <PriorityBadge priority={row.original.priority} label={opt?.label} color={opt?.color} />;
        },
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => {
          const opt = statusOpts.find((s) => s.code === row.original.status);
          return <StatusBadge status={row.original.status} label={opt?.label} color={opt?.color} />;
        },
      },
    ];
    if (!canWrite && !canDelete) return base;
    return [
      ...base,
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => {
          const isOwn = row.original.ownerId === currentDirectoryUserId;
          const items = [
            ...(canReassignOwner
              ? [{
                  label: "Reasignar",
                  onClick: () => {
                    setReassignTarget(row.original);
                    setReassignOwnerId(row.original.ownerId);
                  },
                }]
              : []),
            ...(canChangeStatus && (canManageRequirement || isOwn)
              ? [{
                  label: "Cambiar estado",
                  onClick: () => {
                    setStatusTarget(row.original);
                    setStatusValue(row.original.status);
                  },
                }]
              : []),
            ...(canWrite && canManageRequirement
              ? [{ label: "Editar", onClick: () => setEditTarget(row.original) }]
              : []),
            ...(canDelete
              ? [{ label: "Eliminar", danger: true, onClick: () => setDeleteTarget(row.original) }]
              : []),
          ];
          if (items.length === 0) return null;
          return <RowActionMenu items={items} />;
        },
      },
    ];
  }, [canWrite, canDelete, canReassignOwner, canManageRequirement, canChangeStatus, currentDirectoryUserId, clientById, ownerById, statusOpts]);

  const openNewRequirementModal = () => {
    setNewFormKey((k) => k + 1);
    setNewModalOpen(true);
  };

  const closeNewRequirementModal = () => {
    setNewModalOpen(false);
    if (typeof window !== "undefined" && window.location.search.includes("nueva=")) {
      router.replace("/requirements", { scroll: false });
    }
  };

  return (
    <>
      <PageHeader
        title="Requerimientos"
        description="Los catálogos de cliente, estado y prioridad se configuran en Configuración."
        actions={
          <div className="flex flex-wrap gap-2">
            {canViewSettings ? (
              <Link href="/settings/clients" className="btn-secondary py-2 text-sm">
                Configurar datos
              </Link>
            ) : null}
            {canWrite ? (
              <>
                <button
                  type="button"
                  className="btn-secondary py-2 text-sm inline-flex items-center gap-1.5"
                  onClick={() => setBulkModalOpen(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Carga masiva
                </button>
                <button type="button" className="btn-secondary py-2 text-sm" onClick={() => openNewRequirementModal()}>
                  Nuevo requerimiento
                </button>
              </>
            ) : null}
            <Link href={kanbanHref} className="btn-primary py-2 text-sm no-underline">
              Ver Kanban
            </Link>
            {canExport ? (
              <a href={exportRequirementsHref} className="btn-secondary inline-flex py-2 text-sm no-underline">
                Exportar CSV
              </a>
            ) : null}
          </div>
        }
      />

      <SyncStatusBanner
        loading={listLoading && requirements.length > 0}
        error={listError}
        lastSyncedAt={lastSyncedAt}
        onRetry={() => {
          void reload();
        }}
        loadingLabel="Actualizando requerimientos…"
      />

      {canWrite ? (
        <SettingsModal
          open={newModalOpen}
          onClose={closeNewRequirementModal}
          title="Nuevo requerimiento"
          description="Completa los datos; el identificador técnico se genera al guardar."
          dialogClassName="max-w-3xl max-h-[94vh] lg:max-h-none lg:overflow-visible"
          bodyClassName="px-4 py-4 sm:px-5 sm:py-4"
        >
          <NewRequirementModalBody
            formKey={newFormKey}
            canShowForm={canShowForm}
            activeClients={activeClients}
            statusOpts={statusOpts}
            priorityOpts={priorityOpts}
            owners={owners}
            contracts={contracts}
            onCreated={() => {
              void reload();
              closeNewRequirementModal();
            }}
          />
        </SettingsModal>
      ) : null}

      {canReassignOwner ? (
        <SettingsModal
          open={Boolean(reassignTarget)}
          onClose={() => setReassignTarget(null)}
          title="Reasignar requerimiento"
          description={
            reassignTarget
              ? `Selecciona quién quedará como responsable de «${reassignTarget.title}».`
              : "Selecciona un nuevo responsable."
          }
        >
          {owners.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay usuarios disponibles para asignar.</p>
          ) : (
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!reassignTarget || !reassignOwnerId || isReassigning) return;
                void (async () => {
                  setIsReassigning(true);
                  try {
                    await updateRequirementAction(reassignTarget.id, { ownerId: reassignOwnerId });
                    toast.success("Responsable actualizado");
                    setReassignTarget(null);
                    await reload();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "No se pudo reasignar.");
                  } finally {
                    setIsReassigning(false);
                  }
                })();
              }}
            >
              <label className="grid gap-1.5">
                <span className="field-label">Nuevo responsable</span>
                <select
                  className="field-control w-full"
                  value={reassignOwnerId}
                  onChange={(event) => setReassignOwnerId(event.target.value)}
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
                <button type="submit" className="btn-primary py-2 text-sm" disabled={isReassigning}>
                  {isReassigning ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" aria-hidden />
                      Guardando...
                    </span>
                  ) : (
                    "Guardar reasignación"
                  )}
                </button>
                <button type="button" className="btn-secondary py-2 text-sm" onClick={() => setReassignTarget(null)} disabled={isReassigning}>
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </SettingsModal>
      ) : null}

      {/* Modal de cambio de estado */}
      {canChangeStatus && statusTarget ? (
        <SettingsModal
          open={true}
          onClose={() => setStatusTarget(null)}
          title="Cambiar estado"
          description={
            statusTarget
              ? `Selecciona el nuevo estado para «${statusTarget.title}».`
              : "Selecciona un nuevo estado."
          }
        >
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!statusTarget || !statusValue || isSavingStatus) return;
              void (async () => {
                setIsSavingStatus(true);
                try {
                  await updateRequirementAction(statusTarget.id, { status: statusValue });
                  toast.success("Estado actualizado");
                  setStatusTarget(null);
                  await reload();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "No se pudo actualizar el estado.");
                } finally {
                  setIsSavingStatus(false);
                }
              })();
            }}
          >
            <label className="grid gap-1.5">
              <span className="field-label">Nuevo estado</span>
              <select
                className="field-control w-full"
                value={statusValue}
                onChange={(event) => setStatusValue(event.target.value)}
                required
              >
                {statusOpts.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" className="btn-primary py-2 text-sm" disabled={isSavingStatus}>
                {isSavingStatus ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" aria-hidden />
                    Guardando...
                  </span>
                ) : (
                  "Guardar estado"
                )}
              </button>
              <button type="button" className="btn-secondary py-2 text-sm" onClick={() => setStatusTarget(null)} disabled={isSavingStatus}>
                Cancelar
              </button>
            </div>
          </form>
        </SettingsModal>
      ) : null}

      {/* Bulk upload modal */}
      {canWrite && bulkModalOpen && (
        <RequirementsBulkUploadModal
          clients={activeClients.map((c) => ({ id: c.id, name: c.name }))}
          contracts={contracts}
          onClose={() => setBulkModalOpen(false)}
          onImported={(newReqs) => {
            setRequirements((prev) => [...prev, ...newReqs]);
            setBulkModalOpen(false);
            toast.success(`${newReqs.length} requerimiento${newReqs.length !== 1 ? "s" : ""} importado${newReqs.length !== 1 ? "s" : ""} correctamente.`);
          }}
        />
      )}

      {/* Page-level edit modal — controlled by editTarget state */}
      {canWrite && editTarget ? (
        <RequirementEditModal
          key={editTarget.id}
          requirement={editTarget}
          clients={activeClients.map((c) => ({ id: c.id, name: c.name }))}
          statusOptions={statusOpts}
          priorityOptions={priorityOpts}
          owners={owners}
          contracts={contracts}
          canManageRequirement={canManageRequirement}
          open={true}
          onOpenChange={(v) => { if (!v) setEditTarget(null); }}
          onUpdated={reload}
        />
      ) : null}

      {/* Page-level delete confirm — controlled by deleteTarget state */}
      {canDelete && deleteTarget ? (
        <ConfirmDialog
          label="Eliminar"
          title={`¿Eliminar «${deleteTarget.title}»?`}
          open={true}
          onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
          onConfirm={() => {
            const targetId = deleteTarget.id;
            setDeleteTarget(null);
            try {
              scheduleUndoableAction({
                pendingMessage: "Requerimiento marcado para eliminar.",
                successMessage: "Requerimiento eliminado.",
                errorMessage: "No se pudo eliminar el requerimiento.",
                onCommit: async () => {
                  await deleteRequirementAction(targetId);
                  await reload();
                },
              });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "No se pudo eliminar.");
            }
          }}
        />
      ) : null}

      <form
        className="surface-card mb-4 flex flex-wrap items-end gap-4 p-[length:var(--density-inset-pad)]"
        action="/requirements"
        method="get"
      >
        <div className="flex min-w-[12rem] flex-col gap-2">
          <label htmlFor="req-client" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cliente
          </label>
          <select id="req-client" name="clientId" defaultValue={clientId} className="field-control w-full max-w-md">
            <option value="">Todos los clientes</option>
            {activeClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Aplicar filtro
        </button>
      </form>

      {listLoading ? (
        <div
          className="skeleton-shimmer h-72 rounded-[2px] border border-border"
          aria-busy
          aria-label="Cargando requerimientos"
        />
      ) : requirements.length === 0 ? (
        <EmptyState
          title="Sin requerimientos"
          description="Crea tu primer requerimiento para comenzar."
          action={
            canWrite ? (
              <button type="button" className="btn-primary py-2 text-sm" onClick={() => openNewRequirementModal()}>
                Crear requerimiento
              </button>
            ) : (
              <a href="/settings/clients" className="btn-secondary py-2 text-sm no-underline">
                Revisar configuración
              </a>
            )
          }
        />
      ) : filteredRequirements.length === 0 ? (
        <EmptyState
          title="Sin requerimientos en este cliente"
          description="Prueba otro cliente o quita el filtro para ver todos."
          action={
            <a href="/requirements?clientId=" className="btn-secondary py-2 text-sm no-underline">
              Quitar filtro
            </a>
          }
        />
      ) : (
        <DataTable
          data={filteredRequirements}
          columns={columns}
          pageSize={10}
          globalFilterPlaceholder="Buscar por ID, cliente, título, estado…"
        />
      )}
    </>
  );
}
