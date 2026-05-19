"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/common/data-table";
import { TimeEntryEditModal } from "@/components/time-entries/time-entry-edit-modal";
import { TimeEntryDeleteButton } from "@/components/time-entries/time-entry-delete-button";
import type { TimeEntry } from "@/types/domain";

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
};

export function TimeEntriesTable({
  rows,
  users,
  requirements,
  categories,
  canPickAnyOwner,
}: {
  rows: TimeEntryRow[];
  users: { id: string; name: string }[];
  requirements: { id: string; title: string }[];
  categories: { code: string; label: string }[];
  canPickAnyOwner: boolean;
}) {
  const columns = useMemo<ColumnDef<TimeEntryRow>[]>(
    () => [
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
              <TimeEntryEditModal
                entry={row.original.entry}
                users={users}
                requirements={requirements}
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
    [canPickAnyOwner, categories, requirements, users],
  );

  return (
    <DataTable
      data={rows}
      columns={columns}
      globalFilterPlaceholder="Buscar por ID, fecha, persona, categoría o cliente…"
      pageSize={20}
      emptyTitle="Sin horas"
      emptyDescription="No hay registros de horas con el filtro aplicado."
      emptyAction={
        <Link href="/time-entries/new" className="btn-primary py-2 text-sm no-underline">
          Registrar primera hora
        </Link>
      }
    />
  );
}
