"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { DataTable } from "@/components/common/data-table";
import { TimeEntryEditModal } from "@/components/time-entries/time-entry-edit-modal";
import { deleteTimeEntriesBatchAction, deleteTimeEntryAction, completeTimeEntryNowAction } from "@/app/time-entries/new/data-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { scheduleUndoableAction } from "@/components/common/undoable-action";
import { RowActionMenu } from "@/components/common/row-action-menu";
import type { TimeEntry } from "@/types/domain";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

function currentLocalTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

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
  const router = useRouter();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [completeEntry, setCompleteEntry] = useState<{ id: string; startTime: string } | null>(null);

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
        header: "",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => {
          if (!row.original.entry || (!row.original.canEdit && !row.original.canDelete)) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          const entry = row.original.entry;
          const isOpen = !entry.endTime;
          return (
            <RowActionMenu
              items={[
                ...(row.original.canEdit && isOpen
                  ? [{ label: "Terminar ahora", onClick: () => setCompleteEntry({ id: entry.id, startTime: entry.startTime }) }]
                  : []),
                ...(row.original.canEdit
                  ? [
                      { label: "Duplicar", onClick: () => router.push(`/time-entries?nueva=1&duplicateId=${encodeURIComponent(entry.id)}`) },
                      { label: "Editar", onClick: () => setEditEntry(entry) },
                    ]
                  : []),
                ...(row.original.canDelete
                  ? [{ label: "Eliminar", danger: true, onClick: () => setDeleteEntryId(entry.id) }]
                  : []),
              ]}
            />
          );
        },
      },
    ],
    [canPickAnyOwner, categories, clients, contractProfiles, contracts, requirements, users],
  );

  return (
    <div className="space-y-3">
      {/* Page-level edit modal — controlled by editEntry state */}
      {editEntry ? (
        <TimeEntryEditModal
          key={editEntry.id}
          entry={editEntry}
          users={users}
          clients={clients}
          requirements={requirements}
          contracts={contracts}
          contractProfiles={contractProfiles}
          categories={categories}
          canEdit
          canPickAnyOwner={canPickAnyOwner}
          open
          onOpenChange={(v) => {
            if (!v) setEditEntry(null);
          }}
        />
      ) : null}

      {/* Page-level delete confirmation — controlled by deleteEntryId state */}
      {deleteEntryId ? (
        <ConfirmDialog
          label="Eliminar"
          title="¿Eliminar hora?"
          open
          onOpenChange={(v) => {
            if (!v) setDeleteEntryId(null);
          }}
          onConfirm={() => {
            const id = deleteEntryId;
            setDeleteEntryId(null);
            scheduleUndoableAction({
              pendingMessage: "Hora marcada para eliminar.",
              successMessage: "Hora eliminada.",
              errorMessage: "No se pudo eliminar la hora.",
              onCommit: async () => {
                await deleteTimeEntryAction(id);
                router.refresh();
              },
            });
          }}
        />
      ) : null}

      {/* Page-level complete-now confirmation — controlled by completeEntry state */}
      {completeEntry ? (
        <ConfirmDialog
          label="Terminar ahora"
          title="¿Confirmas cerrar esta hora con la hora actual?"
          open
          confirmLabel="Sí, terminar ahora"
          confirmLoadingLabel="Cerrando..."
          onOpenChange={(v) => {
            if (!v) setCompleteEntry(null);
          }}
          onConfirm={async () => {
            const { id, startTime } = completeEntry;
            const now = currentLocalTime();
            if (now <= startTime) {
              toast.error(`La hora actual (${now}) debe ser posterior al inicio (${startTime}).`);
              return;
            }
            const loadingId = toast.loading("Cerrando hora...");
            try {
              await completeTimeEntryNowAction({ id, endTime: now });
              toast.success(`Hora cerrada a las ${now}.`, { id: loadingId });
              router.refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "No se pudo cerrar la hora.", { id: loadingId });
            }
            setCompleteEntry(null);
          }}
        />
      ) : null}

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
        pageSize={10}
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
