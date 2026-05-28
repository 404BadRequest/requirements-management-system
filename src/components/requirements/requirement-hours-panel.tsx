"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTable } from "@/components/common/data-table";
import { TimeEntryEditModal } from "@/components/time-entries/time-entry-edit-modal";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { RowActionMenu } from "@/components/common/row-action-menu";
import { scheduleUndoableAction } from "@/components/common/undoable-action";
import { deleteTimeEntryAction } from "@/app/time-entries/new/data-actions";
import type { TimeEntry } from "@/types/domain";

export type RequirementHoursRow = {
  id: string;
  entry: TimeEntry;
  canEdit: boolean;
  canDelete: boolean;
  date: string;
  userName: string;
  profileName: string;
  categoryLabel: string;
  durationDisplay: string;
  timeRange: string;
  taskDescription: string;
  contractStatus: string;
};

export type HoursBreakdownItem = { label: string; hoursDisplay: string };

export function RequirementHoursPanel({
  rows,
  byProfile,
  byCategory,
  totalHoursDisplay,
  imputationCount,
  users,
  clients,
  requirements,
  contracts = [],
  contractProfiles = [],
  categories,
  canPickAnyOwner,
}: {
  rows: RequirementHoursRow[];
  byProfile: HoursBreakdownItem[];
  byCategory: HoursBreakdownItem[];
  totalHoursDisplay: string;
  imputationCount: number;
  users: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  requirements: { id: string; title: string; clientId: string }[];
  contracts?: { id: string; clientId: string; label: string }[];
  contractProfiles?: { id: string; label: string }[];
  categories: { code: string; label: string }[];
  canPickAnyOwner: boolean;
}) {
  const router = useRouter();
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<RequirementHoursRow>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        meta: { align: "left" },
        cell: ({ row }) => (
          <Link href={`/time-entries/${row.original.id}`} className="hidden font-medium text-primary hover:underline md:inline">
            {row.original.id}
          </Link>
        ),
      },
      {
        accessorKey: "date",
        header: "Fecha",
        cell: ({ row }) => (
          <Link href={`/time-entries/${row.original.id}`} className="font-medium text-primary hover:underline md:font-normal md:text-foreground md:no-underline">
            {row.original.date}
          </Link>
        ),
      },
      { accessorKey: "userName", header: "Persona" },
      { accessorKey: "profileName", header: "Perfil" },
      { accessorKey: "contractStatus", header: "Perfil contractual" },
      { accessorKey: "categoryLabel", header: "Categoría" },
      {
        accessorKey: "durationDisplay",
        header: "Horas",
        meta: { align: "right" },
      },
      {
        accessorKey: "timeRange",
        header: "Bloque",
        cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{row.original.timeRange}</span>,
      },
      {
        accessorKey: "taskDescription",
        header: "Tarea / descripción",
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[min(28rem,50vw)] text-muted-foreground">{row.original.taskDescription || "—"}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => {
          if (!row.original.canEdit && !row.original.canDelete) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <RowActionMenu
              items={[
                ...(row.original.canEdit ? [{ label: "Editar", onClick: () => setEditEntry(row.original.entry) }] : []),
                ...(row.original.canDelete ? [{ label: "Eliminar", danger: true, onClick: () => setDeleteEntryId(row.original.id) }] : []),
              ]}
            />
          );
        },
      },
    ],
    [canPickAnyOwner, categories, clients, contractProfiles, contracts, requirements, users],
  );

  if (rows.length === 0) {
    return (
      <article className="surface-card p-[length:var(--density-inset-pad)]">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Horas</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Aún no hay horas registradas vinculadas a este requerimiento. Las horas aparecen cuando en el registro se
          elige este REQ.
        </p>
      </article>
    );
  }

  return (
    <>
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
    <article className="surface-card flex flex-col gap-6 p-[length:var(--density-inset-pad)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Horas</h2>
          <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted-foreground">
            Detalle de cada registro: quién registró la hora, con qué perfil de tarifa, categoría de tiempo y bloque horario.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-right">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total acumulado</p>
            <p className="text-xl font-semibold tabular-nums text-foreground">{totalHoursDisplay}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Registros</p>
            <p className="text-xl font-semibold tabular-nums text-foreground">{imputationCount}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Horas por perfil</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Suma de duración agrupada por el perfil de tarifa de quien registró la hora.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {byProfile.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-2 border-b border-border/40 py-1.5 last:border-0">
                <span className="min-w-0 truncate font-medium text-foreground">{item.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{item.hoursDisplay}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Horas por categoría</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Uso de las categorías de tiempo configuradas en el catálogo.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {byCategory.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-2 border-b border-border/40 py-1.5 last:border-0">
                <span className="min-w-0 truncate font-medium text-foreground">{item.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{item.hoursDisplay}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">Registros</h3>
        <DataTable
          data={rows}
          columns={columns}
          globalFilterPlaceholder="Buscar en horas…"
          pageSize={10}
          emptyTitle="Sin horas"
          emptyDescription="No hay registros de horas para este requerimiento."
        />
      </div>
    </article>
    </>
  );
}
