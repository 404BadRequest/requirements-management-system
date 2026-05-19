"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/common/data-table";
import { RiskBadge } from "@/components/common/badges";
import { TimeEntryEditModal } from "@/components/time-entries/time-entry-edit-modal";
import { budgetRiskLevel } from "@/lib/calculations/budget";
import type { TimeEntry } from "@/types/domain";

type ProfileAllocationRow = {
  id: string;
  profileName: string;
  quotedLabel: string;
  usedLabel: string;
  availableLabel: string;
};

type CorrectionRow = {
  id: string;
  entry: TimeEntry;
  canEdit: boolean;
  date: string;
  userName: string;
  workerProfileName: string;
  assignedContractProfileName: string;
  durationMinutes: number;
  durationLabel: string;
  requirementTitle: string;
  status: string;
};

export function ContractDetailPanel({
  quotedMinutes,
  usedMinutes,
  availableMinutes,
  unallocatedCount,
  unallocatedMinutes,
  profileAllocationRows,
  correctionRows,
  users,
  requirements,
  contracts,
  contractProfiles,
  categories,
  canPickAnyOwner,
  contractId,
}: {
  quotedMinutes: number;
  usedMinutes: number;
  availableMinutes: number;
  unallocatedCount: number;
  unallocatedMinutes: number;
  profileAllocationRows: ProfileAllocationRow[];
  correctionRows: CorrectionRow[];
  users: { id: string; name: string }[];
  requirements: { id: string; title: string }[];
  contracts: { id: string; label: string }[];
  contractProfiles: { id: string; label: string }[];
  categories: { code: string; label: string }[];
  canPickAnyOwner: boolean;
  contractId: string;
}) {
  const allocationColumns = useMemo<ColumnDef<ProfileAllocationRow>[]>(
    () => [
      { accessorKey: "profileName", header: "Perfil" },
      { accessorKey: "quotedLabel", header: "Cotizadas", meta: { align: "right" } },
      { accessorKey: "usedLabel", header: "Usadas", meta: { align: "right" } },
      { accessorKey: "availableLabel", header: "Disponibles", meta: { align: "right" } },
    ],
    [],
  );

  const correctionColumns = useMemo<ColumnDef<CorrectionRow>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID hora",
        cell: ({ row }) => (
          <Link href={`/time-entries/${row.original.id}`} className="font-medium text-primary hover:underline">
            {row.original.id}
          </Link>
        ),
      },
      { accessorKey: "date", header: "Fecha" },
      { accessorKey: "userName", header: "Persona" },
      { accessorKey: "workerProfileName", header: "Perfil real" },
      { accessorKey: "assignedContractProfileName", header: "Perfil contractual" },
      {
        accessorKey: "durationMinutes",
        header: "Horas",
        meta: { align: "right" },
        cell: ({ row }) => row.original.durationLabel,
      },
      { accessorKey: "requirementTitle", header: "Requerimiento" },
      { accessorKey: "status", header: "Estado" },
      {
        id: "actions",
        header: "Acciones",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) =>
          row.original.canEdit ? (
            <TimeEntryEditModal
              entry={row.original.entry}
              users={users}
              requirements={requirements}
              contracts={contracts}
              contractProfiles={contractProfiles}
              categories={categories}
              canEdit={row.original.canEdit}
              canPickAnyOwner={canPickAnyOwner}
              triggerLabel="Editar"
              triggerClassName="btn-secondary px-2.5 py-1 text-xs"
            />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
    ],
    [canPickAnyOwner, categories, contractProfiles, contracts, requirements, users],
  );

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Horas cotizadas</p>
          <p className="text-2xl font-semibold">{(quotedMinutes / 60).toFixed(1)}</p>
        </article>
        <article className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Horas usadas</p>
          <p className="text-2xl font-semibold">{(usedMinutes / 60).toFixed(1)}</p>
        </article>
        <article className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Disponibles</p>
          <p className="text-2xl font-semibold">{(availableMinutes / 60).toFixed(1)}</p>
          <RiskBadge risk={budgetRiskLevel(quotedMinutes, usedMinutes)} />
        </article>
      </section>

      {unallocatedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[2px] border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span>
            Este contrato tiene {unallocatedCount} hora(s) a corregir ({(unallocatedMinutes / 60).toFixed(1)} h).
          </span>
          <Link
            href={`/time-entries?contractStatus=unassigned&contractId=${contractId}`}
            className="inline-flex items-center rounded-[2px] border border-amber-500/60 px-2 py-1 font-medium text-amber-900 no-underline hover:bg-amber-100"
          >
            Ver en listado de horas
          </Link>
        </div>
      ) : null}

      <article className="surface-card p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Bolsa por perfil</h2>
        <DataTable
          data={profileAllocationRows}
          columns={allocationColumns}
          globalFilterPlaceholder="Buscar perfil..."
          pageSize={10}
          emptyTitle="Sin perfiles cotizados"
          emptyDescription="Este contrato no tiene perfiles asignados."
        />
      </article>

      <article className="surface-card p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Horas a corregir</h2>
          <span className="text-xs text-muted-foreground">{correctionRows.length} registro(s)</span>
        </div>
        <DataTable
          data={correctionRows}
          columns={correctionColumns}
          globalFilterPlaceholder="Buscar por ID, persona o estado..."
          pageSize={10}
          emptyTitle="Sin horas mal asignadas"
          emptyDescription="No hay horas pendientes de corrección para este contrato."
        />
      </article>
    </div>
  );
}
