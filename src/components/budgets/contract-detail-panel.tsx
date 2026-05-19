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

type TopRiskProfileRow = {
  profileId: string;
  profileName: string;
  consumptionPct: number;
  usedMinutes: number;
  risk: "verde" | "amarillo" | "rojo";
};

type TopRequirementRow = {
  requirementId: string | null;
  requirementTitle: string;
  equivalentMinutesUsed: number;
  equivalentHoursLabel: string;
  pctOfContractUsed: number;
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
  clients,
  requirements,
  contracts,
  contractProfiles,
  categories,
  canPickAnyOwner,
  contractId,
  elapsedContractPct,
  expectedMinutesByDate,
  deviationMinutes,
  deviationPct,
  deviationRisk,
  misallocationPct,
  misallocationRisk,
  burnRateMinutesPerWeek,
  estimatedDepletionDate,
  daysToDepletion,
  topRiskProfiles,
  topRequirementRows,
  contractHealthScore,
  contractHealthRisk,
}: {
  quotedMinutes: number;
  usedMinutes: number;
  availableMinutes: number;
  unallocatedCount: number;
  unallocatedMinutes: number;
  profileAllocationRows: ProfileAllocationRow[];
  correctionRows: CorrectionRow[];
  users: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  requirements: { id: string; title: string; clientId: string }[];
  contracts: { id: string; clientId: string; label: string }[];
  contractProfiles: { id: string; label: string }[];
  categories: { code: string; label: string }[];
  canPickAnyOwner: boolean;
  contractId: string;
  elapsedContractPct: number;
  expectedMinutesByDate: number;
  deviationMinutes: number;
  deviationPct: number;
  deviationRisk: "verde" | "amarillo" | "rojo";
  misallocationPct: number;
  misallocationRisk: "verde" | "amarillo" | "rojo";
  burnRateMinutesPerWeek: number;
  estimatedDepletionDate: string | null;
  daysToDepletion: number | null;
  topRiskProfiles: TopRiskProfileRow[];
  topRequirementRows: TopRequirementRow[];
  contractHealthScore: number;
  contractHealthRisk: "verde" | "amarillo" | "rojo";
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
              clients={clients}
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
    [canPickAnyOwner, categories, clients, contractProfiles, contracts, requirements, users],
  );

  const topRequirementColumns = useMemo<ColumnDef<TopRequirementRow>[]>(
    () => [
      {
        accessorKey: "requirementTitle",
        header: "Requerimiento",
        cell: ({ row }) =>
          row.original.requirementId ? (
            <Link href={`/requirements/id/${row.original.requirementId}`} className="font-medium text-primary hover:underline">
              {row.original.requirementTitle}
            </Link>
          ) : (
            <span>{row.original.requirementTitle}</span>
          ),
      },
      {
        accessorKey: "equivalentMinutesUsed",
        header: "Horas equivalentes",
        meta: { align: "right" },
        cell: ({ row }) => row.original.equivalentHoursLabel,
      },
      {
        accessorKey: "pctOfContractUsed",
        header: "% uso contrato",
        meta: { align: "right" },
        cell: ({ row }) => `${row.original.pctOfContractUsed.toFixed(1)}%`,
      },
    ],
    [],
  );

  const deviationHoursLabel = `${Math.abs(deviationMinutes / 60).toFixed(2)} h`;
  const deviationDirection = deviationMinutes >= 0 ? "sobreconsumo" : "bajo plan";
  const elapsedContractLabel = `${(elapsedContractPct * 100).toFixed(1)}% de vigencia`;
  const projectionLabel =
    estimatedDepletionDate && daysToDepletion !== null
      ? `${estimatedDepletionDate} (${daysToDepletion} días)`
      : "Sin datos suficientes";
  const topRequirementLead = topRequirementRows[0];

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="surface-card border border-primary/35 bg-primary/5 p-4 shadow-sm">
          <p className="text-xs text-primary">Salud del contrato</p>
          <p className="text-2xl font-semibold">{contractHealthScore}/100</p>
          <div className="mt-1">
            <RiskBadge risk={contractHealthRisk} />
          </div>
        </article>
        <article className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Desviación vs plan</p>
          <p className="text-2xl font-semibold">{deviationHoursLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {deviationDirection} · {deviationPct.toFixed(1)}% · {elapsedContractLabel}
          </p>
          <div className="mt-1">
            <RiskBadge risk={deviationRisk} />
          </div>
        </article>
        <article className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Proyección de agotamiento</p>
          <p className="text-lg font-semibold">{projectionLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">Velocidad: {(burnRateMinutesPerWeek / 60).toFixed(2)} h/semana</p>
        </article>
        <article className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Horas mal asignadas</p>
          <p className="text-2xl font-semibold">{(unallocatedMinutes / 60).toFixed(2)} h</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {unallocatedCount} registro(s) · {misallocationPct.toFixed(1)}% del consumo
          </p>
          <div className="mt-1">
            <RiskBadge risk={misallocationRisk} />
          </div>
        </article>
        <article className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Cobertura por perfil (top riesgo)</p>
          {topRiskProfiles.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm">
              {topRiskProfiles.map((row) => (
                <li key={row.profileId} className="flex items-center justify-between gap-2">
                  <span className="truncate">{row.profileName}</span>
                  <span className="inline-flex items-center gap-2">
                    <span className="tabular-nums text-muted-foreground">{row.consumptionPct.toFixed(1)}%</span>
                    <RiskBadge risk={row.risk} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Sin datos de cobertura por perfil.</p>
          )}
        </article>
        <article className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Top requerimiento consumidor</p>
          {topRequirementLead ? (
            <>
              <p className="mt-1 line-clamp-2 text-sm font-semibold">{topRequirementLead.requirementTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {topRequirementLead.equivalentHoursLabel} · {topRequirementLead.pctOfContractUsed.toFixed(1)}% del uso
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Sin consumo asociado a requerimientos.</p>
          )}
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Horas cotizadas</p>
          <p className="text-2xl font-semibold">{(quotedMinutes / 60).toFixed(2)}</p>
        </article>
        <article className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Horas usadas</p>
          <p className="text-2xl font-semibold">{(usedMinutes / 60).toFixed(2)}</p>
        </article>
        <article className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Disponibles</p>
          <p className="text-2xl font-semibold">{(availableMinutes / 60).toFixed(2)}</p>
          <RiskBadge risk={budgetRiskLevel(quotedMinutes, usedMinutes)} />
          <p className="mt-1 text-xs text-muted-foreground">Esperadas a hoy: {(expectedMinutesByDate / 60).toFixed(2)} h</p>
        </article>
      </section>

      {unallocatedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[2px] border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span>
            Este contrato tiene {unallocatedCount} hora(s) a corregir ({(unallocatedMinutes / 60).toFixed(2)} h).
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Top requerimientos consumidores</h2>
          <span className="text-xs text-muted-foreground">{topRequirementRows.length} fila(s)</span>
        </div>
        <DataTable
          data={topRequirementRows}
          columns={topRequirementColumns}
          globalFilterPlaceholder="Buscar requerimiento..."
          pageSize={5}
          emptyTitle="Sin requerimientos consumidores"
          emptyDescription="No hay consumo equivalente asociado a requerimientos en este contrato."
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
