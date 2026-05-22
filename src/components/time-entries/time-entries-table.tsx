"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { DataTable } from "@/components/common/data-table";
import { TimeEntryEditModal } from "@/components/time-entries/time-entry-edit-modal";
import { TimeEntryCompleteNowButton } from "@/components/time-entries/time-entry-complete-now-button";
import { TimeEntryDeleteButton } from "@/components/time-entries/time-entry-delete-button";
import { deleteTimeEntriesBatchAction } from "@/app/time-entries/new/data-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { scheduleUndoableAction } from "@/components/common/undoable-action";
import type { TimeEntry } from "@/types/domain";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type TimeEntryRow = {
  id: string;
  date: string;
  userName: string;
  canEdit?: boolean;
  canDelete?: boolean;
  entry?: TimeEntry;
  category: string;
  durationMinutes: number;
  durationLabel: string;
  clientLabel: string;
  contractStatus: string;
  openEndWarning?: boolean;
};

export function TimeEntriesTable({
  rows,
  users,
  clients,
  requirements,
  contracts = [],
  contractProfiles = [],
  categories,
  canPickAnyOwner,
}: {
  rows: TimeEntryRow[];
  users: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  requirements: { id: string; title: string; clientId: string }[];
  contracts?: { id: string; clientId: string; label: string }[];
  contractProfiles?: { id: string; label: string }[];
  categories: { code: string; label: string }[];
  canPickAnyOwner: boolean;
}) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBulkDelete = async () => {
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length === 0) return;

    setIsDeleting(true);
    
    try {
      scheduleUndoableAction({
        pendingMessage: `${selectedIds.length} horas marcadas para eliminar.`,
        successMessage: `${selectedIds.length} horas eliminadas.`,
        errorMessage: "No se pudieron eliminar las horas.",
        onCommit: async () => {
          await deleteTimeEntriesBatchAction(selectedIds);
          setRowSelection({});
          // router.refresh() no es estrictamente necesario si deleteTimeEntriesBatchAction llama a revalidatePath, pero es buena práctica
        },
      });
      // Limpiamos la selección inmediatamente para que la UI responda rápido
      setRowSelection({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar horas.");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = useMemo<ColumnDef<TimeEntryRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            className="rounded border-border text-primary focus:ring-primary"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            aria-label="Seleccionar todas las filas"
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center">
            <input
              type="checkbox"
              className="rounded border-border text-primary focus:ring-primary"
              checked={row.getIsSelected()}
              disabled={!row.original.canDelete}
              onChange={row.getToggleSelectedHandler()}
              aria-label={`Seleccionar fila ${row.original.id}`}
            />
          </div>
        ),
        enableSorting: false,
        enableGlobalFilter: false,
      },
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <Link href={`/time-entries/${row.original.id}`} className="font-medium text-primary hover:underline">
            {row.original.id}
          </Link>
        ),
      },
      { accessorKey: "date", header: "Fecha" },
      { accessorKey: "userName", header: "Encargado" },
      { accessorKey: "category", header: "Categoría" },
      {
        accessorKey: "openEndWarning",
        header: "Estado registro",
        cell: ({ row }) =>
          row.original.openEndWarning ? (
            <span className="inline-flex rounded-[2px] border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              Sin hora termino
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Cerrado</span>
          ),
      },
      { accessorKey: "contractStatus", header: "Estado contractual" },
      {
        accessorKey: "durationMinutes",
        header: "Duración",
        cell: ({ row }) => row.original.durationLabel,
        sortingFn: "basic",
      },
      { accessorKey: "clientLabel", header: "Cliente" },
      {
        id: "actions",
        header: "Acciones",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => {
          if (!row.original.entry || (!row.original.canEdit && !row.original.canDelete)) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <div className="flex flex-wrap gap-2">
              <TimeEntryCompleteNowButton
                entryId={row.original.entry.id}
                startTime={row.original.entry.startTime}
                canEdit={Boolean(row.original.canEdit)}
                isOpenEntry={!row.original.entry.endTime}
              />
              <Link
                href={`/time-entries?nueva=1&duplicateId=${encodeURIComponent(row.original.entry.id)}`}
                className="btn-secondary px-2.5 py-1 text-xs no-underline"
              >
                Duplicar
              </Link>
              <TimeEntryEditModal
                entry={row.original.entry}
                users={users}
                clients={clients}
                requirements={requirements}
                contracts={contracts}
                contractProfiles={contractProfiles}
                categories={categories}
                canEdit={Boolean(row.original.canEdit)}
                canPickAnyOwner={canPickAnyOwner}
                triggerLabel="Editar"
                triggerClassName="btn-secondary px-2.5 py-1 text-xs"
              />
              <TimeEntryDeleteButton entryId={row.original.entry.id} canDelete={Boolean(row.original.canDelete)} />
            </div>
          );
        },
      },
    ],
    [canPickAnyOwner, categories, clients, contractProfiles, contracts, requirements, users],
  );

  return (
    <div className="space-y-3">
      {Object.keys(rowSelection).length > 0 && (
        <div className="flex items-center justify-between rounded-[2px] border border-border bg-muted/30 px-4 py-2">
          <span className="text-sm font-medium text-muted-foreground">
            {Object.keys(rowSelection).length} fila(s) seleccionada(s)
          </span>
          <ConfirmDialog
            label="Eliminar seleccionados"
            title={`¿Estás seguro de que deseas eliminar las ${Object.keys(rowSelection).length} horas seleccionadas?`}
            triggerClassName="btn-danger inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
            confirmLabel="Eliminar"
            confirmLoadingLabel="Eliminando..."
            disabled={isDeleting}
            onConfirm={handleBulkDelete}
          />
        </div>
      )}
      <DataTable
        data={rows}
        columns={columns}
        globalFilterPlaceholder="Buscar por ID, fecha, persona, categoría o cliente…"
        pageSize={20}
        enableRowSelection={true}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(row) => row.id}
        emptyTitle="Sin horas"
        emptyDescription="No hay registros de horas con el filtro aplicado."
        emptyAction={
          <Link href="/time-entries/new" className="btn-primary py-2 text-sm no-underline">
            Registrar primera hora
          </Link>
        }
      />
    </div>
  );
}
